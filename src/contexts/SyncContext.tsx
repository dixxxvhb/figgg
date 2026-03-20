import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadData, updateCalendarEvents } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { fetchGoogleCalendarEvents } from '../services/googleCalendar';
import { auth } from '../services/firebase';
import type { CalendarEvent } from '../types';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncContextType {
  status: SyncStatus;
  lastSynced: Date | null;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
  triggerSync: () => Promise<void>;
  syncCalendars: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

// Default calendar URLs loaded from environment variables (comma-separated)
const DEFAULT_CALENDAR_URLS: string[] = (import.meta.env.VITE_CALENDAR_URLS || '')
  .split(',')
  .map((u: string) => u.trim())
  .filter(Boolean);

// Sync all calendar URLs (defaults + any saved in settings) in parallel
// Requires Firebase Auth — calendar proxy is a callable function that checks auth
async function syncAllCalendars(force = false) {
  if (!auth?.currentUser) return;
  // Skip if synced recently (unless forced — e.g. interval timer or manual trigger)
  const now = Date.now();
  if (!force && now - lastCalendarSyncTime < CALENDAR_SYNC_COOLDOWN) return;
  lastCalendarSyncTime = now;
  const data = loadData();
  const urls = new Set<string>(DEFAULT_CALENDAR_URLS);

  if (data.settings?.calendarUrl) urls.add(data.settings.calendarUrl);
  if (data.settings?.calendarUrls) {
    data.settings.calendarUrls.forEach((u: string) => urls.add(u));
  }

  // Fetch ICS calendars + Google Calendar in parallel
  const icsPromises = Array.from(urls).map(url => fetchCalendarEvents(url));
  const googlePromise = fetchGoogleCalendarEvents().catch(err => {
    console.warn('Google Calendar sync failed:', err);
    return [] as Awaited<ReturnType<typeof fetchGoogleCalendarEvents>>;
  });

  const [icsResults, googleEvents] = await Promise.all([
    Promise.allSettled(icsPromises),
    googlePromise,
  ]);

  const fulfilled = icsResults.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchCalendarEvents>>> => r.status === 'fulfilled');
  const icsEvents = fulfilled.flatMap(r => r.value);
  const failedCount = icsResults.filter(r => r.status === 'rejected').length;

  // Convert Google Calendar events to CalendarEvent format with source tracking
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

  const allEvents = [...taggedIcsEvents, ...googleCalEvents];

  if (allEvents.length > 0) {
    updateCalendarEvents(allEvents);
    window.dispatchEvent(new CustomEvent('calendar-sync-complete'));
  } else if (failedCount === icsResults.length && icsResults.length > 0 && googleEvents.length === 0) {
    console.warn(`Calendar sync: all ${failedCount} URL(s) failed`);
    window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
  }
}

// Calendar sync interval: 15 minutes
const CALENDAR_SYNC_INTERVAL = 15 * 60 * 1000;
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
    }, CALENDAR_SYNC_INTERVAL);

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
