# Visual Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the figgg app's visual design by fixing off-palette colors, raising the text size floor, converting ALL-CAPS labels to title case, refining spacing on key components, and improving dark mode warmth.

**Architecture:** Pure visual changes — no data model, no logic, no new components. Every change is a className or CSS variable tweak. Files touched: index.css, WeekStats.tsx, TodaysAgenda.tsx, and Me.tsx.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (CSS-first config), Fraunces (display font), Inter (body)

---

## Task 1: Fix off-palette colors + type size floor (WeekStats.tsx)

**Files:**
- Modify: `src/components/Dashboard/WeekStats.tsx`

**Changes:**

1. Students stat: `text-blue-600 dark:text-blue-400` → `text-forest-600 dark:text-forest-400`
2. All `text-[10px]` → `text-xs` (12px floor)
3. All `text-[11px]` → `text-xs`
4. ALL-CAPS section header "This Week" → title case, drop uppercase+tracking-widest, use `text-xs font-semibold text-blush-500 dark:text-blush-400`
5. Same for stat labels ("Classes", "Notes", "Students", "Plans", "Attendance") → title case, `text-xs`
6. Sub badge: `text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30` → `text-sage-700 bg-sage-50 dark:text-sage-300 dark:bg-sage-900/20` — but sage is defined as a CSS variable (`--color-sage`), not a Tailwind scale. Use `text-[--color-sage-dark] bg-forest-50 dark:text-[--color-sage-light] dark:bg-forest-900/20` instead.

**Full replacement for WeekStats.tsx:**

```tsx
import { TeachingStats } from '../../hooks/useTeachingStats';

interface WeekStatsProps {
  stats: TeachingStats;
}

export function WeekStats({ stats }: WeekStatsProps) {
  return (
    <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 overflow-hidden">
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-blush-500 dark:text-blush-400">
          This Week
        </h3>
      </div>

      <div className="grid grid-cols-4 divide-x divide-blush-100 dark:divide-blush-700 border-t border-blush-100 dark:border-blush-700">
        {/* Classes */}
        <div className="p-3 text-center">
          <div className="text-2xl font-display text-[--color-sage-dark] dark:text-[--color-sage-light] leading-none">
            {stats.classesThisWeek.completed}
          </div>
          <div className="text-xs text-blush-400 dark:text-blush-500 mt-1">
            of {stats.classesThisWeek.total}
          </div>
          <div className="text-xs font-semibold text-blush-400 dark:text-blush-500 mt-0.5">
            Classes
          </div>
        </div>

        {/* Notes */}
        <div className="p-3 text-center">
          <div className="text-2xl font-display text-[--color-honey-dark] dark:text-[--color-honey-light] leading-none">
            {stats.notesThisWeek}
          </div>
          <div className="text-xs font-semibold text-blush-400 dark:text-blush-500 mt-1.5">
            Notes
          </div>
        </div>

        {/* Students */}
        <div className="p-3 text-center">
          <div className="text-2xl font-display text-forest-600 dark:text-forest-400 leading-none">
            {stats.studentsSeenThisWeek}
          </div>
          <div className="text-xs font-semibold text-blush-400 dark:text-blush-500 mt-1.5">
            Students
          </div>
        </div>

        {/* Plans */}
        <div className="p-3 text-center">
          <div className="text-2xl font-display text-blush-600 dark:text-blush-300 leading-none">
            {stats.plansFilled.filled}
          </div>
          <div className="text-xs text-blush-400 dark:text-blush-500 mt-1">
            of {stats.plansFilled.total}
          </div>
          <div className="text-xs font-semibold text-blush-400 dark:text-blush-500 mt-0.5">
            Plans
          </div>
        </div>
      </div>

      {/* Attendance row — only if data exists */}
      {stats.attendanceRate > 0 && (
        <div className="px-4 py-2.5 border-t border-blush-100 dark:border-blush-700 flex items-center justify-between">
          <span className="text-xs font-semibold text-blush-400 dark:text-blush-500">Attendance</span>
          <span className="text-lg font-display text-[--color-sage-dark] dark:text-[--color-sage-light]">{stats.attendanceRate}%</span>
        </div>
      )}

      {/* Exception row — only if any classes were cancelled or subbed */}
      {(stats.cancelledThisWeek > 0 || stats.subbedThisWeek > 0) && (
        <div className="px-4 py-2.5 border-t border-blush-100 dark:border-blush-700">
          <span className="text-xs text-blush-400 dark:text-blush-500">
            {[
              stats.cancelledThisWeek > 0 && `${stats.cancelledThisWeek} cancelled`,
              stats.subbedThisWeek > 0 && `${stats.subbedThisWeek} subbed`,
            ].filter(Boolean).join(' · ')} this week
          </span>
        </div>
      )}
    </div>
  );
}
```

