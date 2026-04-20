/**
 * Client-side plan carry-forward utility.
 *
 * Provides three exports:
 *   buildFallbackPlan   — build a plain-text plan from notes when AI fails
 *   generateAndSavePlan — fire-and-forget: try AI, fall back to local, write to next week
 *   nextWeekHasPlan     — check if next week already has a non-empty plan for this class
 */

import { addWeeks } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  LiveNote,
  ClassWeekNotes,
  WeekNotes,
  Briefing,
  normalizeNoteCategory,
} from '../types';
import { formatWeekOf } from './time';
import { getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import {
  generatePlan as aiGeneratePlan,
  generateBriefing as aiGenerateBriefing,
} from '../services/ai';
import type { AIContextPayload } from '../services/aiContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarryForwardOptions {
  classId: string;
  classInfo: {
    id: string;
    name: string;
    day: string;
    startTime: string;
    endTime: string;
    level?: string;
    recitalSong?: string;
    isRecitalSong?: boolean;
    choreographyNotes?: string;
  };
  notes: LiveNote[];
  viewingWeekStart: Date;
  saveWeekNotes: (wn: WeekNotes) => void;
  aiContext: AIContextPayload;
  previousPlans?: string[];
  progressionHints?: string[];
  repetitionFlags?: string[];
  attendanceNote?: string;
  expandedSummary?: string;
  eventTitle?: string;
  nextWeekGoal?: string;
}

// ---------------------------------------------------------------------------
// 1. buildFallbackPlan
// ---------------------------------------------------------------------------

/**
 * Build a plain-text fallback plan from notes when AI generation fails.
 *
 * Key fix: ALL notes are included regardless of category — unlabeled/general
 * notes were previously dropped by the old code.
 */
export function buildFallbackPlan(notes: LiveNote[]): string {
  const priority: string[] = [];
  const needsWork: string[] = [];
  const lastWeek: string[] = [];
  const general: string[] = [];
  const ideas: string[] = [];

  for (const note of notes) {
    const cat = normalizeNoteCategory(note.category);
    const text = note.text.trim();
    if (!text) continue;

    switch (cat) {
      case 'next-week':
        priority.push(`- ${text}`);
        break;
      case 'needs-work':
        needsWork.push(`- ${text}`);
        break;
      case 'worked-on':
        lastWeek.push(`- ${text}`);
        break;
      case 'ideas':
        ideas.push(`- ${text}`);
        break;
      default:
        // Covers undefined, null, and any unrecognised value — never drop these
        general.push(`- ${text}`);
        break;
    }
  }

  const sections: string[] = [];

  if (priority.length > 0) {
    sections.push('PRIORITY\n' + priority.join('\n'));
  }
  if (needsWork.length > 0) {
    sections.push('NEEDS WORK\n' + needsWork.join('\n'));
  }
  if (lastWeek.length > 0) {
    sections.push('LAST WEEK\n' + lastWeek.join('\n'));
  }
  if (general.length > 0) {
    sections.push('GENERAL\n' + general.join('\n'));
  }
  if (ideas.length > 0) {
    sections.push('IDEAS\n' + ideas.join('\n'));
  }

  if (sections.length === 0) {
    return 'No notes from last week to carry forward.';
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// 2. generateAndSavePlan
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget: try AI plan generation, fall back to buildFallbackPlan,
 * then write the result into next week's WeekNotes via saveWeekNotes.
 */
export async function generateAndSavePlan(options: CarryForwardOptions): Promise<void> {
  const {
    classId,
    classInfo,
    notes,
    viewingWeekStart,
    saveWeekNotes,
    aiContext,
    previousPlans,
    progressionHints,
    repetitionFlags,
    attendanceNote,
    expandedSummary,
    eventTitle,
    nextWeekGoal,
  } = options;

  // Determine next week's Monday and its weekOf string
  const nextWeekMonday = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekMonday);

  // Generate the plan text
  let planText: string;
  try {
    planText = await aiGeneratePlan({
      classInfo,
      notes,
      previousPlans,
      progressionHints,
      repetitionFlags,
      attendanceNote,
      expandedSummary,
      context: aiContext,
    });
  } catch {
    planText = buildFallbackPlan(notes);
  }

  // Read or create the next-week WeekNotes document
  const existing = getWeekNotesFromStorage(nextWeekOf);

  const nextWeekNotes: WeekNotes = existing ?? {
    id: uuid(),
    weekOf: nextWeekOf,
    classNotes: {},
  };

  // Build the ClassWeekNotes entry for this class, preserving any existing data
  const existingClassNotes: ClassWeekNotes = nextWeekNotes.classNotes[classId] ?? {
    classId,
    plan: '',
    liveNotes: [],
    isOrganized: false,
  };

  const updatedClassNotes: ClassWeekNotes = {
    ...existingClassNotes,
    plan: planText,
    ...(eventTitle !== undefined ? { eventTitle } : {}),
    ...(nextWeekGoal !== undefined ? { weekIdea: nextWeekGoal } : {}),
  };

  const updatedWeekNotes: WeekNotes = {
    ...nextWeekNotes,
    classNotes: {
      ...nextWeekNotes.classNotes,
      [classId]: updatedClassNotes,
    },
  };

  saveWeekNotes(updatedWeekNotes);
}

// ---------------------------------------------------------------------------
// 3. nextWeekHasPlan
// ---------------------------------------------------------------------------

/**
 * Returns true if next week already has a non-empty plan for the given class.
 * Reads directly from localStorage — no React state needed.
 */
export function nextWeekHasPlan(classId: string, viewingWeekStart: Date): boolean {
  const nextWeekMonday = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekMonday);
  const weekNotes = getWeekNotesFromStorage(nextWeekOf);
  if (!weekNotes) return false;
  const classNotes = weekNotes.classNotes[classId];
  return !!classNotes?.plan?.trim();
}

