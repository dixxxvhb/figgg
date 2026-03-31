# Note Carry-Forward: Never Lose Notes Again

**Date:** 2026-03-31
**Status:** Approved
**Problem:** Notes taken during class only generate next-week plans when "End Class" is pressed. If Dixon navigates away without ending class, notes sit in Firestore with no plan generated. Additionally, the fallback logic (when AI fails) drops unlabeled notes entirely.

## Architecture: Three Layers

### Layer 1 — Navigate-Away Auto-Trigger (Client)

**Files:** `src/utils/planCarryForward.ts` (new), `src/pages/LiveNotes.tsx`, `src/pages/EventNotes.tsx`

When LiveNotes or EventNotes unmounts (back button, tab switch, navigate anywhere) or the browser closes/refreshes (`beforeunload`), automatically fire plan generation if:
- `classNotes.liveNotes.length > 0` (notes exist)
- `!classNotes.isOrganized` (End Class wasn't pressed)
- No plan generation already in flight (tracked via ref)

Behavior:
- Calls `generateAndSavePlan()` from shared utility — identical to End Class logic
- Does NOT set `isOrganized = true` — if user returns and formally ends class, that overwrites with a potentially better plan (more notes, attendance, etc.)
- Fire-and-forget — no UI, no modal, no blocking navigation
- `beforeunload` handler sets a flag in localStorage (`pendingPlanGeneration:{classId}`) so the app knows to trigger plan generation on next mount if the Cloud Function call didn't complete. The nightly sweep is the true safety net for hard browser kills.

### Layer 2 — Fix Fallback Logic (Client)

**File:** `src/utils/planCarryForward.ts` (new shared utility)

Current bugs:
- `LiveNotes.tsx` line 800: unlabeled notes only included if zero categorized notes exist
- `EventNotes.tsx` line 491: bails out entirely if no next-week or needs-work tagged notes

Fixed fallback (`buildFallbackPlan`):
- Always includes ALL notes regardless of category
- Groups: PRIORITY (next-week), NEEDS WORK (needs-work), LAST WEEK (worked-on), GENERAL (unlabeled + ideas)
- Never bails out — if notes exist, a fallback plan is written. Period.

### Layer 3 — Nightly Sweep Cloud Function (Server)

**File:** `functions/src/nightlySweep.ts` (new)

Scheduled Cloud Function at 10pm ET daily.

Process:
1. Query all users from Firestore
2. For each user, get current week's `weekNotes` document
3. Scan every `classNotes` entry for orphaned notes:
   - `liveNotes.length > 0` (notes were taken)
   - Next week's `weekNotes` has no corresponding entry with a non-empty `plan`
4. For each orphaned class:
   - Fetch class info from `/users/{uid}/classes/{id}` or `/users/{uid}/calendarEvents/{id}`
   - Call Claude Sonnet with the same prompt as `generatePlan.ts`
   - Write plan to next week's document using field-level dot-notation updates
5. Skip classes currently in session or ended < 30 minutes ago (check endTime vs current time)

Config:
- Schedule: `every day 22:00` (America/New_York)
- Timeout: 300 seconds
- Memory: 512MiB
- Uses Admin SDK (bypasses security rules)
- Uses `ANTHROPIC_API_KEY` secret (same as other AI functions)

## Shared Utilities

### Client: `src/utils/planCarryForward.ts`

```typescript
// Main entry point — fire-and-forget plan generation + save
generateAndSavePlan(options: {
  classId: string;
  classInfo: ClassInfoForAI;
  notes: LiveNote[];
  weekNotes: WeekNotes;
  viewingWeekStart: Date;
  saveWeekNotes: (wn: WeekNotes) => void;
  data: AppData;  // for previous plans, progression hints, etc.
  aiContext: AIContextPayload;
  eventTitle?: string;        // for calendar events
  nextWeekGoal?: string;      // carry forward goal
  attendance?: AttendanceData; // for attendance context
}): void

// Fixed fallback — always includes all notes
buildFallbackPlan(notes: LiveNote[]): string
```

### Server: `functions/src/utils/planPrompt.ts`

```typescript
// Extract from generatePlan.ts — builds the full Claude prompt
buildPlanPrompt(options: {
  classInfo: ClassInfo;
  notes: LiveNote[];
  previousPlans?: string[];
  progressionHints?: string[];
  repetitionFlags?: string[];
  attendanceNote?: string;
  expandedSummary?: string;
}): string

// Shared note categorization
buildNotesBlock(notes: LiveNote[]): string

// Already exists in generatePlan.ts, moves here
normalizeCategory(cat?: string): string | undefined
```

## File Changes

| File | Change |
|------|--------|
| `src/utils/planCarryForward.ts` | NEW — shared plan generation + fallback logic |
| `src/pages/LiveNotes.tsx` | Replace inline endClass plan logic with `generateAndSavePlan()`. Add useEffect cleanup + beforeunload for auto-trigger. Remove ~100 lines of duplicated code. |
| `src/pages/EventNotes.tsx` | Same refactor as LiveNotes for endEvent. Remove ~80 lines of duplicated code. |
| `functions/src/utils/planPrompt.ts` | NEW — extracted prompt builder shared by generatePlan + nightlySweep |
| `functions/src/generatePlan.ts` | Refactor to import from `utils/planPrompt.ts`. No behavior change. |
| `functions/src/nightlySweep.ts` | NEW — 10pm scheduled sweep function |
| `functions/src/index.ts` | Add export for `nightlySweep` |

## What Does NOT Change

- Firestore structure — no new collections, same `weekNotes/{weekOf}` documents
- The "End Class" / "End Event" buttons — work exactly as before, just cleaner code
- AI prompt quality — identical prompt, shared source
- Real-time sync — plans written via `saveWeekNotes()` propagate normally
- Other Cloud Functions — untouched

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Navigate away then come back and End Class | Auto-trigger writes plan (isOrganized stays false). End Class overwrites with fresh plan (sets isOrganized true). Better plan wins. |
| Navigate away with 0 notes | Guard check: no notes = no trigger. Nothing happens. |
| AI fails on navigate-away AND on nightly sweep | Fallback plan written from raw notes. Always produces something. |
| Still teaching at 10pm (LADC Monday nights) | Sweep skips classes with endTime within 30 min of current time. |
| Multiple navigate-aways for same class | Ref tracks in-flight generation. Second unmount checks if next week already has a plan and skips if so. |
| Browser crash (no unmount fires) | Nightly sweep catches it. |
| Plan already exists in next week from previous session | Both auto-trigger and sweep check for existing non-empty plan before overwriting. |

## Testing

No test suite exists — verify with:
1. `npm run build` (TypeScript compilation)
2. `cd functions && npm run build` (Cloud Functions compilation)
3. Manual testing: take notes, navigate away without ending class, check next week's plans
4. Manual testing: wait for 10pm sweep (or trigger manually) and verify orphaned notes get plans
