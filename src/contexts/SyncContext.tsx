import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { syncFromCloud } from '../services/storage';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncContextType {
  status: SyncStatus;
  lastSynced: Date | null;
  setStatus: (status: SyncStatus) => void;
  markSynced: () => void;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

// Sync interval - check cloud every 30 seconds
const SYNC_INTERVAL = 30 * 1000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const statusRef = useRef<SyncStatus>(status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

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
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Reset to idle after a moment
    timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);
  }, []);

  // Auto-sync function
  const triggerSync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setStatusState('syncing');

    try {
      const result = await syncFromCloud();
      if (result) {
        setLastSynced(new Date());
        setStatusState('success');
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // Reset to idle after a moment
        timeoutRef.current = setTimeout(() => setStatusState('idle'), 2000);

        // Trigger a page refresh of data by dispatching a custom event
        window.dispatchEvent(new CustomEvent('cloud-sync-complete'));
      } else {
        setStatusState('idle');
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
      setStatusState('error');
      // Reset to idle after showing error briefly
      timeoutRef.current = setTimeout(() => setStatusState('idle'), 3000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Check online status - only run once on mount
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'offline') {
        setStatusState('idle');
        // Sync when coming back online
        triggerSync();
      }
    };
    const handleOffline = () => setStatusState('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) setStatusState('offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Auto-sync on app load and periodically
  useEffect(() => {
    // Sync immediately on mount (app load)
    triggerSync();

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      triggerSync();
    }, SYNC_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [triggerSync]);

  // Sync when app becomes visible (user switches back to tab/app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerSync]);

  return (
    <SyncContext.Provider value={{ status, lastSynced, setStatus, markSynced, triggerSync }}>
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
