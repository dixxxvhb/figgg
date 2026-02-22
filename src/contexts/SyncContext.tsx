import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { syncFromCloud, loadData, updateCalendarEvents } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { initAuthToken } from '../services/cloudStorage';

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
  await initAuthToken();
  const data = loadData();
  const urls = new Set<string>(DEFAULT_CALENDAR_URLS);

  if (data.settings?.calendarUrl) urls.add(data.settings.calendarUrl);
  if (data.settings?.calendarUrls) {
    data.settings.calendarUrls.forEach((u: string) => urls.add(u));
  }

  // Fetch all calendars in parallel instead of sequentially
  const results = await Promise.allSettled(
    Array.from(urls).map(url => fetchCalendarEvents(url))
  );

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchCalendarEvents>>> => r.status === 'fulfilled');
  const allEvents = fulfilled.flatMap(r => r.value);
  const failedCount = results.filter(r => r.status === 'rejected').length;

  if (allEvents.length > 0) {
    updateCalendarEvents(allEvents);
    // Notify UI to reload data — the local-data-saved event from saveData
    // may be blocked by isSavingRef if cloud sync is also saving simultaneously
    window.dispatchEvent(new CustomEvent('calendar-sync-complete'));
  } else if (failedCount === results.length && results.length > 0) {
    // All calendar URLs failed — notify UI
    console.warn(`Calendar sync: all ${failedCount} URL(s) failed`);
    window.dispatchEvent(new CustomEvent('calendar-sync-failed'));
  }
}

// Data sync interval: 5 minutes
const DATA_SYNC_INTERVAL = 5 * 60 * 1000;
// Calendar sync interval: 15 minutes
const CALENDAR_SYNC_INTERVAL = 15 * 60 * 1000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const statusRef = useRef<SyncStatus>(status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calendarSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0); // Prevents double-sync from interval + visibilitychange

  // Keep ref in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setStatus = useCallback((newStatus: SyncStatus) => {
    setStatusState(newStatus);
  }, []);

  const markSynced = useCallback(() => {
    setLastSynced(new Date());
    setStatusState('success');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
  }, []);

  // Unified sync: cloud data (always force — skip grace period)
  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    // Skip if a sync completed within the last 30 seconds (prevents double-fire)
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 30_000) return;

    isSyncingRef.current = true;
    setStatusState('syncing');

    try {
      const result = await syncFromCloud(true);
      if (result) {
        lastSyncTimeRef.current = Date.now();
        setLastSynced(new Date());
        setStatusState('success');
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
        window.dispatchEvent(new CustomEvent('cloud-sync-complete'));
      } else {
        setStatusState('idle');
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
      setStatusState('error');
      timeoutRef.current = setTimeout(() => setStatusState('idle'), 3000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (dataSyncIntervalRef.current) clearInterval(dataSyncIntervalRef.current);
      if (calendarSyncIntervalRef.current) clearInterval(calendarSyncIntervalRef.current);
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'offline') {
        setStatusState('idle');
        triggerSync();
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
  }, [triggerSync]);

  // Data sync: on mount + every 5 minutes
  // Uses merge-aware sync (never blind overwrite)
  useEffect(() => {
    triggerSync();

    dataSyncIntervalRef.current = setInterval(() => {
      triggerSync();
    }, DATA_SYNC_INTERVAL);

    return () => {
      if (dataSyncIntervalRef.current) clearInterval(dataSyncIntervalRef.current);
    };
  }, [triggerSync]);

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

  // Sync when app becomes visible — merge local + cloud data
  // syncFromCloud(force=true) bypasses grace period, merges both directions,
  // and pushes the merged result back to cloud
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
        syncAllCalendars();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [triggerSync]);

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
