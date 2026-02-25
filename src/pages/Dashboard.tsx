import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, parseISO, addDays, isAfter } from 'date-fns';
import {
  Trophy,
  ChevronRight,
  Users,
  Play,
  Clock,
  MapPin,
  AlertCircle,
  FileText,
  Pill,
  MessageSquare,
  Pencil,
  Check,
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useCurrentClass } from '../hooks/useCurrentClass';
import { useAppData } from '../contexts/AppDataContext';
import { useTeachingStats } from '../hooks/useTeachingStats';
import { useSelfCareStatus } from '../hooks/useSelfCareStatus';
import { getCurrentDayOfWeek, formatTimeDisplay, formatWeekOf, getWeekStart, timeToMinutes } from '../utils/time';
import { getClassesByDay } from '../data/classes';
import { updateSettings } from '../services/storage';
import { WeekStats } from '../components/Dashboard/WeekStats';
import { TodaysAgenda } from '../components/Dashboard/TodaysAgenda';
import { MorningBriefing } from '../components/Dashboard/MorningBriefing';
import { RemindersWidget } from '../components/Dashboard/RemindersWidget';
import { ScratchpadWidget } from '../components/Dashboard/ScratchpadWidget';
import { LaunchPlanWidget } from '../components/Dashboard/LaunchPlanWidget';
import { EventCountdown } from '../components/Dashboard/EventCountdown';
import { StreakCard } from '../components/Dashboard/StreakCard';
import { WeeklyInsight } from '../components/Dashboard/WeeklyInsight';
import { WeekMomentumBar } from '../components/Dashboard/WeekMomentumBar';
import { SortableWidget } from '../components/Dashboard/SortableWidget';
import { NudgeCards } from '../components/Dashboard/NudgeCards';
import { PrepCard } from '../components/Dashboard/PrepCard';
import { PostClassCapture } from '../components/Dashboard/PostClassCapture';
import { useNudges } from '../hooks/useNudges';
import { useClassTiming } from '../hooks/useClassTiming';
import { CalendarEvent, DEFAULT_MED_CONFIG, DEFAULT_AI_CONFIG } from '../types';
import type { AICheckIn, DayPlan, DayPlanItem, RecurringSchedule } from '../types';
import { AICheckInWidget } from '../components/Dashboard/AICheckInWidget';
import { DayPlanWidget } from '../components/Dashboard/DayPlanWidget';
import { useCheckInStatus } from '../hooks/useCheckInStatus';
import { buildAIContext } from '../services/aiContext';
import type { AIContextPayload } from '../services/aiContext';
import { callGenerateDayPlan, callAIChat } from '../services/ai';
import type { AIAction } from '../services/ai';
import { buildFullAIContext } from '../services/aiContext';
import { executeAIActions as executeSharedAIActions } from '../services/aiActions';
import type { ActionCallbacks } from '../services/aiActions';
import { applyMoodLayer } from '../styles/moodLayer';
import type { MoodSignal, ActivityState } from '../styles/moodLayer';

const VALID_CATEGORIES = new Set(['task', 'wellness', 'class', 'launch', 'break', 'med']);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

/** Validate and normalize AI-returned day plan items — Haiku can be creative with schemas */
function validateDayPlanItems(raw: unknown[]): DayPlan['items'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item, i) => ({
      id: typeof item.id === 'string' ? item.id : `plan_${i}`,
      time: typeof item.time === 'string' ? item.time : undefined,
      title: typeof item.title === 'string' ? item.title : 'Untitled',
      category: (typeof item.category === 'string' && VALID_CATEGORIES.has(item.category))
        ? item.category as DayPlanItem['category'] : 'task',
      sourceId: typeof item.sourceId === 'string' ? item.sourceId : undefined,
      completed: typeof item.completed === 'boolean' ? item.completed : false,
      priority: (typeof item.priority === 'string' && VALID_PRIORITIES.has(item.priority))
        ? item.priority as DayPlanItem['priority'] : 'medium',
      aiNote: typeof item.aiNote === 'string' ? item.aiNote : undefined,
    }));
}

