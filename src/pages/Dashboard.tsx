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
  Check,
  Loader2,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { useSelfCareStatus } from '../hooks/useSelfCareStatus';
import { useDashboardContext, type DashboardContextType } from '../hooks/useDashboardContext';
import { getCurrentDayOfWeek, formatTimeDisplay, formatWeekOf, getWeekStart, timeToMinutes, safeTime } from '../utils/time';
import { getClassesByDay } from '../data/classes';
import { TodaysAgenda } from '../components/Dashboard/TodaysAgenda';
import { MorningBriefing } from '../components/Dashboard/MorningBriefing';
import { RemindersWidget } from '../components/Dashboard/RemindersWidget';
import { ScratchpadWidget } from '../components/Dashboard/ScratchpadWidget';
import { NudgeCards } from '../components/Dashboard/NudgeCards';
import { PrepCard } from '../components/Dashboard/PrepCard';
import { PostClassCapture } from '../components/Dashboard/PostClassCapture';
import { QuickNoteCapture } from '../components/Dashboard/QuickNoteCapture';
import { useNudges } from '../hooks/useNudges';
import { useClassTiming } from '../hooks/useClassTiming';
import { CalendarEvent, DEFAULT_MED_CONFIG, DEFAULT_AI_CONFIG } from '../types';
import type { AICheckIn, DayPlan, DayPlanItem, RecurringSchedule } from '../types';
import { AICheckInWidget } from '../components/Dashboard/AICheckInWidget';
import { DayPlanWidget } from '../components/Dashboard/DayPlanWidget';
import { buildAIContext } from '../services/aiContext';
import type { AIContextPayload } from '../services/aiContext';
import { callGenerateDayPlan, callAIChat } from '../services/ai';
import type { AIAction } from '../services/ai';
import { buildFullAIContext } from '../services/aiContext';
import { executeAIActions as executeSharedAIActions } from '../services/aiActions';
import type { ActionCallbacks } from '../services/aiActions';
import { applyMoodLayer } from '../styles/moodLayer';
import type { MoodSignal, ActivityState } from '../styles/moodLayer';
import { classifyCalendarEvent, shouldPreferCalendarEventOverClass } from '../utils/calendarEventType';
import { dateToDayOfWeek } from '../utils/classException';

// ── Constants ──

const VALID_CATEGORIES = new Set(['task', 'wellness', 'class', 'launch', 'break', 'med']);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

const CONTEXT_LABELS: Record<DashboardContextType, string> = {
  'morning': 'Morning',
  'pre-class': 'Prep',
  'during-class': 'In Class',
  'post-class': 'Capture',
  'evening': 'Wind Down',
  'default': 'Today',
};

// ── Helpers ──

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

// ── Component ──

