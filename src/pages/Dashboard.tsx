import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
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
import { LaunchPlanWidget } from '../components/Dashboard/LaunchPlanWidget';
import { EventCountdown } from '../components/Dashboard/EventCountdown';
import { StreakCard } from '../components/Dashboard/StreakCard';
import { WeeklyInsight } from '../components/Dashboard/WeeklyInsight';
import { WeekMomentumBar } from '../components/Dashboard/WeekMomentumBar';
import { SortableWidget } from '../components/Dashboard/SortableWidget';
import { CalendarEvent, DEFAULT_MED_CONFIG, DEFAULT_AI_CONFIG } from '../types';
import type { AICheckIn, DayPlan, DayPlanItem, Reminder, WeekNotes } from '../types';
import { AICheckInWidget } from '../components/Dashboard/AICheckInWidget';
import { DayPlanWidget } from '../components/Dashboard/DayPlanWidget';
import { useCheckInStatus } from '../hooks/useCheckInStatus';
import { buildAIContext } from '../services/aiContext';
import type { AIContextPayload } from '../services/aiContext';
import { callAICheckIn, callGenerateDayPlan } from '../services/ai';
import type { AIAction } from '../services/ai';

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
  'todays-agenda',
  'reminders',
  'week-momentum',
  'week-stats',
  'streak',
  'weekly-insight',
  'launch-plan',
] as const;

const WIDGET_LABELS: Record<string, string> = {
  'morning-briefing': 'Quick Stats',
  'todays-agenda': "Today's Schedule",
  'reminders': 'Tasks',
  'week-momentum': 'Week Momentum',
  'week-stats': 'Week Stats',
  'streak': 'Streak',
  'weekly-insight': 'Weekly Insight',
  'launch-plan': 'Launch Plan',
};

