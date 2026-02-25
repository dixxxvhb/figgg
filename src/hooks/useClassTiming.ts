import { useMemo } from 'react';
import { getClassesByDay } from '../data/classes';
import { timeToMinutes, getCurrentDayOfWeek, formatWeekOf, getWeekStart } from '../utils/time';
import type { AppData, Class, Studio, Student, LiveNote } from '../types';

export interface ClassWithContext {
  class: Class;
  studio?: Studio;
  lastWeekNotes: LiveNote[];
  thisWeekPlan?: string;
  choreographyNotes?: string[];
  studentFlags?: string[];
  enrolledStudents: Student[];
}

export function useClassTiming(data: AppData, currentMinute: number): {
  upcomingClass: ClassWithContext | null;   // starts within 60 min
  justEndedClass: ClassWithContext | null;  // ended within 30 min, no notes logged today
  minutesUntilNext: number | null;
} {
  return useMemo(() => {
    const dayName = getCurrentDayOfWeek();
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes = data.weekNotes.find(w => w.weekOf === weekOf);

    // Filter out cancelled classes
    const todayClasses = getClassesByDay(data.classes, dayName).filter(cls => {
      const exception = currentWeekNotes?.classNotes[cls.id]?.exception;
      return !exception; // exclude cancelled/subbed
    });

    if (todayClasses.length === 0) {
      return { upcomingClass: null, justEndedClass: null, minutesUntilNext: null };
    }

    const nowMinutes = currentMinute; // minutes since midnight

    // Find upcoming class (within 60 min)
    let upcomingClass: ClassWithContext | null = null;
    let minutesUntilNext: number | null = null;

    for (const cls of todayClasses) {
      const classStart = timeToMinutes(cls.startTime);
      const diff = classStart - nowMinutes;
      if (diff > 0 && diff <= 60) {
        if (minutesUntilNext === null || diff < minutesUntilNext) {
          minutesUntilNext = diff;
          upcomingClass = buildClassContext(data, cls);
        }
      }
    }

    // Find just-ended class (ended within 30 min, no notes logged today)
    let justEndedClass: ClassWithContext | null = null;

    for (const cls of todayClasses) {
      const classEnd = timeToMinutes(cls.endTime);
      const sinceEnd = nowMinutes - classEnd;

      if (sinceEnd >= 0 && sinceEnd <= 30) {
        // Check if notes have been logged for this class this week
        const weekOf = formatWeekOf(getWeekStart());
        const weekNote = data.weekNotes.find(w => w.weekOf === weekOf);
        const classNotes = weekNote?.classNotes[cls.id];
        const hasRecentNotes = classNotes?.liveNotes?.some(n => {
          const noteDate = new Date(n.timestamp);
          const today = new Date();
          return noteDate.toDateString() === today.toDateString();
        });

        if (!hasRecentNotes) {
          justEndedClass = buildClassContext(data, cls);
          break; // Only show one
        }
      }
    }

    // If no upcoming within 60min, find the next class at all
    if (minutesUntilNext === null) {
      for (const cls of todayClasses) {
        const classStart = timeToMinutes(cls.startTime);
        const diff = classStart - nowMinutes;
        if (diff > 0) {
          if (minutesUntilNext === null || diff < minutesUntilNext) {
            minutesUntilNext = diff;
          }
        }
      }
    }

    return { upcomingClass, justEndedClass, minutesUntilNext };
  }, [data, currentMinute]);
}

function buildClassContext(data: AppData, cls: Class): ClassWithContext {
  const studio = data.studios?.find(s => s.id === cls.studioId);

  // Get this week's notes
  const weekOf = formatWeekOf(getWeekStart());
  const weekNote = data.weekNotes.find(w => w.weekOf === weekOf);
  const thisWeekPlan = weekNote?.classNotes[cls.id]?.plan;

  // Get last week's notes
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekOf = formatWeekOf(getWeekStart(lastWeekDate));
  const lastWeekNote = data.weekNotes.find(w => w.weekOf === lastWeekOf);
  const lastWeekNotes = lastWeekNote?.classNotes[cls.id]?.liveNotes || [];

  // Get enrolled students
  const enrolledStudents = (data.students || []).filter(s =>
    s.classIds?.includes(cls.id)
  );

  // Student flags (e.g., students with notes or special needs)
  const studentFlags = enrolledStudents
    .filter(s => s.notes && s.notes.trim().length > 0)
    .map(s => `${s.name}: ${s.notes}`);

  return {
    class: cls,
    studio,
    lastWeekNotes,
    thisWeekPlan,
    studentFlags: studentFlags.length > 0 ? studentFlags : undefined,
    enrolledStudents,
  };
}