**Verify:** `npm run build` — no errors.

---

## Task 2: TodaysAgenda — type sizes, title case, sub badge color, tabular-nums, left border

**Files:**
- Modify: `src/components/Dashboard/TodaysAgenda.tsx`

**Specific changes (do NOT rewrite the whole file — surgical edits only):**

### 2a. Section header — title case + type size
```
FIND:    <h2 className="text-[11px] font-bold uppercase tracking-widest text-blush-400 dark:text-blush-500">
           {showTodayItems ? 'Today' : tomorrowPreview ? 'Looking Ahead' : allPast ? 'Done for Today' : 'Today'}
         </h2>
REPLACE: <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400">
           {showTodayItems ? 'Today' : tomorrowPreview ? 'Looking Ahead' : allPast ? 'Done for Today' : 'Today'}
         </h2>
```

### 2b. "First Thing {day}" sub-header — title case
```
FIND:    <h3 className="text-[11px] font-bold uppercase tracking-widest text-blush-400 dark:text-blush-500">
           First Thing {tomorrowPreview.dayLabel}
         </h3>
REPLACE: <h3 className="text-xs font-semibold text-blush-500 dark:text-blush-400">
           First Thing {tomorrowPreview.dayLabel}
         </h3>
```

### 2c. Time displays — add tabular-nums
All `text-lg font-display leading-none` on time values get `tabular-nums` added:
```
FIND (event time):    className={`text-lg font-display leading-none ${
REPLACE:              className={`text-lg font-display leading-none tabular-nums ${
```
Do this for all 3 time display divs (event item, class item, tomorrow preview).

### 2d. Current class border — increase to border-l-4
```
FIND:    isCurrent || isActive ? 'bg-forest-50/50 dark:bg-forest-900/10 border-l-3 border-forest-500' :
REPLACE: isCurrent || isActive ? 'bg-forest-50/50 dark:bg-forest-900/10 border-l-4 border-forest-500' :
```
Also for events:
```
FIND:    isCurrent ? 'bg-amber-50/50 dark:bg-amber-900/10 border-l-3 border-amber-500' :
REPLACE: isCurrent ? 'bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-500' :
```

### 2e. Sub badge — teal → palette
```
FIND:    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
           Sub{item.exception.subName ? `: ${item.exception.subName}` : ''}
         </span>
REPLACE: <span className="text-xs font-semibold text-[--color-sage-dark] dark:text-[--color-sage-light] bg-forest-50 dark:bg-forest-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
           Sub{item.exception.subName ? `: ${item.exception.subName}` : ''}
         </span>
```

### 2f. Cancelled badge — type size
```
FIND:    <span className="text-[10px] font-bold uppercase tracking-wider text-blush-400 dark:text-blush-500 bg-blush-100 dark:bg-blush-800/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
           Cancelled
         </span>
REPLACE: <span className="text-xs font-semibold text-blush-400 dark:text-blush-500 bg-blush-100 dark:bg-blush-800/40 px-1.5 py-0.5 rounded-full flex-shrink-0">
           Cancelled
         </span>
```

### 2g. Status badges (Now, Next, Event) — type size, drop uppercase
```
FIND (Now on class):   className="text-[10px] font-bold uppercase tracking-wider text-white bg-forest-600 dark:bg-forest-500 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-white bg-forest-600 dark:bg-forest-500 px-1.5 py-0.5 rounded-full flex-shrink-0"

FIND (Next on class):  className="text-[10px] font-bold uppercase tracking-wider text-forest-600 bg-forest-50 dark:bg-forest-900/30 dark:text-forest-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-forest-600 bg-forest-50 dark:bg-forest-900/30 dark:text-forest-400 px-1.5 py-0.5 rounded-full flex-shrink-0"

FIND (Now on event):   className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"

FIND (Next on event):  className="text-[10px] font-bold uppercase tracking-wider text-forest-600 bg-forest-50 dark:bg-forest-900/30 dark:text-forest-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-forest-600 bg-forest-50 dark:bg-forest-900/30 dark:text-forest-400 px-1.5 py-0.5 rounded-full flex-shrink-0"

FIND (Event badge):    className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"

FIND (Event badge tomorrow): className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
REPLACE:               className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0"
```

**Verify:** `npm run build` — no errors.

---

## Task 3: Dark mode warmth (index.css)

**Files:**
- Modify: `src/index.css`

**Change:** Add a `.dark` override block that gives the dark background a slight warm cast and replaces near-invisible borders with opacity-based ones.

Find the existing dark background rule (look for `html.dark` or `.dark` selector with background-color). Add after the existing `:root` block:

```css
/* Dark mode warmth overrides */
.dark {
  /* Slightly warm dark background — a hint of amber vs pure neutral */
  --color-blush-900: #1c1814;
  --color-blush-800: #252019;

  /* Borders: swap near-invisible color borders for opacity-based approach */
  /* Applied via Tailwind utilities in components — no change needed here */
}
```

Also find the `body` background rule and check if dark mode sets it. If there's a `html.dark { background-color: ... }` rule, update the value to `#1c1814`.

**Verify:** `npm run build` — no errors.

---

## Task 4: Me.tsx — slate/gray → blush, text size floor

**Files:**
- Modify: `src/pages/Me.tsx`

This is a large file (1706 lines). Make targeted replacements only:

### 4a. `getDoseInfo` function — gray status color
```
FIND:    return { status: 'Worn Off', color: 'bg-gray-400', percent: 10 };
REPLACE: return { status: 'Worn Off', color: 'bg-blush-300', percent: 10 };
```

### 4b. PRIORITY_COLORS — gray → blush
```
FIND:    none: 'text-gray-400 dark:text-blush-500',
REPLACE: none: 'text-blush-400 dark:text-blush-500',
```

### 4c. Global replace of off-palette slate/gray neutrals
These are scattered throughout. Do targeted `replace_all` passes:
- `text-slate-500` → `text-blush-500`
- `text-slate-600` → `text-blush-600`
- `text-slate-400` → `text-blush-400`
- `bg-slate-200` → `bg-blush-200`
- `bg-slate-700` → `bg-blush-700`
- `bg-slate-100` → `bg-blush-100`
- `hover:bg-slate-100` → `hover:bg-blush-100`
- `border-gray-200` → `border-blush-200`
- `text-gray-400` → `text-blush-400`
- `bg-gray-50` → `bg-blush-50`

**Note:** Do NOT replace `bg-gray-400` used in `getDoseInfo` — that was already handled in 4a. Check each replacement doesn't break semantic meaning (e.g. don't replace red/green/amber status colors — only replace neutral gray/slate).

**Verify:** `npm run build` — no errors.

---

## Task 5: Final build verification

```bash
cd /Users/dixxx/figgg && npm run build
```

Expected output: `✓ built in X.Xs` with zero TypeScript errors.

---

## Verification Checklist

- WeekStats Students stat uses forest color (not blue)
- WeekStats section labels are title case, readable at 12px
- TodaysAgenda "Today" / "Looking Ahead" header is title case
- Status badges (Now, Next, Event, Cancelled, Sub) are title case at text-xs
- Sub badge uses sage/forest tones (not teal)
- Time displays use tabular-nums for alignment
- "Current" class row has a bolder left border (border-l-4)
- Dark mode background has slight warmth
- Me.tsx meds/wellness UI uses blush neutrals (not slate/gray)
- `npm run build` passes clean