export function Dashboard() {
  const { data, updateSelfCare, saveAICheckIn, saveDayPlan, saveWeekNotes, refreshData } = useAppData();
  const stats = useTeachingStats(data);
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const selfCareStatus = useSelfCareStatus(data.selfCare, medConfig);

  // Minute-level clock — drives timers, check-in status, etc.
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // AI check-in
  const aiConfig = data.settings?.aiConfig || DEFAULT_AI_CONFIG;
  const checkInStatus = useCheckInStatus(data.aiCheckIns, aiConfig, currentMinute);
  // Keep widget mounted after submit/error until it self-dismisses
  const [checkInActive, setCheckInActive] = useState(false);
  const [frozenCheckInType, setFrozenCheckInType] = useState<'morning' | 'afternoon' | null>(null);
  const [frozenGreeting, setFrozenGreeting] = useState('');
  useEffect(() => {
    if (checkInStatus.isDue && checkInStatus.type && !checkInActive) {
      setCheckInActive(true);
      setFrozenCheckInType(checkInStatus.type);
      setFrozenGreeting(checkInStatus.greeting);
    }
  }, [checkInStatus.isDue, checkInStatus.type, checkInActive]);

  const [isReplanning, setIsReplanning] = useState(false);
  // Ref for data so generateDayPlan doesn't re-create on every data change
  const dataRef = useRef(data);
  dataRef.current = data;
  // Guard against concurrent calls (button double-tap, check-in + re-plan race)
  const planInFlightRef = useRef(false);

  const generateDayPlan = useCallback(async (checkInMood?: string, checkInMessage?: string) => {
    if (planInFlightRef.current) return;
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

  // Execute structured AI actions against app state
  const executeAIActions = useCallback((actions: AIAction[]) => {
    if (!actions || actions.length === 0) return;
    const sc = dataRef.current.selfCare || {};
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let selfCareUpdates: Record<string, unknown> = {};
    let needsSelfCareUpdate = false;
    let planUpdated = false;
    let currentPlan = dataRef.current.dayPlan?.date === todayKey ? { ...dataRef.current.dayPlan } : null;

    for (const action of actions) {
      switch (action.type) {
        case 'toggleWellness': {
          if (!action.id) break;
          const currentStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
          selfCareUpdates = {
            ...selfCareUpdates,
            unifiedTaskStates: { ...currentStates, ...((selfCareUpdates.unifiedTaskStates as Record<string, boolean>) || {}), [action.id]: action.done ?? true },
            unifiedTaskDate: todayKey,
          };
          needsSelfCareUpdate = true;
          break;
        }
        case 'addReminder': {
          if (!action.title) break;
          const baseReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
          const defaultListId = (sc.reminderLists || []).find((l: { name: string }) => l.name === 'Reminders')?.id || 'inbox';
          const newReminder: Reminder = {
            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: action.title,
            listId: defaultListId,
            completed: false,
            priority: 'none',
            flagged: action.flagged ?? false,
            dueDate: action.dueDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          selfCareUpdates.reminders = [...baseReminders, newReminder];
          needsSelfCareUpdate = true;
          break;
        }
        case 'completeReminder': {
          if (!action.title) break;
          const reminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
          const idx = reminders.findIndex((r: Reminder) => !r.completed && r.title.toLowerCase() === action.title!.toLowerCase());
          if (idx >= 0) {
            reminders[idx] = { ...reminders[idx], completed: true, completedAt: new Date().toISOString() };
            selfCareUpdates.reminders = reminders;
            needsSelfCareUpdate = true;
          }
          break;
        }
        case 'flagReminder': {
          if (!action.title) break;
          const flagReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
          const flagIdx = flagReminders.findIndex((r: Reminder) => r.title.toLowerCase() === action.title!.toLowerCase());
          if (flagIdx >= 0) {
            flagReminders[flagIdx] = { ...flagReminders[flagIdx], flagged: action.flagged ?? true, updatedAt: new Date().toISOString() };
            selfCareUpdates.reminders = flagReminders;
            needsSelfCareUpdate = true;
          }
          break;
        }
        case 'rescheduleReminder': {
          if (!action.title || !action.dueDate) break;
          const reschedReminders = (selfCareUpdates.reminders as Reminder[]) || [...(sc.reminders || [])];
          const reschedIdx = reschedReminders.findIndex((r: Reminder) => r.title.toLowerCase() === action.title!.toLowerCase());
          if (reschedIdx >= 0) {
            reschedReminders[reschedIdx] = { ...reschedReminders[reschedIdx], dueDate: action.dueDate, updatedAt: new Date().toISOString() };
            selfCareUpdates.reminders = reschedReminders;
            needsSelfCareUpdate = true;
          }
          break;
        }
        case 'logDose': {
          const now = Date.now();
          if (!sc.dose1Date || sc.dose1Date !== todayKey) {
            selfCareUpdates = { ...selfCareUpdates, dose1Time: now, dose1Date: todayKey, selfCareModified: new Date().toISOString() };
          } else if (medConfig.medType === 'IR' && (!sc.dose2Date || sc.dose2Date !== todayKey)) {
            selfCareUpdates = { ...selfCareUpdates, dose2Time: now, dose2Date: todayKey, selfCareModified: new Date().toISOString() };
          } else if (medConfig.medType === 'IR' && medConfig.maxDoses === 3 && (!sc.dose3Date || sc.dose3Date !== todayKey)) {
            selfCareUpdates = { ...selfCareUpdates, dose3Time: now, dose3Date: todayKey, selfCareModified: new Date().toISOString() };
          }
          needsSelfCareUpdate = true;
          break;
        }
        case 'skipDose': {
          selfCareUpdates = { ...selfCareUpdates, skippedDoseDate: todayKey, selfCareModified: new Date().toISOString() };
          needsSelfCareUpdate = true;
          break;
        }
        case 'updatePlanSummary': {
          if (!action.summary || !currentPlan) break;
          currentPlan = { ...currentPlan, summary: action.summary };
          planUpdated = true;
          break;
        }
        case 'addPlanItem': {
          if (!action.title || !currentPlan) break;
          const newItem: DayPlanItem = {
            id: `plan_ai_${Date.now()}`,
            title: action.title,
            category: (action.category && VALID_CATEGORIES.has(action.category) ? action.category : 'task') as DayPlanItem['category'],
            completed: false,
            priority: (action.priority && VALID_PRIORITIES.has(action.priority) ? action.priority : 'medium') as DayPlanItem['priority'],
            time: action.time,
            aiNote: action.aiNote,
            sourceId: action.sourceId,
          };
          currentPlan = { ...currentPlan, items: [...currentPlan.items, newItem] };
          planUpdated = true;
          break;
        }
        case 'removePlanItem': {
          if (!action.title || !currentPlan) break;
          const needle = action.title.toLowerCase();
          // Prefer exact match, fall back to substring match for a single item
          const exactIdx = currentPlan.items.findIndex(i => i.title.toLowerCase() === needle);
          if (exactIdx >= 0) {
            currentPlan = { ...currentPlan, items: currentPlan.items.filter((_, idx) => idx !== exactIdx) };
          } else {
            const fuzzyIdx = currentPlan.items.findIndex(i => i.title.toLowerCase().includes(needle));
            if (fuzzyIdx >= 0) {
              currentPlan = { ...currentPlan, items: currentPlan.items.filter((_, idx) => idx !== fuzzyIdx) };
            }
          }
          planUpdated = true;
          break;
        }
        case 'reschedulePlanItem': {
          if (!action.title || !action.time || !currentPlan) break;
          const rNeedle = action.title.toLowerCase();
          const rIdx = currentPlan.items.findIndex(i => i.title.toLowerCase() === rNeedle)
            || currentPlan.items.findIndex(i => i.title.toLowerCase().includes(rNeedle));
          if (rIdx >= 0) {
            const updated = [...currentPlan.items];
            updated[rIdx] = { ...updated[rIdx], time: action.time };
            currentPlan = { ...currentPlan, items: updated };
            planUpdated = true;
          }
          break;
        }
        case 'batchToggleWellness': {
          if (!action.ids || action.ids.length === 0) break;
          const batchStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
          const merged = { ...batchStates, ...((selfCareUpdates.unifiedTaskStates as Record<string, boolean>) || {}) };
          for (const wId of action.ids) {
            merged[wId] = action.done ?? true;
          }
          selfCareUpdates = {
            ...selfCareUpdates,
            unifiedTaskStates: merged,
            unifiedTaskDate: todayKey,
          };
          needsSelfCareUpdate = true;
          break;
        }
        case 'suggestOptionalDose3': {
          selfCareUpdates = { ...selfCareUpdates, suggestedDose3Date: todayKey };
          needsSelfCareUpdate = true;
          break;
        }
        case 'setDayMode': {
          if (!action.dayMode) break;
          selfCareUpdates = { ...selfCareUpdates, dayMode: action.dayMode, dayModeDate: todayKey };
          needsSelfCareUpdate = true;
          break;
        }
        case 'addWeekReflection': {
          const weekOf = formatWeekOf(getWeekStart());
          const existing = data.weekNotes.find(w => w.weekOf === weekOf);
          const weekNote: WeekNotes = existing || { id: `week_${weekOf}`, weekOf, classNotes: {} };
          weekNote.reflection = {
            date: todayKey,
            wentWell: action.wentWell,
            challenges: action.challenges,
            nextWeekFocus: action.nextWeekFocus,
            aiSummary: action.aiSummary,
          };
          saveWeekNotes(weekNote);
          break;
        }
        case 'reprioritizePlan': {
          if (!action.order || !currentPlan) break;
          const orderMap = new Map(action.order.map((id, idx) => [id, idx]));
          currentPlan = {
            ...currentPlan,
            items: [...currentPlan.items].sort((a, b) => {
              const aIdx = orderMap.get(a.id) ?? 999;
              const bIdx = orderMap.get(b.id) ?? 999;
              return aIdx - bIdx;
            }),
          };
          planUpdated = true;
          break;
        }
      }
    }

    if (needsSelfCareUpdate) {
      updateSelfCare(selfCareUpdates);
    }
    if (planUpdated && currentPlan) {
      saveDayPlan(currentPlan as DayPlan);
    }
  }, [updateSelfCare, saveDayPlan, medConfig]);

  const handleCheckInSubmit = useCallback(async (message: string) => {
    const type = frozenCheckInType;
    if (!type) return { response: '', adjustments: [] };
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const payload = buildAIContext(dataRef.current, type, message);
      const result = await callAICheckIn(payload);
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
      // Save a record so the check-in doesn't keep re-appearing on error
      saveAICheckIn({
        id: `ci-err-${Date.now()}`,
        date: todayStr,
        type,
        userMessage: message,
        aiResponse: '',
        timestamp: new Date().toISOString(),
      });
      // Return fallback response instead of throwing — throwing causes a re-render
      // race where the widget unmounts before its catch block can display the error
      return { response: 'Something went wrong. Check in later.', adjustments: [] };
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
  const classInfo = useCurrentClass(data.classes);
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
  const enrolledStudents = classInfo.class ? (data.students || []).filter(s => s.classIds.includes(classInfo.class!.id)) : [];

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

  const { greeting, greetingSub } = useMemo(() => {
    const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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
  }, [hour, todayClasses, todayCalendarEvents, classInfo, selfCareStatus, currentMinute, recentlyEndedClass, data.selfCare?.skippedDoseDate, todayStr2, todayMood]);

  return (
    <div className="pb-24 bg-blush-50 dark:bg-blush-900 min-h-screen">
      {/* ── Greeting — clean edge-to-edge, no colored bar ── */}
      <div className="px-4 pt-8 pb-2">
        <div className="page-w">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blush-500 dark:text-blush-400 tracking-wide">{greeting}</p>
              <h1 className="text-3xl font-display text-blush-900 dark:text-blush-100 mt-0.5 leading-tight">
                {dayName}, <span className="text-forest-600 dark:text-forest-400">{dateStr}</span>
              </h1>
              {greetingSub && (
                <p className="text-sm text-blush-400 dark:text-blush-500 mt-1">{greetingSub}</p>
              )}
            </div>
            <button
              onClick={() => setIsEditingLayout(!isEditingLayout)}
              className={`mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isEditingLayout
                  ? 'bg-forest-600 text-white'
                  : 'bg-blush-100 dark:bg-blush-700 text-blush-500 dark:text-blush-400'
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
              daysUntilComp <= 3 ? 'bg-red-500' : daysUntilComp <= 7 ? 'bg-orange-500' : 'bg-forest-600'
            } text-white shadow-sm`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"><Trophy size={20} /></div>
                  <div>
                    <div className="font-semibold">{nextComp.name}</div>
                    <div className="text-sm text-white/80">{format(parseISO(nextComp.date), 'EEEE, MMM d')}</div>
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

      <div className="page-w px-4 pt-4 space-y-4">
        <EventCountdown competitions={data.competitions} />

        {/* ── Hero Card — only shows during active class/event or recently ended ── */}
        {classInfo.class && classInfo.status === 'during' ? (
          <div className="bg-white dark:bg-blush-800 rounded-2xl overflow-hidden ring-2 ring-forest-500/30 dark:ring-forest-400/20 shadow-lg shadow-forest-500/10">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-forest-600 text-white px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />
                  Teaching Now
                </span>
                <div className="text-right">
                  <span className="text-3xl font-display text-forest-600 dark:text-forest-400 leading-none">
                    {classInfo.timeRemaining}
                  </span>
                  <span className="text-[11px] text-blush-400 dark:text-blush-500 ml-1">min left</span>
                </div>
              </div>

              <h2 className="text-2xl font-display text-blush-900 dark:text-white leading-tight line-clamp-2 mb-3">{classInfo.class.name}</h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-blush-500 dark:text-blush-400 mb-4">
                <span className="flex items-center gap-1 text-[--color-honey] dark:text-[--color-honey-light] font-medium">
                  <Clock size={14} />{formatTimeDisplay(classInfo.class.startTime)} - {formatTimeDisplay(classInfo.class.endTime)}
                </span>
                {currentStudio && <span className="flex items-center gap-1"><MapPin size={14} />{currentStudio.shortName}</span>}
                <span className="flex items-center gap-1"><Users size={14} />{enrolledStudents.length}</span>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm mb-3 ${
                currentClassHasPlan
                  ? 'bg-[#f0f5f1] dark:bg-blush-700 text-[--color-sage-dark] dark:text-[--color-sage-light]'
                  : 'bg-orange-50 dark:bg-blush-700 text-orange-700 dark:text-orange-400'
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
                  <div className="bg-blush-50 dark:bg-blush-700/40 rounded-xl px-3 py-2.5 mb-3">
                    <div className="text-[11px] font-medium text-blush-400 dark:text-blush-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                      <AlertCircle size={11} /> From Last Week
                    </div>
                    <ul className="text-sm text-blush-700 dark:text-blush-300 space-y-1">
                      {sorted.map(note => {
                        const action = isActionItem(note.text) || note.category === 'reminder' || note.category === 'next-week';
                        return (
                          <li key={note.id} className={`flex items-start gap-1.5 ${action ? 'font-medium text-forest-700 dark:text-forest-400' : ''}`}>
                            <span className={`mt-0.5 ${action ? 'text-forest-500' : 'text-blush-300 dark:text-blush-600'}`}>{action ? '\u2192' : '\u2022'}</span>
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
                className="flex items-center justify-center gap-2 w-full bg-forest-600 hover:bg-forest-700 active:bg-forest-800 text-white py-3.5 rounded-xl font-semibold transition-colors"
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
                  <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blush-50 dark:bg-blush-700/30 rounded-xl">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blush-400 dark:text-blush-500">Then</span>
                    <span className="text-sm font-medium text-blush-700 dark:text-blush-300 truncate">{upNextName}</span>
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
              <div className="bg-white dark:bg-blush-800 rounded-2xl overflow-hidden ring-2 ring-amber-400/30 dark:ring-amber-500/20 shadow-lg shadow-amber-400/10">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-amber-500 text-white px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />Live
                    </span>
                    <div><span className="text-3xl font-display text-amber-600 dark:text-amber-400 leading-none">{remaining}</span><span className="text-[11px] text-blush-400 ml-1">min left</span></div>
                  </div>
                  <h2 className="text-2xl font-display text-blush-900 dark:text-white leading-tight line-clamp-2 mb-3">{currentCalendarEvent.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-blush-500 dark:text-blush-400 mb-4">
                    <span className="flex items-center gap-1 text-[--color-honey] dark:text-[--color-honey-light] font-medium"><Clock size={14} />{formatTimeDisplay(currentCalendarEvent.startTime)}{currentCalendarEvent.endTime && currentCalendarEvent.endTime !== '00:00' && <> - {formatTimeDisplay(currentCalendarEvent.endTime)}</>}</span>
                    {locationLine && <span className="flex items-center gap-1"><MapPin size={14} />{locationLine}</span>}
                  </div>
                  <Link to={`/event/${currentCalendarEvent.id}/notes`} className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white py-3.5 rounded-xl font-semibold transition-colors"><Play size={18} />Continue Notes</Link>
                </div>
              </div>
            );
          })()
        ) : recentlyEndedClass ? (
          <div className="bg-white dark:bg-blush-800 rounded-2xl overflow-hidden border border-blush-200 dark:border-blush-700">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-forest-50 dark:bg-forest-900/30 rounded-xl flex items-center justify-center">
                  <MessageSquare size={18} className="text-forest-600 dark:text-forest-400" />
                </div>
                <div>
                  <h2 className="text-lg font-display text-blush-900 dark:text-white">{recentlyEndedClass.name}</h2>
                  <p className="text-sm text-blush-500 dark:text-blush-400">Just ended — anything to capture?</p>
                </div>
              </div>
              <Link to={`/class/${recentlyEndedClass.id}/notes`} className="flex items-center justify-center gap-2 w-full bg-forest-600 hover:bg-forest-700 active:bg-forest-800 text-white py-3.5 rounded-xl font-semibold transition-colors"><Play size={18} />Capture Notes</Link>
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
            <div className="flex items-center gap-3 px-4 py-3 bg-forest-600 text-white rounded-2xl">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-forest-200 font-bold">Next up</div>
                <div className="text-sm font-semibold truncate">{next.title}</div>
                {next.time && <div className="text-xs text-forest-200">{formatTimeDisplay(next.time)}</div>}
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
            {widgetOrder.map(id => (
              <SortableWidget key={id} id={id} isEditing={isEditingLayout} label={WIDGET_LABELS[id] || id}>
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
                  <RemindersWidget reminders={data.selfCare?.reminders || []} />
                )}
                {id === 'week-momentum' && (
                  <WeekMomentumBar stats={stats} />
                )}
                {id === 'week-stats' && (
                  <WeekStats stats={stats} />
                )}
                {id === 'streak' && (
                  <StreakCard selfCare={data.selfCare} notesThisWeek={stats.classesThisWeek.completed} totalClassesThisWeek={stats.classesThisWeek.total} />
                )}
                {id === 'weekly-insight' && (
                  <WeeklyInsight stats={stats} classes={data.classes} />
                )}
                {id === 'launch-plan' && (
                  <LaunchPlanWidget launchPlan={data.launchPlan} />
                )}
              </SortableWidget>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
