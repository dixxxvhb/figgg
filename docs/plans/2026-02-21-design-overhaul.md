# Figgg Design & Aesthetics Overhaul

**Date:** 2026-02-21
**Status:** Approved
**Author:** Dixon + Claude

## Vision

Warm editorial aesthetic — a beautifully designed dance magazine that became an interactive pocket tool. Clean typography that breathes, warm sophistication, editorial confidence, handcrafted feel, visual rhythm echoing movement through space.

## Decisions

- **Fonts:** Keep Fraunces (serif display) + Inter (sans body). Refine scale and usage discipline.
- **Color architecture:** Add semantic token layer on top of existing forest/blush/pop scales. Themes map tokens differently for personality.
- **Scope:** Full redesign — tokens, components, every screen, motion system.
- **Execution order:** Foundation (tokens/type/color) → Components → Screens → Polish

---

## Layer 1: Typography System

| Level | Font | Weight | Size | Line-Height | Letter-Spacing | Transform | Use |
|-------|------|--------|------|-------------|----------------|-----------|-----|
| Display | Fraunces | 600 | 28px / 1.75rem | 1.2 | -0.02em | none | Dashboard greeting, page hero |
| H1 | Fraunces | 600 | 22px / 1.375rem | 1.3 | -0.01em | none | Section headers |
| H2 | Inter | 600 | 17px / 1.0625rem | 1.35 | 0 | none | Card titles |
| H3 | Inter | 600 | 13px / 0.8125rem | 1.4 | 0.05em | uppercase | Sub-labels |
| Body | Inter | 400 | 15px / 0.9375rem | 1.6 | 0 | none | Content text |
| Caption | Inter | 500 | 13px / 0.8125rem | 1.4 | 0.01em | none | Metadata |
| Label | Inter | 600 | 11px / 0.6875rem | 1.3 | 0.04em | uppercase | Chips, badges |
| Stat | Fraunces | 700 | 32px / 2rem | 1.1 | -0.02em | none | Dashboard numbers |

Font size settings: Normal 15px, Large 17px, Extra-large 19px (all rem-based).
Stats use `font-variant-numeric: tabular-nums` for alignment.

---

## Layer 2: Semantic Color Tokens

### Token Definitions

```
/* Surfaces */
--surface-primary           /* Main page background */
--surface-card              /* Card backgrounds */
--surface-card-hover        /* Card hover state */
--surface-inset             /* Nested/recessed areas */
--surface-elevated          /* Modals, popovers */
--surface-highlight         /* Selected/active items */

/* Text */
--text-primary              /* Main body text */
--text-secondary            /* Metadata, captions */
--text-tertiary             /* Placeholders, disabled */
--text-on-accent            /* Text on accent bg */

/* Accent */
--accent-primary            /* Buttons, active nav */
--accent-primary-hover      /* Hover state */
--accent-secondary          /* Secondary actions */
--accent-muted              /* Subtle accent tint (bg) */

/* Borders */
--border-subtle             /* Card borders, dividers */
--border-strong             /* Focus, active states */

/* Status */
--status-success
--status-warning
--status-danger

/* Elevation */
--shadow-card
--shadow-elevated

/* Radius */
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-full: 9999px
```

### Theme Token Mappings

**Soft Stone (default):**
- surface-primary = blush-50 (warm cream)
- surface-card = white
- text-primary = warm charcoal (blush-900, not pure black)
- shadow-card = warm diffuse (0 1px 3px rgba(warm tone))
- Personality: afternoon light in a dance studio

**Ocean:**
- surface-primary = cool blue-gray tint
- accent-primary = teal-blue
- shadow-card = cooler tone
- Personality: calm before a performance, deep pool at golden hour

**Plum:**
- surface-primary = warm off-white with slight purple tint
- accent-primary = deep purple, accent-secondary = warm gold
- shadow-card = deeper/heavier for velvet depth
- Personality: velvet curtains backstage

**Midnight:**
- surface-primary = deep navy (not pure black)
- shadow-card = minimal (use borders instead)
- border-subtle = visible subtle glow
- Personality: dark theme done right for low light

**Clay:**
- surface-primary = warm stone
- shadow-card = minimal (matte feel, borders do the work)
- accent-primary = warm red-brown
- Personality: ceramics studio, earthy and grounded

**Dusk:**
- surface-primary = warm gray with subtle pink
- accent-primary = dusty rose
- shadow-card = soft, romantic
- Personality: studio at sunset, romantic not saccharine

