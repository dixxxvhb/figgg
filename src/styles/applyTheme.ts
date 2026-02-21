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
