# Figgg Design Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform figgg's visual identity into a warm editorial aesthetic — a dance magazine that became an interactive pocket tool.

**Architecture:** Add a semantic token layer on top of existing forest/blush/pop color scales. Refine the Fraunces + Inter type scale. Introduce card variants, a motion system, and then cascade those foundation changes through every screen.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, CSS custom properties, Vite

**Design doc:** `docs/plans/2026-02-21-design-overhaul.md`

**Source:** `/Users/dixxx/figgg/`

**No tests exist** — verify each task with `npm run build` in the figgg directory.

---

## Task 1: Semantic Token Layer — CSS Custom Properties

**Files:**
- Modify: `src/index.css`

**Context:** The app currently uses raw palette variables (forest-500, blush-200, etc.) directly in components. We're adding a semantic layer that maps these to purpose-based tokens. This lets themes change personality, not just color.

**Step 1: Add semantic tokens and motion variables to `:root` in index.css**

After the existing `:root` block (line 59-82), add these semantic tokens. Keep the existing `:root` properties — add below them in the same block:

```css
:root {
  /* ... existing forest/blush/pop aliases stay ... */

  /* ── Semantic Surfaces ── */
  --surface-primary: var(--color-blush-50);
  --surface-card: #ffffff;
  --surface-card-hover: var(--color-blush-100);
  --surface-inset: var(--color-blush-100);
  --surface-elevated: #ffffff;
  --surface-highlight: var(--color-forest-50);

  /* ── Semantic Text ── */
  --text-primary: var(--color-blush-900);
  --text-secondary: var(--color-blush-500);
  --text-tertiary: var(--color-blush-400);
  --text-on-accent: #ffffff;

  /* ── Accent ── */
  --accent-primary: var(--color-forest-600);
  --accent-primary-hover: var(--color-forest-500);
  --accent-secondary: var(--color-pop-600);
  --accent-muted: var(--color-forest-50);

  /* ── Borders ── */
  --border-subtle: var(--color-blush-200);
  --border-strong: var(--color-forest-400);

  /* ── Status ── */
  --status-success: #16a34a;
  --status-warning: #d97706;
  --status-danger: #dc2626;

  /* ── Elevation ── */
  --shadow-card: 0 1px 3px 0 rgba(168, 162, 158, 0.1), 0 1px 2px -1px rgba(168, 162, 158, 0.1);
  --shadow-elevated: 0 10px 15px -3px rgba(168, 162, 158, 0.15), 0 4px 6px -4px rgba(168, 162, 158, 0.1);
  --shadow-card-hover: 0 4px 6px -1px rgba(168, 162, 158, 0.12), 0 2px 4px -2px rgba(168, 162, 158, 0.1);

  /* ── Radius ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* ── Motion ── */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-page: 300ms;
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

**Step 2: Add dark mode semantic overrides**

After the `:root` block, add a `.dark` override block:

```css
html.dark {
  --surface-primary: var(--color-blush-900);
  --surface-card: var(--color-blush-800);
  --surface-card-hover: var(--color-blush-700);
  --surface-inset: var(--color-blush-900);
  --surface-elevated: var(--color-blush-800);
  --surface-highlight: color-mix(in srgb, var(--color-forest-900) 30%, var(--color-blush-800));

  --text-primary: var(--color-blush-100);
  --text-secondary: var(--color-blush-400);
  --text-tertiary: var(--color-blush-500);

  --accent-muted: color-mix(in srgb, var(--color-forest-900) 30%, transparent);

  --border-subtle: var(--color-blush-700);
  --border-strong: var(--color-forest-500);

  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.2);
  --shadow-elevated: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
  --shadow-card-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.25);
}
```

**Step 3: Update body to use semantic tokens**

Change the existing `body` selector (line 88-94):

```css
body {
  margin: 0;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--surface-primary);
  color: var(--text-primary);
}
```

And update the dark body (line 312-314):
```css
.dark body {
  background-color: var(--surface-primary);
}
```

**Step 4: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build, no errors.

**Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: add semantic token layer and motion variables to CSS"
```

---

## Task 2: Typography Utility Classes

**Files:**
- Modify: `src/index.css`

**Context:** Define CSS utility classes for each level in the type scale. Components will use these classes instead of ad-hoc Tailwind text sizes. This ensures consistency across the entire app.

**Step 1: Add typography utilities to index.css**

Add after the dark mode semantic overrides block:

```css
/* ── Typography Scale ── */
.type-display {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.75rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.type-h1 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.375rem;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.type-h2 {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 1.0625rem;
  line-height: 1.35;
  letter-spacing: 0;
  color: var(--text-primary);
}

.type-h3 {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.8125rem;
  line-height: 1.4;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.type-body {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 0.9375rem;
  line-height: 1.6;
  letter-spacing: 0;
  color: var(--text-primary);
}

.type-caption {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: 0.8125rem;
  line-height: 1.4;
  letter-spacing: 0.01em;
  color: var(--text-secondary);
}

.type-label {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.6875rem;
  line-height: 1.3;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.type-stat {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add typography scale utility classes"
```

---

## Task 3: Theme Semantic Token Mappings

**Files:**
- Modify: `src/styles/themes.ts`
- Modify: `src/styles/applyTheme.ts`

**Context:** Each theme needs to set semantic tokens differently. We add a `semantics` object to each ThemePalette that maps token names to values. The applyTheme function sets both raw palette values AND semantic overrides.

**Step 1: Add SemanticTokens interface and semantic mappings to themes.ts**

Add a new interface after `ThemePalette`:

```typescript
export interface SemanticTokens {
  '--surface-primary': string;
  '--surface-card': string;
  '--surface-card-hover': string;
  '--surface-inset': string;
  '--surface-elevated': string;
  '--surface-highlight': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-tertiary': string;
  '--text-on-accent': string;
  '--accent-primary': string;
  '--accent-primary-hover': string;
  '--accent-secondary': string;
  '--accent-muted': string;
  '--border-subtle': string;
  '--border-strong': string;
  '--status-success': string;
  '--status-warning': string;
  '--status-danger': string;
  '--shadow-card': string;
  '--shadow-elevated': string;
  '--shadow-card-hover': string;
}

export interface SemanticPair {
  light: SemanticTokens;
  dark: SemanticTokens;
}
```

