# Day Plan: Preserve Completions + Cloud Sync

**Date:** 2026-02-15
**Scope:** Fix day plan reset bug on re-plan, add cross-device sync for day plans

---

## Problem 1: Re-plan wipes completed items

When afternoon check-in triggers `generateDayPlan()`, it creates a brand-new plan
with fresh IDs and `completed: false`. All morning progress is lost.

### Fix: Merge strategy

**On re-plan (afternoon or manual):**

1. Snapshot the current plan's completed items before calling the AI
2. Pass completed items to the Netlify function so the AI knows what's done
3. Tell the AI in its system prompt: "Items marked completed are DONE — do not regenerate them"
4. After AI returns new items, merge:
   - Keep all completed items from the old plan (exact objects, no changes)
   - Add new uncompleted items from the AI response
   - For items that exist in BOTH old (uncompleted) and new: use the new version (AI may have adjusted time/priority)
   - Match old→new by: `sourceId` first (wellness/class items), then exact title match, then fuzzy title match

**Edge cases handled:**
- First plan of the day (no old plan): no merge needed, save as-is
- AI returns 0 items: keep old plan, don't wipe (already guarded)
- AI returns items that overlap with completed items (same sourceId): completed version wins
- Old plan from yesterday: ignore it, treat as fresh plan
- Wellness items completed in day plan but not in selfCare: sync both directions
- User manually unchecks item, then re-plan runs: unchecked item is fair game for AI to regenerate

### Files changed:
- `src/pages/Dashboard.tsx` — `generateDayPlan()` merge logic
- `netlify/functions/generateDayPlan.ts` — accept + use completed items context in prompt

---

## Problem 2: Day plans don't sync across devices

`saveDayPlan()` only writes to React state → localStorage. No cloud push.

### Fix: Immediate cloud sync (same pattern as selfCare)

1. Create `saveDayPlanToStorage()` in `storage.ts` — mirrors `saveSelfCareToStorage()`:
   - Write to localStorage immediately
   - Fetch cloud data
   - Compare `generatedAt` timestamps — newer wins
   - Push merged result to cloud
   - Use global mutex to prevent races

2. Wire `saveDayPlan` in `useAppData.ts` to call `saveDayPlanToStorage()` instead of just `setData`

3. In `syncFromCloud()` — add day plan merge: compare `generatedAt`, newer wins entire plan object

4. Day plan included in the main data blob (already in localStorage under `dance-teaching-app-data`, just not cloud-synced)

### Edge cases handled:
- Two devices generate plans at different times: `generatedAt` timestamp wins (newer plan)
- One device re-plans while other has old plan: re-planned version is newer, wins
- Device offline when plan generated: saves locally, syncs on reconnect
- Cloud has no day plan yet: local plan pushes up
- Both devices have same-day plans with different completions: `generatedAt` wins (the re-planned version is authoritative)
- Plan generated on device A, items completed on device B: completion saves update `generatedAt` so the version with completions wins

**Important:** Every `saveDayPlan` call (generate, toggle item, AI action) must update a modification timestamp so completion changes propagate across devices. Use `lastModified` field separate from `generatedAt`.

### Files changed:
- `src/types/index.ts` — add `lastModified` to DayPlan
- `src/services/storage.ts` — add `saveDayPlanToStorage()`, update `syncFromCloud()`
- `src/hooks/useAppData.ts` — wire `saveDayPlan` to storage function
- `src/pages/Dashboard.tsx` — stamp `lastModified` on every plan mutation

---

## What's NOT changing:
- Classes (pulled from calendar, not editable in app)
- Med config (already editable in Settings)
- Wellness items (already editable in Settings)
- AI check-in structure (works fine, just the plan output was broken)
