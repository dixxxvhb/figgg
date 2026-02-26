import { useMemo } from 'react';
import type { AppData } from '../types';

export interface Nudge {
  id: string;
  type: 'overdue' | 'meds' | 'competition' | 'launch' | 'wellness' | 'sub';
  priority: 'high' | 'medium' | 'low';
  text: string;
  actionLabel?: string;
  aiPreload?: string;  // pre-filled text for /ai?preload=...
  dismissable: boolean;
  snoozeable: boolean;
}

interface NudgeDismissState {
  dismissed: Record<string, string>;  // nudgeId -> ISO date
  snoozed: Record<string, string>;    // nudgeId -> ISO date (snooze expires after 24h)
}

function loadNudgeState(): NudgeDismissState {
  try {
    const raw = localStorage.getItem('figgg-nudge-state');
    return raw ? JSON.parse(raw) : { dismissed: {}, snoozed: {} };
  } catch {
    return { dismissed: {}, snoozed: {} };
  }
}

export function dismissNudge(nudgeId: string): void {
  const state = loadNudgeState();
  state.dismissed[nudgeId] = new Date().toISOString();
  localStorage.setItem('figgg-nudge-state', JSON.stringify(state));
}

export function snoozeNudge(nudgeId: string): void {
  const state = loadNudgeState();
  state.snoozed[nudgeId] = new Date().toISOString();
  localStorage.setItem('figgg-nudge-state', JSON.stringify(state));
}

export function useNudges(data: AppData): Nudge[] {
  return useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nudgeState = loadNudgeState();
    const nudges: Nudge[] = [];

    // Helper to check if nudge is dismissed/snoozed
    const isActive = (id: string): boolean => {
      if (nudgeState.dismissed[id]) return false;
      if (nudgeState.snoozed[id]) {
        const snoozedAt = new Date(nudgeState.snoozed[id]);
        const hoursSince = (now.getTime() - snoozedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) return false;
      }
      return true;
    };

    const sc = data.selfCare;
    const reminders = sc?.reminders || [];

    // Rule 1: Overdue tasks > 5
    const overdueCount = reminders.filter(r => !r.completed && r.dueDate && r.dueDate < todayStr).length;
    if (overdueCount > 5 && isActive('overdue-tasks')) {
      nudges.push({
        id: 'overdue-tasks',
        type: 'overdue',
        priority: 'high',
        text: `${overdueCount} overdue tasks piling up. Want to triage?`,
        actionLabel: 'Triage with AI',
        aiPreload: `I have ${overdueCount} overdue tasks. Help me triage them.`,
        dismissable: true,
        snoozeable: true,
      });
    }

    // Rule 2: No meds logged in 2+ days
    const lastDoseDate = sc?.dose1Date;
    if (lastDoseDate) {
      const daysSince = Math.ceil((now.getTime() - new Date(lastDoseDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 2 && isActive('meds-gap')) {
        nudges.push({
          id: 'meds-gap',
          type: 'meds',
          priority: 'high',
          text: `No meds logged in ${daysSince} days.`,
          dismissable: true,
          snoozeable: true,
        });
      }
    }

    // Rule 3: Competition within 14 days with missing notes
    const competitions = data.competitions;
    const dances = data.competitionDances;
    for (const comp of competitions) {
      if (comp.date >= todayStr) {
        const daysAway = Math.ceil((new Date(comp.date + 'T00:00:00').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAway <= 14 && daysAway > 0) {
          const compDances = dances.filter(d => comp.dances.includes(d.id));
          const missingNotes = compDances.filter(d => !d.rehearsalNotes || d.rehearsalNotes.length === 0);
          if (missingNotes.length > 0 && isActive(`comp-prep-${comp.id}`)) {
            nudges.push({
              id: `comp-prep-${comp.id}`,
              type: 'competition',
              priority: 'high',
              text: `${comp.name} in ${daysAway} days — ${missingNotes.length} dance${missingNotes.length > 1 ? 's' : ''} missing rehearsal notes.`,
              actionLabel: 'Review dances',
              aiPreload: `${comp.name} is in ${daysAway} days. Help me prepare.`,
              dismissable: true,
              snoozeable: true,
            });
            break; // Only one comp nudge at a time
          }
        }
      }
    }

    // Rule 4: No launch tasks completed in 7+ days
    const launchTasks = data.launchPlan?.tasks || [];
    const activeLaunch = launchTasks.filter(t => !t.completed && !t.skipped);
    if (activeLaunch.length > 0) {
      const lastCompleted = launchTasks
        .filter(t => t.completedAt)
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
        [0];
      if (lastCompleted?.completedAt) {
        const daysSince = Math.ceil((now.getTime() - new Date(lastCompleted.completedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7 && isActive('launch-stale')) {
          nudges.push({
            id: 'launch-stale',
            type: 'launch',
            priority: 'medium',
            text: `No DWDC tasks completed in ${daysSince} days. ${activeLaunch.length} still active.`,
            actionLabel: 'Review tasks',
            aiPreload: 'Help me pick a DWDC launch task to work on today.',
            dismissable: true,
            snoozeable: true,
          });
        }
      }
    }

    // Rule 6: Low wellness completion in the afternoon
    const wellnessItems = data.settings.wellnessItems || [];
    const enabledCount = wellnessItems.filter(w => w.enabled).length;
    if (enabledCount > 0) {
      const states = sc?.unifiedTaskDate === todayStr ? (sc?.unifiedTaskStates || {}) : {};
      const doneCount = Object.values(states).filter(Boolean).length;
      const percentage = doneCount / enabledCount;
      // Simple heuristic: if it's afternoon and below 30%, nudge
      if (now.getHours() >= 14 && percentage < 0.3 && isActive('wellness-low')) {
        nudges.push({
          id: 'wellness-low',
          type: 'wellness',
          priority: 'medium',
          text: `Only ${doneCount}/${enabledCount} wellness items done today.`,
          dismissable: true,
          snoozeable: true,
        });
      }
    }

    // Rule 7: Weekly reflection — Friday after 3pm or Sunday, no reflection for this week
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
    const isFridayAfternoon = dayOfWeek === 5 && now.getHours() >= 15;
    const isSunday = dayOfWeek === 0;
    if ((isFridayAfternoon || isSunday) && isActive('weekly-reflection')) {
      // Check if a reflection exists for this week
      const weekNotes = data.weekNotes || [];
      const sortedWeeks = [...weekNotes].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      const latestWithReflection = sortedWeeks.find(w => w.reflection);
      // Consider "this week" as the last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const hasRecentReflection = latestWithReflection &&
        new Date(latestWithReflection.weekOf) >= sevenDaysAgo;

      if (!hasRecentReflection) {
        nudges.push({
          id: 'weekly-reflection',
          type: 'wellness',
          priority: 'medium',
          text: 'End of the week. Ready for a reflection?',
          actionLabel: 'Reflect with AI',
          aiPreload: "Let's do a weekly reflection",
          dismissable: true,
          snoozeable: true,
        });
      }
    }

    // Sort by priority, return max 3
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return nudges
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 3);
  }, [data]);
}
