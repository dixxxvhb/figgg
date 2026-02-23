/**
 * Assembles a lean context payload (~800-1000 tokens) for AI check-in and day plan functions.
 * Reads from AppData and produces a compact object for the Netlify Function.
 */
import { getClassesByDay } from '../data/classes';
import { timeToMinutes } from '../utils/time';
import type { AppData, DayOfWeek, AIConfig } from '../types';
import { DEFAULT_AI_CONFIG, DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS } from '../types';

export interface AIContextPayload {
  time: string;              // HH:mm
  dayOfWeek: string;
  checkInType: 'morning' | 'afternoon';
  userMessage: string;
  // Meds
  medStatus: {
    dose1Taken: boolean;
    dose1Time?: string;
    dose2Taken: boolean;
    dose2Time?: string;
    dose3Taken: boolean;
    dose3Time?: string;
    skipped: boolean;
    maxDoses?: 2 | 3;
    currentStatus?: string;  // "Peak Window", "Building", etc.
  };
  // Schedule
  schedule: Array<{ time: string; title: string; type: 'class' | 'event' }>;
  // Tasks
  tasks: {
    overdueCount: number;
    todayDueCount: number;
    topTitles: string[];     // max 5
  };
  // Launch
  launchTasks: string[];      // max 5 titles (legacy, kept for compat)
  launchTaskList: Array<{ id: string; title: string; category: string; milestone: boolean }>;  // with IDs for actions
  // Wellness
  wellnessProgress: { done: number; total: number };
  wellnessItems?: Array<{ id: string; label: string; done: boolean }>;  // for day plan sourceId matching
  // Learned patterns
  patterns: string[];          // from latest weekly summary
  // Previous check-in
  previousCheckIn?: string;    // 1-sentence summary
  // Day plan (so AI can reference/modify it)
  dayPlan?: {
    summary: string;
    items: Array<{ id: string; title: string; completed: boolean; time?: string; category: string }>;
  };
  // Streak
  streak?: number;
  // Day mode
  dayMode?: 'light' | 'normal' | 'intense' | 'comp';
  // Last week reflection (for AI to reference patterns)
  lastReflection?: string;
  // Class lookup tables (for AI to resolve fuzzy class names → IDs)
  todayClassList: Array<{ id: string; name: string; startTime: string }>;
  weekClassList: Array<{ id: string; name: string; day: string; startTime: string }>;
  // Competition dance lookup (for rehearsal notes)
  competitionDanceList: Array<{ id: string; registrationName: string; songTitle: string }>;
  // Preferences
  tone: 'supportive' | 'direct' | 'minimal';
}

