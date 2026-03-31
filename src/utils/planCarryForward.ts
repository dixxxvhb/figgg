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
  normalizeNoteCategory,
} from '../types';
import { formatWeekOf } from './time';
import { getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { generatePlan as aiGeneratePlan } from '../services/ai';
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
