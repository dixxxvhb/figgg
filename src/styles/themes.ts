// Pre-built color theme palettes for Figgg
// Each theme defines forest-* (primary), blush-* (neutral), and pop-* (accent) scales
// Values map to CSS custom properties that Tailwind CSS 4 references via @theme
//
// Design note: "Ink & Gold" is the default. All themes follow editorial DNA —
// deep dark surfaces, bold accent contrast, warm off-white text in dark mode.

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
        '--surface-primary': '#f7f6f3',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#f0eeeb',
        '--surface-inset': '#f0eeeb',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#faf8f0',
        '--text-primary': '#121108',
        '--text-secondary': '#64615c',
        '--text-tertiary': '#9c9891',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#a0782c',
        '--accent-primary-hover': '#c49536',
        '--accent-secondary': '#1a2332',
        '--accent-muted': '#f5f0e6',
        '--border-subtle': '#e8e6e1',
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
        '--surface-primary': '#f6f8fa',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#eef1f5',
        '--surface-inset': '#eef1f5',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#f0fdfa',
        '--text-primary': '#0c1220',
        '--text-secondary': '#5a6b80',
        '--text-tertiary': '#8293a8',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#0e7490',
        '--accent-primary-hover': '#14b8a6',
        '--accent-secondary': '#0891b2',
        '--accent-muted': '#f0f9ff',
        '--border-subtle': '#dfe4ea',
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
  // ── Velvet ─────────────────────────────────────────────────────
  // Vivid purple primary, warm plum neutrals, hot pink accent
  {
    id: 'plum',
    name: 'Velvet',
    preview: { primary: '#9333ea', neutral: '#a09aaf', accent: '#ec4899' },
    colors: {
      forest: {
        '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
        '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce',
        '800': '#6b21a8', '900': '#581c87',
      },
      blush: {
        '50': '#f9f6fa', '100': '#f2eef5', '200': '#e6e1ec', '300': '#d2ccd9',
        '400': '#a09aaf', '500': '#736d80', '600': '#554f62', '700': '#3d384a',
        '800': '#252132', '900': '#12101a',
      },
      pop: {
        '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
        '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
        '800': '#9d174d', '900': '#831843',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f9f6fa',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#f2eef5',
        '--surface-inset': '#f2eef5',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#faf5ff',
        '--text-primary': '#12101a',
        '--text-secondary': '#736d80',
        '--text-tertiary': '#a09aaf',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#9333ea',
        '--accent-primary-hover': '#a855f7',
        '--accent-secondary': '#db2777',
        '--accent-muted': '#f5f0ff',
        '--border-subtle': '#e6e1ec',
        '--border-strong': '#c084fc',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 4px 0 rgba(147,51,234,0.06), 0 1px 3px -1px rgba(0,0,0,0.08)',
        '--shadow-elevated': '0 12px 20px -4px rgba(147,51,234,0.1), 0 4px 8px -4px rgba(0,0,0,0.1)',
        '--shadow-card-hover': '0 4px 8px -1px rgba(147,51,234,0.08), 0 2px 4px -2px rgba(0,0,0,0.08)',
      },
      dark: {
        '--surface-primary': '#12101a',
        '--surface-card': '#1c1928',
        '--surface-card-hover': '#2a2540',
        '--surface-inset': '#0e0c15',
        '--surface-elevated': '#1c1928',
        '--surface-highlight': 'rgba(88,28,135,0.2)',
        '--text-primary': '#f2eef5',
        '--text-secondary': '#a09aaf',
        '--text-tertiary': '#736d80',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#c084fc',
        '--accent-primary-hover': '#d8b4fe',
        '--accent-secondary': '#f472b6',
        '--accent-muted': 'rgba(88,28,135,0.15)',
        '--border-subtle': '#2a2540',
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
  // ── Obsidian ───────────────────────────────────────────────────
  // Electric indigo primary, cool gray neutrals, cyan accent
  {
    id: 'midnight',
    name: 'Obsidian',
    preview: { primary: '#4f46e5', neutral: '#8c93a3', accent: '#06b6d4' },
    colors: {
      forest: {
        '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc',
        '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca',
        '800': '#3730a3', '900': '#312e81',
      },
      blush: {
        '50': '#f5f7fa', '100': '#edf0f5', '200': '#dde1ea', '300': '#c5cbd8',
        '400': '#8c93a3', '500': '#636b7e', '600': '#4a5268', '700': '#343b50',
        '800': '#1c2235', '900': '#0a0c14',
      },
      pop: {
        '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
        '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
        '800': '#155e75', '900': '#164e63',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f5f7fa',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#edf0f5',
        '--surface-inset': '#edf0f5',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#eef2ff',
        '--text-primary': '#0a0c14',
        '--text-secondary': '#636b7e',
        '--text-tertiary': '#8c93a3',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#4f46e5',
        '--accent-primary-hover': '#6366f1',
        '--accent-secondary': '#0891b2',
        '--accent-muted': '#eef2ff',
        '--border-subtle': '#dde1ea',
        '--border-strong': '#818cf8',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(107,114,128,0.1), 0 1px 2px -1px rgba(107,114,128,0.08)',
        '--shadow-elevated': '0 10px 15px -3px rgba(107,114,128,0.15), 0 4px 6px -4px rgba(107,114,128,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(107,114,128,0.12), 0 2px 4px -2px rgba(107,114,128,0.08)',
      },
      dark: {
        '--surface-primary': '#0a0c14',
        '--surface-card': '#121520',
        '--surface-card-hover': '#1c2235',
        '--surface-inset': '#070910',
        '--surface-elevated': '#121520',
        '--surface-highlight': 'rgba(49,46,129,0.2)',
        '--text-primary': '#edf0f5',
        '--text-secondary': '#8c93a3',
        '--text-tertiary': '#636b7e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#818cf8',
        '--accent-primary-hover': '#a5b4fc',
        '--accent-secondary': '#22d3ee',
        '--accent-muted': 'rgba(49,46,129,0.15)',
        '--border-subtle': '#1c2235',
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
  // ── Terracotta ─────────────────────────────────────────────────
  // Warm terracotta primary, warm stone neutrals, amber accent
  // Preserves the old default feel — earthy, grounded
  {
    id: 'clay',
    name: 'Terracotta',
    preview: { primary: '#c2785a', neutral: '#a8a19a', accent: '#d97706' },
    colors: {
      forest: {
        '50': '#fdf5f0', '100': '#fae8db', '200': '#f4ccb3', '300': '#edac87',
        '400': '#e08d60', '500': '#c2785a', '600': '#b0694d', '700': '#905440',
        '800': '#704234', '900': '#5a352b',
      },
      blush: {
        '50': '#f8f5f2', '100': '#f0ece8', '200': '#e5e0db', '300': '#d2ccc5',
        '400': '#a8a19a', '500': '#7a746e', '600': '#5a5550', '700': '#403c38',
        '800': '#282420', '900': '#161210',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f8f5f2',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#f0ece8',
        '--surface-inset': '#f0ece8',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#fdf5f0',
        '--text-primary': '#161210',
        '--text-secondary': '#7a746e',
        '--text-tertiary': '#a8a19a',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#c2785a',
        '--accent-primary-hover': '#e08d60',
        '--accent-secondary': '#d97706',
        '--accent-muted': '#fdf5f0',
        '--border-subtle': '#e5e0db',
        '--border-strong': '#e08d60',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(168,161,154,0.1), 0 1px 2px -1px rgba(168,161,154,0.1)',
        '--shadow-elevated': '0 10px 15px -3px rgba(168,161,154,0.15), 0 4px 6px -4px rgba(168,161,154,0.1)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(168,161,154,0.12), 0 2px 4px -2px rgba(168,161,154,0.1)',
      },
      dark: {
        '--surface-primary': '#161210',
        '--surface-card': '#1e1a17',
        '--surface-card-hover': '#2e2824',
        '--surface-inset': '#110e0c',
        '--surface-elevated': '#1e1a17',
        '--surface-highlight': 'rgba(90,53,43,0.2)',
        '--text-primary': '#f0ece8',
        '--text-secondary': '#a8a19a',
        '--text-tertiary': '#7a746e',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#e08d60',
        '--accent-primary-hover': '#edac87',
        '--accent-secondary': '#f59e0b',
        '--accent-muted': 'rgba(90,53,43,0.15)',
        '--border-subtle': '#2e2824',
        '--border-strong': '#e08d60',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Rosewood ───────────────────────────────────────────────────
  // Mauve-rose primary, warm gray neutrals, copper accent
  {
    id: 'dusk',
    name: 'Rosewood',
    preview: { primary: '#b4637a', neutral: '#a09a96', accent: '#c4878e' },
    colors: {
      forest: {
        '50': '#fdf2f4', '100': '#fce7ec', '200': '#f5c6d3', '300': '#eba3b8',
        '400': '#d4789d', '500': '#b4637a', '600': '#9c5268', '700': '#804258',
        '800': '#663448', '900': '#4e2838',
      },
      blush: {
        '50': '#f9f6f7', '100': '#f2eeef', '200': '#e6e1e3', '300': '#d2cccf',
        '400': '#a09a96', '500': '#787270', '600': '#5a5453', '700': '#403b3a',
        '800': '#272222', '900': '#141012',
      },
      pop: {
        '50': '#fef7f0', '100': '#fdebd5', '200': '#fbd6ab', '300': '#f8b977',
        '400': '#f49d4c', '500': '#e8852f', '600': '#c46a1e', '700': '#a25518',
        '800': '#824415', '900': '#6a3712',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f9f6f7',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#f2eeef',
        '--surface-inset': '#f2eeef',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#fdf2f4',
        '--text-primary': '#141012',
        '--text-secondary': '#787270',
        '--text-tertiary': '#a09a96',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#b4637a',
        '--accent-primary-hover': '#d4789d',
        '--accent-secondary': '#c46a1e',
        '--accent-muted': '#fdf2f4',
        '--border-subtle': '#e6e1e3',
        '--border-strong': '#d4789d',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(160,154,150,0.1), 0 1px 2px -1px rgba(0,0,0,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(160,154,150,0.15), 0 4px 6px -4px rgba(0,0,0,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(160,154,150,0.12), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
      dark: {
        '--surface-primary': '#141012',
        '--surface-card': '#1c1719',
        '--surface-card-hover': '#2a2325',
        '--surface-inset': '#0f0c0e',
        '--surface-elevated': '#1c1719',
        '--surface-highlight': 'rgba(78,40,56,0.2)',
        '--text-primary': '#f2eeef',
        '--text-secondary': '#a09a96',
        '--text-tertiary': '#787270',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#d4929f',
        '--accent-primary-hover': '#eba3b8',
        '--accent-secondary': '#f49d4c',
        '--accent-muted': 'rgba(78,40,56,0.15)',
        '--border-subtle': '#2a2325',
        '--border-strong': '#d4929f',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Amethyst ───────────────────────────────────────────────────
  // Deep violet primary, warm cream neutrals, golden accent
  // Rainbow swatch in the picker
  {
    id: 'pride',
    name: 'Amethyst',
    special: 'rainbow',
    preview: { primary: '#7c3aed', neutral: '#b0a8c0', accent: '#d97706' },
    colors: {
      forest: {
        '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
        '400': '#c084fc', '500': '#a855f7', '600': '#7c3aed', '700': '#6d28d9',
        '800': '#5b21b6', '900': '#4c1d95',
      },
      blush: {
        '50': '#f8f6f3', '100': '#f0eceb', '200': '#e4dfe0', '300': '#d0cad0',
        '400': '#b0a8c0', '500': '#807898', '600': '#5e5672', '700': '#443e55',
        '800': '#2a2538', '900': '#110f18',
      },
      pop: {
        '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
        '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
        '800': '#92400e', '900': '#78350f',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f8f6f3',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#f0eceb',
        '--surface-inset': '#f0eceb',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#faf5ff',
        '--text-primary': '#110f18',
        '--text-secondary': '#807898',
        '--text-tertiary': '#b0a8c0',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#7c3aed',
        '--accent-primary-hover': '#a855f7',
        '--accent-secondary': '#d97706',
        '--accent-muted': '#f3f0ff',
        '--border-subtle': '#e4dfe0',
        '--border-strong': '#c084fc',
        '--status-success': '#16a34a',
        '--status-warning': '#d97706',
        '--status-danger': '#dc2626',
        '--shadow-card': '0 1px 3px 0 rgba(124,58,237,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(124,58,237,0.1), 0 4px 6px -4px rgba(0,0,0,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(124,58,237,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
      dark: {
        '--surface-primary': '#110f18',
        '--surface-card': '#1a1726',
        '--surface-card-hover': '#282340',
        '--surface-inset': '#0c0b12',
        '--surface-elevated': '#1a1726',
        '--surface-highlight': 'rgba(76,29,149,0.2)',
        '--text-primary': '#f0eceb',
        '--text-secondary': '#b0a8c0',
        '--text-tertiary': '#807898',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#a78bfa',
        '--accent-primary-hover': '#c084fc',
        '--accent-secondary': '#fbbf24',
        '--accent-muted': 'rgba(76,29,149,0.15)',
        '--border-subtle': '#282340',
        '--border-strong': '#a78bfa',
        '--status-success': '#22c55e',
        '--status-warning': '#f59e0b',
        '--status-danger': '#ef4444',
        '--shadow-card': '0 1px 3px 0 rgba(0,0,0,0.3)',
        '--shadow-elevated': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.25)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(0,0,0,0.35)',
      },
    },
  },
  // ── Studio ─────────────────────────────────────────────────────
  // Forest green primary, blush-pink highlights, deep forest dark mode
  // DWDC brand identity
  {
    id: 'dwdc',
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
        '--surface-primary': '#f4f7f5',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#eaf0ec',
        '--surface-inset': '#eaf0ec',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#f0fdf4',
        '--text-primary': '#0e1410',
        '--text-secondary': '#5e7668',
        '--text-tertiary': '#88a090',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#2d6a4f',
        '--accent-primary-hover': '#22c55e',
        '--accent-secondary': '#db2777',
        '--accent-muted': '#f0f7f3',
        '--border-subtle': '#d8e2dc',
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
  // ── Electric ───────────────────────────────────────────────────
  // Hot coral primary, true black neutrals, lime-green accent
  // Maximum contrast in both modes
  {
    id: 'neon',
    name: 'Electric',
    preview: { primary: '#f43f5e', neutral: '#1c1c27', accent: '#a3e635' },
    colors: {
      forest: {
        '50': '#fff1f2', '100': '#ffe4e8', '200': '#fecdd3', '300': '#fda4af',
        '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
        '800': '#9f1239', '900': '#881337',
      },
      blush: {
        '50': '#f5f5f5', '100': '#e8e8e8', '200': '#d0d0d0', '300': '#a8a8a8',
        '400': '#6b6b6b', '500': '#4a4a4a', '600': '#333333', '700': '#252525',
        '800': '#171717', '900': '#0a0a0a',
      },
      pop: {
        '50': '#f7fee7', '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264',
        '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f',
        '800': '#3f6212', '900': '#365314',
      },
    },
    semantics: {
      light: {
        '--surface-primary': '#f5f5f5',
        '--surface-card': '#ffffff',
        '--surface-card-hover': '#e8e8e8',
        '--surface-inset': '#e8e8e8',
        '--surface-elevated': '#ffffff',
        '--surface-highlight': '#fff1f2',
        '--text-primary': '#0a0a0a',
        '--text-secondary': '#4a4a4a',
        '--text-tertiary': '#6b6b6b',
        '--text-on-accent': '#ffffff',
        '--accent-primary': '#f43f5e',
        '--accent-primary-hover': '#e11d48',
        '--accent-secondary': '#84cc16',
        '--accent-muted': '#fff1f2',
        '--border-subtle': '#d0d0d0',
        '--border-strong': '#fb7185',
        '--status-success': '#84cc16',
        '--status-warning': '#f59e0b',
        '--status-danger': '#e11d48',
        '--shadow-card': '0 1px 3px 0 rgba(10,10,10,0.08), 0 1px 2px -1px rgba(10,10,10,0.06)',
        '--shadow-elevated': '0 10px 15px -3px rgba(10,10,10,0.12), 0 4px 6px -4px rgba(10,10,10,0.08)',
        '--shadow-card-hover': '0 4px 6px -1px rgba(10,10,10,0.1), 0 2px 4px -2px rgba(10,10,10,0.06)',
      },
      dark: {
        '--surface-primary': '#0a0a0a',
        '--surface-card': '#141414',
        '--surface-card-hover': '#1e1e1e',
        '--surface-inset': '#050505',
        '--surface-elevated': '#141414',
        '--surface-highlight': 'rgba(136,19,55,0.2)',
        '--text-primary': '#e8e8e8',
        '--text-secondary': '#6b6b6b',
        '--text-tertiary': '#4a4a4a',
        '--text-on-accent': '#0a0a0a',
        '--accent-primary': '#fb7185',
        '--accent-primary-hover': '#fda4af',
        '--accent-secondary': '#a3e635',
        '--accent-muted': 'rgba(136,19,55,0.15)',
        '--border-subtle': '#1e1e1e',
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
