import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, X } from 'lucide-react';
import { saveEvents } from '../../services/storage';

export function SaveStatus() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = saveEvents.subscribe((newStatus, msg) => {
      setStatus(newStatus);
      setMessage(msg || '');
      setVisible(true);

      // Auto-hide success messages after 2 seconds
      if (newStatus === 'saved') {
        setTimeout(() => setVisible(false), 2000);
      }
    });

    return () => { unsubscribe(); };
  }, []);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  if (status === 'saving') {
    return (
      <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg z-50">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-blue-800 text-sm">Saving...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg z-50">
        <Check className="w-5 h-5 text-green-600" />
        <span className="text-green-800 text-sm">Saved to cloud</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 shadow-lg z-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-red-800 text-sm font-medium">Save Failed</span>
            {message && (
              <p className="text-red-700 text-xs mt-1">{message}</p>
            )}
          </div>
          <button onClick={dismiss} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
