// Pre-built color theme palettes for Figgg
// Each theme defines forest-* (primary), blush-* (neutral), and pop-* (accent) scales
// Values map to CSS custom properties that Tailwind CSS 4 references via @theme
//
// Design note: "Ink & Gold" is the default. All themes follow editorial DNA —
// deep dark surfaces, bold accent contrast, warm off-white text in dark mode.
// Light mode surfaces are BOLDLY TINTED per-theme — no more identical near-whites.

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
  // ── Ink & Gold (default) ───────────────────────────────────────
  // Burnished gold primary, cool ivory neutrals, deep ink accent
  {
    id: 'stone',
    name: 'Ink & Gold',
    preview: { primary: '#a0782c', neutral: '#9c9891', accent: '#1a2332' },
    colors: {
      forest: {
        '50': '#faf8f0', '100': '#f5f0e6', '200': '#e8dcc4', '300': '#d4c49a',
        '400': '#c49536', '500': '#a0782c', '600': '#8a6825', '700': '#6e5220',
        '800': '#553f1a', '900': '#3d2e14',
      },
      blush: {
        '50': '#f7f6f3', '100': '#f0eeeb', '200': '#e8e6e1', '300': '#d4d1cc',
        '400': '#9c9891', '500': '#64615c', '600': '#4a4844', '700': '#353330',
        '800': '#1c1b19', '900': '#121108',
      },
      pop: {
        '50': '#f0f2f5', '100': '#d8dce5', '200': '#b0b8c8', '300': '#8892a8',
        '400': '#5c6a82', '500': '#3d4d66', '600': '#2d3a50', '700': '#1f2a3d',
        '800': '#1a2332', '900': '#0f1117',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f5f0e6',
        '--surface-card': '#faf8f0',
        '--surface-card-hover': '#f0eeeb',
        '--surface-inset': '#ede7d8',
        '--surface-elevated': '#faf8f0',
        '--surface-highlight': '#f5f0e6',
        '--text-primary': '#121108',
        '--text-secondary': '#4a4844',
        '--text-tertiary': '#9c9891',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#a0782c',
        '--accent-primary-hover': '#c49536',
        '--accent-secondary': '#2d3a50',
        '--accent-muted': '#ede7d8',
        '--border-subtle': '#e8dcc4',
        '--border-strong': '#c49536',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(156,152,145,0.1), 0 1px 2px -1px rgba(156,152,145,0.1)',
        '--shadow-elevated': '0 10px 15px -3px rgba(156,152,145,0.15), 0 4px 6px -4px rgba(156,152,145,0.1)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(156,152,145,0.12), 0 2px 4px -2px rgba(156,152,145,0.1)',
      },
      dark: {
        '--surface-primary': '#0f1117',
        '--surface-card': '#171b24',
        '--surface-card-hover': '#1f2530',
        '--surface-inset': '#0c0e14',
        '--surface-elevated': '#171b24',
        '--surface-highlight': 'rgba(160,120,44,0.15)',
        '--text-primary': '#e8e4df',
        '--text-secondary': '#9c9891',
        '--text-tertiary': '#64615c',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#d4a843',
        '--accent-primary-hover': '#e8bc52',
        '--accent-secondary': '#8892a8',
        '--accent-muted': 'rgba(164,120,44,0.12)',
        '--border-subtle': '#252a35',
        '--border-strong': '#d4a843',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Deep Sea ───────────────────────────────────────────────────
  // Teal primary, slate-blue neutrals, bright cyan accent
  {
    id: 'ocean',
    name: 'Deep Sea',
    preview: { primary: '#0e7490', neutral: '#8293a8', accent: '#06b6d4' },
    colors: {
      forest: {
        '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4',
        '400': '#2dd4bf', '500': '#14b8a6', '600': '#0e7490', '700': '#0e6377',
        '800': '#115e59', '900': '#134e4a',
      },
      blush: {
        '50': '#f6f8fa', '100': '#eef1f5', '200': '#dfe4ea', '300': '#c4cdd8',
        '400': '#8293a8', '500': '#5a6b80', '600': '#42506a', '700': '#2d3a50',
        '800': '#1a2435', '900': '#0c1220',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#e8f0f5',
        '--surface-card': '#f0f7fa',
        '--surface-card-hover': '#dce8f0',
        '--surface-inset': '#dde9f0',
        '--surface-elevated': '#f0f7fa',
        '--surface-highlight': '#ccfbf1',
        '--text-primary': '#0c1220',
        '--text-secondary': '#42506a',
        '--text-tertiary': '#8293a8',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#0e7490',
        '--accent-primary-hover': '#14b8a6',
        '--accent-secondary': '#0891b2',
        '--accent-muted': '#dde9f0',
        '--border-subtle': '#c4cdd8',
        '--border-strong': '#2dd4bf',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(130,147,168,0.12), 0 1px 2px -1px rgba(130,147,168,0.1)',
        '--shadow-elevated': '0 10px 15px -3px rgba(130,147,168,0.18), 0 4px 6px -4px rgba(130,147,168,0.1)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(130,147,168,0.14), 0 2px 4px -2px rgba(130,147,168,0.1)',
      },
      dark: {
        '--surface-primary': '#0c1220',
        '--surface-card': '#141c2b',
        '--surface-card-hover': '#1e2d42',
        '--surface-inset': '#080d18',
        '--surface-elevated': '#141c2b',
        '--surface-highlight': 'rgba(14,116,144,0.15)',
        '--text-primary': '#e2e8f0',
        '--text-secondary': '#8293a8',
        '--text-tertiary': '#5a6b80',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#22d3ee',
        '--accent-primary-hover': '#67e8f9',
        '--accent-secondary': '#06b6d4',
        '--accent-muted': 'rgba(14,116,144,0.12)',
        '--border-subtle': '#1e2d42',
        '--border-strong': '#22d3ee',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Studio (DWD brand) ─────────────────────────────────────────
  // Dark forest green primary, light pink accent — the DWD palette
  {
    id: 'dwd',
    name: 'Studio',
    preview: { primary: '#2d6a4f', neutral: '#f9a8d4', accent: '#ec4899' },
    colors: {
      forest: {
        '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac',
        '400': '#4ade80', '500': '#22c55e', '600': '#2d6a4f', '700': '#1b5e3a',
        '800': '#166534', '900': '#14532d',
      },
      blush: {
        '50': '#f4f7f5', '100': '#eaf0ec', '200': '#d8e2dc', '300': '#c0cec5',
        '400': '#88a090', '500': '#5e7668', '600': '#445a4c', '700': '#2e3e34',
        '800': '#1a2a20', '900': '#0e1410',
      },
      pop: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#e8f0eb',
        '--surface-card': '#f0f7f2',
        '--surface-card-hover': '#dce8e0',
        '--surface-inset': '#dde5df',
        '--surface-elevated': '#f0f7f2',
        '--surface-highlight': '#dcfce7',
        '--text-primary': '#0e1410',
        '--text-secondary': '#445a4c',
        '--text-tertiary': '#88a090',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#2d6a4f',
        '--accent-primary-hover': '#22c55e',
        '--accent-secondary': '#db2777',
        '--accent-muted': '#dde5df',
        '--border-subtle': '#c0cec5',
        '--border-strong': '#4ade80',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(136,160,144,0.1), 0 1px 2px -1px rgba(0,0,0,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(136,160,144,0.15), 0 4px 6px -4px rgba(0,0,0,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(136,160,144,0.12), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
      dark: {
        '--surface-primary': '#0e1410',
        '--surface-card': '#162018',
        '--surface-card-hover': '#1e2e22',
        '--surface-inset': '#090e0b',
        '--surface-elevated': '#162018',
        '--surface-highlight': 'rgba(20,83,45,0.2)',
        '--text-primary': '#eaf0ec',
        '--text-secondary': '#88a090',
        '--text-tertiary': '#5e7668',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#52b788',
        '--accent-primary-hover': '#86efac',
        '--accent-secondary': '#f472b6',
        '--accent-muted': 'rgba(20,83,45,0.15)',
        '--border-subtle': '#1e2e22',
        '--border-strong': '#52b788',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Noir ──────────────────────────────────────────────────────
  // Maximum contrast. Pure black & white. Silver accents.
  {
    id: 'noir',
    name: 'Noir',
    preview: { primary: '#000000', neutral: '#a0a0a0', accent: '#6b7280' },
    colors: {
      forest: {
        '50': '#fafafa', '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4',
        '400': '#a3a3a3', '500': '#737373', '600': '#525252', '700': '#404040',
        '800': '#262626', '900': '#0a0a0a',
      },
      blush: {
        '50': '#fafafa', '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4',
        '400': '#a3a3a3', '500': '#737373', '600': '#525252', '700': '#404040',
        '800': '#262626', '900': '#0a0a0a',
      },
      pop: {
        '50': '#fafafa', '100': '#f0f0f0', '200': '#e0e0e0', '300': '#cccccc',
        '400': '#b0b0b0', '500': '#999999', '600': '#808080', '700': '#666666',
        '800': '#4d4d4d', '900': '#333333',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#ffffff',
        '--surface-card': '#f5f5f5',
        '--surface-card-hover': '#ebebeb',
        '--surface-inset': '#f0f0f0',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#f0f0f0',
        '--text-primary': '#000000',
        '--text-secondary': '#000000',
        '--text-tertiary': '#525252',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#000000',
        '--accent-primary-hover': '#262626',
        '--accent-secondary': '#6b7280',
        '--accent-muted': '#f0f0f0',
        '--border-subtle': '#e5e5e5',
        '--border-strong': '#000000',
        '--status-success': '#525252',
        '--status-warning': '#737373',
        '--status-danger': '#000000',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.12), 0 4px 6px -4px rgba(0,0,0,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
      dark: {
        '--surface-primary': '#000000',
        '--surface-card': '#0a0a0a',
        '--surface-card-hover': '#171717',
        '--surface-inset': '#000000',
        '--surface-elevated': '#0a0a0a',
        '--surface-highlight': 'rgba(255,255,255,0.05)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#a3a3a3',
        '--text-tertiary': '#525252',
        '--text-on-accent': '#000000',
        '--accent-primary': '#ffffff',
        '--accent-primary-hover': '#e5e5e5',
        '--accent-secondary': '#a3a3a3',
        '--accent-muted': 'rgba(255,255,255,0.08)',
        '--border-subtle': '#1a1a1a',
        '--border-strong': '#ffffff',
        '--status-success': '#a3a3a3',
        '--status-warning': '#d4d4d4',
        '--status-danger': '#ffffff',
        '--shadow-card': '0 1px 3px 0 rgba(255,255,255,0.04)',
        '--shadow-elevated': '0 10px 15px -3px rgba(255,255,255,0.06), 0 4px 6px -4px rgba(255,255,255,0.03)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(255,255,255,0.05)',
      },
    },
  },
  // ── Candy ─────────────────────────────────────────────────────
  // Bubblegum pop. Hot pink + cyan.
  {
    id: 'candy',
    name: 'Candy',
    preview: { primary: '#ec4899', neutral: '#a3a3b0', accent: '#06b6d4' },
    colors: {
      forest: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
      blush: {
        '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
        '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
        '800': '#27272a', '900': '#18181b',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#fdf0f5',
        '--surface-card': '#fff5f9',
        '--surface-card-hover': '#fce7f3',
        '--surface-inset': '#fbe4f0',
        '--surface-elevated': '#fff5f9',
        '--surface-highlight': '#fce7f3',
        '--text-primary': '#18181b',
        '--text-secondary': '#52525b',
        '--text-tertiary': '#a1a1aa',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#ec4899',
        '--accent-primary-hover': '#f472b6',
        '--accent-secondary': '#0891b2',
        '--accent-muted': '#fbe4f0',
        '--border-subtle': '#fbcfe8',
        '--border-strong': '#ec4899',
        '--status-success': '#10b981',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(236,72,153,0.08), 0 1px 2px -1px rgba(236,72,153,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(236,72,153,0.12), 0 4px 6px -4px rgba(236,72,153,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(236,72,153,0.1), 0 2px 4px -2px rgba(236,72,153,0.06)',
      },
      dark: {
        '--surface-primary': '#110a10',
        '--surface-card': '#1c1018',
        '--surface-card-hover': '#2a1524',
        '--surface-inset': '#0c0608',
        '--surface-elevated': '#1c1018',
        '--surface-highlight': 'rgba(236,72,153,0.15)',
        '--text-primary': '#fce7f3',
        '--text-secondary': '#a1a1aa',
        '--text-tertiary': '#52525b',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#f472b6',
        '--accent-primary-hover': '#f9a8d4',
        '--accent-secondary': '#22d3ee',
        '--accent-muted': 'rgba(236,72,153,0.12)',
        '--border-subtle': '#2a1524',
        '--border-strong': '#f472b6',
        '--status-success': '#34d399',
        '--status-warning': '#fbbf24',
        '--status-danger': '#fb7185',
        '--shadow-card': '0 1px 3px 0 rgba(236,72,153,0.1), 0 1px 2px rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 0 20px rgba(236,72,153,0.1), 0 10px 15px -3px rgba(0,0,0,0.4)',
        '--shadow-card-hover': '0 0 12px rgba(236,72,153,0.08), 0 4px 6px rgba(0,0,0,0.3)',
      },
    },
  },
  // ── Crimson ───────────────────────────────────────────────────
  // Red velvet + gold.
  {
    id: 'crimson',
    name: 'Crimson',
    preview: { primary: '#dc2626', neutral: '#a8a29e', accent: '#d97706' },
    colors: {
      forest: {
        '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5',
        '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c',
        '800': '#991b1b', '900': '#7f1d1d',
      },
      blush: {
        '50': '#fafaf9', '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1',
        '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
        '800': '#292524', '900': '#1c1917',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#faf0ee',
        '--surface-card': '#fdf5f3',
        '--surface-card-hover': '#f5e5e2',
        '--surface-inset': '#f5e3e0',
        '--surface-elevated': '#fdf5f3',
        '--surface-highlight': '#fee2e2',
        '--text-primary': '#1c1917',
        '--text-secondary': '#57534e',
        '--text-tertiary': '#a8a29e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#dc2626',
        '--accent-primary-hover': '#ef4444',
        '--accent-secondary': '#b45309',
        '--accent-muted': '#f5e3e0',
        '--border-subtle': '#fecaca',
        '--border-strong': '#dc2626',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(220,38,38,0.08), 0 1px 2px -1px rgba(220,38,38,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(220,38,38,0.1), 0 4px 6px -4px rgba(220,38,38,0.07)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(220,38,38,0.09), 0 2px 4px -2px rgba(220,38,38,0.06)',
      },
      dark: {
        '--surface-primary': '#110808',
        '--surface-card': '#1a0e0e',
        '--surface-card-hover': '#281414',
        '--surface-inset': '#0c0505',
        '--surface-elevated': '#1a0e0e',
        '--surface-highlight': 'rgba(220,38,38,0.15)',
        '--text-primary': '#fee2e2',
        '--text-secondary': '#a8a29e',
        '--text-tertiary': '#57534e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#f87171',
        '--accent-primary-hover': '#fca5a5',
        '--accent-secondary': '#fbbf24',
        '--accent-muted': 'rgba(220,38,38,0.12)',
        '--border-subtle': '#281414',
        '--border-strong': '#f87171',
        '--status-success': '#22c55e',
        '--status-warning': '#fbbf24',
        '--status-danger': '#f87171',
        '--shadow-card': '0 0 8px rgba(220,38,38,0.1), 0 1px 3px rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 0 20px rgba(220,38,38,0.12), 0 10px 15px -3px rgba(0,0,0,0.4)',
        '--shadow-card-hover': '0 0 12px rgba(220,38,38,0.1), 0 4px 6px rgba(0,0,0,0.3)',
      },
    },
  },
  // ── Vapor ─────────────────────────────────────────────────────
  // Vaporwave/retrowave. Neon pink + neon cyan on deep purple.
  {
    id: 'vapor',
    name: 'Vapor',
    preview: { primary: '#f472b6', neutral: '#a78bfa', accent: '#22d3ee' },
    colors: {
      forest: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
      blush: {
        '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
        '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9',
        '800': '#4c1d95', '900': '#2e1065',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f5f0ff',
        '--surface-card': '#faf5ff',
        '--surface-card-hover': '#ede5fc',
        '--surface-inset': '#ece4fb',
        '--surface-elevated': '#faf5ff',
        '--surface-highlight': '#fce7f3',
        '--text-primary': '#2e1065',
        '--text-secondary': '#6d28d9',
        '--text-tertiary': '#a78bfa',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#ec4899',
        '--accent-primary-hover': '#f472b6',
        '--accent-secondary': '#0891b2',
        '--accent-muted': '#ece4fb',
        '--border-subtle': '#ddd6fe',
        '--border-strong': '#ec4899',
        '--status-success': '#10b981',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(167,139,250,0.12), 0 1px 2px -1px rgba(167,139,250,0.1)',
        '--shadow-elevated': '0 10px 15px -3px rgba(167,139,250,0.18), 0 4px 6px -4px rgba(167,139,250,0.1)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(167,139,250,0.14), 0 2px 4px -2px rgba(167,139,250,0.1)',
      },
      dark: {
        '--surface-primary': '#0f0520',
        '--surface-card': '#180a30',
        '--surface-card-hover': '#22103e',
        '--surface-inset': '#080312',
        '--surface-elevated': '#180a30',
        '--surface-highlight': 'rgba(236,72,153,0.15)',
        '--text-primary': '#f5f3ff',
        '--text-secondary': '#c4b5fd',
        '--text-tertiary': '#7c3aed',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#f472b6',
        '--accent-primary-hover': '#f9a8d4',
        '--accent-secondary': '#22d3ee',
        '--accent-muted': 'rgba(236,72,153,0.12)',
        '--border-subtle': '#22103e',
        '--border-strong': '#f472b6',
        '--status-success': '#34d399',
        '--status-warning': '#fbbf24',
        '--status-danger': '#fb7185',
        '--shadow-card': '0 0 8px rgba(244,114,182,0.1), 0 0 8px rgba(34,211,238,0.05), 0 1px 3px rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 0 20px rgba(244,114,182,0.12), 0 0 20px rgba(34,211,238,0.06), 0 10px 15px rgba(0,0,0,0.4)',
        '--shadow-card-hover': '0 0 14px rgba(244,114,182,0.1), 0 0 14px rgba(34,211,238,0.05), 0 4px 6px rgba(0,0,0,0.3)',
      },
    },
  },
  // ── Emerald ───────────────────────────────────────────────────
  // Jewel green + gold.
  {
    id: 'emerald',
    name: 'Emerald',
    preview: { primary: '#059669', neutral: '#a8a29e', accent: '#f59e0b' },
    colors: {
      forest: {
        '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
        '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857',
        '800': '#065f46', '900': '#064e3b',
      },
      blush: {
        '50': '#fafaf9', '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1',
        '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
        '800': '#292524', '900': '#1c1917',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f0f5ee',
        '--surface-card': '#f5faf3',
        '--surface-card-hover': '#e2eddf',
        '--surface-inset': '#e3ecdf',
        '--surface-elevated': '#f5faf3',
        '--surface-highlight': '#d1fae5',
        '--text-primary': '#1c1917',
        '--text-secondary': '#57534e',
        '--text-tertiary': '#a8a29e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#059669',
        '--accent-primary-hover': '#10b981',
        '--accent-secondary': '#b45309',
        '--accent-muted': '#e3ecdf',
        '--border-subtle': '#a7f3d0',
        '--border-strong': '#059669',
        '--status-success': '#059669',
        '--status-warning': '#f59e0b',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(5,150,105,0.08), 0 1px 2px -1px rgba(5,150,105,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(5,150,105,0.12), 0 4px 6px -4px rgba(5,150,105,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(5,150,105,0.1), 0 2px 4px -2px rgba(5,150,105,0.06)',
      },
      dark: {
        '--surface-primary': '#071210',
        '--surface-card': '#0c1a16',
        '--surface-card-hover': '#14261f',
        '--surface-inset': '#040c0a',
        '--surface-elevated': '#0c1a16',
        '--surface-highlight': 'rgba(5,150,105,0.15)',
        '--text-primary': '#d1fae5',
        '--text-secondary': '#a8a29e',
        '--text-tertiary': '#57534e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#34d399',
        '--accent-primary-hover': '#6ee7b7',
        '--accent-secondary': '#fbbf24',
        '--accent-muted': 'rgba(5,150,105,0.12)',
        '--border-subtle': '#14261f',
        '--border-strong': '#34d399',
        '--status-success': '#34d399',
        '--status-warning': '#fbbf24',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 0 8px rgba(5,150,105,0.08), 0 1px 3px rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 0 20px rgba(5,150,105,0.1), 0 10px 15px -3px rgba(0,0,0,0.4)',
        '--shadow-card-hover': '0 0 12px rgba(5,150,105,0.08), 0 4px 6px rgba(0,0,0,0.3)',
      },
    },
  },
];

export function getTheme(id: string): ThemePalette {
  return themes.find(t => t.id === id) || themes[0];
}