Add `semantics` field to `ThemePalette`:

```typescript
export interface ThemePalette {
  id: string;
  name: string;
  preview: { primary: string; neutral: string; accent: string };
  special?: 'rainbow';
  colors: {
    forest: Record<string, string>;
    blush: Record<string, string>;
    pop: Record<string, string>;
  };
  semantics: SemanticPair;
}
```

Then add a `semantics` object to each theme in the array. Here are the mappings for each:

**Soft Stone:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#f5f0eb',       // blush-50
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#ede6de',     // blush-100
    '--surface-inset': '#ede6de',          // blush-100
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#fdf5f0',      // forest-50
    '--text-primary': '#1a1714',           // blush-900 (warm, not pure black)
    '--text-secondary': '#78716c',         // blush-500
    '--text-tertiary': '#a8a29e',          // blush-400
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#b0694d',         // forest-600
    '--accent-primary-hover': '#e08d60',   // forest-400
    '--accent-secondary': '#d97706',       // pop-600
    '--accent-muted': '#fdf5f0',           // forest-50
    '--border-subtle': '#e7e0d8',          // blush-200
    '--border-strong': '#e08d60',          // forest-400
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(168,162,158,0.1), 0 1px 2px -1px rgba(168,162,158,0.1)',
    '--shadow-elevated': '0 10px 15px -3px rgba(168,162,158,0.15), 0 4px 6px -4px rgba(168,162,158,0.1)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(168,162,158,0.12), 0 2px 4px -2px rgba(168,162,158,0.1)',
  },
  dark: {
    '--surface-primary': '#1a1714',
    '--surface-card': '#231f1a',
    '--surface-card-hover': '#44403c',
    '--surface-inset': '#1a1714',
    '--surface-elevated': '#231f1a',
    '--surface-highlight': 'rgba(90,53,43,0.3)',
    '--text-primary': '#ede6de',
    '--text-secondary': '#a8a29e',
    '--text-tertiary': '#78716c',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#e08d60',
    '--accent-primary-hover': '#edac87',
    '--accent-secondary': '#f59e0b',
    '--accent-muted': 'rgba(90,53,43,0.2)',
    '--border-subtle': '#44403c',
    '--border-strong': '#e08d60',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.2)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.25)',
  },
},
```

**Ocean:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#f8fafc',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f1f5f9',
    '--surface-inset': '#f1f5f9',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#f0fdfa',
    '--text-primary': '#0f172a',
    '--text-secondary': '#64748b',
    '--text-tertiary': '#94a3b8',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#0d7490',
    '--accent-primary-hover': '#2dd4bf',
    '--accent-secondary': '#0891b2',
    '--accent-muted': '#f0fdfa',
    '--border-subtle': '#e2e8f0',
    '--border-strong': '#2dd4bf',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(148,163,184,0.12), 0 1px 2px -1px rgba(148,163,184,0.1)',
    '--shadow-elevated': '0 10px 15px -3px rgba(148,163,184,0.18), 0 4px 6px -4px rgba(148,163,184,0.1)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(148,163,184,0.14), 0 2px 4px -2px rgba(148,163,184,0.1)',
  },
  dark: {
    '--surface-primary': '#0f172a',
    '--surface-card': '#1e293b',
    '--surface-card-hover': '#334155',
    '--surface-inset': '#0f172a',
    '--surface-elevated': '#1e293b',
    '--surface-highlight': 'rgba(19,78,74,0.3)',
    '--text-primary': '#f1f5f9',
    '--text-secondary': '#94a3b8',
    '--text-tertiary': '#64748b',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#2dd4bf',
    '--accent-primary-hover': '#5eead4',
    '--accent-secondary': '#22d3ee',
    '--accent-muted': 'rgba(19,78,74,0.2)',
    '--border-subtle': '#334155',
    '--border-strong': '#2dd4bf',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
  },
},
```

**Plum:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#fafafa',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f4f4f5',
    '--surface-inset': '#f4f4f5',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#faf5ff',
    '--text-primary': '#18181b',
    '--text-secondary': '#71717a',
    '--text-tertiary': '#a1a1aa',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#9333ea',
    '--accent-primary-hover': '#a855f7',
    '--accent-secondary': '#db2777',
    '--accent-muted': '#faf5ff',
    '--border-subtle': '#e4e4e7',
    '--border-strong': '#c084fc',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 4px 0 rgba(147,51,234,0.06), 0 1px 3px -1px rgba(0,0,0,0.08)',
    '--shadow-elevated': '0 12px 20px -4px rgba(147,51,234,0.1), 0 4px 8px -4px rgba(0,0,0,0.1)',
    '--shadow-card-hover': '0 4px 8px -1px rgba(147,51,234,0.08), 0 2px 4px -2px rgba(0,0,0,0.08)',
  },
  dark: {
    '--surface-primary': '#18181b',
    '--surface-card': '#27272a',
    '--surface-card-hover': '#3f3f46',
    '--surface-inset': '#18181b',
    '--surface-elevated': '#27272a',
    '--surface-highlight': 'rgba(88,28,135,0.3)',
    '--text-primary': '#f4f4f5',
    '--text-secondary': '#a1a1aa',
    '--text-tertiary': '#71717a',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#c084fc',
    '--accent-primary-hover': '#d8b4fe',
    '--accent-secondary': '#f472b6',
    '--accent-muted': 'rgba(88,28,135,0.2)',
    '--border-subtle': '#3f3f46',
    '--border-strong': '#c084fc',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
  },
},
```

**Midnight:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#f9fafb',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f3f4f6',
    '--surface-inset': '#f3f4f6',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#eef2ff',
    '--text-primary': '#111827',
    '--text-secondary': '#6b7280',
    '--text-tertiary': '#9ca3af',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#4f46e5',
    '--accent-primary-hover': '#6366f1',
    '--accent-secondary': '#0891b2',
    '--accent-muted': '#eef2ff',
    '--border-subtle': '#e5e7eb',
    '--border-strong': '#818cf8',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(107,114,128,0.1), 0 1px 2px -1px rgba(107,114,128,0.08)',
    '--shadow-elevated': '0 10px 15px -3px rgba(107,114,128,0.15), 0 4px 6px -4px rgba(107,114,128,0.08)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(107,114,128,0.12), 0 2px 4px -2px rgba(107,114,128,0.08)',
  },
  dark: {
    '--surface-primary': '#111827',
    '--surface-card': '#1f2937',
    '--surface-card-hover': '#374151',
    '--surface-inset': '#111827',
    '--surface-elevated': '#1f2937',
    '--surface-highlight': 'rgba(49,46,129,0.3)',
    '--text-primary': '#f3f4f6',
    '--text-secondary': '#9ca3af',
    '--text-tertiary': '#6b7280',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#818cf8',
    '--accent-primary-hover': '#a5b4fc',
    '--accent-secondary': '#22d3ee',
    '--accent-muted': 'rgba(49,46,129,0.2)',
    '--border-subtle': '#374151',
    '--border-strong': '#818cf8',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': 'none',
    '--shadow-elevated': '0 0 0 1px rgba(129,140,248,0.1), 0 10px 15px -3px rgba(0,0,0,0.3)',
    '--shadow-card-hover': '0 0 0 1px rgba(129,140,248,0.15)',
  },
},
```

