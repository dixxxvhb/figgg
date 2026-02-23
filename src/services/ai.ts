import { getAuthToken, initAuthToken } from './cloudStorage';
import type { LiveNote } from '../types';
import type { AIContextPayload, } from './aiContext';

const API_BASE = '/.netlify/functions';

interface GeneratePlanResponse {
  success: boolean;
  plan: string;
  generatedAt: string;
  classId: string;
  className: string;
}

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

async function getToken(): Promise<string> {
  await initAuthToken();
  return getAuthToken();
}

export async function generatePlan(options: GeneratePlanOptions): Promise<string> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/generatePlan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data: GeneratePlanResponse = await response.json();
  return data.plan;
}

export async function detectReminders(
  className: string,
  notes: LiveNote[],
): Promise<Array<{ noteId: string; title: string }>> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/detectReminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ className, notes }),
  });

  if (!response.ok) {
    return []; // Silently fail — reminders are a bonus
  }

  const data = await response.json();
  return data.reminders || [];
}

export interface AIAction {
  type:
    | 'toggleWellness'      // mark wellness item done/undone
    | 'addReminder'         // create a new task
    | 'completeReminder'    // mark existing task done by title match
    | 'flagReminder'        // flag/unflag a task by title match
    | 'rescheduleReminder'  // change due date of a task
    | 'logDose'             // log next available dose
    | 'skipDose'            // skip remaining doses today
    | 'updatePlanSummary'   // change day plan summary text
    | 'reprioritizePlan'    // reorder day plan items by priority
    | 'addPlanItem'         // inject a new item into today's plan
    | 'removePlanItem'      // remove a plan item by id or title
    | 'suggestOptionalDose3' // suggest a 3rd dose for a long/heavy day
    | 'reschedulePlanItem'  // change a plan item's time
    | 'batchToggleWellness' // check off multiple wellness items at once
    | 'setDayMode'          // set day mode (light/normal/intense/comp) — adapts wellness + plan
    | 'addWeekReflection'   // store a weekly reflection in weekNotes
    // Class exception actions
    | 'markClassException'  // mark today's classes as cancelled or covered by a sub
    // Class note actions
    | 'addClassNote'        // add a live note to a specific class this week
    | 'setClassPlan'        // set the weekly plan text for a class
    | 'setNextWeekGoal'     // set the next-week goal for a class
    // Launch plan actions
    | 'completeLaunchTask'  // mark a DWDC launch task as done
    | 'skipLaunchTask'      // skip a DWDC launch task
    | 'addLaunchNote'       // add a note to a DWDC launch task
    // Rehearsal note actions
    | 'addRehearsalNote'    // add a rehearsal note to a competition dance
    // Disruption actions
    | 'startDisruption'
    | 'endDisruption'
    // Multi-day operations
    | 'markClassExceptionRange'
    | 'batchRescheduleTasks'
    | 'assignSub'
    | 'clearWeekPlan'
    | 'generateCatchUpPlan';
  // Common fields
  id?: string;
  ids?: string[];  // for batch operations
  dayMode?: 'light' | 'normal' | 'intense' | 'comp';  // for setDayMode
  done?: boolean;
  title?: string;
  dueDate?: string;
  flagged?: boolean;
  // Plan item fields
  category?: string;
  priority?: string;
  time?: string;
  aiNote?: string;
  sourceId?: string;
  // Summary field
  summary?: string;
  // Reprioritize: ordered list of plan item IDs
  order?: string[];
  // Week reflection fields
  wentWell?: string;
  challenges?: string;
  nextWeekFocus?: string;
  aiSummary?: string;
  // Class exception fields
  scope?: 'all' | 'specific';
  classIds?: string[];
  exceptionType?: 'cancelled' | 'subbed';
  subName?: string;
  reason?: string;
  // Class note fields
  classId?: string;
  text?: string;
  noteCategory?: string;
  plan?: string;
  goal?: string;
  // Launch task fields
  taskId?: string;
  note?: string;
  // Rehearsal note fields
  danceId?: string;
  notes?: string;
  workOn?: string[];
  // Disruption fields
  disruptionType?: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
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
  const token = await getToken();

  const response = await fetch(`${API_BASE}/expandNotes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ className, date, notes }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.expanded as string;
}

export async function callAICheckIn(
  payload: AIContextPayload,
): Promise<{ response: string; mood?: string; adjustments?: string[]; actions?: AIAction[] }> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/aiCheckIn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function callGenerateDayPlan(
  payload: AIContextPayload & { checkInMood?: string; checkInMessage?: string },
): Promise<{ items: unknown[]; summary: string }> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/generateDayPlan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface AIChatRequest {
  mode: import('../types').AIChatMode;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  context: AIContextPayload & {
    disruption?: import('../types').DisruptionState;
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
  const token = await getToken();

  const response = await fetch(`${API_BASE}/aiChat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
