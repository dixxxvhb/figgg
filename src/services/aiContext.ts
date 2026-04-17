/**
 * Assembles a lean context payload (~800-1000 tokens) for AI check-in and day plan functions.
 * Reads from AppData and produces a compact object for the Firebase Cloud Function.
 */
import { getClassesByDay } from '../data/classes';
import { timeToMinutes, formatWeekOf, getWeekStart, toDateStr, toTimeStr } from '../utils/time';
import type { AppData, CalendarEvent, DayOfWeek } from '../types';
import { DEFAULT_AI_CONFIG, DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS } from '../types';
import { detectLinkedDances } from '../utils/danceLinker';

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
  schedule: Array<{ time: string; title: string; type: 'class' | 'event'; classId?: string }>;
  // Tasks
  tasks: {
    overdueCount: number;
    todayDueCount: number;
    tomorrowDueCount: number;
    topTitles: string[];     // max 5
    // Detailed task list for smarter AI scheduling
    taskDetails: Array<{
      id: string;
      title: string;
      dueDate?: string;
      dueTime?: string;
      priority: string;
      flagged: boolean;
      listName?: string;
      hasSubtasks: boolean;
      recurring: boolean;
    }>;
  };
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
  // Wellness mode (smart checklist)
  wellnessMode?: 'okay' | 'rough' | 'survival';
  // Therapy proximity
  therapySessionSoon?: { daysUntil: number; hasPrep: boolean };
  // Meditation minutes today
  meditationMinutesToday?: number;
  // Grief emotional check-in (NO letter content)
  griefCheckIn?: { emotions: string[]; date: string };
  // Last week reflection (for AI to reference patterns)
  lastReflection?: string;
  // Class lookup tables (for AI to resolve fuzzy class names → IDs)
  todayClassList: Array<{ id: string; name: string; startTime: string }>;
  weekClassList: Array<{ id: string; name: string; day: string; startTime: string }>;
  // Competition dance lookup (for rehearsal notes)
  competitionDanceList: Array<{ id: string; registrationName: string; songTitle: string }>;
  // Teaching load awareness
  teachingLoad?: {
    classesToday: number;
    classesThisWeek: number;
    busiestDay: string;
    busiestDayCount: number;
  };
  // Upcoming competition proximity
  nextCompetition?: {
    name: string;
    daysAway: number;
    dancesReady: number;
    dancesTotal: number;
  };
  // Daily briefing (from Cloud Function + Cowork enrichment)
  dailyBriefing?: string;
  briefingEmail?: {
    needsResponse: Array<{ from: string; subject: string; priority: string }>;
    actionRequired: Array<{ from: string; subject: string; actionType: string }>;
  };
  briefingProjects?: Array<{ name: string; health: string; note?: string }>;
  briefingMessages?: Array<{ contact: string; lastMessage: string; youReplied: boolean; priority: string }>;
  briefingNotes?: Array<{ title: string; snippet: string }>;
  // Class-specific data (for generate-plan, expand-notes, detect-reminders, organize-notes modes)
  classData?: {
    classInfo?: {
      id: string;
      name: string;
      day: string;
      startTime: string;
      endTime: string;
      level?: string;
      recitalSong?: string;
      choreographyNotes?: string;
    };
    notes?: Array<{ id: string; timestamp: string; text: string; category?: string }>;
    previousPlans?: string[];
    progressionHints?: string[];
    repetitionFlags?: string[];
    attendanceNote?: string;
    expandedSummary?: string;
    date?: string;
  };
  eventData?: {
    id: string;
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    linkedDanceNames?: string[];
  };
  // Preferences
  tone: 'supportive' | 'direct' | 'minimal';
  // Check-in context (for briefing and day-plan generation)
  checkInMood?: string;
  checkInMessage?: string;
}

