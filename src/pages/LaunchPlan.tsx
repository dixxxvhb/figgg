import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import {
  Check, SkipForward, ExternalLink, ChevronDown, ChevronRight,
  Pencil, Star, CircleDot, ListChecks, CalendarDays, Clock,
  Rocket, BarChart3, Target, AlertCircle,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { initialLaunchPlan } from '../data/launchPlan';
import type { LaunchTask, LaunchDecision, LaunchCategory } from '../types';

// ─── Category colors (semantic tokens) ───
const categoryColors: Record<LaunchCategory, { bg: string; text: string; dot: string }> = {
  BIZ: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-primary)]', dot: 'var(--accent-primary)' },
  CONTENT: { bg: 'bg-[color-mix(in_srgb,var(--accent-secondary)_10%,transparent)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  ADULT: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  PRO: { bg: 'bg-[color-mix(in_srgb,#7c3aed_10%,transparent)]', text: 'text-[#7c3aed]', dot: '#7c3aed' },
  DECIDE: { bg: 'bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)]', text: 'text-[var(--status-warning)]', dot: 'var(--status-warning)' },
  PREP: { bg: 'bg-[color-mix(in_srgb,#0d9488_10%,transparent)]', text: 'text-[#0d9488]', dot: '#0d9488' },
};

type TabId = 'today' | 'week' | 'progress' | 'decisions' | 'timeline';

const tabs: { id: TabId; label: string; icon: typeof ListChecks }[] = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'week', label: 'Week', icon: CalendarDays },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'decisions', label: 'Decisions', icon: CircleDot },
  { id: 'timeline', label: 'Timeline', icon: ListChecks },
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

// ─── Milestone badge ───
function MilestoneBadge({ label }: { label: string }) {
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] text-[var(--status-warning)] flex items-center gap-1">
      <Star size={10} className="fill-current" />
      {label}
    </span>
  );
}

