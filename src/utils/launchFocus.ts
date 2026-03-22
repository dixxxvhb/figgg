import type { LaunchTask, LaunchPhase, LaunchPlanData } from '../types';

// ============================================================
// Launch Plan Focus Utilities
// Smart task surfacing, phase awareness, URL inference
// ============================================================

/** Get active phases based on today's date (handles overlapping phases) */
export function getCurrentPhases(phases: LaunchPhase[], today: string = new Date().toISOString().split('T')[0]): LaunchPhase[] {
  return phases.filter(p => today >= p.startDate && today <= p.endDate);
}

/** Get the next upcoming phase (first one that hasn't started yet) */
export function getNextPhase(phases: LaunchPhase[], today: string = new Date().toISOString().split('T')[0]): LaunchPhase | null {
  return phases.find(p => today < p.startDate) ?? null;
}

/** Get phase by ID */
export function getPhaseById(phases: LaunchPhase[], id: number): LaunchPhase | undefined {
  return phases.find(p => p.id === id);
}

/** Check if a task is ready (not completed, not skipped, not blocked, not too early) */
export function isTaskReady(task: LaunchTask, allTasks: LaunchTask[], today: string = new Date().toISOString().split('T')[0]): boolean {
  if (task.completed || task.skipped) return false;
  if (task.suggestedAfter && today < task.suggestedAfter) return false;
  if (task.blockedBy?.length) {
    const allBlockersDone = task.blockedBy.every(bid => {
      const blocker = allTasks.find(t => t.id === bid);
      return blocker && (blocker.completed || blocker.skipped);
    });
    if (!allBlockersDone) return false;
  }
  return true;
}

/** Get decision tasks that block a given task */
export function getBlockingDecisions(taskId: string, allTasks: LaunchTask[]): LaunchTask[] {
  const task = allTasks.find(t => t.id === taskId);
  if (!task?.blockedBy?.length) return [];
  return task.blockedBy
    .map(bid => allTasks.find(t => t.id === bid))
    .filter((t): t is LaunchTask => !!t && t.category === 'DECIDE' && !t.completed && !t.skipped);
}

type WellnessMode = 'okay' | 'rough' | 'survival';

/** Max effort allowed per wellness mode */
function maxEffortForMode(mode: WellnessMode): Set<string> {
  switch (mode) {
    case 'survival': return new Set(['quick']);
    case 'rough': return new Set(['quick', 'medium']);
    case 'okay': return new Set(['quick', 'medium', 'deep']);
  }
}

/** Time-of-day effort preference (evening favors quick tasks) */
function timeOfDayEffortBonus(hour: number): Record<string, number> {
  if (hour < 12) return { deep: 2, medium: 1, quick: 0 }; // morning: prefer deep work
  if (hour < 17) return { deep: 1, medium: 2, quick: 0 }; // afternoon: prefer medium
  return { deep: -2, medium: 0, quick: 2 }; // evening: prefer quick
}

/**
 * Compute the Focus Stack — 2-3 AI-surfaced tasks for right now.
 *
 * Factors: phase alignment, energy/wellness mode, time of day, priority, effort.
 * No API call — pure client-side computation.
 */
export function computeFocusStack(
  tasks: LaunchTask[],
  phases: LaunchPhase[],
  wellnessMode: WellnessMode = 'okay',
  now: Date = new Date(),
): LaunchTask[] {
  const today = now.toISOString().split('T')[0];
  const hour = now.getHours();
  const currentPhases = getCurrentPhases(phases, today);
  const currentPhaseIds = new Set(currentPhases.map(p => p.id));
  const allowedEffort = maxEffortForMode(wellnessMode);
  const timeBonus = timeOfDayEffortBonus(hour);

  // Filter to ready tasks that match energy level
  const ready = tasks.filter(t =>
    isTaskReady(t, tasks, today) && allowedEffort.has(t.effort)
  );

  // Score each task
  const scored = ready.map(t => {
    let score = 100 - t.priority; // higher priority = lower number = higher score
    // Phase alignment bonus: tasks in current phase get +20
    if (t.phase && currentPhaseIds.has(t.phase)) score += 20;
    // Time-of-day bonus
    score += (timeBonus[t.effort] ?? 0) * 3;
    // Milestone tasks get a boost
    if (t.milestone) score += 10;
    return { task: t, score };
  });

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.task);
}

/** Get phase progress stats */
export function getPhaseProgress(tasks: LaunchTask[], phaseId: number): { done: number; total: number; pct: number } {
  const phaseTasks = tasks.filter(t => t.phase === phaseId);
  const done = phaseTasks.filter(t => t.completed || t.skipped).length;
  const total = phaseTasks.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// ============================================================
// Smart URL inference — pattern-match task instructions to known URLs
// ============================================================

const URL_PATTERNS: Array<{ keywords: RegExp; url: string; label: string }> = [
  { keywords: /sunbiz|llc annual report|annual report/i, url: 'https://www.sunbiz.org', label: 'Open Sunbiz' },
  { keywords: /square\s+(account|setup|payment|invoice|billing|recurring)/i, url: 'https://squareup.com/dashboard', label: 'Open Square' },
  { keywords: /stripe/i, url: 'https://dashboard.stripe.com', label: 'Open Stripe' },
  { keywords: /wix|website\s+(page|content|finalize)/i, url: 'https://manage.wix.com', label: 'Open Wix' },
  { keywords: /canva/i, url: 'https://www.canva.com', label: 'Open Canva' },
  { keywords: /@dwdproseries|proseries\s+instagram|instagram.*proseries/i, url: 'https://www.instagram.com/dwdproseries/', label: 'Open Instagram' },
  { keywords: /@DWDCollective|@dancewithdixon|instagram/i, url: 'https://www.instagram.com/DWDCollective/', label: 'Open Instagram' },
  { keywords: /hiscox/i, url: 'https://www.hiscox.com', label: 'Hiscox Insurance' },
  { keywords: /next\s*insurance/i, url: 'https://www.nextinsurance.com', label: 'Next Insurance' },
  { keywords: /dwd.*document|contract|enrollment/i, url: 'https://dwd.netlify.app/director/documents', label: 'DWD Documents' },
  { keywords: /google\s*form/i, url: 'https://docs.google.com/forms', label: 'Google Forms' },
  { keywords: /peerspace|tony.*space/i, url: 'https://www.peerspace.com', label: 'Open Peerspace' },
  { keywords: /quickbooks/i, url: 'https://quickbooks.intuit.com', label: 'Open QuickBooks' },
  { keywords: /exchange\s*dance/i, url: 'https://www.exchangedancestudio.com', label: 'Exchange Dance' },
];

/** Infer an action URL from task content if none is explicitly set */
export function inferActionUrl(task: LaunchTask): { url: string; label: string } | null {
  if (task.actionUrl) return { url: task.actionUrl, label: task.actionLabel ?? 'Open' };
  const text = `${task.title} ${task.instructions}`;
  for (const pattern of URL_PATTERNS) {
    if (pattern.keywords.test(text)) {
      return { url: pattern.url, label: pattern.label };
    }
  }
  return null;
}
