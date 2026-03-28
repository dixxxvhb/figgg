import { useMemo } from 'react';
import { useClassTiming, type ClassWithContext } from './useClassTiming';
import { useCheckInStatus } from './useCheckInStatus';
import { useSelfCareStatus, type SelfCareStatus } from './useSelfCareStatus';
import { useCurrentClass } from './useCurrentClass';
import { getCurrentDayOfWeek, timeToMinutes } from '../utils/time';
import { getClassesByDay } from '../data/classes';
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
  const currentClassInfo = useCurrentClass(data.classes || [], data.weekNotes);
  const { upcomingClass, justEndedClass, minutesUntilNext } = useClassTiming(data, currentMinute);
  const checkIn = useCheckInStatus(data.aiCheckIns, data.settings?.aiConfig, currentMinute);
  const selfCareStatus = useSelfCareStatus(data.selfCare, data.settings?.medConfig);

  const context = useMemo<DashboardContextType>(() => {
    const hour = new Date().getHours();
    const nowMinutes = currentMinute;

    // Determine if all classes for today are done
    const dayName = getCurrentDayOfWeek();
    const todayClasses = getClassesByDay(data.classes || [], dayName);
    const allClassesDone = todayClasses.length > 0 && todayClasses.every(cls => {
      const classEnd = timeToMinutes(cls.endTime);
      return nowMinutes > classEnd;
    });

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
  }, [currentClassInfo.status, upcomingClass, justEndedClass, currentMinute, data.classes]);

  const hour = new Date().getHours();

  const allClassesDone = useMemo(() => {
    const dayName = getCurrentDayOfWeek();
    const todayClasses = getClassesByDay(data.classes || [], dayName);
    return todayClasses.length > 0 && todayClasses.every(cls => {
      const classEnd = timeToMinutes(cls.endTime);
      return currentMinute > classEnd;
    });
  }, [data.classes, currentMinute]);

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
