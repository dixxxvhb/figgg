import { useState, useMemo, useCallback } from 'react';
import type { ActivityState } from '../styles/moodLayer';

export type DashboardMode = 'morning' | 'prep' | 'post-class' | 'wind-down' | 'off-day' | 'survival' | 'full';

interface ModeConfig {
  label: string;
  widgets: string[];
}

const MODE_CONFIGS: Record<DashboardMode, ModeConfig> = {
  morning: {
    label: 'Morning',
    widgets: ['daily-briefing', 'meds-quick', 'todays-agenda', 'nudges', 'reminders'],
  },
  prep: {
    label: 'Prep',
    widgets: ['todays-agenda', 'meds-quick', 'scratchpad', 'nudges'],
  },
  'post-class': {
    label: 'Post-Class',
    widgets: ['scratchpad', 'todays-agenda', 'meds-quick', 'reminders'],
  },
  'wind-down': {
    label: 'Wind Down',
    widgets: ['week-stats', 'weekly-insight', 'streak', 'reminders', 'scratchpad'],
  },
  'off-day': {
    label: 'Off Day',
    widgets: ['daily-briefing', 'meds-quick', 'reminders', 'launch-plan', 'scratchpad', 'nudges'],
  },
  survival: {
    label: 'Survival',
    widgets: ['meds-quick', 'scratchpad'],
  },
  full: {
    label: 'Full',
    widgets: [], // empty = show all (handled in consumer)
  },
};

const ALL_MODES: { id: DashboardMode; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'prep', label: 'Prep' },
  { id: 'post-class', label: 'Post-Class' },
  { id: 'wind-down', label: 'Wind Down' },
  { id: 'off-day', label: 'Off Day' },
  { id: 'survival', label: 'Survival' },
  { id: 'full', label: 'Full' },
];

/**
 * Compute auto mode from context signals.
 * Priority: survival > prep > post-class > morning/wind-down/off-day
 */
function computeAutoMode(
  activityState: ActivityState,
  hour: number,
  wellnessMode: string | undefined,
  hasJustEndedClass: boolean,
  allClassesDone: boolean,
): DashboardMode {
  // 1. Survival overrides everything
  if (wellnessMode === 'survival') return 'survival';

  // 2. Prep — class within 60 min
  if (activityState === 'prepping') return 'prep';

  // 3. Post-class — just ended, capture window
  if (hasJustEndedClass) return 'post-class';

  // 4. Off day — no classes at all today
  if (activityState === 'off') {
    // Morning on off day
    if (hour < 9) return 'morning';
    // Evening on off day
    if (hour >= 19) return 'wind-down';
    return 'off-day';
  }

  // 5. All classes done for the day
  if (allClassesDone || activityState === 'done') {
    return hour >= 19 ? 'wind-down' : 'wind-down';
  }

  // 6. Time-based defaults (has classes but none imminent)
  if (hour < 9) return 'morning';
  if (hour >= 19) return 'wind-down';

  // 7. During class or idle with classes ahead — show full
  return 'full';
}

export interface DashboardModeResult {
  mode: DashboardMode;
  modeLabel: string;
  visibleWidgets: string[];
  allModes: { id: DashboardMode; label: string }[];
  setManualMode: (mode: DashboardMode | null) => void;
  isManual: boolean;
  autoMode: DashboardMode;
}

/**
 * Determines which dashboard mode to use and which widgets to show.
 * Mode is auto-computed from context but can be manually overridden (session-only).
 */
export function useDashboardMode(
  activityState: ActivityState,
  hour: number,
  wellnessMode: string | undefined,
  hasJustEndedClass: boolean,
  allClassesDone: boolean,
  allWidgetIds: string[],
): DashboardModeResult {
  const [manualMode, setManualModeState] = useState<DashboardMode | null>(null);

  const autoMode = useMemo(
    () => computeAutoMode(activityState, hour, wellnessMode, hasJustEndedClass, allClassesDone),
    [activityState, hour, wellnessMode, hasJustEndedClass, allClassesDone],
  );

  const mode = manualMode ?? autoMode;
  const config = MODE_CONFIGS[mode];

  const visibleWidgets = useMemo(() => {
    if (mode === 'full' || config.widgets.length === 0) {
      return allWidgetIds;
    }
    // Return mode widgets in mode-defined order, but only if they exist in allWidgetIds
    const validSet = new Set(allWidgetIds);
    return config.widgets.filter(id => validSet.has(id));
  }, [mode, config.widgets, allWidgetIds]);

  const setManualMode = useCallback((m: DashboardMode | null) => {
    setManualModeState(m);
  }, []);

  return {
    mode,
    modeLabel: config.label,
    visibleWidgets,
    allModes: ALL_MODES,
    setManualMode,
    isManual: manualMode !== null,
    autoMode,
  };
}
