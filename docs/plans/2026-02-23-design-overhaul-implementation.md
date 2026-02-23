# FIG Design Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform figgg from generic app aesthetic to bold editorial design with deep & rich "Ink & Gold" palette, stronger typography, mood-responsive theming, and micro-animations.

**Architecture:** Palette and typography changes happen in CSS/theme files. Mood layer is a new TS module. Component changes are CSS class migrations. All 9 themes get rebuilt with new editorial DNA.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, CSS custom properties, Fraunces + Inter fonts

---

## Phase 1: Foundation — Palette, Typography, Mood Layer CSS

### Task 1: Update default theme colors + typography scale in index.css

**Files:**
- Modify: `src/index.css`

**What to do:**

1. Update the `@theme` block raw color scales for the default "Ink & Gold" palette:
   - `forest-*` scale: gold-based primary (50: `#faf8f0`, 100: `#f5f0e6`, 200: `#e8dcc4`, 300: `#d4c49a`, 400: `#c49536`, 500: `#a0782c`, 600: `#8a6825`, 700: `#6e5220`, 800: `#553f1a`, 900: `#3d2e14`)
   - `blush-*` scale: cool ivory neutrals (50: `#f7f6f3`, 100: `#f0eeeb`, 200: `#e8e6e1`, 300: `#d4d1cc`, 400: `#9c9891`, 500: `#64615c`, 600: `#4a4844`, 700: `#353330`, 800: `#1c1b19`, 900: `#121108`)
   - `pop-*` scale: deep ink accent (50: `#f0f2f5`, 100: `#d8dce5`, 200: `#b0b8c8`, 300: `#8892a8`, 400: `#5c6a82`, 500: `#3d4d66`, 600: `#2d3a50`, 700: `#1f2a3d`, 800: `#1a2332`, 900: `#0f1117`)

2. Update `:root` semantic CSS variables to match the new default palette (light mode values from design doc)

3. Update `html.dark` semantic variables (dark mode values from design doc)

4. Update typography classes:
   - `.type-display`: font-size `2.25rem`, font-weight `700`, letter-spacing `-0.03em`
   - `.type-h1`: font-size `1.5rem`, font-weight `700`, letter-spacing `-0.02em`
   - `.type-h2`: change font-family to `var(--font-display)` (Fraunces instead of Inter)
   - `.type-stat`: font-size `2.5rem`, font-weight `800`

5. Add mood layer CSS variable defaults (from Cowork) inside `:root`:
   ```css
   --mood-surface-tint: var(--surface-primary);
   --mood-accent-intensity: 1;
   --mood-shadow-intensity: 1;
   --mood-border-opacity: 1;
   --mood-ambient-glow: transparent;
   ```

6. Change `body` background-color from `var(--surface-primary)` to `var(--mood-surface-tint)`

7. Add new `.type-widget-title` class:
   ```css
   .type-widget-title {
     font-family: var(--font-display);
     font-weight: 600;
     font-size: 0.9375rem;
     line-height: 1.3;
     letter-spacing: -0.01em;
     color: var(--text-primary);
   }
   ```

8. Add all new animations from Cowork:
   - `widget-enter` keyframe + `.widget-stagger-in` with nth-child delays (50ms increments, up to 10 children)
   - `.mood-ambient-glow` with `::before` pseudo-element (radial gradient)
   - `check-off` keyframe + `.plan-item-completing` class
   - `streak-pulse` keyframe + `.streak-new-high` class
   - `ring-draw` keyframe + `.progress-ring-animate` class

9. Add `prefers-reduced-motion` rules for new animations (disable widget-stagger-in, mood-ambient-glow)

**Verify:** `npm run build` passes clean.

---

### Task 2: Create moodLayer.ts

**Files:**
- Create: `src/styles/moodLayer.ts`

**What to do:**

Create the file with the exact content from the Cowork paste. This includes:
- `MoodSignal` and `ActivityState` types
- `MoodLayerConfig` interface
- `MOOD_CONFIGS` presets (stressed, tired, low, anxious, energized, excited, focused)
- `getTimeOfDayTint()` function
- `getActivityAdjustment()` function
- `applyMoodLayer()` — main function that computes composite config and sets CSS custom properties
- `restoreMoodLayer()` — restore from sessionStorage on app init
- `clearMoodLayer()` — revert to base theme

**Verify:** `npm run build` passes clean.

---

## Phase 2: Theme Rebuilds

