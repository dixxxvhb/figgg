import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import {
  Check, SkipForward, ExternalLink, ChevronDown, ChevronRight,
  Pencil, Star, CircleDot, Clock, MessageCircle,
  Rocket, BarChart3, Target, AlertCircle, CalendarClock,
  Layers, Lock, Zap, Timer, Briefcase, ArrowRight,
  Map, Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';
import { initialLaunchPlan } from '../data/launchPlan';
import type { LaunchTask, LaunchDecision, LaunchCategory, LaunchEffort, LaunchPhase } from '../types';
import {
  computeFocusStack, getCurrentPhases, getNextPhase, getPhaseById,
  getPhaseProgress, isTaskReady, getBlockingDecisions, inferActionUrl,
} from '../utils/launchFocus';

// ─── Category colors (semantic tokens) ───
const categoryColors: Record<LaunchCategory, { bg: string; text: string; dot: string }> = {
  BIZ: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-primary)]', dot: 'var(--accent-primary)' },
  CONTENT: { bg: 'bg-[color-mix(in_srgb,var(--accent-secondary)_10%,transparent)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  ADULT: { bg: 'bg-[var(--accent-muted)]', text: 'text-[var(--accent-secondary)]', dot: 'var(--accent-secondary)' },
  PRO: { bg: 'bg-[color-mix(in_srgb,#7c3aed_10%,transparent)]', text: 'text-[#7c3aed]', dot: '#7c3aed' },
  DECIDE: { bg: 'bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)]', text: 'text-[var(--status-warning)]', dot: 'var(--status-warning)' },
  SPACE: { bg: 'bg-[color-mix(in_srgb,#2563eb_10%,transparent)]', text: 'text-[#2563eb]', dot: '#2563eb' },
};

const effortConfig: Record<LaunchEffort, { label: string; icon: typeof Zap; color: string }> = {
  quick: { label: '<15m', icon: Zap, color: 'var(--status-success)' },
  medium: { label: '15-60m', icon: Timer, color: 'var(--status-warning)' },
  deep: { label: '1h+', icon: Briefcase, color: 'var(--accent-primary)' },
};

type ViewId = 'today' | 'roadmap' | 'pulse';

const views: { id: ViewId; label: string; icon: typeof Layers }[] = [
  { id: 'today', label: 'Today', icon: Target },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'pulse', label: 'Pulse', icon: Activity },
];

const categoryLabels: Record<LaunchCategory, string> = {
  BIZ: 'Business',
  CONTENT: 'Content',
  ADULT: 'Adult Co.',
  PRO: 'ProSeries',
  DECIDE: 'Decision',
  SPACE: 'Space',
};

// ─── Shared components ───

const fallbackColor = { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-muted)]', dot: 'var(--text-muted)' };

