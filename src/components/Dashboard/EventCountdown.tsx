import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import type { Competition } from '../../types';

interface EventCountdownProps {
  competitions: Competition[];
}

export function EventCountdown({ competitions }: EventCountdownProps) {
  const nextEvent = useMemo(() => {
    const today = new Date();
    const upcoming = competitions
      .filter(c => parseISO(c.date) >= today)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const event = upcoming[0];
    if (!event) return null;
    const days = differenceInDays(parseISO(event.date), today);
    if (days > 60 || days <= 14) return null; // Only show 15-60 days out (<=14 handled by comp banner)
    return { ...event, daysAway: days };
  }, [competitions]);

  if (!nextEvent) return null;

  return (
    <Link
      to="/choreography"
      className="flex items-center gap-3 p-3 rounded-xl border bg-[var(--accent-muted)] border-[var(--border-subtle)] transition-colors"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--surface-inset)]">
        <Trophy size={18} className="text-[var(--accent-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{nextEvent.name}</p>
        <p className="text-xs text-[var(--text-secondary)]">{format(parseISO(nextEvent.date), 'EEEE, MMM d')}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-2xl font-bold text-[var(--accent-primary)]">{nextEvent.daysAway}</span>
        <span className="text-xs text-[var(--text-secondary)]">days</span>
        <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
      </div>
    </Link>
  );
}
