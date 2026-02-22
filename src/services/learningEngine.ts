import { loadData, saveData } from './storage';
import { getClassesByDay } from '../data/classes';
import type { DailySnapshot, WeeklySummary, LearningData, AppData, DayOfWeek } from '../types';

const MAX_SNAPSHOTS = 30;
const MAX_SUMMARIES = 12;

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function msToHHmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function avgTimeStrings(times: string[]): string | undefined {
  if (times.length === 0) return undefined;
  const totalMinutes = times.reduce((sum, t) => {
    const [h, m] = t.split(':').map(Number);
    return sum + h * 60 + m;
  }, 0);
  const avg = Math.round(totalMinutes / times.length);
  return `${String(Math.floor(avg / 60)).padStart(2, '0')}:${String(avg % 60).padStart(2, '0')}`;
}

/**
 * Generate a snapshot for yesterday (or a specific date).
 * Reads from the current app data — selfCare, reminders, classes, wellness states.
 */
export function generateDailySnapshot(data: AppData, dateStr?: string): DailySnapshot | null {
  const targetDate = dateStr || formatDateKey(new Date(Date.now() - 86400000)); // yesterday
  const sc = data.selfCare;

  // Check if selfCare has data for target date
  const dose1Date = sc?.dose1Date;
  const dose2Date = sc?.dose2Date;
  const dose3Date = sc?.dose3Date;

  // Only generate if there's some data for that day
  // Wellness states are stored in unifiedTaskStates, guarded by unifiedTaskDate
  const wellnessStates = (sc?.unifiedTaskDate === targetDate) ? (sc?.unifiedTaskStates || {}) : {};
  const wellnessCompleted = Object.entries(wellnessStates)
    .filter(([_, v]) => v === true)
    .map(([k]) => k);

  // Count today's classes
  const targetDay = new Date(targetDate);
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[targetDay.getDay()];
  const classesScheduled = getClassesByDay(data.classes, dayName).length;

  // Tasks (reminders)
  const reminders = sc?.reminders || [];
  const tasksTotal = reminders.filter(r => !r.completed || r.dueDate === targetDate).length;
  const tasksCompleted = reminders.filter(r => r.completed).length;

  // Build snapshot
  const snapshot: DailySnapshot = {
    date: targetDate,
    wellnessCompleted,
    wellnessTotal: Object.keys(wellnessStates).length || wellnessCompleted.length,
    tasksCompleted: Math.min(tasksCompleted, tasksTotal),
    tasksTotal,
    classesScheduled,
  };

  if (sc?.dose1Time && dose1Date === targetDate) snapshot.dose1Time = msToHHmm(sc.dose1Time);
  if (sc?.dose2Time && dose2Date === targetDate) snapshot.dose2Time = msToHHmm(sc.dose2Time);
  if (sc?.dose3Time && dose3Date === targetDate) snapshot.dose3Time = msToHHmm(sc.dose3Time);
  if (sc?.skippedDoseDate === targetDate || sc?.skippedDose3Date === targetDate) snapshot.skippedDoses = true;

  return snapshot;
}

/**
 * Generate a weekly summary from the last 7 daily snapshots.
 */
export function generateWeeklySummary(snapshots: DailySnapshot[], weekOfStr: string): WeeklySummary {
  const dose1Times = snapshots.map(s => s.dose1Time).filter(Boolean) as string[];
  const dose2Times = snapshots.map(s => s.dose2Time).filter(Boolean) as string[];

  const totalWellness = snapshots.reduce((s, d) => s + d.wellnessCompleted.length, 0);
  const totalWellnessMax = snapshots.reduce((s, d) => s + Math.max(d.wellnessTotal, 1), 0);
  const wellnessRate = totalWellnessMax > 0 ? Math.round((totalWellness / totalWellnessMax) * 100) : 0;

  const totalTasks = snapshots.reduce((s, d) => s + d.tasksCompleted, 0);
  const totalTasksMax = snapshots.reduce((s, d) => s + Math.max(d.tasksTotal, 1), 0);
  const taskCompletionRate = totalTasksMax > 0 ? Math.round((totalTasks / totalTasksMax) * 100) : 0;

  // Compute simple patterns
  const patterns: string[] = [];
  if (dose1Times.length > 0) patterns.push(`Dose 1 avg: ${avgTimeStrings(dose1Times)}`);
  if (dose2Times.length > 0) patterns.push(`Dose 2 avg: ${avgTimeStrings(dose2Times)}`);
  patterns.push(`Wellness: ${wellnessRate}%`);
  patterns.push(`Tasks: ${taskCompletionRate}%`);

  const classDays = snapshots.filter(s => s.classesScheduled > 0).length;
  patterns.push(`${classDays}/${snapshots.length} class days`);

  // Detect evening wellness skip pattern
  const eveningSkipCount = snapshots.filter(s => {
    const eveningItems = s.wellnessCompleted.filter(id => id.startsWith('ev_'));
    return eveningItems.length === 0 && s.wellnessTotal > 0;
  }).length;
  if (eveningSkipCount >= 4 && snapshots.length >= 5) {
    patterns.push(`Skipped evening items ${eveningSkipCount}/${snapshots.length} days`);
  }

  return {
    weekOf: weekOfStr,
    avgDose1Time: avgTimeStrings(dose1Times),
    avgDose2Time: avgTimeStrings(dose2Times),
    wellnessRate,
    taskCompletionRate,
    patterns,
  };
}

/**
 * Prune old data to keep rolling windows.
 */
export function pruneStaleData(learning: LearningData): LearningData {
  return {
    ...learning,
    dailySnapshots: learning.dailySnapshots.slice(-MAX_SNAPSHOTS),
    weeklySummaries: learning.weeklySummaries.slice(-MAX_SUMMARIES),
  };
}

/**
 * Run on app open — checks if yesterday's snapshot is missing and generates it.
 * Also checks if a weekly summary is due.
 * Returns true if data was updated.
 */
export function runLearningEngine(): boolean {
  const data = loadData();
  const learning: LearningData = data.learningData || {
    dailySnapshots: [],
    weeklySummaries: [],
  };

  let changed = false;
  const yesterday = formatDateKey(new Date(Date.now() - 86400000));
  const today = formatDateKey(new Date());

  // Generate yesterday's snapshot if missing
  if (learning.lastSnapshotDate !== yesterday && learning.lastSnapshotDate !== today) {
    const snapshot = generateDailySnapshot(data, yesterday);
    if (snapshot) {
      // Don't add duplicate
      if (!learning.dailySnapshots.some(s => s.date === yesterday)) {
        learning.dailySnapshots.push(snapshot);
      }
      learning.lastSnapshotDate = yesterday;
      changed = true;
    }
  }

  // Generate weekly summary if this Monday's summary is missing
  const thisMonday = formatDateKey(getMonday(new Date()));
  if (learning.lastSummaryWeek !== thisMonday && learning.dailySnapshots.length >= 3) {
    // Get snapshots from the previous 7 days
    const lastWeekSnapshots = learning.dailySnapshots.filter(s => {
      const diff = (new Date(today).getTime() - new Date(s.date).getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    if (lastWeekSnapshots.length > 0) {
      const summary = generateWeeklySummary(lastWeekSnapshots, thisMonday);
      if (!learning.weeklySummaries.some(s => s.weekOf === thisMonday)) {
        learning.weeklySummaries.push(summary);
      }
      learning.lastSummaryWeek = thisMonday;
      changed = true;
    }
  }

  if (changed) {
    const pruned = pruneStaleData(learning);
    saveData({ ...data, learningData: pruned });
  }

  return changed;
}