**Clay:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#fafaf9',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f5f5f4',
    '--surface-inset': '#f5f5f4',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#fffbeb',
    '--text-primary': '#1c1917',
    '--text-secondary': '#78716c',
    '--text-tertiary': '#a8a29e',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#b45309',
    '--accent-primary-hover': '#f59e0b',
    '--accent-secondary': '#dc2626',
    '--accent-muted': '#fffbeb',
    '--border-subtle': '#e7e5e4',
    '--border-strong': '#fbbf24',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 0 0 1px rgba(168,162,158,0.15)',
    '--shadow-elevated': '0 0 0 1px rgba(168,162,158,0.2), 0 4px 6px -4px rgba(0,0,0,0.05)',
    '--shadow-card-hover': '0 0 0 1px rgba(168,162,158,0.25)',
  },
  dark: {
    '--surface-primary': '#1c1917',
    '--surface-card': '#292524',
    '--surface-card-hover': '#44403c',
    '--surface-inset': '#1c1917',
    '--surface-elevated': '#292524',
    '--surface-highlight': 'rgba(92,43,14,0.3)',
    '--text-primary': '#f5f5f4',
    '--text-secondary': '#a8a29e',
    '--text-tertiary': '#78716c',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#fbbf24',
    '--accent-primary-hover': '#fcd34d',
    '--accent-secondary': '#f87171',
    '--accent-muted': 'rgba(92,43,14,0.2)',
    '--border-subtle': '#44403c',
    '--border-strong': '#fbbf24',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 0 0 1px rgba(68,64,60,0.5)',
    '--shadow-elevated': '0 0 0 1px rgba(68,64,60,0.6), 0 4px 6px -4px rgba(0,0,0,0.2)',
    '--shadow-card-hover': '0 0 0 1px rgba(68,64,60,0.7)',
  },
},
```

**Dusk:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#faf8f7',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f3f0ee',
    '--surface-inset': '#f3f0ee',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#fdf2f8',
    '--text-primary': '#1c1917',
    '--text-secondary': '#78716c',
    '--text-tertiary': '#a8a29e',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#a3556e',
    '--accent-primary-hover': '#b85c82',
    '--accent-secondary': '#c46a1e',
    '--accent-muted': '#fdf2f8',
    '--border-subtle': '#e7e2de',
    '--border-strong': '#d4789d',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(163,85,110,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
    '--shadow-elevated': '0 10px 15px -3px rgba(163,85,110,0.1), 0 4px 6px -4px rgba(0,0,0,0.08)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(163,85,110,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  },
  dark: {
    '--surface-primary': '#1c1917',
    '--surface-card': '#292524',
    '--surface-card-hover': '#44403c',
    '--surface-inset': '#1c1917',
    '--surface-elevated': '#292524',
    '--surface-highlight': 'rgba(86,41,64,0.3)',
    '--text-primary': '#f3f0ee',
    '--text-secondary': '#a8a29e',
    '--text-tertiary': '#78716c',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#d4789d',
    '--accent-primary-hover': '#eba3c0',
    '--accent-secondary': '#f49d4c',
    '--accent-muted': 'rgba(86,41,64,0.2)',
    '--border-subtle': '#44403c',
    '--border-strong': '#d4789d',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.2)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.25)',
  },
},
```

