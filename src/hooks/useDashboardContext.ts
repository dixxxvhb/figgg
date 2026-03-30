import { useMemo } from 'react';
import { useClassTiming, type ClassWithContext } from './useClassTiming';
import { useCheckInStatus } from './useCheckInStatus';
import { useSelfCareStatus, type SelfCareStatus } from './useSelfCareStatus';
import { useCurrentClass } from './useCurrentClass';
import { getCurrentDayOfWeek, timeToMinutes, toDateStr } from '../utils/time';
import { getClassesByDay } from '../data/classes';
import { classifyCalendarEvent } from '../utils/calendarEventType';
import type { AppData, CurrentClassInfo } from '../types';

export type DashboardContextType =
  | 'morning'
  | 'pre-class'
  | 'during-class'
  | 'post-class'
  | 'evening'
  | 'default';

export interface DashboardContextData {
  context: DashboardContextType;

  // Class data
  currentClassInfo: CurrentClassInfo;
  upcomingClass: ClassWithContext | null;
  justEndedClass: ClassWithContext | null;
  minutesUntilNext: number | null;

  // Check-in status
  checkIn: {
    isDue: boolean;
    type: 'morning' | 'afternoon' | null;
    greeting: string;
  };

  // Meds status
  selfCareStatus: SelfCareStatus;

  // Time
  currentMinute: number;
  hour: number;

  // Flags
  allClassesDone: boolean;
}

export function useDashboardContext(
  data: AppData,
  currentMinute: number,
): DashboardContextData {
  const currentClassInfo = useCurrentClass(data.classes || [], data.weekNotes, {
    calendarEvents: data.calendarEvents,
    competitionDances: data.competitionDances,
    students: data.students || [],
  });
  const { upcomingClass, justEndedClass, minutesUntilNext } = useClassTiming(data, currentMinute);
  const checkIn = useCheckInStatus(data.aiCheckIns, data.settings?.aiConfig, currentMinute);
  const selfCareStatus = useSelfCareStatus(data.selfCare, data.settings?.medConfig);

  const context = useMemo<DashboardContextType>(() => {
    const hour = new Date().getHours();
    const nowMinutes = currentMinute;

    // Determine if all classes for today are done (both internal + calendar)
    const dayName = getCurrentDayOfWeek();
    const todayInternalClasses = getClassesByDay(data.classes || [], dayName);
    const todayStr = toDateStr(new Date());
    const todayCalClasses = (data.calendarEvents || []).filter(e => {
      if (e.date !== todayStr || !e.startTime || e.startTime === '00:00') return false;
      return classifyCalendarEvent(e, {
        classes: data.classes || [],
        allEvents: data.calendarEvents || [],
        competitionDances: data.competitionDances || [],
        students: data.students || [],
      }).isClassLike;
    });
    const allEndTimes = [
      ...todayInternalClasses.map(c => timeToMinutes(c.endTime)),
      ...todayCalClasses.map(e => timeToMinutes(e.endTime || e.startTime)),
    ];
    const allClassesDone = allEndTimes.length > 0 && allEndTimes.every(end => nowMinutes > end);

    // Priority order matters here
    if (currentClassInfo.status === 'during') {
      return 'during-class';
    }

    if (upcomingClass !== null) {
      return 'pre-class';
    }

    if (justEndedClass !== null) {
      return 'post-class';
    }

    if (hour >= 19 || allClassesDone) {
      return 'evening';
    }

    if (hour < 12 && !allClassesDone) {
      return 'morning';
    }

    return 'default';
  }, [currentClassInfo.status, upcomingClass, justEndedClass, currentMinute, data.classes, data.calendarEvents, data.competitionDances]);

  const hour = new Date().getHours();

  const allClassesDone = useMemo(() => {
    const dayName = getCurrentDayOfWeek();
    const internalClasses = getClassesByDay(data.classes || [], dayName);
    const todayStr = toDateStr(new Date());
    const calClasses = (data.calendarEvents || []).filter(e => {
      if (e.date !== todayStr || !e.startTime || e.startTime === '00:00') return false;
      return classifyCalendarEvent(e, {
        classes: data.classes || [],
        allEvents: data.calendarEvents || [],
        competitionDances: data.competitionDances || [],
        students: data.students || [],
      }).isClassLike;
    });
    const allEndTimes = [
      ...internalClasses.map(c => timeToMinutes(c.endTime)),
      ...calClasses.map(e => timeToMinutes(e.endTime || e.startTime)),
    ];
    return allEndTimes.length > 0 && allEndTimes.every(end => currentMinute > end);
  }, [data.classes, data.calendarEvents, data.competitionDances, currentMinute]);

  return {
    context,
    currentClassInfo,
    upcomingClass,
    justEndedClass,
    minutesUntilNext,
    checkIn,
    selfCareStatus,
    currentMinute,
    hour,
    allClassesDone,
  };
}
