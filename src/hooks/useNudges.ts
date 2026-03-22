import { useMemo, useCallback } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { toDateStr } from '../utils/time';
import type { AppData, NudgeDismissState } from '../types';

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

const EMPTY_STATE: NudgeDismissState = { dismissed: {}, snoozed: {} };

// Migrate any existing localStorage nudge state to Firestore (one-time)
function migrateLocalStorageNudgeState(): NudgeDismissState | null {
  try {
    const raw = localStorage.getItem('figgg-nudge-state');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NudgeDismissState;
    // Remove from localStorage after migration
    localStorage.removeItem('figgg-nudge-state');
    return parsed;
  } catch {
    localStorage.removeItem('figgg-nudge-state');
    return null;
  }
}

export function useNudges(
  data: AppData,
  updateNudgeState?: (state: NudgeDismissState) => void
): { nudges: Nudge[]; dismissNudge: (id: string) => void; snoozeNudge: (id: string) => void } {

  // One-time migration: if localStorage has nudge state but Firestore doesn't, migrate it
  const nudgeState = useMemo(() => {
    const synced = data.nudgeState;
    if (synced && (Object.keys(synced.dismissed).length > 0 || Object.keys(synced.snoozed).length > 0)) {
      // Already have synced state — clean up any leftover localStorage
      localStorage.removeItem('figgg-nudge-state');
      return synced;
    }
    // Check for localStorage state to migrate
    const local = migrateLocalStorageNudgeState();
    if (local && updateNudgeState) {
      // Migrate to Firestore
      updateNudgeState(local);
      return local;
    }
    return synced || EMPTY_STATE;
  }, [data.nudgeState, updateNudgeState]);

  const dismissNudge = useCallback((nudgeId: string) => {
    const updated: NudgeDismissState = {
      dismissed: { ...nudgeState.dismissed, [nudgeId]: new Date().toISOString() },
      snoozed: { ...nudgeState.snoozed },
    };
    updateNudgeState?.(updated);
  }, [nudgeState, updateNudgeState]);

  const snoozeNudge = useCallback((nudgeId: string) => {
    const updated: NudgeDismissState = {
      dismissed: { ...nudgeState.dismissed },
      snoozed: { ...nudgeState.snoozed, [nudgeId]: new Date().toISOString() },
    };
    updateNudgeState?.(updated);
  }, [nudgeState, updateNudgeState]);

  const nudges = useMemo(() => {
    const now = new Date();
    const todayStr = toDateStr(now);
    const result: Nudge[] = [];

    // Master nudge toggle
    if (data.settings?.nudgesEnabled === false) return result;

    // Sensitivity presets
    const sensitivity = data.settings?.nudgeSensitivity || 'balanced';
    const thresholds = {
      aggressive: { overdue: 3, medsGap: 1, launchStale: 3, wellness: 0.2 },
      balanced: { overdue: 5, medsGap: 2, launchStale: 7, wellness: 0.3 },
      quiet: { overdue: 10, medsGap: 5, launchStale: 14, wellness: 0.15 },
    }[sensitivity];
    const snoozeDuration = data.settings?.nudgeSnoozeDurationHours ?? 24;
    const maxNudges = data.settings?.nudgeMaxVisible ?? 3;

    // Helper to check if nudge is dismissed/snoozed
    const isActive = (id: string): boolean => {
      if (nudgeState.dismissed[id]) return false;
      if (nudgeState.snoozed[id]) {
        const snoozedAt = new Date(nudgeState.snoozed[id]);
        const hoursSince = (now.getTime() - snoozedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < snoozeDuration) return false;
      }
      return true;
    };

    const sc = data.selfCare;
    const reminders = sc?.reminders || [];

    // Rule 1: Overdue tasks
    const overdueCount = reminders.filter(r => !r.completed && r.dueDate && r.dueDate < todayStr).length;
    if (overdueCount > thresholds.overdue && isActive('overdue-tasks')) {
      result.push({
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
      const daysSince = differenceInCalendarDays(now, parseISO(lastDoseDate));
      if (daysSince >= thresholds.medsGap && isActive('meds-gap')) {
        result.push({
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
        const daysAway = differenceInCalendarDays(parseISO(comp.date), now);
        if (daysAway <= 14 && daysAway > 0) {
          const compDances = dances.filter(d => comp.dances.includes(d.id));
          const missingNotes = compDances.filter(d => !d.rehearsalNotes || d.rehearsalNotes.length === 0);
          if (missingNotes.length > 0 && isActive(`comp-prep-${comp.id}`)) {
            result.push({
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

    // Rule 4: No launch tasks completed recently
    // Skip if plan was just updated (give grace period after rebuilds)
    const launchTasks = data.launchPlan?.tasks || [];
    const activeLaunch = launchTasks.filter(t => !t.completed && !t.skipped);
    const planLastModified = data.launchPlan?.lastModified;
    const daysSincePlanUpdate = planLastModified
      ? differenceInCalendarDays(now, new Date(planLastModified))
      : 999;

    if (activeLaunch.length > 0 && daysSincePlanUpdate >= 3) {
      // Only look at tasks completed AFTER the plan was last modified
      // (backdated completions from a plan rebuild don't count as "recent progress")
      const recentCompletions = launchTasks
        .filter(t => t.completedAt && (!planLastModified || t.completedAt > planLastModified))
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

      const lastReal = recentCompletions[0];
      const daysSinceReal = lastReal?.completedAt
        ? differenceInCalendarDays(now, new Date(lastReal.completedAt))
        : daysSincePlanUpdate; // Fall back to plan age if no real completions

      if (daysSinceReal >= thresholds.launchStale && isActive('launch-stale')) {
        result.push({
          id: 'launch-stale',
          type: 'launch',
          priority: 'medium',
          text: `No DWD tasks completed in ${daysSinceReal} days. Pick one to move forward.`,
          actionLabel: 'Review tasks',
          aiPreload: 'Help me pick a DWD launch task to work on today.',
          dismissable: true,
          snoozeable: true,
        });
      }
    }

    // Rule 4b: Phase transition — all tasks in current phase complete
    const launchPhases = data.launchPlan?.phases || [];
    const todayStrNudge = todayStr;
    const currentPhases = launchPhases.filter(p => todayStrNudge >= p.startDate && todayStrNudge <= p.endDate);
    for (const phase of currentPhases) {
      const phaseTasks = launchTasks.filter(t => t.phase === phase.id);
      const phaseComplete = phaseTasks.length > 0 && phaseTasks.every(t => t.completed || t.skipped);
      const nextPhase = launchPhases.find(p => p.id === phase.id + 1);
      if (phaseComplete && nextPhase && isActive(`phase-done-${phase.id}`)) {
        result.push({
          id: `phase-done-${phase.id}`,
          type: 'launch',
          priority: 'medium',
          text: `Phase ${phase.id} (${phase.name}) complete! Ready for ${nextPhase.name}?`,
          actionLabel: 'View roadmap',
          aiPreload: `Phase ${phase.id} is done! Help me plan my next steps for ${nextPhase.name}.`,
          dismissable: true,
          snoozeable: true,
        });
        break;
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
      if (now.getHours() >= 14 && percentage < thresholds.wellness && isActive('wellness-low')) {
        result.push({
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
        result.push({
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
    return result
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, maxNudges);
  }, [data, nudgeState]);

  return { nudges, dismissNudge, snoozeNudge };
}
