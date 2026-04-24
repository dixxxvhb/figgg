// dx theme — single source of truth for Figgg's visual identity.
// Cobalt on near-black, Monaspace Neon/Argon, terminal vibe.
// See /DESIGN.md for the full spec.

export const DX_ACCENT_PRESETS = {
  cobalt:        { base: '#4F9DFF', bright: '#7FB8FF', dim: '#3E7DCC', onLight: '#1E55B3' },
  azure:         { base: '#3B82F6', bright: '#60A5FA', dim: '#2563EB', onLight: '#1D4ED8' },
  ultramarine:   { base: '#6366F1', bright: '#818CF8', dim: '#4F46E5', onLight: '#3730A3' },
  periwinkle:    { base: '#8B9DFF', bright: '#B4BEFF', dim: '#6875E0', onLight: '#4B56B3' },
  'teal-cobalt': { base: '#4FC1FF', bright: '#7FD4FF', dim: '#3EA7CC', onLight: '#1E73B3' },
} as const;

export type DxAccentId = keyof typeof DX_ACCENT_PRESETS;

export const DX_DARK = {
  bg:          '#0b0b0d',
  elevated:    '#13131a',
  bgDawn:      '#0b0e18',
  bgEvening:   '#0d0b0e',
  bgNight:     '#08080a',
  text1:       '#FAFAFA',
  text2:       '#D4D4D4',
  text3:       '#A3A3A3',
  text4:       '#525252',
  warn:        '#FB923C',
  error:       '#EF4444',
  dwdTerracotta: '#C8614B',
  tamaraGold:  '#E2B955',
  borderDim:   'rgba(255,255,255,0.06)',
} as const;

export const DX_LIGHT = {
  bg:          '#FAFAF8',
  elevated:    '#FFFFFF',
  bgDawn:      '#FFF8EC',
  bgEvening:   '#FDF1EA',
  bgNight:     '#F0EEEC',
  text1:       '#0B0B0D',
  text2:       '#262626',
  text3:       '#525252',
  text4:       '#A3A3A3',
  warn:        '#CA6510',
  error:       '#B91C1C',
  dwdTerracotta: '#C8614B',
  tamaraGold:  '#B8973C',
  borderDim:   'rgba(0,0,0,0.08)',
} as const;

export type AmbientWindow = 'dawn' | 'day' | 'evening' | 'night';

export function getAmbientWindow(now: Date = new Date()): AmbientWindow {
  const h = now.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

interface AmbientShift {
  borderColor: string;
  accentColor: string;
  bg: string;
}

export function ambientShift(
  window: AmbientWindow,
  accentId: DxAccentId,
  mode: 'dark' | 'light'
): AmbientShift {
  const preset = DX_ACCENT_PRESETS[accentId];
  const palette = mode === 'dark' ? DX_DARK : DX_LIGHT;

  // Convert #rrggbb to "r, g, b" for rgba construction
  const rgb = hexToRgb(mode === 'dark' ? preset.base : preset.onLight);

  switch (window) {
    case 'dawn':
      return {
        borderColor: `rgba(${rgb}, ${mode === 'dark' ? 0.35 : 0.25})`,
        accentColor: mode === 'dark' ? preset.bright : preset.onLight,
        bg: palette.bgDawn,
      };
    case 'day':
      return {
        borderColor: `rgba(${rgb}, ${mode === 'dark' ? 0.25 : 0.18})`,
        accentColor: mode === 'dark' ? preset.base : preset.onLight,
        bg: palette.bg,
      };
    case 'evening':
      return {
        borderColor: `rgba(${rgb}, ${mode === 'dark' ? 0.20 : 0.15})`,
        accentColor: mode === 'dark' ? preset.base : preset.onLight,
        bg: palette.bgEvening,
      };
    case 'night':
      return {
        borderColor: `rgba(${rgb}, ${mode === 'dark' ? 0.15 : 0.10})`,
        accentColor: mode === 'dark' ? preset.dim : preset.onLight,
        bg: palette.bgNight,
      };
  }
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export const DX_FONT_STACK = {
  mono: `"Monaspace Neon", "IBM Plex Mono", Monaco, monospace`,
  body: `"Monaspace Argon", "IBM Plex Mono", Monaco, monospace`,
} as const;

export const DX_ACCENT_LABELS: Record<DxAccentId, string> = {
  cobalt:        'cobalt',
  azure:         'azure',
  ultramarine:   'ultramarine',
  periwinkle:    'periwinkle',
  'teal-cobalt': 'teal',
};
