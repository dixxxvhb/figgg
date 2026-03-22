import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Star, ChevronRight, CircleDot, Zap } from 'lucide-react';
import { differenceInDays, startOfDay, parseISO } from 'date-fns';
import { toDateStr } from '../../utils/time';
import type { LaunchPlanData, LaunchCategory } from '../../types';

const categoryDotColors: Record<LaunchCategory, string> = {
  BIZ: 'var(--accent-primary)',
  CONTENT: 'var(--accent-secondary)',
  ADULT: 'var(--status-success)',
  PRO: '#7c3aed',
  DECIDE: 'var(--status-warning)',
  SPACE: '#2563eb',
};

interface LaunchPlanWidgetProps {
  launchPlan: LaunchPlanData | undefined;
}

export function LaunchPlanWidget({ launchPlan }: LaunchPlanWidgetProps) {
  const { nextTasks, nextMilestone, progress, pendingDecisions, quickWinCount } = useMemo(() => {
    if (!launchPlan) return { nextTasks: [], nextMilestone: null, progress: { done: 0, total: 0, pct: 0 }, pendingDecisions: 0, quickWinCount: 0 };
    const tasks = launchPlan.tasks;
    const todayStr = toDateStr();

    // Smart next tasks: ready (not blocked, not too early), sorted by priority
    const ready = tasks
      .filter(t => !t.completed && !t.skipped)
      .filter(t => {
        if (t.blockedBy && t.blockedBy.length > 0) {
          const isBlocked = t.blockedBy.some(depId => {
            const dep = tasks.find(d => d.id === depId);
            return dep && !dep.completed && !dep.skipped;
          });
          if (isBlocked) return false;
        }
        if (t.suggestedAfter && t.suggestedAfter > todayStr) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 4);

    // Quick wins count
    const quickWins = tasks.filter(t =>
      !t.completed && !t.skipped && t.effort === 'quick' &&
      (!t.blockedBy || !t.blockedBy.some(depId => {
        const dep = tasks.find(d => d.id === depId);
        return dep && !dep.completed && !dep.skipped;
      })) &&
      (!t.suggestedAfter || t.suggestedAfter <= todayStr)
    ).length;

    // Next milestone
    const futureMilestones = tasks
      .filter(t => t.milestone && !t.completed && !t.skipped)
      .sort((a, b) => (a.suggestedAfter || a.scheduledDate || '').localeCompare(b.suggestedAfter || b.scheduledDate || ''));
    const nextM = futureMilestones[0]
      ? {
          label: futureMilestones[0].milestoneLabel || futureMilestones[0].title,
          daysAway: differenceInDays(
            parseISO(futureMilestones[0].suggestedAfter || futureMilestones[0].scheduledDate || todayStr),
            startOfDay(new Date())
          ),
        }
      : null;

    const done = tasks.filter(t => t.completed || t.skipped).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const pending = launchPlan.decisions.filter(d => d.status === 'pending').length;

    return { nextTasks: ready, nextMilestone: nextM, progress: { done, total, pct }, pendingDecisions: pending, quickWinCount: quickWins };
  }, [launchPlan]);

  if (!launchPlan) return null;

  return (
    <Link
      to="/launch"
      className="block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-[var(--shadow-card)]"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="type-h1 text-[var(--text-primary)] flex items-center gap-2">
          <Rocket size={16} className="text-[var(--accent-primary)]" />
          DWD Launch
        </h3>
        <div className="flex items-center gap-2">
          <span className="type-stat text-[var(--accent-primary)]">{progress.pct}%</span>
          <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[var(--surface-inset)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
        </div>

        {/* Quick wins hint */}
        {quickWinCount > 0 && (
          <p className="text-xs text-[var(--status-success)] font-medium flex items-center gap-1">
            <Zap size={10} />
            {quickWinCount} quick win{quickWinCount !== 1 ? 's' : ''} available
          </p>
        )}

        {/* Next priority tasks */}
        {nextTasks.length > 0 ? (
          <>
            <p className="type-label text-[var(--text-tertiary)]">Up next</p>
            {nextTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryDotColors[task.category] }} />
                <span className="text-sm text-[var(--text-primary)] line-clamp-1">{task.title}</span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">All caught up — check milestones</p>
        )}

        {/* Milestone + decisions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          {nextMilestone ? (
            <span className="text-xs text-[var(--status-warning)] font-medium flex items-center gap-1">
              <Star size={10} className="fill-current" />
              {nextMilestone.label} — {nextMilestone.daysAway === 0 ? 'TODAY' : nextMilestone.daysAway < 0 ? `${Math.abs(nextMilestone.daysAway)}d ago` : `${nextMilestone.daysAway}d`}
            </span>
          ) : (
            <span className="type-caption text-[var(--text-tertiary)]">All milestones complete</span>
          )}
          {pendingDecisions > 0 && (
            <span className="text-xs font-medium text-[var(--status-danger)] flex items-center gap-1">
              <CircleDot size={10} />
              {pendingDecisions} decisions
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
