import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { LiveNote } from '../types';
import type { AIContextPayload } from './aiContext';

interface GeneratePlanClassInfo {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  level?: string;
  recitalSong?: string;
  isRecitalSong?: boolean;
  choreographyNotes?: string;
}

interface GeneratePlanOptions {
  classInfo: GeneratePlanClassInfo;
  notes: LiveNote[];
  previousPlans?: string[];
  progressionHints?: string[];
  repetitionFlags?: string[];
  attendanceNote?: string;
  expandedSummary?: string;
}

export async function generatePlan(options: GeneratePlanOptions): Promise<string> {
  const fn = httpsCallable<GeneratePlanOptions, { plan: string }>(functions, 'generatePlan');
  const result = await fn(options);
  return result.data.plan;
}

export async function detectReminders(
  className: string,
  notes: LiveNote[],
): Promise<Array<{ noteId: string; title: string }>> {
  try {
    const fn = httpsCallable<{ className: string; notes: LiveNote[] }, { reminders: Array<{ noteId: string; title: string }> }>(functions, 'detectReminders');
    const result = await fn({ className, notes });
    return result.data.reminders || [];
  } catch {
    return []; // Silently fail — reminders are a bonus
  }
}

export interface AIAction {
  type:
    | 'toggleWellness'
    | 'addReminder'
    | 'completeReminder'
    | 'flagReminder'
    | 'rescheduleReminder'
    | 'logDose'
    | 'skipDose'
    | 'updatePlanSummary'
    | 'reprioritizePlan'
    | 'addPlanItem'
    | 'removePlanItem'
    | 'suggestOptionalDose3'
    | 'reschedulePlanItem'
    | 'batchToggleWellness'
    | 'setDayMode'
    | 'addWeekReflection'
    | 'markClassException'
    | 'addClassNote'
    | 'setClassPlan'
    | 'setNextWeekGoal'
    | 'completeLaunchTask'
    | 'skipLaunchTask'
    | 'addLaunchNote'
    | 'addRehearsalNote'
    | 'markClassExceptionRange'
    | 'batchRescheduleTasks'
    | 'assignSub'
    | 'clearWeekPlan'
    | 'generateCatchUpPlan';
  id?: string;
  ids?: string[];
  dayMode?: 'light' | 'normal' | 'intense' | 'comp';
  done?: boolean;
  title?: string;
  dueDate?: string;
  flagged?: boolean;
  category?: string;
  priority?: string;
  time?: string;
  aiNote?: string;
  sourceId?: string;
  summary?: string;
  order?: string[];
  wentWell?: string;
  challenges?: string;
  nextWeekFocus?: string;
  aiSummary?: string;
  scope?: 'all' | 'specific';
  classIds?: string[];
  exceptionType?: 'cancelled' | 'subbed';
  subName?: string;
  reason?: string;
  classId?: string;
  text?: string;
  noteCategory?: string;
  plan?: string;
  goal?: string;
  taskId?: string;
  note?: string;
  danceId?: string;
  notes?: string;
  workOn?: string[];
  startDate?: string;
  endDate?: string;
  expectedReturn?: string;
  subNames?: string[];
  filter?: 'overdue' | 'due-this-week' | 'all-active';
  newDate?: string;
  dates?: string[];
}

export async function expandNotes(
  className: string,
  date: string,
  notes: LiveNote[],
): Promise<string> {
  const fn = httpsCallable<{ className: string; date: string; notes: LiveNote[] }, { expanded: string }>(functions, 'expandNotes');
  const result = await fn({ className, date, notes });
  return result.data.expanded;
}

export async function callGenerateDayPlan(
  payload: AIContextPayload & { checkInMood?: string; checkInMessage?: string },
): Promise<{ items: unknown[]; summary: string }> {
  const fn = httpsCallable(functions, 'aiChat');
  const result = await fn({ ...payload, mode: 'day-plan' });
  return result.data as { items: unknown[]; summary: string };
}

export interface AIChatRequest {
  mode: import('../types').AIChatMode;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  context: AIContextPayload & {
    classPrep?: {
      classId: string;
      className: string;
      lastWeekNotes: string[];
      thisWeekPlan?: string;
      choreographyNotes?: string[];
      studentFlags?: string[];
      song?: string;
    };
    classCapture?: {
      classId: string;
      className: string;
      plannedContent?: string;
      rawDump: string;
    };
    allActiveReminders?: Array<{ id: string; title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
    upcomingCompetitions?: Array<{ name: string; date: string; daysAway: number }>;
  };
}

export interface AIChatResponse {
  response: string;
  mood?: string;
  adjustments?: string[];
  actions?: AIAction[];
  briefing?: string;
  structuredNotes?: Array<{ text: string; category: string }>;
}

export async function callAIChat(
  request: AIChatRequest,
): Promise<AIChatResponse> {
  const fn = httpsCallable(functions, 'aiChat');
  const result = await fn(request);
  return result.data as AIChatResponse;
}
