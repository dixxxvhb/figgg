# Day Plan Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the day plan reset bug (re-plan wipes completions) and add cross-device cloud sync for day plans.

**Architecture:** Two independent fixes. (1) Merge strategy in `generateDayPlan()` preserves completed items during re-plan, with AI told what's already done. (2) New `saveDayPlanToStorage()` function mirrors the selfCare immediate-cloud-sync pattern, with `lastModified` timestamp for conflict resolution.

**Tech Stack:** React 19, TypeScript, Netlify Functions, Anthropic API (claude-haiku-4-5), localStorage + Netlify Blobs cloud sync.

---

## Task 1: Add `lastModified` to DayPlan type

**Files:**
- Modify: `src/types/index.ts:436-441`

**Step 1: Add the field**

In `src/types/index.ts`, add `lastModified` to DayPlan:

```typescript
export interface DayPlan {
  date: string;
  generatedAt: string;
  lastModified: string;          // updated on every mutation (generate, toggle, AI action)
  items: DayPlanItem[];
  summary: string;
}
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npx tsc --noEmit 2>&1 | head -30`

Expected: Type errors in Dashboard.tsx where DayPlan is constructed without `lastModified`. That's fine — we'll fix those in later tasks.

---

## Task 2: Create `saveDayPlanToStorage()` in storage.ts

**Files:**
- Modify: `src/services/storage.ts` (add function after `saveLaunchPlanToStorage`)

**Step 1: Add the storage function**

Add after `saveLaunchPlanToStorage()` (after line 648):

```typescript
// Save day plan with immediate cloud sync (same pattern as selfCare/launchPlan)
// Day plans need cross-device sync so both phone and laptop show the same plan
export function saveDayPlanToStorage(plan: import('../types').DayPlan): void {
  const data = loadData();
  const now = new Date().toISOString();
  const updatedPlan = { ...plan, lastModified: now };
  const updatedData = {
    ...data,
    dayPlan: updatedPlan,
  };
  const dataWithTimestamp = saveDataLocalOnly(updatedData);
  saveEvents.emit('saving');

  withCloudMutex(async () => {
    try {
      const cloudData = await fetchCloudData();
      if (cloudData) {
        // Day plan: last-modified-wins (same as launchPlan)
        const cloudPlan = cloudData.dayPlan;
        const cloudDPMod = cloudPlan?.lastModified ? new Date(cloudPlan.lastModified).getTime() : 0;
        const localDPMod = new Date(now).getTime();
        const mergedDayPlan = cloudDPMod > localDPMod ? cloudPlan : updatedPlan;

        // Merge other domains properly
        const mergedWeekNotes = mergeWeekNotes(data.weekNotes || [], cloudData.weekNotes || []);
        const localSC = data.selfCare || {};
        const cloudSC = cloudData.selfCare || {};
        const localSCMod = (localSC as any).selfCareModified ? new Date((localSC as any).selfCareModified).getTime() : 0;
        const cloudSCMod = (cloudSC as any).selfCareModified ? new Date((cloudSC as any).selfCareModified).getTime() : 0;
        const mergedSelfCare = cloudSCMod > localSCMod ? cloudSC : localSC;
        const localLP = data.launchPlan;
        const cloudLP = cloudData.launchPlan;
        const localLPMod = localLP?.lastModified ? new Date(localLP.lastModified).getTime() : 0;
        const cloudLPMod = cloudLP?.lastModified ? new Date(cloudLP.lastModified).getTime() : 0;
        const mergedLP = cloudLPMod > localLPMod ? cloudLP : localLP;

        const merged: AppData = {
          ...cloudData, ...data,
          dayPlan: mergedDayPlan,
          selfCare: mergedSelfCare,
          weekNotes: mergedWeekNotes,
          launchPlan: mergedLP,
          lastModified: now,
        };
        saveDataLocalOnly(merged);
        await immediateCloudSave(merged);
      } else {
        await immediateCloudSave(dataWithTimestamp);
      }
    } catch {
      await immediateCloudSave(dataWithTimestamp);
    }
  });
}
```

**Step 2: Add day plan merge to `syncFromCloud()`**

In `syncFromCloud()`, after the launchPlan merge (around line 539) and before the `baseData` resolution, add:

```typescript
    // === DAY PLAN: last-write-wins via lastModified ===
    const localDP = localData.dayPlan;
    const cloudDP = migratedCloudData.dayPlan;
    const localDPMod = localDP?.lastModified ? new Date(localDP.lastModified).getTime() : 0;
    const cloudDPMod = cloudDP?.lastModified ? new Date(cloudDP.lastModified).getTime() : 0;
    const mergedDayPlan = cloudDPMod > localDPMod ? cloudDP : localDP;
```

