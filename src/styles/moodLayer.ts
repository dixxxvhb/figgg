/**
 * Mood-responsive theming layer for FIG
 *
 * Adjusts CSS custom properties on top of the active theme based on:
 * 1. Mood — from latest AI check-in (stressed, tired, energized, low, anxious, excited, focused)
 * 2. Time of day — morning warmth → afternoon neutral → evening cool
 * 3. Activity state — teaching, prepping, off-day, done
 *
 * Uses color-mix() to gently tint existing theme colors rather than replacing them.
 * Falls back gracefully when no mood data exists — base theme stays untouched.
 */

export type MoodSignal =
  | 'stressed' | 'tired' | 'low' | 'anxious'
  | 'energized' | 'excited' | 'focused'
  | 'neutral' | undefined;

export type ActivityState = 'teaching' | 'prepping' | 'done' | 'off' | 'idle';

interface MoodLayerConfig {
  surfaceTint: string;
  surfaceTintAmount: number;
  accentIntensity: number;
  shadowIntensity: number;
  borderOpacity: number;
  ambientGlow: string;
}

const MOOD_CONFIGS: Record<string, Partial<MoodLayerConfig>> = {
  stressed: {
    surfaceTint: '#fef3c7',
    surfaceTintAmount: 8,
    accentIntensity: 0.8,
    shadowIntensity: 0.6,
    borderOpacity: 0.6,
    ambientGlow: 'rgba(251, 191, 36, 0.06)',
  },
  tired: {
    surfaceTint: '#e0e7ff',
    surfaceTintAmount: 6,
    accentIntensity: 0.75,
    shadowIntensity: 0.5,
    borderOpacity: 0.5,
    ambientGlow: 'rgba(165, 180, 252, 0.05)',
  },
  low: {
    surfaceTint: '#fce7f3',
    surfaceTintAmount: 5,
    accentIntensity: 0.8,
    shadowIntensity: 0.6,
    borderOpacity: 0.6,
    ambientGlow: 'rgba(244, 114, 182, 0.04)',
  },
  anxious: {
    surfaceTint: '#d1fae5',
    surfaceTintAmount: 6,
    accentIntensity: 0.85,
    shadowIntensity: 0.6,
    borderOpacity: 0.6,
    ambientGlow: 'rgba(52, 211, 153, 0.05)',
  },
  energized: {
    surfaceTint: '#fef3c7',
    surfaceTintAmount: 4,
    accentIntensity: 1.15,
    shadowIntensity: 1.1,
    borderOpacity: 1.0,
    ambientGlow: 'rgba(251, 191, 36, 0.08)',
  },
  excited: {
    surfaceTint: '#fce7f3',
    surfaceTintAmount: 5,
    accentIntensity: 1.2,
    shadowIntensity: 1.1,
    borderOpacity: 1.0,
    ambientGlow: 'rgba(244, 114, 182, 0.08)',
  },
  focused: {
    surfaceTint: '#f0f9ff',
    surfaceTintAmount: 3,
    accentIntensity: 1.05,
    shadowIntensity: 0.8,
    borderOpacity: 0.8,
    ambientGlow: 'rgba(59, 130, 246, 0.04)',
  },
};

function getTimeOfDayTint(hour: number): { tint: string; amount: number; glow: string } {
  if (hour >= 5 && hour < 10) {
    return { tint: '#fef3c7', amount: 4, glow: 'rgba(251, 191, 36, 0.05)' };
  }
  if (hour >= 10 && hour < 16) {
    return { tint: 'transparent', amount: 0, glow: 'transparent' };
  }
  if (hour >= 16 && hour < 20) {
    return { tint: '#fed7aa', amount: 3, glow: 'rgba(251, 146, 60, 0.04)' };
  }
  return { tint: '#e0e7ff', amount: 5, glow: 'rgba(165, 180, 252, 0.06)' };
}

function getActivityAdjustment(activity: ActivityState): Partial<MoodLayerConfig> {
  switch (activity) {
    case 'teaching':
      return { shadowIntensity: 0.7, borderOpacity: 0.6, accentIntensity: 1.1 };
    case 'prepping':
      return { accentIntensity: 1.05 };
    case 'done':
      return { accentIntensity: 0.85, shadowIntensity: 0.6, borderOpacity: 0.7 };
    case 'off':
      return { shadowIntensity: 0.7, borderOpacity: 0.7 };
    default:
      return {};
  }
}

