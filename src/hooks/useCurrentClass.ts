import { useState, useEffect, useMemo } from 'react';
import { AppData, Class, CurrentClassInfo, DayOfWeek } from '../types';
import { getCurrentDayOfWeek, getCurrentTimeMinutes, getClassStatus, getMinutesUntilClass, getMinutesRemaining, timeToMinutes, formatWeekOf, getWeekStart, toDateStr } from '../utils/time';
import { getStudioById } from '../data/studios';
import { getClassesFromCalendar, classLikeEventToClass } from '../utils/calendarEventType';

export function useCurrentClass(data: AppData): CurrentClassInfo {
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

  return useMemo(() => {
    // Source of truth: today's class-like calendar events. `getClassesFromCalendar`
    // already drops untimed events, applies the classifier, and resolves studios.
    const todayStr = toDateStr(new Date());
    const calClassEvents = getClassesFromCalendar(data, { date: todayStr });

    // Filter out cancelled / subbed events via this week's exceptions
    const weekOf = formatWeekOf(getWeekStart());
    const currentWeekNotes = data.weekNotes?.find(w => w.weekOf === weekOf);
    const filteredEvents = calClassEvents.filter(ev => {
      const exc = currentWeekNotes?.classNotes[ev.id]?.exception;
      return !exc || exc.type === 'time-change';
    });

    // Convert to Class shape and sort by start time. (Already sorted by date+time
    // inside `getClassesFromCalendar`, but date is fixed here so re-sort by time.)
    const todayClasses: Class[] = filteredEvents
      .map(classLikeEventToClass)
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
  }, [data, currentDay, currentTime]);
}