### Task 3: Rebuild default theme (Ink & Gold) in themes.ts

**Files:**
- Modify: `src/styles/themes.ts`

**What to do:**

Update the first theme entry (id: `'stone'`) to become "Ink & Gold":
- `name`: `'Ink & Gold'`
- `preview`: `{ primary: '#a0782c', neutral: '#9c9891', accent: '#1a2332' }`
- `colors.forest`: gold-based scale (same values as Task 1)
- `colors.blush`: cool ivory scale (same values as Task 1)
- `colors.pop`: deep ink scale (same values as Task 1)
- `semantics.light`: all values from design doc light mode section
- `semantics.dark`: all values from design doc dark mode section
- Shadows: use neutral warm tints `rgba(156,152,145,...)` for light, `rgba(0,0,0,...)` for dark

**Verify:** `npm run build` passes clean.

---

### Task 4: Rebuild Ocean → Deep Sea theme

**Files:**
- Modify: `src/styles/themes.ts`

**What to do:**

Update the Ocean theme to "Deep Sea":
- `name`: `'Deep Sea'`
- `preview`: `{ primary: '#0e7490', neutral: '#8293a8', accent: '#06b6d4' }`
- Surfaces: light = `#f6f8fa` (cool blue-gray ivory), dark = `#0c1220` (deep ocean navy)
- Cards: light = `#ffffff`, dark = `#141c2b`
- Accent primary: `#0e7490` (teal), dark mode `#22d3ee` (bright cyan)
- Accent muted: `#f0f9ff` (light), `rgba(14,116,144,0.12)` (dark)
- Text primary: `#0c1220` (light), `#e2e8f0` (dark)
- Border subtle: `#dfe4ea` (light), `#1e2d42` (dark)
- Keep teal-based forest scale, slate-blue blush scale, cyan pop scale — just deepen all dark mode surfaces

**Verify:** `npm run build` passes clean.

---

### Task 5: Rebuild remaining 7 themes

**Files:**
- Modify: `src/styles/themes.ts`

**What to do:**

Rebuild each theme following the editorial DNA pattern — deeper dark surfaces (navy/charcoal undertones), bolder accent contrast, warm off-white text in dark mode. Keep each theme's personality but apply the editorial treatment:

**Plum → Velvet:**
- Surfaces: light `#f9f6fa`, dark `#12101a` (deep plum-black)
- Accent: `#9333ea` (vivid purple), dark `#c084fc`
- Accent muted: `#f5f0ff`

**Midnight → Obsidian:**
- Surfaces: light `#f5f7fa`, dark `#0a0c14` (near-black with blue)
- Accent: `#4f46e5` (indigo), dark `#818cf8`
- Accent muted: `#eef2ff`

**Clay → Terracotta:**
- Surfaces: light `#f8f5f2`, dark `#161210` (warm dark brown)
- Accent: `#c2785a` (original terracotta — this theme preserves the old default feel)
- Accent muted: `#fdf5f0`

**Dusk → Rosewood:**
- Surfaces: light `#f9f6f7`, dark `#141012` (wine-dark)
- Accent: `#b4637a` (mauve-rose), dark `#d4929f`
- Accent muted: `#fdf2f4`

**Pride → Amethyst:**
- Surfaces: light `#f8f6f3`, dark `#110f18` (deep violet-black)
- Accent: `#7c3aed` (violet), dark `#a78bfa`
- Accent secondary: `#d97706` (golden highlight)
- Accent muted: `#f3f0ff`

**Dance With Dixon → Studio:**
- Surfaces: light `#f4f7f5`, dark `#0e1410` (deep forest)
- Accent: `#2d6a4f` (forest green), dark `#52b788`
- Keep blush-pink touches in highlight/muted
- Accent muted: `#f0f7f3`

**Neon → Electric:**
- Surfaces: light `#f5f5f5`, dark `#0a0a0a` (true black)
- Accent: `#f43f5e` (hot coral), dark `#fb7185`
- Accent secondary: `#84cc16` (lime)
- Accent muted: `#fff1f2`
- Maximum contrast in both modes

For each theme: update `name`, `preview`, `colors` (forest/blush/pop scales), and both `semantics.light` and `semantics.dark` with the full token set. Shadows should use each theme's neutral tint.

**Verify:** `npm run build` passes clean.

---

## Phase 3: Component CSS Migration + Micro-Interactions

### Task 6: Apply Cowork CSS migration to AICheckInWidget

