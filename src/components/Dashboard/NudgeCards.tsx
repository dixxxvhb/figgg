import { Link } from 'react-router-dom';
import { X, Clock, ChevronRight } from 'lucide-react';
import type { Nudge } from '../../hooks/useNudges';
import { dismissNudge, snoozeNudge } from '../../hooks/useNudges';
import { haptic } from '../../utils/haptics';

interface NudgeCardsProps {
  nudges: Nudge[];
  onDismissOrSnooze: () => void; // trigger re-render
}

export function NudgeCards({ nudges, onDismissOrSnooze }: NudgeCardsProps) {
  if (nudges.length === 0) return null;

  const handleDismiss = (id: string) => {
    haptic('light');
    dismissNudge(id);
    onDismissOrSnooze();
  };

  const handleSnooze = (id: string) => {
    haptic('light');
    snoozeNudge(id);
    onDismissOrSnooze();
  };

  const priorityStyles = {
    high: 'border-l-[var(--status-warning)]',
    medium: 'border-l-[var(--accent-primary)]',
    low: 'border-l-[var(--border-subtle)]',
  };

  return (
    <div className="space-y-2">
      {nudges.map(nudge => (
        <div
          key={nudge.id}
          className={`bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] border-l-[3px] ${priorityStyles[nudge.priority]} p-3`}
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-[var(--text-primary)] leading-snug">
              {nudge.text}
            </p>
            {nudge.dismissable && (
              <button
                onClick={() => handleDismiss(nudge.id)}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {nudge.aiPreload && nudge.actionLabel && (
              <Link
                to={`/ai?preload=${encodeURIComponent(nudge.aiPreload)}`}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-muted)] rounded-lg active:scale-95 transition-transform"
              >
                {nudge.actionLabel}
                <ChevronRight size={12} />
              </Link>
            )}
            {nudge.snoozeable && (
              <button
                onClick={() => handleSnooze(nudge.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <Clock size={11} />
                Later
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
