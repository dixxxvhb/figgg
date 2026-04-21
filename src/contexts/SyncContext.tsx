import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadData, saveCalendarEventsToStorage } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { getCalendarEvents, batchSaveCalendarEvents } from '../services/firestore';
import { auth } from '../services/firebase';
import type { CalendarEvent } from '../types';
import { autoLinkDancesToEvent } from '../utils/danceLinker';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncContextType {
  status: SyncStatus;
  lastSynced: Date | null;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
  triggerSync: () => Promise<void>;
  syncCalendars: () => Promise<string[]>;
}

const SyncContext = createContext<SyncContextType | null>(null);

// Default calendar URLs loaded from environment variables (comma-separated)
const DEFAULT_CALENDAR_URLS: string[] = (import.meta.env.VITE_CALENDAR_URLS || '')
  .split(',')
  .map((u: string) => u.trim())
  .filter(Boolean);

// Prevent concurrent sync calls from writing conflicting data
let syncInProgress = false;

// Sync all calendar URLs and write directly to Firestore as individual docs.
// The onCalendarEventsSnapshot listener in useAppData picks up changes automatically.
async function syncAllCalendars(force = false): Promise<string[]> {
  const results: string[] = [];
  const uid = auth?.currentUser?.uid;
  if (!uid) return results;

  // Skip if another sync is already running
  if (syncInProgress) return results;

  // Cooldown: skip if synced recently (unless forced)
  const now = Date.now();
  if (!force && now - lastCalendarSyncTime < CALENDAR_SYNC_COOLDOWN) return results;
  syncInProgress = true;
  lastCalendarSyncTime = now;

  const data = loadData();
  const urls = new Set<string>(DEFAULT_CALENDAR_URLS);
  if (data.settings?.calendarUrl) urls.add(data.settings.calendarUrl);
  if (data.settings?.calendarUrls) {
    data.settings.calendarUrls.forEach((u: string) => urls.add(u));
  }

  // Fetch ICS calendars (Apple Calendar is the single source of truth)
  const icsPromises = Array.from(urls).map(async (url) => {
    const shortUrl = url.length > 40 ? url.slice(0, 37) + '...' : url;
    try {
      const events = await fetchCalendarEvents(url);
      results.push(`${shortUrl}: ${events.length} events`);
      return events;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'failed';
      results.push(`${shortUrl}: FAILED (${msg})`);
      return [] as CalendarEvent[];
    }
  });

  const icsResults = await Promise.all(icsPromises);
  const icsEvents = icsResults.flat();

  // Tag ICS events with source
  const newFeedEvents: CalendarEvent[] = icsEvents.map(e => ({
    ...e,
    source: e.source || 'ics' as const,
  }));

  if (newFeedEvents.length === 0 && icsResults.every(r => r.length === 0)) {
    syncInProgress = false;
    // No events isn't a failure — calendars may just be empty.
    // Only warn if every fetch actually failed (results contain "FAILED").
    if (urls.size > 0 && results.every(r => r.includes('FAILED'))) {
      console.warn('Calendar sync: all sources failed');
      window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
    }
    return results;
  }

  // Read current events to preserve user modifications (linkedDanceIds, etc.)
  // Merge from both Firestore and localStorage to catch recent local changes
  // that may not have synced to Firestore yet (e.g., offline edits)
  const hiddenIds = new Set(data.settings?.hiddenCalendarEventIds || []);
  let firestoreEvents: CalendarEvent[] = [];
  try {
    firestoreEvents = await getCalendarEvents(uid);
  } catch (e) {
    console.warn('Failed to read calendar events from Firestore, using localStorage:', e);
  }
  const localEvents = data.calendarEvents || [];
  const competitionDances = data.competitionDances || [];
  // Build a merged map: Firestore is source of truth, but localStorage may have
  // more recent linkedDanceIds edits from this device
  const existingMap = new Map<string, CalendarEvent>();
  for (const event of firestoreEvents) {
    existingMap.set(event.id, event);
  }
  // Overlay localStorage events — preserves local edits not yet in Firestore
  for (const event of localEvents) {
    const existing = existingMap.get(event.id);
    if (!existing) {
      existingMap.set(event.id, event);
      continue;
    }
    existingMap.set(event.id, {
      ...existing,
      linkedDanceIds: event.linkedDanceIds ?? existing.linkedDanceIds,
    });
  }
  const existingEvents = Array.from(existingMap.values());

  // Merge: new feed data + preserved user modifications
  const mergedEvents: CalendarEvent[] = [];
  const newEventIds = new Set<string>();

  for (const event of newFeedEvents) {
    // Skip hidden events
    if (hiddenIds.has(event.id)) continue;

    newEventIds.add(event.id);
    const existing = existingMap.get(event.id);
    if (existing) {
      // Preserve user modifications, update feed data
      const mergedEvent = {
        ...event,
        linkedDanceIds: existing.linkedDanceIds,
        googleCalendarEventId: event.googleCalendarEventId || existing.googleCalendarEventId,
        source: event.source || existing.source,
      };
      mergedEvents.push(autoLinkDancesToEvent(mergedEvent, competitionDances) || mergedEvent);
    } else {
      mergedEvents.push(autoLinkDancesToEvent(event, competitionDances) || event);
    }
  }

  // Handle existing events not in the new feed
  const staleIds: string[] = [];
  for (const existing of existingEvents) {
    if (!newEventIds.has(existing.id) && !hiddenIds.has(existing.id)) {
      if (existing.source === 'ics' || existing.source === 'google') {
        // Stale feed events: remove from Firestore
        staleIds.push(existing.id);
      } else {
        // Manually created events: keep them in the merged set
        mergedEvents.push(existing);
      }
    }
  }

  // Update localStorage immediately for instant UI responsiveness
  saveCalendarEventsToStorage(mergedEvents);

  // Write to Firestore for cross-device sync — snapshot listener keeps state in sync.
  // Saves and deletes are combined into one atomic batch so the snapshot fires once
  // with the final state, preventing UI flicker between save and delete.
  try {
    await batchSaveCalendarEvents(uid, mergedEvents, staleIds.length > 0 ? staleIds : undefined);
    window.dispatchEvent(new CustomEvent('calendar-sync-complete'));
  } catch (e) {
    console.error('Calendar Firestore write failed:', e);
    window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
  } finally {
    syncInProgress = false;
  }

  return results;
}

