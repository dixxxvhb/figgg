import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import type { TeachingStats } from '../../hooks/useTeachingStats';
import type { Class, Competition, WeekNotes, DayOfWeek } from '../../types';

interface WeekStatsProps {
  stats: TeachingStats;
  classes: Class[];
  competitions?: Competition[];
  weekNotes?: WeekNotes[];
}

function useWeeklyInsight(stats: TeachingStats, classes: Class[], competitions?: Competition[], weekNotes?: WeekNotes[]): string | null {
  return useMemo(() => {
    const insights: string[] = [];
    const { completed, total } = stats.classesThisWeek;

    // Notes coverage — name specific classes missing notes
    if (completed > 0) {
      const missing = stats.classesWithoutNotes;
      if (missing.length === 0 && stats.notesThisWeek > 0) {
        insights.push(`Notes taken for all ${completed} classes this week.`);
      } else if (missing.length > 0 && missing.length <= 3) {
        insights.push(`Still need notes for: ${missing.join(', ')}.`);
      } else if (missing.length > 3) {
        insights.push(`${missing.length} classes still need notes — ${missing.slice(0, 2).join(', ')} and ${missing.length - 2} more.`);
      }
    }

    // Plans
    const { filled, total: planTotal } = stats.plansFilled;
    const missingPlans = stats.classesWithoutPlans;
    if (planTotal > 0 && filled === planTotal) {
      insights.push(`All ${planTotal} class plans filled out.`);
    } else if (missingPlans.length > 0 && missingPlans.length <= 3) {
      insights.push(`Still need plans for: ${missingPlans.join(', ')}.`);
    } else if (missingPlans.length > 3) {
      insights.push(`${filled} of ${planTotal} plans ready — ${missingPlans.slice(0, 2).join(', ')} and ${missingPlans.length - 2} more need prep.`);
    }

    // Busiest day
    if (classes.length >= 3) {
      const dayCount: Record<string, number> = {};
      classes.forEach(c => { dayCount[c.day] = (dayCount[c.day] || 0) + 1; });
      const busiest = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
      if (busiest && busiest[1] >= 3) {
        const dayName = busiest[0].charAt(0).toUpperCase() + busiest[0].slice(1);
        insights.push(`${dayName} is your heaviest day with ${busiest[1]} classes.`);
      }
    }

    // Consecutive teaching days
    if (classes.length >= 4) {
      const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const activeDays = new Set(classes.map(c => c.day));
      let maxConsec = 0, consec = 0;
      for (const d of dayOrder) {
        if (activeDays.has(d)) { consec++; maxConsec = Math.max(maxConsec, consec); }
        else { consec = 0; }
      }
      if (maxConsec >= 4) {
        insights.push(`${maxConsec} teaching days in a row — pace yourself.`);
      }
    }

    // Competition proximity
    if (competitions && competitions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = competitions
        .filter(c => new Date(c.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (upcoming.length > 0) {
        const next = upcoming[0];
        const daysUntil = Math.ceil((new Date(next.date).getTime() - today.getTime()) / 86400000);
        if (daysUntil <= 7) {
          insights.push(`${next.name} is ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}.`);
        } else if (daysUntil <= 21) {
          insights.push(`${next.name} in ${Math.ceil(daysUntil / 7)} weeks — ${next.dances.length} dance${next.dances.length !== 1 ? 's' : ''} to prepare.`);
        }
      }
    }

    // Notes streak
    if (weekNotes && weekNotes.length >= 2) {
      const sorted = [...weekNotes].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      let streak = 0;
      for (const wn of sorted) {
        const hasNotes = Object.values(wn.classNotes).some(cn => cn.liveNotes && cn.liveNotes.length > 0);
        if (hasNotes) streak++;
        else break;
      }
      if (streak >= 3) {
        insights.push(`${streak}-week notes streak.`);
      }
    }

    // Remaining classes
    const remaining = total - completed;
    if (remaining > 0 && completed > 0) {
      insights.push(`${remaining} class${remaining > 1 ? 'es' : ''} left this week.`);
    }

    if (insights.length === 0) return null;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return insights[dayOfYear % insights.length];
  }, [stats, classes, competitions, weekNotes]);
}

export function WeekStats({ stats, classes, competitions, weekNotes }: WeekStatsProps) {
  const insight = useWeeklyInsight(stats, classes, competitions, weekNotes);

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

      {/* Weekly insight footer */}
      {insight && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-start gap-2">
          <Lightbulb size={14} className="text-[var(--accent-secondary)] mt-0.5 flex-shrink-0" />
          <p className="font-display italic text-[var(--text-secondary)] text-xs leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
}
