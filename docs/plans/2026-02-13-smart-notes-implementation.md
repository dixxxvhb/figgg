# Smart Notes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cross-session note continuity for calendar events — carry-forward banner + previous sessions history panel.

**Architecture:** Two new optional fields on `ClassWeekNotes` (`eventTitle`, `carryForwardDismissed`). A matching utility scans all stored WeekNotes for title matches. EventNotes.tsx gets a carry-forward banner, a "Next Session Goal" input, and a collapsible Previous Sessions panel. No changes to the Class-based AI plan system.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react icons, date-fns

**Design Doc:** `docs/plans/2026-02-13-smart-notes-design.md`

---

### Task 1: Add new fields to ClassWeekNotes type

**Files:**
- Modify: `src/types/index.ts:72-89`

**Step 1: Add fields**

In the `ClassWeekNotes` interface, add two optional fields after `attendance`:

```typescript
  eventTitle?: string; // Calendar event title — persisted for cross-session matching
  carryForwardDismissed?: boolean; // True = user dismissed the carry-forward banner
```

These go after the `attendance` block (after line 88), before the closing `}`.

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build — new optional fields break nothing.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add eventTitle and carryForwardDismissed to ClassWeekNotes"
```

---

### Task 2: Create matching utility — findMatchingPastSessions

**Files:**
- Create: `src/utils/smartNotes.ts`

**Step 1: Create the utility**

Create `src/utils/smartNotes.ts` with a single exported function:

```typescript
import { WeekNotes, ClassWeekNotes } from '../types';

export interface PastSession {
  weekOf: string;
  eventId: string;
  notes: ClassWeekNotes;
}

/**
 * Scans all WeekNotes for ClassWeekNotes entries whose eventTitle
 * matches the given title (case-insensitive). Excludes the current
 * event by eventId. Returns matches sorted newest-first by weekOf.
 */
export function findMatchingPastSessions(
  allWeekNotes: WeekNotes[],
  eventTitle: string,
  currentEventId: string
): PastSession[] {
  const titleLower = eventTitle.toLowerCase().trim();
  const matches: PastSession[] = [];

  for (const week of allWeekNotes) {
    for (const [eventId, classNotes] of Object.entries(week.classNotes)) {
      if (
        eventId !== currentEventId &&
        classNotes.eventTitle &&
        classNotes.eventTitle.toLowerCase().trim() === titleLower
      ) {
        matches.push({
          weekOf: week.weekOf,
          eventId,
          notes: classNotes,
        });
      }
    }
  }

  // Sort newest first by weekOf date
  matches.sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime());

  return matches;
}

/**
 * Gets the carry-forward text from the most recent matching past session.
 * Priority: nextWeekGoal > plan > nothing.
 * Returns null if no suitable text found.
 */
export function getCarryForwardText(
  pastSessions: PastSession[]
): { text: string; sourceWeekOf: string; sourceField: 'nextWeekGoal' | 'plan' } | null {
  if (pastSessions.length === 0) return null;

  const mostRecent = pastSessions[0];

  if (mostRecent.notes.nextWeekGoal?.trim()) {
    return {
      text: mostRecent.notes.nextWeekGoal.trim(),
      sourceWeekOf: mostRecent.weekOf,
      sourceField: 'nextWeekGoal',
    };
  }

  if (mostRecent.notes.plan?.trim()) {
    return {
      text: mostRecent.notes.plan.trim(),
      sourceWeekOf: mostRecent.weekOf,
      sourceField: 'plan',
    };
  }

  return null;
}
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/utils/smartNotes.ts
git commit -m "feat: add Smart Notes matching utility for cross-session lookups"
```

---

### Task 3: Add "Next Session Goal" input to EventNotes

**Files:**
- Modify: `src/pages/EventNotes.tsx`

**Context:** Currently EventNotes has no way to set `nextWeekGoal`. Without this, there's nothing meaningful to carry forward. This adds a simple text input at the bottom of the notes list (above the input area), matching the same pattern used in LiveNotes.tsx (line 1407-1416).

**Step 1: Add state and save function**

After the existing state declarations (around line 31), the `nextWeekGoal` save uses the same update-and-save pattern as every other note operation in this file.

Add a `saveNextSessionGoal` function that updates `eventNotes.nextWeekGoal` and saves via `saveWeekNotes`, following the exact same pattern as `addNote` / `deleteNote` / etc.

**Step 2: Add the UI**

Inside the scrollable notes area (inside the `<div className="flex-1 overflow-y-auto">` around line 361), after the notes list and before the closing `</div>`, add a "Next Session Goal" section:

- A labeled textarea input with placeholder "What do you want to remember for next session?"
- Blue accent color (matching the "Next Week" tag: `bg-blue-50`, `text-blue-600`, etc.)
- Auto-saves on change (same as the existing plan auto-save pattern in LiveNotes)
- Uses the `Clock` icon from lucide-react (already imported)

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add src/pages/EventNotes.tsx
git commit -m "feat: add Next Session Goal input to EventNotes"
```

---

### Task 4: Persist eventTitle on note creation

**Files:**
- Modify: `src/pages/EventNotes.tsx`

**Context:** Every time notes are saved for a calendar event, ensure `eventTitle` is set on the `ClassWeekNotes` entry. This makes matching possible even after the event leaves the calendar sync window.

**Step 1: Add eventTitle to the default eventNotes object**

Where `eventNotes` is constructed (line 39-45), include `eventTitle: event.title` in the default object. Also, when an existing notes entry is found but has no `eventTitle`, backfill it.

