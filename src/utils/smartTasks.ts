import type { SmartTask } from '../types';

// ============ CONTEXT ============

export interface SmartTaskContext {
  todayClasses: { name: string; startTime: string; endTime: string; studioId: string }[];
  todayCalendarEvents: { title: string; startTime: string; endTime: string }[];
  competitions: { name: string; date: string }[];
  currentDay: string; // 'monday', 'tuesday', etc.
  dateStr: string;    // 'YYYY-MM-DD'
  tomorrowClassCount: number;
  tomorrowFirstClassTime?: string; // "09:30" format
}

// ============ HELPERS ============

const SESSION_KEYS = [
  'morning-wake',
  'peak-focus',
  'midday-recharge',
  'afternoon-push',
  'evening-wind',
  'pre-sleep',
] as const;

// Hydration distribution weights per session (sums to 1.0)
const HYDRATION_WEIGHTS = [0.15, 0.17, 0.18, 0.20, 0.17, 0.13];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function getHydrationTargetOz(eventCount: number): number {
  return 64 + eventCount * 12;
}

function roundToNearest2(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2); // Floor of 2oz — never show "Drink 0oz"
}

function getCompetitionProximity(competitions: { name: string; date: string }[]): { name: string; daysAway: number } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let closest: { name: string; daysAway: number } | null = null;

  for (const comp of competitions) {
    const compDate = new Date(comp.date);
    compDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 14 && (!closest || diff < closest.daysAway)) {
      closest = { name: comp.name, daysAway: diff };
    }
  }

  return closest;
}

function hasBackToBack(classes: { startTime: string; endTime: string }[]): boolean {
  if (classes.length < 2) return false;
  const sorted = [...classes].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = timeToMinutes(sorted[i + 1].startTime) - timeToMinutes(sorted[i].endTime);
    if (gap <= 15) return true;
  }
  return false;
}

function getNextDayName(currentDay: string): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const idx = days.indexOf(currentDay);
  return days[(idx + 1) % 7];
}

