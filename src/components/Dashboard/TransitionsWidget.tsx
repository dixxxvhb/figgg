import { differenceInDays, parseISO, format } from 'date-fns';
import { TamaraMark } from '../common/TamaraMark';

/**
 * Fixed milestones — update these as life evolves.
 * CAA_END_DATE = Dixon's last day at Celebration Arts Academy.
 * PROSERIES_MILESTONES = upcoming DWD ProSeries launch dates.
 */
const CAA_END_DATE = '2026-06-01';

interface ProSeriesMilestone {
  date: string;      // ISO yyyy-mm-dd (the day to count to)
  endDate?: string;  // optional — for date ranges (e.g., Summer Intensive)
  label: string;     // short description
}

const PROSERIES_MILESTONES: ProSeriesMilestone[] = [
  { date: '2026-05-01', label: 'Audition registration opens' },
  { date: '2026-06-06', label: 'Audition Day' },
  { date: '2026-07-13', endDate: '2026-07-17', label: 'Summer Intensive' },
  { date: '2026-08-11', label: 'Season 1 begins' },
];

function getCAAMessage(daysRemaining: number): { label: string; subLabel?: string } {
  if (daysRemaining === 0) return { label: 'Last day. Make it a piece.', subLabel: '9 years at CAA' };
  if (daysRemaining === 1) return { label: 'Tomorrow. One more time.', subLabel: 'Last day at CAA' };
  if (daysRemaining <= 7) return { label: 'Stick the landing.', subLabel: `${daysRemaining} days at CAA` };
  if (daysRemaining <= 14) return { label: 'Home stretch.', subLabel: 'Keep the chaos tasteful' };
  if (daysRemaining <= 30) return { label: 'Final month at CAA.', subLabel: 'Going out your way' };
  if (daysRemaining <= 60) return { label: 'The long goodbye.', subLabel: `${daysRemaining} days on the clock` };
  return { label: 'Still on staff, still counting.', subLabel: `${daysRemaining} days until June 1` };
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function CountdownPip({ days }: { days: number }) {
  if (days === 0) {
    return <span className="type-stat text-[var(--accent-primary)] leading-none">Today</span>;
  }
  return (
    <>
      <span className="type-stat text-[var(--accent-primary)] leading-none">{days}</span>
      <span className="text-xs text-[var(--text-tertiary)] ml-1">{days === 1 ? 'day' : 'days'}</span>
    </>
  );
}

export function TransitionsWidget() {
  const today = startOfToday();

  const caaDaysLeft = differenceInDays(parseISO(CAA_END_DATE), today);
  const caaDone = caaDaysLeft < 0;

  const nextMilestone = PROSERIES_MILESTONES.find(m => {
    const endRef = m.endDate ? parseISO(m.endDate) : parseISO(m.date);
    return differenceInDays(endRef, today) >= 0;
  });

  if (caaDone && !nextMilestone) return null;

  const caaCopy = !caaDone ? getCAAMessage(caaDaysLeft) : null;

  const milestoneDays = nextMilestone
    ? differenceInDays(parseISO(nextMilestone.date), today)
    : null;

  const milestoneDateLabel = nextMilestone
    ? (() => {
        const start = format(parseISO(nextMilestone.date), 'EEE, MMM d');
        if (!nextMilestone.endDate) return start;
        return `${format(parseISO(nextMilestone.date), 'MMM d')} – ${format(parseISO(nextMilestone.endDate), 'MMM d')}`;
      })()
    : null;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
      {caaCopy && (
        <div className="p-4 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] relative">
          {/* Tamara Mark — ghosts behind the numeral when the final month approaches */}
          {caaDaysLeft <= 30 && (
            <TamaraMark
              size={48}
              opacity={0.22}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="type-caption uppercase tracking-wider text-[var(--text-tertiary)]">CAA</div>
            <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 truncate">{caaCopy.label}</div>
            {caaCopy.subLabel && (
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{caaCopy.subLabel}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0 relative">
            <CountdownPip days={caaDaysLeft} />
          </div>
        </div>
      )}

      {nextMilestone && milestoneDays !== null && (
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="type-caption uppercase tracking-wider text-[var(--text-tertiary)]">ProSeries</div>
            <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 truncate">{nextMilestone.label}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{milestoneDateLabel}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <CountdownPip days={Math.max(milestoneDays, 0)} />
          </div>
        </div>
      )}
    </div>
  );
}
