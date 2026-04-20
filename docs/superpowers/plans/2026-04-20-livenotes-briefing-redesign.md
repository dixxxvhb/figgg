# LiveNotes Briefing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill the standalone `/notes` page, restore `Schedule` to primary nav, strip category tagging and attendance from LiveNotes, replace the carry-forward plan blob with a structured 3-part briefing (`recap` / `assessment` / `forToday`).

**Architecture:** Three sequential clusters. Cluster 1 extends data types and adds AI/util helpers alongside legacy functions. Cluster 2 rewrites the LiveNotes surface to use the new helpers. Cluster 3 cleans up nav + deletes the Notes page. Legacy data renders gracefully; no migration script.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4, Firebase Functions (`aiChat`), date-fns, lucide-react icons, react-router-dom v6.

**Testing approach:** Figgg has no test harness (no vitest/jest, no `test` script). Verification gates are `npm run build` (TypeScript + Vite build passes) and manual smoke test via `npm run dev` + browser preview at each cluster boundary. Do **not** add a test framework as part of this plan — it's out of scope.

**Operational note:** Figgg deploys via `npm run build && ~/bin/firebase deploy --only hosting`. Push + deploy are free per Dixon's preferences. Don't deploy until the final cluster passes smoke test; Dixon will deploy manually when ready.

**Spec:** [`docs/superpowers/specs/2026-04-20-livenotes-briefing-redesign-design.md`](../specs/2026-04-20-livenotes-briefing-redesign-design.md)

---

## File Structure