function makeId(dateStr: string, sessionKey: string, category: string, index: number): string {
  return `smart-${dateStr}-${sessionKey}-${category}-${index}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============ GENERATOR ============

export function generateSmartTasks(ctx: SmartTaskContext): SmartTask[] {
  const tasks: SmartTask[] = [];
  const totalEvents = ctx.todayClasses.length + ctx.todayCalendarEvents.length;
  const isRestDay = totalEvents === 0;
  const isHeavyDay = totalEvents >= 5;
  const isMarathonDay = totalEvents >= 7;
  const backToBack = hasBackToBack(ctx.todayClasses);
  const comp = getCompetitionProximity(ctx.competitions);

  // Track per-session task indices by category
  const counters: Record<string, Record<string, number>> = {};
  function addTask(sessionKey: string, category: SmartTask['category'], text: string, icon: string) {
    if (!counters[sessionKey]) counters[sessionKey] = {};
    if (!counters[sessionKey][category]) counters[sessionKey][category] = 0;
    const idx = counters[sessionKey][category]++;
    tasks.push({
      id: makeId(ctx.dateStr, sessionKey, category, idx),
      sessionKey,
      text,
      category,
      icon,
    });
  }

  // ─── 1. HYDRATION (all sessions) ───
  const totalOz = getHydrationTargetOz(totalEvents);
  SESSION_KEYS.forEach((key, i) => {
    const oz = roundToNearest2(totalOz * HYDRATION_WEIGHTS[i]);
    const hint = key === 'pre-sleep' ? ' (sip, not chug)' : '';
    addTask(key, 'hydration', `Drink ${oz}oz water${hint}`, 'droplets');
  });

  // ─── 2. FUEL (morning, midday, evening) ───
  if (isRestDay) {
    addTask('morning-wake', 'fuel', 'Light balanced meal — rest day', 'egg');
  } else if (isMarathonDay) {
    addTask('morning-wake', 'fuel', `Max fuel — ${totalEvents} classes today. Protein + carbs + healthy fats`, 'egg');
  } else if (totalEvents >= 4) {
    addTask('morning-wake', 'fuel', `Big fuel-up — ${totalEvents} classes today, need sustained energy`, 'egg');
  } else {
    addTask('morning-wake', 'fuel', `Protein + complex carbs — ${totalEvents} class${totalEvents !== 1 ? 'es' : ''} today`, 'egg');
  }

  if (totalEvents >= 4) {
    addTask('midday-recharge', 'fuel', 'Quick fuel between classes — banana + protein bar', 'apple');
  } else if (!isRestDay) {
    addTask('midday-recharge', 'fuel', 'Real meal — not snacks. Protein + veggies', 'salad');
  } else {
    addTask('midday-recharge', 'fuel', 'Balanced lunch — enjoy your rest day', 'salad');
  }

  if (totalEvents >= 5) {
    addTask('evening-wind', 'fuel', `Recovery dinner — protein for muscle repair after ${totalEvents} classes`, 'utensils');
  } else if (!isRestDay) {
    addTask('evening-wind', 'fuel', `Dinner with protein — you taught ${totalEvents} class${totalEvents !== 1 ? 'es' : ''} today`, 'utensils');
  } else {
    addTask('evening-wind', 'fuel', 'Dinner — enjoy a proper meal', 'utensils');
  }

  // ─── 3. MOVEMENT (midday, afternoon, + morning if back-to-back) ───
  if (isRestDay) {
    addTask('midday-recharge', 'movement', 'Movement break — 15min walk or stretch', 'footprints');
    addTask('afternoon-push', 'movement', 'Get outside if you can — fresh air recharge', 'trees');
  } else {
    addTask('midday-recharge', 'movement', 'Gentle stretch only — saving energy for classes', 'stretch');
    if (backToBack) {
      addTask('morning-wake', 'movement', 'Pre-teach body warm-up — back-to-back classes today', 'flame');
    }
  }

  // ─── 4. MENTAL/FOCUS (peak-focus, afternoon) ───
  if (isHeavyDay) {
    addTask('peak-focus', 'mental', 'Set 3 priorities max — energy conservation mode', 'brain');
  } else if (isRestDay) {
    addTask('peak-focus', 'mental', 'Deep work block — no classes today, use this focus window', 'brain');
  } else {
    addTask('peak-focus', 'mental', `Plan your ${totalEvents} class${totalEvents !== 1 ? 'es' : ''} — review notes from last week`, 'brain');
  }

  if (isHeavyDay) {
    addTask('afternoon-push', 'mental', `You're past the halfway mark — ${Math.ceil(totalEvents / 2)} classes done, keep going`, 'biceps');
  }

  // ─── 5. COMPETITION PREP (when <14 days away) ───
  if (comp) {
    if (comp.daysAway === 0) {
      addTask('morning-wake', 'prep', 'Competition day! Deep breaths — you and your dancers are ready', 'trophy');
    } else if (comp.daysAway <= 3) {
      addTask('morning-wake', 'prep', `${comp.daysAway} day${comp.daysAway !== 1 ? 's' : ''} to ${comp.name} — confirm travel & logistics`, 'clipboard');
      addTask('evening-wind', 'prep', 'Final prep — lay out competition outfits & supplies', 'briefcase');
    } else if (comp.daysAway <= 7) {
      addTask('afternoon-push', 'prep', `${comp.daysAway} days to ${comp.name} — check packing list`, 'clipboard');
      addTask('peak-focus', 'prep', 'Mental rehearsal — visualize competition routines', 'target');
    } else {
      addTask('afternoon-push', 'prep', `${comp.daysAway} days to ${comp.name} — review schedule`, 'calendar');
    }
  }

  // ─── 6. RECOVERY (evening, pre-sleep) ───
  if (isHeavyDay) {
    addTask('evening-wind', 'recovery', `Ice bath or hot soak — you taught ${totalEvents} classes today`, 'bath');
  } else if (!isRestDay) {
    addTask('evening-wind', 'recovery', 'Gentle self-care — you earned it', 'sparkles');
  }

  // Pre-sleep: tomorrow preview with actual class count
  const nextDay = getNextDayName(ctx.currentDay);
  const nextDayLabel = capitalize(nextDay);
  if (ctx.tomorrowClassCount > 0 && ctx.tomorrowFirstClassTime) {
    const firstTime = formatTime12(ctx.tomorrowFirstClassTime);
    addTask('pre-sleep', 'recovery',
      `Tomorrow: ${ctx.tomorrowClassCount} class${ctx.tomorrowClassCount !== 1 ? 'es' : ''}, first at ${firstTime}`,
      'moon'
    );
  } else if (ctx.tomorrowClassCount > 0) {
    addTask('pre-sleep', 'recovery',
      `Tomorrow: ${ctx.tomorrowClassCount} class${ctx.tomorrowClassCount !== 1 ? 'es' : ''} on ${nextDayLabel}`,
      'moon'
    );
  } else {
    addTask('pre-sleep', 'recovery', `Tomorrow is ${nextDayLabel} — no classes, rest up`, 'moon');
  }

  return tasks;
}