const MOOD_LAYER_KEY = 'figgg-mood-layer';
const MOOD_LAYER_DATE_KEY = 'figgg-mood-layer-date';

export function applyMoodLayer(
  mood: MoodSignal,
  hour: number,
  activity: ActivityState = 'idle',
): void {
  const root = document.documentElement;

  const base: MoodLayerConfig = {
    surfaceTint: 'transparent',
    surfaceTintAmount: 0,
    accentIntensity: 1.0,
    shadowIntensity: 1.0,
    borderOpacity: 1.0,
    ambientGlow: 'transparent',
  };

  const moodConfig = mood ? MOOD_CONFIGS[mood] || {} : {};
  Object.assign(base, moodConfig);

  const timeConfig = getTimeOfDayTint(hour);
  if (!mood && timeConfig.amount > 0) {
    base.surfaceTint = timeConfig.tint;
    base.surfaceTintAmount = timeConfig.amount;
  }
  if (base.ambientGlow === 'transparent' && timeConfig.glow !== 'transparent') {
    base.ambientGlow = timeConfig.glow;
  }

  const activityConfig = getActivityAdjustment(activity);
  if (activityConfig.accentIntensity) base.accentIntensity *= activityConfig.accentIntensity;
  if (activityConfig.shadowIntensity) base.shadowIntensity *= activityConfig.shadowIntensity;
  if (activityConfig.borderOpacity) base.borderOpacity *= activityConfig.borderOpacity;

  base.surfaceTintAmount = Math.min(15, Math.max(0, base.surfaceTintAmount));
  base.accentIntensity = Math.min(1.3, Math.max(0.6, base.accentIntensity));
  base.shadowIntensity = Math.min(1.3, Math.max(0.3, base.shadowIntensity));
  base.borderOpacity = Math.min(1.0, Math.max(0.3, base.borderOpacity));

  if (base.surfaceTintAmount > 0 && base.surfaceTint !== 'transparent') {
    root.style.setProperty(
      '--mood-surface-tint',
      `color-mix(in srgb, ${base.surfaceTint} ${base.surfaceTintAmount}%, var(--surface-primary))`
    );
  } else {
    root.style.setProperty('--mood-surface-tint', 'var(--surface-primary)');
  }

  root.style.setProperty('--mood-accent-intensity', String(base.accentIntensity));
  root.style.setProperty('--mood-shadow-intensity', String(base.shadowIntensity));
  root.style.setProperty('--mood-border-opacity', String(base.borderOpacity));
  root.style.setProperty('--mood-ambient-glow', base.ambientGlow);

  const today = new Date().toISOString().slice(0, 10);
  try {
    sessionStorage.setItem(MOOD_LAYER_KEY, JSON.stringify({ mood, hour, activity }));
    sessionStorage.setItem(MOOD_LAYER_DATE_KEY, today);
  } catch {
    // sessionStorage unavailable
  }
}

export function restoreMoodLayer(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cachedDate = sessionStorage.getItem(MOOD_LAYER_DATE_KEY);
    if (cachedDate !== today) return;

    const cached = sessionStorage.getItem(MOOD_LAYER_KEY);
    if (!cached) return;

    const { mood, activity } = JSON.parse(cached);
    const currentHour = new Date().getHours();
    applyMoodLayer(mood, currentHour, activity);
  } catch {
    // Corrupted cache
  }
}

export function clearMoodLayer(): void {
  const root = document.documentElement;
  root.style.setProperty('--mood-surface-tint', 'var(--surface-primary)');
  root.style.setProperty('--mood-accent-intensity', '1');
  root.style.setProperty('--mood-shadow-intensity', '1');
  root.style.setProperty('--mood-border-opacity', '1');
  root.style.setProperty('--mood-ambient-glow', 'transparent');

  try {
    sessionStorage.removeItem(MOOD_LAYER_KEY);
    sessionStorage.removeItem(MOOD_LAYER_DATE_KEY);
  } catch {
    // no-op
  }
}
