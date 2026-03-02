import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import {
  Check, SkipForward, ExternalLink, ChevronDown,
  Pencil, Star, CircleDot, Clock,
  Rocket, BarChart3, Target, AlertCircle,
  Layers, Lock, Zap, Timer, Briefcase,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { initialLaunchPlan } from '../data/launchPlan';
import type { LaunchTask, LaunchDecision, LaunchCategory, LaunchEffort } from '../types';

// ─── Category colors (semantic tokens) ───
const categoryColors: Record<LaunchCategory, { bg: string; text: string; dot: string }> = {
  BIZ: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-primary)]', dot: 'var(--accent-primary)' },
  CONTENT: { bg: 'bg-[color-mix(in_srgb,var(--accent-secondary)_10%,transparent)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  ADULT: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  PRO: { bg: 'bg-[color-mix(in_srgb,#7c3aed_10%,transparent)]', text: 'text-[#7c3aed]', dot: '#7c3aed' },
  DECIDE: { bg: 'bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)]', text: 'text-[var(--status-warning)]', dot: 'var(--status-warning)' },
  PREP: { bg: 'bg-[color-mix(in_srgb,#0d9488_10%,transparent)]', text: 'text-[#0d9488]', dot: '#0d9488' },
};

const effortConfig: Record<LaunchEffort, { label: string; icon: typeof Zap; color: string }> = {
  quick: { label: '<15m', icon: Zap, color: 'var(--status-success)' },
  medium: { label: '15-60m', icon: Timer, color: 'var(--status-warning)' },
  deep: { label: '1h+', icon: Briefcase, color: 'var(--accent-primary)' },
};

type TabId = 'backlog' | 'progress' | 'decisions' | 'milestones';

const tabs: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: 'backlog', label: 'Backlog', icon: Layers },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'decisions', label: 'Decisions', icon: CircleDot },
  { id: 'milestones', label: 'Milestones', icon: Target },
];

// ─── Category display names & badge ───
const categoryLabels: Record<LaunchCategory, string> = {
  BIZ: 'Business',
  CONTENT: 'Content',
  ADULT: 'Adult Co.',
  PRO: 'ProSeries',
  DECIDE: 'Decision',
  PREP: 'Prep',
};

