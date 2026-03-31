# Note Carry-Forward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every class note always generates a next-week plan — whether or not Dixon presses "End Class."

**Architecture:** Three layers: (1) navigate-away auto-trigger on LiveNotes/EventNotes unmount, (2) fixed fallback that includes ALL notes regardless of category, (3) nightly 10pm Cloud Function sweep that catches anything the client missed. All three share extracted utility code.

**Tech Stack:** React 19, TypeScript, Firebase Cloud Functions (Node 22), Anthropic Claude Sonnet

**Spec:** `docs/superpowers/specs/2026-03-31-note-carry-forward-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/planCarryForward.ts` | CREATE | Shared client-side plan generation + fallback logic |
| `src/pages/LiveNotes.tsx` | MODIFY | Replace inline plan logic with shared utility, add auto-trigger |
| `src/pages/EventNotes.tsx` | MODIFY | Replace inline plan logic with shared utility, add auto-trigger |
| `functions/src/utils/planPrompt.ts` | CREATE | Shared prompt builder for generatePlan + nightlySweep |
| `functions/src/generatePlan.ts` | MODIFY | Refactor to use shared prompt builder |
| `functions/src/nightlySweep.ts` | CREATE | 10pm scheduled sweep function |
| `functions/src/index.ts` | MODIFY | Export nightlySweep |

---

### Task 1: Extract server-side prompt builder

**Files:**
- Create: `functions/src/utils/planPrompt.ts`
- Modify: `functions/src/generatePlan.ts`

- [ ] **Step 1: Create `functions/src/utils/planPrompt.ts`**

```typescript
// functions/src/utils/planPrompt.ts

export interface LiveNote {
  id: string;
  timestamp: string;
  text: string;
  category?: "worked-on" | "needs-work" | "next-week" | "ideas"
    | "covered" | "observation" | "reminder" | "choreography";
}

export interface ClassInfo {
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

export function normalizeCategory(cat?: string): string | undefined {
  switch (cat) {
    case 'covered': return 'worked-on';
    case 'observation': return 'needs-work';
    case 'reminder': return 'next-week';
    case 'choreography': return 'ideas';
    default: return cat;
  }
}

export function buildNotesBlock(notes: LiveNote[]): string {
  const nextWeek = notes.filter((n) => normalizeCategory(n.category) === "next-week");
  const needsWork = notes.filter((n) => normalizeCategory(n.category) === "needs-work");
  const workedOn = notes.filter((n) => normalizeCategory(n.category) === "worked-on");
  const ideas = notes.filter((n) => normalizeCategory(n.category) === "ideas");
  const general = notes.filter((n) => !n.category);

  let block = '';
  if (nextWeek.length > 0) {
    block += `FLAGGED FOR NEXT WEEK:\n${nextWeek.map((n) => `- ${n.text}`).join("\n")}\n\n`;
  }
  if (needsWork.length > 0) {
    block += `NEEDS WORK:\n${needsWork.map((n) => `- ${n.text}`).join("\n")}\n\n`;
  }
  if (workedOn.length > 0) {
    block += `WORKED ON:\n${workedOn.map((n) => `- ${n.text}`).join("\n")}\n\n`;
  }
  if (general.length > 0) {
    block += `GENERAL:\n${general.map((n) => `- ${n.text}`).join("\n")}\n\n`;
  }
  if (ideas.length > 0) {
    block += `IDEAS:\n${ideas.map((n) => `- ${n.text}`).join("\n")}\n\n`;
  }
  return block;
}

export interface BuildPlanPromptOptions {
  classInfo: ClassInfo;
  notes: LiveNote[];
  previousPlans?: string[];
  progressionHints?: string[];
  repetitionFlags?: string[];
  attendanceNote?: string;
  expandedSummary?: string;
}

export function buildPlanPrompt(options: BuildPlanPromptOptions): string {
  const { classInfo, notes, previousPlans, progressionHints, repetitionFlags, attendanceNote, expandedSummary } = options;

  const isBalletClass = classInfo.name.toLowerCase().includes("ballet");
  const hasRecitalPiece = classInfo.recitalSong && classInfo.recitalSong.trim() !== '';
  const levelLabel = classInfo.level
    ? classInfo.level.charAt(0).toUpperCase() + classInfo.level.slice(1)
    : (classInfo.name.toLowerCase().includes("advanced") ? "Advanced"
      : classInfo.name.toLowerCase().includes("intermediate") ? "Intermediate"
      : classInfo.name.toLowerCase().includes("beginner") ? "Beginner" : "");

  let context = `CLASS: ${classInfo.name} (${classInfo.day})`;
  if (levelLabel) context += `\nLEVEL: ${levelLabel}`;
  if (hasRecitalPiece) {
    const pieceType = classInfo.isRecitalSong ? "Recital piece" : "Class combo";
    context += `\nCURRENT PIECE: ${pieceType} — "${classInfo.recitalSong}"`;
  }
  if (classInfo.choreographyNotes) {
    context += `\nCHOREO STATUS: ${classInfo.choreographyNotes}`;
  }
  if (attendanceNote) context += `\nATTENDANCE: ${attendanceNote}`;

  const notesBlock = buildNotesBlock(notes);

  let extraContext = '';
  if (expandedSummary && expandedSummary.trim()) {
    extraContext += `ORGANIZED CLASS SUMMARY (teacher-reviewed):\n${expandedSummary.trim()}\n\n`;
  }
  if (progressionHints && progressionHints.length > 0) {
    extraContext += `SUGGESTED PROGRESSIONS (from last week's work):\n${progressionHints.map(h => `- ${h}`).join("\n")}\n\n`;
  }
  if (repetitionFlags && repetitionFlags.length > 0) {
    extraContext += `PATTERNS NOTICED:\n${repetitionFlags.map(f => `- ${f}`).join("\n")}\n\n`;
  }
  if (previousPlans && previousPlans.length > 0) {
    extraContext += `PREVIOUS PLAN (for continuity):\n${previousPlans[0].substring(0, 500)}\n\n`;
  }

  return `You're a dance teacher writing your own quick prep notes for next week's class. You'll glance at these on your phone walking into the studio. Not a lesson plan — your personal cheat sheet.

${context}

THIS WEEK'S NOTES:
${notesBlock}${extraContext}WRITE YOUR PREP NOTES FOR NEXT WEEK. Follow these rules EXACTLY:

FORMAT:
- PLAIN TEXT ONLY. NEVER use: # ## ### ** * \` --- or any markdown syntax. If you output even one # character, the whole plan is ruined.
- Short bullet points with a dash (-)
- Group with simple ALL-CAPS labels on their own line ONLY when needed: PRIORITY, ${isBalletClass ? "BARRE" : "WARMUP"}, CENTER, ACROSS THE FLOOR, CHOREO${hasRecitalPiece ? `, PIECE ("${classInfo.recitalSong}")` : ""}
- Skip any section with nothing to say. Don't force structure.

EXAMPLE OF CORRECT FORMAT:
PRIORITY
- Run chassé combo again, they lost the timing
- Review port de bras from adagio

CENTER
- New tendu combination — add relevé

EXAMPLE OF WRONG FORMAT (NEVER DO THIS):
## Priority
**Run chassé combo** again
- ### Center section

CONTENT PRIORITIES:
1. PRIORITY section FIRST — anything flagged for next week or needing more work. This is what you must not forget.
2. For each section of class you have notes on, write what to DO — not what you did. "Run chassé combo again" not "did chassé combo."
3. If a progression hint makes sense for this ${levelLabel || "class"} level, include it naturally (e.g., "progress jazz splits to traveling version"). Ignore any that feel too advanced or forced.
4. If a pattern was flagged (e.g., "3 weeks on X"), mention it as a nudge: "3 weeks on leaps — vary it or level up?"${hasRecitalPiece ? `\n5. Always include a PIECE section for "${classInfo.recitalSong}" — what to work on, what section to clean, whether to run it full-out.` : ""}

TONE:
- You ARE the teacher. Write like you're scribbling on a Post-it.
- Specific. No generic advice. Every bullet should trace back to something from this week's notes.
- Terse. "Clean landing on switch leaps" not "Focus on improving the quality of landings when performing switch leaps."
- 8-12 bullets total. Ruthlessly cut anything that isn't actionable.
- No preamble, no sign-off, no encouragement, no "Great class!" fluff.`;
}