**Files:**
- Modify: `src/components/Dashboard/AICheckInWidget.tsx`

**What to do:**

Apply all the CSS class changes from the Cowork diff. Every `blush-*`, `forest-*`, `dark:*` class gets replaced with semantic CSS variable equivalents. Exact changes are in the Cowork paste diff for this file.

**Verify:** `npm run build` passes clean.

---

### Task 7: Apply Cowork changes to DayPlanWidget (CSS + progress ring + animation)

**Files:**
- Modify: `src/components/Dashboard/DayPlanWidget.tsx`

**What to do:**

Apply the full Cowork diff for this file:
1. CSS migration: all hardcoded colors → semantic tokens
2. Add SVG progress ring in header (24px, stroke-dashoffset animated)
3. Add `justChecked` state for check-off animation
4. Add `handleToggle` wrapper with animation trigger
5. Add `plan-item-completing` class on checked items
6. Add `font-display` class on "Day Plan" title

**Verify:** `npm run build` passes clean.

---

### Task 8: Apply Cowork changes to EventCountdown, SortableWidget, StreakCard, Card, App.tsx

**Files:**
- Modify: `src/components/Dashboard/EventCountdown.tsx`
- Modify: `src/components/Dashboard/SortableWidget.tsx`
- Modify: `src/components/Dashboard/StreakCard.tsx`
- Modify: `src/components/common/Card.tsx`
- Modify: `src/App.tsx`

**What to do:**

Apply all Cowork diffs for these 5 files:
- **EventCountdown:** `forest-*` urgency colors → semantic tokens, simplify to single accent style
- **SortableWidget:** drag handle + label colors → semantic tokens
- **StreakCard:** add `streak-new-high` conditional class when current ≥ longest
- **Card.tsx:** soften border opacity to `/60` (standard, highlight) and `/40` (inset, stat)
- **App.tsx:** import + call `restoreMoodLayer()` in useEffect, semantic tokens on NotFound, wrapper div uses `var(--surface-primary)`

**Verify:** `npm run build` passes clean.

---

### Task 9: Apply Cowork changes to Dashboard.tsx (mood layer + layout)

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**What to do:**

Apply the Cowork diff for Dashboard:
1. Import `applyMoodLayer`, `MoodSignal`, `ActivityState` from moodLayer
2. Add `useEffect` that computes activityState and calls `applyMoodLayer(todayMood, hour, activityState)`
3. Change wrapper div background to `var(--mood-surface-tint)`
4. Add `mood-ambient-glow overflow-hidden` classes to greeting area
5. Add `font-display` to greeting subtitle
6. Change widget spacing from `space-y-6` to `space-y-8`
7. Wrap widget SortableContext children in `<div className="space-y-8 widget-stagger-in">` (conditionally, not in edit mode)

**Verify:** `npm run build` passes clean. Take screenshot to verify visual changes.

---

## Phase 4: Final Verification

### Task 10: Full build + visual verification

**Files:** None (verification only)

**What to do:**

1. Run `npm run build` — must pass clean
2. Start dev server, take screenshots of:
   - Dashboard (light mode)
   - Dashboard (dark mode) — toggle via browser devtools or preview_resize with colorScheme
   - Verify gold accent on date, greeting area ambient glow
   - Verify widget stagger animation on page load
   - Verify typography scale (display heading is larger/bolder)
3. Check console for errors
4. Commit all changes

---

## Quick Reference: What Changed Where

| File | What Changed |
|------|-------------|
| `src/styles/moodLayer.ts` | **NEW** — mood-responsive CSS variable overlay |
| `src/index.css` | New palette, typography scale, mood vars, animations |
| `src/styles/themes.ts` | All 9 themes rebuilt with editorial DNA |
| `src/App.tsx` | Mood layer restore, semantic tokens |
| `src/pages/Dashboard.tsx` | Mood layer integration, ambient glow, spacing, stagger |
| `src/components/Dashboard/AICheckInWidget.tsx` | CSS migration |
| `src/components/Dashboard/DayPlanWidget.tsx` | CSS migration + progress ring + check animation |
| `src/components/Dashboard/EventCountdown.tsx` | CSS migration |
| `src/components/Dashboard/SortableWidget.tsx` | CSS migration |
| `src/components/Dashboard/StreakCard.tsx` | Streak pulse class |
| `src/components/common/Card.tsx` | Softer border opacity |