// ===========================================================================
// Briefing-based carry-forward (Apr 2026 redesign — replaces plan blob)
// ===========================================================================

/**
 * Deterministic fallback briefing builder — used when `aiGenerateBriefing`
 * throws or the backend callable isn't available.
 *
 * Rules:
 *  - `recap` = bullet dump of all non-flagged notes, prefixed with a heading.
 *  - `assessment` = "" (UI hides the section when empty).
 *  - `forToday` = verbatim text of each flagged note (≤5 items).
 *  - `generatedAt` = now.
 */
export function buildFallbackBriefing(notes: LiveNote[]): Briefing {
  const flagged = notes.filter(n => n.flaggedForNextWeek && n.text.trim());
  const unflagged = notes.filter(n => !n.flaggedForNextWeek && n.text.trim());

  const recap = unflagged.length > 0
    ? 'Notes from last class:\n' + unflagged.map(n => `- ${n.text.trim()}`).join('\n')
    : 'No notes captured last class.';

  const forToday = flagged.slice(0, 5).map(n => n.text.trim());

  return {
    recap,
    assessment: '',
    forToday,
    generatedAt: new Date().toISOString(),
  };
}

export interface BriefingCarryForwardOptions {
  classId: string;
  classInfo: CarryForwardOptions['classInfo'];
  notes: LiveNote[];
  viewingWeekStart: Date;
  saveWeekNotes: (wn: WeekNotes) => void;
  aiContext: CarryForwardOptions['aiContext'];
  previousBriefings?: Briefing[];
  expandedSummary?: string;
  eventTitle?: string;
}

/**
 * Try AI briefing generation, fall back to buildFallbackBriefing, then write
 * the result into next week's WeekNotes.briefing via saveWeekNotes.
 *
 * Mirrors generateAndSavePlan but writes the structured `briefing` field
 * instead of the legacy `plan` string. `plan` is left untouched on next
 * week's record — new writes do not populate it.
 */
export async function generateAndSaveBriefing(
  options: BriefingCarryForwardOptions,
): Promise<void> {
  const {
    classId,
    classInfo,
    notes,
    viewingWeekStart,
    saveWeekNotes,
    aiContext,
    previousBriefings,
    expandedSummary,
    eventTitle,
  } = options;

  const nextWeekMonday = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekMonday);

  let briefing: Briefing;
  try {
    briefing = await aiGenerateBriefing({
      classInfo,
      notes,
      previousBriefings,
      expandedSummary,
      context: aiContext,
    });
  } catch {
    briefing = buildFallbackBriefing(notes);
  }

  const existing = getWeekNotesFromStorage(nextWeekOf);

  const nextWeekNotes: WeekNotes = existing ?? {
    id: uuid(),
    weekOf: nextWeekOf,
    classNotes: {},
  };

  const existingClassNotes: ClassWeekNotes = nextWeekNotes.classNotes[classId] ?? {
    classId,
    plan: '',
    liveNotes: [],
    isOrganized: false,
  };

  const updatedClassNotes: ClassWeekNotes = {
    ...existingClassNotes,
    briefing,
    ...(eventTitle !== undefined ? { eventTitle } : {}),
  };

  const updatedWeekNotes: WeekNotes = {
    ...nextWeekNotes,
    classNotes: {
      ...nextWeekNotes.classNotes,
      [classId]: updatedClassNotes,
    },
  };

  saveWeekNotes(updatedWeekNotes);
}

/**
 * Returns true if next week already has a `briefing` for the given class.
 * Used by the auto-nav-away safety-net effect to avoid double generation.
 */
export function nextWeekHasBriefing(classId: string, viewingWeekStart: Date): boolean {
  const nextWeekMonday = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekMonday);
  const weekNotes = getWeekNotesFromStorage(nextWeekOf);
  if (!weekNotes) return false;
  const classNotes = weekNotes.classNotes[classId];
  return !!classNotes?.briefing;
}