export function buildAIContext(
  data: AppData,
  checkInType: 'morning' | 'afternoon',
  userMessage: string,
): AIContextPayload {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[now.getDay()];
  const config = data.settings?.aiConfig || DEFAULT_AI_CONFIG;
  const sc = data.selfCare;

  // Meds
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const dose1Taken = sc?.dose1Date === todayStr && sc?.dose1Time != null;
  const dose2Taken = sc?.dose2Date === todayStr && sc?.dose2Time != null;
  const dose3Taken = sc?.dose3Date === todayStr && sc?.dose3Time != null;
  const skipped = sc?.skippedDoseDate === todayStr;

  const medStatus: AIContextPayload['medStatus'] = {
    dose1Taken,
    dose2Taken,
    dose3Taken,
    skipped,
    maxDoses: medConfig.maxDoses,
  };
  if (dose1Taken && sc?.dose1Time) medStatus.dose1Time = formatMs(sc.dose1Time);
  if (dose2Taken && sc?.dose2Time) medStatus.dose2Time = formatMs(sc.dose2Time);
  if (dose3Taken && sc?.dose3Time) medStatus.dose3Time = formatMs(sc.dose3Time);

  // Schedule
  const todayClasses = getClassesByDay(data.classes, dayName);
  const todayEvents = (data.calendarEvents || [])
    .filter(e => e.date === todayStr && e.startTime && e.startTime !== '00:00');
  const schedule = [
    ...todayClasses.map(c => ({ time: c.startTime, title: c.name, type: 'class' as const })),
    ...todayEvents.map(e => ({ time: e.startTime, title: e.title, type: 'event' as const })),
  ].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // Tasks (reminders)
  const reminders = sc?.reminders || [];
  const overdueCount = reminders.filter(r =>
    !r.completed && r.dueDate && r.dueDate < todayStr
  ).length;
  const todayDueCount = reminders.filter(r =>
    !r.completed && r.dueDate === todayStr
  ).length;
  const topTitles = reminders
    .filter(r => !r.completed)
    .sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5)
    .map(r => r.title);

  // Launch tasks
  const activeLaunchTasks = (data.launchPlan?.tasks || [])
    .filter(t => !t.completed && !t.skipped)
    .sort((a, b) => {
      // Milestones first, then by scheduled date (earlier = more urgent)
      if (a.milestone && !b.milestone) return -1;
      if (!a.milestone && b.milestone) return 1;
      return (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
    })
    .slice(0, 5);
  const launchTasks = activeLaunchTasks.map(t => t.title);
  const launchTaskList = activeLaunchTasks.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    milestone: !!t.milestone,
  }));

  // Wellness progress — if today's states haven't been initialized yet, report configured item count
  const wellnessStates = (sc?.unifiedTaskDate === todayStr) ? (sc?.unifiedTaskStates || {}) : {};
  const done = Object.values(wellnessStates).filter(Boolean).length;
  const wellnessItems = data.settings?.wellnessItems || DEFAULT_WELLNESS_ITEMS;
  const configuredCount = wellnessItems.filter(w => w.enabled).length;
  const total = Object.keys(wellnessStates).length || configuredCount;

  // Learned patterns from latest weekly summary
  const latestSummary = data.learningData?.weeklySummaries?.slice(-1)[0];
  const patterns = latestSummary?.patterns?.slice(0, 3) || [];

  // Previous check-in
  const todayCheckIns = (data.aiCheckIns || []).filter(c => c.date === todayStr);
  const previousCheckIn = todayCheckIns.length > 0
    ? todayCheckIns[todayCheckIns.length - 1].aiResponse.slice(0, 100)
    : undefined;

  // Build wellness items with done state for day plan sourceId matching
  const wellnessItemsList = wellnessItems
    .filter(w => w.enabled)
    .map(w => ({ id: w.id, label: w.label, done: !!wellnessStates[w.id] }));

  // Day plan for AI to see and reference
  const todayPlan = data.dayPlan?.date === todayStr ? data.dayPlan : undefined;
  const dayPlanPayload = todayPlan ? {
    summary: todayPlan.summary,
    items: todayPlan.items.map(i => ({
      id: i.id, title: i.title, completed: i.completed,
      time: i.time, category: i.category,
    })),
  } : undefined;

  // Streak
  const streak = sc?.streakData?.currentStreak;

  // Day mode
  const dayMode = sc?.dayModeDate === todayStr
    ? (sc?.dayMode || 'normal')
    : 'normal';

  // Class lookup tables for AI name → ID resolution
  const todayClassList = todayClasses.map(c => ({
    id: c.id,
    name: c.name,
    startTime: c.startTime,
  }));
  const allDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekClassList = allDays.flatMap(d =>
    getClassesByDay(data.classes, d).map(c => ({
      id: c.id,
      name: c.name,
      day: d,
      startTime: c.startTime,
    }))
  );
  const competitionDanceList = (data.competitionDances || []).map(d => ({
    id: d.id,
    registrationName: d.registrationName,
    songTitle: d.songTitle,
  }));

  // Last week reflection — find most recent reflection from weekNotes
  const sortedWeeks = [...(data.weekNotes || [])].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const lastReflection = sortedWeeks.find(w => w.reflection)?.reflection;
  const lastReflectionStr = lastReflection
    ? [lastReflection.aiSummary, lastReflection.nextWeekFocus ? `Focus: ${lastReflection.nextWeekFocus}` : ''].filter(Boolean).join('. ')
    : undefined;

  return {
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    dayOfWeek: dayName,
    checkInType,
    userMessage,
    medStatus,
    schedule,
    tasks: { overdueCount, todayDueCount, topTitles },
    launchTasks,
    launchTaskList,
    todayClassList,
    weekClassList,
    competitionDanceList,
    wellnessProgress: { done, total },
    wellnessItems: wellnessItemsList,
    dayPlan: dayPlanPayload,
    streak,
    patterns,
    previousCheckIn,
    dayMode: dayMode !== 'normal' ? dayMode : undefined,
    lastReflection: lastReflectionStr,
    tone: config.tone,
  };
}

export function buildFullAIContext(
  data: AppData,
  userMessage: string,
): AIContextPayload & {
  disruption?: import('../types').DisruptionState;
  allActiveReminders?: Array<{ id: string; title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
  upcomingCompetitions?: Array<{ name: string; date: string; daysAway: number }>;
  date: string;
} {
  const base = buildAIContext(data, 'morning', userMessage);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // All active reminders (not just top 5)
  const reminders = (data.selfCare?.reminders || [])
    .filter(r => !r.completed)
    .map(r => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      flagged: r.flagged,
      completed: r.completed,
    }));

  // Upcoming competitions with days away
  const upcomingCompetitions = (data.competitions || [])
    .filter(c => c.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(c => {
      const compDate = new Date(c.date + 'T00:00:00');
      const daysAway = Math.ceil((compDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { name: c.name, date: c.date, daysAway };
    });

  return {
    ...base,
    date: todayStr,
    disruption: data.disruption,
    allActiveReminders: reminders,
    upcomingCompetitions,
  };
}

function formatMs(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