**Files to modify:**
- `src/types/index.ts` — add `flaggedForNextWeek` on `LiveNote`, add `Briefing` interface + `briefing` field on `ClassWeekNotes`
- `src/services/ai.ts` — add `generateBriefing()` function (keep `generatePlan` for EventNotes)
- `src/utils/planCarryForward.ts` — add `buildFallbackBriefing()`, `generateAndSaveBriefing()`, `nextWeekHasBriefing()` alongside existing `*Plan` functions
- `src/components/common/NoteInput.tsx` — make tag picker optional (`showTags` prop), add star-flag toggle (`showFlag` + `onToggleFlag` props)
- `src/components/common/BriefingDisplay.tsx` — NEW component, renders structured briefing or falls back to legacy `plan` string via `PlanDisplay`
- `src/pages/LiveNotes.tsx` — strip tag state/picker, strip attendance UI, strip next-week-goal textbox, wire star flag, render `BriefingDisplay` at top, rewire End Class to one-button flow
- `src/App.tsx` — change `/notes` route to redirect to `/schedule`; remove `Notes` lazy import
- `src/components/common/Header.tsx` — swap `Notes` nav entry for `Schedule`
- `src/pages/MoreHub.tsx` — remove `Schedule` row (it's back in primary nav)

**Files to delete:**
- `src/pages/Notes.tsx`
- `src/services/notesSearch.ts`

**Files explicitly untouched:**
- `src/pages/EventNotes.tsx` — keeps using `generateAndSavePlan` / legacy tag picker. Out of scope.
- `src/pages/Schedule.tsx` — works as-is, just gets re-promoted to primary nav.
- `src/contexts/AppDataContext.tsx` — no schema change needed (new fields are additive).

---

## Cluster 1 — Data model + AI layer

No UI changes in this cluster. Ends with `npm run build` passing.

---

### Task 1: Add `flaggedForNextWeek` to `LiveNote` type

**Files:**
- Modify: `src/types/index.ts:36-43`

- [ ] **Step 1: Read current `LiveNote` interface to confirm location**

Run: `sed -n '36,43p' src/types/index.ts`
Expected: shows the existing `LiveNote` interface.

- [ ] **Step 2: Add the new optional field**

Edit `src/types/index.ts`, replace:

```ts
export interface LiveNote {
  id: string;
  timestamp: string; // ISO date string
  text: string;
  category?: 'worked-on' | 'needs-work' | 'next-week' | 'ideas'
    // Legacy values (mapped on read)
    | 'covered' | 'observation' | 'reminder' | 'choreography';
}
```

with:

```ts
export interface LiveNote {
  id: string;
  timestamp: string; // ISO date string
  text: string;
  /**
   * When true, this note is explicitly flagged by the user to surface
   * verbatim at the top of next week's briefing "For today" section.
   * Set via the star toggle on note rows in LiveNotes.
   */
  flaggedForNextWeek?: boolean;
  /**
   * @deprecated Kept optional for legacy data only. New notes never set this.
   * Old values may be: worked-on | needs-work | next-week | ideas, or legacy
   * covered | observation | reminder | choreography.
   */
  category?: 'worked-on' | 'needs-work' | 'next-week' | 'ideas'
    | 'covered' | 'observation' | 'reminder' | 'choreography';
}
```

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds (existing callers of `category` still compile — field still exists).

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/types/index.ts
git commit -m "types: add LiveNote.flaggedForNextWeek, deprecate category"
```

---

### Task 2: Add `Briefing` interface + `briefing` field on `ClassWeekNotes`

**Files:**
- Modify: `src/types/index.ts:71-99` (and add new interface above it)

- [ ] **Step 1: Add `Briefing` interface above `ClassWeekNotes`**

Edit `src/types/index.ts`. Find this block (starts around line 63):

```ts
export interface MediaItem {
  id: string;
  type: 'image';
  url: string; // base64 data URL
  timestamp: string;
  name: string;
}

export interface ClassWeekNotes {
```

Insert a new interface between `MediaItem` and `ClassWeekNotes`:

```ts
export interface MediaItem {
  id: string;
  type: 'image';
  url: string; // base64 data URL
  timestamp: string;
  name: string;
}

/**
 * AI-generated 3-part briefing that carries a class forward from one week to the next.
 * Written to next-week's `ClassWeekNotes.briefing` when the user ends a class.
 * Legacy `plan` string on `ClassWeekNotes` is kept for backwards-compat rendering.
 */
export interface Briefing {
  /** "What we did" — 2-3 sentence AI prose recap of last week's notes. */
  recap: string;
  /** "How it went" — 2-3 sentence AI prose assessment of wins/struggles. May be empty on fallback. */
  assessment: string;
  /** "For today" — bullets (≤5). Flagged notes verbatim first; AI-inferred actionables after. */
  forToday: string[];
  /** ISO timestamp when the briefing was generated. */
  generatedAt: string;
}

export interface ClassWeekNotes {
```

- [ ] **Step 2: Add `briefing` field to `ClassWeekNotes`**

In the same file, modify the `ClassWeekNotes` interface. Find:

```ts
export interface ClassWeekNotes {
  classId: string;
  plan: string;
  liveNotes: LiveNote[];
  organizedNotes?: OrganizedNotes;
  isOrganized: boolean;
  media?: MediaItem[];
  weekIdea?: string; // Overall idea/theme for class this week
  nextWeekGoal?: string; // Goal to remember for next week
  // Attendance for this class this week
  attendance?: {
```

Replace with (adding the `briefing?:` field, marking `plan` / `nextWeekGoal` / `attendance` as legacy in comments):

```ts
export interface ClassWeekNotes {
  classId: string;
  /**
   * @deprecated Replaced by `briefing`. Kept for backwards-compat rendering
   * of pre-redesign weeks. New carry-forward writes go to `briefing` only.
   */
  plan: string;
  /**
   * Structured 3-part briefing carried forward from the previous week's class.
   * Absent on legacy weeks (use `plan` fallback).
   */
  briefing?: Briefing;
  liveNotes: LiveNote[];
  organizedNotes?: OrganizedNotes;
  isOrganized: boolean;
  media?: MediaItem[];
  weekIdea?: string; // Overall idea/theme for class this week
  /** @deprecated Rolled into `flaggedForNextWeek` on individual notes. */
  nextWeekGoal?: string;
  /**
   * @deprecated Attendance UI removed from LiveNotes in Apr 2026 redesign.
   * Legacy data preserved, not written on new records.
   */
  attendance?: {
```

(The `attendance` field's body stays the same — only the comment changes.)

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. Existing `plan` / `attendance` / `nextWeekGoal` consumers still compile.

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/types/index.ts
git commit -m "types: add Briefing interface and ClassWeekNotes.briefing field"
```

---

### Task 3: Add `generateBriefing()` to AI service

**Files:**
- Modify: `src/services/ai.ts` (append after existing `generatePlan` around line 57)

- [ ] **Step 1: Read the existing `generatePlan` to model the new function's shape**

Run: `sed -n '1,60p' src/services/ai.ts`
Expected: shows `generatePlan` using `httpsCallable(requireFunctions(), 'aiChat')` with `mode: 'generate-plan'`.

- [ ] **Step 2: Add `Briefing` import and `generateBriefing()` function**

Edit `src/services/ai.ts`. Change the first import block from:

```ts
import type { LiveNote } from '../types';
import type { AIContextPayload } from './aiContext';
```

to:

```ts
import type { LiveNote, Briefing } from '../types';
import type { AIContextPayload } from './aiContext';
```

Then append the following directly after the closing brace of `generatePlan` (after line 57):

```ts

interface GenerateBriefingOptions {
  classInfo: GeneratePlanClassInfo;
  /** Last week's raw liveNotes stream, including flaggedForNextWeek markers. */
  notes: LiveNote[];
  /** Up to 2 prior briefings, for continuity. Optional. */
  previousBriefings?: Briefing[];
  /** Output of aiExpandNotes, if it has already run for this class. */
  expandedSummary?: string;
  context?: AIContextPayload;
}

/**
 * Generate a structured 3-part briefing for next week's class.
 *
 * The callable backend (aiChat mode='generate-briefing') is expected to return
 * JSON shaped like `Briefing` (without `generatedAt` — this function adds it).
 *
 * If the backend fails or returns malformed data, this throws. Callers should
 * catch and fall back to `buildFallbackBriefing()`.
 */
export async function generateBriefing(
  options: GenerateBriefingOptions,
): Promise<Briefing> {
  try {
    const contextWithClass = {
      ...(options.context ?? {}),
      classData: {
        classInfo: options.classInfo,
        notes: options.notes,
        previousBriefings: options.previousBriefings,
        expandedSummary: options.expandedSummary,
      },
    };
    const fn = httpsCallable(requireFunctions(), 'aiChat');
    const result = await fn({ mode: 'generate-briefing', context: contextWithClass });
    const data = result.data as { briefing?: Partial<Briefing> };
    const b = data.briefing;

    if (
      !b ||
      typeof b.recap !== 'string' ||
      typeof b.assessment !== 'string' ||
      !Array.isArray(b.forToday)
    ) {
      throw new Error('generateBriefing returned malformed payload');
    }

    return {
      recap: b.recap,
      assessment: b.assessment,
      forToday: b.forToday.filter((x): x is string => typeof x === 'string').slice(0, 5),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('generateBriefing failed:', error);
    throw new Error('Failed to generate briefing.');
  }
}
```

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. `Briefing` import resolves. New function type-checks.

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/services/ai.ts
git commit -m "ai: add generateBriefing service (aiChat mode=generate-briefing)"
```

**Note on backend:** The callable `aiChat` with `mode: 'generate-briefing'` needs a server-side handler (Firebase Function) that returns `{ briefing: { recap, assessment, forToday } }`. That handler lives in the `functions/` directory and is out of scope for this client-side plan. If the handler doesn't exist yet, the fallback in Task 4 catches the failure and builds a deterministic briefing from the notes.

---

### Task 4: Add `buildFallbackBriefing()`, `generateAndSaveBriefing()`, `nextWeekHasBriefing()` to planCarryForward

**Files:**
- Modify: `src/utils/planCarryForward.ts` (append new functions alongside existing ones)

- [ ] **Step 1: Add `Briefing` import**

Edit `src/utils/planCarryForward.ts`. Change the type import block from:

```ts
import {
  LiveNote,
  ClassWeekNotes,
  WeekNotes,
  normalizeNoteCategory,
} from '../types';
```

to:

```ts
import {
  LiveNote,
  ClassWeekNotes,
  WeekNotes,
  Briefing,
  normalizeNoteCategory,
} from '../types';
```

And change:

```ts
import { generatePlan as aiGeneratePlan } from '../services/ai';
```

to:

```ts
import {
  generatePlan as aiGeneratePlan,
  generateBriefing as aiGenerateBriefing,
} from '../services/ai';
```

- [ ] **Step 2: Append `buildFallbackBriefing()` below `buildFallbackPlan()`**

At the end of the file, after the existing `nextWeekHasPlan()` function, append:

```ts

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
```

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. New functions export cleanly, existing `*Plan` functions untouched.

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/utils/planCarryForward.ts
git commit -m "planCarryForward: add buildFallbackBriefing + generateAndSaveBriefing + nextWeekHasBriefing"
```

---

## Cluster 2 — LiveNotes surface rewrite

Ends with `npm run build` passing AND a manual smoke test in the dev server: open an existing class from Schedule (via MoreHub for now), take a note, flag it, end class, verify the briefing carries forward.

---

### Task 5: Add `showTags` and `showFlag` + `onToggleFlag` props to `NoteInput`

**Files:**
- Modify: `src/components/common/NoteInput.tsx`

- [ ] **Step 1: Update `NoteInputProps` interface**

Find (around line 34):

```ts
export interface NoteInputProps {
  notes: LiveNote[];
  onSaveNote: (note: LiveNote) => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote?: (noteId: string, newText: string) => void;
  /** Placeholder for the input field */
  placeholder?: string;
  /** Optional terminology autocomplete */
  autocomplete?: AutocompleteConfig;
  /** Extra content rendered per-note (e.g. "Reminder created" badge) */
  renderNoteExtra?: (note: LiveNote) => React.ReactNode;
  /** If true, show a read-only collapsed view (notes already saved) */
  savedMode?: boolean;
  /** Children rendered between notes list and input (e.g. next-week goal) */
  children?: React.ReactNode;
}
```

Replace with (three new optional props at the end):

```ts
export interface NoteInputProps {
  notes: LiveNote[];
  onSaveNote: (note: LiveNote) => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote?: (noteId: string, newText: string) => void;
  /** Placeholder for the input field */
  placeholder?: string;
  /** Optional terminology autocomplete */
  autocomplete?: AutocompleteConfig;
  /** Extra content rendered per-note (e.g. "Reminder created" badge) */
  renderNoteExtra?: (note: LiveNote) => React.ReactNode;
  /** If true, show a read-only collapsed view (notes already saved) */
  savedMode?: boolean;
  /** Children rendered between notes list and input (e.g. next-week goal) */
  children?: React.ReactNode;
  /**
   * Show the 4-category quick-tag picker in the input bar.
   * Default: true (legacy behavior). LiveNotes passes false.
   */
  showTags?: boolean;
  /**
   * Show a star-flag toggle on each note row. Tapping flags the note
   * for next week's briefing. Default: false. LiveNotes passes true.
   */
  showFlag?: boolean;
  /**
   * Callback when the star toggle is tapped on a note. Required when
   * `showFlag` is true.
   */
  onToggleFlag?: (noteId: string) => void;
}
```

- [ ] **Step 2: Thread the new props through to `NotesList` and `InputBar`**

Find the default `NoteInput` export (search for `export function NoteInput(` in the file; if present, it should accept the props and pass them down). If `NoteInput` wraps `NotesList` + `InputBar`, add the props to its signature.

If `NoteInput` is not an exported wrapper (this codebase uses `NotesList` + `InputBar` as named exports), instead update `NotesList` and `InputBar` signatures directly.

Confirm the structure:

Run: `grep -nE 'export (function|const) (NotesList|InputBar|NoteInput)\b' src/components/common/NoteInput.tsx`

If `NotesList` and `InputBar` are the exports (as in the current codebase — both are exported via the `export { NotesList, InputBar }` pattern at file end, or via `export function`), update each directly in the subsequent steps.

- [ ] **Step 3: Extend `NotesList` to render a star toggle when `showFlag` is true**

Find the `NotesList` function signature (around line 52) and expand its `Pick<NoteInputProps, ...>` type:

```ts
function NotesList({
  notes,
  onDeleteNote,
  onEditNote,
  renderNoteExtra,
  savedMode,
}: Pick<NoteInputProps, 'notes' | 'onDeleteNote' | 'onEditNote' | 'renderNoteExtra' | 'savedMode'>) {
```

Replace with:

```ts
function NotesList({
  notes,
  onDeleteNote,
  onEditNote,
  renderNoteExtra,
  savedMode,
  showFlag,
  onToggleFlag,
}: Pick<NoteInputProps, 'notes' | 'onDeleteNote' | 'onEditNote' | 'renderNoteExtra' | 'savedMode' | 'showFlag' | 'onToggleFlag'>) {
```

- [ ] **Step 4: Import the `Star` icon and add the toggle button to each note row**

At the top of the file, add `Star` to the lucide import. Find:

```ts
import { Send, Clock, CheckCircle, Lightbulb, AlertCircle, Pencil, Trash2, Check, X, StickyNote } from 'lucide-react';
```

Replace with:

```ts
import { Send, Clock, CheckCircle, Lightbulb, AlertCircle, Pencil, Trash2, Check, X, StickyNote, Star } from 'lucide-react';
```

In `NotesList`'s note row render (around line 139-182, inside the `{!savedMode && (...)}` action-buttons group), insert the star toggle as the FIRST action when `showFlag && onToggleFlag` is provided. Find:

```ts
              <div className="flex items-start gap-1">
                <div className="whitespace-nowrap pt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {safeFormat(note.timestamp, 'h:mm a')}
                </div>
                {!savedMode && (
```

Replace the surrounding block (the whole `<div className="flex items-start gap-1">` through its closing `</div>`) with:

```ts
              <div className="flex items-start gap-1">
                <div className="whitespace-nowrap pt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {safeFormat(note.timestamp, 'h:mm a')}
                </div>
                {showFlag && onToggleFlag && !isEditing && (
                  <button
                    onClick={() => onToggleFlag(note.id)}
                    className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-[var(--surface-card)] ${
                      note.flaggedForNextWeek
                        ? 'text-[var(--color-honey,var(--accent-primary))]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--color-honey,var(--accent-primary))]'
                    }`}
                    title={note.flaggedForNextWeek ? 'Unflag for next week' : 'Flag for next week'}
                    aria-label={note.flaggedForNextWeek ? 'Unflag for next week' : 'Flag for next week'}
                    aria-pressed={!!note.flaggedForNextWeek}
                  >
                    <Star
                      size={16}
                      fill={note.flaggedForNextWeek ? 'currentColor' : 'none'}
                    />
                  </button>
                )}
                {!savedMode && (
```

The existing edit/delete button sub-tree stays unchanged after this insert — keep it exactly as it was.

- [ ] **Step 5: Gate the `QUICK_TAGS` picker on `showTags` in `InputBar`**

Find the `InputBar` signature (around line 192):

```ts
function InputBar({
  onSaveNote,
  placeholder = 'Add a note...',
  autocomplete,
  selectedTag,
  setSelectedTag,
}: {
  onSaveNote: (note: LiveNote) => void;
  placeholder?: string;
  autocomplete?: AutocompleteConfig;
  selectedTag: string | undefined;
  setSelectedTag: (tag: string | undefined) => void;
}) {
```

Replace with:

```ts
function InputBar({
  onSaveNote,
  placeholder = 'Add a note...',
  autocomplete,
  selectedTag,
  setSelectedTag,
  showTags = true,
}: {
  onSaveNote: (note: LiveNote) => void;
  placeholder?: string;
  autocomplete?: AutocompleteConfig;
  selectedTag: string | undefined;
  setSelectedTag: (tag: string | undefined) => void;
  showTags?: boolean;
}) {
```

Then find the QUICK_TAGS render block (around line 290-306):

```tsx
      {/* Quick Tags */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {QUICK_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm whitespace-nowrap transition-all ${
              selectedTag === tag.id
                ? tag.color + ' shadow-sm'
                : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
            }`}
          >
            <tag.icon size={14} />
            {tag.label}
          </button>
        ))}
      </div>
```

Wrap it in a conditional:

```tsx
      {/* Quick Tags */}
      {showTags && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {QUICK_TAGS.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm whitespace-nowrap transition-all ${
                selectedTag === tag.id
                  ? tag.color + ' shadow-sm'
                  : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
              }`}
            >
              <tag.icon size={14} />
              {tag.label}
            </button>
          ))}
        </div>
      )}
```

- [ ] **Step 6: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. `EventNotes.tsx` still compiles (it doesn't pass `showTags` / `showFlag`, so defaults apply).

- [ ] **Step 7: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/NoteInput.tsx
git commit -m "NoteInput: add optional showTags, showFlag, onToggleFlag props"
```

---

### Task 6: Create `BriefingDisplay` component

**Files:**
- Create: `src/components/common/BriefingDisplay.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/common/BriefingDisplay.tsx` with:

```tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PlanDisplay } from './PlanDisplay';
import type { Briefing } from '../../types';

interface BriefingDisplayProps {
  /** Structured briefing, if present on the class's week notes. */
  briefing?: Briefing;
  /** Legacy plan string, used as fallback when no structured briefing exists. */
  legacyPlan?: string;
  /** Start collapsed after the user has posted their first note of the class. */
  initiallyCollapsed?: boolean;
}

/**
 * Renders last week's carry-forward briefing at the top of LiveNotes.
 *
 * Precedence:
 *  1. Structured `briefing` → three labeled sections (What we did / How it went / For today).
 *  2. Legacy `legacyPlan` string → rendered via PlanDisplay under "Last week's plan".
 *  3. Neither → returns null (hides entirely).
 *
 * Auto-collapsible card. When collapsed, shows only the header; tap to expand.
 */
export function BriefingDisplay({
  briefing,
  legacyPlan,
  initiallyCollapsed = false,
}: BriefingDisplayProps) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  const hasBriefing = !!briefing;
  const hasLegacy = !hasBriefing && !!legacyPlan && legacyPlan.trim().length > 0;

  if (!hasBriefing && !hasLegacy) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] overflow-hidden"
      aria-label="Last week briefing"
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-inset)]/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="type-caption uppercase tracking-wider text-[var(--text-tertiary)]">
          From last week
        </span>
        {collapsed ? (
          <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {hasBriefing ? (
            <>
              <BriefingSection title="What we did" body={briefing!.recap} />
              {briefing!.assessment.trim().length > 0 && (
                <BriefingSection title="How it went" body={briefing!.assessment} />
              )}
              {briefing!.forToday.length > 0 && (
                <BriefingBullets title="For today" items={briefing!.forToday} />
              )}
            </>
          ) : (
            <div>
              <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Last week's plan
              </h3>
              <PlanDisplay text={legacyPlan!} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BriefingSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--text-primary)]">{body}</p>
    </div>
  );
}

function BriefingBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
        {title}
      </h3>
      <ul className="text-sm leading-relaxed text-[var(--text-primary)] space-y-1">
        {items.map((item, i) => (
          <li key={i} className="pl-3 relative">
            <span className="absolute left-0 text-[var(--text-tertiary)]">-</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. `BriefingDisplay` is unused by the codebase at this point — no callers yet.

- [ ] **Step 3: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/BriefingDisplay.tsx
git commit -m "BriefingDisplay: new component for 3-part briefing with legacy plan fallback"
```

---

### Task 7: Rewire LiveNotes — remove tag state, remove attendance, remove next-week-goal

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

This task strips state and renders. Wiring the new flag + briefing happens in Tasks 8-9.

- [ ] **Step 1: Remove tag-boost constants and unused imports**

At the top of `src/pages/LiveNotes.tsx`, remove the `TAG_CATEGORY_BOOSTS` and `SHORT_CATEGORY_LABELS` constants (around lines 23-46). Also remove these imports that will become unused: `UserCheck`, `UserX`, `UserPlus`, `Clock3`, `normalizeNoteCategory`, `TermCategory`, and any others no longer referenced.

Run this search first to confirm current state:

Run: `grep -n "TAG_CATEGORY_BOOSTS\|SHORT_CATEGORY_LABELS\|normalizeNoteCategory" src/pages/LiveNotes.tsx`

Delete those declarations and remove matching import symbols. Do not touch the terminology autocomplete import (`searchTerminology`) — it stays but will be invoked without category boosts.

- [ ] **Step 2: Remove tag state and attendance state**

In the `LiveNotes` component body, delete:

```ts
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
```

Delete:

```ts
  const [showAttendance, setShowAttendance] = useState(() => {
    const wn = weekOffset === 0 ? getCurrentWeekNotes() : (getWeekNotes(formatWeekOf(viewingWeekStart)) || { classNotes: {} as Record<string, ClassWeekNotes> });
    const notes = wn.classNotes[classId || ''];
    const att = notes?.attendance;
    const hasMarked = att && (att.present.length > 0 || att.absent.length > 0 || att.late.length > 0);
    const hasStudents = (data.students || []).some(s => s.classIds?.includes(classId || ''));
    return hasStudents && !hasMarked;
  });
```

Delete:

```ts
  const [showQuickAddStudent, setShowQuickAddStudent] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [showNextWeekGoal, setShowNextWeekGoal] = useState(false);
  const [nextWeekGoalDraft, setNextWeekGoalDraft] = useState('');
  const [nextWeekGoalSaved, setNextWeekGoalSaved] = useState(false);
```

Also delete the `attendance` local variable (around line 173):

```ts
  const attendance = classNotes.attendance || { present: [], absent: [], late: [] };
```

And remove its consumers — search for `attendance.` and `setShowAttendance` usages and delete each referencing block. Search for `showAttendance`, `showQuickAddStudent`, `quickAddName`, `showNextWeekGoal`, `nextWeekGoalDraft`, `nextWeekGoalSaved` — delete each usage.

Run: `grep -cn "attendance\|showAttendance\|showQuickAddStudent\|showNextWeekGoal" src/pages/LiveNotes.tsx`
Expected after deletions: 0 matches (or only matches inside comments / the `classNotes` default spread, which is fine since the field stays optional).

- [ ] **Step 3: Remove attendance JSX block and next-week-goal JSX block**

In the `LiveNotes` render, find and delete:
- The attendance collapsible section (look for the heading "Attendance" or for a block that iterates over `data.students` and renders present/absent/late buttons).
- The next-week-goal textbox (search for `nextWeekGoalDraft` or `setShowNextWeekGoal`).

Preserve: the PlanDisplay block at the top (will be replaced in Task 8), the InputBar + NotesList (will be updated in Task 9), the End Class button (will be rewired in Task 10), the dancer-flag reminder UI (keep as-is).

- [ ] **Step 4: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds after cleaning up any now-unused imports. If tsc complains about unused vars, remove them.

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/LiveNotes.tsx
git commit -m "LiveNotes: strip tag state, attendance UI, next-week-goal textbox"
```

---

### Task 8: Replace `PlanDisplay` usage with `BriefingDisplay` in LiveNotes

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

- [ ] **Step 1: Swap the import**

At the top of the file, find:

```ts
import { PlanDisplay } from '../components/common/PlanDisplay';
```

Replace with:

```ts
import { BriefingDisplay } from '../components/common/BriefingDisplay';
```

- [ ] **Step 2: Replace the render block**

Find the JSX block that renders `<PlanDisplay text={classNotes.plan} />` (or similar). Replace the entire surrounding "last week plan" card/container with:

```tsx
<BriefingDisplay
  briefing={classNotes.briefing}
  legacyPlan={classNotes.plan}
  initiallyCollapsed={classNotes.liveNotes.length > 0}
/>
```

`initiallyCollapsed={classNotes.liveNotes.length > 0}` implements the spec rule: auto-collapse once the user has posted their first note of the current class.

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/LiveNotes.tsx
git commit -m "LiveNotes: render BriefingDisplay (with legacy plan fallback) at top"
```

---

### Task 9: Wire star-flag toggle into LiveNotes

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

- [ ] **Step 1: Add a flag-toggle handler**

In the `LiveNotes` component body, below the existing `handleSaveNote` / `handleDeleteNote` / `handleEditNote` handlers, add:

```ts
  const handleToggleFlag = (noteId: string) => {
    const next: ClassWeekNotes = {
      ...classNotesRef.current,
      liveNotes: classNotesRef.current.liveNotes.map(n =>
        n.id === noteId ? { ...n, flaggedForNextWeek: !n.flaggedForNextWeek } : n
      ),
    };
    const updatedWeekNotes = {
      ...weekNotes,
      classNotes: { ...weekNotes.classNotes, [classId || '']: next },
    };
    setWeekNotes(updatedWeekNotes);
    saveWeekNotes(updatedWeekNotes);
  };
```

- [ ] **Step 2: Pass the new props to `NotesList` and `InputBar`**

Find the `<NotesList ... />` JSX and add:

```tsx
<NotesList
  notes={classNotes.liveNotes}
  onDeleteNote={handleDeleteNote}
  onEditNote={handleEditNote}
  renderNoteExtra={/* keep existing */}
  showFlag={true}
  onToggleFlag={handleToggleFlag}
/>
```

(Keep all other props already being passed; only add `showFlag` and `onToggleFlag`.)

Find the `<InputBar ... />` JSX and add `showTags={false}`:

```tsx
<InputBar
  onSaveNote={handleSaveNote}
  placeholder="Type a note…"
  autocomplete={/* keep existing */}
  selectedTag={undefined}
  setSelectedTag={() => { /* no-op — tags disabled */ }}
  showTags={false}
/>
```

- [ ] **Step 3: Remove the `category: selectedTag` assignment from `handleSaveNote`**

Find `handleSaveNote` and ensure the note object no longer sets `category`. If the function currently spreads the incoming note from `InputBar.submitNote`, the `InputBar`-side note builder still sets `category: selectedTag as LiveNote['category']` — because we pass `selectedTag={undefined}`, `category` will be `undefined`, which is correct. No change needed here.

- [ ] **Step 4: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/LiveNotes.tsx
git commit -m "LiveNotes: wire star-flag toggle; disable tag picker in input bar"
```

---

### Task 10: Rewire End Class button + nav-away cleanup to use briefing helpers

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

- [ ] **Step 1: Update imports**

Find:

```ts
import { generateAndSavePlan, nextWeekHasPlan } from '../utils/planCarryForward';
```

Replace with:

```ts
import { generateAndSaveBriefing, nextWeekHasBriefing } from '../utils/planCarryForward';
```

- [ ] **Step 2: Replace the nav-away cleanup effect's plan call**

Find the `useEffect` cleanup block that calls `generateAndSavePlan` (around line 196-ish, inside the return function of a `useEffect`). Replace `nextWeekHasPlan` with `nextWeekHasBriefing` and replace the `generateAndSavePlan(...)` call with `generateAndSaveBriefing(...)`. The argument object should now be:

```ts
generateAndSaveBriefing({
  classId: cls.id,
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
  expandedSummary: expandedSummary ?? undefined,
});
```

Remove the `previousPlans`, `progressionHints`, `repetitionFlags`, `attendanceNote` arguments — those concepts don't apply to the new briefing flow. (If the existing code references `buildPreviousPlans()` or progression helpers only for this call, those helper invocations can be deleted too.)

- [ ] **Step 3: Rewire the End Class button's handler**

Find the button's `onClick` handler (search for `setIsEndingClass(true)` or the function that currently calls `generatePlan` / `generateAndSavePlan`). Replace its plan-call body with a briefing-call. The full handler should now look like:

```ts
  const handleEndClass = async () => {
    if (!cls || !classId || endClassLockRef.current) return;
    endClassLockRef.current = true;
    setIsEndingClass(true);

    try {
      // 1. Expand notes into a summary if not done yet
      let summary = expandedSummary;
      if (!summary && classNotesRef.current.liveNotes.length > 0) {
        try {
          summary = await aiExpandNotes(
            cls.name,
            classNotesRef.current.liveNotes,
            aiContextRef.current,
          );
          setExpandedSummary(summary);
        } catch (err) {
          console.warn('aiExpandNotes failed, continuing without summary:', err);
          summary = undefined;
        }
      }

      // 2. Generate + save the briefing to next week
      await generateAndSaveBriefing({
        classId: cls.id,
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
        notes: classNotesRef.current.liveNotes,
        viewingWeekStart: viewingWeekStartRef.current,
        saveWeekNotes,
        aiContext: aiContextRef.current,
        expandedSummary: summary,
      });

      // 3. Mark this week's class as organized
      const updatedClassNotes: ClassWeekNotes = {
        ...classNotesRef.current,
        isOrganized: true,
      };
      const updatedWeekNotes = {
        ...weekNotes,
        classNotes: { ...weekNotes.classNotes, [classId]: updatedClassNotes },
      };
      saveWeekNotes(updatedWeekNotes);

      // 4. Prevent the nav-away cleanup from double-firing
      planGenerationFiredRef.current = true;

      // 5. Navigate back to Schedule, preserving week/day params
      navigate(scheduleBack);
    } finally {
      setIsEndingClass(false);
    }
  };
```

Wire this handler to the End Class button's `onClick`. The button JSX should already exist — just ensure it calls `handleEndClass`.

- [ ] **Step 4: Remove stale imports**

If `aiGeneratePlan`, `generateAndSavePlan`, or plan-specific helpers (`buildPreviousPlans`, etc.) are no longer referenced after the rewire, remove their imports.

Run: `grep -n "aiGeneratePlan\|generatePlan\|generateAndSavePlan\|nextWeekHasPlan\|buildFallbackPlan" src/pages/LiveNotes.tsx`
Expected: 0 matches.

- [ ] **Step 5: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/LiveNotes.tsx
git commit -m "LiveNotes: one-button End Class — expand, generate briefing, mark organized, nav back"
```

---

### Task 11: Cluster 2 smoke test

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/dixxx/figgg && npm run dev`
Expected: Vite dev server starts, prints a local URL (typically `http://localhost:5173`).

- [ ] **Step 2: Open preview in browser and verify the LiveNotes flow**

Use preview tools to open the dev URL. In the app:

1. Navigate to `/more` → tap `Schedule` (nav hasn't been fixed yet — Schedule is still under More at this cluster boundary).
2. Tap any class scheduled for today. The route `/class/:classId/notes` should open.
3. Verify the top of the screen shows the `From last week` briefing card (if the class had a plan from last week, it renders as legacy fallback; if it had a structured briefing, it renders the 3 sections; if neither, the card is absent).
4. Type a note. The tag picker must NOT appear. Submit with Enter.
5. Verify the note row shows a hollow star (☆) on the right.
6. Tap the star. It should fill gold (★).
7. Tap it again — back to hollow.
8. Verify no attendance section is rendered.
9. Verify no "Next week goal" textbox is rendered.
10. Flag one note, then tap `End Class`.
11. Button shows loading state, then navigates back to `/schedule`.
12. Navigate to the same class but for NEXT week (`?week=1` in URL or click next-week chevron on Schedule). The briefing card should now show the 3 sections, with the flagged note verbatim at the top of `For today`.

- [ ] **Step 3: If issues found, fix and re-commit**

Fix any bugs inline, then commit as needed. Do not proceed to Cluster 3 until steps 2.4–2.12 pass.

- [ ] **Step 4: Stop the dev server**

---

## Cluster 3 — Nav cleanup

Ends with build passing and the final smoke test: Schedule is in primary nav, Notes is gone, `/notes` redirects.

---

### Task 12: Delete `Notes.tsx` page and `notesSearch.ts` service

**Files:**
- Delete: `src/pages/Notes.tsx`
- Delete: `src/services/notesSearch.ts`

- [ ] **Step 1: Confirm nothing else imports them**

Run: `grep -rn "from.*pages/Notes\|from.*services/notesSearch" src`
Expected: only `src/App.tsx` references `pages/Notes` (we'll fix this in Task 13). No files reference `services/notesSearch`.

If there are other references, resolve them before deleting.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/dixxx/figgg
rm src/pages/Notes.tsx src/services/notesSearch.ts
```

- [ ] **Step 3: Commit (the file deletions — App.tsx fix comes next and will complete this cluster's build)**

Do NOT build yet — App.tsx still imports these. Fix in Task 13 first, then build.

---

### Task 13: Update App.tsx — remove Notes import, redirect `/notes` → `/schedule`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove the lazy import**

Find (around line 131):

```ts
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
```

Delete this line.

- [ ] **Step 2: Change the `/notes` route to a redirect**

Find (around line 163):

```tsx
<Route path="/notes" element={<Notes />} />
```

Replace with:

```tsx
<Route path="/notes" element={<Navigate to="/schedule" replace />} />
```

(`Navigate` is already imported from `react-router-dom` at the top of the file — confirm with `grep`.)

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds. No dangling Notes reference.

- [ ] **Step 4: Commit both file deletions and App.tsx change together**

```bash
cd /Users/dixxx/figgg
git add -A src/pages/Notes.tsx src/services/notesSearch.ts src/App.tsx
git commit -m "nav: delete Notes page + notesSearch service, redirect /notes to /schedule"
```

---

### Task 14: Restore Schedule to primary nav; remove Notes from nav

**Files:**
- Modify: `src/components/common/Header.tsx`

- [ ] **Step 1: Update the `navItems` array**

Find (around line 18):

```ts
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/meds', icon: Pill, label: 'Meds' },
  { path: '/notes', icon: FileText, label: 'Notes' },
  { path: '/me', icon: Heart, label: 'Wellness' },
  { path: '/more', icon: MoreHorizontal, label: 'More' },
];
```

Replace with:

```ts
// Primary nav: Home, Schedule, Meds, Wellness, More (Apr 2026 — Schedule restored, Notes page killed)
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/meds', icon: Pill, label: 'Meds' },
  { path: '/me', icon: Heart, label: 'Wellness' },
  { path: '/more', icon: MoreHorizontal, label: 'More' },
];
```

- [ ] **Step 2: Update the lucide import**

Find:

```ts
import {
  Home,
  Pill,
  FileText,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Heart,
  MoreHorizontal,
  WifiOff,
} from 'lucide-react';
```

Replace with (remove `FileText`, add `Calendar`):

```ts
import {
  Home,
  Pill,
  Calendar,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Heart,
  MoreHorizontal,
  WifiOff,
} from 'lucide-react';
```

- [ ] **Step 3: Update the `MobileNav.isActive()` function**

Find (around line 136-159):

```ts
  const isActive = (item: typeof navItems[0]) => {
    const { path } = item;
    if (path === '/') return location.pathname === '/';
    if (path === '/meds') return location.pathname.startsWith('/meds');
    if (path === '/notes') {
      // Notes hub owns /notes plus the capture routes (class + event notes)
      return location.pathname === '/notes' ||
             location.pathname.startsWith('/class') ||
             location.pathname.startsWith('/event');
    }
    if (path === '/me') return location.pathname === '/me';
    if (path === '/more') {
      return location.pathname.startsWith('/more') ||
             location.pathname.startsWith('/settings') ||
             location.pathname.startsWith('/library') ||
             location.pathname.startsWith('/dance') ||
             location.pathname.startsWith('/students') ||
             location.pathname.startsWith('/schedule') ||
             location.pathname.startsWith('/tasks') ||
             location.pathname.startsWith('/plan') ||
             location.pathname === '/week-review';
    }
    return location.pathname === path;
  };
```

Replace with:

```ts
  const isActive = (item: typeof navItems[0]) => {
    const { path } = item;
    if (path === '/') return location.pathname === '/';
    if (path === '/meds') return location.pathname.startsWith('/meds');
    if (path === '/schedule') {
      // Schedule owns /schedule plus the in-class note capture routes
      return location.pathname.startsWith('/schedule') ||
             location.pathname.startsWith('/class') ||
             location.pathname.startsWith('/event');
    }
    if (path === '/me') return location.pathname === '/me';
    if (path === '/more') {
      return location.pathname.startsWith('/more') ||
             location.pathname.startsWith('/settings') ||
             location.pathname.startsWith('/library') ||
             location.pathname.startsWith('/dance') ||
             location.pathname.startsWith('/students') ||
             location.pathname.startsWith('/tasks') ||
             location.pathname.startsWith('/plan') ||
             location.pathname === '/week-review';
    }
    return location.pathname === path;
  };
```

Key diffs: `/schedule` now owns its own branch (and captures `/class` + `/event` so the Schedule tab stays highlighted while in LiveNotes). `/more` no longer claims `/schedule`. `/notes` branch removed entirely.

- [ ] **Step 4: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/Header.tsx
git commit -m "nav: restore Schedule to primary nav, remove Notes tab"
```

---

### Task 15: Remove `Schedule` row from MoreHub

**Files:**
- Modify: `src/pages/MoreHub.tsx`

- [ ] **Step 1: Remove the Schedule row**

Find (around line 52-56):

```tsx
  const scheduleRows: HubRow[] = [
    { to: '/schedule', icon: Calendar, label: 'Schedule', color: 'var(--color-sage)' },
    { to: '/plan', icon: ClipboardList, label: 'Week Planner', color: 'var(--accent-secondary)' },
    { to: '/week-review', icon: CalendarCheck, label: 'Week Review', color: 'var(--color-honey)' },
  ];
```

Replace with:

```tsx
  const scheduleRows: HubRow[] = [
    { to: '/plan', icon: ClipboardList, label: 'Week Planner', color: 'var(--accent-secondary)' },
    { to: '/week-review', icon: CalendarCheck, label: 'Week Review', color: 'var(--color-honey)' },
  ];
```

- [ ] **Step 2: Remove unused icon import**

In the MoreHub import block, remove `Calendar` if it's no longer referenced:

```ts
import {
  Users, BookOpen, Settings, MessageCircle,
  CalendarCheck, ChevronRight, Calendar, ListChecks, ClipboardList,
} from 'lucide-react';
```

Run: `grep -c "Calendar[^C]" src/pages/MoreHub.tsx`
If the count is 1 (only the import), remove `Calendar` from the import:

```ts
import {
  Users, BookOpen, Settings, MessageCircle,
  CalendarCheck, ChevronRight, ListChecks, ClipboardList,
} from 'lucide-react';
```

- [ ] **Step 3: Build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/MoreHub.tsx
git commit -m "MoreHub: remove Schedule row (back in primary nav)"
```

---

### Task 16: Final smoke test

- [ ] **Step 1: Start dev server**

Run: `cd /Users/dixxx/figgg && npm run dev`

- [ ] **Step 2: Verify primary nav**

Open the app. Bottom nav should show (left to right): `Home`, `Schedule`, `Meds`, `Wellness`, `More`. No `Notes` tab.

- [ ] **Step 3: Verify `/notes` redirect**

Visit `http://localhost:5173/notes` directly. URL should change to `/schedule` and Schedule should render.

- [ ] **Step 4: Verify Schedule → LiveNotes flow**

Tap `Schedule` in primary nav. Select today's day. Tap any class. Verify `/class/:classId/notes` opens and:
- The Schedule tab in the bottom nav stays highlighted (not More).
- Input bar has no tag picker.
- Each note row shows a star toggle on the right.
- `From last week` briefing card shows at top (either structured briefing for new weeks, legacy plan for old weeks, or hidden if neither).
- No attendance section.
- No next-week-goal textbox.

- [ ] **Step 5: Verify MoreHub**

Tap `More`. Verify `Schedule` row is gone. `Week Planner` and `Week Review` remain under Schedule & Planning (or whatever section they were in).

- [ ] **Step 6: Verify EventNotes regression**

Navigate to a calendar event's notes page (`/event/:eventId/notes`). Verify:
- The tag picker IS still shown (EventNotes uses default `showTags=true`).
- Existing behavior unchanged.
- No star icon (EventNotes doesn't pass `showFlag`).

- [ ] **Step 7: If anything fails, fix and commit**

Fix inline. Commit as needed.

- [ ] **Step 8: Stop dev server**

---

### Task 17: Lint and final commit

- [ ] **Step 1: Run lint**

Run: `cd /Users/dixxx/figgg && npm run lint`
Expected: passes (or only prints warnings that existed before this work).

If new errors: fix them inline. Common culprits after a sweep like this:
- Unused imports in `LiveNotes.tsx`
- Unused vars from removed attendance / tag state

- [ ] **Step 2: If lint made changes, commit**

```bash
cd /Users/dixxx/figgg
git add -A
git commit -m "chore: lint cleanup after briefing redesign"
```

- [ ] **Step 3: Final build verification**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: clean build.

- [ ] **Step 4: Report to Dixon**

Share: commit range, summary of what changed, and note that deployment (`~/bin/firebase deploy --only hosting`) is Dixon's call — do not deploy automatically.

---

## Self-Review Notes

This plan covers the spec's 3-cluster implementation order. Verified:

- **Types** (spec §Data model) → Tasks 1-2
- **AI briefing** (spec §AI briefing generation) → Task 3
- **Fallback + carry-forward helpers** (spec §Fallback, §End Class button behavior) → Task 4
- **Shared component props** (spec §LiveNotes surface) → Task 5
- **BriefingDisplay** (spec §Rendering the briefing) → Task 6
- **Strip old UI** (spec §Removed from this screen) → Task 7
- **Render new briefing** (spec §LiveNotes surface, point 2) → Task 8
- **Star flag wiring** (spec §LiveNotes surface, point 4) → Task 9
- **One-button End Class + cleanup effect** (spec §End Class button behavior) → Task 10
- **Cluster 2 smoke test** → Task 11
- **Delete Notes page/service, redirect route** (spec §Nav cleanup) → Tasks 12-13
- **Primary nav swap** (spec §Nav cleanup) → Task 14
- **MoreHub cleanup** (spec §Nav cleanup) → Task 15
- **Final verification** (spec §Success criteria) → Tasks 16-17

**Known gaps that are out of scope** (explicitly called out in spec §Non-goals):
- Server-side `aiChat` handler for `mode: 'generate-briefing'` — must exist in `functions/` before the non-fallback path works end-to-end. Task 3 notes this; fallback path works regardless.
- EventNotes.tsx migration to briefing model — intentionally untouched.
- Migration script for legacy `plan` / `category` / `attendance` fields — graceful degradation used instead.

**Legacy data check:** The spec says old weeks' `plan` blob should render as-is. Verified by BriefingDisplay fallback logic (Task 6): when `briefing` is absent, `legacyPlan` renders via PlanDisplay.

**Type consistency check:** All references to `flaggedForNextWeek`, `Briefing`, `BriefingDisplay`, `generateBriefing`, `buildFallbackBriefing`, `generateAndSaveBriefing`, `nextWeekHasBriefing` use consistent casing and signatures across tasks.