/** Strip markdown artifacts from AI-generated plan text */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

- [ ] **Step 2: Refactor `functions/src/generatePlan.ts` to use shared builder**

Replace the entire file with:

```typescript
// functions/src/generatePlan.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";
import { buildPlanPrompt, stripMarkdown, type ClassInfo, type LiveNote } from "./utils/planPrompt";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

export const generatePlan = onCall(
  { timeoutSeconds: 60, memory: "256MiB", secrets: [anthropicKey] },
  async (request) => {
    requireAuth(request);

    const { classInfo, notes, previousPlans, progressionHints, repetitionFlags, attendanceNote, expandedSummary } = request.data as {
      classInfo: ClassInfo;
      notes: LiveNote[];
      previousPlans?: string[];
      progressionHints?: string[];
      repetitionFlags?: string[];
      attendanceNote?: string;
      expandedSummary?: string;
    };

    if (!classInfo || !notes) {
      throw new HttpsError("invalid-argument", "Missing classInfo or notes");
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
      const prompt = buildPlanPrompt({ classInfo, notes, previousPlans, progressionHints, repetitionFlags, attendanceNote, expandedSummary });

      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      const planContent = message.content[0].type === "text" ? message.content[0].text : "";

      return {
        success: true,
        plan: stripMarkdown(planContent),
        generatedAt: new Date().toISOString(),
        classId: classInfo.id,
        className: classInfo.name,
      };
    } catch (error) {
      console.error("Error generating plan:", error);
      throw new HttpsError("internal", "Failed to generate plan");
    }
  }
);
```

- [ ] **Step 3: Verify Cloud Functions compile**

