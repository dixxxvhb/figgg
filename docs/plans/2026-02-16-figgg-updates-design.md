# Figgg Updates Implementation Plan — 2026-02-16

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix AI check-in persistence bug, remove "This Week's Idea" from LiveNotes, clean up LiveNotes layout, add real-time reminder detection from class notes, and hardcode a new calendar URL.

**Architecture:** Six independent changes to figgg. The check-in bug is a cloud sync merge issue in storage.ts. LiveNotes layout changes are UI-only in LiveNotes.tsx. Real-time reminders hook into the existing `addNote` function with keyword-triggered AI calls. Calendar URL is a one-liner in SyncContext.tsx.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Netlify Functions (Anthropic AI)

**No tests exist in this project — verify with `npm run build`.**

---

### Task 1: Fix AI Check-in persistence (cloud sync merge bug)

**Files:**
- Modify: `src/services/storage.ts:547-567`

**Problem:** `aiCheckIns` lives on `baseData` in `syncFromCloud()`. When cloud has newer `lastModified`, cloud's baseData (without today's check-in) overwrites local. No dedicated merge like selfCare/dayPlan/weekNotes have.

**Step 1: Add aiCheckIns union-merge to syncFromCloud**

In `src/services/storage.ts`, after the dayPlan merge block (line ~546) and before the `baseData` resolution (line ~548), add:

```typescript
    // === AI CHECK-INS: union-merge by id ===
    const localCheckIns = localData.aiCheckIns || [];
    const cloudCheckIns = migratedCloudData.aiCheckIns || [];
    const checkInMap = new Map<string, typeof localCheckIns[0]>();
    // Cloud first, then local overwrites — local is authoritative for today
    cloudCheckIns.forEach(c => checkInMap.set(c.id, c));
    localCheckIns.forEach(c => checkInMap.set(c.id, c));
    const mergedCheckIns = Array.from(checkInMap.values());
```

**Step 2: Apply merged check-ins to mergedData**

In the `mergedData` object (line ~560), add `aiCheckIns: mergedCheckIns` alongside the other merged fields:

```typescript
    const mergedData: AppData = {
      ...baseData,
      weekNotes: mergedWeekNotes,
      selfCare: mergedSelfCare,
      launchPlan: mergedLaunchPlan,
      dayPlan: mergedDayPlan,
      aiCheckIns: mergedCheckIns,  // <-- ADD THIS
      lastModified: new Date().toISOString(),
    };
```

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build, no errors.

---

### Task 2: Hardcode new calendar URL

**Files:**
- Modify: `src/contexts/SyncContext.tsx:20-23`

**Step 1: Add the new URL to DEFAULT_CALENDAR_URLS**

The proxy already handles `webcal://` → `https://` conversion (calendarProxy.ts:38). Just add the URL as-is:

