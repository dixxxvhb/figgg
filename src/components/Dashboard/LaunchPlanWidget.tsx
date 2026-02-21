import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Star, ChevronRight, Check, CircleDot } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import type { LaunchPlanData, LaunchCategory } from '../../types';

const categoryDots: Record<LaunchCategory, string> = {
  BIZ: 'bg-blue-500',
  CONTENT: 'bg-purple-500',
  ADULT: 'bg-green-500',
  PRO: 'bg-amber-500',
  DECIDE: 'bg-rose-500',
  PREP: 'bg-teal-500',
};

interface LaunchPlanWidgetProps {
  launchPlan: LaunchPlanData | undefined;
}

export function LaunchPlanWidget({ launchPlan }: LaunchPlanWidgetProps) {
  if (!launchPlan) return null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { todayTasks, nextMilestone, progress, currentWeekLabel, pendingDecisions } = useMemo(() => {
    const tasks = launchPlan.tasks;
    const today = tasks.filter(t => t.scheduledDate === todayStr);

    // Next milestone
    const futureMilestones = tasks
      .filter(t => t.milestone && !t.completed && !t.skipped && t.scheduledDate >= todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const nextM = futureMilestones[0]
      ? { label: futureMilestones[0].milestoneLabel || futureMilestones[0].title, daysAway: differenceInDays(parseISO(futureMilestones[0].scheduledDate), startOfDay(new Date())) }
      : null;

    // Progress
    const done = tasks.filter(t => t.completed || t.skipped).length;
    const total = tasks.length;

    // Current week label
    const todayTask = tasks.find(t => t.scheduledDate === todayStr);
    let weekLabel = todayTask?.weekLabel;
    if (!weekLabel) {
      const futureTask = tasks.filter(t => t.scheduledDate >= todayStr).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
      weekLabel = futureTask?.weekLabel || 'Launch Plan';
    }

    const pending = launchPlan.decisions.filter(d => d.status === 'pending').length;

    return { todayTasks: today, nextMilestone: nextM, progress: { done, total }, currentWeekLabel: weekLabel, pendingDecisions: pending };
  }, [launchPlan, todayStr]);

  return (
    <Link
      to="/launch"
      className="block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-[var(--shadow-card)]"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h3 className="type-h1 text-[var(--text-primary)] flex items-center gap-2">
          <Rocket size={16} className="text-[var(--accent-primary)]" />
          DWDC Launch
        </h3>
        <div className="flex items-center gap-2">
          <span className="type-stat text-[var(--text-secondary)]">{progress.done}/{progress.total}</span>
          <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Week label */}
        <p className="type-label text-[var(--text-secondary)]">
          {currentWeekLabel}
        </p>

        {/* Today's tasks */}
        {todayTasks.length > 0 ? (
          todayTasks.slice(0, 4).map(task => {
            const isDone = task.completed || task.skipped;
            return (
              <div key={task.id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${isDone ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-strong)]'}`}>
                  {isDone && <Check size={10} className="text-[var(--text-on-accent)]" />}
                </div>
                <div className={`w-2 h-2 rounded-full ${categoryDots[task.category]} flex-shrink-0`} />
                <span className={`text-sm text-[var(--text-primary)] line-clamp-1 ${isDone ? 'line-through opacity-50' : ''}`}>
                  {task.title}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">No tasks today</p>
        )}
        {todayTasks.length > 4 && (
          <p className="type-caption text-[var(--text-tertiary)]">+{todayTasks.length - 4} more</p>
        )}

        {/* Milestone + decisions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          {nextMilestone ? (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
              <Star size={10} className="fill-current" />
              {nextMilestone.label} — {nextMilestone.daysAway === 0 ? 'TODAY' : `${nextMilestone.daysAway}d`}
            </span>
          ) : (
            <span className="type-caption text-[var(--text-tertiary)]">All milestones complete</span>
          )}
          {pendingDecisions > 0 && (
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <CircleDot size={10} />
              {pendingDecisions} decisions
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
