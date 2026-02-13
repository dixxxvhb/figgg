# Smart Notes: Cross-Session Note Continuity for Calendar Events

**Date:** 2026-02-13
**Status:** Approved
**Scope:** Calendar events only (does NOT touch Class-based AI plan generation)

## Problem

Calendar events like therapy sessions appear as isolated notes. Each occurrence gets a unique event ID (hash of title+date+time), so notes from last week's therapy are invisible when opening this week's session. The user starts from a blank slate every time.

## Solution

Two features that work together:

1. **Carry-Forward Banner** — When opening notes for a calendar event, automatically populate the `plan` field with the previous session's `nextWeekGoal` (or `plan` as fallback). Show a dismissable banner attributing the source. Once dismissed, it stays dismissed for that event.

2. **Previous Sessions Panel** — A collapsible read-only section below the current notes showing all past sessions with the same event title, newest first. Each expandable to show that session's live notes, plan, and next-week goal.

## Design Decisions

- **Option A: All events automatically** — no opt-in. If a title matches, history appears. One-off events just show an empty history panel (or no panel at all).
- **Banner style: visible attribution + permanent dismiss** — "Carried forward from [date]" with X button. Once dismissed, `carryForwardDismissed` flag is set and banner never returns for that event.
- **Exact title match, case-insensitive** — therapy calendar entries consistently use the same title (e.g., "Therapy with Brian"). No fuzzy matching needed.
- **No interference with AI class plans** — Smart Notes only activates for entries with an `eventTitle` field. Class-based notes never set this field.

## Data Model Changes

Two optional fields added to `ClassWeekNotes`:

- `eventTitle?: string` — The calendar event's title, persisted alongside notes so matching works even after the event leaves the calendar sync window.
- `carryForwardDismissed?: boolean` — Set to `true` when the user dismisses the carry-forward banner. Permanent per event.

No other type changes. No new types.

## Matching Logic

When notes are opened for a calendar event:

1. Save `eventTitle` on the current event's `ClassWeekNotes` (if not already set).
2. Scan all `WeekNotes` across all stored weeks. Collect every `ClassWeekNotes` entry where `eventTitle` matches the current event title (case-insensitive).
3. Exclude the current event itself from results. Sort by week date descending (newest first).
4. **Carry-forward:** From the most recent match, take `nextWeekGoal` if it exists, otherwise `plan`. Populate the current event's `plan` field if it's currently empty. Skip if the current event already has a plan or if `carryForwardDismissed` is true.
5. **History panel:** Display all matches as expandable read-only cards.

## Carry-Forward Priority

1. Previous session's `nextWeekGoal` (highest intent — the user explicitly wrote this for next time)
2. Previous session's `plan` (fallback — at least shows what the plan was)
3. Nothing (no banner shown)

## UI Components

### Carry-Forward Banner
- Location: Top of EventNotes page, above the note input area
- Appearance: Subtle info banner (forest/cream theme), not modal
- Content: "Carried forward from [Month Day]" + the carried text preview
- Action: X button to dismiss permanently (sets `carryForwardDismissed = true`, saves immediately)
- The carried text is placed into the `plan` field and editable — user can modify or clear it

### Previous Sessions Panel
- Location: Below current notes area
- Default state: Collapsed, showing count ("3 previous sessions")
- Expanded: List of past sessions, newest first
- Each session card shows: date, live notes (truncated), plan, nextWeekGoal
- Tap to expand full session details
- Read-only — no editing past sessions from here
- If no matching past sessions exist, panel is hidden entirely

## Scope Boundaries

- Only runs for CalendarEvent-based notes (identified by presence of `eventTitle` field)
- Class-based notes (weekly recurring dance classes) are untouched
- AI plan generation (`endClass` flow) is untouched
- Cloud sync works automatically — `eventTitle` and `carryForwardDismissed` are just new fields on an existing synced object
- No new Netlify functions needed
- No new API calls

## Performance

Matching scans all WeekNotes (O(weeks * entries per week)). Even after a year of heavy use this is a few hundred entries at most — no index or caching needed. Simple filter loop.

## Files to Modify

- `src/types/index.ts` — Add `eventTitle` and `carryForwardDismissed` to `ClassWeekNotes`
- `src/pages/EventNotes.tsx` — Add matching logic, carry-forward, banner, and history panel
- `src/components/` — New `CarryForwardBanner` and `PreviousSessionsPanel` components
- `src/hooks/useAppData.ts` — Possibly add a helper for scanning matching notes (or keep it in EventNotes)
