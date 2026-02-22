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
  break: 'bg-blush-100 dark:bg-blush-700 text-blush-500 dark:text-blush-400',
  med: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const CATEGORY_LINK: Record<DayPlanItem['category'], string | null> = {
  wellness: '/me',
  task: '/me',
  class: null, // needs sourceId
  launch: '/launch',
  break: null,
  med: '/me',
};

interface DayPlanWidgetProps {
  plan: DayPlan;
  onToggleItem: (itemId: string) => void;
  onReplan: () => void;
  isReplanning: boolean;
}

export function DayPlanWidget({ plan, onToggleItem, onReplan, isReplanning }: DayPlanWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const completed = plan.items.filter(i => i.completed).length;
  const total = plan.items.length;

  if (total === 0) return null;

  return (
    <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 overflow-hidden">
      {/* Header — expand/collapse only, no nested buttons */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blush-50 dark:hover:bg-blush-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-forest-700 dark:text-white">Day Plan</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-forest-100 dark:bg-forest-900/30 text-forest-600 dark:text-forest-400 font-medium">
            {completed}/{total}
          </span>
          {isReplanning && <RefreshCw size={11} className="animate-spin text-forest-400" />}
        </div>
        <ChevronDown size={14} className={`text-blush-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Summary */}
      {plan.summary && expanded && (
        <div className="px-4 pb-2">
          <p className="text-xs text-blush-500 dark:text-blush-400 italic">{plan.summary}</p>
        </div>
      )}

      {/* Items */}
      {expanded && (
        <div className="divide-y divide-blush-50 dark:divide-blush-700/50">
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
                      ? 'bg-forest-500 border-forest-500 text-white'
                      : 'border-blush-300 dark:border-blush-600'
                  }`}
                >
                  {item.completed && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.time && (
                      <span className="text-[11px] font-medium text-blush-400 dark:text-blush-500 flex-shrink-0">{formatTimeDisplay(item.time)}</span>
                    )}
                    <span className={`text-sm ${item.completed ? 'line-through text-blush-400 dark:text-blush-500' : 'text-forest-700 dark:text-white'}`}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                      {item.category}
                    </span>
                    {item.aiNote && (
                      <span className="text-[10px] text-blush-400 dark:text-blush-500 italic">{item.aiNote}</span>
                    )}
                  </div>
                </div>
              </div>
            );

            return linkTo && !item.completed ? (
              <Link key={item.id} to={linkTo} className="block hover:bg-blush-50 dark:hover:bg-blush-700/30 transition-colors">
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
          <div className="h-1.5 bg-blush-100 dark:bg-blush-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-500 rounded-full transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <button
            onClick={onReplan}
            disabled={isReplanning}
            className="w-full text-xs text-blush-400 dark:text-blush-500 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-blush-50 dark:hover:bg-blush-700/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={isReplanning ? 'animate-spin' : ''} />
            Re-plan
          </button>
        </div>
      )}
    </div>
  );
}