Then add `dayPlan: mergedDayPlan,` to the mergedData object (around line 557):

```typescript
    const mergedData: AppData = {
      ...baseData,
      weekNotes: mergedWeekNotes,
      selfCare: mergedSelfCare,
      launchPlan: mergedLaunchPlan,
      dayPlan: mergedDayPlan,
      lastModified: new Date().toISOString(),
    };
```

**Step 3: Export the new function**

Make sure `saveDayPlanToStorage` is exported (it already is via `export function`). No additional export needed.

---

## Task 3: Wire `saveDayPlan` in useAppData.ts to use cloud sync

**Files:**
- Modify: `src/hooks/useAppData.ts:1-5` (imports)
- Modify: `src/hooks/useAppData.ts:320-323` (saveDayPlan)

**Step 1: Add import**

Add `saveDayPlanToStorage` to the storage imports (line 5):

```typescript
import { loadData, saveData, saveWeekNotes as saveWeekNotesToStorage, saveSelfCareToStorage, saveLaunchPlanToStorage, saveDayPlanToStorage } from '../services/storage';
```

**Step 2: Add a dayPlanOnlyRef (same pattern as selfCareOnlyRef)**

Add after `launchPlanOnlyRef` (around line 21):

```typescript
  // Same pattern for day plan updates
  const dayPlanOnlyRef = useRef(false);
```

**Step 3: Add the dayPlanOnly guard in the save useEffect**

After the launchPlanOnly check (around line 53), add:

```typescript
    // Same for day plan — saveDayPlanToStorage already handles cloud push
    if (dayPlanOnlyRef.current) {
      dayPlanOnlyRef.current = false;
      return;
    }
```

**Step 4: Rewrite saveDayPlan to use storage function**

Replace lines 320-323:

```typescript
  // Day plan — immediate cloud sync (same pattern as selfCare/launchPlan)
  const saveDayPlan = useCallback((plan: DayPlan) => {
    const now = new Date().toISOString();
    const planWithTimestamp = { ...plan, lastModified: now };
    saveDayPlanToStorage(planWithTimestamp);
    dayPlanOnlyRef.current = true;
    setData(prev => ({ ...prev, dayPlan: planWithTimestamp }));
  }, []);
```

---

## Task 4: Fix `generateDayPlan()` to merge completed items

**Files:**
- Modify: `src/pages/Dashboard.tsx:129-160` (generateDayPlan function)

**Step 1: Update generateDayPlan to preserve completed items**

Replace lines 129-160 with:

```typescript
  const generateDayPlan = useCallback(async (checkInMood?: string, checkInMessage?: string) => {
    if (planInFlightRef.current) return;
    planInFlightRef.current = true;
    setIsReplanning(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const existingPlan = dataRef.current.dayPlan?.date === todayStr ? dataRef.current.dayPlan : null;
      const completedItems = existingPlan?.items.filter(i => i.completed) || [];

      const payload: AIContextPayload & { checkInMood?: string; checkInMessage?: string; completedItems?: { id: string; title: string; category: string; sourceId?: string }[] } = {
        ...buildAIContext(dataRef.current, 'morning', ''),
        checkInMood,
        checkInMessage,
      };

      // Tell the AI what's already done so it doesn't regenerate them
      if (completedItems.length > 0) {
        payload.completedItems = completedItems.map(i => ({
          id: i.id, title: i.title, category: i.category, sourceId: i.sourceId,
        }));
      }

      const result = await callGenerateDayPlan(payload);
      const newItems = validateDayPlanItems(result.items);
      if (newItems.length === 0 && completedItems.length === 0) {
        console.warn('Day plan returned 0 items, skipping save');
        return;
      }

      // Merge: keep completed items, add new items that don't overlap
      const completedSourceIds = new Set(completedItems.filter(i => i.sourceId).map(i => i.sourceId));
      const completedTitles = new Set(completedItems.map(i => i.title.toLowerCase()));

      const filteredNewItems = newItems.filter(item => {
        // Don't add if we already have a completed item with same sourceId
        if (item.sourceId && completedSourceIds.has(item.sourceId)) return false;
        // Don't add if we already have a completed item with same title
        if (completedTitles.has(item.title.toLowerCase())) return false;
        return true;
      });

      // Completed items first (preserve order), then new items
      const mergedItems = [...completedItems, ...filteredNewItems];

      const plan: DayPlan = {
        date: todayStr,
        generatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        items: mergedItems,
        summary: result.summary || existingPlan?.summary || 'Your plan for today.',
      };
      saveDayPlan(plan);
    } catch (e) {
      console.error('Day plan generation failed:', e);
    } finally {
      planInFlightRef.current = false;
      setIsReplanning(false);
    }
  }, [saveDayPlan]);
```

