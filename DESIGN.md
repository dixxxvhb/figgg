---
version: "alpha"
name: dx
description: Dixon's personal life-OS brand. Sibling to DWD (NOT a replacement). Terminal vibe — cobalt on near-black, Monaspace Neon/Argon, dry dark-humor voice. Scoped to life-OS tools only (Figgg, Curtain Up, Apple Music MCP, personal scripts). Never applied to DWD public surfaces.
colors:
  # ── Dark (default) ─────────────────────────────────────────────
  bg: "#0b0b0d"
  elevated: "#13131a"
  bg-dawn: "#0b0e18"
  bg-evening: "#0d0b0e"
  bg-night: "#08080a"

  # Cobalt accent (primary)
  accent: "#4F9DFF"
  accent-bright: "#7FB8FF"
  accent-dim: "#3E7DCC"

  # Status
  warn: "#FB923C"
  error: "#EF4444"

  # Text hierarchy
  text-1: "#FAFAFA"
  text-2: "#D4D4D4"
  text-3: "#A3A3A3"
  text-4: "#525252"

  # DWD handshake — 1px terracotta border on DWD-sourced tiles embedded in dx surfaces
  dwd-handshake: "#C8614B"

  # Tamara Mark (reserved — never used in dx chrome)
  tamara-gold: "#E2B955"

  # ── Light variant ──────────────────────────────────────────────
  # Applied when user toggles light mode. Cobalt darkens to #1E55B3
  # for WCAG AA contrast on white. Backgrounds warm slightly.
  light-bg: "#FAFAF8"
  light-elevated: "#FFFFFF"
  light-bg-dawn: "#FFF8EC"
  light-bg-evening: "#FDF1EA"
  light-bg-night: "#F0EEEC"
  light-accent: "#1E55B3"          # WCAG AA on white (5.8:1)
  light-accent-bright: "#4F9DFF"   # reserved for hover/active
  light-accent-dim: "#3730A3"
  light-text-1: "#0B0B0D"
  light-text-2: "#262626"
  light-text-3: "#525252"
  light-text-4: "#A3A3A3"
  light-tamara-gold: "#B8973C"
  light-warn: "#CA6510"
  light-error: "#B91C1C"

accent-presets:
  # User-pickable accent-hue presets. Cobalt family only — brand integrity.
  # Each preset swaps `accent`/`accent-bright`/`accent-dim`/`light-accent`.
  # Default: cobalt.
  cobalt:
    base: "#4F9DFF"
    bright: "#7FB8FF"
    dim: "#3E7DCC"
    on-light: "#1E55B3"
  azure:
    base: "#3B82F6"
    bright: "#60A5FA"
    dim: "#2563EB"
    on-light: "#1D4ED8"
  ultramarine:
    base: "#6366F1"
    bright: "#818CF8"
    dim: "#4F46E5"
    on-light: "#3730A3"
  periwinkle:
    base: "#8B9DFF"
    bright: "#B4BEFF"
    dim: "#6875E0"
    on-light: "#4B56B3"
  teal-cobalt:
    base: "#4FC1FF"
    bright: "#7FD4FF"
    dim: "#3EA7CC"
    on-light: "#1E73B3"

  # Semantic roles
  primary: "{colors.accent}"
  secondary: "{colors.text-3}"
  tertiary: "{colors.warn}"
  neutral: "{colors.text-1}"
  surface: "{colors.bg}"
  surface-elevated: "{colors.elevated}"
  on-surface: "{colors.text-1}"
  on-surface-muted: "{colors.text-3}"
  on-accent: "{colors.bg}"
  on-error: "{colors.text-1}"

typography:
  # Monaspace variable-axis config:
  #   fontVariation "MONO" axis toggles between grotesque (Neon) and humanist (Argon)
  #   "CASL" adds cursive forms, "slnt" is slant
  headline-lg:
    fontFamily: "Monaspace Neon"
    fontWeight: "600"
    fontSize: 1.5rem
    lineHeight: 1.2
    letterSpacing: "0.01em"
    fontVariation: "'MONO' 0, 'CASL' 0, 'slnt' 0"
  headline-md:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 1.125rem
    lineHeight: 1.3
  headline-sm:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 1rem
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body-md:
    fontFamily: "Monaspace Argon"
    fontWeight: "400"
    fontSize: 0.875rem
    lineHeight: 1.5
    fontVariation: "'MONO' 1, 'CASL' 0"
  body-sm:
    fontFamily: "Monaspace Argon"
    fontWeight: "400"
    fontSize: 0.8125rem
    lineHeight: 1.5
  label-lg:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 0.75rem
    letterSpacing: "0.12em"
    lineHeight: 1.2
  label-md:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 0.6875rem
    letterSpacing: "0.15em"
    lineHeight: 1.2
  label-sm:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 0.625rem
    letterSpacing: "0.18em"
    lineHeight: 1.2
  number:
    fontFamily: "Monaspace Neon"
    fontWeight: "500"
    fontSize: 1.5rem
    fontFeature: "'tnum' 1"
    lineHeight: 1
  wordmark:
    fontFamily: "Monaspace Neon"
    fontWeight: "600"
    fontSize: 1.25rem
    letterSpacing: "0.02em"

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 32px
  xxl: 56px

rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
  full: 9999px

components:
  tile:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.body-md}"
  tile-hover:
    backgroundColor: "#1a1a22"
  tile-dwd:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.body-md}"

  zone-label:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"

  status-dot:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-offline:
    backgroundColor: "{colors.error}"
  status-dot-warn:
    backgroundColor: "{colors.warn}"

  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: 8px
    typography: "{typography.label-lg}"
  button-primary-hover:
    backgroundColor: "#13131a"
    textColor: "{colors.accent-bright}"

  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 8px
    typography: "{typography.body-md}"
  input-focus:
    backgroundColor: "#1a1a22"