**Pride:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#fdfbff',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#f5f0fb',
    '--surface-inset': '#f5f0fb',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#faf5ff',
    '--text-primary': '#1e1a2e',
    '--text-secondary': '#8878a8',
    '--text-tertiary': '#b8a8d8',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#8b5cf6',
    '--accent-primary-hover': '#a855f7',
    '--accent-secondary': '#d97706',
    '--accent-muted': '#faf5ff',
    '--border-subtle': '#ede4f7',
    '--border-strong': '#c084fc',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(139,92,246,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
    '--shadow-elevated': '0 10px 15px -3px rgba(139,92,246,0.1), 0 4px 6px -4px rgba(0,0,0,0.08)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(139,92,246,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  },
  dark: {
    '--surface-primary': '#1e1a2e',
    '--surface-card': '#2e2840',
    '--surface-card-hover': '#4a4260',
    '--surface-inset': '#1e1a2e',
    '--surface-elevated': '#2e2840',
    '--surface-highlight': 'rgba(91,33,182,0.3)',
    '--text-primary': '#f5f0fb',
    '--text-secondary': '#b8a8d8',
    '--text-tertiary': '#8878a8',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#c084fc',
    '--accent-primary-hover': '#d8b4fe',
    '--accent-secondary': '#fbbf24',
    '--accent-muted': 'rgba(91,33,182,0.2)',
    '--border-subtle': '#4a4260',
    '--border-strong': '#c084fc',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
  },
},
```

**Dance With Dixon (DWDC):**
```typescript
semantics: {
  light: {
    '--surface-primary': '#fdf2f8',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#fce7f3',
    '--surface-inset': '#fce7f3',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#f0fdf4',
    '--text-primary': '#500724',
    '--text-secondary': '#d946a0',
    '--text-tertiary': '#f472b6',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#166534',
    '--accent-primary-hover': '#22c55e',
    '--accent-secondary': '#db2777',
    '--accent-muted': '#f0fdf4',
    '--border-subtle': '#fbcfe8',
    '--border-strong': '#4ade80',
    '--status-success': '#16a34a',
    '--status-warning': '#d97706',
    '--status-danger': '#dc2626',
    '--shadow-card': '0 1px 3px 0 rgba(236,72,153,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
    '--shadow-elevated': '0 10px 15px -3px rgba(236,72,153,0.12), 0 4px 6px -4px rgba(0,0,0,0.08)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(236,72,153,0.1), 0 2px 4px -2px rgba(0,0,0,0.06)',
  },
  dark: {
    '--surface-primary': '#500724',
    '--surface-card': '#831843',
    '--surface-card-hover': '#9d174d',
    '--surface-inset': '#500724',
    '--surface-elevated': '#831843',
    '--surface-highlight': 'rgba(20,83,45,0.3)',
    '--text-primary': '#fce7f3',
    '--text-secondary': '#f472b6',
    '--text-tertiary': '#d946a0',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#4ade80',
    '--accent-primary-hover': '#86efac',
    '--accent-secondary': '#f472b6',
    '--accent-muted': 'rgba(20,83,45,0.2)',
    '--border-subtle': '#9d174d',
    '--border-strong': '#4ade80',
    '--status-success': '#22c55e',
    '--status-warning': '#f59e0b',
    '--status-danger': '#ef4444',
    '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
    '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
  },
},
```

**Neon:**
```typescript
semantics: {
  light: {
    '--surface-primary': '#f4f4f8',
    '--surface-card': '#ffffff',
    '--surface-card-hover': '#e8e8f0',
    '--surface-inset': '#e8e8f0',
    '--surface-elevated': '#ffffff',
    '--surface-highlight': '#fff1f3',
    '--text-primary': '#111118',
    '--text-secondary': '#4a4a65',
    '--text-tertiary': '#6b6b88',
    '--text-on-accent': '#ffffff',
    '--accent-primary': '#e11d48',
    '--accent-primary-hover': '#f43f5e',
    '--accent-secondary': '#84cc16',
    '--accent-muted': '#fff1f3',
    '--border-subtle': '#d0d0e0',
    '--border-strong': '#fb7185',
    '--status-success': '#84cc16',
    '--status-warning': '#f59e0b',
    '--status-danger': '#e11d48',
    '--shadow-card': '0 1px 3px 0 rgba(17,17,24,0.08), 0 1px 2px -1px rgba(17,17,24,0.06)',
    '--shadow-elevated': '0 10px 15px -3px rgba(17,17,24,0.12), 0 4px 6px -4px rgba(17,17,24,0.08)',
    '--shadow-card-hover': '0 4px 6px -1px rgba(17,17,24,0.1), 0 2px 4px -2px rgba(17,17,24,0.06)',
  },
  dark: {
    '--surface-primary': '#111118',
    '--surface-card': '#1c1c27',
    '--surface-card-hover': '#252535',
    '--surface-inset': '#111118',
    '--surface-elevated': '#1c1c27',
    '--surface-highlight': 'rgba(136,19,55,0.3)',
    '--text-primary': '#e8e8f0',
    '--text-secondary': '#6b6b88',
    '--text-tertiary': '#4a4a65',
    '--text-on-accent': '#111118',
    '--accent-primary': '#fb7185',
    '--accent-primary-hover': '#fda4af',
    '--accent-secondary': '#a3e635',
    '--accent-muted': 'rgba(136,19,55,0.2)',
    '--border-subtle': '#252535',
    '--border-strong': '#fb7185',
    '--status-success': '#a3e635',
    '--status-warning': '#fbbf24',
    '--status-danger': '#fb7185',
    '--shadow-card': '0 0 8px rgba(251,113,133,0.08), 0 1px 3px rgba(0,0,0,0.3)',
    '--shadow-elevated': '0 0 20px rgba(251,113,133,0.12), 0 10px 15px -3px rgba(0,0,0,0.4)',
    '--shadow-card-hover': '0 0 12px rgba(251,113,133,0.1), 0 4px 6px rgba(0,0,0,0.3)',
  },
},
```

**Step 2: Update applyTheme.ts to set semantic tokens**

Replace the entire file:

```typescript
import { getTheme } from './themes';

const THEME_MIGRATIONS: Record<string, string> = {
  forest: 'stone',
  sunset: 'clay',
  rose: 'dusk',
};

export function applyTheme(themeId: string, isDark: boolean = false): void {
  const resolvedId = THEME_MIGRATIONS[themeId] || themeId;
  const theme = getTheme(resolvedId);
  const root = document.documentElement;

  // Apply raw palette values (forest/blush/pop scales)
  for (const [scale, stops] of Object.entries(theme.colors)) {
    for (const [stop, hex] of Object.entries(stops)) {
      root.style.setProperty(`--color-${scale}-${stop}`, hex);
    }
  }

  // Apply semantic tokens for current mode
  const tokens = isDark ? theme.semantics.dark : theme.semantics.light;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}
```

**Step 3: Update applyTheme call sites to pass isDark**

Search for all calls to `applyTheme` in the codebase and add the `isDark` parameter. The call is likely in `App.tsx` and/or `Settings.tsx`. Find these and pass `document.documentElement.classList.contains('dark')` as the second argument.

**Step 4: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add src/styles/themes.ts src/styles/applyTheme.ts
git commit -m "feat: add per-theme semantic token mappings for light and dark modes"
```