function CategoryBadge({ category }: { category: LaunchCategory }) {
  const c = categoryColors[category] || fallbackColor;
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-full)] ${c.bg} ${c.text}`}>
      {categoryLabels[category] || category}
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
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

// ─── Task Card (shared between Today and Roadmap) ───

interface TaskCardProps {
  task: LaunchTask;
  allTasks: LaunchTask[];
  expanded: boolean;
  onToggle: () => void;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onDefer: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onDecide: (id: string, decision: string) => void;
  compact?: boolean;
}

function TaskCard({ task, allTasks, expanded, onToggle, onComplete, onSkip, onDefer, onNoteChange, onDecide, compact }: TaskCardProps) {
  const navigate = useNavigate();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const actionUrl = inferActionUrl(task);
  const blockingDecisions = getBlockingDecisions(task.id, allTasks);
  const isBlocked = task.blockedBy?.some(bid => {
    const b = allTasks.find(t => t.id === bid);
    return b && !b.completed && !b.skipped;
  });
  const isDone = task.completed || task.skipped;

  return (
    <div className={`rounded-[var(--radius-lg)] border transition-all ${isDone ? 'opacity-50 border-[var(--border-subtle)]' : isBlocked ? 'opacity-60 border-[var(--border-subtle)]' : 'border-[var(--border-default)] shadow-sm'}`}>
      {/* Blocking decision inline */}
      {!isDone && blockingDecisions.length > 0 && (
        <div className="px-4 py-2 border-b border-dashed border-[var(--status-warning)] bg-[color-mix(in_srgb,var(--status-warning)_5%,transparent)]">
          {blockingDecisions.map(d => (
            <InlineDecision key={d.id} task={d} onDecide={onDecide} />
          ))}
        </div>
      )}

      {/* Main card content */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Status circle */}
        <div
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            task.completed ? 'bg-[var(--status-success)] border-[var(--status-success)]' :
            task.skipped ? 'bg-[var(--text-muted)] border-[var(--text-muted)]' :
            isBlocked ? 'border-[var(--border-subtle)]' :
            'border-[var(--border-default)]'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDone && !isBlocked) onComplete(task.id);
          }}
        >
          {task.completed && <Check size={14} className="text-white" />}
          {task.skipped && <SkipForward size={12} className="text-white" />}
          {isBlocked && !isDone && <Lock size={10} className="text-[var(--text-muted)]" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`type-body font-medium ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            {task.title}
          </p>
          {!compact && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <CategoryBadge category={task.category} />
              <EffortBadge effort={task.effort} />
              {task.milestone && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-full)] bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] text-[var(--status-warning)] flex items-center gap-0.5">
                  <Star size={10} /> {task.milestoneLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)]">
          <p className="type-caption text-[var(--text-secondary)] mt-3 leading-relaxed">
            {task.instructions}
          </p>

          {/* Action URL + AI help */}
          <div className="flex gap-2 flex-wrap">
            {actionUrl && (
              <a
                href={actionUrl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={14} /> {actionUrl.label}
              </a>
            )}
            <button
              onClick={() => navigate(`/ai?preload=${encodeURIComponent(`I need to work on: "${task.title}". ${task.instructions}. Help me break this down or get started.`)}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <MessageCircle size={14} /> Talk through this
            </button>
          </div>

          {/* Notes */}
          <textarea
            ref={noteRef}
            placeholder="Add a note..."
            defaultValue={task.notes || ''}
            onBlur={() => {
              if (noteRef.current) onNoteChange(task.id, noteRef.current.value);
            }}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] type-caption resize-none"
            rows={2}
          />

          {/* Actions */}
          {!isDone && (
            <div className="flex gap-2">
              <button
                onClick={() => onComplete(task.id)}
                disabled={!!isBlocked}
                className="flex-1 py-2 rounded-[var(--radius-md)] bg-[var(--status-success)] text-white font-medium text-[13px] disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Done
              </button>
              <button
                onClick={() => onSkip(task.id)}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-muted)] text-[13px] hover:bg-[var(--bg-secondary)]"
              >
                Skip
              </button>
              <button
                onClick={() => onDefer(task.id)}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-muted)] text-[13px] hover:bg-[var(--bg-secondary)]"
              >
                Not today
              </button>
            </div>
          )}

          {isDone && task.completedAt && (
            <p className="type-caption text-[var(--text-muted)]">
              {task.completed ? 'Completed' : 'Skipped'} {format(parseISO(task.completedAt || task.skippedAt || ''), 'MMM d')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Decision (appears above blocked tasks) ───

function InlineDecision({ task, onDecide }: { task: LaunchTask; onDecide: (id: string, decision: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-2">
      <AlertCircle size={14} className="text-[var(--status-warning)] flex-shrink-0" />
      <span className="type-caption text-[var(--text-secondary)] flex-1">{task.title}</span>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Decide..."
        className="px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] w-28"
      />
      <button
        onClick={() => { if (value.trim()) onDecide(task.id, value.trim()); }}
        disabled={!value.trim()}
        className="px-2 py-1 rounded bg-[var(--status-warning)] text-white text-[12px] font-medium disabled:opacity-40"
      >
        Decide
      </button>
    </div>
  );
}

// ─── Phase Banner ───

function PhaseBanner({ phases, tasks }: { phases: LaunchPhase[]; tasks: LaunchTask[] }) {
  const today = new Date().toISOString().split('T')[0];
  const current = getCurrentPhases(phases, today);
  const next = getNextPhase(phases, today);
  const display = current.length > 0 ? current[0] : next;
  if (!display) return null;

  const progress = getPhaseProgress(tasks, display.id);
  const isCurrent = current.some(p => p.id === display.id);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] p-4 bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between mb-1">
        <p className="type-caption font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {isCurrent ? `Phase ${display.id}` : `Next: Phase ${display.id}`}
        </p>
        <p className="type-caption text-[var(--text-muted)]">
          {progress.done}/{progress.total}
        </p>
      </div>
      <p className="type-body font-medium text-[var(--text-primary)] mb-1">{display.name}</p>
      <p className="type-caption text-[var(--text-muted)] mb-2">
        {format(parseISO(display.startDate), 'MMM d')} – {format(parseISO(display.endDate), 'MMM d')}
      </p>
      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TODAY VIEW — Daily action surface
// ═══════════════════════════════════════════════════

function TodayView({
  tasks, phases, wellnessMode, expandedId, setExpandedId,
  onComplete, onSkip, onDefer, onNoteChange, onDecide,
}: {
  tasks: LaunchTask[];
  phases: LaunchPhase[];
  wellnessMode: 'okay' | 'rough' | 'survival';
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onDefer: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onDecide: (id: string, decision: string) => void;
}) {
  const focusStack = useMemo(() => computeFocusStack(tasks, phases, wellnessMode), [tasks, phases, wellnessMode]);
  const today = new Date().toISOString().split('T')[0];

  const quickWins = useMemo(() =>
    tasks.filter(t => isTaskReady(t, tasks, today) && t.effort === 'quick' && !focusStack.some(f => f.id === t.id)),
    [tasks, today, focusStack]
  );
  const [showQuickWins, setShowQuickWins] = useState(false);

  // Auto-expand the first focus task
  useEffect(() => {
    if (focusStack.length > 0 && !expandedId) {
      setExpandedId(focusStack[0].id);
    }
  }, [focusStack, expandedId, setExpandedId]);

  return (
    <div className="space-y-4">
      <PhaseBanner phases={phases} tasks={tasks} />

      {focusStack.length === 0 ? (
        <div className="text-center py-8">
          <p className="type-body text-[var(--text-muted)]">Nothing to focus on right now.</p>
          <p className="type-caption text-[var(--text-muted)] mt-1">Check the Roadmap for upcoming tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide">Focus</p>
          {focusStack.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={tasks}
              expanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
              onComplete={onComplete}
              onSkip={onSkip}
              onDefer={onDefer}
              onNoteChange={onNoteChange}
              onDecide={onDecide}
              compact={i > 0 && expandedId !== task.id}
            />
          ))}
        </div>
      )}

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div>
          <button
            onClick={() => setShowQuickWins(!showQuickWins)}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--status-success)_8%,transparent)] text-[var(--status-success)] type-caption font-semibold"
          >
            <Zap size={14} />
            <span>{quickWins.length} quick win{quickWins.length !== 1 ? 's' : ''} available</span>
            <ChevronDown size={14} className={`ml-auto transition-transform ${showQuickWins ? 'rotate-180' : ''}`} />
          </button>
          {showQuickWins && (
            <div className="mt-2 space-y-2">
              {quickWins.slice(0, 5).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  allTasks={tasks}
                  expanded={expandedId === task.id}
                  onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  onComplete={onComplete}
                  onSkip={onSkip}
                  onDefer={onDefer}
                  onNoteChange={onNoteChange}
                  onDecide={onDecide}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ROADMAP VIEW — Phase-based accordion
// ═══════════════════════════════════════════════════

function RoadmapView({
  tasks, phases, expandedId, setExpandedId,
  onComplete, onSkip, onDefer, onNoteChange, onDecide,
}: {
  tasks: LaunchTask[];
  phases: LaunchPhase[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onDefer: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onDecide: (id: string, decision: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const currentPhases = getCurrentPhases(phases, today);
  const currentPhaseIds = new Set(currentPhases.map(p => p.id));
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(() => {
    // Auto-expand current phases
    return new Set(currentPhases.map(p => p.id));
  });

  const togglePhase = (id: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {phases.map(phase => {
        const progress = getPhaseProgress(tasks, phase.id);
        const phaseTasks = tasks.filter(t => t.phase === phase.id);
        const isExpanded = expandedPhases.has(phase.id);
        const isCurrent = currentPhaseIds.has(phase.id);
        const isPast = today > phase.endDate;
        const isFuture = today < phase.startDate;

        return (
          <div key={phase.id} className={`rounded-[var(--radius-lg)] border ${isCurrent ? 'border-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'} overflow-hidden`}>
            {/* Phase header */}
            <button
              onClick={() => togglePhase(phase.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 ${isCurrent ? 'bg-[var(--accent-muted)]' : 'bg-[var(--bg-secondary)]'}`}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className={`type-body font-semibold ${isFuture ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                    Phase {phase.id}: {phase.name}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[var(--radius-full)] bg-[var(--accent-primary)] text-white">
                      Now
                    </span>
                  )}
                </div>
                <p className="type-caption text-[var(--text-muted)]">
                  {format(parseISO(phase.startDate), 'MMM d')} – {format(parseISO(phase.endDate), 'MMM d')}
                </p>
              </div>
              <div className="text-right">
                <p className="type-caption font-semibold text-[var(--text-secondary)]">{progress.done}/{progress.total}</p>
                <div className="w-16 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${isPast && progress.pct < 100 ? 'bg-[var(--status-warning)]' : 'bg-[var(--accent-primary)]'}`}
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Phase tasks */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 mt-1">
                {/* Milestones first */}
                {phaseTasks.filter(t => t.milestone).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    expanded={expandedId === task.id}
                    onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onComplete={onComplete}
                    onSkip={onSkip}
                    onDefer={onDefer}
                    onNoteChange={onNoteChange}
                    onDecide={onDecide}
                  />
                ))}
                {/* Then regular tasks */}
                {phaseTasks.filter(t => !t.milestone).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    expanded={expandedId === task.id}
                    onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onComplete={onComplete}
                    onSkip={onSkip}
                    onDefer={onDefer}
                    onNoteChange={onNoteChange}
                    onDecide={onDecide}
                    compact={expandedId !== task.id}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// PULSE VIEW — Overview + stats
// ═══════════════════════════════════════════════════

function PulseView({
  tasks, decisions, contacts, phases, onDecisionAnswer,
}: {
  tasks: LaunchTask[];
  decisions: LaunchDecision[];
  contacts: { id: string; name: string; role: string; email?: string; nextStep?: string }[];
  phases: LaunchPhase[];
  onDecisionAnswer: (id: string, answer: string) => void;
}) {
  const totalDone = tasks.filter(t => t.completed || t.skipped).length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
  const pendingDecisions = decisions.filter(d => d.status === 'pending');

  // Category stats
  const cats: LaunchCategory[] = ['BIZ', 'CONTENT', 'ADULT', 'PRO', 'DECIDE', 'SPACE'];
  const catStats = cats.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    const done = catTasks.filter(t => t.completed || t.skipped).length;
    return { category: cat, done, total: catTasks.length, pct: catTasks.length > 0 ? Math.round((done / catTasks.length) * 100) : 0 };
  }).filter(s => s.total > 0);

  // Velocity — tasks completed in last 7 days vs prior 7
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const thisWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() > weekAgo).length;
  const lastWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt).getTime() > twoWeeksAgo && new Date(t.completedAt).getTime() <= weekAgo).length;

  return (
    <div className="space-y-6">
      {/* Progress ring */}
      <div className="text-center">
        <div className="relative w-28 h-28 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="var(--accent-primary)" strokeWidth="8"
              strokeDasharray={`${pct * 2.64} 264`} strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-[var(--text-primary)]">{pct}%</span>
          </div>
        </div>
        <p className="type-caption text-[var(--text-muted)] mt-2">{totalDone} of {totalTasks} tasks</p>
        <div className="flex justify-center gap-4 mt-2">
          <span className="type-caption text-[var(--text-secondary)]">This week: {thisWeek}</span>
          <span className="type-caption text-[var(--text-muted)]">Last week: {lastWeek}</span>
        </div>
      </div>

      {/* Phase progress */}
      <div>
        <p className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Phases</p>
        <div className="space-y-2">
          {phases.map(phase => {
            const p = getPhaseProgress(tasks, phase.id);
            return (
              <div key={phase.id} className="flex items-center gap-3">
                <span className="type-caption text-[var(--text-secondary)] w-8 text-right font-semibold">P{phase.id}</span>
                <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all" style={{ width: `${p.pct}%` }} />
                </div>
                <span className="type-caption text-[var(--text-muted)] w-12 text-right">{p.done}/{p.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <p className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Categories</p>
        <div className="grid grid-cols-2 gap-2">
          {catStats.map(stat => {
            const c = categoryColors[stat.category] || fallbackColor;
            return (
              <div key={stat.category} className={`px-3 py-2 rounded-[var(--radius-md)] ${c.bg}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />
                  <p className="type-caption font-semibold">{categoryLabels[stat.category]}</p>
                </div>
                <p className="type-caption text-[var(--text-muted)]">{stat.done}/{stat.total} ({stat.pct}%)</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending decisions */}
      {pendingDecisions.length > 0 && (
        <div>
          <p className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Pending Decisions ({pendingDecisions.length})
          </p>
          <div className="space-y-2">
            {pendingDecisions.map(d => (
              <DecisionCard key={d.id} decision={d} onAnswer={onDecisionAnswer} />
            ))}
          </div>
        </div>
      )}

      {/* Contacts */}
      <div>
        <p className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Your Team</p>
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <p className="type-body font-medium text-[var(--text-primary)]">{c.name}</p>
                <p className="type-caption text-[var(--text-muted)]">{c.role}</p>
              </div>
              {c.nextStep && <p className="type-caption text-[var(--text-secondary)] mt-0.5">{c.nextStep}</p>}
              {c.email && (
                <a href={`mailto:${c.email}`} className="type-caption text-[var(--accent-primary)] mt-0.5 block">{c.email}</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Decision Card ───

function DecisionCard({ decision, onAnswer }: { decision: LaunchDecision; onAnswer: (id: string, answer: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
      <p className="type-body font-medium text-[var(--text-primary)]">{decision.question}</p>
      {decision.context && <p className="type-caption text-[var(--text-muted)] mt-0.5">{decision.context}</p>}
      {decision.status === 'pending' ? (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Your decision..."
            className="flex-1 px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
          />
          <button
            onClick={() => { if (value.trim()) { onAnswer(decision.id, value.trim()); setValue(''); } }}
            disabled={!value.trim()}
            className="px-3 py-1 rounded bg-[var(--accent-primary)] text-white text-[12px] font-medium disabled:opacity-40"
          >
            Decide
          </button>
        </div>
      ) : (
        <div className="mt-2 px-2 py-1 rounded bg-[color-mix(in_srgb,var(--status-success)_8%,transparent)]">
          <p className="type-caption text-[var(--status-success)] font-medium">{decision.decision}</p>
          {decision.decidedAt && <p className="type-caption text-[var(--text-muted)]">{format(parseISO(decision.decidedAt), 'MMM d')}</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════

export function LaunchPlan() {
  const { data, updateLaunchPlan } = useAppData();
  const [activeView, setActiveView] = useState<ViewId>('today');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Ensure we have plan data — auto-upgrade if version is old
  useEffect(() => {
    if (!data.launchPlan || (data.launchPlan.version || 0) < initialLaunchPlan.version) {
      updateLaunchPlan(initialLaunchPlan);
    }
  }, [data.launchPlan, updateLaunchPlan]);

  const plan = data.launchPlan || initialLaunchPlan;
  const planPhases = plan.phases?.length ? plan.phases : (initialLaunchPlan.phases || []);
  const wellnessMode = data.selfCare?.wellnessMode || 'okay';

  // ─── Task actions ───
  const completeTask = useCallback((id: string) => {
    const tasks = (plan.tasks || []).map(t =>
      t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  const skipTask = useCallback((id: string) => {
    const tasks = (plan.tasks || []).map(t =>
      t.id === id ? { ...t, skipped: true, skippedAt: new Date().toISOString() } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  const deferTask = useCallback((id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tasks = (plan.tasks || []).map(t =>
      t.id === id ? { ...t, suggestedAfter: tomorrow.toISOString().split('T')[0] } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  const updateNote = useCallback((id: string, note: string) => {
    const tasks = (plan.tasks || []).map(t =>
      t.id === id ? { ...t, notes: note } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  // Decides a DECIDE-category task (marks as completed with the decision as notes)
  const decideTask = useCallback((id: string, decision: string) => {
    const tasks = (plan.tasks || []).map(t =>
      t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString(), notes: decision } : t
    );
    updateLaunchPlan({ tasks });
  }, [plan.tasks, updateLaunchPlan]);

  // Decides a LaunchDecision
  const decideDecision = useCallback((id: string, answer: string) => {
    const decisions = (plan.decisions || []).map(d =>
      d.id === id ? { ...d, status: 'decided' as const, decision: answer, decidedAt: new Date().toISOString() } : d
    );
    updateLaunchPlan({ decisions });
  }, [plan.decisions, updateLaunchPlan]);

  // Overall progress
  const totalDone = plan.tasks.filter(t => t.completed || t.skipped).length;
  const totalTasks = plan.tasks.length;
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket size={22} className="text-[var(--accent-primary)]" />
          <h1 className="type-display text-[var(--text-primary)]">DWD Launch</h1>
        </div>
        <span className="type-caption text-[var(--text-muted)]">{overallPct}% · {totalDone}/{totalTasks}</span>
      </div>

      {/* View switcher */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] mb-4">
        {views.map(v => {
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium transition-all ${
                activeView === v.id
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon size={14} />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Active view */}
      {activeView === 'today' && (
        <TodayView
          tasks={plan.tasks}
          phases={planPhases}
          wellnessMode={wellnessMode}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          onComplete={completeTask}
          onSkip={skipTask}
          onDefer={deferTask}
          onNoteChange={updateNote}
          onDecide={decideTask}
        />
      )}
      {activeView === 'roadmap' && (
        <RoadmapView
          tasks={plan.tasks}
          phases={planPhases}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          onComplete={completeTask}
          onSkip={skipTask}
          onDefer={deferTask}
          onNoteChange={updateNote}
          onDecide={decideTask}
        />
      )}
      {activeView === 'pulse' && (
        <PulseView
          tasks={plan.tasks}
          decisions={plan.decisions}
          contacts={plan.contacts}
          phases={planPhases}
          onDecisionAnswer={decideDecision}
        />
      )}
    </div>
  );
}