---

## Overview

**dx** is Dixon's personal life-OS brand. It is a **sibling** to DWD (Dance With Dixon), not a replacement and not a child brand. DWD stays theatrical (forest green, terracotta, Cormorant). dx stays **terminal** (cobalt on near-black, Monaspace).

They co-exist on one screen. When a DWD-sourced tile is embedded inside a dx surface (like Curtain Up showing a business data tile), that tile wears a 1px terracotta bottom border and its cluster label reads `// business · dwd`. That's the only visual acknowledgement — the two systems don't blend.

## Colors

A cool, quiet palette built to live in a terminal window.

- **Primary — Cobalt (#4F9DFF):** accent for numbers, labels, status, "now" highlights. One accent, used sparingly.
- **Surface — Near-black (#0b0b0d):** body background. Slightly cool.
- **Elevated — (#13131a):** tiles and panels sit one step up.
- **Warn — (#FB923C):** amber urgency — overdue, stale daemon.
- **Error — (#EF4444):** daemon offline, credentials missing, hard fail.
- **Text 1/2/3/4:** `#FAFAFA / #D4D4D4 / #A3A3A3 / #525252` — primary / body / label / status-bar.
- **DWD handshake — Terracotta (#C8614B):** 1px bottom border on DWD-sourced tiles embedded in dx. This is the only place terracotta appears in dx.
- **Tamara gold (#E2B955):** reserved for the Tamara Mark wherever it appears. Never used in dx chrome.

## Typography

Monaspace variable fonts, two families from the same superfamily.

- **Monaspace Neon** — headers, labels, numbers, wordmark. Neo-grotesque, clinical.
- **Monaspace Argon** — body prose, briefing text, schedule. Humanist, warmer.
- Fallback stack: `"IBM Plex Mono", Monaco, monospace`.

The `fontVariation` token on each scale pins the Monaspace variable axes (`MONO` for grotesque↔humanist, `CASL` for cursive, `slnt` for slant). `number` scale uses `fontFeature: "'tnum' 1"` for tabular numerals so digits align.

Font woff2 files live at `~/Library/Application Support/Übersicht/widgets/curtain-up.widget/assets/fonts/`. In Übersicht WebKit, fonts must load via `file://` absolute URI — relative paths don't resolve. URL-encode spaces as `%20` and Ü as `%C3%9C`.

## Layout

Tight grid — 4/8/12/20/32px scale. Denser than DWD because the aesthetic is a terminal/dashboard, not a marketing surface.

Zone labels use the `// <name>` pattern — reads like a code comment. `label-sm` typography, uppercased, generous letter-spacing.

## Elevation & Depth

**Flat, not shadowed.** Depth comes from two surface tiers (`bg` / `elevated`) plus a cobalt border on active tiles. No drop shadows. No blur. A terminal doesn't have shadows.

## Shapes

**Sharp with small softening.** `rounded.sm` (2px) for tiles — just enough to not feel brutalist. `rounded.md` (4px) for buttons and inputs. Status dots go `rounded.full`.

## Components

- **tile** — the atomic dx surface. Two variants: default and `tile-dwd` (terracotta bottom border for embedded DWD data).
- **zone-label** — the `// name` code-comment-style section header.
- **status-dot** — online/offline/warn states, via color swaps.
- **button-primary** — transparent by default, cobalt text, hovers with subtle tile-color fill.
- **input** — elevated surface, cobalt focus ring.

## Ambient Theming

Only border opacity and accent saturation shift by time of day. Layout never changes.

| Window | Border | Accent | Bg |
|---|---|---|---|
| 05:00–09:00 dawn | cobalt 35% | `#7FB8FF` | `#0b0e18` |
| 09:00–17:00 day | cobalt 25% | `#4F9DFF` | `#0b0b0d` |
| 17:00–22:00 evening | cobalt 20% | `#4F9DFF` | `#0d0b0e` |
| 22:00–05:00 night | cobalt 15% | `#3E7DCC` | `#08080a` |

## Voice

Dry. Dark humor. Facts first. Empty states and errors get teeth.

## Do's and Don'ts

**Do:**
- Do write errors and empty states with teeth: "no mood logged. were you even here." / "daemon's not picking up. probably fine. retrying."
- Do use lowercase everywhere by default, including labels.
- Do use UPPERCASE only for status flags: `OFFLINE`, `OVERDUE`.
- Do format zone labels like code comments: `// today`, `// now`, `// pulse`, `// business · dwd`.
- Do honor the Tamara Mark when it appears — gold stays gold.

**Don't:**
- Don't use exclamation points.
- Don't use emojis (Figgg's mood picker is the one exception, and that's a Figgg-owned call).
- Don't use corporate optimism. "Great job!" has no place here.
- Don't apply dx to any DWD public surface — website, parent portal, marketing, social. DWD public surfaces use DWD brand exclusively.
- Don't use drop shadows or blur effects. Terminals don't have shadows.
- Don't use gold or rose gold in dx chrome — that's strictly for the Tamara Mark.

## The Mark

The dx wordmark is two letters, lowercase: `dx`. No explanation.

The signature mark is `dx/` — trailing slash, folder-native, with a blinking cursor on the slash. It lives in the footer of every dx surface.

## Scope

dx is scoped to **life-OS tools only**: Figgg, Curtain Up, Apple Music MCP, personal scripts and terminal tools.

**Never apply dx to any DWD-facing surface** — website, parent portal, marketing, social posts. DWD public surfaces use the DWD brand system exclusively.

## Spec

Full dx design spec: `~/.claude/plans/drifting-orbiting-comet.md` (established 2026-04-23).