// Calendar sync interval: configurable via settings, default 15 minutes
function getCalendarSyncInterval(): number {
  try {
    const raw = localStorage.getItem('dance-teaching-app-data');
    if (raw) {
      const data = JSON.parse(raw);
      const mins = data?.settings?.calendarSyncMinutes;
      if (mins && [5, 10, 15, 30].includes(mins)) return mins * 60 * 1000;
    }
  } catch { /* fall through */ }
  return 15 * 60 * 1000;
}
// Minimum time between calendar syncs (prevents rapid re-syncs on tab focus)
const CALENDAR_SYNC_COOLDOWN = 5 * 60 * 1000;
let lastCalendarSyncTime = 0;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<SyncStatus>(() => navigator.onLine ? 'idle' : 'offline');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const statusRef = useRef<SyncStatus>(status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setStatus = useCallback((newStatus: SyncStatus) => {
    setStatusState(newStatus);
  }, []);

  const markSynced = useCallback(() => {
    setLastSynced(new Date());
    setStatusState('success');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
  }, []);

  // Firestore onSnapshot handles real-time data sync.
  // triggerSync is kept for backward compatibility (UI components may call it).
  const triggerSync = useCallback(async () => {
    if (statusRef.current === 'offline') {
      setStatusState('offline');
      return;
    }

    setStatusState('syncing');
    try {
      await syncAllCalendars(true);
      setLastSynced(new Date());
      setStatusState('success');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
    } catch (error) {
      console.error('Manual sync failed:', error);
      setStatusState('error');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'offline') {
        setStatusState('idle');
      }
    };
    const handleOffline = () => setStatusState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calendar sync: on mount + recurring interval (reacts to settings changes)
  useEffect(() => {
    syncAllCalendars(true);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startInterval() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        syncAllCalendars(true);
      }, getCalendarSyncInterval());
    }
    startInterval();

    // Re-create interval when sync settings change
    const handleSettingsChange = () => {
      startInterval();
    };
    window.addEventListener('calendar-sync-interval-changed', handleSettingsChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('calendar-sync-interval-changed', handleSettingsChange);
    };
  }, []);

  // Sync calendars when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAllCalendars();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <SyncContext.Provider value={{ status, lastSynced, setStatus, markSynced, triggerSync, syncCalendars: syncAllCalendars }}>
      {children}
    </SyncContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
}
