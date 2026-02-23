# Figgg AI Layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Figgg's AI from isolated single-turn tools into an integrated intelligence layer with multi-turn chat, disruption management, proactive nudges, and class-aware prep/capture flows.

**Architecture:** New unified Netlify function `aiChat.ts` absorbs the existing `aiCheckIn.ts` system prompt and extends it with 7 modes. Client-side adds `/ai` chat page, `useNudges` + `useClassTiming` hooks, and dashboard components for prep/capture/nudges. Existing functions remain as fallbacks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Anthropic SDK (Haiku 4.5 + Sonnet 4.5), Netlify Functions, Lucide icons.

---

## Phase 1: Foundation (Types + Context + Unified Endpoint)

### Task 1: Add new types to `types/index.ts`

**Files:**
- Modify: `src/types/index.ts:486-512` (AppData interface)

**Step 1: Add DisruptionState and SubAssignment types**

After `WeekReflection` (line 103), before `WeekNotes`, add:

```typescript
export interface SubAssignment {
  classId: string;
  date: string;
  subName: string;
}

export interface DisruptionState {
  active: boolean;
  type: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
  reason?: string;
  startDate: string;
  expectedReturn?: string;
  classesHandled: boolean;
  tasksDeferred: boolean;
  subAssignments?: SubAssignment[];
}
```

**Step 2: Add disruption to AppData**

In the `AppData` interface (around line 511), after `dayPlan?: DayPlan;`, add:

```typescript
  disruption?: DisruptionState;
```

**Step 3: Add AI chat message types**

After the `AIConfig` interface, add:

```typescript
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: import('../services/ai').AIAction[];
  adjustments?: string[];
  timestamp: string;
}

export type AIChatMode = 'check-in' | 'chat' | 'briefing' | 'day-plan' | 'prep' | 'capture' | 'reflection';
```

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`
Expected: Clean compile.

**Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add DisruptionState, AIChatMessage types for AI layer"
```

---

### Task 2: Extend AIAction type in `services/ai.ts`

**Files:**
- Modify: `src/services/ai.ts:86-158` (AIAction interface)

**Step 1: Add new action types to the union**

In the `AIAction` interface `type` union (line 87-115), add these after `'addRehearsalNote'`:

```typescript
    // Disruption actions
    | 'startDisruption'
    | 'endDisruption'
    // Multi-day operations
    | 'markClassExceptionRange'
    | 'batchRescheduleTasks'
    | 'assignSub'
    | 'clearWeekPlan'
    | 'generateCatchUpPlan';
```

**Step 2: Add new fields to AIAction**

After the existing fields (around line 157), add:

```typescript
  // Disruption fields
  disruptionType?: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
  startDate?: string;
  endDate?: string;
  expectedReturn?: string;
  subNames?: string[];
  filter?: 'overdue' | 'due-this-week' | 'all-active';
  newDate?: string;
  dates?: string[];
```

**Step 3: Add `callAIChat` function**

After the existing `callGenerateDayPlan` function, add:

