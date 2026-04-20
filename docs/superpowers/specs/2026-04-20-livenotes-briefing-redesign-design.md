# LiveNotes Briefing Redesign

**Date:** 2026-04-20
**Status:** Approved, ready for implementation plan

## Why

The Apr 19 Curtain Call redesign promoted a searchable global `/notes` page to primary nav and demoted `Schedule` to MoreHub. That inverted the priority of the actual workflow: Dixon opens Figgg during teaching to pull up the class he's in and take notes — he doesn't open it to do full-text searches across every note he's ever taken.

At the same time, the in-class note surface itself has accumulated friction. The 4-category tag picker (`worked-on` / `needs-work` / `next-week` / `ideas`) forces a decision before typing, attendance tracking lives on the same screen but is about to become irrelevant (CAA exit June 1, DWD ProSeries doesn't track per-class attendance the same way), and the carry-forward plan arrives as a rigid `PRIORITY / NEEDS WORK / LAST WEEK / GENERAL / IDEAS` text blob that doesn't match how Dixon actually wants to be reminded.

This redesign collapses all of that:

- Restore Schedule to primary nav; delete the standalone Notes page.
- Remove tagging from the input flow. Replace with a single optional "flag for next week" star toggle on posted notes.
- Remove attendance UI from LiveNotes entirely.
- Replace the carry-forward plan blob with a structured 3-part **briefing**: *What we did*, *How it went*, *For today*.
- Consolidate End Class into a single button that expands, generates the briefing, saves, and navigates back.

## What changes for the user

**Primary nav:** `[Home, Meds, Notes, Wellness, More]` → `[Home, Schedule, Meds, Wellness, More]`. The `/notes` route is deleted (redirects to `/schedule`).

**Opening a class for the first time of the week:** A collapsible card at the top shows last week's briefing — three labeled sections: *What we did* (AI recap, prose), *How it went* (AI assessment, prose), *For today* (bulleted, flagged notes verbatim first). Card auto-collapses once Dixon posts his first note of the current class.

**During class:** Type a note, send. No category picker. No attendance to mark. Each posted note has a star icon — tap to flag it for next week (star fills gold), tap again to unflag. Star-flagged notes land verbatim at the top of next week's *For today* section; everything else feeds the AI's recap and assessment.

**Ending class:** One button — `End Class`. It runs AI expand-summary, generates the structured briefing, writes it to next week's `ClassWeekNotes`, marks `isOrganized: true`, navigates back to Schedule. If Dixon nav-aways without tapping the button, the same pipeline runs automatically (existing cleanup-effect behavior, kept as safety net).

## Data model

### `LiveNote`

```ts
interface LiveNote {
  id: string;
  text: string;
  timestamp: string;
  flaggedForNextWeek?: boolean;   // NEW — the star toggle
  category?: string;              // KEPT OPTIONAL for legacy data only; never set on new notes
}
```

### `ClassWeekNotes`

```ts
interface ClassWeekNotes {
  classId: string;
  liveNotes: LiveNote[];
  isOrganized: boolean;

  briefing?: {                    // NEW structured field
    recap: string;                // "What we did" — 2-3 sentence prose
    assessment: string;           // "How it went" — 2-3 sentence prose
    forToday: string[];           // "For today" — bullets, flagged first
    generatedAt: string;          // ISO timestamp
  };

  plan?: string;                  // KEPT for backwards compat; legacy weeks render as-is
  // attendance field deprecated — not written on new data, old data ignored in UI
  // ...other existing fields unchanged (media, weekIdea, eventTitle, etc.)
}
```

### Legacy data handling (no migration script)

| Legacy field | What happens |
|---|---|
| `LiveNote.category` on old notes | Ignored in UI. Data preserved in storage. |
| `ClassWeekNotes.plan` on old weeks | Rendered as-is under "Last week's plan" header when `briefing` is absent. |
| `ClassWeekNotes.attendance` on old weeks | Ignored in UI. Data preserved in storage. |
| Old `WeekNotes` records | Untouched. |

New writes never populate `plan`, `attendance`, or `LiveNote.category`.

## AI briefing generation

New service function in [src/services/ai.ts](../../src/services/ai.ts): `generateBriefing(input) → Briefing`.

**Input:**
- `liveNotes: LiveNote[]` — last week's full note stream with `flaggedForNextWeek` flags
- `classInfo` — name, level, recital song, choreography notes
- `previousBriefings?: Briefing[]` — last 1-2 prior briefings for continuity (optional)
- `expandedSummary?: string` — the AI expand-summary output, if present
- `context: AIContextPayload` — existing AI context (time of day, upcoming events, etc.)

**Output:**

```json
{
  "recap": "Worked foot articulation drills and added the new center combo. Spent about half the class on the recital piece's second 16.",
  "assessment": "Class is tighter than last week — the recital piece is coming together. Three dancers are still hesitant on the fouetté sequence and need another pass.",
  "forToday": [
    "Warm up feet more — they were cold at the start (flagged)",
    "Revisit fouetté sequence with the three who struggled last week",
    "New combo needs one more run-through for spacing"
  ]
}
```

**Briefing rules:**
- `forToday` stays ≤5 items. Flagged notes appear first, verbatim-ish (light cleanup for typos/grammar only).
- Non-flagged notes are paraphrased into `recap` / `assessment`.
- Tone matches existing AI services in the app — dance-teacher warm, not corporate.
- If Dixon left a `weekIdea` (the old next-week-goal field) on an old class week, include it as a flagged item in the forward-generated briefing.

**Fallback (AI call fails):** `buildFallbackBriefing(notes) → Briefing`:
- `recap`: "Notes from last class:\n" + bullet dump of all non-flagged notes
- `assessment`: `""` (empty string; UI hides the section if empty)
- `forToday`: verbatim text of each flagged note (empty array if none flagged)

Replaces `buildFallbackPlan()` in [src/utils/planCarryForward.ts](../../src/utils/planCarryForward.ts).

## LiveNotes surface

Layout (top → bottom):

1. **Header** — back chevron, class name, date (`Mon, Apr 20 · 5:00 PM`)
2. **Last week briefing card** (collapsible, auto-collapses after first note posted)
   - If `briefing` present: three labeled sections
   - If only legacy `plan` string: single "Last week's plan" block
   - If neither: hidden entirely
3. **Input bar** — `[ Type a note… ] [send]`. Terminology autocomplete kept, stripped of category-boost logic.
4. **Today's notes** — stream of posted notes (order preserved from existing LiveNotes behavior, not changed by this redesign). Each note row:
   - Timestamp (right-aligned, serif tabular)
   - Note text
   - Star icon (☆ default, ★ gold when flagged)
5. **End Class button** (sticky at bottom when notes exist, hidden otherwise)

**Removed from this screen:**
- Attendance section (showAttendance, roster buttons, present/absent/late buckets, Quick Add Student inline form)
- 4-category tag picker (`selectedTag`, `TAG_CATEGORY_BOOSTS`, `SHORT_CATEGORY_LABELS`)
- Category pill badges on note rows
- "Next week goal" textbox (`showNextWeekGoal`, `nextWeekGoalDraft`, `nextWeekGoalSaved`)

**Kept on this screen:**
- AI reminder detection (`aiDetectReminders`)
- AI expand summary (`aiExpandNotes`) — now feeds the briefing instead of the plan blob
- Dancer flag quick-reminder (`Flag` button + `showFlagDancerPicker`) — creates a targeted reminder for a specific student, orthogonal to attendance
- Terminology autocomplete — simplified to show all relevant categories (no tag-based boosts)
- Dance linking (`detectLinkedDances`)
- Time-remaining / class-date display
- Auto-generate-on-nav-away safety net (the existing cleanup effect in [LiveNotes.tsx](../../src/pages/LiveNotes.tsx))

## End Class button behavior

One tap:

1. Show loading state on the button
2. If any notes exist and no expanded summary yet: run `aiExpandNotes(notes)` → store as `expandedSummary`
3. Build AI context (existing `buildAIContext` call)
4. Call `generateBriefing({ notes, classInfo, expandedSummary, previousBriefings, context })`
5. On success: write structured briefing to next week's `ClassWeekNotes.briefing`
6. On AI failure: write `buildFallbackBriefing(notes)` to next week's `ClassWeekNotes.briefing`
7. Mark current week's `classNotes.isOrganized = true`
8. Navigate back to `/schedule` (preserving week/day query params)

**Auto-trigger on nav-away:** The existing cleanup effect is kept as-is but updated to call `generateBriefing` / `buildFallbackBriefing` instead of `generatePlan` / `buildFallbackPlan`. Same guards (only fires if notes exist, not already organized, next week doesn't already have a briefing).

## Nav cleanup

- Remove `Notes` entry from bottom nav in [src/components/common/Header.tsx](../../src/components/common/Header.tsx) (or wherever tabs are registered)
- Add `Schedule` entry back to primary nav (it was moved to MoreHub in the Curtain Call commit)
- Remove `Schedule` entry from [src/pages/MoreHub.tsx](../../src/pages/MoreHub.tsx)
- In [src/App.tsx](../../src/App.tsx): replace `/notes` route with a redirect to `/schedule`
- Delete files: `src/pages/Notes.tsx`, `src/services/notesSearch.ts`

## Implementation order

Three clusters, build sequentially:

1. **Data + AI layer** (no UI changes yet)
   - Update `LiveNote` and `ClassWeekNotes` types
   - Add `generateBriefing()` in `src/services/ai.ts`
   - Add `buildFallbackBriefing()` in `src/utils/planCarryForward.ts`
   - Rename / update `generateAndSavePlan()` to `generateAndSaveBriefing()` writing to new briefing field
   - Keep legacy `generatePlan` / `buildFallbackPlan` temporarily if needed for compatibility, remove once LiveNotes is rewired

2. **LiveNotes surface rewrite**
   - Strip category picker, attendance section, next-week-goal textbox
   - Add star toggle to note rows
   - Rewire input bar: no tag state, simplified terminology autocomplete
   - Render 3-part briefing card at top (collapsible, auto-collapse after first note)
   - Rewire End Class button to the one-button flow above
   - Update cleanup effect to use new briefing generator

3. **Nav cleanup**
   - Delete Notes page, service, route
   - Add Schedule back to primary nav, remove from MoreHub
   - Redirect `/notes` → `/schedule`

## Non-goals

Explicitly out of scope for this redesign:

- Voice-input for notes
- Per-dancer note threading or grouping
- Photo / video attachment to notes
- Class-type-specific briefing templates (ballet vs jazz vs rehearsal)
- Home-screen "current class" card rework (handled separately if needed)
- Migration script for legacy `plan` / `category` / `attendance` data (graceful degradation in UI is the strategy)

## Success criteria

After implementation, Dixon should be able to:

- Open Figgg during class, tap the class from `Schedule`, see last week's briefing at the top, start typing notes without picking a category
- Flag a note for next week with a single tap on a star icon
- Tap `End Class` once and have the briefing generated and saved to next week
- Walk into next week's class and see *What we did / How it went / For today* immediately, with any starred notes from last week appearing verbatim at the top of *For today*
- Never see the attendance roster, the 4-category tag picker, or the standalone searchable `/notes` page again

Old class weeks remain readable (plan blob renders as-is, legacy category pills and attendance data exist in storage but aren't shown in the new UI).
