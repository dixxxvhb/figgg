import { useMemo } from 'react';
import { timeToMinutes, formatWeekOf, getWeekStart, toDateStr } from '../utils/time';
import type { AppData, Class, Studio, Student, LiveNote } from '../types';
import { getClassesFromCalendar, classLikeEventToClass, type ClassLikeEvent } from '../utils/calendarEventType';

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
    const todayStr = toDateStr(new Date());
    const todayClasses = getClassesFromCalendar(data, { date: todayStr });

    if (todayClasses.length === 0) {
      return { upcomingClass: null, justEndedClass: null, minutesUntilNext: null };
    }

    const nowMinutes = currentMinute; // minutes since midnight

    // Look up this week's notes to check for cancelled/subbed exceptions
    const weekOf = formatWeekOf(getWeekStart());
    const weekNote = data.weekNotes.find(w => w.weekOf === weekOf);

    // Find upcoming class (within 60 min)
    let upcomingClass: ClassWithContext | null = null;
    let minutesUntilNext: number | null = null;

    for (const cls of todayClasses) {
      // Skip cancelled or subbed classes
      const exc = weekNote?.classNotes[cls.id]?.exception;
      if (exc && exc.type !== 'time-change') continue;

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
      // Skip cancelled or subbed classes
      const exc = weekNote?.classNotes[cls.id]?.exception;
      if (exc && exc.type !== 'time-change') continue;

      const classEnd = timeToMinutes(cls.endTime);
      const sinceEnd = nowMinutes - classEnd;

      if (sinceEnd >= 0 && sinceEnd <= 30) {
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
        // Skip cancelled or subbed classes
        const exc = weekNote?.classNotes[cls.id]?.exception;
      if (exc && exc.type !== 'time-change') continue;

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

function buildClassContext(data: AppData, ev: ClassLikeEvent): ClassWithContext {
  const cls = classLikeEventToClass(ev);
  const studio = ev.studioId ? data.studios?.find(s => s.id === ev.studioId) : undefined;

  // Get this week's notes (key may be on the calendar event id post-migration)
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

