# Figgg Polish Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish, organize, and professionalize Figgg — context-aware Dashboard, code deduplication, design consistency, navigation improvements, and end-to-end verification.

**Architecture:** The Dashboard gets rebuilt around the existing `useDashboardMode` hook (which already computes context from time-of-day and class timing). Relocated widgets move to their natural pages. Shared UI patterns get extracted into reusable components. No new dependencies, no schema changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Firebase, existing component library (Button, Card, etc.)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/hooks/useDashboardContext.ts` | Simplified context hook replacing `useDashboardMode` — returns a `DashboardContext` enum and the cards to show |
| `src/components/common/NoteInput.tsx` | Shared note-taking input (tags, save, display) extracted from LiveNotes/EventNotes |
| `src/components/common/Checkbox.tsx` | Shared checkbox with consistent styling and touch targets |
| `src/components/common/Breadcrumb.tsx` | Simple breadcrumb for Settings sub-pages |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Complete rewrite — context-aware, ~400 lines |
| `src/hooks/useDashboardMode.ts` | Deleted (replaced by `useDashboardContext.ts`) |
| `src/pages/Schedule.tsx` | Add relocated widgets (WeekStats, WeekMomentumBar, StreakCard, EventCountdown) |
| `src/pages/WeekReview.tsx` | Add relocated WeeklyInsight widget |
| `src/pages/Me.tsx` | Add relocated FixItemWidget to wellness tab |
| `src/pages/LiveNotes.tsx` | Refactor to use shared NoteInput component |
| `src/pages/EventNotes.tsx` | Refactor to use shared NoteInput component |
| `src/pages/settings/SettingsHub.tsx` | Add Quick Access section (Library, LaunchPlan) |
| `src/pages/settings/DashboardSettings.tsx` | Simplify for new Dashboard (fewer widget toggles) |
| All settings sub-pages | Add Breadcrumb component |
| Various pages | Replace inline button/card styles with components |

### Deleted Files
| File | Reason |
|------|--------|
| `src/hooks/useDashboardMode.ts` | Replaced by `useDashboardContext.ts` |
| `src/components/Dashboard/SortableWidget.tsx` | No drag-drop needed with 4-5 cards |
| `src/components/Dashboard/DailyBriefingWidget.tsx` | Replaced by context-aware cards |
| `src/components/Dashboard/EndOfDaySummary.tsx` | Merged into evening context |
| `src/components/Dashboard/FixItemWidget.tsx` | Moved to Me.tsx wellness tab (component stays, just re-homed) |
| `src/components/Dashboard/WeekStats.tsx` | Moved to Schedule (component stays, import changes) |
| `src/components/Dashboard/WeekMomentumBar.tsx` | Moved to Schedule (component stays, import changes) |
| `src/components/Dashboard/WeeklyInsight.tsx` | Moved to WeekReview (component stays, import changes) |
| `src/components/Dashboard/StreakCard.tsx` | Moved to Schedule (component stays, import changes) |
| `src/components/Dashboard/LaunchPlanWidget.tsx` | Removed from Dashboard (LaunchPlan page is the home) |
| `src/components/Dashboard/EventCountdown.tsx` | Moved to Schedule (component stays, import changes) |

**Note:** "Moved" widgets keep their component files — only the import/usage location changes. They're "deleted" from Dashboard, not from the codebase.

---

## Task 1: Create `useDashboardContext` Hook

**Files:**
- Create: `src/hooks/useDashboardContext.ts`
- Delete: `src/hooks/useDashboardMode.ts`

This replaces `useDashboardMode` with a cleaner hook that returns a context enum and the specific cards to render for each context.

- [ ] **Step 1: Create the new hook**

```typescript
// src/hooks/useDashboardContext.ts
import { useMemo } from 'react';
import { useClassTiming, type ClassWithContext } from './useClassTiming';
import { useCheckInStatus } from './useCheckInStatus';
import { useSelfCareStatus, type SelfCareStatus } from './useSelfCareStatus';
import { useCurrentClass } from './useCurrentClass';
import { getCurrentDayOfWeek, getClassesByDay, timeToMinutes } from '../utils/time';
import type { AppData, AIConfig, MedConfig } from '../types';
import { DEFAULT_AI_CONFIG, DEFAULT_MED_CONFIG } from '../types';

