import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadData } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { fetchGoogleCalendarEvents } from '../services/googleCalendar';
import { getCalendarEvents, batchSaveCalendarEvents, batchDeleteCalendarEvents } from '../services/firestore';
import { auth } from '../services/firebase';
import type { CalendarEvent } from '../types';

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

// Sync all calendar URLs and write directly to Firestore as individual docs.
// The onCalendarEventsSnapshot listener in useAppData picks up changes automatically.
async function syncAllCalendars(force = false): Promise<string[]> {
  const results: string[] = [];
  const uid = auth?.currentUser?.uid;
  if (!uid) return results;

  // Cooldown: skip if synced recently (unless forced)
  const now = Date.now();
  if (!force && now - lastCalendarSyncTime < CALENDAR_SYNC_COOLDOWN) return results;
  lastCalendarSyncTime = now;

  const data = loadData();
  const urls = new Set<string>(DEFAULT_CALENDAR_URLS);
  if (data.settings?.calendarUrl) urls.add(data.settings.calendarUrl);
  if (data.settings?.calendarUrls) {
    data.settings.calendarUrls.forEach((u: string) => urls.add(u));
  }

  // Fetch ICS calendars + Google Calendar in parallel
  const icsPromises = Array.from(urls).map(async (url) => {
    const shortUrl = url.length > 40 ? url.slice(0, 37) + '...' : url;
    try {
      const events = await fetchCalendarEvents(url);
      results.push(`${shortUrl}: ${events.length} events`);
      return events;
    } catch (e: any) {
      const msg = e?.message || 'failed';
      results.push(`${shortUrl}: FAILED (${msg})`);
      return [] as CalendarEvent[];
    }
  });

  const googlePromise = fetchGoogleCalendarEvents().catch(err => {
    console.warn('Google Calendar sync failed:', err);
    return [] as Awaited<ReturnType<typeof fetchGoogleCalendarEvents>>;
  });

  const [icsResults, googleEvents] = await Promise.all([
    Promise.all(icsPromises),
    googlePromise,
  ]);

  const icsEvents = icsResults.flat();

  // Convert Google Calendar events to CalendarEvent format
  const googleCalEvents: CalendarEvent[] = googleEvents.map(ge => ({
    id: `gcal-${ge.googleCalendarEventId}`,
    title: ge.title,
    date: ge.date,
    startTime: ge.startTime,
    endTime: ge.endTime,
    location: ge.location || undefined,
    description: ge.description || undefined,
    googleCalendarEventId: ge.googleCalendarEventId,
    source: 'google' as const,
  }));

  // Tag ICS events with source
  const taggedIcsEvents: CalendarEvent[] = icsEvents.map(e => ({
    ...e,
    source: e.source || 'ics' as const,
  }));

  const newFeedEvents = [...taggedIcsEvents, ...googleCalEvents];

  if (newFeedEvents.length === 0 && icsResults.every(r => r.length === 0) && googleEvents.length === 0) {
    if (urls.size > 0) {
      console.warn('Calendar sync: no events from any source');
      window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
    }
    return results;
  }

  // Read current Firestore events to preserve user modifications
  const hiddenIds = new Set(data.settings?.hiddenCalendarEventIds || []);
  let existingEvents: CalendarEvent[] = [];
  try {
    existingEvents = await getCalendarEvents(uid);
  } catch (e) {
    console.warn('Failed to read existing calendar events from Firestore:', e);
  }

  const existingMap = new Map<string, CalendarEvent>();
  for (const event of existingEvents) {
    existingMap.set(event.id, event);
  }

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
      mergedEvents.push({
        ...event,
        linkedDanceIds: existing.linkedDanceIds,
        googleCalendarEventId: event.googleCalendarEventId || existing.googleCalendarEventId,
        source: event.source || existing.source,
      });
    } else {
      mergedEvents.push(event);
    }
  }

  // Find stale events: in Firestore but no longer in any feed (and not hidden)
  const staleIds: string[] = [];
  for (const existing of existingEvents) {
    if (!newEventIds.has(existing.id) && !hiddenIds.has(existing.id)) {
      // Only remove ICS/Google-sourced events. Manually created events should persist.
      if (existing.source === 'ics' || existing.source === 'google') {
        staleIds.push(existing.id);
      }
    }
  }

  // Write to Firestore — snapshot listener handles local state updates
  try {
    await batchSaveCalendarEvents(uid, mergedEvents);
    if (staleIds.length > 0) {
      await batchDeleteCalendarEvents(uid, staleIds);
    }
    window.dispatchEvent(new CustomEvent('calendar-sync-complete'));
  } catch (e) {
    console.error('Calendar Firestore write failed:', e);
    window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
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
  const [status, setStatusState] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const statusRef = useRef<SyncStatus>(status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calendarSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setLastSynced(new Date());
    setStatusState('success');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (calendarSyncIntervalRef.current) clearInterval(calendarSyncIntervalRef.current);
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

    if (!navigator.onLine) setStatusState('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calendar sync: on mount + every 15 minutes
  useEffect(() => {
    syncAllCalendars(true);

    calendarSyncIntervalRef.current = setInterval(() => {
      syncAllCalendars(true);
    }, getCalendarSyncInterval());

    return () => {
      if (calendarSyncIntervalRef.current) clearInterval(calendarSyncIntervalRef.current);
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

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
}
