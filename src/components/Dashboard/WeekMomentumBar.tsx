import type { useTeachingStats } from '../../hooks/useTeachingStats';

export function WeekMomentumBar({ stats }: { stats: ReturnType<typeof useTeachingStats> }) {
  const { completed, total } = stats.classesThisWeek;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (total === 0) return null;

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(pct, 0) / 100);

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="type-h1 text-[var(--text-primary)]">Week Momentum</h3>
      </div>
      <div className="flex items-center gap-4">
        {/* Circular ring */}
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
            {/* Track */}
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-[var(--surface-inset)]"
            />
            {/* Progress */}
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                stroke: 'url(#momentumGradient)',
                transition: 'stroke-dashoffset 700ms ease-out',
              }}
            />
            <defs>
              <linearGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-forest-500)" />
                <stop offset="100%" stopColor="var(--color-pop-500, #d97706)" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="type-stat leading-none text-[var(--text-primary)]">{completed}</span>
            <span className="type-caption text-[var(--text-tertiary)] leading-none">of {total}</span>
          </div>
        </div>

        {/* Right side details */}
        <div className="flex-1">
          <div className="type-stat text-[var(--accent-primary)] leading-none">{pct}%</div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1">classes this week</div>
          {stats.cancelledThisWeek > 0 || stats.subbedThisWeek > 0 ? (
            <div className="type-caption text-[var(--text-tertiary)] mt-2">
              {[
                stats.cancelledThisWeek > 0 && `${stats.cancelledThisWeek} cancelled`,
                stats.subbedThisWeek > 0 && `${stats.subbedThisWeek} subbed`,
              ].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
