# FIG Design Overhaul — "Bold Editorial"

> **Direction:** Bold editorial aesthetic, deep & rich palette, full reimagining
> **Approved:** 2026-02-23

## Vision

Transform figgg from a functional but generic app into a bold editorial experience — strong typographic hierarchy, deep rich surfaces, intentional contrast between content types. Every screen should feel like a well-designed magazine page, not a dashboard template.

Incorporates Cowork changes (mood layer, CSS migration, micro-animations) as part of the unified overhaul.

## 1. Color Palette — "Ink & Gold"

### Light Mode
- `--surface-primary`: `#f7f6f3` (cool ivory)
- `--surface-card`: `#ffffff`
- `--surface-inset`: `#f0eeeb`
- `--text-primary`: `#121108` (deep ink)
- `--text-secondary`: `#64615c`
- `--text-tertiary`: `#9c9891`
- `--accent-primary`: `#a0782c` (burnished gold)
- `--accent-primary-hover`: `#c49536`
- `--accent-secondary`: `#1a2332` (deep ink)
- `--accent-muted`: `#f5f0e6` (warm gold wash)
- `--border-subtle`: `#e8e6e1`

### Dark Mode
- `--surface-primary`: `#0f1117` (deep navy-black)
- `--surface-card`: `#171b24` (navy-tinted lift)
- `--surface-inset`: `#0c0e14`
- `--text-primary`: `#e8e4df` (warm off-white)
- `--accent-primary`: `#d4a843` (brighter gold)
- `--accent-muted`: `rgba(164,120,44,0.12)`
- `--border-subtle`: `#252a35`

## 2. Typography — Editorial Hierarchy

| Class | Before | After |
|-------|--------|-------|
| `.type-display` | 1.75rem/600 | 2.25rem/700, -0.03em |
| `.type-h1` | 1.375rem/600 | 1.5rem/700, -0.02em |
| `.type-h2` | Inter 1.0625rem/600 | Fraunces 1.0625rem/600 |
| `.type-stat` | 2rem/700 | 2.5rem/800 |
| NEW `.type-widget-title` | — | Fraunces 0.9375rem/600 |

Key: Fraunces display font used more aggressively. Tighter letter-spacing on display sizes.

## 3. Layout & Spacing

- Widget spacing: `space-y-6` → `space-y-8`
- Greeting area gets `mood-ambient-glow`
- Card hierarchy: Hero (ring+glow) > Primary (standard card, Fraunces titles) > Secondary (no border, bg difference only) > Inset (thin borders, reduced opacity)
- Card borders softened: `/60` and `/40` opacity

## 4. Micro-Animations (from Cowork)

- Widget stagger-in: 50ms cascade, translateY(16px)→0 + opacity
- Day plan check-off: scale 1→1.05→0.98 + opacity fade
- Streak pulse: scale(1.08) on new high via spring easing
- Progress ring: 24px SVG ring on DayPlanWidget header
- All respect `prefers-reduced-motion`

## 5. Mood Layer (from Cowork)

New `moodLayer.ts` — mood-responsive CSS variable overlay:
- Mood (strongest): stressed→amber, tired→lavender, anxious→green, energized→gold, focused→blue
- Time of day (secondary): morning warm → midday neutral → evening cool
- Activity (adjustments): teaching→minimal chrome, done→calm
- Cached in sessionStorage, resets daily
- Falls back gracefully — no mood = no change

## 6. CSS Variable Migration (from Cowork)

Components migrated from hardcoded `blush-*/forest-*` to semantic tokens:
- AICheckInWidget, DayPlanWidget, EventCountdown, SortableWidget, StreakCard, Card, App.tsx, Dashboard.tsx

## 7. Theme Rebuilds

All 9 themes rebuilt with editorial DNA:
- Soft Stone → **Ink & Gold** (default)
- Ocean → **Deep Sea** (slate-blue, teal-cyan)
- Plum → **Velvet** (warm plum, hot pink)
- Midnight → **Obsidian** (cool gray, electric indigo)
- Clay → **Terracotta** (warm stone, burnt orange)
- Dusk → **Rosewood** (mauve, copper-rose)
- Pride → **Amethyst** (cream, deep violet)
- Dance With Dixon → **Studio** (forest green, blush pink, deeper)
- Neon → **Electric** (near-black, hot coral, lime)

Each keeps same token structure, new color values, mood layer compatible.

## 8. Not Changing

- Navigation structure (6 tabs)
- Widget reorder system (dnd-kit)
- Data layer (state, storage, sync, types)
- Route structure (18 routes)
- PWA/service worker
- Accessibility features