---

## Task 4: Card Component Variants

**Files:**
- Modify: `src/components/common/Card.tsx`

**Context:** Replace the single Card component with a variant-based system supporting 6 types: standard, elevated, inset, highlight, stat, modal.

**Step 1: Rewrite Card.tsx with variants**

```typescript
import React from 'react';

type CardVariant = 'standard' | 'elevated' | 'inset' | 'highlight' | 'stat' | 'modal';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: CardVariant;
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  highlightColor?: string; // CSS color for highlight variant left border
  // Legacy prop support
  interactive?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  variant = 'standard',
  selected = false,
  padding = 'md',
  highlightColor,
  interactive = false,
}: CardProps) {
  // Determine effective variant — interactive prop maps to elevated for backwards compat
  const effectiveVariant = interactive && variant === 'standard' ? 'elevated' : variant;

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const variantStyles: Record<CardVariant, string> = {
    standard: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
    ].join(' '),
    elevated: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'transition-all',
      'duration-[var(--duration-fast)]',
      onClick ? 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--border-strong)] active:scale-[0.98]' : '',
    ].join(' '),
    inset: [
      'rounded-[var(--radius-sm)]',
      'border',
      'bg-[var(--surface-inset)]',
      'border-[var(--border-subtle)]',
    ].join(' '),
    highlight: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'border-l-[3px]',
    ].join(' '),
    stat: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--accent-muted)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'text-center',
    ].join(' '),
    modal: [
      'rounded-[var(--radius-lg)]',
      'bg-[var(--surface-elevated)]',
      'shadow-[var(--shadow-elevated)]',
    ].join(' '),
  };

  const selectedStyles = selected ? 'ring-2 ring-[var(--accent-primary)]' : '';

  const Component = onClick ? 'button' : 'div';

  const style: React.CSSProperties = {};
  if (effectiveVariant === 'highlight' && highlightColor) {
    style.borderLeftColor = highlightColor;
  } else if (effectiveVariant === 'highlight') {
    style.borderLeftColor = 'var(--accent-primary)';
  }

  return (
    <Component
      className={`${variantStyles[effectiveVariant]} ${selectedStyles} ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {children}
    </Component>
  );
}
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`
Expected: Clean build. Existing Card usage should still work — `interactive` prop is mapped to `elevated` variant.

**Step 3: Commit**

```bash
git add src/components/common/Card.tsx
git commit -m "feat: add 6 card variants (standard, elevated, inset, highlight, stat, modal)"
```

---

## Task 5: Button Refinement

**Files:**
- Modify: `src/components/common/Button.tsx`

**Context:** Update Button to use semantic tokens instead of raw palette colors.

**Step 1: Update Button variants to use semantic tokens**

Replace the `variants` object in Button.tsx:

```typescript
const variants = {
  primary: 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)] focus:ring-[var(--accent-primary)] shadow-sm hover:shadow',
  secondary: 'bg-[var(--surface-inset)] text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] focus:ring-[var(--border-subtle)] border border-[var(--border-subtle)]',
  ghost: 'text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] focus:ring-[var(--accent-primary)]',
  danger: 'bg-[var(--status-danger)] text-white hover:opacity-90 focus:ring-[var(--status-danger)]',
  success: 'bg-[var(--status-success)] text-white hover:opacity-90 focus:ring-[var(--status-success)]',
};
```

Also update `baseStyles` to use motion tokens:

```typescript
const baseStyles = 'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-all duration-[var(--duration-instant)] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:scale-[0.98]';
```

**Step 2: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`

**Step 3: Commit**

```bash
git add src/components/common/Button.tsx
git commit -m "refactor: update Button to use semantic design tokens"
```

---

## Task 6: Motion System — CSS Animations & Page Transitions

**Files:**
- Modify: `src/index.css`

**Context:** Update existing animations to use motion variables and add new utility classes for the motion system.

**Step 1: Update page-fade-in animation**

Replace the existing `@keyframes page-fade-in` and `.page-enter`:

```css
@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: page-fade-in var(--duration-page) var(--ease-default);
}
```

**Step 2: Add list stagger animation utility**

