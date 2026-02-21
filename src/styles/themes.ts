// Pre-built color theme palettes for Figgg
// Each theme defines forest-* (primary), blush-* (neutral), and pop-* (accent) scales
// Values map to CSS custom properties that Tailwind CSS 4 references via @theme
//
// Design note: "Soft Stone" is the default. All themes are designed to feel distinct
// from DWDC's forest-green + blush-pink identity. FIG is warm earth, not botanical.

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

export interface ThemePalette {
  id: string;
  name: string;
  preview: { primary: string; neutral: string; accent: string };
  special?: 'rainbow'; // for swatches that need gradient treatment
  colors: {
    forest: Record<string, string>;
    blush: Record<string, string>;
    pop: Record<string, string>;
  };
  semantics: SemanticPair;
}

export const themes: ThemePalette[] = [
  // ── Default: Soft Stone ──────────────────────────────────────────
  // Terracotta primary, warm cream/charcoal neutrals, honey gold accent
  {
    id: 'stone',
    name: 'Soft Stone',
    preview: { primary: '#c2785a', neutral: '#a8a29e', accent: '#d97706' },
    colors: {
      forest: {
        '50': '#fdf5f0', '100': '#fae8db', '200': '#f4ccb3', '300': '#edac87',
        '400': '#e08d60', '500': '#c2785a', '600': '#b0694d', '700': '#905440',
        '800': '#704234', '900': '#5a352b',
      },
      blush: {
        '50': '#f5f0eb', '100': '#ede6de', '200': '#e7e0d8', '300': '#d6d0c8',
        '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
        '800': '#231f1a', '900': '#1a1714',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f5f0eb',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#ede6de',
        '--surface-inset': '#ede6de',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#fdf5f0',
        '--text-primary': '#1a1714',
        '--text-secondary': '#78716c',
        '--text-tertiary': '#a8a29e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#b0694d',
        '--accent-primary-hover': '#e08d60',
        '--accent-secondary': '#d97706',
        '--accent-muted': '#fdf5f0',
        '--border-subtle': '#e7e0d8',
        '--border-strong': '#e08d60',
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
  },
  // ── Ocean ────────────────────────────────────────────────────────
  // Teal-blue primary, cool slate neutrals, seafoam accent
  {
    id: 'ocean',
    name: 'Ocean',
    preview: { primary: '#0d7490', neutral: '#94a3b8', accent: '#0d9488' },
    colors: {
      forest: {
        '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4',
        '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d7490', '700': '#0e6377',
        '800': '#115e59', '900': '#134e4a',
      },
      blush: {
        '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1',
        '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155',
        '800': '#1e293b', '900': '#0f172a',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
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
  },
  // ── Plum ──────────────────────────────────────────────────────────
  // Deep purple primary, cool zinc neutrals, pink accent
  {
    id: 'plum',
    name: 'Plum',
    preview: { primary: '#9333ea', neutral: '#a1a1aa', accent: '#ec4899' },
    colors: {
      forest: {
        '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
        '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce',
        '800': '#6b21a8', '900': '#581c87',
      },
      blush: {
        '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
        '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
        '800': '#27272a', '900': '#18181b',
      },
      pop: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
    },
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
  },
  // ── Midnight ─────────────────────────────────────────────────────
  // Indigo primary, cool gray neutrals, cyan accent
  {
    id: 'midnight',
    name: 'Midnight',
    preview: { primary: '#4f46e5', neutral: '#9ca3af', accent: '#06b6d4' },
    colors: {
      forest: {
        '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc',
        '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca',
        '800': '#3730a3', '900': '#312e81',
      },
      blush: {
        '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db',
        '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151',
        '800': '#1f2937', '900': '#111827',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
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
  },
  // ── Clay ──────────────────────────────────────────────────────────
  // Warm red-brown primary, warm stone neutrals, golden accent
  // Earthier sibling of Soft Stone — more saturated, bolder
  {
    id: 'clay',
    name: 'Clay',
    preview: { primary: '#b45309', neutral: '#a8a29e', accent: '#dc2626' },
    colors: {
      forest: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#b45309', '700': '#92400e',
        '800': '#78350f', '900': '#5c2b0e',
      },
      blush: {
        '50': '#fafaf9', '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1',
        '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
        '800': '#292524', '900': '#1c1917',
      },
      pop: {
        '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5',
        '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c',
        '800': '#991b1b', '900': '#7f1d1d',
      },
    },
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
  },
  // ── Dusk ──────────────────────────────────────────────────────────
  // Warm mauve/wine primary, warm gray neutrals, golden-rose accent
  {
    id: 'dusk',
    name: 'Dusk',
    preview: { primary: '#a3556e', neutral: '#a8a29e', accent: '#c4878e' },
    colors: {
      forest: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#f5c6d8', '300': '#eba3c0',
        '400': '#d4789d', '500': '#b85c82', '600': '#a3556e', '700': '#8a4460',
        '800': '#6e3550', '900': '#562940',
      },
      blush: {
        '50': '#faf8f7', '100': '#f3f0ee', '200': '#e7e2de', '300': '#d6d0cc',
        '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
        '800': '#292524', '900': '#1c1917',
      },
      pop: {
        '50': '#fef7f0', '100': '#fdebd5', '200': '#fbd6ab', '300': '#f8b977',
        '400': '#f49d4c', '500': '#e8852f', '600': '#c46a1e', '700': '#a25518',
        '800': '#824415', '900': '#6a3712',
      },
    },
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
  },
  // ── Pride ─────────────────────────────────────────────────────────
  // Violet primary (warm, not cold), warm cream neutrals, golden-yellow accent
  // Rainbow swatch in the picker; app uses a cohesive violet+gold palette
  {
    id: 'pride',
    name: 'Pride',
    special: 'rainbow',
    preview: { primary: '#8b5cf6', neutral: '#e9d5ff', accent: '#fbbf24' },
    colors: {
      forest: {
        '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
        '400': '#c084fc', '500': '#a855f7', '600': '#8b5cf6', '700': '#7c3aed',
        '800': '#6d28d9', '900': '#5b21b6',
      },
      blush: {
        '50': '#fdfbff', '100': '#f5f0fb', '200': '#ede4f7', '300': '#ddd4f0',
        '400': '#b8a8d8', '500': '#8878a8', '600': '#605878', '700': '#4a4260',
        '800': '#2e2840', '900': '#1e1a2e',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
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
  },
  // ── Dance With Dixon ──────────────────────────────────────────────
  // Deep forest green primary, warm blush-pink neutrals, hot pink accent
  // Matches the DWDC brand identity exactly
  {
    id: 'dwdc',
    name: 'Dance With Dixon',
    preview: { primary: '#166534', neutral: '#f9a8d4', accent: '#ec4899' },
    colors: {
      forest: {
        '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac',
        '400': '#4ade80', '500': '#22c55e', '600': '#166534', '700': '#15803d',
        '800': '#166534', '900': '#14532d',
      },
      blush: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#d946a0', '600': '#be185d', '700': '#9d174d',
        '800': '#831843', '900': '#500724',
      },
      pop: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
    },
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
  },
  // ── Neon ──────────────────────────────────────────────────────────
  // Electric hot coral primary, near-black neutrals, lime-green accent
  // Maximum drama — high contrast dark-mode energy
  {
    id: 'neon',
    name: 'Neon',
    preview: { primary: '#f43f5e', neutral: '#1c1c27', accent: '#a3e635' },
    colors: {
      forest: {
        '50': '#fff1f3', '100': '#ffe4e8', '200': '#fecdd3', '300': '#fda4af',
        '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
        '800': '#9f1239', '900': '#881337',
      },
      blush: {
        '50': '#f4f4f8', '100': '#e8e8f0', '200': '#d0d0e0', '300': '#a8a8c0',
        '400': '#6b6b88', '500': '#4a4a65', '600': '#333348', '700': '#252535',
        '800': '#1c1c27', '900': '#111118',
      },
      pop: {
        '50': '#f7fee7', '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264',
        '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f',
        '800': '#3f6212', '900': '#365314',
      },
    },
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
  },
];

export function getTheme(id: string): ThemePalette {
  return themes.find(t => t.id === id) || themes[0];
}
