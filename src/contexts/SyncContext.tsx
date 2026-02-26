import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loadData, updateCalendarEvents } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';

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

// Default calendar URLs - always synced
const DEFAULT_CALENDAR_URLS = [
  'https://api.band.us/ical?token=aAAxADU0MWQxZTdiZjdhYWQwMDBiMWY3ZTNjNWFhYmY3YzViNTE5YTRjYmU',
  'https://p157-caldav.icloud.com/published/2/MTk1MzE5NDQxMTk1MzE5NHQAH6rjzS_gyID08NDG-fjEKQfC3E7w4dd7G44gheLnuiNy7AexoNdl9WLiOmXdxEKxVknTHHKwIrJgJMYJfkY',
  'webcal://p157-caldav.icloud.com/published/2/MTk1MzE5NDQxMTk1MzE5NHQAH6rjzS_gyID08NDG-fhT8lUzOWzIPh08c6kuiNKGwZzEu5nxAQZsjW1lZmK4qwjjsB3WCmkRGIUo3RFl1HM',
];

// Sync all calendar URLs (defaults + any saved in settings) in parallel
async function syncAllCalendars() {
  const data = loadData();
  const urls = new Set<string>(DEFAULT_CALENDAR_URLS);

  if (data.settings?.calendarUrl) urls.add(data.settings.calendarUrl);
  if (data.settings?.calendarUrls) {
    data.settings.calendarUrls.forEach((u: string) => urls.add(u));
  }

  const results = await Promise.allSettled(
    Array.from(urls).map(url => fetchCalendarEvents(url))
  );

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchCalendarEvents>>> => r.status === 'fulfilled');
  const allEvents = fulfilled.flatMap(r => r.value);
  const failedCount = results.filter(r => r.status === 'rejected').length;

  if (allEvents.length > 0) {
    updateCalendarEvents(allEvents);
    window.dispatchEvent(new CustomEvent('calendar-sync-complete'));
  } else if (failedCount === results.length && results.length > 0) {
    console.warn(`Calendar sync: all ${failedCount} URL(s) failed`);
    window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
  }
}

// Calendar sync interval: 15 minutes
const CALENDAR_SYNC_INTERVAL = 15 * 60 * 1000;

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

  // Firestore onSnapshot handles real-time data sync — no more Netlify Blob polling.
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
    syncAllCalendars();

    calendarSyncIntervalRef.current = setInterval(() => {
      syncAllCalendars();
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