```css
/* Staggered list entrance */
@keyframes list-item-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stagger-in > * {
  opacity: 0;
  animation: list-item-in var(--duration-normal) var(--ease-out) forwards;
}

.stagger-in > *:nth-child(1) { animation-delay: 0ms; }
.stagger-in > *:nth-child(2) { animation-delay: 30ms; }
.stagger-in > *:nth-child(3) { animation-delay: 60ms; }
.stagger-in > *:nth-child(4) { animation-delay: 90ms; }
.stagger-in > *:nth-child(5) { animation-delay: 120ms; }
.stagger-in > *:nth-child(6) { animation-delay: 150ms; }
.stagger-in > *:nth-child(7) { animation-delay: 180ms; }
.stagger-in > *:nth-child(8) { animation-delay: 210ms; }
.stagger-in > *:nth-child(9) { animation-delay: 240ms; }
.stagger-in > *:nth-child(10) { animation-delay: 270ms; }
.stagger-in > *:nth-child(n+11) { animation-delay: 300ms; }

/* Skeleton loading pulse */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.skeleton {
  background-color: var(--surface-inset);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* Task completion fade */
.task-completing {
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
  opacity: 0;
  transform: translateY(-8px);
}

/* Theme transition — apply to :root when switching themes */
.theme-transitioning,
.theme-transitioning * {
  transition: background-color var(--duration-slow) ease-in-out,
              color var(--duration-slow) ease-in-out,
              border-color var(--duration-slow) ease-in-out,
              box-shadow var(--duration-slow) ease-in-out !important;
}
```

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: add motion system utilities (stagger, skeleton, theme transitions)"
```

---

## Task 7: Navigation Redesign

**Files:**
- Modify: `src/components/common/Header.tsx`

**Context:** Refine the mobile bottom nav active states and desktop top nav to use semantic tokens and the new editorial typography.

**Step 1: Update the Header component**

In the `Header` component, update the FIG wordmark:
- Change `text-lg` to `text-xl font-bold` (Fraunces 700, 20px)
- Change colors to use semantic tokens: `text-[var(--accent-primary)]`

In the desktop nav, update active/inactive styles:
- Active: `text-[var(--accent-primary)]` with a subtle bottom border indicator
- Inactive: `text-[var(--text-secondary)] hover:text-[var(--text-primary)]`

Update header background: `bg-[var(--surface-primary)]` and border: `border-[var(--border-subtle)]`

**Step 2: Update the MobileNav component**

Update active state to use pill background:
- Active icon: wrap in a subtle pill `bg-[var(--accent-muted)] rounded-full px-3 py-1`
- Active color: `text-[var(--accent-primary)]`
- Active label: `font-bold text-[var(--accent-primary)]`
- Inactive: `text-[var(--text-tertiary)]`

Update nav background: `bg-[var(--surface-primary)]/95` and border: `border-[var(--border-subtle)]`

**Step 3: Update SyncIndicator colors to semantic tokens**

- idle: `text-[var(--text-tertiary)]`
- syncing: `text-[var(--text-secondary)] animate-spin`
- success: `text-[var(--status-success)]`
- error: `text-[var(--status-danger)]`
- offline: `text-[var(--status-warning)]`

**Step 4: Update OfflineBanner**

Replace the full-width amber banner with a subtle pill in the header:
- Small pill: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--status-warning)]/10 text-[var(--status-warning)]`
- Use Label typography (11px uppercase)

**Step 5: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`

**Step 6: Commit**

```bash
git add src/components/common/Header.tsx
git commit -m "feat: redesign navigation with semantic tokens and editorial active states"
```

---

## Task 8: Dashboard Redesign

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/components/Dashboard/MorningBriefing.tsx`
- Modify: `src/components/Dashboard/TodaysAgenda.tsx`
- Modify: `src/components/Dashboard/WeekMomentumBar.tsx`
- Modify: `src/components/Dashboard/WeekStats.tsx`
- Modify: `src/components/Dashboard/WeeklyInsight.tsx`
- Modify: `src/components/Dashboard/StreakCard.tsx`
- Modify: `src/components/Dashboard/RemindersWidget.tsx`
- Modify: `src/components/Dashboard/LaunchPlanWidget.tsx`
- Modify: `src/components/Dashboard/ScratchpadWidget.tsx`

**Context:** The dashboard is the most-seen screen. Apply the editorial typography, semantic tokens, and card variants.

**Step 1: Dashboard.tsx — Hero area**

Update the greeting section:
- Greeting text: add `type-display` class (Fraunces 600, 28px)
- Date text: add `type-caption` class + `uppercase tracking-wider`
- Spacing: `pt-8 pb-4` (32px top, 16px bottom) before first widget, `space-y-6` between widgets (24px)

**Step 2: MorningBriefing.tsx — Quick Glance grid**

- Wrap in Card with `variant="standard"`
- Use `type-h1` for section header
- Inner stat cells: Card `variant="stat"` in a `grid grid-cols-2 gap-3`
- Numbers: `type-stat` class
- Labels: `type-label` class

**Step 3: TodaysAgenda.tsx**

- Section header: `type-h1` with a horizontal rule `<div className="flex items-center gap-3"><h2 className="type-h1">Today</h2><div className="flex-1 h-px bg-[var(--border-subtle)]" /></div>`
- Class cards: Card `variant="elevated"` with `style={{ borderLeft: '3px solid ${studioColor}' }}`
- Calendar events: Card `variant="standard"` with amber left border
- Travel cards: Card `variant="inset"`
- Live event: Card `variant="highlight"` with `highlightColor` set to amber

**Step 4: WeekMomentumBar.tsx**

- Percentage number: `type-stat` class
- "12 of 14 items complete": `type-caption` class
- Progress ring stroke: use `var(--accent-primary)` color

**Step 5: WeekStats.tsx**

- Numbers: `type-stat` class
- Labels: `type-label` class
- Each stat in Card `variant="stat"`
- Horizontal layout with `flex gap-3 overflow-x-auto`

**Step 6: WeeklyInsight.tsx**

- Wrap in Card `variant="inset"` with left border: `border-l-[3px] border-l-[var(--accent-muted)]`
- Insight text: `font-display italic` (Fraunces italic, editorial pull-quote)
- Caption below: `type-caption`

**Step 7: StreakCard, RemindersWidget, LaunchPlanWidget, ScratchpadWidget**

- All section headers: `type-h1`
- All metadata text: `type-caption`
- Wrap content in appropriate Card variants
- Numbers in StreakCard: `type-stat`

**Step 8: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`

**Step 9: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/Dashboard/
git commit -m "feat: redesign dashboard with editorial typography and card variants"
```

---

## Task 9: Schedule + Class Detail Redesign

**Files:**
- Modify: `src/pages/Schedule.tsx`
- Modify: `src/pages/ClassDetail.tsx`

**Context:** Apply editorial type scale, semantic tokens, and card variants to the schedule and class detail views.

**Step 1: Schedule.tsx**

- Day pills active state: `bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm`
- Day pills inactive: `bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]`
- Event dot indicators: 4px circles using status colors
- Week nav buttons: ghost Button variant
- "Today" button: `bg-[var(--accent-muted)] text-[var(--accent-primary)]` pill
- Class cards: Card `variant="elevated"` with 3px studio-color left border, class name in `type-h2`, time in `type-caption`
- Calendar events: Card `variant="standard"` with amber left border
- Empty state: centered, icon 48px, message in `type-h2`, sub in `type-body`

**Step 2: ClassDetail.tsx**

