import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import type { TeachingStats } from '../../hooks/useTeachingStats';
import type { Class, Competition, WeekNotes, DayOfWeek } from '../../types';

interface WeeklyInsightProps {
  stats: TeachingStats;
  classes: Class[];
  competitions?: Competition[];
  weekNotes?: WeekNotes[];
}

export function WeeklyInsight({ stats, classes, competitions, weekNotes }: WeeklyInsightProps) {
  const insight = useMemo(() => {
    const insights: string[] = [];
    const { completed, total } = stats.classesThisWeek;

    // Notes coverage insight — name specific classes missing notes
    if (completed > 0) {
      const missing = stats.classesWithoutNotes;
      if (missing.length === 0 && stats.notesThisWeek > 0) {
        insights.push(`Notes taken for all ${completed} classes this week. Great documentation habit.`);
      } else if (missing.length > 0 && missing.length <= 3) {
        insights.push(`Still need notes for: ${missing.join(', ')}.`);
      } else if (missing.length > 3) {
        insights.push(`${missing.length} classes still need notes — ${missing.slice(0, 2).join(', ')} and ${missing.length - 2} more.`);
      }
    }

    // Teaching hours insight
    if (completed > 0) {
      const hours = Math.round((completed * 55) / 60);
      if (hours > 0) {
        insights.push(`About ${hours} hour${hours > 1 ? 's' : ''} of teaching so far this week across ${completed} classes.`);
      }
    }

    // Students seen insight
    if (stats.studentsSeenThisWeek > 0) {
      insights.push(`${stats.studentsSeenThisWeek} students seen this week.`);
    }

    // Plans insight — name specific classes missing plans
    const { filled, total: planTotal } = stats.plansFilled;
    const missingPlans = stats.classesWithoutPlans;
    if (planTotal > 0 && filled === planTotal) {
      insights.push(`All ${planTotal} class plans filled out. You're set for the week.`);
    } else if (missingPlans.length > 0 && missingPlans.length <= 3) {
      insights.push(`Still need plans for: ${missingPlans.join(', ')}.`);
    } else if (missingPlans.length > 3) {
      insights.push(`${filled} of ${planTotal} plans ready — ${missingPlans.slice(0, 2).join(', ')} and ${missingPlans.length - 2} more need prep.`);
    } else if (planTotal > 0 && filled === 0 && completed === 0) {
      insights.push(`${planTotal} classes this week. Planning ahead makes a difference.`);
    }

    // Attendance insight
    if (stats.attendanceRate > 0) {
      if (stats.attendanceRate >= 90) {
        insights.push(`${stats.attendanceRate}% attendance rate this week. Strong turnout.`);
      } else if (stats.attendanceRate >= 70) {
        insights.push(`${stats.attendanceRate}% attendance rate this week.`);
      } else {
        insights.push(`${stats.attendanceRate}% attendance this week — lower than usual.`);
      }
    }

    // Busiest day detection
    if (classes.length >= 3) {
      const dayCount: Record<string, number> = {};
      classes.forEach(c => { dayCount[c.day] = (dayCount[c.day] || 0) + 1; });
      const busiest = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
      if (busiest && busiest[1] >= 3) {
        const dayName = busiest[0].charAt(0).toUpperCase() + busiest[0].slice(1);
        insights.push(`${dayName} is your heaviest day with ${busiest[1]} classes.`);
      }
    }

    // Consecutive teaching days awareness
    if (classes.length >= 4) {
      const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const activeDays = new Set(classes.map(c => c.day));
      let maxConsec = 0, consec = 0;
      for (const d of dayOrder) {
        if (activeDays.has(d)) { consec++; maxConsec = Math.max(maxConsec, consec); }
        else { consec = 0; }
      }
      if (maxConsec >= 4) {
        insights.push(`${maxConsec} teaching days in a row this week — pace yourself.`);
      }
    }

    // Cancelled/subbed lighter week
    if (stats.cancelledThisWeek >= 2) {
      insights.push(`${stats.cancelledThisWeek} classes cancelled — lighter week than usual.`);
    } else if (stats.cancelledThisWeek === 1 && stats.subbedThisWeek >= 1) {
      insights.push(`1 class cancelled, 1 subbed — adjusted schedule this week.`);
    }

    // Competition proximity — next upcoming competition
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
          insights.push(`${next.name} is ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}. Final prep time.`);
        } else if (daysUntil <= 21) {
          insights.push(`${next.name} in ${Math.ceil(daysUntil / 7)} weeks — ${next.dances.length} dance${next.dances.length !== 1 ? 's' : ''} to prepare.`);
        }
      }
    }

    // Notes streak — consecutive weeks with notes
    if (weekNotes && weekNotes.length >= 2) {
      // Sort by weekOf descending
      const sorted = [...weekNotes].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      let streak = 0;
      for (const wn of sorted) {
        const hasNotes = Object.values(wn.classNotes).some(cn => cn.liveNotes && cn.liveNotes.length > 0);
        if (hasNotes) streak++;
        else break;
      }
      if (streak >= 3) {
        insights.push(`${streak}-week notes streak. Consistent documentation pays off.`);
      }
    }

    // Day-specific context
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1 && total > 0) {
      insights.push(`New week, ${total} classes ahead. Start strong.`);
    } else if (dayOfWeek === 5 && completed > 0) {
      insights.push(`Almost done for the week. ${completed} classes taught so far.`);
    }

    // Remaining classes
    const remaining = total - completed;
    if (remaining > 0 && completed > 0) {
      insights.push(`${remaining} class${remaining > 1 ? 'es' : ''} left this week.`);
    }

    if (insights.length === 0) return null;

    // Pick one insight per day (deterministic based on day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return insights[dayOfYear % insights.length];
  }, [stats, classes, competitions, weekNotes]);

  if (!insight) return null;

  return (
    <div className="bg-[var(--surface-inset)] rounded-xl border border-[var(--border-subtle)] p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center flex-shrink-0">
          <Lightbulb size={16} className="text-[var(--accent-secondary)]" />
        </div>
        <div>
          <p className="type-caption text-[var(--text-tertiary)] mb-1">Weekly Insight</p>
          <p className="font-display italic text-[var(--text-primary)] text-sm leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