The simplest approach: always spread `eventTitle: event.title` into every `updatedEventNotes` object that gets created. Since every save operation in EventNotes.tsx builds an `updatedEventNotes` from `...eventNotes`, just ensure the initial `eventNotes` includes the title:

```typescript
const eventNotes: ClassWeekNotes = existingNotes
  ? { ...existingNotes, eventTitle: event.title }
  : {
      classId: eventId || '',
      plan: '',
      liveNotes: [],
      isOrganized: false,
      media: [],
      eventTitle: event.title,
    };
```

This way, every subsequent spread of `...eventNotes` carries the title through. No other save operations need changes.

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/pages/EventNotes.tsx
git commit -m "feat: persist eventTitle on calendar event notes for cross-session matching"
```

---

### Task 5: Carry-forward banner

**Files:**
- Modify: `src/pages/EventNotes.tsx`

**Context:** When EventNotes opens, run the matching logic. If a carry-forward is found, populate the `plan` field and show a banner. The banner is permanently dismissable.

**Step 1: Add imports and matching logic**

Import `findMatchingPastSessions` and `getCarryForwardText` from `../utils/smartNotes`. Import `format` from `date-fns` (already imported) and `parseISO` if needed.

Inside the component, after the `eventNotes` construction:

1. Call `findMatchingPastSessions(data.weekNotes, event.title, eventId)` to get past sessions.
2. Call `getCarryForwardText(pastSessions)` to get carry-forward candidate.
3. Use a `useEffect` (runs once on mount) to check: if carry-forward text exists AND `eventNotes.plan` is empty AND `eventNotes.carryForwardDismissed` is not true → populate the plan field with the carry-forward text and save.
4. Track carry-forward source info in local state (for the banner display).

**Step 2: Add the banner UI**

Between the header and the existing plan display (around line 308), add a banner:

- Only shows when carry-forward was applied AND `carryForwardDismissed` is not true
- Cream/forest themed: `bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800`
- Text: "Carried forward from [Month Day]" with the source field label ("from your next-session goal" or "from your plan")
- X button on the right that sets `carryForwardDismissed: true` on the eventNotes and saves immediately
- Use `RotateCcw` or `ArrowRight` icon from lucide-react for the carry-forward visual

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 4: Test manually**

Run: `cd /Users/dixxx/figgg && npm run dev`
- Create notes on one calendar event, set a "Next Session Goal"
- Navigate to a different calendar event with the same title
- Verify: plan field is populated, banner shows source date
- Dismiss banner, verify it doesn't come back on page refresh

**Step 5: Commit**

```bash
git add src/pages/EventNotes.tsx
git commit -m "feat: add carry-forward banner for calendar event notes"
```

---

### Task 6: Previous Sessions panel

**Files:**
- Create: `src/components/events/PreviousSessionsPanel.tsx`
- Modify: `src/pages/EventNotes.tsx`

**Step 1: Create the PreviousSessionsPanel component**

Create `src/components/events/PreviousSessionsPanel.tsx`:

Props:
```typescript
interface PreviousSessionsPanelProps {
  sessions: PastSession[];  // from smartNotes utility
}
```

Component structure:
- If `sessions.length === 0`, return `null` (no panel at all)
- Collapsed state: shows count text like "3 previous sessions" with a chevron toggle
- Expanded state: list of session cards, each with:
  - Date header (formatted from `weekOf` using date-fns `format`)
  - `nextWeekGoal` if present (labeled "Goal for next session")
  - `plan` if present (labeled "Plan")
  - `liveNotes` — show first 3 notes truncated, with a "show all" toggle if more exist
  - Each card uses the standard `bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700` styling
- Use `History` icon from lucide-react for the section header
- All content is read-only

**Step 2: Wire into EventNotes**

In `EventNotes.tsx`, import and render `PreviousSessionsPanel` below the notes list, inside the scrollable area. Pass the `pastSessions` array computed in Task 5.

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 4: Test manually**

Run: `cd /Users/dixxx/figgg && npm run dev`
- Create notes across multiple calendar events with the same title (different dates)
- Open the latest one — verify Previous Sessions shows the older sessions
- Expand sessions, verify notes/plan/goal display correctly
- Verify one-off events (unique title) show no panel

**Step 5: Commit**

```bash
git add src/components/events/PreviousSessionsPanel.tsx src/pages/EventNotes.tsx
git commit -m "feat: add Previous Sessions panel to EventNotes"
```

---

### Task 7: Final verification and build

**Files:** None (verification only)

**Step 1: Full build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build, zero errors, zero warnings.

**Step 2: Manual integration test**

Run: `cd /Users/dixxx/figgg && npm run dev`

Test scenario:
1. Open any calendar event → add some notes → set a "Next Session Goal" → tap "Done & Save Notes"
2. Open a different calendar event with the **same title** but different date
3. Verify: plan field auto-populated with the goal from step 1
4. Verify: carry-forward banner shows "Carried forward from [date]"
5. Verify: Previous Sessions panel shows the session from step 1
6. Dismiss the banner → refresh → verify banner stays dismissed
7. Open a calendar event with a **unique title** → verify: no banner, no history panel
8. Open a dance class (Class object, not CalendarEvent) → verify: AI plan system works normally, no Smart Notes interference

**Step 3: Commit (if any final fixes needed)**

```bash
git add -A
git commit -m "fix: final Smart Notes adjustments"
```