```typescript
export interface AIChatRequest {
  mode: import('../types').AIChatMode;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
  context: AIContextPayload & {
    disruption?: import('../types').DisruptionState;
    classPrep?: {
      classId: string;
      className: string;
      lastWeekNotes: string[];
      thisWeekPlan?: string;
      choreographyNotes?: string[];
      studentFlags?: string[];
      song?: string;
    };
    classCapture?: {
      classId: string;
      className: string;
      plannedContent?: string;
      rawDump: string;
    };
    allActiveReminders?: Array<{ id: string; title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
    upcomingCompetitions?: Array<{ name: string; date: string; daysAway: number }>;
  };
}

export interface AIChatResponse {
  response: string;
  mood?: string;
  adjustments?: string[];
  actions?: AIAction[];
  briefing?: string;
  structuredNotes?: Array<{ text: string; category: string }>;
}

export async function callAIChat(
  request: AIChatRequest,
): Promise<AIChatResponse> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}/aiChat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
```

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`

**Step 5: Commit**

```bash
git add src/services/ai.ts
git commit -m "feat: add new AI action types and callAIChat client function"
```

---

### Task 3: Extend `aiContext.ts` with 2-week context builder

**Files:**
- Modify: `src/services/aiContext.ts`

**Step 1: Add an extended context builder**

The existing `buildAIContext` stays as-is (it's used by the check-in widget). Add a new function `buildFullAIContext` after it that adds 2-week data and disruption state:

```typescript
export function buildFullAIContext(
  data: AppData,
  userMessage: string,
): AIContextPayload & {
  disruption?: import('../types').DisruptionState;
  allActiveReminders?: Array<{ id: string; title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
  upcomingCompetitions?: Array<{ name: string; date: string; daysAway: number }>;
  date: string;
} {
  const base = buildAIContext(data, 'morning', userMessage);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // All active reminders (not just top 5)
  const reminders = (data.selfCare?.reminders || [])
    .filter(r => !r.completed)
    .map(r => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      flagged: r.flagged,
      completed: r.completed,
    }));

  // Upcoming competitions with days away
  const upcomingCompetitions = (data.competitions || [])
    .filter(c => c.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(c => {
      const compDate = new Date(c.date + 'T00:00:00');
      const daysAway = Math.ceil((compDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { name: c.name, date: c.date, daysAway };
    });

  return {
    ...base,
    date: todayStr,
    disruption: data.disruption,
    allActiveReminders: reminders,
    upcomingCompetitions,
  };
}
```

**Step 2: Run build**

Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/services/aiContext.ts
git commit -m "feat: add buildFullAIContext with 2-week data and disruption state"
```

---

### Task 4: Create unified `aiChat.ts` Netlify function

**Files:**
- Create: `netlify/functions/aiChat.ts`

This is the largest single task. The function absorbs the full `aiCheckIn.ts` system prompt and extends it for 7 modes.

**Step 1: Create the file**

Create `netlify/functions/aiChat.ts`. The full implementation:

- Auth/validation boilerplate (same as `aiCheckIn.ts`)
- Mode-aware system prompt builder
- Context formatting (same as `aiCheckIn.ts` lines 138-241, extended)
- Model selection (Haiku for check-in/briefing/day-plan/prep/capture, Sonnet for chat/reflection)
- Response parsing

The system prompt for `check-in` mode must be IDENTICAL to the existing `aiCheckIn.ts` prompt. For `chat` mode, extend it with multi-turn awareness and the new action types. For other modes, write mode-specific prompts.

Key implementation details:
- `mode === 'check-in'`: Copy the FULL system prompt from `aiCheckIn.ts` lines 33-135. Same personality, rules, action docs. Model: `claude-haiku-4-5-20251001`.
- `mode === 'chat'`: Same base prompt as check-in, PLUS multi-turn instructions, new action types (disruption, batch reschedule, exception range, sub assignments). Add autonomy rules. Model: `claude-sonnet-4-5-20250929`.
- `mode === 'briefing'`: Short prompt — generate 2-4 sentence briefing. Include disruption awareness. Model: `claude-haiku-4-5-20251001`.
- `mode === 'day-plan'`: Copy the FULL system prompt from `generateDayPlan.ts` lines 33-93. Model: `claude-haiku-4-5-20251001`.
- `mode === 'prep'`: Receive class context, synthesize 2-3 sentence prep summary. Model: `claude-haiku-4-5-20251001`.
- `mode === 'capture'`: Receive raw dump + class context, return structured notes. Model: `claude-haiku-4-5-20251001`.
- `mode === 'reflection'`: Review week data, generate summary + patterns + question. Model: `claude-sonnet-4-5-20250929`.

For `chat` mode, include message history in the Anthropic `messages` array. For all other modes, single-turn only.

**Step 2: Run build**

This is a Netlify function (not compiled by Vite), but verify no import errors:
Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add netlify/functions/aiChat.ts
git commit -m "feat: create unified aiChat Netlify function with 7 modes"
```

---

### Task 5: Add new action handlers to Dashboard's `executeAIActions`

**Files:**
- Modify: `src/pages/Dashboard.tsx:206-539` (executeAIActions callback)
- Modify: `src/hooks/useAppData.ts` (add `updateDisruption` method)

**Step 1: Add `updateDisruption` to useAppData**

In `useAppData.ts`, add a new method similar to `updateSelfCare`:

```typescript
const updateDisruption = useCallback((disruption: AppData['disruption']) => {
  setData(prev => {
    const updated = { ...prev, disruption, lastModified: new Date().toISOString() };
    saveData(updated);
    return updated;
  });
}, []);
```

Return it from the hook.

**Step 2: Add new action cases to Dashboard's executeAIActions**

After the existing `addRehearsalNote` case (line 528), add:

```typescript
case 'startDisruption': {
  if (!action.disruptionType) break;
  const disruption: DisruptionState = {
    active: true,
    type: action.disruptionType,
    reason: action.reason,
    startDate: todayKey,
    expectedReturn: action.expectedReturn,
    classesHandled: false,
    tasksDeferred: false,
  };
  updateDisruption(disruption);
  break;
}
case 'endDisruption': {
  updateDisruption(undefined);
  break;
}
case 'markClassExceptionRange': {
  if (!action.startDate || !action.endDate || !action.exceptionType) break;
  // Mark exceptions for all classes across the date range
  // Iterate each day, find classes for that day, mark exceptions
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let current = new Date(action.startDate + 'T00:00:00');
  const end = new Date(action.endDate + 'T00:00:00');
  while (current <= end) {
    const dayName = days[current.getDay()] as DayOfWeek;
    const dateStr = format(current, 'yyyy-MM-dd');
    const weekOf = formatWeekOf(getWeekStart(current));
    // Get or create weekNotes for this week
    let weekNote = dataRef.current.weekNotes.find(w => w.weekOf === weekOf);
    if (!weekNote) {
      weekNote = { id: `week_${weekOf}`, weekOf, classNotes: {} };
    }
    const dayClasses = getClassesByDay(dataRef.current.classes, dayName);
    for (const cls of dayClasses) {
      const existing = weekNote.classNotes[cls.id] || { classId: cls.id, plan: '', liveNotes: [], isOrganized: false };
      weekNote.classNotes[cls.id] = {
        ...existing,
        exception: {
          type: action.exceptionType,
          ...(action.subName ? { subName: action.subName } : {}),
          ...(action.reason ? { reason: action.reason as 'sick' | 'personal' | 'holiday' | 'other' } : {}),
        },
      };
    }
    saveWeekNotes(weekNote);
    current = addDays(current, 1);
  }
  // Update disruption state if active
  if (dataRef.current.disruption?.active) {
    updateDisruption({ ...dataRef.current.disruption, classesHandled: true });
  }
  break;
}
case 'batchRescheduleTasks': {
  if (!action.filter || !action.newDate) break;
  const allReminders = [...(sc.reminders || [])];
  const updated = allReminders.map(r => {
    if (r.completed) return r;
    const isOverdue = r.dueDate && r.dueDate < todayKey;
    const isDueThisWeek = r.dueDate && r.dueDate >= todayKey && r.dueDate <= format(addDays(new Date(), 7), 'yyyy-MM-dd');
    let shouldReschedule = false;
    if (action.filter === 'overdue' && isOverdue) shouldReschedule = true;
    if (action.filter === 'due-this-week' && isDueThisWeek) shouldReschedule = true;
    if (action.filter === 'all-active') shouldReschedule = true;
    if (shouldReschedule) {
      return { ...r, dueDate: action.newDate, updatedAt: new Date().toISOString() };
    }
    return r;
  });
  selfCareUpdates.reminders = updated;
  needsSelfCareUpdate = true;
  // Update disruption state if active
  if (dataRef.current.disruption?.active) {
    updateDisruption({ ...dataRef.current.disruption, tasksDeferred: true });
  }
  break;
}
case 'assignSub': {
  if (!action.classIds || !action.dates || !action.subName) break;
  const disruption = dataRef.current.disruption;
  if (disruption?.active) {
    const newAssignments = action.classIds.flatMap(classId =>
      (action.dates || []).map(date => ({ classId, date, subName: action.subName! }))
    );
    updateDisruption({
      ...disruption,
      subAssignments: [...(disruption.subAssignments || []), ...newAssignments],
    });
  }
  break;
}
case 'clearWeekPlan': {
  // No-op for now — week plans are per-class, clearing is destructive
  break;
}
case 'generateCatchUpPlan': {
  // This is a signal to the chat to generate a catch-up. No client action needed.
  break;
}
```

**Step 3: Import the new types at the top of Dashboard.tsx**

Add `DisruptionState` and `DayOfWeek` to imports from `../types`.
Add `addDays` to the `date-fns` import.

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`

**Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx src/hooks/useAppData.ts
git commit -m "feat: add disruption and batch action handlers to Dashboard"
```

---

## Phase 2: Chat Page

### Task 6: Create the `/ai` chat page

**Files:**
- Create: `src/pages/AIChat.tsx`

**Implementation:**

Full-page chat interface with:
- Message list (scrollable area)
- Fixed input bar at bottom
- Back button to dashboard
- "New conversation" button
- Each AI message shows text + action badges
- Conversation state in `useState<AIChatMessage[]>`
- Calls `callAIChat` with `mode: 'chat'` and full context
- Actions executed via a shared `executeAIActions` (extract from Dashboard or duplicate)

Design:
- User messages: right-aligned, `bg-[var(--accent-primary)]` text `text-[var(--text-on-accent)]`, rounded
- AI messages: left-aligned, `bg-[var(--surface-card)]`, rounded
- Action badges below AI messages (same style as check-in)
- Input: sticky bottom bar with text input + send button
- Mobile-first, safe area padding

Key challenge: `executeAIActions` is currently defined as a callback inside Dashboard. We need to extract it into a shared utility so both Dashboard and AIChat can use it. Create `src/services/aiActions.ts` with the action execution logic, taking the required state updaters as parameters.

**Step 1: Create `src/services/aiActions.ts`**

Extract the `executeAIActions` logic from Dashboard.tsx into a standalone function that accepts the data and mutation callbacks as parameters.

**Step 2: Create `src/pages/AIChat.tsx`**

The chat page component.

**Step 3: Update Dashboard.tsx to use shared `aiActions.ts`**

Replace the inline `executeAIActions` callback with a call to the shared function.

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`

**Step 5: Commit**

```bash
git add src/services/aiActions.ts src/pages/AIChat.tsx src/pages/Dashboard.tsx
git commit -m "feat: create /ai chat page with shared action executor"
```

---

### Task 7: Add `/ai` route and navigation

**Files:**
- Modify: `src/App.tsx:15-31` (lazy imports) and `91-110` (routes)
- Modify: `src/components/common/Header.tsx:18-25` (navItems)

**Step 1: Add lazy import in App.tsx**

```typescript
const AIChat = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));
```

**Step 2: Add route**

After the `/settings` route:
```tsx
<Route path="/ai" element={<AIChat />} />
```

**Step 3: Update navItems in Header.tsx**

Replace the `launch` nav item (or `settings`) with AI. The nav bar has 6 items. Replace `/launch` with `/ai`:

```typescript
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/me', icon: Pill, label: 'Meds' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/ai', icon: Sparkles, label: 'AI' },
  { path: '/settings', icon: MoreHorizontal, label: 'More' },
];
```

Import `Sparkles` from lucide-react. Move DWDC launch plan access into the "More" menu.

Update the `isActive` function to handle `/ai`.

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`

**Step 5: Commit**

```bash
git add src/App.tsx src/components/common/Header.tsx
git commit -m "feat: add /ai route and nav item, move DWDC to More menu"
```

---

## Phase 3: Disruption Mode

### Task 8: Disruption-aware Dashboard behavior

**Files:**
- Modify: `src/pages/Dashboard.tsx` (greeting, check-in prompt, visual adjustments)
- Modify: `src/components/Dashboard/MorningBriefing.tsx` (disrupted state)

**Step 1: Add disruption awareness to Dashboard greeting**

In the greeting `useMemo` (around line 886), add disruption check:

```typescript
if (data.disruption?.active) {
  const dayNum = Math.ceil((new Date().getTime() - new Date(data.disruption.startDate).getTime()) / (1000 * 60 * 60 * 24));
  return { greeting: base, greetingSub: `Day ${dayNum} away` };
}
```

**Step 2: Soften check-in prompt during disruption**

When building the check-in widget greeting, check disruption state. If active, use softer greetings like "How are you holding up?" instead of the standard options.

**Step 3: Mute overdue badge during disruption**

In MorningBriefing, when `disruption?.active`, style overdue counts with muted colors instead of red.

**Step 4: Run build**

Run: `cd ~/figgg && npm run build`

**Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/Dashboard/MorningBriefing.tsx
git commit -m "feat: disruption-aware Dashboard with muted visuals and softer prompts"
```

---

## Phase 4: Proactive Nudges

### Task 9: Create `useNudges` hook

**Files:**
- Create: `src/hooks/useNudges.ts`

**Implementation:**

```typescript
export interface Nudge {
  id: string;
  type: 'overdue' | 'meds' | 'competition' | 'disruption' | 'launch' | 'wellness' | 'sub';
  priority: 'high' | 'medium' | 'low';
  text: string;
  actionLabel?: string;
  aiPreload?: string;
  dismissable: boolean;
  snoozeable: boolean;
}

export function useNudges(data: AppData): Nudge[] {
  // Implements 7 rules from the design doc
  // Reads dismissed/snoozed state from localStorage
  // Returns max 3 nudges sorted by priority
}
```

Rules to implement:
1. Overdue tasks > 5 → high priority
2. Days since last med log > 2 (not in disruption) → high
3. Competition within 14 days + dances missing notes → high
4. Disruption active > 5 days → medium
5. No launch tasks completed in 7+ days → medium
6. 3+ consecutive days below 50% wellness → medium

Dismissed/snoozed state stored in localStorage key `figgg-nudge-state`.

**Step 1: Create the hook**

**Step 2: Run build**

Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/hooks/useNudges.ts
git commit -m "feat: create useNudges hook with 6 proactive rules"
```

---

### Task 10: Create NudgeCard component and integrate into Dashboard

**Files:**
- Create: `src/components/Dashboard/NudgeCards.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Create NudgeCards component**

Renders up to 3 nudge cards. Each card has:
- Text
- Optional action button (links to `/ai?preload=...`)
- Dismiss button
- Snooze button (24h)
- Subtle styling — not alarming

**Step 2: Add to Dashboard widget order**

Add `'nudges'` to `DEFAULT_WIDGET_ORDER` (after morning-briefing, before todays-agenda). Wire up in the widget render section.

**Step 3: Run build**

Run: `cd ~/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/components/Dashboard/NudgeCards.tsx src/pages/Dashboard.tsx
git commit -m "feat: add proactive nudge cards to Dashboard"
```

---

## Phase 5: AI-Powered Morning Briefing

### Task 11: Upgrade MorningBriefing to use AI

**Files:**
- Modify: `src/components/Dashboard/MorningBriefing.tsx`

**Step 1: Add AI briefing call**

On first render of the day (check sessionStorage for `figgg-briefing-date`), call `callAIChat` with `mode: 'briefing'` and the full context. Cache result in sessionStorage.

If the call fails, fall back to the existing static briefing. Display the AI briefing as a text block above the existing stats row.

Disruption-aware: if `disruption?.active`, the AI returns a gentler briefing.

**Step 2: Run build**

Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/components/Dashboard/MorningBriefing.tsx
git commit -m "feat: AI-powered morning briefing with disruption awareness"
```

---

## Phase 6: Class Prep & Capture

### Task 12: Create `useClassTiming` hook

**Files:**
- Create: `src/hooks/useClassTiming.ts`

**Implementation:**

```typescript
export interface ClassWithContext {
  class: Class;
  studio?: Studio;
  lastWeekNotes: LiveNote[];
  thisWeekPlan?: string;
  choreographyNotes?: string[];
  studentFlags?: string[];
  enrolledStudents: Student[];
}

export function useClassTiming(data: AppData, currentMinute: number): {
  upcomingClass: ClassWithContext | null;   // starts within 60 min
  justEndedClass: ClassWithContext | null;  // ended within 30 min, no notes logged
  minutesUntilNext: number | null;
}
```

Uses `getClassesByDay`, `timeToMinutes`, and the current week's notes to determine if notes have been logged.

**Step 1: Create the hook**

**Step 2: Run build**

Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/hooks/useClassTiming.ts
git commit -m "feat: create useClassTiming hook for prep/capture triggers"
```

---

### Task 13: Create PrepCard component

**Files:**
- Create: `src/components/Dashboard/PrepCard.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Implementation:**

Two tiers:
1. **Quick prep (default):** Client-side data assembly — class name, time, studio, last week notes, this week plan, choreography notes. Structured card.
2. **Smart prep (tap to upgrade):** "Get AI summary" button calls `callAIChat` with `mode: 'prep'` and class-specific context. Replaces raw data with 2-3 sentence synthesis.

**Step 1: Create PrepCard**

**Step 2: Integrate into Dashboard**

Show PrepCard when `useClassTiming.upcomingClass` is not null. Place it above the hero card area.

**Step 3: Run build**

Run: `cd ~/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/components/Dashboard/PrepCard.tsx src/pages/Dashboard.tsx
git commit -m "feat: add PrepCard with quick prep and AI smart prep"
```

---

### Task 14: Create PostClassCapture component

**Files:**
- Create: `src/components/Dashboard/PostClassCapture.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Implementation:**

Displayed when `useClassTiming.justEndedClass` is not null.

- Card with "How'd {className} go?"
- Multiline text input (expandable)
- "Save" button sends raw text to `callAIChat` with `mode: 'capture'`
- AI returns structured notes mapped to categories
- Notes saved via `saveWeekNotes` (using existing `addClassNote` pattern)
- After save, show brief confirmation then auto-dismiss

**Step 1: Create PostClassCapture**

**Step 2: Integrate into Dashboard**

Show after the hero card area when a class just ended. Replace or supplement the existing `recentlyEndedClass` card.

**Step 3: Run build**

Run: `cd ~/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/components/Dashboard/PostClassCapture.tsx src/pages/Dashboard.tsx
git commit -m "feat: add PostClassCapture with AI note structuring"
```

---

## Phase 7: Week-End Reflection

### Task 15: Add reflection as a nudge + chat integration

**Files:**
- Modify: `src/hooks/useNudges.ts` (add reflection trigger rule)
- The `/ai` chat page already supports `mode: 'reflection'` via the unified endpoint

**Step 1: Add reflection nudge rule**

In `useNudges.ts`, add a rule:
- Condition: It's Friday after 3pm or Sunday, AND no reflection exists for this week
- Priority: medium
- Text: "End of the week. Ready for a reflection?"
- `aiPreload`: "Let's do a weekly reflection"

**Step 2: Run build**

Run: `cd ~/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/hooks/useNudges.ts
git commit -m "feat: add weekly reflection nudge trigger"
```

---

## Phase 8: Integration Testing & Polish

### Task 16: Wire check-in widget to use new endpoint

**Files:**
- Modify: `src/pages/Dashboard.tsx` (handleCheckInSubmit)

**Step 1: Update handleCheckInSubmit**

Change from calling `callAICheckIn` to calling `callAIChat` with `mode: 'check-in'`. The response shape is the same, so action handling doesn't change.

```typescript
const payload: AIChatRequest = {
  mode: 'check-in',
  userMessage: message,
  context: buildFullAIContext(dataRef.current, message),
};
const result = await callAIChat(payload);
```

**Step 2: Verify check-in still works identically**

The `aiChat.ts` check-in mode uses the EXACT same system prompt as `aiCheckIn.ts`, so behavior should be identical.

**Step 3: Run build**

Run: `cd ~/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: wire check-in widget to unified aiChat endpoint"
```

---

### Task 17: Final build verification and cleanup

**Files:**
- All modified files

**Step 1: Full build**

Run: `cd ~/figgg && npm run build`
Expected: Clean compile with zero errors.

**Step 2: Test locally**

Run: `cd ~/figgg && npm run dev`
Verify:
- Dashboard loads without errors
- `/ai` route accessible
- Nav bar shows AI item
- Check-in widget appears
- No console errors

**Step 3: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete AI layer integration — all 8 features"
```

---

## File Summary

### New files (7):
- `netlify/functions/aiChat.ts` — unified AI endpoint
- `src/pages/AIChat.tsx` — chat page
- `src/services/aiActions.ts` — shared action executor
- `src/hooks/useNudges.ts` — proactive rules engine
- `src/hooks/useClassTiming.ts` — class prep/capture triggers
- `src/components/Dashboard/PrepCard.tsx` — pre-class prep card
- `src/components/Dashboard/PostClassCapture.tsx` — post-class capture
- `src/components/Dashboard/NudgeCards.tsx` — nudge card display

### Modified files (7):
- `src/types/index.ts` — DisruptionState, AIChatMessage types
- `src/services/ai.ts` — new action types, callAIChat function
- `src/services/aiContext.ts` — buildFullAIContext
- `src/pages/Dashboard.tsx` — new action handlers, disruption awareness, component integration
- `src/hooks/useAppData.ts` — updateDisruption method
- `src/components/common/Header.tsx` — AI nav item
- `src/App.tsx` — /ai route
- `src/components/Dashboard/MorningBriefing.tsx` — AI-powered briefing

### Untouched files (preserved as fallback):
- `netlify/functions/aiCheckIn.ts`
- `netlify/functions/generateDayPlan.ts`
- `netlify/functions/expandNotes.ts`
- `netlify/functions/generatePlan.ts`
- `netlify/functions/detectReminders.ts`

---

## Decisions (Resolved 2026-02-23)

1. **Nav bar:** Replace `/launch` (DWDC) with `/ai`. DWDC moves to More menu. ✅
2. **Check-in model:** Keep Sonnet for ALL modes. Don't switch to Haiku. ✅
3. **Disruption visuals:** Full dashboard restructure — hide non-essential widgets, show minimal view during disruption. ✅
4. **Nudge placement:** Part of sortable widget order (not fixed position). ✅