function CategoryBadge({ category }: { category: LaunchCategory }) {
  const c = categoryColors[category];
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-full)] ${c.bg} ${c.text}`}>
      {categoryLabels[category]}
    </span>
  );
}

function EffortBadge({ effort }: { effort: LaunchEffort }) {
  const cfg = effortConfig[effort];
  const Icon = cfg.icon;
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-full)] flex items-center gap-0.5"
      style={{ backgroundColor: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: cfg.color }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Milestone badge ───
function MilestoneBadge({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] text-[var(--status-warning)] flex items-center gap-1">
      <Star size={10} className="fill-current" />
      {label}
    </span>
  );
}

// ─── Check if a task is blocked ───
function isTaskBlocked(task: LaunchTask, tasks: LaunchTask[]): boolean {
  if (!task.blockedBy || task.blockedBy.length === 0) return false;
  return task.blockedBy.some(depId => {
    const dep = tasks.find(t => t.id === depId);
    return dep && !dep.completed && !dep.skipped;
  });
}

// ─── Check if task is too early to surface ───
function isTooEarly(task: LaunchTask, todayStr: string): boolean {
  return !!task.suggestedAfter && task.suggestedAfter > todayStr;
}

// ─── Task Card (expandable detail) ───
function TaskCard({
  task, blocked, tooEarly, onComplete, onSkip, onUpdateNotes,
}: {
  task: LaunchTask;
  blocked: boolean;
  tooEarly: boolean;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localNotes, setLocalNotes] = useState(task.notes || '');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setLocalNotes(task.notes || ''); }, [task.notes]);

  const handleBlur = () => {
    if (localNotes !== (task.notes || '')) {
      onUpdateNotes(task.id, localNotes);
    }
  };

  const isDone = task.completed || task.skipped;

  return (
    <div className={`bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden ${isDone ? 'opacity-50' : blocked ? 'opacity-60' : ''}`}>
      {/* Compact row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-3 px-4 py-3"
      >
        <div className={`w-5 h-5 mt-0.5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${isDone ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}>
          {isDone && <Check size={12} className="text-[var(--text-on-accent)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`type-body font-medium ${isDone ? 'line-through text-[var(--text-tertiary)]' : ''}`}>
              {task.title}
            </span>
            {blocked && !isDone && <Lock size={12} className="text-[var(--text-tertiary)]" />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryBadge category={task.category} />
            <EffortBadge effort={task.effort} />
            {task.milestone && task.milestoneLabel && <MilestoneBadge label={task.milestoneLabel} />}
            {tooEarly && !isDone && (
              <span className="text-[10px] text-[var(--text-tertiary)]">
                after {task.suggestedAfter ? format(parseISO(task.suggestedAfter), 'MMM d') : ''}
              </span>
            )}
          </div>
        </div>
        <ChevronDown size={16} className={`text-[var(--text-tertiary)] flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)]">
          <div className="px-4 py-3">
            <p className="type-body whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
              {task.instructions}
            </p>
          </div>

          {task.actionUrl && (
            <div className="px-4 pb-3">
              <a
                href={task.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                <ExternalLink size={14} />
                {task.actionLabel || 'Open link'}
              </a>
            </div>
          )}

          {/* Notes */}
          <div className="px-4 pb-3">
            <textarea
              ref={notesRef}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={handleBlur}
              placeholder="Add notes..."
              rows={2}
              className="w-full text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Actions */}
          {!isDone && (
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:bg-[var(--accent-primary-hover)] active:scale-[0.98] min-h-[44px]"
              >
                <Check size={16} />
                Done
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSkip(task.id); }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] font-medium text-sm min-h-[44px]"
              >
                <SkipForward size={16} />
                Skip
              </button>
            </div>
          )}

          {isDone && (
            <div className="px-4 pb-3">
              <span className={`text-xs font-medium ${task.completed ? 'text-[var(--status-success)]' : 'text-[var(--text-tertiary)]'}`}>
                {task.completed ? `Completed ${task.completedAt ? format(parseISO(task.completedAt), 'MMM d') : ''}` : 'Skipped'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Decision Card ───
function DecisionCard({
  decision, onDecide, justSaved,
}: {
  decision: LaunchDecision;
  onDecide: (id: string, text: string) => void;
  justSaved?: boolean;
}) {
  const [text, setText] = useState(decision.decision || '');
  const isDecided = decision.status === 'decided';

  return (
    <div className={`bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-dashed shadow-[var(--shadow-card)] p-4 transition-colors duration-500 ${
      justSaved ? 'border-[var(--status-success)] bg-[color-mix(in_srgb,var(--status-success)_5%,transparent)]' : 'border-[var(--border-subtle)]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="type-h2 text-sm">{decision.question}</h4>
        <span className={`text-[11px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-full)] flex-shrink-0 ${
          isDecided
            ? 'bg-[color-mix(in_srgb,var(--status-success)_10%,transparent)] text-[var(--status-success)]'
            : 'bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] text-[var(--status-warning)]'
        }`}>
          {isDecided ? 'Decided' : 'Pending'}
        </span>
      </div>
      {decision.context && (
        <p className="type-caption mb-3">{decision.context}</p>
      )}
      {isDecided ? (
        <div className="bg-[color-mix(in_srgb,var(--status-success)_5%,transparent)] rounded-[var(--radius-sm)] p-3">
          <p className="text-sm text-[var(--status-success)] font-medium">{decision.decision}</p>
          {decision.decidedAt && (
            <p className="text-xs text-[var(--status-success)] opacity-70 mt-1">
              Decided {format(parseISO(decision.decidedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Record your decision..."
            className="flex-1 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
          />
          <button
            onClick={() => text.trim() && onDecide(decision.id, text.trim())}
            disabled={!text.trim()}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
          >
            Decide
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Progress Ring ───
function ProgressRing({ pct, size = 48, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-inset)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-500"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════

export function LaunchPlan() {
  const { data, updateLaunchPlan, saveDayPlan } = useAppData();
  const [activeTab, setActiveTab] = useState<TabId>('backlog');
  const [categoryFilter, setCategoryFilter] = useState<LaunchCategory | 'ALL'>('ALL');
  const [effortFilter, setEffortFilter] = useState<LaunchEffort | 'ALL'>('ALL');
  const [showCompleted, setShowCompleted] = useState(false);

  // Seed on first load
  useEffect(() => {
    if (!data.launchPlan) {
      updateLaunchPlan(initialLaunchPlan);
    }
  }, [data.launchPlan, updateLaunchPlan]);

  const plan = data.launchPlan || initialLaunchPlan;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // ─── Task operations ───
  const completeTask = useCallback((id: string) => {
    const tasks = plan.tasks.map(t =>
      t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
    );
    updateLaunchPlan({ tasks });

    // Sync to Day Plan
    if (data.dayPlan) {
      const dayItem = data.dayPlan.items.find(i => i.category === 'launch' && i.sourceId === id);
      if (dayItem && !dayItem.completed) {
        const updated = {
          ...data.dayPlan,
          items: data.dayPlan.items.map(i =>
            i.id === dayItem.id ? { ...i, completed: true } : i
          ),
          lastModified: new Date().toISOString(),
        };
        saveDayPlan(updated);
      }
    }
  }, [plan.tasks, updateLaunchPlan, data.dayPlan, saveDayPlan]);

  const skipTask = useCallback((id: string) => {
    const tasks = plan.tasks.map(t =>
      t.id === id ? { ...t, skipped: true, skippedAt: new Date().toISOString() } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  const updateTaskNotes = useCallback((id: string, notes: string) => {
    const tasks = plan.tasks.map(t =>
      t.id === id ? { ...t, notes } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  // ─── Decision operations ───
  const [justDecided, setJustDecided] = useState<string | null>(null);
  const decideDecision = useCallback((id: string, text: string) => {
    const decisions = plan.decisions.map(d =>
      d.id === id ? { ...d, status: 'decided' as const, decision: text, decidedAt: new Date().toISOString() } : d
    );
    updateLaunchPlan({ decisions });
    setJustDecided(id);
    setTimeout(() => setJustDecided(null), 2000);
  }, [plan.decisions, updateLaunchPlan]);

  // ─── Computed: smart backlog (sorted by actionability) ───
  const backlogTasks = useMemo(() => {
    let filtered = plan.tasks;

    // Category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    // Effort filter
    if (effortFilter !== 'ALL') {
      filtered = filtered.filter(t => t.effort === effortFilter);
    }

    // Split into sections
    const done = filtered.filter(t => t.completed || t.skipped);
    const active = filtered.filter(t => !t.completed && !t.skipped);

    // Sort active tasks: ready first (by priority), then blocked, then too-early
    const ready = active.filter(t => !isTaskBlocked(t, plan.tasks) && !isTooEarly(t, todayStr));
    const blocked = active.filter(t => isTaskBlocked(t, plan.tasks));
    const tooEarly = active.filter(t => !isTaskBlocked(t, plan.tasks) && isTooEarly(t, todayStr));

    ready.sort((a, b) => a.priority - b.priority);
    blocked.sort((a, b) => a.priority - b.priority);
    tooEarly.sort((a, b) => (a.suggestedAfter || '').localeCompare(b.suggestedAfter || ''));

    return { ready, blocked, tooEarly, done };
  }, [plan.tasks, categoryFilter, effortFilter, todayStr]);

  // ─── Computed: overall progress ───
  const progress = useMemo(() => {
    const done = plan.tasks.filter(t => t.completed || t.skipped).length;
    return { done, total: plan.tasks.length, pct: Math.round((done / plan.tasks.length) * 100) };
  }, [plan.tasks]);

  const pendingDecisions = plan.decisions.filter(d => d.status === 'pending').length;

  // Category stats for Progress tab
  const categoryStats = useMemo(() => {
    const cats: LaunchCategory[] = ['BIZ', 'CONTENT', 'ADULT', 'PRO', 'DECIDE', 'PREP'];
    return cats.map(cat => {
      const tasks = plan.tasks.filter(t => t.category === cat);
      const done = tasks.filter(t => t.completed || t.skipped).length;
      return { category: cat, done, total: tasks.length, pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 };
    }).filter(s => s.total > 0);
  }, [plan.tasks]);

  // Effort stats
  const effortStats = useMemo(() => {
    const efforts: LaunchEffort[] = ['quick', 'medium', 'deep'];
    return efforts.map(eff => {
      const tasks = plan.tasks.filter(t => t.effort === eff && !t.completed && !t.skipped);
      return { effort: eff, remaining: tasks.length };
    });
  }, [plan.tasks]);

  // All milestones
  const allMilestones = useMemo(() => {
    return plan.tasks
      .filter(t => t.milestone)
      .sort((a, b) => (a.suggestedAfter || a.scheduledDate || '').localeCompare(b.suggestedAfter || b.scheduledDate || ''))
      .map(t => {
        const dateStr = t.suggestedAfter || t.scheduledDate;
        const days = dateStr ? differenceInDays(parseISO(dateStr), startOfDay(new Date())) : 0;
        return { ...t, daysAway: days, dateStr };
      });
  }, [plan.tasks]);

  // Next milestone
  const nextMilestone = useMemo(() => {
    const future = allMilestones.filter(m => !m.completed && !m.skipped && m.daysAway >= 0);
    return future[0] || null;
  }, [allMilestones]);

  // Group decisions by month
  const decisionsByMonth = useMemo(() => {
    const months = ['february', 'march', 'april', 'may'] as const;
    const grouped = months.map(m => ({
      month: m.charAt(0).toUpperCase() + m.slice(1),
      decisions: plan.decisions.filter(d => d.month === m),
    })).filter(g => g.decisions.length > 0);
    if (grouped.length === 0 && plan.decisions.length > 0) {
      return [{ month: 'Decisions', decisions: plan.decisions }];
    }
    return grouped;
  }, [plan.decisions]);

  // Quick wins — ready tasks that are quick effort
  const quickWins = useMemo(() => {
    return backlogTasks.ready.filter(t => t.effort === 'quick').slice(0, 3);
  }, [backlogTasks.ready]);

  // Active categories for filter
  const activeCategories = useMemo(() => {
    const cats = new Set(plan.tasks.filter(t => !t.completed && !t.skipped).map(t => t.category));
    return Array.from(cats);
  }, [plan.tasks]);

  return (
    <div className="page-w px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Rocket size={20} className="text-[var(--accent-primary)]" />
          <h1 className="type-h1">DWDC Launch</h1>
        </div>
        <div className="text-right">
          <p className="type-caption">{progress.done}/{progress.total} tasks</p>
          <div className="w-24 h-1.5 bg-[var(--surface-inset)] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </div>

      {/* Milestone countdown */}
      {nextMilestone && (
        <div
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] border-l-[3px] px-3 py-2 mb-4 flex items-center justify-between bg-[var(--surface-card)]"
          style={{ borderLeftColor: 'var(--accent-primary)' }}
        >
          <div className="flex items-center gap-2">
            <Star size={14} className="text-[var(--status-warning)]" style={{ fill: 'var(--status-warning)' }} />
            <span className="type-h3 normal-case tracking-normal text-[var(--text-primary)]">
              {nextMilestone.milestoneLabel}
            </span>
          </div>
          <span className="font-[var(--font-display)] text-lg font-bold text-[var(--accent-primary)]">
            {nextMilestone.daysAway === 0 ? 'TODAY' : `${nextMilestone.daysAway}d away`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-semibold transition-colors min-h-[44px] whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-[var(--shadow-card)]'
                  : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] active:bg-[var(--surface-inset)]'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.id === 'decisions' && pendingDecisions > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-[var(--text-on-accent)]' : 'bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
                }`}>
                  {pendingDecisions}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── BACKLOG VIEW ─── */}
      {activeTab === 'backlog' && (
        <div className="space-y-4">
          {/* Quick wins banner */}
          {quickWins.length > 0 && (
            <div className="bg-[color-mix(in_srgb,var(--status-success)_5%,transparent)] border border-[color-mix(in_srgb,var(--status-success)_20%,transparent)] rounded-[var(--radius-md)] p-3">
              <p className="text-xs font-semibold text-[var(--status-success)] mb-1.5 flex items-center gap-1">
                <Zap size={12} />
                Quick wins — knock these out in minutes
              </p>
              <div className="space-y-1">
                {quickWins.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColors[t.category].dot }} />
                    <span className="text-sm text-[var(--text-primary)] line-clamp-1">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as LaunchCategory | 'ALL')}
              className="text-xs bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2.5 py-2 text-[var(--text-secondary)] min-h-[36px]"
            >
              <option value="ALL">All categories</option>
              {activeCategories.map(cat => (
                <option key={cat} value={cat}>{categoryLabels[cat]}</option>
              ))}
            </select>

            {/* Effort filter */}
            <select
              value={effortFilter}
              onChange={e => setEffortFilter(e.target.value as LaunchEffort | 'ALL')}
              className="text-xs bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2.5 py-2 text-[var(--text-secondary)] min-h-[36px]"
            >
              <option value="ALL">All effort</option>
              <option value="quick">Quick (&lt;15m)</option>
              <option value="medium">Medium (15-60m)</option>
              <option value="deep">Deep (1h+)</option>
            </select>
          </div>

          {/* Ready tasks */}
          {backlogTasks.ready.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="type-label text-[var(--status-success)]">
                  Ready ({backlogTasks.ready.length})
                </h3>
              </div>
              <div className="space-y-2">
                {backlogTasks.ready.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    blocked={false}
                    tooEarly={false}
                    onComplete={completeTask}
                    onSkip={skipTask}
                    onUpdateNotes={updateTaskNotes}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming (too early) tasks */}
          {backlogTasks.tooEarly.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-[var(--text-tertiary)]" />
                <h3 className="type-label text-[var(--text-tertiary)]">
                  Upcoming ({backlogTasks.tooEarly.length})
                </h3>
              </div>
              <div className="space-y-2">
                {backlogTasks.tooEarly.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    blocked={false}
                    tooEarly={true}
                    onComplete={completeTask}
                    onSkip={skipTask}
                    onUpdateNotes={updateTaskNotes}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Blocked tasks */}
          {backlogTasks.blocked.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lock size={14} className="text-[var(--text-tertiary)]" />
                <h3 className="type-label text-[var(--text-tertiary)]">
                  Blocked ({backlogTasks.blocked.length})
                </h3>
              </div>
              <div className="space-y-2">
                {backlogTasks.blocked.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    blocked={true}
                    tooEarly={false}
                    onComplete={completeTask}
                    onSkip={skipTask}
                    onUpdateNotes={updateTaskNotes}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed toggle */}
          {backlogTasks.done.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 type-label text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <ChevronDown size={14} className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
                Completed ({backlogTasks.done.length})
              </button>
              {showCompleted && (
                <div className="space-y-2 mt-2">
                  {backlogTasks.done.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      blocked={false}
                      tooEarly={false}
                      onComplete={completeTask}
                      onSkip={skipTask}
                      onUpdateNotes={updateTaskNotes}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {backlogTasks.ready.length === 0 && backlogTasks.blocked.length === 0 && backlogTasks.tooEarly.length === 0 && backlogTasks.done.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[var(--text-secondary)]">No tasks match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── PROGRESS VIEW ─── */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="type-h2">Overall Progress</h2>
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--accent-primary)]">{progress.pct}%</span>
            </div>
            <div className="w-full h-3 bg-[var(--surface-inset)] rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="flex justify-between type-caption">
              <span>{progress.done} completed</span>
              <span>{plan.tasks.filter(t => t.skipped).length} skipped</span>
              <span>{progress.total - progress.done} remaining</span>
            </div>
          </div>

          {/* Category breakdown with rings */}
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
            <h3 className="type-label mb-3">By Category</h3>
            <div className="grid grid-cols-3 gap-3">
              {categoryStats.map(stat => {
                const c = categoryColors[stat.category];
                return (
                  <div key={stat.category} className="text-center">
                    <div className="relative inline-block mb-1">
                      <ProgressRing pct={stat.pct} color={c.dot} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                        {stat.pct}%
                      </span>
                    </div>
                    <p className="type-caption">{categoryLabels[stat.category]}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{stat.done}/{stat.total}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Effort breakdown */}
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
            <h3 className="type-label mb-3">Remaining by Effort</h3>
            <div className="flex gap-4">
              {effortStats.map(stat => {
                const cfg = effortConfig[stat.effort];
                const Icon = cfg.icon;
                return (
                  <div key={stat.effort} className="flex items-center gap-2">
                    <Icon size={14} style={{ color: cfg.color }} />
                    <span className="text-sm text-[var(--text-primary)] font-medium">{stat.remaining}</span>
                    <span className="type-caption">{stat.effort}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decisions status */}
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center justify-between">
              <h3 className="type-label">Decisions</h3>
              <span className="type-caption">
                {plan.decisions.filter(d => d.status === 'decided').length}/{plan.decisions.length} decided
              </span>
            </div>
            {pendingDecisions > 0 && (
              <p className="text-sm text-[var(--status-warning)] mt-2 flex items-center gap-1">
                <CircleDot size={14} />
                {pendingDecisions} pending decision{pendingDecisions > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Recent completions */}
          {(() => {
            const recent = plan.tasks
              .filter(t => t.completed && t.completedAt)
              .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
              .slice(0, 5);
            if (recent.length === 0) return null;
            return (
              <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
                <h3 className="type-label mb-3">Recently Completed</h3>
                <div className="space-y-2">
                  {recent.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Check size={14} className="text-[var(--status-success)] flex-shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)] line-clamp-1">{t.title}</span>
                      <span className="type-caption flex-shrink-0 ml-auto">{t.completedAt ? format(parseISO(t.completedAt), 'MMM d') : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ─── DECISIONS VIEW ─── */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          {decisionsByMonth.map(group => (
            <div key={group.month}>
              <h2 className="type-label mb-3">
                {group.month}
              </h2>
              <div className="space-y-3">
                {group.decisions.map(d => (
                  <DecisionCard key={d.id} decision={d} onDecide={decideDecision} justSaved={justDecided === d.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MILESTONES VIEW ─── */}
      {activeTab === 'milestones' && (
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="type-label flex items-center gap-2">
              <Target size={14} />
              Milestones
            </h3>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {allMilestones.map(m => {
              const isDone = m.completed || m.skipped;
              const isPast = m.daysAway < 0;
              return (
                <div key={m.id} className={`px-4 py-3 flex items-center gap-3 ${isDone ? 'opacity-50' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                    isDone
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                      : isPast
                      ? 'border-[var(--status-danger)]'
                      : 'border-[var(--status-warning)]'
                  }`}>
                    {isDone && <Check size={12} className="text-[var(--text-on-accent)]" />}
                    {!isDone && <Star size={10} className={`fill-current ${isPast ? 'text-[var(--status-danger)]' : 'text-[var(--status-warning)]'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDone ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                      {m.milestoneLabel}
                    </p>
                    {m.dateStr && (
                      <p className="type-caption">
                        {format(parseISO(m.dateStr), 'EEE, MMM d')}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isDone ? (
                      <span className="text-xs text-[var(--status-success)] font-medium">Done</span>
                    ) : m.daysAway === 0 ? (
                      <span className="text-sm font-bold text-[var(--status-warning)]">TODAY</span>
                    ) : isPast ? (
                      <span className="text-xs font-bold text-[var(--status-danger)]">{Math.abs(m.daysAway)}d ago</span>
                    ) : (
                      <span className="text-sm font-bold text-[var(--status-warning)]">{m.daysAway}d</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
