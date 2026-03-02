import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { saveEvents } from '../../services/storage';
import { useSyncStatus } from '../../contexts/SyncContext';

export function SaveStatus() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'warning'>('idle');
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { triggerSync } = useSyncStatus();

  useEffect(() => {
    const unsubscribe = saveEvents.subscribe((newStatus, msg) => {
      if (newStatus === 'error' || newStatus === 'warning') {
        setStatus(newStatus);
        setMessage(msg || '');
        setVisible(true);
        setRetrying(false);
      } else {
        setVisible(false);
      }
    });

    const handleCalendarFailed = () => {
      setStatus('warning');
      setMessage('Calendar could not be synced — check your connection');
      setVisible(true);
    };
    window.addEventListener('calendar-sync-failed', handleCalendarFailed);

    return () => {
      unsubscribe();
      window.removeEventListener('calendar-sync-failed', handleCalendarFailed);
    };
  }, []);

  // Auto-dismiss: errors 8s (longer now — user might tap Retry), warnings 8s
  useEffect(() => {
    if (!visible) return;
    const delay = 8000;
    const timer = setTimeout(() => setVisible(false), delay);
    return () => clearTimeout(timer);
  }, [visible, status]);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await triggerSync();
    } finally {
      // If sync succeeds, the 'saved' event will hide the toast.
      // If it fails again, a new 'error' event re-shows with fresh message.
      setRetrying(false);
    }
    dismiss();
  };

  if (status === 'warning') {
    return (
      <div className="fixed top-16 left-4 right-4 mx-auto max-w-sm rounded-lg px-4 py-3 shadow-lg z-50 border border-[var(--border-subtle)] bg-[var(--surface-card)]" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[var(--text-primary)] text-sm font-medium">Storage Warning</span>
            {message && (
              <p className="text-[var(--text-secondary)] text-xs mt-1">{message}</p>
            )}
          </div>
          <button onClick={dismiss} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed top-16 left-4 right-4 mx-auto max-w-sm rounded-lg px-4 py-3 shadow-lg z-50 border border-[var(--border-subtle)] bg-[var(--surface-card)]" role="alert" aria-live="assertive">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-danger)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[var(--text-primary)] text-sm font-medium">Cloud Sync Failed</span>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">Your data is saved locally</p>
            {message && (
              <p className="text-[var(--text-secondary)] text-xs mt-1">{message}</p>
            )}
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-danger)] hover:opacity-80 active:opacity-60 disabled:opacity-50"
            >
              <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Retrying...' : 'Retry Now'}
            </button>
          </div>
          <button onClick={dismiss} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
