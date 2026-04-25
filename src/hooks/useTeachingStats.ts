import { useMemo } from 'react';
import { format, startOfWeek } from 'date-fns';
import { AppData, WeekNotes } from '../types';
import { getWeekStart, formatWeekOf } from '../utils/time';
import { getClassesFromCalendar, type ClassLikeEvent } from '../utils/calendarEventType';

export interface TeachingStats {
  classesThisWeek: { completed: number; total: number };
  notesThisWeek: number;
  studentsSeenThisWeek: number;
  plansFilled: { filled: number; total: number };
  attendanceRate: number; // percentage 0-100
  cancelledThisWeek: number;
  subbedThisWeek: number;
  classesWithoutNotes: string[]; // names of classes up to today with no live notes
  classesWithoutPlans: string[]; // names of classes with no prep plan
}

// Get class-like calendar events from this week's Monday through today.
// Post Apr 21, 2026 migration, calendar events are the source of truth — the
// legacy day-based filter over `data.classes` no longer works because the seed
// is empty. Returns calendar-derived class-like events whose date falls in
// [weekStart, today] inclusive.
function getCalendarClassesUpToToday(data: AppData): ClassLikeEvent[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const todayStr = format(now, 'yyyy-MM-dd');

  // Pull all class-like events (no `week` filter — that returns today+6 forward,
  // we want this-week-Monday through today).
  return getClassesFromCalendar(data).filter(ev => {
    return ev.date >= weekStartStr && ev.date <= todayStr;
  });
}

export function useTeachingStats(data: AppData): TeachingStats {
  return useMemo(() => {
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes: WeekNotes | undefined = data.weekNotes.find(w => w.weekOf === weekOf);

    // Calendar-derived class-like events from Monday through today.
    // After Apr 21, 2026, calendar events are the single source of truth —
    // `data.classes` is intentionally empty seed.
    const classesUpToToday = getCalendarClassesUpToToday(data);

    // Count classes with notes (completed) — only count classes in classesUpToToday
    const upToTodayIds = new Set(classesUpToToday.map(c => c.id));
    let classesWithNotes = 0;
    let totalNotes = 0;
    let plansFilled = 0;
    let cancelledThisWeek = 0;
    let subbedThisWeek = 0;
    const studentsSeenSet = new Set<string>();
    let totalPresent = 0;
    let totalAttendanceRecords = 0;

    if (currentWeekNotes) {
      for (const classId of Object.keys(currentWeekNotes.classNotes)) {
        const classNotes = currentWeekNotes.classNotes[classId];

        // Count classes with any live notes — only if scheduled up to today
        if (classNotes.liveNotes && classNotes.liveNotes.length > 0) {
          if (upToTodayIds.has(classId)) {
            classesWithNotes++;
          }
          totalNotes += classNotes.liveNotes.length;
        }

        // Count plans filled
        if (classNotes.plan && classNotes.plan.trim().length > 0) {
          plansFilled++;
        }

        // Count exceptions
        if (classNotes.exception?.type === 'cancelled') cancelledThisWeek++;
        if (classNotes.exception?.type === 'subbed') subbedThisWeek++;

        // Count students seen (from attendance)
        if (classNotes.attendance) {
          const { present, late } = classNotes.attendance;
          [...(present || []), ...(late || [])].forEach(id => studentsSeenSet.add(id));

          // Calculate attendance rate
          const totalInClass = (present?.length || 0) + (late?.length || 0) + (classNotes.attendance.absent?.length || 0);
          if (totalInClass > 0) {
            totalPresent += (present?.length || 0) + (late?.length || 0);
            totalAttendanceRecords += totalInClass;
          }
        }
      }
    }

    // Calculate attendance rate
    const attendanceRate = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;

    // Identify specific classes missing notes / plans (up to today only)
    const classIdsWithNotes = new Set<string>();
    const classIdsWithPlans = new Set<string>();
    if (currentWeekNotes) {
      for (const classId of Object.keys(currentWeekNotes.classNotes)) {
        const cn = currentWeekNotes.classNotes[classId];
        if (cn.liveNotes && cn.liveNotes.length > 0) classIdsWithNotes.add(classId);
        if (cn.plan && cn.plan.trim().length > 0) classIdsWithPlans.add(classId);
      }
    }
    const classesWithoutNotes = classesUpToToday
      .filter(c => !classIdsWithNotes.has(c.id))
      .map(c => c.name);
    // Only count classes up to today for missing plans (future classes shouldn't be flagged)
    const classesWithoutPlans = classesUpToToday
      .filter(c => !classIdsWithPlans.has(c.id))
      .map(c => c.name);

    // Total: just calendar-derived classes through today. No internal-class
    // double-counting — `data.classes` is empty post-migration.
    const totalClasses = classesUpToToday.length;

    return {
      classesThisWeek: {
        completed: classesWithNotes,
        total: totalClasses,
      },
      notesThisWeek: totalNotes,
      studentsSeenThisWeek: studentsSeenSet.size,
      plansFilled: {
        filled: plansFilled,
        total: totalClasses,
      },
      attendanceRate,
      cancelledThisWeek,
      subbedThisWeek,
      classesWithoutNotes,
      classesWithoutPlans,
    };
  }, [data.weekNotes, data.classes, data.calendarEvents, data.competitionDances, data.students, data.studios, data.settings?.hiddenCalendarEventIds]);
}