```typescript
const DEFAULT_CALENDAR_URLS = [
  'https://api.band.us/ical?token=aAAxADU0MWQxZTdiZjdhYWQwMDBiMWY3ZTNjNWFhYmY3YzViNTE5YTRjYmU',
  'https://p157-caldav.icloud.com/published/2/MTk1MzE5NDQxMTk1MzE5NHQAH6rjzS_gyID08NDG-fjEKQfC3E7w4dd7G44gheLnuiNy7AexoNdl9WLiOmXdxEKxVknTHHKwIrJgJMYJfkY',
  'webcal://p157-caldav.icloud.com/published/2/MTk1MzE5NDQxMTk1MzE5NHQAH6rjzS_gyID08NDG-fhT8lUzOWzIPh08c6kuiNKGwZzEu5nxAQZsjW1lZmK4qwjjsB3WCmkRGIUo3RFl1HM',
];
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

---

### Task 3: Remove "This Week's Idea" box from LiveNotes

**Files:**
- Modify: `src/pages/LiveNotes.tsx:534-550` (saveWeekIdea function — leave it, no call sites remain)
- Modify: `src/pages/LiveNotes.tsx:1065-1084` (rendered block — delete entirely)

**Step 1: Delete the "This Week's Idea" rendered block**

Remove the entire block from `{/* Class Idea This Week */}` through its closing `</div>` (lines 1065-1084). This is the section with `<Sparkles>` icon and `weekIdea` textarea.

**Step 2: Remove the `saveWeekIdea` function**

Delete the `saveWeekIdea` function (lines 534-550). No other code calls it once the UI block is removed.

**Step 3: Remove `Sparkles` from imports if unused**

Check if `Sparkles` is used elsewhere in the file. If not, remove it from the lucide-react import on line 3.

**Step 4: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

---

### Task 4: Clean up LiveNotes layout

**Files:**
- Modify: `src/pages/LiveNotes.tsx`

**Step 1: Make "Goal for Next Week" compact**

Replace the full card (lines 1401-1418) with a compact inline field. Instead of a bordered card with icon + label + textarea, use a simple single-line input:

```tsx
        {/* Next Week Goal — compact inline */}
        {!alreadySaved && (
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="text-xs text-blue-500 dark:text-blue-400 whitespace-nowrap font-medium">Next week goal:</span>
            <input
              type="text"
              value={classNotes.nextWeekGoal || ''}
              onChange={(e) => saveNextWeekGoal(e.target.value)}
              placeholder="What's the focus for next week?"
              className="flex-1 text-sm px-3 py-1.5 bg-blush-50 dark:bg-blush-700 border border-blue-200 dark:border-blue-700 rounded-lg text-forest-700 dark:text-blush-200 placeholder-blush-400 dark:placeholder-blush-500 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
```

**Step 2: Remove `Target` from imports if now unused**

The old Goal card used `<Target>` icon. Check if it's used elsewhere; if not, remove from imports.

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

---

### Task 5: Real-time reminder detection from class notes

**Files:**
- Modify: `src/pages/LiveNotes.tsx` (addNote function + new state + end-of-class toast)

**Step 1: Add reminder-tracking state**

Near the other state declarations (around line 80), add:

```typescript
  // Track which noteIds already have reminders created (avoid duplicates)
  const [reminderNoteIds, setReminderNoteIds] = useState<Set<string>>(new Set());
  const [reminderCount, setReminderCount] = useState(0);
```

**Step 2: Add keyword-check helper**

Above the `addNote` function (around line 208), add:

```typescript
  const REMINDER_KEYWORDS = /\b(bring|get|buy|email|print|order|download|pick up|find|grab|grab|need to get|need to bring|remember to)\b/i;

  const tryDetectReminder = (note: LiveNote) => {
    if (!REMINDER_KEYWORDS.test(note.text)) return;
    if (!cls || !classDate) return;

    const classNameForAI = cls.name;
    const nextClassDate = format(addWeeks(classDate, 1), 'yyyy-MM-dd');

    aiDetectReminders(classNameForAI, [note]).then(detected => {
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
        notes: `From ${classNameForAI} class notes`,
        listId: classReminderList!.id,
        completed: false,
        dueDate: nextClassDate,
        priority: 'medium' as const,
        flagged: false,
        createdAt: now,
        updatedAt: now,
      }));

      updateSelfCare({
        reminders: [...existingReminders, ...newReminders],
        reminderLists: updatedLists,
      });

      setReminderNoteIds(prev => {
        const next = new Set(prev);
        detected.forEach(d => next.add(d.noteId));
        return next;
      });
      setReminderCount(prev => prev + newReminders.length);
    }).catch(() => {
      // Silently fail — real-time detection is a bonus
    });
  };
```

**Step 3: Hook into addNote**

In the `addNote` function (line 209), after `saveWeekNotes(updatedWeekNotes)` (line 233) and before clearing note text, add:

```typescript
    // Real-time reminder detection
    tryDetectReminder(newNote);
```

**Step 4: Update end-of-class reminder detection to skip already-detected notes**

In the `handleEndClass` function (around line 766), modify the `aiDetectReminders` call to filter out notes that already have reminders:

Change:
```typescript
      aiDetectReminders(classNameForAI, notesToProcess).then(detectedReminders => {
```

To:
```typescript
      const notesForReminderScan = notesToProcess.filter(n => !reminderNoteIds.has(n.id));
      aiDetectReminders(classNameForAI, notesForReminderScan).then(detectedReminders => {
```

Also, after the `updateSelfCare` call in that block (line ~803), add the reminder count update:

```typescript
        setReminderCount(prev => prev + newReminders.length);
```

**Step 5: Add reminder count banner at top of notes area**

In the notes list section (after line ~1086), add a small banner that shows when reminders have been created:

```tsx
        {reminderCount > 0 && (
          <Link
            to="/me"
            className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
          >
            <AlertCircle size={14} className="text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} added for next week
            </span>
          </Link>
        )}
```

**Step 6: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

---

### Task 6: Final verification

**Step 1: Full build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build, no TypeScript errors, no warnings.

**Step 2: Local dev preview**

Run: `cd /Users/dixxx/figgg && npm run dev`
Expected: App loads. Test:
- Dashboard shows check-in prompt (if morning)
- LiveNotes page has no "This Week's Idea" box
- LiveNotes has compact "Next week goal" input
- New calendar events appear in Schedule/Dashboard
- Adding a note with "bring" triggers reminder detection

---
