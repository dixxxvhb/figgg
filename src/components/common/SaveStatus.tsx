import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { saveEvents } from '../../services/storage';

export function SaveStatus() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = saveEvents.subscribe((newStatus, msg) => {
      // Only show errors — saving/saved happens silently in the background
      if (newStatus === 'error') {
        setStatus(newStatus);
        setMessage(msg || '');
        setVisible(true);
      } else {
        setVisible(false);
      }
    });

    return () => { unsubscribe(); };
  }, []);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  if (status === 'error') {
    return (
      <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 shadow-lg z-50" style={{ marginBottom: 'env(safe-area-inset-bottom, 0)' }} role="alert" aria-live="assertive">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-red-800 dark:text-red-200 text-sm font-medium">Save Failed</span>
            {message && (
              <p className="text-red-700 dark:text-red-300 text-xs mt-1">{message}</p>
            )}
          </div>
          <button onClick={dismiss} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