// ─── Task Card (full detail for Today view) ───
function TaskCard({
  task, onComplete, onSkip, onUpdateNotes,
}: {
  task: LaunchTask;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
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
    <div className={`bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden ${isDone ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
        <CategoryBadge category={task.category} />
        {task.milestone && task.milestoneLabel && <MilestoneBadge label={task.milestoneLabel} />}
        {task.completed && <span className="text-xs text-[var(--status-success)] font-medium">Done</span>}
        {task.skipped && <span className="text-xs text-[var(--text-tertiary)] font-medium">Skipped</span>}
      </div>

      {/* Title + Instructions */}
      <div className="px-4 pb-3">
        <h3 className={`type-h2 mb-1 ${isDone ? 'line-through text-[var(--text-tertiary)]' : ''}`}>
          {task.title}
        </h3>
        <p className="type-body whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
          {task.instructions}
        </p>
      </div>

      {/* Action button */}
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
            onClick={() => onComplete(task.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:bg-[var(--accent-primary-hover)] active:scale-[0.98] min-h-[44px]"
          >
            <Check size={16} />
            Done
          </button>
          <button
            onClick={() => onSkip(task.id)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] font-medium text-sm min-h-[44px]"
          >
            <SkipForward size={16} />
            Skip
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Compact task row (for Week + Timeline views) ───
function TaskRow({
  task, onToggle,
}: {
  task: LaunchTask;
  onToggle: (id: string) => void;
}) {
  const c = categoryColors[task.category];
  const isDone = task.completed || task.skipped;

  return (
    <button
      onClick={() => !isDone && onToggle(task.id)}
      className={`w-full text-left flex items-start gap-3 py-2 px-1 rounded-[var(--radius-sm)] ${isDone ? 'opacity-50' : 'hover:bg-[var(--surface-inset)] active:bg-[var(--surface-inset)]'}`}
    >
      <div className={`w-5 h-5 mt-0.5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${isDone ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}>
        {isDone && <Check size={12} className="text-[var(--text-on-accent)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
          <span className={`type-body ${isDone ? 'line-through text-[var(--text-tertiary)]' : ''} line-clamp-1`}>
            {task.title}
          </span>
        </div>
        {task.milestone && task.milestoneLabel && (
          <span className="text-xs text-[var(--status-warning)] font-semibold">{task.milestoneLabel}</span>
        )}
      </div>
      {task.notes && <Pencil size={12} className="text-[var(--text-tertiary)] flex-shrink-0 mt-1" />}
    </button>
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

// ─── Contact Card ───
// ─── Week section (for Timeline) ───
function WeekSection({
  weekLabel, tasks, defaultOpen, onToggle,
}: {
  weekLabel: string;
  tasks: LaunchTask[];
  defaultOpen: boolean;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completed = tasks.filter(t => t.completed || t.skipped).length;
  const total = tasks.length;
  const hasMilestone = tasks.some(t => t.milestone);

  return (
    <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-card)] hover:bg-[var(--surface-inset)]"
      >
        <div className="flex items-center gap-2">
          <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
          </div>
          <span className="type-h2">{weekLabel}</span>
          {hasMilestone && <Star size={12} className="text-[var(--status-warning)]" style={{ fill: 'var(--status-warning)' }} />}
        </div>
        <span className="type-caption">
          {completed}/{total}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 bg-[var(--surface-card)] border-t border-[var(--border-subtle)]">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════

export function LaunchPlan() {
  const { data, updateLaunchPlan, saveDayPlan } = useAppData();
  const [activeTab, setActiveTab] = useState<TabId>('today');

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

    // Sync to Day Plan — mark matching launch item as completed
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

  const toggleTask = useCallback((id: string) => {
    const task = plan.tasks.find(t => t.id === id);
    if (!task || task.completed || task.skipped) return;
    completeTask(id);
  }, [plan.tasks, completeTask]);

  // ─── Decision operations ───
  const [justDecided, setJustDecided] = useState<string | null>(null);
  const decideDecision = useCallback((id: string, text: string) => {
    console.log('[LaunchPlan] Recording decision:', id, text);
    const decisions = plan.decisions.map(d =>
      d.id === id ? { ...d, status: 'decided' as const, decision: text, decidedAt: new Date().toISOString() } : d
    );
    console.log('[LaunchPlan] Decisions after update:', decisions.filter(d => d.status === 'decided').length, 'decided');
    updateLaunchPlan({ decisions });
    // Flash confirmation
    setJustDecided(id);
    setTimeout(() => setJustDecided(null), 2000);
  }, [plan.decisions, updateLaunchPlan]);

  // ─── Contact operations ───
  // ─── Computed data ───
  const todayTasks = useMemo(() =>
    plan.tasks.filter(t => t.scheduledDate === todayStr),
  [plan.tasks, todayStr]);

  // Find current week number based on today's date
  const currentWeekNumber = useMemo(() => {
    const todayTask = plan.tasks.find(t => t.scheduledDate === todayStr);
    if (todayTask) return todayTask.weekNumber;
    // Find nearest future task
    const futureTasks = plan.tasks.filter(t => t.scheduledDate >= todayStr).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    return futureTasks[0]?.weekNumber || 1;
  }, [plan.tasks, todayStr]);

  const weekTasks = useMemo(() =>
    plan.tasks.filter(t => t.weekNumber === currentWeekNumber),
  [plan.tasks, currentWeekNumber]);

  const currentWeekLabel = weekTasks[0]?.weekLabel || `Week ${currentWeekNumber}`;

  // Group tasks by week for timeline
  const weekGroups = useMemo(() => {
    const groups: { weekLabel: string; weekNumber: number; tasks: LaunchTask[] }[] = [];
    const seen = new Set<string>();
    for (const task of plan.tasks) {
      if (!seen.has(task.weekLabel)) {
        seen.add(task.weekLabel);
        groups.push({ weekLabel: task.weekLabel, weekNumber: task.weekNumber, tasks: [] });
      }
      groups.find(g => g.weekLabel === task.weekLabel)!.tasks.push(task);
    }
    return groups;
  }, [plan.tasks]);

  // Group decisions by month (with fallback for unmatched months)
  const decisionsByMonth = useMemo(() => {
    const months = ['february', 'march', 'april', 'may'] as const;
    const grouped = months.map(m => ({
      month: m.charAt(0).toUpperCase() + m.slice(1),
      decisions: plan.decisions.filter(d => d.month === m),
    })).filter(g => g.decisions.length > 0);
    // Defensive: if decisions exist but none matched month filter, show all
    if (grouped.length === 0 && plan.decisions.length > 0) {
      console.warn('[LaunchPlan] Decisions exist but no month matches — showing all as fallback');
      return [{ month: 'Decisions', decisions: plan.decisions }];
    }
    return grouped;
  }, [plan.decisions]);

  // Next milestone
  const nextMilestone = useMemo(() => {
    const future = plan.tasks
      .filter(t => t.milestone && !t.completed && !t.skipped && t.scheduledDate >= todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    if (!future[0]) return null;
    const days = differenceInDays(parseISO(future[0].scheduledDate), startOfDay(new Date()));
    return { task: future[0], daysAway: days };
  }, [plan.tasks, todayStr]);

  // Overall progress
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

  // All milestones for Progress tab
  const allMilestones = useMemo(() => {
    return plan.tasks
      .filter(t => t.milestone)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .map(t => {
        const days = differenceInDays(parseISO(t.scheduledDate), startOfDay(new Date()));
        return { ...t, daysAway: days };
      });
  }, [plan.tasks]);

  // ─── Overdue tasks (past date, not done) ───
  const overdueTasks = useMemo(() =>
    plan.tasks
      .filter(t => !t.completed && !t.skipped && t.scheduledDate < todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
  [plan.tasks, todayStr]);

  // ─── Next upcoming tasks (when no tasks today) ───
  const nextUpcomingTasks = useMemo(() => {
    if (todayTasks.length > 0 || overdueTasks.length > 0) return [];
    return plan.tasks
      .filter(t => !t.completed && !t.skipped && t.scheduledDate > todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .slice(0, 3);
  }, [plan.tasks, todayTasks, overdueTasks, todayStr]);

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
              {nextMilestone.task.milestoneLabel}
            </span>
          </div>
          <span className="font-[var(--font-display)] text-lg font-bold text-[var(--accent-primary)]">
            {nextMilestone.daysAway === 0 ? 'TODAY' : `${nextMilestone.daysAway}d away`}
          </span>
        </div>
      )}

      {/* Tabs — 3-column grid so all visible on mobile */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full text-sm font-semibold transition-colors min-h-[44px] ${
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

      {/* ─── TODAY VIEW ─── */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {/* Celebration: all today's tasks done */}
          {todayTasks.length > 0 && todayTasks.every(t => t.completed || t.skipped) && (
            <div className="bg-[var(--surface-highlight)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-5 text-center">
              <h3 className="type-h1 mb-1">
                All done for today!
              </h3>
              <p className="type-body text-[var(--text-secondary)] mb-4">
                {todayTasks.filter(t => t.completed).length} task{todayTasks.filter(t => t.completed).length !== 1 ? 's' : ''} crushed. You're building momentum.
              </p>
              <button
                onClick={() => setActiveTab('week')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)] min-h-[44px]"
              >
                <CalendarDays size={16} />
                Preview This Week
              </button>
            </div>
          )}

          {/* Overdue tasks */}
          {overdueTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={14} className="text-[var(--status-danger)]" />
                <h3 className="type-label text-[var(--status-danger)]">
                  Overdue ({overdueTasks.length})
                </h3>
              </div>
              <div className="space-y-4">
                {overdueTasks.map(task => (
                  <div key={task.id} className="relative">
                    <div className="absolute -top-1 right-3 z-10">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]">
                        {format(parseISO(task.scheduledDate), 'MMM d')}
                      </span>
                    </div>
                    <TaskCard
                      task={task}
                      onComplete={completeTask}
                      onSkip={skipTask}
                      onUpdateNotes={updateTaskNotes}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayTasks.length > 0 ? (
            <>
              {overdueTasks.length > 0 && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--text-tertiary)]" />
                  <h3 className="type-label text-[var(--text-tertiary)]">Today</h3>
                </div>
              )}
              {todayTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onSkip={skipTask}
                  onUpdateNotes={updateTaskNotes}
                />
              ))}
            </>
          ) : (
            <div className={`text-center ${overdueTasks.length > 0 ? 'py-4' : 'py-8'}`}>
              {overdueTasks.length === 0 && (
                <>
                  <p className="text-[var(--text-secondary)] mb-2">
                    {nextUpcomingTasks.length > 0 ? 'No tasks scheduled for today.' : 'All caught up!'}
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)] mb-6">
                    Miss a day? Just pick up the next one. This plan bends.
                  </p>
                </>
              )}
              {nextUpcomingTasks.length > 0 && (
                <div className="space-y-3 text-left">
                  <p className="type-label">Coming up</p>
                  {nextUpcomingTasks.map(task => (
                    <div key={task.id} className="bg-[var(--surface-card)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryBadge category={task.category} />
                        <span className="type-caption">{format(parseISO(task.scheduledDate), 'EEE, MMM d')}</span>
                      </div>
                      <p className="type-body">{task.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── WEEK VIEW ─── */}
      {activeTab === 'week' && (
        <div>
          {/* Celebration: all week's tasks done */}
          {weekTasks.length > 0 && weekTasks.every(t => t.completed || t.skipped) && (
            <div className="bg-[var(--surface-highlight)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-5 text-center mb-4">
              <h3 className="type-h1 mb-1">
                Week complete — you're on fire
              </h3>
              <p className="type-body text-[var(--text-secondary)] mb-4">
                {weekTasks.filter(t => t.completed).length}/{weekTasks.length} tasks done this week. Keep this energy.
              </p>
              {/* Preview next week's first tasks */}
              {(() => {
                const nextWeek = weekGroups.find(g => g.weekNumber === currentWeekNumber + 1);
                if (!nextWeek) return null;
                const preview = nextWeek.tasks.filter(t => !t.completed && !t.skipped).slice(0, 3);
                if (preview.length === 0) return null;
                return (
                  <div className="text-left mb-4 space-y-2">
                    <p className="type-label text-[var(--accent-primary)]">Next week sneak peek</p>
                    {preview.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColors[t.category].dot }} />
                        <span className="line-clamp-1">{t.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <button
                onClick={() => setActiveTab('timeline')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium hover:bg-[var(--accent-primary-hover)] min-h-[44px]"
              >
                <ListChecks size={16} />
                Peek at Full Timeline
              </button>
            </div>
          )}

          <h2 className="type-label mb-3">
            {currentWeekLabel}
          </h2>
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3">
            {weekTasks.map(task => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
          <p className="type-caption mt-3 text-center">
            {weekTasks.filter(t => t.completed || t.skipped).length}/{weekTasks.length} complete this week
          </p>
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

          {/* Category breakdown */}
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-4">
            <h3 className="type-label mb-3">By Category</h3>
            <div className="space-y-3">
              {categoryStats.map(stat => {
                const c = categoryColors[stat.category];
                return (
                  <div key={stat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.dot }} />
                        <span className="type-body">{categoryLabels[stat.category]}</span>
                      </div>
                      <span className="type-caption">{stat.done}/{stat.total}</span>
                    </div>
                    <div className="w-full h-1 bg-[var(--surface-inset)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${stat.pct}%`, backgroundColor: c.dot }}
                      />
                    </div>
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

          {/* Milestone countdown */}
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
                const isPastMilestone = m.daysAway < 0;
                return (
                  <div key={m.id} className={`px-4 py-3 flex items-center gap-3 ${isDone ? 'opacity-50' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                      isDone
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                        : isPastMilestone
                        ? 'border-[var(--status-danger)]'
                        : 'border-[var(--status-warning)]'
                    }`}>
                      {isDone && <Check size={12} className="text-[var(--text-on-accent)]" />}
                      {!isDone && <Star size={10} className={`fill-current ${isPastMilestone ? 'text-[var(--status-danger)]' : 'text-[var(--status-warning)]'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isDone ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                        {m.milestoneLabel}
                      </p>
                      <p className="type-caption">
                        {format(parseISO(m.scheduledDate), 'EEE, MMM d')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isDone ? (
                        <span className="text-xs text-[var(--status-success)] font-medium">Done</span>
                      ) : m.daysAway === 0 ? (
                        <span className="text-sm font-bold text-[var(--status-warning)]">TODAY</span>
                      ) : m.daysAway < 0 ? (
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

      {/* ─── TIMELINE VIEW ─── */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          {weekGroups.map(group => (
            <WeekSection
              key={group.weekLabel}
              weekLabel={group.weekLabel}
              tasks={group.tasks}
              defaultOpen={group.weekNumber === currentWeekNumber}
              onToggle={toggleTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
