# PWA Icon Redesign — Ink & Gold Editorial

> **Approved:** 2026-02-23

## Design

**Background:** `#0f1117` (deep navy-black, matches app dark mode surface)

**Typography:** "FIG" in Fraunces serif, weight 700, gold `#d4a843`, letter-spacing -0.03em. Centered.

**Accent:** Small gold dot below the "I" — subtle tittle detail carried from current icon.

**No ring border** — clean edges, let OS handle masking (rounded rect iOS/Mac, circle Android).

## Files

| File | Size | Purpose |
|------|------|---------|
| `icon-512.svg` | vector | Source file |
| `icon-512.png` | 512x512 | PWA install/splash |
| `icon-192.png` | 192x192 | PWA manifest |
| `apple-touch-icon.png` | 180x180 | iOS home screen |

## Manifest Updates

- `theme_color`: `#c2785a` -> `#0f1117`
- `background_color`: `#f5f0eb` -> `#0f1117`

## Not Changing

- Manifest structure, shortcuts, or metadata
- Service worker
- HTML link tags (paths stay the same)