export function Dashboard() {
  const { data, updateSelfCare, saveAICheckIn, saveDayPlan, saveWeekNotes, updateLaunchPlan, updateCompetitionDance, getCurrentWeekNotes, updateTherapist, updateNudgeState } = useAppData();
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const selfCareStatus = useSelfCareStatus(data.selfCare, medConfig);

  // Nudges (synced across devices via Firestore)
  const { nudges, dismissNudge, snoozeNudge } = useNudges(data, updateNudgeState);

  // Minute-level clock — drives timers, check-in status, etc.
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

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

  // ── Context-aware dashboard mode ──
  const ctx = useDashboardContext(data, currentMinute);

  // Class timing for prep/capture
  const classTiming = useClassTiming(data, currentMinute);

  // AI check-in
  const aiConfig = { ...DEFAULT_AI_CONFIG, ...(data.settings?.aiConfig || {}) };
  // Keep widget mounted after submit/error until it self-dismisses
  const [checkInActive, setCheckInActive] = useState(false);
  const [frozenCheckInType, setFrozenCheckInType] = useState<'morning' | 'afternoon' | null>(null);
  const [frozenGreeting, setFrozenGreeting] = useState('');
  useEffect(() => {
    if (ctx.checkIn.isDue && ctx.checkIn.type && !checkInActive) {
      setCheckInActive(true);
      setFrozenCheckInType(ctx.checkIn.type);
      setFrozenGreeting(ctx.checkIn.greeting);
    }
  }, [ctx.checkIn.isDue, ctx.checkIn.type, ctx.checkIn.greeting, checkInActive]);

  const [isReplanning, setIsReplanning] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const planInFlightRef = useRef(false);

  // ── Day Plan Generation ──
  const generateDayPlan = useCallback(async (checkInMood?: string, checkInMessage?: string) => {
    if (planInFlightRef.current) {
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

      if (completedItems.length > 0) {
        payload.completedItems = completedItems.map(i => ({
          id: i.id, title: i.title, category: i.category, sourceId: i.sourceId,
        }));
      }

      const result = await callGenerateDayPlan(payload);
      const newItems = validateDayPlanItems(result.items);

      if (newItems.length === 0 && completedItems.length === 0) {
        console.warn('Day plan returned 0 items, skipping save');
        return;
      }

      const completedSourceIds = new Set(completedItems.filter(i => i.sourceId).map(i => i.sourceId));
      const completedTitles = new Set(completedItems.map(i => i.title.toLowerCase()));

      const filteredNewItems = newItems.filter(item => {
        if (item.sourceId && completedSourceIds.has(item.sourceId)) return false;
        if (item.category === 'class') return true;
        if (completedTitles.has(item.title.toLowerCase())) return false;
        return true;
      });

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

  // ── Action Callbacks ──
  const actionCallbacks: ActionCallbacks = useMemo(() => ({
    getData: () => dataRef.current,
    updateSelfCare,
    saveDayPlan,
    saveWeekNotes,
    getCurrentWeekNotes,
    updateLaunchPlan,
    updateCompetitionDance,
    getMedConfig: () => medConfig,
    updateTherapist,
  }), [updateSelfCare, saveDayPlan, saveWeekNotes, getCurrentWeekNotes, updateLaunchPlan, updateCompetitionDance, medConfig, updateTherapist]);

  const executeAIActions = useCallback((actions: AIAction[]) => {
    // Safety: confirm before executing cancellation actions
    const cancelActions = actions.filter(a =>
      a.type === 'markClassException' || a.type === 'markClassExceptionRange'
    );
    const safeActions = actions.filter(a =>
      a.type !== 'markClassException' && a.type !== 'markClassExceptionRange'
    );

    if (safeActions.length) {
      executeSharedAIActions(safeActions, actionCallbacks);
    }

    if (cancelActions.length) {
      const classNames = cancelActions.flatMap(a => {
        const action = a as unknown as { scope?: string; classIds?: string[] };
        if (action.scope === 'all') return ['ALL classes today'];
        const ids = action.classIds;
        if (!ids?.length) return [];
        return ids.map(id => {
          const cls = dataRef.current.classes.find(c => c.id === id);
          return cls ? `${cls.name} @ ${cls.startTime}` : id;
        });
      });
      if (classNames.length && window.confirm(`Cancel ${classNames.join(', ')}?`)) {
        executeSharedAIActions(cancelActions, actionCallbacks);
      }
    }
  }, [actionCallbacks]);

  // ── Check-In Handlers ──
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

      if (result.actions && result.actions.length > 0) {
        executeAIActions(result.actions);
      }

      if (aiConfig.autoPlanEnabled) {
        generateDayPlan(result.mood, message);
      }
      return result;
    } catch (e) {
      saveAICheckIn({
        id: `ci-err-${Date.now()}`,
        date: todayStr,
        type,
        userMessage: message,
        aiResponse: '',
        timestamp: new Date().toISOString(),
      });
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

  // ── Day Plan Toggle ──
  const handleTogglePlanItem = useCallback((itemId: string) => {
    if (!data.dayPlan) return;
    const item = data.dayPlan.items.find(i => i.id === itemId);
    if (!item) return;
    const newCompleted = !item.completed;

    if (item.category === 'wellness' && item.sourceId) {
      const sc = data.selfCare || {};
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const currentStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
      updateSelfCare({
        unifiedTaskStates: { ...currentStates, [item.sourceId]: newCompleted },
        unifiedTaskDate: todayKey,
      });
    }

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
  }, [data.dayPlan, saveDayPlan, data.selfCare, updateSelfCare, data.launchPlan, updateLaunchPlan]);

  // ── Reminder Toggle ──
  const handleToggleReminder = useCallback((id: string) => {
    const sc = data.selfCare || {};
    const reminders = sc.reminders || [];
    const target = reminders.find(r => r.id === id);
    if (!target) return;

    const nowCompleted = !target.completed;
    let updated = reminders.map(r =>
      r.id === id ? { ...r, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() } : r
    );

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
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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

  // ── Scratchpad ──
  const handleScratchpadChange = useCallback((text: string) => {
    updateSelfCare({ scratchpad: text });
  }, [updateSelfCare]);

  // ── Dose Logging ──
  const canLogDose = useMemo(() => {
    const sc = data.selfCare;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (sc?.skippedDoseDate === today) return false;
    if (!sc?.dose1Date || sc.dose1Date !== today) return true;
    if ((!sc?.dose2Date || sc.dose2Date !== today) && medConfig.medType === 'IR') return true;
    if (medConfig.maxDoses === 3 && (!sc?.dose3Date || sc.dose3Date !== today) && medConfig.medType === 'IR') return true;
    return false;
  }, [data.selfCare, medConfig]);

  const handleLogDose = useCallback(() => {
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
  }, [data.selfCare, medConfig, updateSelfCare]);

  // ── Derived Data ──
  const currentTime = new Date();
  currentTime.setSeconds(0, 0);

  const currentDay = getCurrentDayOfWeek();
  const rawTodayClasses = useMemo(() => getClassesByDay(data.classes, currentDay), [data.classes, currentDay]);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hiddenEventIds = useMemo(() => new Set(data.settings?.hiddenCalendarEventIds || []), [data.settings?.hiddenCalendarEventIds]);
  const todayEventsRaw = useMemo(() => (
    (data.calendarEvents || [])
      .filter((e: CalendarEvent) => e.date === todayStr && e.startTime && e.startTime !== '00:00' && !hiddenEventIds.has(e.id))
      .sort((a: CalendarEvent, b: CalendarEvent) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  ), [data.calendarEvents, todayStr, hiddenEventIds]);
  const todayClasses = useMemo(() => rawTodayClasses.filter(cls =>
    !shouldPreferCalendarEventOverClass(cls, todayEventsRaw, {
      classes: data.classes,
      allEvents: data.calendarEvents || [],
      competitionDances: data.competitionDances || [],
      students: data.students || [],
      studios: data.studios,
    })
  ), [rawTodayClasses, todayEventsRaw, data.classes, data.calendarEvents, data.competitionDances, data.studios]);

  const { activeTodayClasses, cancelledTodayCount, subbedTodayCount } = useMemo(() => {
    const weekOf = formatWeekOf(getWeekStart());
    const wn = data.weekNotes.find(w => w.weekOf === weekOf);
    let cancelled = 0;
    let subbed = 0;
    const countedIds = new Set<string>();

    const active = todayClasses.filter(c => {
      const exc = wn?.classNotes[c.id]?.exception;
      if (exc?.type === 'cancelled') { cancelled++; countedIds.add(c.id); }
      if (exc?.type === 'subbed') { subbed++; countedIds.add(c.id); }
      return !exc || exc.type === 'time-change';
    });

    // Count exceptions on calendar events — direct ID or cross-referenced from internal class
    for (const e of todayEventsRaw) {
      if (countedIds.has(e.id)) continue;
      let exc = wn?.classNotes[e.id]?.exception;
      // Cross-reference: check matching internal class by name+time
      if (!exc && wn) {
        for (const cls of data.classes) {
          if (countedIds.has(cls.id)) continue;
          const sameName = cls.name.toLowerCase() === e.title.toLowerCase();
          const sameTime = Math.abs(timeToMinutes(cls.startTime) - timeToMinutes(e.startTime)) <= 10;
          const sameDay = !e.date || cls.day === dateToDayOfWeek(e.date);
          if ((sameName && sameTime && sameDay) && wn.classNotes[cls.id]?.exception) {
            exc = wn.classNotes[cls.id].exception;
            countedIds.add(cls.id);
            break;
          }
        }
      }
      // Also check orphaned IDs by studio hint + time
      if (!exc && wn) {
        const normTitle = e.title.toLowerCase();
        const eventMinutes = timeToMinutes(e.startTime);
        for (const [, cn] of Object.entries(wn.classNotes)) {
          if (!cn.exception || !cn.classId || countedIds.has(cn.classId)) continue;
          const idParts = cn.classId.toLowerCase().split('-');
          const studioHint = idParts.find(p => p.length > 2 && normTitle.includes(p));
          const timeHint = idParts.find(p => /^\d{4}$/.test(p));
          if (studioHint && timeHint) {
            const hintMinutes = parseInt(timeHint.slice(0, 2)) * 60 + parseInt(timeHint.slice(2));
            if (Math.abs(hintMinutes - eventMinutes) <= 10) {
              exc = cn.exception;
              countedIds.add(cn.classId);
              break;
            }
          }
        }
      }
      if (exc?.type === 'cancelled') cancelled++;
      if (exc?.type === 'subbed') subbed++;
    }

    return { activeTodayClasses: active, cancelledTodayCount: cancelled, subbedTodayCount: subbed };
  }, [todayClasses, todayEventsRaw, data.weekNotes, data.classes]);

  const todayCalendarEvents = useMemo(() => {
    return todayEventsRaw
      .filter((e: CalendarEvent) => {
        const et = timeToMinutes(e.startTime);
        const normTitle = e.title.toLowerCase();
        // Only dedup when BOTH name and time match an internal class
        return !todayClasses.some(c =>
          c.name.toLowerCase() === normTitle &&
          Math.abs(timeToMinutes(c.startTime) - et) <= 10
        );
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [todayEventsRaw, todayClasses]);

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

  const classInfo = ctx.currentClassInfo;

  const nextUpInfo = useMemo(() => {
    const totalItems = activeTodayClasses.length + todayCalendarEvents.length;
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
  }, [classInfo, currentCalendarEvent, nextCalendarEvent, currentMinute, activeTodayClasses.length, todayCalendarEvents.length]);

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
    const sorted = [...(data.weekNotes || [])].sort((a, b) => safeTime(b.weekOf) - safeTime(a.weekOf));
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
    for (const cls of activeTodayClasses) {
      const endMinutes = timeToMinutes(cls.endTime);
      const elapsed = currentMinute - endMinutes;
      if (elapsed >= 0 && elapsed <= 15) return cls;
    }
    return null;
  }, [activeTodayClasses, currentMinute, classInfo.status]);

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

  const todayPlan = useMemo(() => {
    const ts = format(new Date(), 'yyyy-MM-dd');
    return data.dayPlan?.date === ts ? data.dayPlan : null;
  }, [data.dayPlan]);

  // Auto-complete Day Plan med items when the corresponding dose is logged
  useEffect(() => {
    if (!todayPlan) return;
    const doseMap: Record<string, boolean> = {
      '1': selfCareStatus.dose1Active,
      '2': selfCareStatus.dose2Active,
      '3': selfCareStatus.dose3Active,
    };
    const toComplete = todayPlan.items.filter(
      i => i.category === 'med' && !i.completed &&
        Object.entries(doseMap).some(([num, active]) => active && /dose/i.test(i.title) && i.title.includes(num))
    );
    if (toComplete.length > 0) {
      saveDayPlan({
        ...todayPlan,
        items: todayPlan.items.map(i =>
          toComplete.some(tc => tc.id === i.id) ? { ...i, completed: true } : i
        ),
      });
    }
  }, [selfCareStatus.dose1Active, selfCareStatus.dose2Active, selfCareStatus.dose3Active, todayPlan, saveDayPlan]);

  const dayName = format(currentTime, 'EEEE');
  const dateStr = format(currentTime, 'MMMM d');
  const hour = currentTime.getHours();
  const todayStr2 = format(currentTime, 'yyyy-MM-dd');

  // Latest mood from today's AI check-in
  const todayMood = useMemo(() => {
    const checkIns = (data.aiCheckIns || []).filter(c => c.date === todayStr2 && c.mood);
    return checkIns.length > 0 ? checkIns[checkIns.length - 1].mood : undefined;
  }, [data.aiCheckIns, todayStr2]);

  // Activity state for mood layer
  const activityState: ActivityState = useMemo(() =>
    classInfo.status === 'during' ? 'teaching' :
    classTiming.upcomingClass ? 'prepping' :
    activeTodayClasses.length > 0 && activeTodayClasses.every(c => timeToMinutes(c.endTime) < currentMinute) ? 'done' :
    activeTodayClasses.length === 0 ? 'off' : 'idle',
  [classInfo.status, classTiming.upcomingClass, activeTodayClasses, currentMinute]);

  // ── Mood-responsive theming layer ──
  useEffect(() => {
    applyMoodLayer(todayMood as MoodSignal, hour, activityState);
  }, [todayMood, hour, activityState]);

  // ── Greeting ──
  const { greeting, greetingSub } = useMemo(() => {
    const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const allClassesDone = activeTodayClasses.length > 0 && !classInfo.class && !recentlyEndedClass &&
      activeTodayClasses.every(c => timeToMinutes(c.endTime) < currentMinute);
    const isLateNight = hour >= 22;
    const noMedsYet = !selfCareStatus.dose1Active && !selfCareStatus.dose2Active && !selfCareStatus.dose3Active;
    const skippedToday = data.selfCare?.skippedDoseDate === todayStr2;

    const moodSubs: Record<string, string> = {
      tired: 'Take it easy today',
      stressed: 'One thing at a time',
      low: 'Be gentle with yourself',
      anxious: 'You\'ve got this',
      excited: 'Full day ahead',
    };

    if (isLateNight) return { greeting: 'Getting late', greetingSub: 'Time to wind down' };
    if (noMedsYet && !skippedToday && hour >= 7 && hour < 12) return { greeting: base, greetingSub: 'Meds not taken yet' };
    if (allClassesDone) return { greeting: base, greetingSub: `All ${activeTodayClasses.length} class${activeTodayClasses.length > 1 ? 'es' : ''} done` };
    if (classInfo.status === 'during' && classInfo.class) return { greeting: base, greetingSub: `In class: ${classInfo.class.name}` };
    if (activeTodayClasses.length > 0) {
      const remaining = activeTodayClasses.filter(c => timeToMinutes(c.endTime) >= currentMinute).length;
      if (remaining > 0) return { greeting: base, greetingSub: `${remaining} class${remaining > 1 ? 'es' : ''} left today` };
    }
    if ((cancelledTodayCount > 0 || subbedTodayCount > 0) && activeTodayClasses.length === 0) {
      const parts: string[] = [];
      if (cancelledTodayCount > 0) parts.push(`${cancelledTodayCount} cancelled`);
      if (subbedTodayCount > 0) parts.push(`${subbedTodayCount} subbed`);
      return { greeting: base, greetingSub: `No classes for you today — ${parts.join(', ')}` };
    }
    if (todayMood && moodSubs[todayMood]) return { greeting: base, greetingSub: moodSubs[todayMood] };
    if (activeTodayClasses.length === 0 && todayCalendarEvents.length === 0) return { greeting: base, greetingSub: 'No classes today' };
    return { greeting: base, greetingSub: undefined as string | undefined };
  }, [hour, activeTodayClasses, todayCalendarEvents, classInfo, selfCareStatus, currentMinute, recentlyEndedClass, data.selfCare?.skippedDoseDate, todayStr2, todayMood, cancelledTodayCount, subbedTodayCount]);

  // ── Render ──
  return (
    <div className="pb-20 bg-[var(--surface-primary)] min-h-screen">
      {/* ── Greeting ── */}
      <div className="page-container pt-8 pb-2">
        <div className="flex items-start justify-between gap-4 xl:items-end">
          <div>
            <p className="type-caption uppercase tracking-wider text-[var(--text-secondary)]">
              {greeting.startsWith('Good') ? <>{greeting}, <span className="text-[var(--accent-primary)] font-medium">Dixon</span></> : greeting}
            </p>
            <h1 className="type-display text-[var(--text-primary)] mt-0.5 leading-tight">
              {dayName}, <span className="text-[var(--accent-primary)]">{dateStr}</span>
            </h1>
            {greetingSub && (
              <p className="text-sm text-[var(--text-tertiary)] mt-1">{greetingSub}</p>
            )}
            {data.dailyBriefing?.loginRoast && !(
              /no class/i.test(data.dailyBriefing.loginRoast) &&
              (activeTodayClasses.length > 0 || todayCalendarEvents.length > 0)
            ) && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2 italic opacity-70 max-w-[300px]">
                {data.dailyBriefing.loginRoast}
              </p>
            )}
          </div>
          <span className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)] shrink-0 mr-1">
            {CONTEXT_LABELS[ctx.context]}
          </span>
        </div>
      </div>

      {/* ── Competition Banner ── */}
      {nextComp && daysUntilComp !== null && daysUntilComp <= 14 && (
        <div className="page-container pt-2">
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

      <div className="page-container pt-4 space-y-4 xl:space-y-5">
        {/* ── Hero Card — Teaching Now / Calendar Event / Recently Ended ── */}
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
                <span className="flex items-center gap-1 text-[var(--color-honey)] dark:text-[var(--color-honey-light)] font-medium">
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--status-warning)]/10 text-[var(--status-warning)] mb-3">
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
                    <span className="text-sm font-semibold text-[var(--color-honey)] dark:text-[var(--color-honey-light)] ml-auto flex-shrink-0">{formatTimeDisplay(upNextTime!)}</span>
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
            const eventMeta = classifyCalendarEvent(currentCalendarEvent, {
              classes: data.classes,
              allEvents: data.calendarEvents || [],
              competitionDances: data.competitionDances || [],
              students: data.students || [],
            });
            const isWorkEvent = eventMeta.isWork;
            return (
              <div className={`bg-[var(--surface-card)] rounded-2xl overflow-hidden ${
                isWorkEvent
                  ? 'ring-2 ring-[var(--accent-primary)]/25 shadow-lg shadow-[var(--accent-primary)]/10'
                  : 'ring-2 ring-amber-400/30 shadow-lg shadow-amber-400/10'
              }`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full ${
                      isWorkEvent ? 'bg-[var(--accent-primary)]' : 'bg-amber-500'
                    }`}>
                      <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />Live
                    </span>
                    <div>
                      <span className={`type-stat leading-none ${isWorkEvent ? 'text-[var(--accent-primary)]' : 'text-amber-600 dark:text-amber-400'}`}>{remaining}</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] ml-1">min left</span>
                    </div>
                  </div>
                  <h2 className="type-h1 text-[var(--text-primary)] leading-tight line-clamp-2 mb-3">{currentCalendarEvent.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
                    <span className="flex items-center gap-1 text-[var(--color-honey)] dark:text-[var(--color-honey-light)] font-medium"><Clock size={14} />{formatTimeDisplay(currentCalendarEvent.startTime)}{currentCalendarEvent.endTime && currentCalendarEvent.endTime !== '00:00' && <> - {formatTimeDisplay(currentCalendarEvent.endTime)}</>}</span>
                    {locationLine && <span className="flex items-center gap-1"><MapPin size={14} />{locationLine}</span>}
                  </div>
                  <Link
                    to={`/event/${currentCalendarEvent.id}/notes`}
                    className={`flex items-center justify-center gap-2 w-full text-white py-3.5 rounded-xl font-semibold transition-colors ${
                      isWorkEvent
                        ? 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] active:opacity-90'
                        : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'
                    }`}
                  >
                    <Play size={18} />{eventMeta.actionLabel}
                  </Link>
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

        {/* ── AI Check-In Widget ── */}
        {checkInActive && frozenCheckInType && (
          <AICheckInWidget
            greeting={frozenGreeting}
            checkInType={frozenCheckInType}
            onSubmit={handleCheckInSubmit}
            onSkip={handleCheckInSkip}
            onDone={() => { setCheckInActive(false); setFrozenCheckInType(null); }}
          />
        )}

        {/* ── Context-Specific Sections ── */}

        {ctx.context === 'morning' && (
          <>
            <MorningBriefing
              todayClasses={activeTodayClasses}
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
              cancelledTodayCount={cancelledTodayCount}
              subbedTodayCount={subbedTodayCount}
            />
            {todayPlan && todayPlan.items.some(i => !i.completed) && (
              <DayPlanWidget
                plan={todayPlan}
                onToggleItem={handleTogglePlanItem}
                onReplan={() => generateDayPlan()}
                isReplanning={isReplanning}
              />
            )}
            {!todayPlan && (
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="type-h3 text-[var(--text-primary)]">Today's Plan</h3>
                    <p className="type-caption text-[var(--text-secondary)] mt-0.5">AI-powered schedule based on your day</p>
                  </div>
                  <button
                    onClick={() => generateDayPlan()}
                    disabled={isReplanning}
                    className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isReplanning ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating...</>
                    ) : (
                      'Generate Plan'
                    )}
                  </button>
                </div>
              </div>
            )}
            <NudgeCards nudges={nudges} onDismiss={dismissNudge} onSnooze={snoozeNudge} />
            <RemindersWidget reminders={data.selfCare?.reminders || []} onToggle={handleToggleReminder} />
          </>
        )}

        {ctx.context === 'pre-class' && (
          <>
            {classTiming.upcomingClass && (
              <PrepCard
                classContext={classTiming.upcomingClass}
                minutesUntil={classTiming.minutesUntilNext || 0}
                data={data}
                autoPrep
              />
            )}
            {canLogDose && (
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Meds before class?</span>
                  </div>
                  <button
                    onClick={handleLogDose}
                    className="px-3 py-1.5 text-xs font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full active:scale-90 transition-all duration-150"
                  >
                    Log Dose
                  </button>
                </div>
              </div>
            )}
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
              cancelledTodayCount={cancelledTodayCount}
              subbedTodayCount={subbedTodayCount}
            />
          </>
        )}

        {ctx.context === 'during-class' && (
          <>
            {/* Hero card already rendered above for during-class */}
          </>
        )}

        {ctx.context === 'post-class' && (
          <>
            {classTiming.justEndedClass && (
              <PostClassCapture
                classContext={classTiming.justEndedClass}
                data={data}
                onSaveNotes={saveWeekNotes}
                getCurrentWeekNotes={getCurrentWeekNotes}
              />
            )}
            {/* Show next class prep if another is coming */}
            {classTiming.upcomingClass && (
              <PrepCard
                classContext={classTiming.upcomingClass}
                minutesUntil={classTiming.minutesUntilNext || 0}
                data={data}
                autoPrep
              />
            )}
          </>
        )}

        {ctx.context === 'evening' && (
          <>
            {/* Day summary */}
            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
              <h3 className="type-h3 text-[var(--text-primary)] mb-2">Today's Wrap-Up</h3>
              <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
                {activeTodayClasses.length > 0 && (
                  <span>{activeTodayClasses.length} class{activeTodayClasses.length !== 1 ? 'es' : ''} taught</span>
                )}
                {todayPlan && (
                  <span>{todayPlan.items.filter(i => i.completed).length}/{todayPlan.items.length} tasks done</span>
                )}
              </div>
              {activeTodayClasses.length === 0 && !todayPlan && (
                <p className="text-sm text-[var(--text-tertiary)]">Rest day — nice.</p>
              )}
            </div>
            {/* Tomorrow preview */}
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
              cancelledTodayCount={cancelledTodayCount}
              subbedTodayCount={subbedTodayCount}
            />
            {/* Wellness link */}
            <Link
              to="/me"
              className="block bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Wellness Check</span>
                <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
              </div>
            </Link>
            <RemindersWidget reminders={data.selfCare?.reminders || []} onToggle={handleToggleReminder} />
          </>
        )}

        {ctx.context === 'default' && (
          <>
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
              cancelledTodayCount={cancelledTodayCount}
              subbedTodayCount={subbedTodayCount}
            />
            {todayPlan && todayPlan.items.some(i => !i.completed) && (
              <DayPlanWidget
                plan={todayPlan}
                onToggleItem={handleTogglePlanItem}
                onReplan={() => generateDayPlan()}
                isReplanning={isReplanning}
              />
            )}
            <RemindersWidget reminders={data.selfCare?.reminders || []} onToggle={handleToggleReminder} />
            <NudgeCards nudges={nudges} onDismiss={dismissNudge} onSnooze={snoozeNudge} />
          </>
        )}

        {/* ── Next Action Badge (always, when plan exists) ── */}
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

        {/* ── Always: Scratchpad (collapsed) ── */}
        <ScratchpadWidget value={data.selfCare?.scratchpad || ''} onChange={handleScratchpadChange} />
      </div>

      {/* Quick Note FAB — always available on teaching days */}
      <QuickNoteCapture
        todayClasses={activeTodayClasses}
        currentClassId={classInfo.status === 'during' ? classInfo.class?.id : undefined}
        onSaveNote={(classId, note) => {
          const weekNote = getCurrentWeekNotes();
          const existing = weekNote.classNotes[classId] || {
            classId, plan: '', liveNotes: [], isOrganized: false,
          };
          weekNote.classNotes[classId] = {
            ...existing,
            liveNotes: [...existing.liveNotes, note],
          };
          saveWeekNotes(weekNote);
        }}
      />
    </div>
  );
}