**Pride:**
- Most vibrant theme, joyful but functional
- Accent colors rotate or use gradient touches
- shadow-card = warm and present

**Dance (DWDC):**
- surface-primary = warm with forest green accents
- accent-primary = deep green, accent-secondary = hot pink
- Personality: the "signature" theme, stage-lighting warmth

**Neon:**
- surface-primary = near-black
- accent-primary = electric lime/coral
- shadow-card = neon glow effect
- Personality: competition stage with spotlights, bold and electric

**Dark mode:** Modifier on each theme, not its own theme. Every theme gets a dark variant preserving personality.

---

## Layer 3: Card & Container System

| Variant | Background | Border | Shadow | Radius | Padding | Use |
|---------|-----------|--------|--------|--------|---------|-----|
| Standard | surface-card | 1px border-subtle | shadow-card | radius-md | 16px | Default container |
| Elevated | surface-card | 1px border-subtle | shadow-card + stronger | radius-md | 16px | Tappable items |
| Inset | surface-inset | 1px border-subtle | none | radius-sm | 12px | Nested content |
| Highlight | surface-card | 3px left accent/warning | shadow-card | radius-md | 16px | Time-sensitive |
| Stat | surface-card + accent-muted tint | 1px border-subtle | shadow-card | radius-md | 16px | Numbers |
| Modal | surface-elevated | none | shadow-elevated | radius-lg (top on mobile) | 20px | Overlays |

### Interactions
- Tap: scale(0.98) 100ms ease-out
- Hover (elevated): shadow increase + border to border-strong
- List entrance: stagger fade-in, 30ms gap, 200ms each item
- Completion exit: opacity→0 + translateY(-8px) 250ms

---

## Layer 4: Motion System

### Timing Variables
```
--duration-instant: 100ms
--duration-fast: 150ms
--duration-normal: 250ms
--duration-slow: 400ms
--duration-page: 300ms
--ease-default: cubic-bezier(0.25, 0.1, 0.25, 1)
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--stagger-gap: 30ms
```

### Interaction Map
| Interaction | Duration | Easing | Effect |
|-------------|----------|--------|--------|
| Button press | instant | ease-out | scale(0.98) |
| Card hover | fast | ease-out | shadow + border shift |
| Page transition | page | ease-default | fade + translateY(8→0) |
| List stagger | normal each, stagger-gap | ease-out | opacity + translateY(12→0) |
| Task complete | normal | ease-spring | check fill + strike + fade |
| Modal enter | 350ms | ease-spring | slide up + backdrop fade |
| Modal exit | 200ms | ease-in | slide down + backdrop |
| Theme switch | slow | ease-in-out | crossfade on :root |
| Progress ring | 700ms | ease-out | stroke-dashoffset |
| Stat count-up | 600ms | ease-out | number 0→value |
| Skeleton pulse | 1.5s loop | ease-in-out | opacity 0.4↔0.8 |

---

## Layer 5: Screen-by-Screen Specs

### Dashboard
- **Hero:** Display level greeting + Caption date (uppercase, wide tracking). 32px top, 16px gap, 24px before widgets.
- **Quick Glance:** 2x2 Stat card grid. Numbers: Stat level, animate count-up. Labels: Label level.
- **Today's Agenda:** H1 section header with horizontal rule. Class cards: Elevated + 3px studio-color left border. Calendar events: Standard + amber left border + calendar icon. Travel cards: Inset + car icon. Live: Highlight + pulsing amber border + LIVE badge.
- **Week Momentum:** Stat level percentage + 3px stroke progress ring (700ms).
- **Weekly Stats:** Horizontal scroll Stat cards with dividers.
- **Weekly Insight:** Inset card, accent-muted left border, Fraunces italic text (pull-quote style).
- **Widget edit mode:** Dashed borders, grip handles, eye toggles, 250ms transitions.

### Navigation
- **Mobile bottom:** 6 items. Active: filled icon + accent-primary + 3px×20px pill bg (accent-muted) + bold label. Inactive: text-tertiary. 1px top border.
- **Desktop top:** FIG wordmark (Fraunces 700, 20px). Active: accent-primary + 2px underline (20px centered). Inactive: text-secondary.
- **Sync indicator:** Quiet when synced. Spinner during sync. Amber pulse on fail.
- **Page transitions:** 300ms crossfade + translateY(8→0).

