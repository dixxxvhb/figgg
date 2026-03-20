import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RefreshCw, ChevronDown } from 'lucide-react';
import type { DayPlan, DayPlanItem } from '../../types';
import { formatTimeDisplay } from '../../utils/time';
import { haptic } from '../../utils/haptics';

const CATEGORY_COLORS: Record<DayPlanItem['category'], string> = {
  wellness: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  task: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  launch: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  break: 'bg-[var(--surface-inset)] text-[var(--text-secondary)]',
  med: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  selfcare: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
};

const CATEGORY_LABELS: Partial<Record<DayPlanItem['category'], string>> = {
  selfcare: 'self-care',
};

const CATEGORY_LINK: Record<DayPlanItem['category'], string | null> = {
  wellness: '/me',
  task: '/tasks',
  class: null, // needs sourceId
  launch: '/launch',
  break: null,
  med: '/me',
  selfcare: '/me?tab=breathing',
};

interface DayPlanWidgetProps {
  plan: DayPlan;
  onToggleItem: (itemId: string) => void;
  onReplan: () => void;
  isReplanning: boolean;
}

export function DayPlanWidget({ plan, onToggleItem, onReplan, isReplanning }: DayPlanWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const [replanError, setReplanError] = useState(false);

  const handleReplan = () => {
    setReplanError(false);
    // Timeout safety: if replan takes >30s, show error
    const timeout = setTimeout(() => setReplanError(true), 30000);
    Promise.resolve(onReplan()).catch(() => setReplanError(true)).finally(() => clearTimeout(timeout));
  };

  const completed = plan.items.filter(i => i.completed).length;
  const total = plan.items.length;

  if (total === 0) return null;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Header — expand/collapse only, no nested buttons */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-card-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-display text-[var(--text-primary)]">Day Plan</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium">
            {completed}/{total}
          </span>
          {isReplanning && <RefreshCw size={11} className="animate-spin text-[var(--accent-primary)]" />}
        </div>
        <ChevronDown size={14} className={`text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Summary */}
      {plan.summary && expanded && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--text-secondary)] italic">{plan.summary}</p>
        </div>
      )}

      {/* Items */}
      {expanded && (
        <div className="divide-y divide-[var(--border-subtle)]/50">
          {plan.items.map(item => {
            const linkTo = item.category === 'class' && item.sourceId
              ? `/class/${item.sourceId}/notes`
              : CATEGORY_LINK[item.category];

            const content = (
              <div className="flex items-start gap-2.5 px-4 py-2.5">
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); haptic('light'); onToggleItem(item.id); }}
                  className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90 ${
                    item.completed
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)]'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  {item.completed && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.time && (
                      <span className="text-[11px] font-medium text-[var(--text-tertiary)] flex-shrink-0">{formatTimeDisplay(item.time)}</span>
                    )}
                    <span className={`text-sm ${item.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    {item.aiNote && (
                      <span className="text-[10px] text-[var(--text-tertiary)] italic">{item.aiNote}</span>
                    )}
                  </div>
                </div>
              </div>
            );

            return linkTo && !item.completed ? (
              <Link key={item.id} to={linkTo} className="block hover:bg-[var(--surface-card-hover)] transition-colors">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}

      {/* Progress bar + Re-plan button */}
      {expanded && total > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-2">
          <div className="h-1.5 bg-[var(--surface-inset)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <button
            onClick={handleReplan}
            disabled={isReplanning}
            className="w-full text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-[var(--surface-inset)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={isReplanning ? 'animate-spin' : ''} />
            {replanError ? 'Failed — tap to retry' : 'Re-plan'}
          </button>
        </div>
      )}
    </div>
  );
}
