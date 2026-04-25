import { useMemo } from 'react';
import { useClassTiming, type ClassWithContext } from './useClassTiming';
import { useCheckInStatus } from './useCheckInStatus';
import { useSelfCareStatus, type SelfCareStatus } from './useSelfCareStatus';
import { useCurrentClass } from './useCurrentClass';
import { timeToMinutes, toDateStr } from '../utils/time';
import { getClassesFromCalendar } from '../utils/calendarEventType';
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
  const currentClassInfo = useCurrentClass(data, data.weekNotes);
  const { upcomingClass, justEndedClass, minutesUntilNext } = useClassTiming(data, currentMinute);
  const checkIn = useCheckInStatus(data.aiCheckIns, data.settings?.aiConfig, currentMinute);
  const selfCareStatus = useSelfCareStatus(data.selfCare, data.settings?.medConfig);

  const context = useMemo<DashboardContextType>(() => {
    const hour = new Date().getHours();
    const nowMinutes = currentMinute;

    // Determine if all classes for today are done (Apple Calendar — single source of truth)
    const todayStr = toDateStr(new Date());
    const todayClasses = getClassesFromCalendar(data, { date: todayStr });
    const allEndTimes = todayClasses.map(c => timeToMinutes(c.endTime));
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
  }, [currentClassInfo.status, upcomingClass, justEndedClass, currentMinute, data]);

  const hour = new Date().getHours();

  const allClassesDone = useMemo(() => {
    const todayStr = toDateStr(new Date());
    const todayClasses = getClassesFromCalendar(data, { date: todayStr });
    const allEndTimes = todayClasses.map(c => timeToMinutes(c.endTime));
    return allEndTimes.length > 0 && allEndTimes.every(end => currentMinute > end);
  }, [data, currentMinute]);

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