export type DashboardContext =
  | 'morning'
  | 'pre-class'
  | 'during-class'
  | 'post-class'
  | 'evening'
  | 'default';

export interface DashboardContextResult {
  context: DashboardContext;
  label: string;
  /** Class starting within 60 min (pre-class context) */
  upcomingClass: ClassWithContext | null;
  /** Class that just ended (post-class context) */
  justEndedClass: ClassWithContext | null;
  /** Current class info for during-class context */
  currentClassInfo: ReturnType<typeof useCurrentClass>;
  /** Whether AI check-in is due */
  checkInStatus: ReturnType<typeof useCheckInStatus>;
  /** Meds status */
  selfCareStatus: SelfCareStatus;
  /** Current minute (for time display) */
  currentMinute: number;
  /** Hour of day */
  hour: number;
}

function computeContext(
  hour: number,
  hasUpcomingClass: boolean,
  isDuringClass: boolean,
  hasJustEndedClass: boolean,
  hasClassesToday: boolean,
  allClassesDone: boolean,
): DashboardContext {
  // During class — minimal UI
  if (isDuringClass) return 'during-class';

  // Class within 60 min — prep mode
  if (hasUpcomingClass) return 'pre-class';

  // Class just ended — capture mode
  if (hasJustEndedClass) return 'post-class';

  // Evening — wind down
  if (hour >= 19) return 'evening';

  // Morning — start of day
  if (hour < 12 && !allClassesDone) return 'morning';

  // All classes done but not evening yet
  if (allClassesDone) return 'evening';

  // Default — no classes or mid-day gap
  return 'default';
}

const CONTEXT_LABELS: Record<DashboardContext, string> = {
  'morning': 'Morning',
  'pre-class': 'Prep',
  'during-class': 'In Class',
  'post-class': 'Capture',
  'evening': 'Wind Down',
  'default': 'Today',
};

