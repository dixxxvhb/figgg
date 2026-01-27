import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadData, saveData } from '../services/storage';
import { generateSmartTasks } from '../utils/smartTasks';
import { getCurrentDayOfWeek } from '../utils/time';
import type { SmartTask, Class, CalendarEvent, DayOfWeek } from '../types';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function useSmartTasks() {
  const [smartTaskStates, setSmartTaskStates] = useState<Record<string, boolean>>({});
  const [todayStr, setTodayStr] = useState(getTodayStr);
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(getCurrentDayOfWeek);

  // Midnight rollover: update day/date and reset smart tasks if day changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newStr = getTodayStr();
      if (newStr !== todayStr) {
        setTodayStr(newStr);
        setCurrentDay(getCurrentDayOfWeek());
        setSmartTaskStates({});
        const data = loadData();
        data.selfCare = { ...data.selfCare, smartTaskStates: {}, smartTaskDate: newStr };
        saveData(data);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [todayStr]);

  // Load smart task states on mount (reset if stale date)
  useEffect(() => {
    const data = loadData();
    const sc = data.selfCare || {};
    if (sc.smartTaskDate === todayStr && sc.smartTaskStates) {
      setSmartTaskStates(sc.smartTaskStates);
    } else {
      setSmartTaskStates({});
      data.selfCare = { ...data.selfCare, smartTaskStates: {}, smartTaskDate: todayStr };
      saveData(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate smart tasks from today's data
  const smartTasks = useMemo<SmartTask[]>(() => {
    const data = loadData();

    const todayClasses = (data.classes || [])
      .filter((c: Class) => c.day === currentDay)
      .map((c: Class) => ({
        name: c.name,
        startTime: c.startTime,
        endTime: c.endTime,
        studioId: c.studioId,
      }));

    const todayCalendarEvents = (data.calendarEvents || [])
      .filter((e: CalendarEvent) => e.date === todayStr && e.startTime && e.startTime !== '00:00')
      .map((e: CalendarEvent) => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
      }));

    // Tomorrow's schedule for the sleep-prep preview task
    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const nextDay = days[(days.indexOf(currentDay) + 1) % 7];
    const tomorrowClasses = (data.classes || [])
      .filter((c: Class) => c.day === nextDay)
      .sort((a: Class, b: Class) => a.startTime.localeCompare(b.startTime));

    const competitions = (data.competitions || []).map((c: { name: string; date: string }) => ({
      name: c.name,
      date: c.date,
    }));

    return generateSmartTasks({
      todayClasses,
      todayCalendarEvents,
      competitions,
      currentDay,
      dateStr: todayStr,
      tomorrowClassCount: tomorrowClasses.length,
      tomorrowFirstClassTime: tomorrowClasses.length > 0 ? tomorrowClasses[0].startTime : undefined,
    });
  }, [currentDay, todayStr]);

  // Group by session key for easy lookup
  const smartTasksBySession = useMemo(() => {
    const map: Record<string, SmartTask[]> = {};
    for (const task of smartTasks) {
      if (!map[task.sessionKey]) map[task.sessionKey] = [];
      map[task.sessionKey].push(task);
    }
    return map;
  }, [smartTasks]);

  const isSmartTaskDone = useCallback((id: string) => !!smartTaskStates[id], [smartTaskStates]);

  const toggleSmartTask = useCallback((id: string) => {
    setSmartTaskStates(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      const data = loadData();
      data.selfCare = { ...data.selfCare, smartTaskStates: updated, smartTaskDate: todayStr };
      saveData(data);
      return updated;
    });
  }, [todayStr]);

  const smartTaskStats = useMemo(() => {
    const total = smartTasks.length;
    const completed = smartTasks.filter(t => smartTaskStates[t.id]).length;
    return { total, completed };
  }, [smartTasks, smartTaskStates]);

  return {
    smartTasks,
    smartTasksBySession,
    isSmartTaskDone,
    toggleSmartTask,
    smartTaskStats,
  };
}
