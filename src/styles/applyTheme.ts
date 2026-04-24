import type { AppSettings } from '../types';
import { applyAppIcon } from './appIcons';
import {
  DX_DARK,
  DX_LIGHT,
  DX_ACCENT_PRESETS,
  DX_FONT_STACK,
  ambientShift,
  getAmbientWindow,
  type DxAccentId,
} from './dxTheme';

const DEFAULT_ACCENT: DxAccentId = 'cobalt';
const DEFAULT_DARK_MODE = true;

// Map legacy AppSettings.themeId values to the dx accent system.
const LEGACY_THEME_TO_ACCENT: Record<string, DxAccentId> = {
  'curtain-call': 'cobalt',
  'stone':        'cobalt',
  'ocean':        'teal-cobalt',
  'dwd':          'cobalt',
  'noir':         'cobalt',
  'candy':        'periwinkle',
  'crimson':      'cobalt',
  'vapor':        'ultramarine',
  'emerald':      'teal-cobalt',
};

function resolveAccent(raw?: string): DxAccentId {
  if (!raw) return DEFAULT_ACCENT;
  if (raw in DX_ACCENT_PRESETS) return raw as DxAccentId;
  return LEGACY_THEME_TO_ACCENT[raw] || DEFAULT_ACCENT;
}

export function applyDxTheme(mode: 'dark' | 'light', accentId: DxAccentId): void {
  const root = document.documentElement;
  const palette = mode === 'dark' ? DX_DARK : DX_LIGHT;
  const ambient = ambientShift(getAmbientWindow(), accentId, mode);
  const preset = DX_ACCENT_PRESETS[accentId];

  // Base dx tokens
  root.style.setProperty('--dx-bg', ambient.bg);
  root.style.setProperty('--dx-elevated', palette.elevated);
  root.style.setProperty('--dx-text-1', palette.text1);
  root.style.setProperty('--dx-text-2', palette.text2);
  root.style.setProperty('--dx-text-3', palette.text3);
  root.style.setProperty('--dx-text-4', palette.text4);
  root.style.setProperty('--dx-warn', palette.warn);
  root.style.setProperty('--dx-error', palette.error);
  root.style.setProperty('--dx-dwd-terracotta', palette.dwdTerracotta);
  root.style.setProperty('--dx-tamara-gold', palette.tamaraGold);
  root.style.setProperty('--dx-border-dim', palette.borderDim);

  // Accent tokens
  root.style.setProperty('--dx-accent', ambient.accentColor);
  root.style.setProperty('--dx-accent-base', preset.base);
  root.style.setProperty('--dx-accent-bright', preset.bright);
  root.style.setProperty('--dx-accent-dim', preset.dim);
  root.style.setProperty('--dx-accent-on-light', preset.onLight);
  root.style.setProperty('--dx-border-active', ambient.borderColor);

  // Legacy-compat mappings so existing CSS referencing --surface-*, --text-*,
  // --accent-* keeps rendering while pages are migrated to dx tokens.
  root.style.setProperty('--surface-primary', ambient.bg);
  root.style.setProperty('--surface-card', palette.elevated);
  root.style.setProperty('--surface-card-hover', palette.elevated);
  root.style.setProperty('--surface-inset', palette.bg);
  root.style.setProperty('--surface-elevated', palette.elevated);
  root.style.setProperty('--surface-highlight', palette.borderDim);
  root.style.setProperty('--text-primary', palette.text1);
  root.style.setProperty('--text-secondary', palette.text2);
  root.style.setProperty('--text-tertiary', palette.text3);
  root.style.setProperty('--text-on-accent', mode === 'dark' ? palette.bg : palette.text1);
  root.style.setProperty('--accent-primary', ambient.accentColor);
  root.style.setProperty('--accent-primary-hover', preset.bright);
  root.style.setProperty('--accent-secondary', palette.text3);
  root.style.setProperty('--accent-muted',
    mode === 'dark'
      ? `rgba(${hexToRgb(preset.base)}, 0.18)`
      : `rgba(${hexToRgb(preset.onLight)}, 0.12)`
  );
  root.style.setProperty('--border-subtle', palette.borderDim);
  root.style.setProperty('--border-strong', ambient.accentColor);
  root.style.setProperty('--status-success', mode === 'dark' ? '#4ADE80' : '#15803D');
  root.style.setProperty('--status-warning', palette.warn);
  root.style.setProperty('--status-danger', palette.error);
  root.style.setProperty('--shadow-card', 'none');
  root.style.setProperty('--shadow-elevated', 'none');
  root.style.setProperty('--shadow-card-hover', 'none');

  // Font stack
  root.style.setProperty('--font-display', DX_FONT_STACK.mono);
  root.style.setProperty('--font-body', DX_FONT_STACK.body);

  // Neutralize mood-layer CSS vars that lingering components may still read.
  root.style.setProperty('--mood-surface-tint', ambient.bg);
  root.style.setProperty('--mood-accent-intensity', '1');
  root.style.setProperty('--mood-shadow-intensity', '1');
  root.style.setProperty('--mood-border-opacity', '1');
  root.style.setProperty('--mood-ambient-glow', 'transparent');

  // data attribute for any CSS that wants to branch on dx mode
  root.dataset.dxMode = mode;
  root.dataset.dxAmbient = getAmbientWindow();
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function applyVisualSettings(settings?: Partial<AppSettings>): void {
  const root = document.documentElement;
  const darkMode = settings?.darkMode ?? DEFAULT_DARK_MODE;
  const accentId = resolveAccent((settings as { accentId?: string } | undefined)?.accentId || settings?.themeId);

  switch (settings?.fontSize) {
    case 'large':
      root.style.fontSize = '18px';
      break;
    case 'extra-large':
      root.style.fontSize = '20px';
      break;
    default:
      root.style.fontSize = '16px';
  }

  root.classList.toggle('dark', darkMode);
  applyDxTheme(darkMode ? 'dark' : 'light', accentId);

  applyAppIcon(settings?.appIconId || 'dx');
}

// Legacy exports kept as no-ops so existing imports don't break mid-migration.
// Args accepted but ignored — dx is the single theme.
export function applyTheme(_themeId?: string, _isDark?: boolean): void { /* no-op under dx */ }
export function applyAccentOverride(_hex?: string): void { /* no-op under dx */ }
export function clearAccentOverride(): void { /* no-op under dx */ }
export function applyFontFamily(_id?: string): void { /* no-op under dx */ }
export const FONT_FAMILIES: Record<string, { display: string; body: string; label: string }> = {
  dx: { display: DX_FONT_STACK.mono, body: DX_FONT_STACK.body, label: 'dx' },
};
