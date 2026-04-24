import { useMemo, useCallback } from 'react';
import { useAppData } from '../contexts/AppDataContext';

export type EnergyMode = 'low' | 'high' | 'auto';

const CYCLE: Record<EnergyMode, EnergyMode> = {
  auto: 'high',
  high: 'low',
  low: 'auto',
};

// Low = hero + river only. High = full composition.
// Auto = infers from mood trend + hour of day.
export function useEnergyMode(): {
  mode: EnergyMode;
  effective: 'low' | 'high';
  cycle: () => void;
} {
  const { data, updateSettings } = useAppData();
  const mode: EnergyMode = (data.settings?.energyMode as EnergyMode) || 'auto';

  const effective: 'low' | 'high' = useMemo(() => {
    if (mode === 'low') return 'low';
    if (mode === 'high') return 'high';
    // auto: infer from mood trend + time of day
    const now = new Date();
    const h = now.getHours();
    if (h >= 21 || h < 6) return 'low';
    const recent = (data.learningData?.dailySnapshots || []).slice(-6);
    if (recent.length < 6) return 'high';
    const half = recent.length / 2;
    const score = (m?: string) => ({ focused: 5, energized: 5, excited: 5, neutral: 3, okay: 3, anxious: 2, stressed: 2, tired: 1, low: 1 } as Record<string, number>)[m?.toLowerCase() || ''] ?? 3;
    const prior = recent.slice(0, half).map((s) => score(s.mood)).reduce((a, b) => a + b, 0) / half;
    const latest = recent.slice(half).map((s) => score(s.mood)).reduce((a, b) => a + b, 0) / half;
    return latest < prior ? 'low' : 'high';
  }, [mode, data.learningData]);

  const cycle = useCallback(() => {
    const next = CYCLE[mode];
    updateSettings({ energyMode: next });
  }, [mode, updateSettings]);

  return { mode, effective, cycle };
}
