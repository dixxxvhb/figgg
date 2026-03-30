import { useEffect } from 'react';
import { toast } from 'sonner';
import { saveEvents } from '../../services/storage';
import { useSyncStatus } from '../../contexts/SyncContext';

/**
 * SaveStatus — listens to storage/sync events and shows sonner toasts.
 * Renders nothing; all feedback goes through the sonner Toaster in App.tsx.
 */
export function SaveStatus() {
  const { triggerSync } = useSyncStatus();

  useEffect(() => {
    const unsubscribe = saveEvents.subscribe((newStatus, msg) => {
      if (newStatus === 'error') {
        toast.error('Cloud Sync Failed', {
          description: msg || 'Your data is saved locally',
          action: {
            label: 'Retry',
            onClick: () => triggerSync(),
          },
          duration: 8000,
        });
      } else if (newStatus === 'warning') {
        toast.warning('Storage Warning', {
          description: msg || 'Check your storage',
          duration: 8000,
        });
      }
    });

    const handleCalendarFailed = () => {
      toast.warning('Calendar Sync', {
        description: 'Calendar could not be synced — check your connection',
        duration: 6000,
      });
    };
    window.addEventListener('calendar-sync-failed', handleCalendarFailed);

    const handleSyncWarning = (e: Event) => {
      toast.warning('Sync Notice', {
        description: (e as CustomEvent).detail || 'Cloud sync issues',
        duration: 6000,
      });
    };
    window.addEventListener('figgg-sync-warning', handleSyncWarning);

    return () => {
      unsubscribe();
      window.removeEventListener('calendar-sync-failed', handleCalendarFailed);
      window.removeEventListener('figgg-sync-warning', handleSyncWarning);
    };
  }, [triggerSync]);

  return null;
}