const ACTION_KEYWORDS = /\b(next (?:week|time|class)|need to|try|work on|remember to|don't forget|follow up|revisit|come back to|keep working|practice|drill|review)\b/i;
const isActionItem = (text: string) => ACTION_KEYWORDS.test(text) || text.startsWith('!');

const DEFAULT_WIDGET_ORDER = [
  'morning-briefing',
  'nudges',
  'todays-agenda',
  'reminders',
  'week-momentum',
  'week-stats',
  'streak',
  'weekly-insight',
  'launch-plan',
  'scratchpad',
] as const;

const WIDGET_LABELS: Record<string, string> = {
  'morning-briefing': 'Quick Stats',
  'nudges': 'Nudges',
  'todays-agenda': "Today's Schedule",
  'reminders': 'Tasks',
  'week-momentum': 'Week Momentum',
  'week-stats': 'Week Stats',
  'streak': 'Streak',
  'weekly-insight': 'Weekly Insight',
  'launch-plan': 'Launch Plan',
  'scratchpad': 'Scratchpad',
};

export function Dashboard() {
  const { data, updateSelfCare, saveAICheckIn, saveDayPlan, saveWeekNotes, refreshData, updateLaunchPlan, updateCompetitionDance, getCurrentWeekNotes, updateDisruption, updateCalendarEvent } = useAppData();
  const stats = useTeachingStats(data);
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const selfCareStatus = useSelfCareStatus(data.selfCare, medConfig);

  // Nudges + class timing
  const nudges = useNudges(data);
  const [nudgeKey, setNudgeKey] = useState(0);

  // Minute-level clock — drives timers, check-in status, etc.
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Class timing for prep/capture
  const classTiming = useClassTiming(data, currentMinute);

  // AI check-in
  const aiConfig = { ...DEFAULT_AI_CONFIG, ...(data.settings?.aiConfig || {}) };
  const checkInStatus = useCheckInStatus(data.aiCheckIns, aiConfig, currentMinute);
  // Keep widget mounted after submit/error until it self-dismisses
  const [checkInActive, setCheckInActive] = useState(false);
  const [frozenCheckInType, setFrozenCheckInType] = useState<'morning' | 'afternoon' | null>(null);
  const [frozenGreeting, setFrozenGreeting] = useState('');
  useEffect(() => {
    if (checkInStatus.isDue && checkInStatus.type && !checkInActive) {
      setCheckInActive(true);
      setFrozenCheckInType(checkInStatus.type);
      // Softer greeting during disruption
      if (data.disruption?.active) {
        setFrozenGreeting('How are you holding up?');
      } else {
        setFrozenGreeting(checkInStatus.greeting);
      }
    }
  }, [checkInStatus.isDue, checkInStatus.type, checkInActive, data.disruption?.active]);

  const [isReplanning, setIsReplanning] = useState(false);
  // Ref for data so generateDayPlan doesn't re-create on every data change
  const dataRef = useRef(data);
  dataRef.current = data;
  // Guard against concurrent calls (button double-tap, check-in + re-plan race)
  const planInFlightRef = useRef(false);

  const generateDayPlan = useCallback(async (checkInMood?: string, checkInMessage?: string) => {
    if (planInFlightRef.current) {
      // Already generating — show spinner so user knows it's working
      setIsReplanning(true);
      return;
    }
    planInFlightRef.current = true;
    setIsReplanning(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const existingPlan = dataRef.current.dayPlan?.date === todayStr ? dataRef.current.dayPlan : null;
      const completedItems = existingPlan?.items.filter(i => i.completed) || [];

      const payload: AIContextPayload & {
        checkInMood?: string;
        checkInMessage?: string;
        completedItems?: { id: string; title: string; category: string; sourceId?: string }[];
      } = {
        ...buildAIContext(dataRef.current, 'morning', ''),
        checkInMood,
        checkInMessage,
      };

      // Tell the AI what's already done so it doesn't regenerate them
      if (completedItems.length > 0) {
        payload.completedItems = completedItems.map(i => ({
          id: i.id, title: i.title, category: i.category, sourceId: i.sourceId,
        }));
      }

      const result = await callGenerateDayPlan(payload);
      const newItems = validateDayPlanItems(result.items);

      // Don't save empty plans unless we have completed items to preserve
      if (newItems.length === 0 && completedItems.length === 0) {
        console.warn('Day plan returned 0 items, skipping save');
        return;
      }

      // Merge: keep completed items, add new items that don't overlap
      const completedSourceIds = new Set(completedItems.filter(i => i.sourceId).map(i => i.sourceId));
      const completedTitles = new Set(completedItems.map(i => i.title.toLowerCase()));

      const filteredNewItems = newItems.filter(item => {
        // Don't add if we already have a completed item with same sourceId
        if (item.sourceId && completedSourceIds.has(item.sourceId)) return false;
        // Classes rely on sourceId for dedup — don't title-match (two classes can share a name)
        if (item.category === 'class') return true;
        // For other categories, don't add if we already have a completed item with same title
        if (completedTitles.has(item.title.toLowerCase())) return false;
        return true;
      });

      // Completed items first (preserve order), then new items
      const mergedItems = [...completedItems, ...filteredNewItems];

      const now = new Date().toISOString();
      const plan: DayPlan = {
        date: todayStr,
        generatedAt: now,
        lastModified: now,
        items: mergedItems,
        summary: result.summary || existingPlan?.summary || 'Your plan for today.',
      };
      saveDayPlan(plan);
    } catch (e) {
      console.error('Day plan generation failed:', e);
    } finally {
      planInFlightRef.current = false;
      setIsReplanning(false);
    }
  }, [saveDayPlan]);

  // Action callbacks for shared AI action executor
  const actionCallbacks: ActionCallbacks = useMemo(() => ({
    getData: () => dataRef.current,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    updateDisruption,
    updateCalendarEvent,
    getMedConfig: () => medConfig,
  }), [updateSelfCare, saveDayPlan, saveWeekNotes, getCurrentWeekNotes, updateLaunchPlan, updateCompetitionDance, updateDisruption, updateCalendarEvent, medConfig]);

  const executeAIActions = useCallback((actions: AIAction[]) => {
    executeSharedAIActions(actions, actionCallbacks);
  }, [actionCallbacks]);

  const handleCheckInSubmit = useCallback(async (message: string) => {
    const type = frozenCheckInType;
    if (!type) return { response: '', adjustments: [] };
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const context = buildFullAIContext(dataRef.current, message);
      const result = await callAIChat({
        mode: 'check-in',
        userMessage: message,
        context,
      });
      const checkIn: AICheckIn = {
        id: `ci-${Date.now()}`,
        date: todayStr,
        type,
        userMessage: message,
        aiResponse: result.response,
        adjustments: result.adjustments,
        mood: result.mood,
        timestamp: new Date().toISOString(),
      };
      saveAICheckIn(checkIn);

      // Apply structured AI actions to app state
      if (result.actions && result.actions.length > 0) {
        executeAIActions(result.actions);
      }

      // Auto-generate (morning) or re-plan (afternoon) after check-in
      if (aiConfig.autoPlanEnabled) {
        generateDayPlan(result.mood, message);
      }
      return result;
    } catch (e) {
      // Save a record so the check-in doesn't keep re-appearing on page refresh
      saveAICheckIn({
        id: `ci-err-${Date.now()}`,
        date: todayStr,
        type,
        userMessage: message,
        aiResponse: '',
        timestamp: new Date().toISOString(),
      });
      // Throw so widget can show its error state with retry button
      throw e;
    }
  }, [frozenCheckInType, saveAICheckIn, aiConfig.autoPlanEnabled, generateDayPlan, executeAIActions]);

  const handleCheckInSkip = useCallback(() => {
    const type = frozenCheckInType;
    if (!type) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const skipRecord: AICheckIn = {
      id: `ci-skip-${Date.now()}`,
      date: todayStr,
      type,
      userMessage: '',
      aiResponse: '',
      timestamp: new Date().toISOString(),
    };
    saveAICheckIn(skipRecord);
  }, [frozenCheckInType, saveAICheckIn]);

  const handleTogglePlanItem = useCallback((itemId: string) => {
    if (!data.dayPlan) return;
    const item = data.dayPlan.items.find(i => i.id === itemId);
    if (!item) return;
    const newCompleted = !item.completed;

    // Sync wellness items with selfCare checklist
    if (item.category === 'wellness' && item.sourceId) {
      const sc = data.selfCare || {};
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const currentStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
      updateSelfCare({
        unifiedTaskStates: { ...currentStates, [item.sourceId]: newCompleted },
        unifiedTaskDate: todayKey,
      });
    }

    // Sync launch items with launch plan
    if (item.category === 'launch' && item.sourceId && data.launchPlan) {
      const tasks = data.launchPlan.tasks.map(t =>
        t.id === item.sourceId
          ? newCompleted
            ? { ...t, completed: true, completedAt: new Date().toISOString() }
            : { ...t, completed: false, completedAt: undefined }
          : t
      );
      updateLaunchPlan({ tasks });
    }

    const updated: DayPlan = {
      ...data.dayPlan,
      items: data.dayPlan.items.map(i =>
        i.id === itemId ? { ...i, completed: newCompleted } : i
      ),
    };
    saveDayPlan(updated);
  }, [data.dayPlan, saveDayPlan, data.selfCare, updateSelfCare]);

  const todayPlan = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return data.dayPlan?.date === todayStr ? data.dayPlan : null;
  }, [data.dayPlan]);

  // Toggle reminder completion from dashboard widget
  const handleToggleReminder = useCallback((id: string) => {
    const sc = data.selfCare || {};
    const reminders = sc.reminders || [];
    const target = reminders.find(r => r.id === id);
    if (!target) return;

    const nowCompleted = !target.completed;
    let updated = reminders.map(r =>
      r.id === id ? { ...r, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() } : r
    );

    // Generate next instance for recurring tasks
    if (nowCompleted && target.recurring && target.dueDate) {
      const getNext = (dateStr: string, rec: RecurringSchedule): string | null => {
        const d = parseISO(dateStr);
        let next: Date;
        switch (rec.type) {
          case 'daily': next = addDays(d, rec.interval); break;
          case 'weekly': next = addDays(d, 7 * rec.interval); break;
          case 'monthly': next = new Date(d); next.setMonth(next.getMonth() + rec.interval); break;
          case 'yearly': next = new Date(d); next.setFullYear(next.getFullYear() + rec.interval); break;
          default: return null;
        }
        if (rec.endDate && isAfter(next, parseISO(rec.endDate))) return null;
        return format(next, 'yyyy-MM-dd');
      };
      const nextDate = getNext(target.dueDate, target.recurring);
      if (nextDate) {
        updated = [...updated, {
          ...target,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          completed: false,
          completedAt: undefined,
          dueDate: nextDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }
    }

    updateSelfCare({ reminders: updated });
  }, [data.selfCare, updateSelfCare]);

  const handleScratchpadChange = useCallback((text: string) => {
    updateSelfCare({ scratchpad: text });
  }, [updateSelfCare]);

  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // Widget order — sanitize saved order (handle new/removed widgets)
  const widgetOrder = useMemo(() => {
    const saved = data.settings?.dashboardWidgetOrder || [];
    const validIds = new Set<string>(DEFAULT_WIDGET_ORDER);
    const existing = saved.filter((id: string) => validIds.has(id));
    const missing = DEFAULT_WIDGET_ORDER.filter(id => !existing.includes(id));
    return [...existing, ...missing];
  }, [data.settings?.dashboardWidgetOrder]);

  // Drag sensors — pointer needs distance, touch needs delay
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgetOrder.indexOf(active.id as string);
    const newIndex = widgetOrder.indexOf(over.id as string);
    const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
    updateSettings({ ...data.settings, dashboardWidgetOrder: newOrder });
    refreshData();
  }, [widgetOrder, data.settings, refreshData]);

  const currentTime = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  }, [currentMinute]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const newMinute = now.getHours() * 60 + now.getMinutes();
      setCurrentMinute(prev => prev !== newMinute ? newMinute : prev);
    };
    const interval = setInterval(checkTime, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkTime();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const currentDay = useMemo(() => getCurrentDayOfWeek(), [currentMinute]);
  const todayClasses = useMemo(() => getClassesByDay(data.classes, currentDay), [data.classes, currentDay]);
  const classInfo = useCurrentClass(data.classes, data.weekNotes);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [currentMinute]);

  const todayCalendarEvents = useMemo(() => {
    const classTimes = todayClasses.map(c => timeToMinutes(c.startTime));
    return (data.calendarEvents || [])
      .filter((e: CalendarEvent) => e.date === todayStr && e.startTime && e.startTime !== '00:00')
      .filter((e: CalendarEvent) => {
        const et = timeToMinutes(e.startTime);
        return !classTimes.some(ct => Math.abs(ct - et) <= 10);
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [data.calendarEvents, todayStr, todayClasses]);

  const currentCalendarEvent = useMemo(() => {
    return todayCalendarEvents.find((e: CalendarEvent) => {
      const start = timeToMinutes(e.startTime);
      const end = e.endTime && e.endTime !== '00:00' ? timeToMinutes(e.endTime) : start + 60;
      return start <= currentMinute && currentMinute < end;
    }) || null;
  }, [todayCalendarEvents, currentMinute]);

  const nextCalendarEvent = useMemo(() => {
    return todayCalendarEvents.find((e: CalendarEvent) => timeToMinutes(e.startTime) > currentMinute) || null;
  }, [todayCalendarEvents, currentMinute]);

  const nextUpInfo = useMemo(() => {
    const totalItems = todayClasses.length + todayCalendarEvents.length;
    if (totalItems === 0) return null;
    if (classInfo.status === 'during' && classInfo.class) {
      return { type: 'during' as const, name: classInfo.class.name, timeRemaining: classInfo.timeRemaining };
    }
    if (currentCalendarEvent && !(classInfo.status === 'before' && classInfo.class)) {
      const start = timeToMinutes(currentCalendarEvent.startTime);
      const end = currentCalendarEvent.endTime && currentCalendarEvent.endTime !== '00:00'
        ? timeToMinutes(currentCalendarEvent.endTime) : start + 60;
      return { type: 'during' as const, name: currentCalendarEvent.title, timeRemaining: end - currentMinute };
    }
    const classNext = classInfo.status === 'before' && classInfo.class
      ? { type: 'class' as const, name: classInfo.class.name, startMinutes: timeToMinutes(classInfo.class.startTime), timeUntilStart: classInfo.timeUntilStart }
      : null;
    const eventNext = nextCalendarEvent
      ? { type: 'event' as const, name: nextCalendarEvent.title, startMinutes: timeToMinutes(nextCalendarEvent.startTime) }
      : null;
    if (classNext && eventNext) return classNext.startMinutes <= eventNext.startMinutes ? classNext : eventNext;
    return classNext || eventNext || null;
  }, [classInfo, currentCalendarEvent, nextCalendarEvent, currentMinute, todayClasses.length, todayCalendarEvents.length]);

  const nextComp = useMemo(() => {
    const today = new Date();
    return data.competitions
      .filter(c => parseISO(c.date) >= today)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0];
  }, [data.competitions]);

  const daysUntilComp = nextComp ? differenceInDays(parseISO(nextComp.date), new Date()) : null;

  const compPrepProgress = useMemo(() => {
    if (!nextComp) return { dances: 0, totalDances: 0 };
    const compDances = data.competitionDances?.filter(d => nextComp.dances?.includes(d.id)) || [];
    const dancesWithNotes = compDances.filter(d => d.rehearsalNotes && d.rehearsalNotes.length > 0).length;
    return { dances: dancesWithNotes, totalDances: compDances.length };
  }, [nextComp, data.competitionDances]);

  const currentClassHasPlan = useMemo(() => {
    if (!classInfo.class) return false;
    const weekOf = formatWeekOf(getWeekStart());
    const weekNotes = data.weekNotes.find(w => w.weekOf === weekOf);
    if (!weekNotes) return false;
    const classNotes = weekNotes.classNotes[classInfo.class.id];
    return classNotes?.plan && classNotes.plan.trim().length > 0;
  }, [classInfo.class, data.weekNotes]);

  const currentStudio = classInfo.class ? data.studios.find(s => s.id === classInfo.class?.studioId) : null;

  const getLastWeekNotes = (classId: string) => {
    const sorted = [...(data.weekNotes || [])].sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime());
    for (const week of sorted) {
      const notes = week.classNotes[classId];
      if (notes && notes.liveNotes.length > 0) return notes.liveNotes.slice(-3);
    }
    return [];
  };

  const lastNotes = classInfo.class ? getLastWeekNotes(classInfo.class.id) : [];
  const enrolledStudents = classInfo.class ? (data.students || []).filter(s => s.classIds?.includes(classInfo.class!.id)) : [];

  const recentlyEndedClass = useMemo(() => {
    if (classInfo.status === 'during') return null;
    for (const cls of todayClasses) {
      const endMinutes = timeToMinutes(cls.endTime);
      const elapsed = currentMinute - endMinutes;
      if (elapsed >= 0 && elapsed <= 15) return cls;
    }
    return null;
  }, [todayClasses, currentMinute, classInfo.status]);

  const medClassWarning = useMemo(() => {
    if (!classInfo.class || classInfo.status !== 'before') return null;
    if (!selfCareStatus.dose1Active && !selfCareStatus.dose2Active && !selfCareStatus.dose3Active) return null;
    const minutesUntil = classInfo.timeUntilStart || 0;
    if (minutesUntil <= 0 || minutesUntil > 120) return null;
    const projected = selfCareStatus.projectedStatus(minutesUntil);
    const className = classInfo.class!.name;
    if (projected === 'Wearing Off' || projected === 'Tapering') return `Take dose before ${className}`;
    if (projected === 'Expired') return `Meds will have worn off before ${className}`;
    return null;
  }, [classInfo, selfCareStatus]);

  const dayName = format(currentTime, 'EEEE');
  const dateStr = format(currentTime, 'MMMM d');
  const hour = currentTime.getHours();
  const todayStr2 = format(currentTime, 'yyyy-MM-dd');

  const canLogDose = useMemo(() => {
    const sc = data.selfCare;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (sc?.skippedDoseDate === today) return false;
    if (!sc?.dose1Date || sc.dose1Date !== today) return true;
    if ((!sc?.dose2Date || sc.dose2Date !== today) && medConfig.medType === 'IR') return true;
    if (medConfig.maxDoses === 3 && (!sc?.dose3Date || sc.dose3Date !== today) && medConfig.medType === 'IR') return true;
    return false;
  }, [data.selfCare, medConfig]);

  const handleLogDose = () => {
    const sc = data.selfCare;
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = Date.now();
    if (!sc?.dose1Date || sc.dose1Date !== today) {
      updateSelfCare({ dose1Time: now, dose1Date: today, selfCareModified: new Date().toISOString() });
    } else if ((!sc?.dose2Date || sc.dose2Date !== today) && medConfig.medType === 'IR') {
      updateSelfCare({ dose2Time: now, dose2Date: today, selfCareModified: new Date().toISOString() });
    } else if (medConfig.maxDoses === 3 && (!sc?.dose3Date || sc.dose3Date !== today) && medConfig.medType === 'IR') {
      updateSelfCare({ dose3Time: now, dose3Date: today, selfCareModified: new Date().toISOString() });
    }
  };

  // Latest mood from today's AI check-in
  const todayMood = useMemo(() => {
    const checkIns = (data.aiCheckIns || []).filter(c => c.date === todayStr2 && c.mood);
    return checkIns.length > 0 ? checkIns[checkIns.length - 1].mood : undefined;
  }, [data.aiCheckIns, todayStr2]);

  // ── Mood-responsive theming layer ──
  // Drives subtle visual shifts based on AI check-in mood, time of day, and activity
  useEffect(() => {
    const activityState: ActivityState =
      classInfo.status === 'during' ? 'teaching' :
      classTiming.upcomingClass ? 'prepping' :
      todayClasses.length > 0 && todayClasses.every(c => timeToMinutes(c.endTime) < currentMinute) ? 'done' :
      todayClasses.length === 0 ? 'off' : 'idle';

    applyMoodLayer(todayMood as MoodSignal, hour, activityState);
  }, [todayMood, hour, classInfo.status, classTiming.upcomingClass, todayClasses, currentMinute]);

  const { greeting, greetingSub } = useMemo(() => {
    const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // Disruption-aware: show "Day N away" as subtitle
    if (data.disruption?.active) {
      const dayNum = Math.ceil((new Date().getTime() - new Date(data.disruption.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
      return { greeting: base, greetingSub: `Day ${dayNum} away` };
    }

    const allClassesDone = todayClasses.length > 0 && !classInfo.class && !recentlyEndedClass &&
      todayClasses.every(c => timeToMinutes(c.endTime) < currentMinute);
    const isLateNight = hour >= 22;
    const noMedsYet = !selfCareStatus.dose1Active && !selfCareStatus.dose2Active && !selfCareStatus.dose3Active;
    const skippedToday = data.selfCare?.skippedDoseDate === todayStr2;

    // Mood-aware greetings
    const moodSubs: Record<string, string> = {
      tired: 'Take it easy today',
      stressed: 'One thing at a time',
      low: 'Be gentle with yourself',
      anxious: 'You\'ve got this',
      excited: 'Full day ahead',
    };

    if (isLateNight) return { greeting: 'Getting late', greetingSub: 'Time to wind down' };
    if (noMedsYet && !skippedToday && hour >= 7 && hour < 12) return { greeting: base, greetingSub: 'Meds not taken yet' };
    if (allClassesDone) return { greeting: base, greetingSub: `All ${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''} done` };
    if (classInfo.status === 'during' && classInfo.class) return { greeting: base, greetingSub: `In class: ${classInfo.class.name}` };
    if (todayClasses.length > 0) {
      const remaining = todayClasses.filter(c => timeToMinutes(c.endTime) >= currentMinute).length;
      if (remaining > 0) return { greeting: base, greetingSub: `${remaining} class${remaining > 1 ? 'es' : ''} left today` };
    }
    // Use mood-aware sub if check-in captured mood
    if (todayMood && moodSubs[todayMood]) return { greeting: base, greetingSub: moodSubs[todayMood] };
    if (todayClasses.length === 0 && todayCalendarEvents.length === 0) return { greeting: base, greetingSub: 'No classes today' };
    return { greeting: base, greetingSub: undefined as string | undefined };
  }, [hour, todayClasses, todayCalendarEvents, classInfo, selfCareStatus, currentMinute, recentlyEndedClass, data.selfCare?.skippedDoseDate, todayStr2, todayMood, data.disruption]);

  return (
    <div className="pb-24 bg-[var(--mood-surface-tint)] min-h-screen">
      {/* ── Greeting — clean edge-to-edge, ambient glow from mood layer ── */}
      <div className="px-4 pt-8 pb-2 mood-ambient-glow overflow-hidden">
        <div className="page-w">
          <div className="flex items-start justify-between">
            <div>
              <p className="type-caption uppercase tracking-wider text-[var(--text-secondary)]">
                {greeting.startsWith('Good') ? <>{greeting}, <span className="text-[var(--accent-primary)] font-medium">Dixon</span></> : greeting}
              </p>
              <h1 className="type-display text-[var(--text-primary)] mt-0.5 leading-tight">
                {dayName}, <span className="text-[var(--accent-primary)]">{dateStr}</span>
              </h1>
              {greetingSub && (
                <p className="text-sm font-display text-[var(--text-tertiary)] mt-1">{greetingSub}</p>
              )}
            </div>
            <button
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              className={`mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isEditingLayout
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
              }`}
            >
              {isEditingLayout ? <Check size={13} /> : <Pencil size={13} />}
              {isEditingLayout ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {/* Competition Banner */}
      {nextComp && daysUntilComp !== null && daysUntilComp <= 14 && (
        <div className="page-w px-4 pt-2">
          <Link
            to="/choreography"
            className={`block rounded-2xl overflow-hidden ${
              daysUntilComp <= 3 ? 'bg-[var(--status-danger)]' : daysUntilComp <= 7 ? 'bg-[var(--status-warning)]' : 'bg-[var(--accent-primary)]'
            } text-[var(--text-on-accent)] shadow-sm`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Trophy size={20} /></div>
                  <div>
                    <div className="font-semibold">{nextComp.name}</div>
                    <div className="text-sm opacity-80">{format(parseISO(nextComp.date), 'EEEE, MMM d')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-3xl font-display">{daysUntilComp}</span>
                    <span className="text-sm ml-1">days</span>
                  </div>
                  <ChevronRight size={18} className="opacity-60" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1"><FileText size={14} /><span>Rehearsed: {compPrepProgress.dances}/{compPrepProgress.totalDances}</span></div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="page-w px-4 pt-4 space-y-8">
        <EventCountdown competitions={data.competitions} />

        {/* ── Prep Card — class starting within 60 min ── */}
        {classTiming.upcomingClass && (
          <PrepCard
            classContext={classTiming.upcomingClass}
            minutesUntil={classTiming.minutesUntilNext || 0}
            data={data}
          />
        )}

        {/* ── Post-Class Capture — class just ended ── */}
        {classTiming.justEndedClass && (
          <PostClassCapture
            classContext={classTiming.justEndedClass}
            data={data}
            onSaveNotes={saveWeekNotes}
            getCurrentWeekNotes={getCurrentWeekNotes}
          />
        )}

        {/* ── Hero Card — only shows during active class/event or recently ended ── */}
        {classInfo.class && classInfo.status === 'during' ? (
          <div className="bg-[var(--surface-card)] rounded-2xl overflow-hidden ring-2 ring-[var(--accent-primary)]/30 shadow-lg shadow-[var(--accent-primary)]/10 relative">
            <div className="teaching-border-pulse absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-[var(--accent-primary)]" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-[var(--accent-primary)] text-[var(--text-on-accent)] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />
                  Teaching Now
                </span>
                <div className="text-right">
                  <span className="type-stat text-[var(--accent-primary)] leading-none">
                    {classInfo.timeRemaining}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] ml-1">min left</span>
                </div>
              </div>

              <h2 className="type-h1 text-[var(--text-primary)] leading-tight line-clamp-2 mb-3">{classInfo.class.name}</h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)] mb-4">
                <span className="flex items-center gap-1 text-[--color-honey] dark:text-[--color-honey-light] font-medium">
                  <Clock size={14} />{formatTimeDisplay(classInfo.class.startTime)} - {formatTimeDisplay(classInfo.class.endTime)}
                </span>
                {currentStudio && <span className="flex items-center gap-1"><MapPin size={14} />{currentStudio.shortName}</span>}
                <span className="flex items-center gap-1"><Users size={14} />{enrolledStudents.length}</span>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-3 ${
                currentClassHasPlan
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  : 'bg-[var(--surface-inset)] text-[var(--status-warning)]'
              }`}>
                <FileText size={15} />
                {currentClassHasPlan ? 'Plan ready' : <Link to="/plan" className="hover:underline">No plan — tap to add</Link>}
              </div>

              {medClassWarning && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 mb-3">
                  <Pill size={15} /><span>{medClassWarning}</span>
                </div>
              )}

              {lastNotes.length > 0 && (() => {
                const sorted = [...lastNotes].sort((a, b) => {
                  const aA = isActionItem(a.text) || a.category === 'reminder' || a.category === 'next-week';
                  const bA = isActionItem(b.text) || b.category === 'reminder' || b.category === 'next-week';
                  return aA === bA ? 0 : aA ? -1 : 1;
                });
                return (
                  <div className="bg-[var(--surface-inset)] rounded-xl px-3 py-2.5 mb-3">
                    <div className="type-caption text-[var(--text-tertiary)] mb-1.5 flex items-center gap-1">
                      <AlertCircle size={11} /> From Last Week
                    </div>
                    <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                      {sorted.map(note => {
                        const action = isActionItem(note.text) || note.category === 'reminder' || note.category === 'next-week';
                        return (
                          <li key={note.id} className={`flex items-start gap-1.5 ${action ? 'font-medium text-[var(--accent-primary)]' : ''}`}>
                            <span className={`mt-0.5 ${action ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>{action ? '\u2192' : '\u2022'}</span>
                            <span className="line-clamp-2">{note.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}

              <Link
                to={`/class/${classInfo.class.id}/notes`}
                className="flex items-center justify-center gap-2 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] active:opacity-90 text-[var(--text-on-accent)] py-3.5 rounded-xl font-semibold transition-colors"
              >
                <Play size={18} />Continue Class
              </Link>

              {(() => {
                const classEnd = timeToMinutes(classInfo.class!.endTime);
                const nextEvent = todayCalendarEvents.find(e => timeToMinutes(e.startTime) >= classEnd);
                const nextCls = classInfo.nextClass;
                const showEvent = nextEvent && (!nextCls || timeToMinutes(nextEvent.startTime) < timeToMinutes(nextCls.startTime));
                const upNextName = showEvent ? nextEvent!.title : nextCls?.name;
                const upNextTime = showEvent ? nextEvent!.startTime : nextCls?.startTime;
                if (!upNextName) return null;
                return (
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-[var(--surface-inset)] rounded-xl">
                    <span className="type-caption text-[var(--text-tertiary)]">Then</span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{upNextName}</span>
                    <span className="text-sm font-semibold text-[--color-honey] dark:text-[--color-honey-light] ml-auto flex-shrink-0">{formatTimeDisplay(upNextTime!)}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : currentCalendarEvent ? (
          (() => {
            const startMins = timeToMinutes(currentCalendarEvent.startTime);
            const endMins = currentCalendarEvent.endTime && currentCalendarEvent.endTime !== '00:00' ? timeToMinutes(currentCalendarEvent.endTime) : startMins + 60;
            const remaining = endMins - currentMinute;
            const locationLine = currentCalendarEvent.location?.split('\n').filter(Boolean)[0];
            return (
              <div className="bg-[var(--surface-card)] rounded-2xl overflow-hidden ring-2 ring-amber-400/30 shadow-lg shadow-amber-400/10">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-amber-500 text-white px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />Live
                    </span>
                    <div><span className="type-stat text-amber-600 dark:text-amber-400 leading-none">{remaining}</span><span className="text-[11px] text-[var(--text-tertiary)] ml-1">min left</span></div>
                  </div>
                  <h2 className="type-h1 text-[var(--text-primary)] leading-tight line-clamp-2 mb-3">{currentCalendarEvent.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
                    <span className="flex items-center gap-1 text-[--color-honey] dark:text-[--color-honey-light] font-medium"><Clock size={14} />{formatTimeDisplay(currentCalendarEvent.startTime)}{currentCalendarEvent.endTime && currentCalendarEvent.endTime !== '00:00' && <> - {formatTimeDisplay(currentCalendarEvent.endTime)}</>}</span>
                    {locationLine && <span className="flex items-center gap-1"><MapPin size={14} />{locationLine}</span>}
                  </div>
                  <Link to={`/event/${currentCalendarEvent.id}/notes`} className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-3.5 rounded-xl font-semibold transition-colors"><Play size={18} />Continue Notes</Link>
                </div>
              </div>
            );
          })()
        ) : recentlyEndedClass ? (
          <div className="bg-[var(--surface-card)] rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[var(--accent-muted)] rounded-xl flex items-center justify-center">
                  <MessageSquare size={18} className="text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-[var(--text-primary)]">{recentlyEndedClass.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">Just ended — anything to capture?</p>
                </div>
              </div>
              <Link to={`/class/${recentlyEndedClass.id}/notes`} className="flex items-center justify-center gap-2 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] active:opacity-90 text-[var(--text-on-accent)] py-3.5 rounded-xl font-semibold transition-colors"><Play size={18} />Capture Notes</Link>
            </div>
          </div>
        ) : null}

        {/* ── AI Check-In Widget — stays mounted until widget self-dismisses ── */}
        {checkInActive && frozenCheckInType && (
          <AICheckInWidget
            greeting={frozenGreeting}
            checkInType={frozenCheckInType}
            onSubmit={handleCheckInSubmit}
            onSkip={handleCheckInSkip}
            onDone={() => { setCheckInActive(false); setFrozenCheckInType(null); }}
          />
        )}

        {/* ── Next Action Badge ── */}
        {todayPlan && (() => {
          const next = todayPlan.items.find(i => !i.completed);
          if (!next) return null;
          return (
            <div className="flex items-center gap-3 px-4 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-2xl">
              <div className="flex-1 min-w-0">
                <div className="type-caption text-white/70">Next up</div>
                <div className="text-sm font-semibold truncate">{next.title}</div>
                {next.time && <div className="text-xs text-white/70">{formatTimeDisplay(next.time)}</div>}
              </div>
              <button
                onClick={() => handleTogglePlanItem(next.id)}
                className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              >
                <Check size={16} />
              </button>
            </div>
          );
        })()}

        {/* ── Day Plan Widget — hide when all items done ── */}
        {todayPlan && todayPlan.items.some(i => !i.completed) && (
          <DayPlanWidget
            plan={todayPlan}
            onToggleItem={handleTogglePlanItem}
            onReplan={() => generateDayPlan()}
            isReplanning={isReplanning}
          />
        )}

        {/* ── Reorderable Widgets ── */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
            <div className={`space-y-8 ${!isEditingLayout ? 'widget-stagger-in' : ''}`}>
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id} isEditing={isEditingLayout} label={WIDGET_LABELS[id] || id}>
                {id === 'nudges' && (
                  <NudgeCards nudges={nudges} onDismissOrSnooze={() => setNudgeKey(k => k + 1)} key={`nudge-${nudgeKey}`} />
                )}
                {id === 'morning-briefing' && (
                  <MorningBriefing
                    todayClasses={todayClasses}
                    todayCalendarEvents={todayCalendarEvents}
                    selfCareStatus={selfCareStatus}
                    classInfo={classInfo}
                    nextUpInfo={nextUpInfo}
                    reminders={data.selfCare?.reminders || []}
                    skippedDoseDate={data.selfCare?.skippedDoseDate}
                    onLogDose={handleLogDose}
                    canLogDose={canLogDose}
                    dayPlanProgress={todayPlan ? {
                      done: todayPlan.items.filter(i => i.completed).length,
                      total: todayPlan.items.length,
                    } : null}
                    isDisrupted={!!data.disruption?.active}
                    data={data}
                  />
                )}
                {id === 'todays-agenda' && (
                  <TodaysAgenda
                    classes={todayClasses}
                    studios={data.studios}
                    students={data.students || []}
                    weekNotes={data.weekNotes}
                    competitions={data.competitions}
                    competitionDances={data.competitionDances || []}
                    calendarEvents={todayCalendarEvents}
                    selfCare={data.selfCare}
                    medConfig={medConfig}
                    currentClassId={classInfo.class?.id}
                    allClasses={data.classes}
                    allCalendarEvents={data.calendarEvents || []}
                    currentMinute={currentMinute}
                  />
                )}
                {id === 'reminders' && (
                  <RemindersWidget reminders={data.selfCare?.reminders || []} onToggle={handleToggleReminder} />
                )}
                {id === 'week-momentum' && (
                  <WeekMomentumBar stats={stats} />
                )}
                {id === 'week-stats' && (
                  <WeekStats stats={stats} />
                )}
                {id === 'streak' && (
                  <StreakCard selfCare={data.selfCare} learningData={data.learningData} notesThisWeek={stats.classesThisWeek.completed} totalClassesThisWeek={stats.classesThisWeek.total} />
                )}
                {id === 'weekly-insight' && (
                  <WeeklyInsight stats={stats} classes={data.classes} competitions={data.competitions} weekNotes={data.weekNotes} />
                )}
                {id === 'launch-plan' && (
                  <LaunchPlanWidget launchPlan={data.launchPlan} />
                )}
                {id === 'scratchpad' && (
                  <ScratchpadWidget value={data.selfCare?.scratchpad || ''} onChange={handleScratchpadChange} />
                )}
              </SortableWidget>
            ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
