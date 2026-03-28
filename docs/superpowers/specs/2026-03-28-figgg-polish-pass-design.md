# Figgg Polish Pass — Design Spec

**Date:** 2026-03-28
**Goal:** Polish, organize, and professionalize the Figgg app. No new features — tighten what exists.

---

## 1. Smart Dashboard Redesign

### Problem
Dashboard has 19 widgets in a single scrollable view (1,158 lines). Overwhelming on mobile. Duplicates data that lives on dedicated pages.

### Solution: Context-Aware Dashboard
The Dashboard detects the current time-of-day and teaching context, showing only 4-5 relevant cards at a time.

### Time Contexts

**Morning (wake → first class)**
- Meds status card (have you taken dose 1?)
- Today's agenda (classes + events, compact list)
- AI check-in prompt (if due)
- Scratchpad (collapsed, tap to expand)

**Pre-Class (60 min before → class start)**
- Prep card for upcoming class (plan, last week's notes, student flags)
- Attendance shortcut
- Meds reminder if dose is due

**During Class (class start → class end)**
- Link to LiveNotes for current class
- Attendance tracker inline
- Minimal — you're teaching

**Post-Class (class end → 30 min after)**
- Post-class capture (quick notes, how'd it go)
- Next class prep if another is coming
- Meds if dose window approaching

**Evening (after last class → bedtime)**
- Day summary (classes taught, notes taken, attendance)
- Tomorrow preview (first class, any prep needed)
- Wellness check (checklist items, therapy journal prompt)

**Default / No Classes Today**
- Today's calendar events
- Reminders due today
- Scratchpad
- Quick links to Schedule, Students, Library

### Rule
Max 4-5 cards visible at any time. No scrolling through walls of widgets.

### Context Detection Logic
Uses existing hooks:
- `useCurrentClass()` — what's happening now/next (updates every 30s)
- `useClassTiming()` — upcoming class within 60 min, just-ended within 30 min
- `useCheckInStatus()` — morning/afternoon AI check-in due
- `useSelfCareStatus()` — meds timing (IR/XR dose windows)
- Time of day from `Date.now()`
- Classes for today from `data.classes` + schedule

New: `useDashboardContext()` hook that combines these into a single context enum:
```typescript
type DashboardContext = 'morning' | 'pre-class' | 'during-class' | 'post-class' | 'evening' | 'default';
```

### Widget Migration

**Removed from Dashboard (already have homes):**
| Widget | New Home |
|--------|----------|
| WeekStats | Schedule page |
| WeekMomentumBar | Schedule page |
| WeeklyInsight | WeekReview page |
| StreakCard | Schedule page |
| LaunchPlanWidget | `/launch` page |
| EventCountdown | Schedule page |
| SortableWidget | Removed (no drag-drop needed with 4-5 cards) |
| DailyBriefingWidget | Replaced by context-aware cards |
| EndOfDaySummary | Evening context |
| FixItemWidget | Me page wellness tab |
| DashboardSettings | Simplified or removed |

**Stays (restructured):**
| Widget | Role |
|--------|------|
| TodaysAgenda | Core of Morning/Default context |
| MorningBriefing → MedsCard | Meds status in Morning/Pre-Class |
| AICheckInWidget | Shown when check-in is due |
| PrepCard | Pre-Class context |
| PostClassCapture | Post-Class context |
| RemindersWidget | Morning/Default, compact |
| ScratchpadWidget | Always available, collapsed |
| DayPlanWidget | Merged into agenda card |

**Target:** Dashboard.tsx goes from ~1,158 lines to ~400 lines.

### Relocated Widget Placement

**Schedule page gains:**
- WeekStats (weekly teaching numbers)
- WeekMomentumBar (Mon-Sun completion visual)
- StreakCard (teaching streak counter)
- EventCountdown (upcoming competitions/events)

These appear as a compact summary section at the top of Schedule, before the day tabs.

**WeekReview page gains:**
- WeeklyInsight (moved here where it contextually belongs)

**Me page wellness tab gains:**
- FixItemWidget (wellness check-in items)

---

## 2. Code Deduplication

### 2a. Extract NoteInput Component
**Problem:** LiveNotes.tsx and EventNotes.tsx share ~300 lines of identical note-taking UI (input field, tag selector, save handler, note display by category).

**Solution:** Extract `src/components/common/NoteInput.tsx`:
- Props: `notes`, `onSave`, `onDelete`, `tags`, `terminologySuggestions?`, `attendanceData?`
- Renders: Input field, quick tag buttons, saved notes grouped by category, dropdown actions per note
- LiveNotes and EventNotes become thin wrappers that provide data + callbacks

### 2b. Replace Inline Button Styling
**Problem:** Schedule.tsx, WeekPlanner.tsx, ClassDetail.tsx use ad-hoc button classes instead of `<Button>`.

**Solution:** Find all inline-styled buttons and replace with `<Button variant="..." size="...">`. No new variants needed — existing 5 variants + 3 sizes cover all cases.

**Files:** Schedule.tsx (week nav), WeekPlanner.tsx (line ~230), ClassDetail.tsx (attendance buttons)

### 2c. Replace Inline Card Styling
**Problem:** WeekPlanner.tsx, LiveNotes.tsx, ClassDetail.tsx use inline card divs.

**Solution:** Replace with `<Card variant="standard">` or `<Card variant="inset">`.

**Files:** WeekPlanner.tsx (line ~309), LiveNotes.tsx (note items), ClassDetail.tsx (last week section)

---

## 3. Design Consistency

### 3a. Semantic Color Tokens
**Problem:** ~10% of color usage is hardcoded Tailwind colors (`text-amber-400`, `text-purple-500`, `bg-purple-50`).

**Solution:** Replace with semantic tokens from `src/index.css`. For domain-specific colors (dance level colors, launch categories), define new semantic tokens if needed, or accept them as intentional domain colors.

### 3b. Extract Checkbox Component
**Problem:** Inline-styled checkboxes in multiple places with no shared component.

**Solution:** Extract `src/components/common/Checkbox.tsx` with consistent styling, focus states, and touch targets.

### 3c. Consistent Card Padding
**Problem:** Some cards use `px-4 py-3`, others `px-3 py-2`.

**Solution:** Audit all Card usages and standardize: `px-4 py-3` for standard cards, `px-3 py-2` for compact/inset cards.

---

## 4. Navigation Polish

### 4a. Settings Breadcrumbs
**Problem:** Settings sub-pages only have a back arrow. 8 sub-pages, easy to lose context.

**Solution:** Add breadcrumb below header: `Settings > Display`, `Settings > Wellness`, etc. Use a simple `<Breadcrumb>` component or inline text.

### 4b. "More" Menu Discoverability
**Problem:** Library and LaunchPlan are accessible via "More" tab but feel buried.

**Solution:** On the Settings/More page (SettingsHub.tsx), add a "Quick Access" section at the top with Library and LaunchPlan as prominent cards before the settings sections.

---

## 5. Functional Verification (End-to-End)

### 5a. Page-by-Page Mobile Walkthrough
Run Chrome DevTools at iPhone viewport. Screenshot and verify every page renders correctly:
- Dashboard (all 5-6 contexts)
- Schedule (week view, day tabs, class/event items)
- ClassDetail (notes, attendance, plan)
- LiveNotes (input, tags, autocomplete, AI buttons)
- CalendarEventDetail
- EventNotes
- DanceDetail (media, music player)
- Students (list, search, add/edit modal)
- Library (3 tabs, search)
- WeekPlanner (plan per class, AI generation)
- WeekReview (note aggregation, reflection)
- Me — Reminders tab (lists, add/edit, recurring)
- Me — Wellness tab (meds, checklist, therapy, meditation, grief)
- LaunchPlan (3 views, task cards)
- AIChat (threads, messages, actions)
- All 8 Settings sub-pages

### 5b. CRUD Verification
For each data type, verify add/edit/delete works and syncs to Firestore:
- Classes, Students, Studios
- WeekNotes (plans, notes, attendance, reflection)
- Competitions, CompetitionDances
- Calendar Events (sync from iCal)
- Reminders (create, complete, recurring)
- SelfCare (meds, wellness items, therapy, meditation)
- Choreographies
- Terminology
- AI Check-ins, AI Chat threads
- LaunchPlan tasks
- Settings/profile

### 5c. AI Features
- Expand notes (LiveNotes)
- Organize notes (LiveNotes)
- Detect reminders (LiveNotes)
- AI Chat (all modes: check-in, chat, briefing, day-plan, prep, capture, reflection)

### 5d. PWA/Offline
- Verify service worker caching
- Test offline load
- Verify sync resumes when back online

---

## Scope Boundaries

**IN scope:**
- Dashboard restructure (context-aware)
- Code deduplication (NoteInput, Button, Card)
- Design consistency (colors, checkbox, padding)
- Navigation polish (breadcrumbs, More menu)
- End-to-end functional verification
- Bug fixes found during verification

**OUT of scope:**
- New features
- Architecture changes beyond Dashboard
- Theme/color palette changes (Ink & Gold stays)
- Route/URL changes
- Firestore schema changes
- Cloud Functions changes
- New dependencies
