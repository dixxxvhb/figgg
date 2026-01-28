import { useMemo } from 'react';
import type { SelfCareData, ADHDSessions, ADHDTaskStates } from '../types';

const DEFAULT_SESSIONS: ADHDSessions = {
  'morning-wake': { title: 'Wake Up', timeRange: '10:00 AM', tasks: ['Take Adderall with water', 'Eat protein breakfast', 'Hydrate (16oz water)', 'Natural light exposure'] },
  'peak-focus': { title: 'Peak Focus Window', timeRange: '11:30 AM', tasks: ['Tackle #1 priority task', 'Work in 25min focus blocks', 'Take 5min breaks between blocks'] },
  'midday-recharge': { title: 'Midday Reset', timeRange: '2:30 PM', tasks: ['Eat real meal (not snacks)', 'Movement (15min walk/stretch)', 'Hydration check'] },
  'afternoon-push': { title: 'Afternoon Session', timeRange: '4:00 PM', tasks: ['Complete remaining priorities', 'Check if 2nd dose needed', 'Process communications'] },
  'evening-wind': { title: 'Wind Down', timeRange: '7:00 PM', tasks: ['Dinner with protein', 'Review today (wins only)', 'Plan tomorrow (3 tasks max)'] },
  'pre-sleep': { title: 'Sleep Prep', timeRange: '10:00 PM', tasks: ['Reduce screen brightness', 'Evening hygiene', 'Phone across room'] }
};

function parseTimeRange(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function isToday(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

function getDoseStatus(elapsed: number, medType: 'IR' | 'XR'): string {
  const hours = elapsed / (60 * 60 * 1000);
  if (medType === 'IR') {
    if (hours < 1) return 'Building';
    if (hours <= 3) return 'Peak Window';
    if (hours < 5) return 'Wearing Off';
    return 'Expired';
  } else {
    if (hours < 4) return 'Building';
    if (hours <= 7) return 'Peak Window';
    if (hours < 10) return 'Tapering';
    return 'Expired';
  }
}

function getCurrentSessionKey(sessions: ADHDSessions): string {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionTimes = Object.entries(sessions).map(([key, data]) => ({
    key,
    minutes: parseTimeRange(data.timeRange)
  })).sort((a, b) => a.minutes - b.minutes);

  if (sessionTimes.length === 0) return '';
  if (currentMinutes < sessionTimes[0].minutes) {
    return sessionTimes[sessionTimes.length - 1].key;
  }
  for (let i = 0; i < sessionTimes.length; i++) {
    const current = sessionTimes[i];
    const next = sessionTimes[i + 1];
    if (next && currentMinutes >= current.minutes && currentMinutes < next.minutes) return current.key;
    if (!next && currentMinutes >= current.minutes) return current.key;
  }
  return sessionTimes[0].key;
}

export interface SelfCareStatus {
  // Medication
  dose1Active: boolean;
  dose1Status: string | null;
  dose1StatusColor: string;
  dose2Active: boolean;
  dose2Status: string | null;
  medType: 'IR' | 'XR';
  // Current session
  currentSessionKey: string;
  currentSessionTitle: string;
  currentSessionTime: string;
  // Progress
  completedSessions: number;
  totalSessions: number;
  overallProgress: number; // 0-100
  // Streak
  currentStreak: number;
  // Has data
  hasData: boolean;
}

export function useSelfCareStatus(selfCare: SelfCareData | undefined): SelfCareStatus {
  return useMemo(() => {
    const sc = selfCare || {};
    const sessions = (sc.sessions && Object.keys(sc.sessions).length > 0) ? sc.sessions : DEFAULT_SESSIONS;
    const states = sc.sessionStates || {};
    const medType = sc.medType || 'IR';
    const now = Date.now();

    // Medication status
    const dose1Active = isToday(sc.dose1Time);
    const dose1Status = dose1Active ? getDoseStatus(now - sc.dose1Time!, medType) : null;
    const dose2Active = isToday(sc.dose2Time);
    const dose2Status = dose2Active ? getDoseStatus(now - sc.dose2Time!, medType) : null;

    const dose1StatusColor = dose1Status ? getDoseStatusColorValue(dose1Status) : '';

    // Current session
    const currentSessionKey = getCurrentSessionKey(sessions);
    const currentSession = sessions[currentSessionKey];

    // Progress calculation
    let completedSessions = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    const sessionKeys = Object.keys(sessions);

    for (const key of sessionKeys) {
      const session = sessions[key];
      const state = states[key] || {};
      const taskCount = session.tasks.length;
      const doneCount = Object.values(state).filter(Boolean).length;
      totalTasks += taskCount;
      completedTasks += doneCount;
      if (taskCount > 0 && doneCount >= Math.ceil(taskCount * 0.5)) {
        completedSessions++;
      }
    }

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const currentStreak = sc.streakData?.currentStreak || 0;

    return {
      dose1Active,
      dose1Status,
      dose1StatusColor,
      dose2Active,
      dose2Status,
      medType,
      currentSessionKey,
      currentSessionTitle: currentSession?.title || '',
      currentSessionTime: currentSession?.timeRange || '',
      completedSessions,
      totalSessions: sessionKeys.length,
      overallProgress,
      currentStreak,
      hasData: !!(sc.sessions || sc.dose1Time || sc.streakData),
    };
  }, [selfCare]);
}

function getDoseStatusColorValue(status: string): string {
  switch (status) {
    case 'Building': return 'text-amber-500 dark:text-amber-400';
    case 'Peak Window': return 'text-green-500 dark:text-green-400';
    case 'Wearing Off':
    case 'Tapering': return 'text-orange-500 dark:text-orange-400';
    case 'Expired': return 'text-red-500 dark:text-red-400';
    default: return 'text-blush-500';
  }
}
