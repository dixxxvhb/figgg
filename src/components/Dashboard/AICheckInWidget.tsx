import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { haptic } from '../../utils/haptics';

interface AICheckInWidgetProps {
  greeting: string;
  checkInType: 'morning' | 'afternoon';
  onSubmit: (message: string) => Promise<{ response: string; adjustments?: string[]; actions?: unknown[] }>;
  onSkip: () => void;
  onDone: () => void;
  autoDismissSeconds?: number; // default 20
}

type WidgetState = 'prompt' | 'loading' | 'response' | 'error' | 'gone';

export function AICheckInWidget({ greeting, checkInType, onSubmit, onSkip, onDone, autoDismissSeconds = 20 }: AICheckInWidgetProps) {
  const [state, setState] = useState<WidgetState>('prompt');
  const [message, setMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [adjustments, setAdjustments] = useState<string[]>([]);
  const [actionsApplied, setActionsApplied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissMs = autoDismissSeconds * 1000;

  // Don't auto-focus on mobile — keyboard pops up uninvited when just glancing at the app

  // Auto-dismiss after configured seconds — only for success responses, not errors
  useEffect(() => {
    if (state === 'response') {
      autoDismissRef.current = setTimeout(() => dismiss(), dismissMs);
      return () => clearTimeout(autoDismissRef.current);
    }
  }, [state, dismissMs]);

  const resetAutoDismiss = () => {
    if (state === 'response') {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = setTimeout(() => dismiss(), dismissMs);
    }
  };

  const dismiss = () => {
    clearTimeout(autoDismissRef.current);
    setState('gone');
    onDone();
  };

  if (state === 'gone') return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setState('loading');
    haptic('light');
    try {
      const result = await onSubmit(message.trim());
      setAiResponse(result.response);
      setAdjustments(result.adjustments || []);
      setActionsApplied((result.actions?.length ?? 0) > 0);
      setState('response');
    } catch (err) {
      console.error('[AICheckInWidget] caught error, showing error state', err);
      setState('error');
    }
  };

  const handleRetry = () => {
    haptic('light');
    handleSubmit();
  };

  const handleSkip = () => {
    haptic('light');
    onSkip();
    setState('gone');
    onDone();
  };

  const handleDismiss = () => {
    // If dismissed during loading, also skip so the prompt doesn't reappear
    if (state === 'loading') onSkip();
    dismiss();
  };

  return (
    <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 overflow-hidden">
      {/* Prompt state */}
      {state === 'prompt' && (
        <div className="p-4">
          <p className="text-sm text-forest-700 dark:text-blush-200 mb-3">{greeting}</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={checkInType === 'morning' ? 'Long day ahead...' : 'Things are going...'}
              className="flex-1 px-3 py-2 text-sm bg-blush-50 dark:bg-blush-700 border border-blush-200 dark:border-blush-600 rounded-xl text-forest-700 dark:text-white placeholder-blush-400 focus:outline-none focus:ring-1 focus:ring-forest-500"
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-forest-600 text-white disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
          <button onClick={handleSkip} className="mt-2 text-xs text-blush-400 dark:text-blush-500 hover:text-blush-600">
            Skip
          </button>
        </div>
      )}

      {/* Loading state */}
      {state === 'loading' && (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-forest-500" />
            <span className="text-sm text-blush-400 dark:text-blush-500">Thinking...</span>
          </div>
          <button onClick={handleDismiss} className="text-xs text-blush-400 hover:text-blush-600">
            Dismiss
          </button>
        </div>
      )}

      {/* Response state — auto-dismisses */}
      {state === 'response' && (
        <div className="p-4" onClick={resetAutoDismiss}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-forest-700 dark:text-blush-200 leading-relaxed">{aiResponse}</p>
            <button onClick={handleDismiss} className="flex-shrink-0 p-1 text-blush-400 hover:text-blush-600">
              <X size={14} />
            </button>
          </div>
          {adjustments.length > 0 && (
            <div className="mt-2">
              {actionsApplied && (
                <p className="text-[10px] text-forest-500 dark:text-forest-400 mb-1 font-medium">Changes applied:</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {adjustments.map((adj, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-forest-50 dark:bg-forest-900/30 text-forest-600 dark:text-forest-400">
                    {adj}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error state — no auto-dismiss, shows retry */}
      {state === 'error' && (
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">Couldn't connect. Try again?</p>
            </div>
            <button onClick={handleDismiss} className="flex-shrink-0 p-1 text-blush-400 hover:text-blush-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest-600 text-white rounded-lg active:scale-95 transition-transform"
            >
              <RefreshCw size={12} />
              Retry
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-blush-400 dark:text-blush-500 hover:text-blush-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