---

## Task 5: Update Netlify function to accept + use completed items

**Files:**
- Modify: `netlify/functions/generateDayPlan.ts:88-154` (context assembly)

**Step 1: Add completed items to the AI context**

After the streak section (around line 152), add:

```typescript
    // Completed items — tell AI what's already done
    if (payload.completedItems?.length > 0) {
      contextLines.push(`Already completed today (DO NOT regenerate these):\n${payload.completedItems.map((i: { title: string; category: string }) => `  - [DONE] ${i.title} (${i.category})`).join("\n")}`);
    }
```

**Step 2: Add instruction to system prompt**

In the system prompt (around line 43, after the RULES header), add:

```
- Items marked [DONE] in the context are ALREADY COMPLETED. Do NOT include them in your plan — they will be merged in automatically.
- When re-planning mid-day, focus only on what's LEFT to do. The completed items are preserved separately.
```

---

## Task 6: Stamp `lastModified` on all plan mutations in Dashboard.tsx

**Files:**
- Modify: `src/pages/Dashboard.tsx` — `executeAIActions` and `handleTogglePlanItem`

**Step 1: executeAIActions — stamp lastModified when saving plan**

In `executeAIActions`, around line 312-314, the plan save already goes through `saveDayPlan()` which now stamps `lastModified`. No change needed here — `saveDayPlan` in useAppData handles it.

**Step 2: handleTogglePlanItem — already goes through saveDayPlan**

Lines 394-400 already call `saveDayPlan(updated)`. Since `saveDayPlan` now stamps `lastModified`, this is handled. No change needed.

**Step 3: Verify all paths**

Every place that calls `saveDayPlan()`:
1. `generateDayPlan()` — stamps `lastModified` in the plan object (Task 4)
2. `executeAIActions()` → `saveDayPlan(currentPlan)` — `saveDayPlan` stamps it (Task 3)
3. `handleTogglePlanItem()` → `saveDayPlan(updated)` — `saveDayPlan` stamps it (Task 3)

All covered.

---

## Task 7: Build verification and edge case testing

**Step 1: Build**

Run: `cd /Users/dixxx/figgg && npm run build`

Expected: Clean build, no type errors.

**Step 2: Manual edge case verification**

Verify these scenarios work correctly by reading through the code paths:

1. **First plan of the day**: No existing plan → `completedItems = []` → no merge needed, saves fresh plan. ✓
2. **Re-plan with completions**: Existing plan has 3 completed + 5 uncompleted → AI generates 8 new → completed 3 kept, new items filtered to avoid duplicates. ✓
3. **AI returns 0 items but completions exist**: `newItems.length === 0 && completedItems.length === 0` is false → plan saves with just completed items. ✓
4. **Yesterday's plan still in state**: `existingPlan` check uses `date === todayStr` → yesterday's plan ignored, treated as fresh. ✓
5. **Wellness item completed in plan**: Kept in `completedItems`, filtered from `newItems` by sourceId. ✓
6. **Same sourceId in completed and new**: `completedSourceIds.has(item.sourceId)` → new item filtered out, completed version kept. ✓
7. **Same title in completed and new**: `completedTitles.has(item.title.toLowerCase())` → new item filtered out. ✓
8. **User unchecks item then re-plans**: Item has `completed: false` → not in `completedItems` → AI can regenerate it. ✓
9. **Cloud sync on toggle**: `handleTogglePlanItem` → `saveDayPlan` → `saveDayPlanToStorage` → immediate cloud push. ✓
10. **Two devices, one re-plans**: Re-planned version gets newer `lastModified` → wins in sync. ✓
11. **Device offline**: Saves to localStorage, syncs on reconnect via `visibilitychange` → `syncFromCloud`. ✓
12. **Cloud has no dayPlan**: `cloudDPMod = 0` → local wins → pushes up. ✓

**Step 3: Commit**

```bash
git add -A && git commit -m "fix: preserve day plan completions on re-plan + add cloud sync"
```

---

## Summary of all file changes

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `lastModified` to DayPlan |
| `src/services/storage.ts` | Add `saveDayPlanToStorage()`, add dayPlan merge to `syncFromCloud()` |
| `src/hooks/useAppData.ts` | Wire `saveDayPlan` through `saveDayPlanToStorage`, add `dayPlanOnlyRef` |
| `src/pages/Dashboard.tsx` | Merge completed items in `generateDayPlan()` |
| `netlify/functions/generateDayPlan.ts` | Accept completed items, tell AI not to regenerate them |