- Replace harsh pink banner with: Card `variant="standard"` with `style={{ borderTop: '4px solid ${studioColor}' }}`. Inside: time + location in `type-caption`, studio name as a small pill.
- Section headers ("WARM-UP", etc.): `type-h3` + `<div className="h-px bg-[var(--border-subtle)] mt-2" />`
- Lesson plan text: `type-body` with `space-y-4` between sections
- Collapsible sections: chevron rotation `transition-transform duration-200`, content `transition-all duration-[var(--duration-normal)]`
- Attendance bar: Card `variant="inset"`, three cells with stat numbers in `type-h2` weight, labels in `type-label`
- Song/Choreo sections: Card `variant="standard"` — same visual treatment as other sections

**Step 3: Verify build**

Run: `cd /Users/dixxx/figgg && npm run build`

**Step 4: Commit**

```bash
git add src/pages/Schedule.tsx src/pages/ClassDetail.tsx
git commit -m "feat: redesign schedule and class detail with editorial tokens"
```

---

## Task 10: Students Page Redesign

**Files:**
- Modify: `src/pages/Students.tsx`

**Context:** Apply editorial design to the student roster, search, filters, and detail modal.

**Step 1: Search input**

- `bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]` height 44px
- Focus: `focus:border-[var(--border-strong)] focus:shadow-[var(--shadow-card)]`
- Icon: `text-[var(--text-tertiary)]`

**Step 2: Filter pills**

- Active: `bg-[var(--accent-primary)] text-[var(--text-on-accent)]`
- Inactive: `bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]`
- Count separator: ` · 12` in same color as text

**Step 3: Letter group headers**

- `type-h3` + `border-b border-[var(--border-subtle)] pb-1 mt-6`

**Step 4: Student avatar generation**

Create a function to generate name-based gradient avatars:
```typescript
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #c2785a, #d97706)',  // terracotta → amber
  'linear-gradient(135deg, #c4878e, #a3556e)',  // blush → rose
  'linear-gradient(135deg, #6b8f71, #166534)',  // sage → forest
  'linear-gradient(135deg, #0d7490, #06b6d4)',  // teal → cyan
  'linear-gradient(135deg, #9333ea, #ec4899)',  // purple → pink
  'linear-gradient(135deg, #4f46e5, #818cf8)',  // indigo → violet
  'linear-gradient(135deg, #b45309, #f59e0b)',  // brown → gold
  'linear-gradient(135deg, #e11d48, #f43f5e)',  // rose → coral
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}
```

Avatar element: 40px circle, white initials (Inter 600, 14px), background from gradient function.

**Step 5: Student cards**

- Card `variant="elevated"` with `onClick` handler
- Name: `type-h2`, nickname: `type-caption text-[var(--text-secondary)]`
- Class badges: `type-label` pills with `bg-[var(--accent-muted)] text-[var(--accent-primary)]`

**Step 6: Student detail modal**

- Backdrop: `bg-black/50 backdrop-blur-sm`
- Card `variant="modal"` with `padding="lg"`
- Mobile: slide up (bottom sheet with `rounded-t-[var(--radius-lg)]`)
- Name: `type-display`, nickname: `type-caption`
- Contact section: Card `variant="inset"`, icon buttons with `min-h-[44px]`
- Progress notes: timeline layout with `type-label` category badges, `type-body` note text, `type-caption` dates

**Step 7: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add src/pages/Students.tsx
git commit -m "feat: redesign students page with avatar gradients and card variants"
```

---

## Task 11: Tasks & Me/Wellness Redesign

**Files:**
- Modify: `src/pages/Me.tsx`
- Modify: `src/pages/TasksPage.tsx` (if separate from Me)

**Context:** Apply editorial design to the medication tracker, wellness check-in, and task list.

**Step 1: Task list items**

- Card `variant="standard"` with compact padding (`p-3`)
- Custom checkbox: 20px circle, border 2px `var(--border-subtle)`, checked: `bg-[var(--accent-primary)]` with white SVG check, transition `var(--duration-fast) var(--ease-spring)`
- Task text: `type-body`, checked: `line-through text-[var(--text-tertiary)] opacity-50` transition `var(--duration-normal)`
- Due date pill: `type-label`, overdue: `bg-[var(--status-warning)]/10 text-[var(--status-warning)]`
- Priority flag: 8px circle, high=danger, medium=warning, low=accent-secondary

**Step 2: Filter/list pills**

- Same treatment as Students filter pills (accent-primary active, surface-card inactive)

**Step 3: Add task input**

- `bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]` h-44px
- Focus: elevate to `bg-[var(--surface-card)] shadow-[var(--shadow-card)]`

**Step 4: Medication tracker**

- Dose cards: Card `variant="highlight"` with `highlightColor` = accent-primary
- "Take Now" button: Button `variant="primary"` full width
- Taken state: `bg-[var(--surface-highlight)]` with green check icon, 80% opacity
- Effectiveness bar: 4px `h-1 rounded-full` with gradient using CSS `linear-gradient`

**Step 5: Wellness check-in sections**

- Section headers: `type-h1` ("Morning", "Afternoon", "Evening")
- Time-of-day bg tints: reduce to 5% opacity (current gradients are too strong)
- Check items: Card `variant="inset"`, custom 20px checkboxes
- Checked: icon shifts to `text-[var(--accent-primary)]` (encouraging, not crossed out)
- Counter: Fraunces numbers (`type-stat` but smaller, maybe `text-xl font-display font-bold`)
- Skip button: Button `variant="ghost"` with `text-[var(--text-tertiary)]` class, size `sm`

**Step 6: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add src/pages/Me.tsx src/pages/TasksPage.tsx
git commit -m "feat: redesign tasks and wellness pages with editorial tokens"
```

---

## Task 12: DWDC Launch Page Redesign

**Files:**
- Modify: `src/pages/LaunchPlan.tsx`

**Context:** Apply editorial design to the launch tracker.

**Step 1: Countdown banner**

- Card `variant="highlight"` with `highlightColor` = accent-primary
- Number: `type-stat`
- Add CSS animation: `teaching-border-pulse` (already exists) on the left border
- "FIRST REHEARSAL" label: `type-h3`

