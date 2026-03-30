import { useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { AppData, WeekNotes, Class, CalendarEvent, DayOfWeek } from '../types';
import { getWeekStart, formatWeekOf, getCurrentDayOfWeek } from '../utils/time';
import { classifyCalendarEvent } from '../utils/calendarEventType';

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

// Get classes that have already happened this week (based on day)
function getClassesUpToToday(classes: Class[]): Class[] {
  const dayOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const today = getCurrentDayOfWeek();
  const todayIndex = dayOrder.indexOf(today);

  return classes.filter(cls => {
    const classIndex = dayOrder.indexOf(cls.day);
    return classIndex <= todayIndex;
  });
}

// Count class-like calendar events for the week (up to today),
// excluding events that already overlap with internal class definitions
function countCalendarClassEvents(
  calendarEvents: CalendarEvent[],
  classes: Class[],
  competitionDances: AppData['competitionDances'],
): number {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const todayStr = format(now, 'yyyy-MM-dd');
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Get dates from week start to today
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(weekStart, i), 'yyyy-MM-dd');
    dates.push(d);
    if (d === todayStr) break;
  }
  const dateSet = new Set(dates);

  // Build a set of internal class identifiers (name+day) for dedup
  const internalClassKeys = new Set(
    classes.map(c => `${c.name.toLowerCase().trim()}|${c.day}`)
  );

  // Filter calendar events to this week up to today, classify them,
  // skip ones that match an internal class definition
  return calendarEvents.filter(e => {
    if (!dateSet.has(e.date)) return false;
    if (!e.startTime || e.startTime === '00:00') return false;

    // Check if this calendar event overlaps with an internal class
    const eventDate = new Date(`${e.date}T12:00:00`);
    const eventDay = dayNames[eventDate.getDay()];
    const eventKey = `${(e.title || '').toLowerCase().trim()}|${eventDay}`;
    if (internalClassKeys.has(eventKey)) return false; // already counted as internal class

    const classification = classifyCalendarEvent(e, {
      classes,
      allEvents: calendarEvents,
      competitionDances: competitionDances || [],
    });
    return classification.isClassLike;
  }).length;
}

export function useTeachingStats(data: AppData): TeachingStats {
  return useMemo(() => {
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes: WeekNotes | undefined = data.weekNotes.find(w => w.weekOf === weekOf);

    // Get all classes and classes up to today
    const allClasses = data.classes;
    const classesUpToToday = getClassesUpToToday(allClasses);

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

    // Identify specific classes missing notes (up to today only)
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

    // Include class-like calendar events in the total count
    const calendarClassCount = countCalendarClassEvents(
      data.calendarEvents || [],
      data.classes,
      data.competitionDances,
    );
    const totalClasses = classesUpToToday.length + calendarClassCount;

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
  }, [data.weekNotes, data.classes, data.calendarEvents, data.competitionDances]);
}
