/**
 * medsStatus — shared rendering for dose status. Centralizes the
 * label/color/emphasis logic that used to live duplicated across
 * MedsStatusBar and MedsTracker. Consumed by MedsGlance, Meds page, and
 * any future surface that needs to show the same status.
 */

import type { SelfCareStatus } from '../hooks/useSelfCareStatus';

export type MedsVisualStatus =
  | 'idle'
  | 'building'
  | 'peak'
  | 'wearing-off'
  | 'tapering'
  | 'expired';

export interface MedsStatusDisplay {
  key: MedsVisualStatus;
  label: string;         // short status word for UI (e.g. "Peak window")
  blurb: string;         // supporting line (e.g. "Focused window. Ride it.")
  tone: 'neutral' | 'positive' | 'warning' | 'danger';
  intensity: number;     // 0..1 — drives accent brightness, mood layer push
}

const DISPLAY: Record<MedsVisualStatus, Omit<MedsStatusDisplay, 'key'>> = {
  idle:         { label: 'Not taken',   blurb: 'No dose logged yet',         tone: 'neutral',  intensity: 0.2 },
  building:     { label: 'Building',    blurb: 'Ramping up — give it a few', tone: 'positive', intensity: 0.6 },
  peak:         { label: 'Peak window', blurb: 'Focused window. Ride it.',   tone: 'positive', intensity: 1.0 },
  'wearing-off':{ label: 'Wearing off', blurb: 'Grace period closing',        tone: 'warning',  intensity: 0.5 },
  tapering:     { label: 'Tapering',    blurb: 'Consider dose 2',             tone: 'warning',  intensity: 0.4 },
  expired:      { label: 'Worn off',    blurb: 'Meds wore off',               tone: 'danger',   intensity: 0.2 },
};

/**
 * Map a raw `useSelfCareStatus` dose-status string to a visual status.
 * The hook returns human strings (Building, Peak Window, etc.); this
 * normalizes them into a stable enum for rendering.
 */
export function normalizeRawStatus(raw: string | null | undefined): MedsVisualStatus {
  if (!raw) return 'idle';
  const v = raw.toLowerCase();
  if (v.includes('peak')) return 'peak';
  if (v.includes('build')) return 'building';
  if (v.includes('wearing')) return 'wearing-off';
  if (v.includes('taper')) return 'tapering';
  if (v.includes('expired') || v.includes('worn')) return 'expired';
  return 'idle';
}

/** Pick the highest active dose's status string from useSelfCareStatus. */
export function activeRawStatus(s: SelfCareStatus): string | null {
  if (s.dose3Active) return s.dose3Status;
  if (s.dose2Active) return s.dose2Status;
  if (s.dose1Active) return s.dose1Status;
  return null;
}

export function getMedsDisplay(s: SelfCareStatus): MedsStatusDisplay {
  const key = normalizeRawStatus(activeRawStatus(s));
  return { key, ...DISPLAY[key] };
}

/** Map tone → CSS color variable for text accent. */
export function toneColorVar(tone: MedsStatusDisplay['tone']): string {
  switch (tone) {
    case 'positive': return 'var(--accent-primary)';
    case 'warning':  return 'var(--status-warning)';
    case 'danger':   return 'var(--status-danger)';
    default:         return 'var(--text-secondary)';
  }
}
