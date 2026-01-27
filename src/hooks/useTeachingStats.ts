import { useMemo } from 'react';
import { AppData, WeekNotes, Class, DayOfWeek } from '../types';
import { getWeekStart, formatWeekOf, getCurrentDayOfWeek } from '../utils/time';

export interface TeachingStats {
  classesThisWeek: { completed: number; total: number };
  notesThisWeek: number;
  studentsSeenThisWeek: number;
  plansFilled: { filled: number; total: number };
  attendanceRate: number; // percentage 0-100
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

export function useTeachingStats(data: AppData): TeachingStats {
  return useMemo(() => {
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes: WeekNotes | undefined = data.weekNotes.find(w => w.weekOf === weekOf);

    // Get all classes and classes up to today
    const allClasses = data.classes;
    const classesUpToToday = getClassesUpToToday(allClasses);

    // Count classes with notes (completed)
    let classesWithNotes = 0;
    let totalNotes = 0;
    let plansFilled = 0;
    const studentsSeenSet = new Set<string>();
    let totalPresent = 0;
    let totalAttendanceRecords = 0;

    if (currentWeekNotes) {
      for (const classId of Object.keys(currentWeekNotes.classNotes)) {
        const classNotes = currentWeekNotes.classNotes[classId];

        // Count classes with any live notes
        if (classNotes.liveNotes && classNotes.liveNotes.length > 0) {
          classesWithNotes++;
          totalNotes += classNotes.liveNotes.length;
        }

        // Count plans filled
        if (classNotes.plan && classNotes.plan.trim().length > 0) {
          plansFilled++;
        }

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

    return {
      classesThisWeek: {
        completed: classesWithNotes,
        total: classesUpToToday.length,
      },
      notesThisWeek: totalNotes,
      studentsSeenThisWeek: studentsSeenSet.size,
      plansFilled: {
        filled: plansFilled,
        total: allClasses.length,
      },
      attendanceRate,
    };
  }, [data.weekNotes, data.classes]);
}