export function useDashboardContext(
  data: AppData,
  currentMinute: number,
): DashboardContextResult {
  const hour = Math.floor(currentMinute / 60);
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const aiConfig = { ...DEFAULT_AI_CONFIG, ...(data.settings?.aiConfig || {}) };

  const classTiming = useClassTiming(data, currentMinute);
  const checkInStatus = useCheckInStatus(data.aiCheckIns, aiConfig, currentMinute);
  const selfCareStatus = useSelfCareStatus(data.selfCare, medConfig);
  const currentClassInfo = useCurrentClass(data.classes, data.weekNotes);

  const todayClasses = useMemo(() => {
    const day = getCurrentDayOfWeek();
    return getClassesByDay(data.classes, day);
  }, [data.classes]);

  const allClassesDone = useMemo(() => {
    if (todayClasses.length === 0) return false;
    return todayClasses.every(c => timeToMinutes(c.endTime) < currentMinute);
  }, [todayClasses, currentMinute]);

  const context = useMemo(() => computeContext(
    hour,
    !!classTiming.upcomingClass,
    currentClassInfo.status === 'during',
    !!classTiming.justEndedClass,
    todayClasses.length > 0,
    allClassesDone,
  ), [hour, classTiming.upcomingClass, currentClassInfo.status, classTiming.justEndedClass, todayClasses.length, allClassesDone]);

  return {
    context,
    label: CONTEXT_LABELS[context],
    upcomingClass: classTiming.upcomingClass,
    justEndedClass: classTiming.justEndedClass,
    currentClassInfo,
    checkInStatus,
    selfCareStatus,
    currentMinute,
    hour,
  };
}
```

**Note:** This hook uses `getClassesByDay` from `src/data/classes.ts` — verify that function exists and its import path. If it's imported differently in the existing codebase, match the existing pattern.

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Should compile (new file, nothing imports it yet)

- [ ] **Step 3: Commit**

```bash
cd /Users/dixxx/figgg
git add src/hooks/useDashboardContext.ts
git commit -m "feat: add useDashboardContext hook for context-aware Dashboard"
```

---

## Task 2: Rewrite Dashboard.tsx — Context-Aware

**Files:**
- Modify: `src/pages/Dashboard.tsx` (full rewrite, ~1158 → ~400 lines)

The new Dashboard uses `useDashboardContext` to show only relevant cards per context. All the business logic that stays (day plan generation, check-in handling, reminder toggling, dose logging) stays — but the widget rendering is completely replaced.

- [ ] **Step 1: Rewrite Dashboard.tsx**

The new Dashboard keeps these functional sections from the original:
- `validateDayPlanItems()` function (lines 68-84)
- `ACTION_KEYWORDS` and `isActionItem` (lines 86-87)
- `generateDayPlan` callback (lines 161-232)
- `actionCallbacks` and `executeAIActions` (lines 235-249)
- `handleCheckInSubmit` and `handleCheckInSkip` (lines 251-312)
- `handleTogglePlanItem` (lines 314-350)
- `handleToggleReminder` (lines 358-399)
- `handleBriefingCreateTask` (lines 402-424)
- `handleScratchpadChange` (lines 426-428)
- `handleLogDose` (lines 631-642)
- Greeting logic (lines 678-708)
- Competition banner (lines 764-796)
- Hero card for during-class (lines 828-879+)

**What gets removed:**
- All `@dnd-kit` imports and drag-drop code
- `SortableWidget` import and usage
- `DailyBriefingWidget` import and usage
- `EndOfDaySummary` import and usage
- `WeekStats` import and usage
- `WeekMomentumBar` import and usage
- `WeeklyInsight` import and usage
- `StreakCard` import and usage
- `LaunchPlanWidget` import and usage
- `EventCountdown` import and usage (stays in render but moves to Schedule)
- `FixItemWidget` import and usage
- `useDashboardMode` import (replaced by `useDashboardContext`)
- `isEditingLayout` state and edit button
- `allWidgetIds`, `widgetOrder`, drag sensors, `handleDragEnd`
- `DEFAULT_WIDGET_ORDER`, `WIDGET_LABELS`

**New render structure:**

```tsx
return (
  <div className="pb-24 bg-[var(--surface-primary)] min-h-screen">
    {/* Greeting header — keep existing */}
    {/* Context label */}
    {/* Competition banner — keep existing, only show within 14 days */}

    <div className="page-w px-4 pt-4 space-y-4">
      {/* Context-specific cards */}
      {ctx.context === 'morning' && <MorningCards />}
      {ctx.context === 'pre-class' && <PreClassCards />}
      {ctx.context === 'during-class' && <DuringClassCards />}
      {ctx.context === 'post-class' && <PostClassCards />}
      {ctx.context === 'evening' && <EveningCards />}
      {ctx.context === 'default' && <DefaultCards />}

      {/* Scratchpad — always available, collapsed */}
      <ScratchpadWidget value={...} onChange={...} />
    </div>
  </div>
);
```

Each context renders inline (not separate components — keep it simple, they're just 3-5 cards each):

**Morning:** MorningBriefing (meds), TodaysAgenda, AICheckInWidget (if due), RemindersWidget
**Pre-Class:** PrepCard, meds reminder (if dose window), attendance shortcut link
**During-Class:** Hero card (existing "Teaching Now" UI), link to LiveNotes
**Post-Class:** PostClassCapture, next class prep (if another coming), meds reminder
**Evening:** Day summary (inline — classes taught count, notes count), tomorrow preview, wellness prompt (link to /me)
**Default:** TodaysAgenda (calendar events), RemindersWidget, quick links (Schedule, Students, Library)

- [ ] **Step 2: Remove deleted imports and verify no broken references**

Remove these imports from Dashboard.tsx:
```typescript
// REMOVE:
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { WeekStats } from '../components/Dashboard/WeekStats';
import { LaunchPlanWidget } from '../components/Dashboard/LaunchPlanWidget';
import { EventCountdown } from '../components/Dashboard/EventCountdown';
import { StreakCard } from '../components/Dashboard/StreakCard';
import { WeeklyInsight } from '../components/Dashboard/WeeklyInsight';
import { WeekMomentumBar } from '../components/Dashboard/WeekMomentumBar';
import { SortableWidget } from '../components/Dashboard/SortableWidget';
import { DailyBriefingWidget, type CreateTaskOptions } from '../components/Dashboard/DailyBriefingWidget';
import { FixItemWidget } from '../components/Dashboard/FixItemWidget';
import { EndOfDaySummary } from '../components/Dashboard/EndOfDaySummary';
import { useDashboardMode } from '../hooks/useDashboardMode';