Run: `cd ~/figgg/functions && npm run build`
Expected: Clean compilation, no errors.

- [ ] **Step 4: Commit**

```bash
cd ~/figgg
git add functions/src/utils/planPrompt.ts functions/src/generatePlan.ts
git commit -m "refactor: extract shared plan prompt builder from generatePlan"
```

---

### Task 2: Create client-side plan carry-forward utility

**Files:**
- Create: `src/utils/planCarryForward.ts`

- [ ] **Step 1: Create `src/utils/planCarryForward.ts`**

```typescript
// src/utils/planCarryForward.ts
import { addWeeks } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { LiveNote, ClassWeekNotes, WeekNotes, normalizeNoteCategory } from '../types';
import { formatWeekOf } from './time';
import { getWeekNotes as getWeekNotesFromStorage } from '../services/storage';
import { generatePlan as aiGeneratePlan } from '../services/ai';
import type { AIContextPayload } from '../services/aiContext';

interface ClassInfoForAI {
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

export interface CarryForwardOptions {
  classId: string;
  classInfo: ClassInfoForAI;
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

/**
 * Build a fallback plan from notes when AI fails.
 * Always includes ALL notes regardless of category.
 */
export function buildFallbackPlan(notes: LiveNote[]): string {
  const nextWeek = notes.filter(n => normalizeNoteCategory(n.category) === 'next-week');
  const needsWork = notes.filter(n => normalizeNoteCategory(n.category) === 'needs-work');
  const workedOn = notes.filter(n => normalizeNoteCategory(n.category) === 'worked-on');
  const ideas = notes.filter(n => normalizeNoteCategory(n.category) === 'ideas');
  const general = notes.filter(n => {
    const norm = normalizeNoteCategory(n.category);
    return !norm || !['next-week', 'needs-work', 'worked-on', 'ideas'].includes(norm);
  });

  const lines: string[] = [];

  if (nextWeek.length > 0) {
    lines.push('PRIORITY');
    nextWeek.forEach(n => lines.push('- ' + n.text));
  }
  if (needsWork.length > 0) {
    lines.push('NEEDS WORK');
    needsWork.forEach(n => lines.push('- ' + n.text));
  }
  if (workedOn.length > 0) {
    lines.push('LAST WEEK');
    workedOn.forEach(n => lines.push('- ' + n.text));
  }
  if (general.length > 0) {
    lines.push('GENERAL');
    general.forEach(n => lines.push('- ' + n.text));
  }
  if (ideas.length > 0) {
    lines.push('IDEAS');
    ideas.forEach(n => lines.push('- ' + n.text));
  }

  if (lines.length === 0) {
    lines.push('(No categorized notes — review last week\'s notes)');
  }

  return lines.join('\n');
}

/**
 * Write a plan to next week's weekNotes document.
 * Uses field-level approach: reads from localStorage, merges, saves.
 */
function writeToNextWeek(
  options: {
    classId: string;
    plan: string;
    viewingWeekStart: Date;
    saveWeekNotes: (wn: WeekNotes) => void;
    eventTitle?: string;
    nextWeekGoal?: string;
  }
) {
  const { classId, plan, viewingWeekStart, saveWeekNotes, eventTitle, nextWeekGoal } = options;
  const nextWeekStart = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekStart);

  const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf) || {
    id: uuid(),
    weekOf: nextWeekOf,
    classNotes: {},
  };

  const existingClassNotes = nextWeekNotes.classNotes[classId] || {
    classId,
    plan: '',
    liveNotes: [],
    isOrganized: false,
  };

  const updatedNextWeek: WeekNotes = {
    ...nextWeekNotes,
    classNotes: {
      ...nextWeekNotes.classNotes,
      [classId]: {
        ...existingClassNotes,
        plan,
        ...(eventTitle ? { eventTitle } : {}),
        ...(nextWeekGoal ? { weekIdea: nextWeekGoal } : {}),
      },
    },
  };

  saveWeekNotes(updatedNextWeek);
}

/**
 * Fire-and-forget: generate an AI plan for next week and save it.
 * Falls back to buildFallbackPlan if AI fails.
 * Returns the promise so callers can await if needed (but don't have to).
 */
export function generateAndSavePlan(options: CarryForwardOptions): Promise<void> {
  const {
    classId, classInfo, notes, viewingWeekStart, saveWeekNotes, aiContext,
    previousPlans, progressionHints, repetitionFlags, attendanceNote, expandedSummary,
    eventTitle, nextWeekGoal,
  } = options;

  return aiGeneratePlan({
    classInfo,
    notes,
    previousPlans,
    progressionHints,
    repetitionFlags,
    attendanceNote,
    expandedSummary,
    context: aiContext,
  }).then(plan => {
    writeToNextWeek({ classId, plan, viewingWeekStart, saveWeekNotes, eventTitle, nextWeekGoal });
  }).catch(() => {
    const fallback = buildFallbackPlan(notes);
    writeToNextWeek({ classId, plan: fallback, viewingWeekStart, saveWeekNotes, eventTitle, nextWeekGoal });
  });
}

/**
 * Check if next week already has a non-empty plan for this class.
 */
export function nextWeekHasPlan(classId: string, viewingWeekStart: Date): boolean {
  const nextWeekStart = addWeeks(viewingWeekStart, 1);
  const nextWeekOf = formatWeekOf(nextWeekStart);
  const nextWeekNotes = getWeekNotesFromStorage(nextWeekOf);
  const plan = nextWeekNotes?.classNotes[classId]?.plan;
  return !!plan && plan.trim().length > 0;
}
```

