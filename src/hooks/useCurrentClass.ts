import { useState, useEffect, useMemo } from 'react';
import { Class, CalendarEvent, CompetitionDance, CurrentClassInfo, DayOfWeek, WeekNotes } from '../types';
import { getCurrentDayOfWeek, getCurrentTimeMinutes, getClassStatus, getMinutesUntilClass, getMinutesRemaining, timeToMinutes, formatWeekOf, getWeekStart, toDateStr } from '../utils/time';
import { getStudioById } from '../data/studios';
import { classifyCalendarEvent } from '../utils/calendarEventType';

// Convert a class-like calendar event into a pseudo-Class for unified handling
function calEventToClass(e: CalendarEvent): Class {
  return {
    id: e.id,
    name: e.title || '',
    day: (() => {
      const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return dayNames[new Date(`${e.date}T12:00:00`).getDay()];
    })(),
    startTime: e.startTime,
    endTime: e.endTime || e.startTime,
    studioId: '',
    musicLinks: [],
  };
}

export function useCurrentClass(
  classes: Class[],
  weekNotes?: WeekNotes[],
  options?: { calendarEvents?: CalendarEvent[]; competitionDances?: CompetitionDance[] },
): CurrentClassInfo {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeMinutes());
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(getCurrentDayOfWeek());

  // Update time every 30 seconds + immediately on app foreground
  useEffect(() => {
    const update = () => {
      setCurrentTime(getCurrentTimeMinutes());
      setCurrentDay(getCurrentDayOfWeek());
    };

    const interval = setInterval(update, 30000);

    // Immediately refresh when app comes back to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const result = useMemo(() => {
    // Get today's internal classes sorted by time, excluding cancelled/subbed exceptions
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes = weekNotes?.find(w => w.weekOf === weekOf);

    const internalClasses = classes
      .filter(c => c.day === currentDay)
      .filter(c => {
        const exc = currentWeekNotes?.classNotes[c.id]?.exception;
        return !exc || exc.type === 'time-change';
      });

    // Get today's class-like calendar events, excluding cancelled ones
    const calEvents = options?.calendarEvents || [];
    const compDances = options?.competitionDances || [];
    const todayStr = toDateStr(new Date());
    const calClassEvents = calEvents
      .filter(e => {
        if (e.date !== todayStr || !e.startTime || e.startTime === '00:00') return false;
        const exc = currentWeekNotes?.classNotes[e.id]?.exception;
        if (exc && exc.type !== 'time-change') return false;
        return classifyCalendarEvent(e, {
          classes,
          allEvents: calEvents,
          competitionDances: compDances,
        }).isClassLike;
      })
      .map(calEventToClass);

    // Dedup: skip calendar events that match an internal class by name+day
    const internalKeys = new Set(internalClasses.map(c => `${c.name.toLowerCase().trim()}|${c.day}`));
    const uniqueCalClasses = calClassEvents.filter(c => !internalKeys.has(`${c.name.toLowerCase().trim()}|${c.day}`));

    // Merge and sort
    const todayClasses = [...internalClasses, ...uniqueCalClasses]
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (todayClasses.length === 0) {
      return {
        class: null,
        studio: null,
        status: 'none' as const,
        nextClass: undefined,
        nextStudio: undefined,
      };
    }

    // Find current or next class
    let currentClass: Class | null = null;
    let nextClass: Class | undefined;
    let status: 'before' | 'during' | 'after' | 'none' = 'none';

    for (let i = 0; i < todayClasses.length; i++) {
      const cls = todayClasses[i];
      const classStatus = getClassStatus(cls, currentDay, currentTime);

      if (classStatus === 'during') {
        currentClass = cls;
        status = 'during';
        nextClass = todayClasses[i + 1];
        break;
      } else if (classStatus === 'before') {
        // This is the next upcoming class
        if (!currentClass) {
          currentClass = cls;
          status = 'before';
          nextClass = todayClasses[i + 1];
        }
        break;
      }
    }

    // If all classes are done for today
    if (!currentClass && todayClasses.length > 0) {
      const lastClass = todayClasses[todayClasses.length - 1];
      if (getClassStatus(lastClass, currentDay, currentTime) === 'after') {
        status = 'after';
      }
    }

    const studio = currentClass ? getStudioById(currentClass.studioId) : null;
    const nextStudio = nextClass ? getStudioById(nextClass.studioId) : undefined;

    return {
      class: currentClass,
      studio: studio || null,
      status,
      timeUntilStart: currentClass && status === 'before'
        ? getMinutesUntilClass(currentClass, currentTime)
        : undefined,
      timeRemaining: currentClass && status === 'during'
        ? getMinutesRemaining(currentClass, currentTime)
        : undefined,
      nextClass,
      nextStudio,
    };
  }, [classes, weekNotes, currentDay, currentTime, options?.calendarEvents, options?.competitionDances]);

  return result;
}