### Schedule + Class Detail
- **Day pills:** Active = accent-primary bg + white text + subtle shadow. Dots: 4px (green/amber/purple).
- **Class cards:** Elevated + 3px studio-color left border. Time (Caption), name (H2), count (Label pill).
- **Class Detail header:** Replace harsh pink banner with 4px top border in studio color + studio pill.
- **Section headers:** H3 (uppercase, tracking) + 1px rule below.
- **Lesson text:** Body level, 20px padding, 16px between sections.
- **Collapsible:** Chevron rotate 200ms, content height+opacity 250ms.
- **Attendance bar:** Inset card, three Stat cells (green/amber/red).

### Students
- **Search:** surface-inset bg, radius-sm, 44px height. Focus: border-strong + shadow.
- **Filter pills:** Active = accent-primary bg. Inactive = surface-card, border-subtle. Count: " · 12".
- **Letter groups:** H3 + 1px rule, 24px top margin.
- **Avatars:** 40px, name-hashed gradient backgrounds with white initials (8 gradient combos).
- **Student cards:** Elevated. Name (H2) + nickname (Caption). Badges: Label pills (max 3, +N overflow).
- **Detail modal:** Slide-up (mobile), center (desktop). Name: Display level. Contact: Inset card + icon buttons. Notes: timeline-style layout.

### Tasks / Reminders
- **Filter/list pills:** Same pattern as class filter pills.
- **Task items:** Standard compact card. Custom 20px circle checkbox. Checked: accent-primary fill + white check (spring 150ms). Text: Body, checked = strike + tertiary + 50% (250ms).
- **Add input:** Bottom, surface-inset, 44px. Focus: elevate to surface-card + shadow.
- **Completed:** 60% opacity section, collapsible.
- **Completion sequence:** checkbox fills (150ms) → strike (100ms after) → fade (150ms after) → reorder (300ms).

### Me / Wellness
- **Dose cards:** Highlight + 3px accent left border. "Take Now": primary button full-width. Taken state: surface-highlight, green check, 80% opacity.
- **Effectiveness bar:** 4px horizontal, gradient from tertiary→warning→accent→warning→tertiary with 12px circle indicator.
- **Wellness sections:** H1 headers with time-of-day bg tint (5% opacity gradients). Items: Inset card, 20px checkboxes. Checked = icon shifts to accent-primary (encouraging, not crossed-out).
- **Progress counter:** "3 of 9" Fraunces numbers, accent-primary when all done.
- **Skip button:** Ghost, text-tertiary, small, unobtrusive.

### DWDC Launch
- **Countdown:** Highlight card, accent-primary left border, pulsing. Number: Stat level.
- **Tab switcher:** Filter pill pattern, accent-primary active.
- **Category badges:** Label pills (BIZ=forest, CONTENT=pop, DECIDE=amber, ADULT=blush, PRO=purple, PREP=teal).
- **Task cards:** Elevated. Done=primary button, Skip=ghost.
- **Progress:** 8px full-width bar + Stat level "13 of 124" + per-category mini-bars.
- **Decision cards:** Standard + dashed border (distinct from tasks). Clock icon for deadlines.

### Settings
- **Teaching Tools:** Elevated cards with icon + H2 title + Caption count.
- **Theme selector:** 48px circles, Label name below, active: ring-2 accent-primary + scale(1.1). Live preview on tap (400ms crossfade).
- **Font size:** Preview sentence at each size (not just "Aa").
- **Studios:** Standard cards, 12px studio color dot + name (H2) + address (Caption).
- **Data stats:** 3×2 Stat card grid.
- **Version:** "FIGGG v1.0" Fraunces italic, 13px, text-tertiary, centered. Signature feel.

### Empty States
All empty states: icon (48px, text-tertiary), message (H2, text-secondary), sub-message (Body, text-tertiary, max-width 280px), optional CTA (secondary button).

### Edge Cases
- **Offline:** Subtle amber pill in header (not full-width banner).
- **Sync states:** Quiet (synced), spinner (syncing), amber pulse (failed).
- **Skeleton loading:** Card-shaped blocks, surface-inset, pulse 1.5s.

---

## Implementation Order

1. Design tokens (index.css + themes.ts semantic layer)
2. Typography utilities (CSS classes for each type level)
3. Theme token mappings (all 8 themes × light/dark)
4. Card component variants
5. Button/input/pill refinements
6. Motion system (CSS variables + transition utilities)
7. Navigation redesign
8. Dashboard
9. Schedule + Class Detail
10. Students
11. Tasks/Me
12. DWDC Launch
13. Settings
14. Empty states + edge cases
15. Mobile polish pass