// ADD:
import { useDashboardContext } from '../hooks/useDashboardContext';
```

- [ ] **Step 3: Update greeting header**

Keep the existing greeting logic but remove the "Edit" button (no more drag-drop layout editing):

```tsx
{/* Remove this button: */}
<button onClick={() => setIsEditingLayout(!isEditingLayout)} ...>
  {isEditingLayout ? 'Done' : 'Edit'}
</button>

{/* Replace with context label: */}
<span className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)]">
  {ctx.label}
</span>
```

- [ ] **Step 4: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean compile, no TypeScript errors

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/Dashboard.tsx
git commit -m "feat: rewrite Dashboard as context-aware — morning/prep/class/post/evening/default modes"
```

---

## Task 3: Delete Old Dashboard Mode Hook

**Files:**
- Delete: `src/hooks/useDashboardMode.ts`

- [ ] **Step 1: Verify no other files import useDashboardMode**

Run: `grep -r "useDashboardMode" src/` — should only show the deleted file and possibly DashboardSettings.

- [ ] **Step 2: Delete the file**

```bash
rm src/hooks/useDashboardMode.ts
```

- [ ] **Step 3: Update DashboardSettings if it references the old mode system**

Read `src/pages/settings/DashboardSettings.tsx` and remove any references to widget ordering, hidden widgets, or dashboard modes that no longer apply. Simplify to only the settings that still matter for the new Dashboard.

- [ ] **Step 4: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add -A
git commit -m "refactor: remove useDashboardMode, simplify DashboardSettings"
```

---

## Task 4: Relocate Widgets to Schedule Page

**Files:**
- Modify: `src/pages/Schedule.tsx`

Add a compact summary section at the top of Schedule (before the day tabs) with the relocated widgets.

- [ ] **Step 1: Add imports to Schedule.tsx**

```typescript
import { WeekStats } from '../components/Dashboard/WeekStats';
import { WeekMomentumBar } from '../components/Dashboard/WeekMomentumBar';
import { StreakCard } from '../components/Dashboard/StreakCard';
import { EventCountdown } from '../components/Dashboard/EventCountdown';
import { useTeachingStats } from '../hooks/useTeachingStats';
```

- [ ] **Step 2: Add the summary section before the day tabs**

After the week navigation header and before the day tabs, add:

```tsx
{/* Week Overview */}
<div className="space-y-3 mb-4">
  <WeekMomentumBar stats={stats} classes={data.classes} weekNotes={data.weekNotes} />
  <div className="grid grid-cols-2 gap-3">
    <WeekStats stats={stats} />
    <StreakCard classes={data.classes} weekNotes={data.weekNotes} />
  </div>
  <EventCountdown competitions={data.competitions} />
</div>
```

**Note:** Check the actual props each widget expects by reading their component files. The props shown above are approximations — match the exact prop signatures from the component definitions.

- [ ] **Step 3: Wire up useTeachingStats**

Add near the top of the `Schedule` function:
```typescript
const stats = useTeachingStats(data);
```

- [ ] **Step 4: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 5: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/Schedule.tsx
git commit -m "feat: relocate WeekStats, MomentumBar, Streak, EventCountdown to Schedule"
```

---

## Task 5: Relocate WeeklyInsight to WeekReview

**Files:**
- Modify: `src/pages/WeekReview.tsx`

- [ ] **Step 1: Add WeeklyInsight import and render**

```typescript
import { WeeklyInsight } from '../components/Dashboard/WeeklyInsight';
```

Add the widget at the top of the WeekReview page content, before the note aggregation:

```tsx
<WeeklyInsight data={data} weekOffset={weekOffset} />
```

Check `WeeklyInsight.tsx` for exact props.

- [ ] **Step 2: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/WeekReview.tsx
git commit -m "feat: add WeeklyInsight to WeekReview page"
```

---

## Task 6: Relocate FixItemWidget to Me.tsx Wellness Tab

**Files:**
- Modify: `src/pages/Me.tsx`

- [ ] **Step 1: Add FixItemWidget to wellness tab**

Import and add below the existing wellness components (MedsTracker, SmartChecklist, etc.):

```typescript
import { FixItemWidget } from '../components/Dashboard/FixItemWidget';
```

Render in the wellness section. Check `FixItemWidget.tsx` for exact props.

- [ ] **Step 2: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/Me.tsx
git commit -m "feat: move FixItemWidget to Me.tsx wellness tab"
```

