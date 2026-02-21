import { TeachingStats } from '../../hooks/useTeachingStats';

interface WeekStatsProps {
  stats: TeachingStats;
}

export function WeekStats({ stats }: WeekStatsProps) {
  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="px-4 py-3">
        <h3 className="type-h1 text-[var(--text-primary)]">
          This Week
        </h3>
      </div>

      <div className="grid grid-cols-4 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        {/* Classes */}
        <div className="p-3 text-center">
          <div className="type-stat text-[var(--status-success)] leading-none">
            {stats.classesThisWeek.completed}
          </div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1">
            of {stats.classesThisWeek.total}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-0.5">
            Classes
          </div>
        </div>

        {/* Notes */}
        <div className="p-3 text-center">
          <div className="type-stat text-[--color-honey-dark] dark:text-[--color-honey-light] leading-none">
            {stats.notesThisWeek}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-1.5">
            Notes
          </div>
        </div>

        {/* Students */}
        <div className="p-3 text-center">
          <div className="type-stat text-[var(--accent-primary)] leading-none">
            {stats.studentsSeenThisWeek}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-1.5">
            Students
          </div>
        </div>

        {/* Plans */}
        <div className="p-3 text-center">
          <div className="type-stat text-[var(--text-secondary)] leading-none">
            {stats.plansFilled.filled}
          </div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1">
            of {stats.plansFilled.total}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-0.5">
            Plans
          </div>
        </div>
      </div>

      {/* Attendance row — only if data exists */}
      {stats.attendanceRate > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="type-label text-[var(--text-tertiary)]">Attendance</span>
          <span className="type-stat text-[var(--status-success)]">{stats.attendanceRate}%</span>
        </div>
      )}

      {/* Exception row — only if any classes were cancelled or subbed */}
      {(stats.cancelledThisWeek > 0 || stats.subbedThisWeek > 0) && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)]">
          <span className="type-caption text-[var(--text-tertiary)]">
            {[
              stats.cancelledThisWeek > 0 && `${stats.cancelledThisWeek} cancelled`,
              stats.subbedThisWeek > 0 && `${stats.subbedThisWeek} subbed`,
            ].filter(Boolean).join(' · ')} this week
          </span>
        </div>
      )}
    </div>
  );
}
