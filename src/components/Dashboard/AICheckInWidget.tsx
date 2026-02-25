import { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { haptic } from '../../utils/haptics';

interface AICheckInWidgetProps {
  greeting: string;
  checkInType: 'morning' | 'afternoon';
  completedToday?: boolean; // If true, widget starts hidden (defensive guard)
  onSubmit: (message: string) => Promise<{ response: string; adjustments?: string[]; actions?: unknown[] }>;
  onSkip: () => void;
  onDone: () => void;
  autoDismissSeconds?: number; // default 20
}

type WidgetState = 'prompt' | 'loading' | 'response' | 'error' | 'gone';

export function AICheckInWidget({ greeting, checkInType, completedToday, onSubmit, onSkip, onDone, autoDismissSeconds = 20 }: AICheckInWidgetProps) {
  const [state, setState] = useState<WidgetState>(() => completedToday ? 'gone' : 'prompt');
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
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Prompt state */}
      {state === 'prompt' && (
        <div className="p-4">
          <p className="text-sm text-[var(--text-primary)] mb-3">{greeting}</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={checkInType === 'morning' ? 'Long day ahead...' : 'Things are going...'}
              className="flex-1 px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Send size={16} />
            </button>
          </div>
          <button onClick={handleSkip} className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            Skip
          </button>
        </div>
      )}

      {/* Loading state */}
      {state === 'loading' && (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" />
            <span className="text-sm text-[var(--text-tertiary)]">Thinking...</span>
          </div>
          <button onClick={handleDismiss} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            Dismiss
          </button>
        </div>
      )}

      {/* Response state — auto-dismisses */}
      {state === 'response' && (
        <div className="p-4" onClick={resetAutoDismiss}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{aiResponse}</p>
            <button onClick={handleDismiss} className="flex-shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              <X size={14} />
            </button>
          </div>
          {adjustments.length > 0 && (
            <div className="mt-2">
              {actionsApplied && (
                <p className="text-[10px] text-[var(--accent-primary)] mb-1 font-medium">Changes applied:</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {adjustments.map((adj, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
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
              <AlertCircle size={16} className="text-[var(--status-danger)] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--status-danger)]">Couldn't connect. Try again?</p>
            </div>
            <button onClick={handleDismiss} className="flex-shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-lg active:scale-95 transition-transform"
            >
              <RefreshCw size={12} />
              Retry
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