---

## Task 7: Extract NoteInput Component

**Files:**
- Create: `src/components/common/NoteInput.tsx`
- Modify: `src/pages/LiveNotes.tsx`
- Modify: `src/pages/EventNotes.tsx`

This extracts the shared note-taking UI pattern from both pages.

- [ ] **Step 1: Identify the shared pattern**

Both LiveNotes and EventNotes share:
1. `QUICK_TAGS` array (same 4 tags: worked-on, needs-work, next-week, ideas)
2. Note input field with selected tag
3. Tag selector buttons
4. Saved notes display grouped by category
5. Per-note dropdown menu (edit, delete, convert to reminder)
6. AI buttons (detect reminders)

Read both files fully to identify the exact shared code boundary.

- [ ] **Step 2: Create NoteInput component**

```typescript
// src/components/common/NoteInput.tsx
import { useState, useRef } from 'react';
import { Send, CheckCircle, AlertCircle, Clock, Lightbulb, X, Trash2, StickyNote } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';
import { LiveNote, normalizeNoteCategory } from '../../types';
import { v4 as uuid } from 'uuid';

const QUICK_TAGS = [
  { id: 'worked-on', label: 'Worked On', icon: CheckCircle, color: 'bg-[var(--surface-highlight)] text-[var(--text-primary)]' },
  { id: 'needs-work', label: 'Needs More Work', icon: AlertCircle, color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' },
  { id: 'next-week', label: 'Next Week', icon: Clock, color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
];

interface NoteInputProps {
  notes: LiveNote[];
  onSaveNote: (note: LiveNote) => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote?: (noteId: string, newText: string) => void;
  /** Optional autocomplete suggestions (LiveNotes uses terminology) */
  suggestions?: { text: string; category?: string }[];
  /** Optional callback when a note might contain a reminder */
  onDetectReminder?: (note: LiveNote) => void;
  placeholder?: string;
}

export function NoteInput({
  notes,
  onSaveNote,
  onDeleteNote,
  onEditNote,
  suggestions,
  onDetectReminder,
  placeholder = 'Add a note...',
}: NoteInputProps) {
  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const text = noteText.trim();
    if (!text) return;

    const note: LiveNote = {
      id: uuid(),
      text,
      category: normalizeNoteCategory(selectedTag || 'worked-on'),
      timestamp: new Date().toISOString(),
    };

    onSaveNote(note);
    if (onDetectReminder) onDetectReminder(note);
    setNoteText('');
    inputRef.current?.focus();
  };

  // Group notes by category
  const groupedNotes = notes.reduce<Record<string, LiveNote[]>>((acc, note) => {
    const cat = normalizeNoteCategory(note.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(note);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Tag selector */}
      <div className="flex flex-wrap gap-2">
        {QUICK_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedTag === tag.id ? tag.color + ' ring-2 ring-[var(--accent-primary)]/30' : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
            }`}
          >
            <tag.icon size={13} />
            {tag.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm border border-[var(--border-subtle)] rounded-xl bg-[var(--surface-card)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] min-h-[44px]"
        />
        <button
          onClick={handleSubmit}
          disabled={!noteText.trim()}
          className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-40 min-h-[44px] active:scale-[0.98]"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Notes by category */}
      {QUICK_TAGS.map(tag => {
        const tagNotes = groupedNotes[tag.id];
        if (!tagNotes || tagNotes.length === 0) return null;
        return (
          <div key={tag.id}>
            <div className="flex items-center gap-1.5 mb-2">
              <tag.icon size={14} className={tag.color.split(' ')[1]} />
              <span className="type-caption font-medium text-[var(--text-secondary)]">{tag.label}</span>
              <span className="type-caption text-[var(--text-tertiary)]">({tagNotes.length})</span>
            </div>
            <div className="space-y-1.5">
              {tagNotes.map(note => (
                <div key={note.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--surface-inset)] group">
                  <p className="flex-1 text-sm text-[var(--text-primary)] leading-relaxed">{note.text}</p>
                  <DropdownMenu
                    items={[
                      ...(onEditNote ? [{ label: 'Edit', onClick: () => onEditNote(note.id, note.text) }] : []),
                      { label: 'Delete', onClick: () => onDeleteNote(note.id), danger: true },
                    ]}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Important:** This is a starting point. When implementing, read both LiveNotes.tsx and EventNotes.tsx fully to capture ALL shared patterns (autocomplete, AI expand button, organize button, etc.). The actual component may need more props than shown here.

- [ ] **Step 3: Refactor LiveNotes.tsx to use NoteInput**

Replace the inline note input UI, tag selector, and note display with `<NoteInput>`. Keep LiveNotes-specific features (terminology autocomplete, attendance, AI expand/organize) as props or wrapper logic.

- [ ] **Step 4: Refactor EventNotes.tsx to use NoteInput**

Same pattern. Keep EventNotes-specific features (previous sessions panel, event-specific reminder detection) as wrapper logic.

- [ ] **Step 5: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 6: Manually test both pages**

Open LiveNotes and EventNotes in the browser. Verify:
- Notes save correctly with tags
- Notes display grouped by category
- Delete works
- AI features still work (if wired)

- [ ] **Step 7: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/NoteInput.tsx src/pages/LiveNotes.tsx src/pages/EventNotes.tsx
git commit -m "refactor: extract shared NoteInput component from LiveNotes and EventNotes"
```

---

## Task 8: Replace Inline Button Styling

**Files:**
- Modify: `src/pages/Schedule.tsx` (week nav buttons)
- Modify: `src/pages/WeekPlanner.tsx` (various buttons)
- Modify: `src/pages/ClassDetail.tsx` (attendance buttons)

- [ ] **Step 1: Find all inline-styled buttons**

Run: `grep -n 'className=.*rounded.*py.*px.*font-medium' src/pages/Schedule.tsx src/pages/WeekPlanner.tsx src/pages/ClassDetail.tsx`

This finds buttons that use inline Tailwind instead of the `<Button>` component.

- [ ] **Step 2: Replace each with Button component**

For each match:
- Import `Button` from `../components/common/Button`
- Replace the inline-styled `<button>` with `<Button variant="..." size="...">`
- Map the existing styling to the closest variant:
  - Navigation arrows → `<Button variant="ghost" size="sm">`
  - Action buttons → `<Button variant="secondary" size="sm">`
  - Primary actions → `<Button variant="primary" size="md">`

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/Schedule.tsx src/pages/WeekPlanner.tsx src/pages/ClassDetail.tsx
git commit -m "refactor: replace inline button styles with Button component"
```

---

## Task 9: Replace Inline Card Styling

**Files:**
- Modify: `src/pages/WeekPlanner.tsx`
- Modify: `src/pages/LiveNotes.tsx`
- Modify: `src/pages/ClassDetail.tsx`

- [ ] **Step 1: Find inline card divs**

Run: `grep -n 'bg-\[var(--surface-card)\].*rounded.*border' src/pages/WeekPlanner.tsx src/pages/LiveNotes.tsx src/pages/ClassDetail.tsx`

- [ ] **Step 2: Replace with Card component**

For each match, replace the inline-styled `<div>` with `<Card variant="standard">` or `<Card variant="inset">`:
- Card-like containers with shadows → `<Card variant="standard">`
- Embedded/nested containers → `<Card variant="inset">`

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/WeekPlanner.tsx src/pages/LiveNotes.tsx src/pages/ClassDetail.tsx
git commit -m "refactor: replace inline card styles with Card component"
```

---

## Task 10: Create Checkbox Component

**Files:**
- Create: `src/components/common/Checkbox.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/common/Checkbox.tsx
import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
}: CheckboxProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const touchTarget = 'min-h-[44px] min-w-[44px]';

  return (
    <label className={`inline-flex items-center gap-2.5 ${touchTarget} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`${sizes[size]} rounded-[var(--radius-sm)] border-2 flex items-center justify-center transition-all duration-[var(--duration-instant)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] ${
          checked
            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
            : 'bg-transparent border-[var(--border-strong)]'
        }`}
      >
        {checked && <Check size={size === 'sm' ? 10 : 13} className="text-[var(--text-on-accent)]" strokeWidth={3} />}
      </button>
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </label>
  );
}
```

- [ ] **Step 2: Find and replace inline checkboxes**

Run: `grep -rn 'type="checkbox"' src/pages/ src/components/` to find inline checkboxes. Replace the most prominent ones with the new `<Checkbox>` component.

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/Checkbox.tsx
git add -u  # any modified files
git commit -m "feat: add shared Checkbox component, replace inline checkboxes"
```

---

## Task 11: Fix Hardcoded Colors

**Files:**
- Various pages with hardcoded Tailwind colors

- [ ] **Step 1: Find hardcoded colors**

Run:
```bash
grep -rn 'text-amber-\|text-purple-\|bg-purple-\|bg-amber-\|text-blue-\|bg-blue-\|text-green-\|bg-green-\|text-red-\|bg-red-' src/pages/ src/components/ --include='*.tsx'
```

- [ ] **Step 2: Replace with semantic tokens**

For each hardcoded color, determine the semantic intent:
- `text-amber-*` / `bg-amber-*` → `text-[var(--status-warning)]` / `bg-[var(--status-warning)]/10`
- `text-purple-*` / `bg-purple-*` → already used for "ideas" tag — keep or define `--color-ideas` token
- `text-blue-*` / `bg-blue-*` → already used for "next-week" tag — keep or define `--color-next-week` token
- `text-green-*` / `bg-green-*` → `text-[var(--status-success)]` / `bg-[var(--status-success)]/10`
- `text-red-*` / `bg-red-*` → `text-[var(--status-danger)]` / `bg-[var(--status-danger)]/10`

**Judgment call:** Some hardcoded colors are intentional domain colors (dance levels, tag colors). If they work well in both light and dark mode, leave them. Only fix ones that break in dark mode or are inconsistent with the theme.

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add -u
git commit -m "fix: replace hardcoded colors with semantic tokens"
```

---

## Task 12: Settings Breadcrumbs

**Files:**
- Create: `src/components/common/Breadcrumb.tsx`
- Modify: All 8 settings sub-pages in `src/pages/settings/`

- [ ] **Step 1: Create Breadcrumb component**

```typescript
// src/components/common/Breadcrumb.tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  items: { label: string; to?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-4 px-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.to ? (
            <Link to={item.to} className="hover:text-[var(--text-secondary)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Add to each settings sub-page**

For each of the 8 settings pages (DisplaySettings, DashboardSettings, WellnessSettings, AISettings, SyncSettings, DataSettings, StudentsSettings, AdvancedSettings):

```typescript
import { Breadcrumb } from '../../components/common/Breadcrumb';

// At the top of the return, before the page title:
<Breadcrumb items={[
  { label: 'Settings', to: '/settings' },
  { label: 'Display' },  // or the appropriate label
]} />
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add src/components/common/Breadcrumb.tsx src/pages/settings/
git commit -m "feat: add breadcrumbs to all Settings sub-pages"
```

---

## Task 13: Quick Access in SettingsHub

**Files:**
- Modify: `src/pages/settings/SettingsHub.tsx`

- [ ] **Step 1: Add Quick Access section at top**

Before the "App" section, add:

```tsx
{/* Quick Access */}
<section className="mb-5">
  <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">Quick Access</h2>
  <div className="space-y-2">
    <SettingCard row={{ to: '/library', icon: BookOpen, label: 'Library', subtitle: 'Terminology, competitions, songs', color: '#8b5cf6' }} />
    <SettingCard row={{ to: '/launch', icon: Rocket, label: 'Launch Plan', subtitle: 'DWD launch tracker', color: '#f97316' }} />
  </div>
</section>
```

Add imports for `BookOpen` and `Rocket` from lucide-react.

- [ ] **Step 2: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 3: Commit**

```bash
cd /Users/dixxx/figgg
git add src/pages/settings/SettingsHub.tsx
git commit -m "feat: add Quick Access section to SettingsHub (Library, LaunchPlan)"
```

---

## Task 14: Clean Up Unused Dashboard Components

**Files:**
- Potentially delete: `src/components/Dashboard/SortableWidget.tsx`
- Verify: All other Dashboard components are still imported somewhere

- [ ] **Step 1: Check which Dashboard components are still imported**

```bash
for f in src/components/Dashboard/*.tsx; do
  name=$(basename "$f" .tsx)
  echo "=== $name ==="
  grep -rl "$name" src/ --include='*.tsx' --include='*.ts' | grep -v "$f"
done
```

- [ ] **Step 2: Delete truly unused components**

Delete any component files that have zero imports from any other file. Expected deletions:
- `SortableWidget.tsx` (drag-drop no longer used)
- `DailyBriefingWidget.tsx` (replaced by context cards)
- `EndOfDaySummary.tsx` (merged into evening context)

- [ ] **Step 3: Build and verify**

Run: `cd /Users/dixxx/figgg && npm run build`

- [ ] **Step 4: Commit**

```bash
cd /Users/dixxx/figgg
git add -A
git commit -m "chore: remove unused Dashboard components (SortableWidget, DailyBriefing, EndOfDaySummary)"
```

---

## Task 15: End-to-End Verification — Visual

**Files:** None (verification only)

Use Chrome DevTools MCP to screenshot every page at iPhone viewport (390x844).

- [ ] **Step 1: Start dev server**

```bash
cd /Users/dixxx/figgg && npm run dev
```

- [ ] **Step 2: Navigate to each page and screenshot**

Use Chrome DevTools to visit localhost:5173 and verify each page:
1. `/` (Dashboard — try different times of day if possible)
2. `/schedule`
3. `/class/{classId}` (pick a real class)
4. `/class/{classId}/notes`
5. `/students`
6. `/library`
7. `/plan`
8. `/me` (both tabs)
9. `/tasks`
10. `/launch`
11. `/ai`
12. `/settings` and each sub-page

Report any visual issues: broken layouts, overflow, missing content, wrong colors.

- [ ] **Step 3: Document and fix issues**

Create a list of visual bugs. Fix each one.

- [ ] **Step 4: Commit fixes**

```bash
cd /Users/dixxx/figgg
git add -u
git commit -m "fix: visual bugs found during end-to-end verification"
```

---

## Task 16: End-to-End Verification — Functional

**Files:** None (verification only)

- [ ] **Step 1: Test CRUD for major data types**

In the running app, test:
- Add/edit/delete a class note (LiveNotes)
- Toggle attendance (ClassDetail)
- Add/complete/delete a reminder (Me → Reminders)
- Log a med dose (Dashboard or Me → Wellness)
- Complete a wellness checklist item
- Send an AI chat message

- [ ] **Step 2: Verify Firestore sync**

Check the browser DevTools Network tab or Firestore console to confirm writes are landing.

- [ ] **Step 3: Test navigation flows**

- Dashboard → Schedule → ClassDetail → LiveNotes → back → back → back
- Dashboard → Me (Wellness) → Settings/Wellness → back → back
- Settings → each sub-page → back (breadcrumb and back arrow both work)
- "More" tab → Library, LaunchPlan (verify Quick Access works)

- [ ] **Step 4: Document and fix issues**

Fix any bugs found.

- [ ] **Step 5: Final build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean compile, zero errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/dixxx/figgg
git add -u
git commit -m "fix: functional bugs found during end-to-end verification"
```

---

## Summary

| Task | Description | Est. Lines Changed |
|------|-------------|-------------------|
| 1 | Create `useDashboardContext` hook | +110 |
| 2 | Rewrite Dashboard.tsx | -800, +400 |
| 3 | Delete old mode hook, simplify settings | -150 |
| 4 | Relocate widgets to Schedule | +30 |
| 5 | Relocate WeeklyInsight to WeekReview | +5 |
| 6 | Relocate FixItemWidget to Me.tsx | +5 |
| 7 | Extract NoteInput component | +150, refactor -200 each page |
| 8 | Replace inline button styling | ~20 per file |
| 9 | Replace inline card styling | ~15 per file |
| 10 | Create Checkbox component | +50 |
| 11 | Fix hardcoded colors | ~30 changes |
| 12 | Settings breadcrumbs | +30 component, +2 per page |
| 13 | Quick Access in SettingsHub | +10 |
| 14 | Clean up unused components | deletions |
| 15 | Visual verification | fixes as needed |
| 16 | Functional verification | fixes as needed |

**Net effect:** ~700 fewer lines of code, more consistent UI, Dashboard goes from overwhelming to focused.