export function buildAIContext(
  data: AppData,
  checkInType: 'morning' | 'afternoon',
  userMessage: string,
  options?: {
    currentEvent?: CalendarEvent;
  },
): AIContextPayload {
  const now = new Date();
  const todayStr = toDateStr(now);
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
  // Current med status based on most recent dose timing
  const latestDoseTime = [sc?.dose3Time, sc?.dose2Time, sc?.dose1Time].find(t => t != null);
  if (latestDoseTime && !skipped) {
    const minutesSinceDose = Math.floor((now.getTime() - latestDoseTime) / 60000);
    if (minutesSinceDose < 30) medStatus.currentStatus = 'Building';
    else if (minutesSinceDose < 180) medStatus.currentStatus = 'Peak';
    else if (minutesSinceDose < 300) medStatus.currentStatus = 'Tapering';
    else medStatus.currentStatus = 'Worn off';
  }

  // Schedule
  const todayClasses = getClassesByDay(data.classes, dayName);
  const todayEvents = (data.calendarEvents || [])
    .filter(e => e.date === todayStr && e.startTime && e.startTime !== '00:00');
  const schedule = [
    ...todayClasses.map(c => ({ time: c.startTime, title: c.name, type: 'class' as const, classId: c.id })),
    ...todayEvents.map(e => ({ time: e.startTime, title: e.title, type: 'event' as const })),
  ].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  // Tasks (reminders)
  const reminders = sc?.reminders || [];
  const reminderLists = sc?.reminderLists || [];
  const incompleteReminders = reminders.filter(r => !r.completed);
  const overdueCount = incompleteReminders.filter(r =>
    r.dueDate && r.dueDate < todayStr
  ).length;
  const todayDueCount = incompleteReminders.filter(r =>
    r.dueDate === todayStr
  ).length;
  const tomorrowStr = toDateStr(new Date(now.getTime() + 86400000));
  const tomorrowDueCount = incompleteReminders.filter(r =>
    r.dueDate === tomorrowStr
  ).length;
  const sortedTasks = incompleteReminders
    .sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      // Overdue first, then today, then tomorrow, then by due date
      const aUrgency = a.dueDate ? (a.dueDate < todayStr ? 0 : a.dueDate === todayStr ? 1 : a.dueDate === tomorrowStr ? 2 : 3) : 4;
      const bUrgency = b.dueDate ? (b.dueDate < todayStr ? 0 : b.dueDate === todayStr ? 1 : b.dueDate === tomorrowStr ? 2 : 3) : 4;
      if (aUrgency !== bUrgency) return aUrgency - bUrgency;
      if (a.priority !== b.priority) {
        const pOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return (pOrder[a.priority] || 3) - (pOrder[b.priority] || 3);
      }
      return 0;
    });
  const topTitles = sortedTasks.slice(0, 5).map(r => r.title);
  // Detailed task info for AI scheduling (max 15 tasks for token budget)
  const taskDetails = sortedTasks.slice(0, 15).map(r => ({
    id: r.id,
    title: r.title,
    dueDate: r.dueDate,
    dueTime: r.dueTime,
    priority: r.priority,
    flagged: r.flagged,
    listName: reminderLists.find(l => l.id === r.listId)?.name,
    hasSubtasks: (r.subtasks?.length ?? 0) > 0,
    recurring: !!r.recurring,
  }));

  // Wellness progress — if today's states haven't been initialized yet, report configured item count
  const wellnessStates = (sc?.unifiedTaskDate === todayStr) ? (sc?.unifiedTaskStates || {}) : {};
  const done = Object.values(wellnessStates).filter(Boolean).length;
  const wellnessItems = data.settings?.wellnessItems || DEFAULT_WELLNESS_ITEMS;
  const configuredCount = wellnessItems.filter(w => w.enabled).length;
  const total = Object.keys(wellnessStates).length || configuredCount;

  // Learned patterns from latest weekly summary (include more for richer AI context)
  const latestSummary = data.learningData?.weeklySummaries?.slice(-1)[0];
  const patterns = latestSummary?.patterns?.slice(0, 8) || [];

  // Previous check-in
  const todayCheckIns = (data.aiCheckIns || []).filter(c => c.date === todayStr);
  const previousCheckIn = todayCheckIns.length > 0
    ? (todayCheckIns[todayCheckIns.length - 1].aiResponse || '').slice(0, 100)
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

  // Wellness mode (smart checklist)
  const wellnessMode = sc?.wellnessModeDate === todayStr
    ? sc?.wellnessMode
    : undefined;

  // Therapy session proximity
  let therapySessionSoon: AIContextPayload['therapySessionSoon'] = undefined;
  if (data.therapist?.nextSession?.date) {
    const sessionDate = new Date(data.therapist.nextSession.date + 'T00:00:00');
    const daysUntil = Math.ceil((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 7) {
      const hasPrep = (data.therapist.prepNotes || []).filter(n => !n.discussed).length > 0;
      therapySessionSoon = { daysUntil, hasPrep };
    }
  }

  // Meditation minutes today
  const todayMeditationSessions = (data.meditation?.sessions || [])
    .filter(s => s.date === todayStr);
  const meditationMinutesToday = todayMeditationSessions.length > 0
    ? Math.round(todayMeditationSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60)
    : undefined;

  // Grief emotional check-in (NO letter content per spec)
  const todayGriefCheckin = (data.grief?.emotionalCheckins || [])
    .filter(c => c.date === todayStr)
    .slice(-1)[0];
  const griefCheckIn = todayGriefCheckin
    ? { emotions: todayGriefCheckin.emotions, date: todayGriefCheckin.date }
    : undefined;

  // Class lookup tables for AI name → ID resolution (include exception status)
  const weekOf = formatWeekOf(getWeekStart());
  const currentWeekNotes = (data.weekNotes || []).find(w => w.weekOf === weekOf);
  const todayClassList = todayClasses.map(c => {
    const exception = currentWeekNotes?.classNotes[c.id]?.exception;
    return {
      id: c.id,
      name: c.name,
      startTime: c.startTime,
      ...(exception ? { exception: exception.type, subName: exception.subName } : {}),
    };
  });
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

  // Teaching load awareness — helps AI gauge intensity
  const allDaysForLoad: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const classCounts = allDaysForLoad.map(d => ({ day: d, count: getClassesByDay(data.classes, d).length }));
  const totalWeekClasses = classCounts.reduce((sum, d) => sum + d.count, 0);
  const busiestDay = classCounts.reduce((max, d) => d.count > max.count ? d : max, classCounts[0]);
  const teachingLoad = {
    classesToday: todayClasses.length,
    classesThisWeek: totalWeekClasses,
    busiestDay: busiestDay.day,
    busiestDayCount: busiestDay.count,
  };

  // Next competition proximity — so AI can adjust urgency
  const comps = (data.competitions || [])
    .filter(c => c.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextComp = comps[0];
  let nextCompetition: AIContextPayload['nextCompetition'] = undefined;
  if (nextComp) {
    const daysAway = Math.ceil((new Date(nextComp.date + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const compDances = (data.competitionDances || []).filter(d => nextComp.dances?.includes(d.id));
    const dancesReady = compDances.filter(d => d.rehearsalNotes && d.rehearsalNotes.length > 0).length;
    nextCompetition = { name: nextComp.name, daysAway, dancesReady, dancesTotal: compDances.length };
  }

  const currentEvent = options?.currentEvent;
  const eventData = currentEvent
    ? (() => {
        const linkedDanceIds = currentEvent.linkedDanceIds?.length
          ? currentEvent.linkedDanceIds
          : detectLinkedDances(currentEvent, data.competitionDances || []);
        const linkedDanceNames = (data.competitionDances || [])
          .filter(dance => linkedDanceIds.includes(dance.id))
          .map(dance => dance.registrationName);

        return {
          id: currentEvent.id,
          title: currentEvent.title,
          date: currentEvent.date,
          startTime: currentEvent.startTime,
          endTime: currentEvent.endTime,
          description: currentEvent.description,
          linkedDanceNames,
        };
      })()
    : undefined;

  return {
    time: toTimeStr(now),
    dayOfWeek: dayName,
    checkInType,
    userMessage,
    medStatus,
    schedule,
    tasks: { overdueCount, todayDueCount, tomorrowDueCount, topTitles, taskDetails },
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
    wellnessMode,
    therapySessionSoon,
    meditationMinutesToday,
    griefCheckIn,
    lastReflection: lastReflectionStr,
    teachingLoad,
    nextCompetition,
    eventData,
    tone: config.tone,
  };
}

export function buildFullAIContext(
  data: AppData,
  userMessage: string,
): AIContextPayload & {
  allActiveReminders?: Array<{ id: string; title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
  upcomingCompetitions?: Array<{ name: string; date: string; daysAway: number }>;
  therapyWeekNotes?: Array<{ date: string; text: string }>;
  date: string;
  // Full data access for AI
  classDetails?: Array<{ id: string; name: string; day: string; startTime: string; endTime: string; studioId: string; level?: string; recitalSong?: string; choreographyNotes?: string }>;
  studioList?: Array<{ id: string; name: string; shortName: string; address: string }>;
  studentList?: Array<{ id: string; name: string; nickname?: string; classIds: string[]; notes: string; recentSkillNotes?: Array<{ date: string; category: string; text: string }> }>;
  competitionDetails?: Array<{ id: string; name: string; date: string; endDate?: string; location: string; dances: string[]; notes: string }>;
  competitionDanceDetails?: Array<{ id: string; registrationName: string; songTitle: string; style: string; category: string; level: string; dancers: string[]; dancerIds?: string[]; notes: string; recentRehearsals?: Array<{ date: string; notes: string; workOn: string[] }>; costume?: { hair: string; shoes?: string; tights?: string; accessories?: string[]; notes?: string } }>;
  settingsSnapshot?: { darkMode?: boolean; themeId?: string; fontSize?: string; medConfig?: { medType: string; maxDoses: number }; aiConfig?: { tone: string; morningCheckInEnabled: boolean; afternoonCheckInEnabled: boolean; autoPlanEnabled: boolean } };
  recentWeekNotes?: Array<{ weekOf: string; classNotes: Record<string, { plan: string; noteCount: number; hasException?: boolean; exceptionType?: string }> }>;
} {
  const hour = new Date().getHours();
  const checkInType = hour < 12 ? 'morning' : 'afternoon';
  const base = buildAIContext(data, checkInType, userMessage);
  const now = new Date();
  const todayStr = toDateStr(now);
  const clip = (value: string | undefined, max: number) => value ? value.slice(0, max) : value;

  // All active reminders (not just top 5)
  const reminders = (data.selfCare?.reminders || [])
    .filter(r => !r.completed)
    .slice(0, 20)
    .map(r => ({
      id: r.id,
      title: clip(r.title, 120) || '',
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

  // Full class details (for AI to reference and modify)
  const classDetails = data.classes.slice(0, 20).map(c => ({
    id: c.id,
    name: clip(c.name, 80) || '',
    day: c.day,
    startTime: c.startTime,
    endTime: c.endTime,
    studioId: c.studioId,
    level: c.level,
    recitalSong: clip(c.recitalSong, 80),
    choreographyNotes: clip(c.choreographyNotes, 160),
  }));

  // Studios
  const studioList = data.studios.slice(0, 12).map(s => ({
    id: s.id,
    name: clip(s.name, 80) || '',
    shortName: clip(s.shortName, 40) || '',
    address: clip(s.address, 120) || '',
  }));

  // Students with recent skill notes (last 3 per student)
  const studentList = (data.students || []).slice(0, 30).map(s => ({
    id: s.id,
    name: clip(s.name, 80) || '',
    nickname: clip(s.nickname, 40),
    classIds: (s.classIds || []).slice(0, 12),
    notes: clip(s.notes, 180) || '',
    recentSkillNotes: s.skillNotes
      ?.sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map(sn => ({ date: sn.date, category: sn.category, text: clip(sn.text, 100) || '' })),
  }));

  // Full competition details
  const competitionDetails = (data.competitions || []).slice(0, 10).map(c => ({
    id: c.id,
    name: clip(c.name, 80) || '',
    date: c.date,
    endDate: c.endDate,
    location: clip(c.location, 120) || '',
    dances: (c.dances || []).slice(0, 12),
    notes: clip(c.notes, 180) || '',
  }));

  // Full competition dance details with recent rehearsals
  const competitionDanceDetails = (data.competitionDances || []).slice(0, 16).map(d => ({
    id: d.id,
    registrationName: clip(d.registrationName, 80) || '',
    songTitle: clip(d.songTitle, 80) || '',
    style: d.style,
    category: d.category,
    level: d.level,
    dancers: (d.dancers || []).slice(0, 16),
    dancerIds: d.dancerIds?.slice(0, 16),
    notes: clip(d.notes, 180) || '',
    recentRehearsals: (d.rehearsalNotes || [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map(r => ({ date: r.date, notes: clip(r.notes, 120) || '', workOn: (r.workOn || []).slice(0, 5).map(item => clip(item, 60) || '') })),
    costume: d.costume ? {
      hair: clip(d.costume.hair, 60) || '',
      shoes: clip(d.costume.shoes, 60),
      tights: clip(d.costume.tights, 60),
      accessories: d.costume.accessories?.slice(0, 6).map(item => clip(item, 40) || ''),
      notes: clip(d.costume.notes, 120),
    } : undefined,
  }));

  // Settings snapshot (so AI can reference and modify)
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const aiConfig = data.settings?.aiConfig || DEFAULT_AI_CONFIG;
  const settingsSnapshot = {
    darkMode: data.settings?.darkMode,
    themeId: data.settings?.themeId,
    fontSize: data.settings?.fontSize,
    medConfig: { medType: medConfig.medType, maxDoses: medConfig.maxDoses },
    aiConfig: {
      tone: aiConfig.tone,
      morningCheckInEnabled: aiConfig.morningCheckInEnabled,
      afternoonCheckInEnabled: aiConfig.afternoonCheckInEnabled,
      autoPlanEnabled: aiConfig.autoPlanEnabled,
    },
  };

  // Recent week notes (last 3 weeks, with actual note content for current week)
  const recentWeekNotes = [...(data.weekNotes || [])]
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
    .slice(0, 3)
    .map((w, idx) => ({
      weekOf: w.weekOf,
      classNotes: Object.fromEntries(
        Object.entries(w.classNotes).map(([classId, cn]) => [
          classId,
          {
            plan: cn.plan,
            noteCount: cn.liveNotes.length,
            hasException: !!cn.exception,
            exceptionType: cn.exception?.type,
            // Include actual note text for the most recent 2 weeks (truncated for token budget)
            ...(idx < 2 && cn.liveNotes.length > 0 ? {
              notes: cn.liveNotes
                .slice(-8)  // last 8 notes per class
                .map(n => ({
                  text: n.text.slice(0, 100),
                  category: n.category,
                  timestamp: n.timestamp,
                })),
            } : {}),
          },
        ])
      ),
    }));

  // Append a live override note to the briefing if class exceptions exist —
  // the stored briefing was generated at 5:30am before any exceptions were set
  let dailyBriefingSummary = data.dailyBriefing?.summary;
  {
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayName = days[new Date().getDay()];
    const todayClassesForBriefing = getClassesByDay(data.classes, todayDayName);
    const weekOfStr = formatWeekOf(getWeekStart());
    const weekNotesForBriefing = (data.weekNotes || []).find(w => w.weekOf === weekOfStr);
    const exceptionItems: Array<{ name: string; exception: string; subName?: string }> = [];
    for (const cls of todayClassesForBriefing) {
      const exc = weekNotesForBriefing?.classNotes[cls.id]?.exception;
      if (exc) exceptionItems.push({ name: cls.name, exception: exc.type, subName: exc.subName });
    }
    if (exceptionItems.length > 0 && dailyBriefingSummary) {
      const noteLines = exceptionItems.map(c =>
        `  - ${c.name}: ${c.exception}${c.subName ? ` (sub: ${c.subName})` : ''}`
      ).join('\n');
      dailyBriefingSummary +=
        `\n\n⚠️ CLASS STATUS UPDATE (set after briefing was generated):\n${noteLines}\nTreat these as the current class status — override any class references in the briefing above.`;
    }
  }

  return {
    ...base,
    date: todayStr,
    dailyBriefing: dailyBriefingSummary,
    briefingEmail: data.dailyBriefing?.email ? {
      needsResponse: (data.dailyBriefing.email.needsResponse || []).map(e => ({ from: e.from, subject: e.subject, priority: e.priority })),
      actionRequired: (data.dailyBriefing.email.actionRequired || []).map(e => ({ from: e.from, subject: e.subject, actionType: e.actionType })),
    } : undefined,
    briefingProjects: data.dailyBriefing?.projects?.status,
    briefingMessages: data.dailyBriefing?.messages?.threads?.filter(t => t.priority === 'high' || !t.youReplied).map(t => ({
      contact: t.contact, lastMessage: t.lastMessage.slice(0, 80), youReplied: t.youReplied, priority: t.priority,
    })),
    briefingNotes: data.dailyBriefing?.notes?.newOrModified?.map(n => ({ title: n.title, snippet: n.snippet.slice(0, 80) })),
    allActiveReminders: reminders,
    upcomingCompetitions,
    classDetails,
    studioList,
    studentList,
    competitionDetails,
    competitionDanceDetails,
    settingsSnapshot,
    recentWeekNotes,
  };
}

function formatMs(ms: number): string {
  return toTimeStr(new Date(ms));
}