- [ ] **Step 2: Verify client compiles**

Run: `cd ~/figgg && npm run build`
Expected: Clean compilation. (The utility isn't imported anywhere yet, but TypeScript should still validate it.)

- [ ] **Step 3: Commit**

```bash
cd ~/figgg
git add src/utils/planCarryForward.ts
git commit -m "feat: add shared plan carry-forward utility with fixed fallback"
```

---

### Task 3: Refactor LiveNotes to use shared utility + add auto-trigger

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

This task replaces the inline plan generation in `endClass` (lines 677-835) with `generateAndSavePlan()`, and adds the navigate-away auto-trigger via `useEffect` cleanup.

- [ ] **Step 1: Add import for planCarryForward at top of LiveNotes.tsx**

At `src/pages/LiveNotes.tsx:16` (after the existing `import { generatePlan as aiGeneratePlan ...}` line), add:

```typescript
import { generateAndSavePlan, nextWeekHasPlan } from '../utils/planCarryForward';
```

- [ ] **Step 2: Add a ref to track in-flight plan generation**

After line 58 (`selfCareRef.current = data.selfCare;`), add:

```typescript
  // Track whether plan generation is in-flight (prevent duplicate triggers)
  const planGenerationFiredRef = useRef(false);
```

- [ ] **Step 3: Add refs for values needed in cleanup**

The `useEffect` cleanup can't access stale state, so we need refs. After the `planGenerationFiredRef`, add:

```typescript
  // Refs for values needed in useEffect cleanup (avoid stale closures)
  const classNotesRef = useRef(classNotes);
  classNotesRef.current = classNotes;
  const weekNotesRef = useRef(weekNotes);
  weekNotesRef.current = weekNotes;
  const viewingWeekStartRef = useRef(viewingWeekStart);
  viewingWeekStartRef.current = viewingWeekStart;
  const aiContextRef = useRef(aiContext);
  aiContextRef.current = aiContext;
```

NOTE: `classNotes` is derived from state — find where it's defined (search for `const classNotes` in the component) and add these refs AFTER that definition. The refs must be placed after the variables they track are declared. The implementer must read the file to find the exact line.

- [ ] **Step 4: Add the navigate-away auto-trigger useEffect**

Add this `useEffect` inside the component body, after the refs from step 3. This fires on unmount:

```typescript
  // Auto-trigger plan generation on navigate-away (unmount)
  useEffect(() => {
    return () => {
      const currentClassNotes = classNotesRef.current;
      const currentViewingWeekStart = viewingWeekStartRef.current;

      // Guards: only fire if there are notes, class wasn't formally ended, and no plan gen in-flight
      if (
        !cls ||
        !classId ||
        currentClassNotes.liveNotes.length === 0 ||
        currentClassNotes.isOrganized ||
        planGenerationFiredRef.current ||
        nextWeekHasPlan(classId, currentViewingWeekStart)
      ) return;

      planGenerationFiredRef.current = true;

      // Gather intelligence (simplified — no progression/repetition for auto-trigger, nightly sweep handles that)
      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
      );
      for (const week of sorted) {
        const notes = week.classNotes[cls.id];
        if (notes?.plan?.trim()) {
          previousPlans.push(notes.plan);
          break;
        }
      }

      const att = currentClassNotes.attendance;
      let attendanceNote: string | undefined;
      if (att) {
        const present = att.present?.length || 0;
        const late = att.late?.length || 0;
        const absent = att.absent?.length || 0;
        const total = present + late + absent;
        if (total > 0) {
          attendanceNote = `${present + late} of ${total} present`;
          if (late > 0) attendanceNote += ` (${late} late)`;
        }
      }

      generateAndSavePlan({
        classId,
        classInfo: {
          id: cls.id,
          name: cls.name,
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
          level: cls.level,
          recitalSong: cls.recitalSong,
          isRecitalSong: cls.isRecitalSong,
          choreographyNotes: cls.choreographyNotes,
        },
        notes: currentClassNotes.liveNotes,
        viewingWeekStart: currentViewingWeekStart,
        saveWeekNotes,
        aiContext: aiContextRef.current,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        attendanceNote,
        nextWeekGoal: currentClassNotes.nextWeekGoal,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — cleanup runs on unmount only
```

- [ ] **Step 5: Replace endClass plan generation with shared utility**

In the `endClass` function (starts at line 652), replace the plan generation block (lines 679-835 — from the `if (notesToProcess.length > 0 && !classNotes.isOrganized && cls)` block through its closing brace, INCLUDING the reminder detection code).

The replacement should:
1. Keep the reminder detection code (lines 837-885) — just move it outside the replaced block
2. Replace the AI plan generation + fallback with a single `generateAndSavePlan()` call
3. Set `planGenerationFiredRef.current = true` to prevent the unmount auto-trigger from double-firing

The implementer should read the full endClass function and replace the plan generation section (lines 679-835) with:

```typescript
    if (notesToProcess.length > 0 && !classNotes.isOrganized && cls) {
      planGenerationFiredRef.current = true;

      // Gather intelligence for the AI
      const allNoteTexts = notesToProcess.map(n => n.text);
      const progressionHints = getProgressionSuggestions(allNoteTexts);

      const pastWeeksNotes: string[][] = [];
      for (let i = 1; i <= 2; i++) {
        const pastWeekStart = addWeeks(viewingWeekStart, -i);
        const pastWeekOf = formatWeekOf(pastWeekStart);
        const pastWeek = getWeekNotesFromStorage(pastWeekOf);
        const pastClassNotes = pastWeek?.classNotes[classId!];
        if (pastClassNotes?.liveNotes) {
          pastWeeksNotes.push(pastClassNotes.liveNotes.map(n => n.text));
        } else {
          pastWeeksNotes.push([]);
        }
      }
      const repetitionFlags = getRepetitionFlags(allNoteTexts, pastWeeksNotes);

      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        safeTime(b.weekOf) - safeTime(a.weekOf)
      );
      for (const week of sorted) {
        const notes = week.classNotes[cls.id];
        if (notes?.plan && notes.plan.trim()) {
          previousPlans.push(notes.plan);
          if (previousPlans.length >= 1) break;
        }
      }

      const att = classNotes.attendance;
      let attendanceNote: string | undefined;
      if (att) {
        const present = att.present?.length || 0;
        const late = att.late?.length || 0;
        const absent = att.absent?.length || 0;
        const total = present + late + absent;
        if (total > 0) {
          attendanceNote = `${present + late} of ${total} present`;
          if (late > 0) attendanceNote += ` (${late} late)`;
        }
      }

      // Generate plan using shared utility (handles AI call + fallback)
      generateAndSavePlan({
        classId: classId!,
        classInfo: {
          id: cls.id,
          name: cls.name,
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
          level: cls.level,
          recitalSong: cls.recitalSong,
          isRecitalSong: cls.isRecitalSong,
          choreographyNotes: cls.choreographyNotes,
        },
        notes: notesToProcess,
        viewingWeekStart,
        saveWeekNotes,
        aiContext,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        progressionHints: progressionHints.length > 0 ? progressionHints : undefined,
        repetitionFlags: repetitionFlags.length > 0 ? repetitionFlags : undefined,
        attendanceNote,
        expandedSummary,
        nextWeekGoal: classNotes.nextWeekGoal,
      });

      // AI-powered reminder detection — fire and forget (don't block navigation)
      const classNameForAI = cls.name;
      const nextClassDateForReminders = format(addWeeks(classDate, 1), 'yyyy-MM-dd');
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      aiDetectReminders(classNameForAI, notesForReminderScan, aiContext).then(detectedReminders => {
        if (detectedReminders.length === 0) return;

        const freshSelfCare = selfCareRef.current;
        const existingReminders = freshSelfCare?.reminders || [];
        const existingLists = freshSelfCare?.reminderLists || [];

        let classReminderList = existingLists.find(l => l.name === 'Class Reminders');
        const updatedLists = [...existingLists];
        if (!classReminderList) {
          classReminderList = {
            id: uuid(),
            name: 'Class Reminders',
            color: '#3B82F6',
            icon: 'AlertCircle',
            order: existingLists.length,
            createdAt: new Date().toISOString(),
          } as ReminderList;
          updatedLists.push(classReminderList);
        }

        const now = new Date().toISOString();
        const newReminders: Reminder[] = detectedReminders.map(r => ({
          id: uuid(),
          title: r.title,
          notes: `From ${classNameForAI} class notes`,
          listId: classReminderList!.id,
          completed: false,
          dueDate: nextClassDateForReminders,
          priority: 'medium' as const,
          flagged: false,
          createdAt: now,
          updatedAt: now,
        }));

        updateSelfCare({
          reminders: [...existingReminders, ...newReminders],
          reminderLists: updatedLists,
        });
        setReminderCount(prev => prev + newReminders.length);
      }).catch(() => {
        // Silently fail — reminders are a bonus, not critical
      });
    }
```

- [ ] **Step 6: Verify client compiles**

Run: `cd ~/figgg && npm run build`
Expected: Clean compilation.

- [ ] **Step 7: Commit**

```bash
cd ~/figgg
git add src/pages/LiveNotes.tsx
git commit -m "feat: add navigate-away auto-trigger to LiveNotes, use shared plan utility"
```

---

### Task 4: Refactor EventNotes to use shared utility + add auto-trigger

**Files:**
- Modify: `src/pages/EventNotes.tsx`

Same pattern as Task 3 but for EventNotes. The endEvent function (line 407) has its own inline plan generation that needs replacing.

- [ ] **Step 1: Add import for planCarryForward**

At the top of `src/pages/EventNotes.tsx`, after the existing ai.ts import (line 13), add:

```typescript
import { generateAndSavePlan, nextWeekHasPlan } from '../utils/planCarryForward';
```

- [ ] **Step 2: Add refs for auto-trigger**

After the existing state declarations (around line 60), add:

```typescript
  const planGenerationFiredRef = useRef(false);
```

After the `eventNotes` derivation (around line 144, after `const eventNotes: ClassWeekNotes = ...`), add:

```typescript
  // Refs for values needed in useEffect cleanup
  const eventNotesRef = useRef(eventNotes);
  eventNotesRef.current = eventNotes;
  const aiContextRef = useRef(aiContext);
  aiContextRef.current = aiContext;
```

- [ ] **Step 3: Add the navigate-away auto-trigger useEffect**

Add after the refs:

```typescript
  // Auto-trigger plan generation on navigate-away (unmount)
  useEffect(() => {
    return () => {
      const currentEventNotes = eventNotesRef.current;
      const currentWeekStart = getWeekStart();

      if (
        !event ||
        !eventId ||
        currentEventNotes.liveNotes.length === 0 ||
        currentEventNotes.isOrganized ||
        planGenerationFiredRef.current ||
        nextWeekHasPlan(eventId, currentWeekStart)
      ) return;

      planGenerationFiredRef.current = true;

      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
      );
      for (const week of sorted) {
        const n = week.classNotes[event.id];
        if (n?.plan?.trim()) {
          previousPlans.push(n.plan);
          break;
        }
      }

      generateAndSavePlan({
        classId: eventId,
        classInfo: {
          id: event.id,
          name: event.title,
          day: event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : 'event',
          startTime: event.startTime || '00:00',
          endTime: event.endTime || '00:00',
        },
        notes: currentEventNotes.liveNotes,
        viewingWeekStart: currentWeekStart,
        saveWeekNotes,
        aiContext: aiContextRef.current,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        eventTitle: event.title,
        nextWeekGoal: currentEventNotes.nextWeekGoal,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 4: Replace endEvent plan generation with shared utility**

In the `endEvent` function (line 407), replace lines 431-529 (the `if (notesToProcess.length > 0 && !eventNotes.isOrganized && event)` block) with:

```typescript
    if (notesToProcess.length > 0 && !eventNotes.isOrganized && event) {
      planGenerationFiredRef.current = true;

      const previousPlans: string[] = [];
      const sorted = [...(data.weekNotes || [])].sort((a, b) =>
        safeTime(b.weekOf) - safeTime(a.weekOf)
      );
      for (const week of sorted) {
        const n = week.classNotes[event.id];
        if (n?.plan?.trim()) {
          previousPlans.push(n.plan);
          break;
        }
      }

      generateAndSavePlan({
        classId: eventId!,
        classInfo: {
          id: event.id,
          name: event.title,
          day: event.date ? format(parseISO(event.date), 'EEEE').toLowerCase() : 'event',
          startTime: event.startTime || '00:00',
          endTime: event.endTime || '00:00',
        },
        notes: notesToProcess,
        viewingWeekStart: getWeekStart(),
        saveWeekNotes,
        aiContext,
        previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
        eventTitle: event.title,
        nextWeekGoal: eventNotes.nextWeekGoal,
      });

      // Final reminder scan for un-scanned notes
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      if (notesForReminderScan.length > 0) {
        const eventDate = event.date ? parseISO(event.date) : new Date();
        const nextDate = format(addWeeks(eventDate, 1), 'yyyy-MM-dd');

        aiDetectReminders(event.title, notesForReminderScan, aiContext).then(detected => {
          if (detected.length === 0) return;

          const existingReminders = data.selfCare?.reminders || [];
          const existingLists = data.selfCare?.reminderLists || [];

          let classReminderList = existingLists.find(l => l.name === 'Class Reminders');
          const updatedLists = [...existingLists];
          if (!classReminderList) {
            classReminderList = {
              id: uuid(),
              name: 'Class Reminders',
              color: '#3B82F6',
              icon: 'AlertCircle',
              order: existingLists.length,
              createdAt: new Date().toISOString(),
            } as ReminderList;
            updatedLists.push(classReminderList);
          }

          const now = new Date().toISOString();
          const newReminders: Reminder[] = detected.map(r => ({
            id: uuid(),
            title: r.title,
            notes: `From ${event.title} notes`,
            listId: classReminderList!.id,
            completed: false,
            dueDate: nextDate,
            priority: 'medium' as const,
            flagged: false,
            createdAt: now,
            updatedAt: now,
          }));

          updateSelfCare({
            reminders: [...existingReminders, ...newReminders],
            reminderLists: updatedLists,
          });
          setReminderCount(prev => prev + newReminders.length);
        }).catch(() => {
          // Silently fail
        });
      }
    }
```

- [ ] **Step 5: Add missing import for `getWeekStart`**

Check if `getWeekStart` is already imported from `'../utils/time'` in EventNotes.tsx. If not, add it to the existing import from that module (line 9). The implementer should check the current imports.

- [ ] **Step 6: Verify client compiles**

Run: `cd ~/figgg && npm run build`
Expected: Clean compilation.

- [ ] **Step 7: Commit**

```bash
cd ~/figgg
git add src/pages/EventNotes.tsx
git commit -m "feat: add navigate-away auto-trigger to EventNotes, use shared plan utility"
```

---

### Task 5: Create nightly sweep Cloud Function

**Files:**
- Create: `functions/src/nightlySweep.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Create `functions/src/nightlySweep.ts`**

```typescript
// functions/src/nightlySweep.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { buildPlanPrompt, stripMarkdown, type LiveNote, type ClassInfo } from "./utils/planPrompt";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
const db = admin.firestore();

/**
 * Get the Monday (week start) for a given date.
 */
function getWeekOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextWeekOf(currentWeekOf: string): string {
  const d = new Date(currentWeekOf + 'T00:00:00');
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a class is currently in session or ended < 30 min ago.
 */
function isRecentlyActive(endTime: string | undefined, now: Date): boolean {
  if (!endTime) return false;
  const [h, m] = endTime.split(':').map(Number);
  const endMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Class ended less than 30 minutes ago
  return (nowMinutes - endMinutes) < 30 && (nowMinutes - endMinutes) > -60;
}

export const nightlySweep = onSchedule(
  {
    schedule: "every day 22:00",
    timeZone: "America/New_York",
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: [anthropicKey],
  },
  async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("nightlySweep: ANTHROPIC_API_KEY not configured");
      return;
    }

    const now = new Date();
    const currentWeekOf = getWeekOf(now);
    const nextWeekOf = getNextWeekOf(currentWeekOf);

    console.log(`nightlySweep: scanning week ${currentWeekOf}, generating plans for ${nextWeekOf}`);

    // Get all users
    const usersSnap = await db.collection("users").listDocuments();

    for (const userRef of usersSnap) {
      const userId = userRef.id;

      // Get current week's notes
      const thisWeekDoc = await userRef.collection("weekNotes").doc(currentWeekOf).get();
      if (!thisWeekDoc.exists) {
        console.log(`nightlySweep: no weekNotes for ${currentWeekOf}, user ${userId}`);
        continue;
      }

      const thisWeekData = thisWeekDoc.data()!;
      const classNotes = thisWeekData.classNotes || {};

      // Get next week's notes (to check for existing plans)
      const nextWeekDoc = await userRef.collection("weekNotes").doc(nextWeekOf).get();
      const nextWeekData = nextWeekDoc.exists ? nextWeekDoc.data()! : { classNotes: {} };
      const nextWeekClassNotes = nextWeekData.classNotes || {};

      // Find orphaned classes: have notes but no plan in next week
      const orphanedClassIds: string[] = [];
      for (const [classId, cn] of Object.entries(classNotes) as [string, Record<string, unknown>][]) {
        const liveNotes = (cn.liveNotes || []) as LiveNote[];
        if (liveNotes.length === 0) continue;

        // Skip if next week already has a plan
        const nextWeekEntry = nextWeekClassNotes[classId] as Record<string, unknown> | undefined;
        if (nextWeekEntry?.plan && (nextWeekEntry.plan as string).trim().length > 0) continue;

        orphanedClassIds.push(classId);
      }

      if (orphanedClassIds.length === 0) {
        console.log(`nightlySweep: no orphaned notes for user ${userId}`);
        continue;
      }

      console.log(`nightlySweep: found ${orphanedClassIds.length} orphaned classes for user ${userId}: ${orphanedClassIds.join(', ')}`);

      // Fetch class info for each orphaned class
      const client = new Anthropic({ apiKey });
      const updates: Record<string, unknown> = {};

      for (const classId of orphanedClassIds) {
        const cn = classNotes[classId] as Record<string, unknown>;
        const liveNotes = cn.liveNotes as LiveNote[];

        // Get class info — internal class or calendar event
        let classInfo: ClassInfo;
        if (classId.startsWith('cal-')) {
          const eventDoc = await userRef.collection("calendarEvents").doc(classId).get();
          if (eventDoc.exists) {
            const e = eventDoc.data()!;
            classInfo = {
              id: classId,
              name: e.title || cn.eventTitle || 'Event',
              day: e.day || 'event',
              startTime: e.startTime || '00:00',
              endTime: e.endTime || '00:00',
            };
          } else {
            // Calendar event not found — use eventTitle from notes
            classInfo = {
              id: classId,
              name: (cn.eventTitle as string) || 'Event',
              day: 'event',
              startTime: '00:00',
              endTime: '00:00',
            };
          }
        } else {
          const classDoc = await userRef.collection("classes").doc(classId).get();
          if (classDoc.exists) {
            const c = classDoc.data()!;
            classInfo = {
              id: classId,
              name: c.name || 'Class',
              day: c.day || '',
              startTime: c.startTime || '00:00',
              endTime: c.endTime || '00:00',
              level: c.level,
              recitalSong: c.recitalSong,
              isRecitalSong: c.isRecitalSong,
              choreographyNotes: c.choreographyNotes,
            };
          } else {
            classInfo = {
              id: classId,
              name: 'Class',
              day: '',
              startTime: '00:00',
              endTime: '00:00',
            };
          }
        }

        // Skip if class is still in session or just ended
        if (isRecentlyActive(classInfo.endTime, now)) {
          console.log(`nightlySweep: skipping ${classId} (${classInfo.name}) — recently active`);
          continue;
        }

        // Look for previous plans for continuity
        const prevWeekOf = getWeekOf(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        const prevWeekDoc = await userRef.collection("weekNotes").doc(prevWeekOf).get();
        const previousPlans: string[] = [];
        if (prevWeekDoc.exists) {
          const prevData = prevWeekDoc.data()!;
          const prevClassNotes = prevData.classNotes?.[classId] as Record<string, unknown> | undefined;
          if (prevClassNotes?.plan && (prevClassNotes.plan as string).trim()) {
            previousPlans.push((prevClassNotes.plan as string).substring(0, 500));
          }
        }

        // Generate plan via AI
        try {
          const prompt = buildPlanPrompt({
            classInfo,
            notes: liveNotes,
            previousPlans: previousPlans.length > 0 ? previousPlans : undefined,
          });

          const message = await client.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 800,
            messages: [{ role: "user", content: prompt }],
          });

          const planContent = message.content[0].type === "text" ? message.content[0].text : "";
          const plan = stripMarkdown(planContent);

          // Build update using dot notation (won't clobber other fields)
          updates[`classNotes.${classId}`] = {
            classId,
            plan,
            liveNotes: [],
            isOrganized: false,
            ...(cn.eventTitle ? { eventTitle: cn.eventTitle } : {}),
            ...(cn.nextWeekGoal ? { weekIdea: cn.nextWeekGoal } : {}),
          };

          console.log(`nightlySweep: generated plan for ${classId} (${classInfo.name})`);
        } catch (err) {
          // AI failed — write fallback from raw notes
          const fallbackLines: string[] = [];
          const tagged = liveNotes.filter(n => n.category);
          const untagged = liveNotes.filter(n => !n.category);

          if (tagged.length > 0) {
            fallbackLines.push('FROM LAST CLASS');
            tagged.forEach(n => fallbackLines.push(`- [${n.category}] ${n.text}`));
          }
          if (untagged.length > 0) {
            fallbackLines.push(tagged.length > 0 ? 'GENERAL' : 'FROM LAST CLASS');
            untagged.forEach(n => fallbackLines.push(`- ${n.text}`));
          }

          updates[`classNotes.${classId}`] = {
            classId,
            plan: fallbackLines.join('\n'),
            liveNotes: [],
            isOrganized: false,
            ...(cn.eventTitle ? { eventTitle: cn.eventTitle } : {}),
          };

          console.error(`nightlySweep: AI failed for ${classId}, wrote fallback. Error:`, err);
        }
      }

      // Write all plans to next week in a single update
      if (Object.keys(updates).length > 0) {
        const nextWeekRef = userRef.collection("weekNotes").doc(nextWeekOf);

        if (nextWeekDoc.exists) {
          await nextWeekRef.update(updates);
        } else {
          // Create the document with weekOf and id fields
          await nextWeekRef.set({
            id: `week-${nextWeekOf}`,
            weekOf: nextWeekOf,
            ...updates,
          });
        }

        console.log(`nightlySweep: wrote ${Object.keys(updates).length} plans to ${nextWeekOf} for user ${userId}`);
      }
    }

    console.log("nightlySweep: complete");
  }
);
```

- [ ] **Step 2: Register in `functions/src/index.ts`**

Add this line after the existing scheduled function export (line 25):

```typescript
export { nightlySweep } from "./nightlySweep";
```

- [ ] **Step 3: Verify Cloud Functions compile**

Run: `cd ~/figgg/functions && npm run build`
Expected: Clean compilation.

- [ ] **Step 4: Commit**

```bash
cd ~/figgg
git add functions/src/nightlySweep.ts functions/src/index.ts
git commit -m "feat: add 10pm nightly sweep to catch orphaned class notes"
```

---

### Task 6: Full build verification + deploy

**Files:** None (verification only)

- [ ] **Step 1: Full client build**

Run: `cd ~/figgg && npm run build`
Expected: Clean compilation, zero errors.

- [ ] **Step 2: Full functions build**

Run: `cd ~/figgg/functions && npm run build`
Expected: Clean compilation, zero errors.

- [ ] **Step 3: Commit any remaining changes and push**

```bash
cd ~/figgg
git push
```

This triggers GitHub Actions which deploys:
- Frontend to Firebase Hosting
- Cloud Functions (including new nightlySweep) to Firebase
- Firestore rules (unchanged)

- [ ] **Step 4: Verify deploy succeeded**

Check GitHub Actions status. The nightlySweep function should appear in Firebase Console > Functions.
