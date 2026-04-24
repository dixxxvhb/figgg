import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useSelfCareStatus } from './useSelfCareStatus';
import { useClassTiming } from './useClassTiming';
import { DEFAULT_MED_CONFIG } from '../types';
import { formatWeekOf, getWeekStart } from '../utils/time';

export interface HeroCard {
  id: string;
  kind: 'alert' | 'action' | 'info';
  zone: string;              // `// today`, `// meds`, `// class`
  title: string;             // big line
  body?: string;             // secondary line
  ctaLabel?: string;         // `↗ open`, `↗ log`
  ctaHref?: string;          // /meds, /schedule, etc.
  ruleId: number;            // 1..9, lower = higher priority
  dismissible: boolean;
}

// 9-rule hero priority — first match wins. Adapted from Curtain Up.
export function useHeroPriority(): HeroCard | null {
  const { data } = useAppData();
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const selfCare = useSelfCareStatus(data.selfCare, medConfig);

  const nowMinutes = useMemo(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }, []);

  const { upcomingClass, justEndedClass, minutesUntilNext } = useClassTiming(data, nowMinutes);

  return useMemo<HeroCard | null>(() => {
    const now = new Date();
    const hour = now.getHours();

    // Rule 1 — overdue reminder (due date < today)
    const reminders = data.selfCare?.reminders || [];
    const todayStr = now.toISOString().slice(0, 10);
    const overdue = reminders.find((r) => !r.completed && r.dueDate && r.dueDate < todayStr);
    if (overdue) {
      return {
        id: `overdue-${overdue.id}`,
        kind: 'alert',
        zone: '// overdue',
        title: overdue.title.toLowerCase(),
        body: `due ${overdue.dueDate}. still waiting.`,
        ctaLabel: '↗ tasks',
        ctaHref: '/tasks',
        ruleId: 1,
        dismissible: true,
      };
    }

    // Rule 2 — class starting ≤ 30 min
    if (upcomingClass && minutesUntilNext !== null && minutesUntilNext <= 30) {
      return {
        id: `class-upcoming-${upcomingClass.class.id}`,
        kind: 'action',
        zone: '// class · soon',
        title: upcomingClass.class.name.toLowerCase(),
        body: `starts in ${minutesUntilNext} min${minutesUntilNext === 1 ? '' : 's'}${upcomingClass.studio ? ` · ${upcomingClass.studio.name.toLowerCase()}` : ''}`,
        ctaLabel: '↗ open',
        ctaHref: `/class/${upcomingClass.class.id}`,
        ruleId: 2,
        dismissible: false,
      };
    }

    // Rule 3 — dose 2 window closing (urgent)
    if (selfCare.dose2Window?.closing) {
      return {
        id: 'dose2-closing',
        kind: 'alert',
        zone: '// meds',
        title: 'dose 2 window closing',
        body: `${selfCare.dose2Window.hoursElapsed.toFixed(1)}h since dose 1. take it or lose it.`,
        ctaLabel: '↗ meds',
        ctaHref: '/meds',
        ruleId: 3,
        dismissible: false,
      };
    }

    // Rule 4 — mood not logged by 10am (no check-in with mood in last 20h)
    const checkIns = (data.aiCheckIns || []).filter(c => !!c.mood);
    const latestMood = checkIns.length > 0 ? Date.parse(checkIns[checkIns.length - 1].timestamp) : 0;
    const moodStale = !latestMood || (Date.now() - latestMood) > 20 * 60 * 60 * 1000;
    if (hour >= 10 && moodStale) {
      return {
        id: 'mood-missing',
        kind: 'action',
        zone: '// mood',
        title: 'no mood logged. were you even here.',
        body: 'tap to log.',
        ctaLabel: '↗ log',
        ctaHref: '/me',
        ruleId: 4,
        dismissible: true,
      };
    }

    // Rule 5 — dose 1 not taken by 10am
    if (hour >= 10 && !selfCare.dose1Active) {
      return {
        id: 'dose1-missing',
        kind: 'action',
        zone: '// meds',
        title: 'dose 1. still waiting.',
        body: `${hour}:00 and counting.`,
        ctaLabel: '↗ log',
        ctaHref: '/meds',
        ruleId: 5,
        dismissible: false,
      };
    }

    // Rule 6 — class just ended, no notes yet
    if (justEndedClass) {
      return {
        id: `post-class-${justEndedClass.class.id}`,
        kind: 'action',
        zone: '// post-class',
        title: 'log what happened.',
        body: `${justEndedClass.class.name.toLowerCase()} just ended. thoughts?`,
        ctaLabel: '↗ notes',
        ctaHref: `/class/${justEndedClass.class.id}/notes`,
        ruleId: 6,
        dismissible: true,
      };
    }

    // Rule 7 — dose 2 window approaching
    if (selfCare.dose2Window?.approaching) {
      return {
        id: 'dose2-approaching',
        kind: 'info',
        zone: '// meds',
        title: 'dose 2 soon',
        body: `window opens in ${Math.max(0, (medConfig.dose2WindowStart - selfCare.dose2Window.hoursElapsed)).toFixed(1)}h.`,
        ctaLabel: '↗ meds',
        ctaHref: '/meds',
        ruleId: 7,
        dismissible: true,
      };
    }

    // Rule 8 — upcoming class later today
    if (upcomingClass) {
      return {
        id: `class-today-${upcomingClass.class.id}`,
        kind: 'info',
        zone: '// class · today',
        title: upcomingClass.class.name.toLowerCase(),
        body: `in ${minutesUntilNext} min · ${upcomingClass.class.startTime}`,
        ctaLabel: '↗ open',
        ctaHref: `/class/${upcomingClass.class.id}`,
        ruleId: 8,
        dismissible: true,
      };
    }

    // Rule 9 — default: weekly review prompt or silence
    const weekOf = formatWeekOf(getWeekStart());
    const weekNote = data.weekNotes?.find((w) => w.weekOf === weekOf);
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 && !weekNote) {
      return {
        id: 'week-review',
        kind: 'info',
        zone: '// week',
        title: 'sunday. week not reviewed.',
        body: 'fifteen minutes. be honest.',
        ctaLabel: '↗ review',
        ctaHref: '/week-review',
        ruleId: 9,
        dismissible: true,
      };
    }

    return {
      id: 'idle',
      kind: 'info',
      zone: '// idle',
      title: 'nothing urgent.',
      body: 'enjoy it.',
      ruleId: 9,
      dismissible: false,
    };
  }, [data, selfCare, upcomingClass, justEndedClass, minutesUntilNext, medConfig]);
}
