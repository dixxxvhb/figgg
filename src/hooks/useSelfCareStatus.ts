import { useMemo } from 'react';
import type { SelfCareData, MedConfig } from '../types';
import { DEFAULT_MED_CONFIG } from '../types';

function isToday(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

function getDoseStatus(elapsed: number, medType: 'IR' | 'XR', config: MedConfig): string {
  const hours = elapsed / (60 * 60 * 1000);
  if (medType === 'IR') {
    const buildEnd = 1; // building phase always 1h
    if (hours < buildEnd) return 'Building';
    if (hours <= config.irPeakHours) return 'Peak Window';
    if (hours < config.irDurationHours) return 'Wearing Off';
    return 'Expired';
  } else {
    const buildEnd = 4; // XR building phase always 4h
    if (hours < buildEnd) return 'Building';
    if (hours <= config.xrPeakHours) return 'Peak Window';
    if (hours < config.xrDurationHours) return 'Tapering';
    return 'Expired';
  }
}

interface DoseWindow {
  active: boolean;       // true if we're in the optimal window
  approaching: boolean;  // true if we're in the pre-window
  closing: boolean;      // true if window is about to close (urgent)
  hoursElapsed: number;  // hours since the previous dose
}

export interface SelfCareStatus {
  // Medication
  dose1Active: boolean;
  dose1Status: string | null;
  dose2Active: boolean;
  dose2Status: string | null;
  dose3Active: boolean;
  dose3Status: string | null;
  medType: 'IR' | 'XR';
  maxDoses: 2 | 3;
  // Dose 2 window (IR only): when dose 1 taken but not dose 2
  dose2Window: DoseWindow | null;
  // Dose 3 window (IR only, maxDoses=3): when dose 2 taken but not dose 3
  dose3Window: DoseWindow | null;
  // Med projection for class warnings
  projectedStatus: (minutesFromNow: number) => string | null;
}

function calcDoseWindow(
  prevDoseTime: number,
  windowStart: number,
  windowEnd: number,
): DoseWindow | null {
  const now = Date.now();
  const hoursElapsed = (now - prevDoseTime) / (60 * 60 * 1000);
  // Only show window if we're within approach range (1h before start) through end
  if (hoursElapsed >= (windowStart - 1) && hoursElapsed <= windowEnd) {
    return {
      active: hoursElapsed >= windowStart && hoursElapsed <= (windowEnd - 1),
      approaching: hoursElapsed >= (windowStart - 1) && hoursElapsed < windowStart,
      closing: hoursElapsed > (windowEnd - 1),
      hoursElapsed,
    };
  }
  return null;
}

export function useSelfCareStatus(
  selfCare: SelfCareData | undefined,
  medConfig?: MedConfig,
): SelfCareStatus {
  return useMemo(() => {
    const sc = selfCare || {};
    const config = medConfig || DEFAULT_MED_CONFIG;
    const medType = config.medType || sc.medType || 'IR';
    const maxDoses = config.maxDoses || 2;
    const now = Date.now();

    // Medication status
    const dose1Active = isToday(sc.dose1Time);
    const dose1Status = dose1Active ? getDoseStatus(now - sc.dose1Time!, medType, config) : null;
    const dose2Active = isToday(sc.dose2Time);
    const dose2Status = dose2Active ? getDoseStatus(now - sc.dose2Time!, medType, config) : null;
    const dose3Active = isToday(sc.dose3Time);
    const dose3Status = dose3Active ? getDoseStatus(now - sc.dose3Time!, medType, config) : null;

    // Dose 2 window calculation (IR only)
    let dose2Window: DoseWindow | null = null;
    if (dose1Active && !dose2Active && medType === 'IR' && sc.dose1Time) {
      dose2Window = calcDoseWindow(sc.dose1Time, config.dose2WindowStart, config.dose2WindowEnd);
    }

    // Dose 3 window calculation (IR only — always calculated when dose 2 is taken, supports optional dose 3)
    let dose3Window: DoseWindow | null = null;
    if (dose2Active && !dose3Active && medType === 'IR' && sc.dose2Time) {
      dose3Window = calcDoseWindow(sc.dose2Time, config.dose3WindowStart, config.dose3WindowEnd);
    }

    // Project med status forward for class warnings
    const projectedStatus = (minutesFromNow: number): string | null => {
      if (!dose1Active && !dose2Active && !dose3Active) return null;
      const futureMs = now + minutesFromNow * 60 * 1000;
      // Use the most recent active dose
      const activeDoseTime = dose3Active ? sc.dose3Time!
        : dose2Active ? sc.dose2Time!
        : sc.dose1Time!;
      const futureElapsed = futureMs - activeDoseTime;
      return getDoseStatus(futureElapsed, medType, config);
    };

    return {
      dose1Active,
      dose1Status,
      dose2Active,
      dose2Status,
      dose3Active,
      dose3Status,
      medType,
      maxDoses,
      dose2Window,
      dose3Window,
      projectedStatus,
    };
  }, [selfCare, medConfig]);
}