**Step 2: Tab switcher**

- Same filter pill pattern: accent-primary active, surface-card inactive
- `type-label` text inside pills

**Step 3: Category badges**

- `type-label` pills with per-category colors
- Map: BIZ = forest-600, CONTENT = pop-600, DECIDE = status-warning, etc.

**Step 4: Task cards**

- Card `variant="elevated"`
- Title: `type-h2`, description: `type-body`
- Notes textarea: `bg-[var(--surface-inset)]` full-width
- Done: Button `variant="primary"`, Skip: Button `variant="ghost"`

**Step 5: Progress view**

- Overall bar: `h-2 rounded-full bg-[var(--surface-inset)]` with `bg-[var(--accent-primary)]` fill
- "13 of 124": `type-stat` + `type-caption`
- Per-category mini-bars below

**Step 6: Decision cards**

- Card `variant="standard"` with `border-dashed` border style
- Clock icon: `text-[var(--status-warning)]` for "decide by" dates

**Step 7: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add src/pages/LaunchPlan.tsx
git commit -m "feat: redesign DWDC launch page with editorial tokens and card variants"
```

---

## Task 13: Settings Page Redesign

**Files:**
- Modify: `src/pages/Settings.tsx`

**Context:** Settings should feel designed, not an afterthought.

**Step 1: Teaching Tools section**

- Card `variant="elevated"` per tool (Students, Formations, Library)
- Icon 24px + `type-h2` title + `type-caption` count/status

**Step 2: Theme selector**

- Increase swatch circles to 48px
- Theme name below in `type-label`
- Active: `ring-2 ring-[var(--accent-primary)] scale-110`
- On tap: add `theme-transitioning` class to `:root` for 400ms crossfade

**Step 3: Font size selector**

- Replace "Aa" buttons with preview sentence: "The quick brown fox" at each size
- Active: `border-[var(--accent-primary)] bg-[var(--surface-highlight)]`

**Step 4: Studios section**

- Card `variant="standard"` per studio
- 12px color dot + name (`type-h2`) + address (`type-caption`)

**Step 5: Data stats grid**

- `grid grid-cols-3 gap-3` of Card `variant="stat"`
- Number: `type-stat` (smaller, maybe `text-2xl`), label: `type-label`

**Step 6: Version footer**

- `font-display italic text-[13px] text-[var(--text-tertiary)] text-center mb-8`
- "FIGGG v1.0" — feels like a signature

**Step 7: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add src/pages/Settings.tsx
git commit -m "feat: redesign settings page with editorial tokens and larger theme swatches"
```

---

## Task 14: Empty States & Edge Cases

**Files:**
- Modify: Multiple page files (Schedule, Students, Me, Tasks)

**Context:** Standardize empty states across all pages.

**Step 1: Create a reusable EmptyState component**

Create `src/components/common/EmptyState.tsx`:

```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Icon size={48} className="text-[var(--text-tertiary)] mb-4" strokeWidth={1.5} />
      <h3 className="type-h2 text-[var(--text-secondary)] mb-1">{title}</h3>
      {description && (
        <p className="type-body text-[var(--text-tertiary)] text-center max-w-[280px]">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

**Step 2: Replace ad-hoc empty states in pages**

Search each page file for empty state patterns (usually `text-center py-12 text-blush-500`) and replace with the `<EmptyState>` component.

**Step 3: Update skeleton loading in PageSkeleton.tsx**

Replace current skeleton styles with `skeleton` class (uses the new CSS animation).

**Step 4: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add src/components/common/EmptyState.tsx src/pages/ src/components/common/PageSkeleton.tsx
git commit -m "feat: add standardized EmptyState component and skeleton loading"
```

---

## Task 15: Mobile Polish Pass

**Files:**
- Modify: `src/index.css` (touch target adjustments)
- Review: All page files for touch target compliance

**Context:** Final pass to verify 44px touch targets, thumb zone optimization, and mobile readability.

**Step 1: Audit touch targets**

Verify every interactive element has `min-h-[44px] min-w-[44px]` on mobile. Key areas:
- Day pills on Schedule (these are often too small)
- Class filter pills on Students
- Checkboxes on wellness check-in
- Settings toggles

**Step 2: Verify text readability at all font sizes**

Check that at the smallest font size (15px base), all type-label (11px = 0.6875rem) text is still readable. If not, floor the label level at 10px minimum.

**Step 3: Verify build + Commit**

```bash
cd /Users/dixxx/figgg && npm run build
git add -A
git commit -m "polish: mobile touch targets and readability verification"
```

---

## Task 16: Final Integration Verification

**Step 1: Full build**

```bash
cd /Users/dixxx/figgg && npm run build
```

**Step 2: Local dev server**

```bash
cd /Users/dixxx/figgg && npm run dev
```

Test in browser:
- Switch between all 8 themes + dark mode
- Navigate every page
- Check card variants render correctly
- Verify typography hierarchy is visible
- Test mobile viewport (375px width)

**Step 3: Report to Dixon**

Describe what changed and ask if ready to deploy.

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Semantic tokens + motion vars | index.css |
| 2 | Typography utility classes | index.css |
| 3 | Per-theme semantic mappings | themes.ts, applyTheme.ts |
| 4 | Card component variants | Card.tsx |
| 5 | Button refinement | Button.tsx |
| 6 | Motion system animations | index.css |
| 7 | Navigation redesign | Header.tsx |
| 8 | Dashboard redesign | Dashboard.tsx + 8 widget files |
| 9 | Schedule + Class Detail | Schedule.tsx, ClassDetail.tsx |
| 10 | Students page | Students.tsx |
| 11 | Tasks + Wellness | Me.tsx, TasksPage.tsx |
| 12 | DWDC Launch | LaunchPlan.tsx |
| 13 | Settings | Settings.tsx |
| 14 | Empty states | EmptyState.tsx + page updates |
| 15 | Mobile polish | index.css + page reviews |
| 16 | Final verification | Build + local test |
