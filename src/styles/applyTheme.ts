import { getTheme } from './themes';

const THEME_MIGRATIONS: Record<string, string> = {
  forest: 'stone',
  sunset: 'stone',
  rose: 'stone',
  clay: 'stone',
  dusk: 'stone',
  plum: 'vapor',
  midnight: 'ocean',
  neon: 'crimson',
  solar: 'crimson',
  arctic: 'ocean',
  pride: 'candy',
  mono: 'noir',
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

// ── Custom font/accent color overrides ──────────────────────────

const ACCENT_PROPS = [
  '--text-primary',
  '--accent-primary',
  '--accent-primary-hover',
  '--border-strong',
] as const;

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(255 * percent / 100));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export function applyAccentOverride(hex: string): void {
  const root = document.documentElement;
  root.style.setProperty('--text-primary', hex);
  root.style.setProperty('--accent-primary', hex);
  root.style.setProperty('--accent-primary-hover', lighten(hex, 15));
  root.style.setProperty('--border-strong', hex);
}

export function clearAccentOverride(): void {
  const root = document.documentElement;
  for (const prop of ACCENT_PROPS) {
    root.style.removeProperty(prop);
  }
}

// ── Font family overrides ──────────────────────────────────────

export const FONT_FAMILIES: Record<string, { display: string; body: string; label: string }> = {
  editorial: { display: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif", label: 'Editorial' },
  modern: { display: "'Outfit', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", label: 'Modern' },
  classic: { display: "'Playfair Display', Georgia, serif", body: "'Lora', Georgia, serif", label: 'Classic' },
  clean: { display: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", label: 'Clean' },
  dramatic: { display: "'Bebas Neue', Impact, sans-serif", body: "'Outfit', system-ui, sans-serif", label: 'Dramatic' },
  handwritten: { display: "'Caveat', cursive", body: "'Inter', system-ui, sans-serif", label: 'Handwritten' },
};

export function applyFontFamily(id: string): void {
  const combo = FONT_FAMILIES[id] || FONT_FAMILIES.editorial;
  const root = document.documentElement;
  root.style.setProperty('--font-display', combo.display);
  root.style.setProperty('--font-body', combo.body);
}
