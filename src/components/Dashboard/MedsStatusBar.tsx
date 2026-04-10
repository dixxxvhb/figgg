import { Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelfCareStatus } from '../../hooks/useSelfCareStatus';
import type { SelfCareData, MedConfig } from '../../types';

interface MedsStatusBarProps {
  selfCare: SelfCareData | undefined;
  medConfig: MedConfig;
  onLogDose: () => void;
  canLogDose: boolean;
}

function getStatusDisplay(status: string | null): { text: string; color: string } {
  switch (status) {
    case 'Building': return { text: 'Building', color: 'text-[var(--status-warning)]' };
    case 'Peak Window': return { text: 'Peak Focus', color: 'text-[var(--status-success)]' };
    case 'Wearing Off': return { text: 'Wearing Off', color: 'text-[var(--status-warning)]' };
    case 'Tapering': return { text: 'Tapering', color: 'text-[var(--status-warning)]' };
    case 'Expired': return { text: 'Worn Off', color: 'text-[var(--status-danger)]' };
    default: return { text: 'No meds logged', color: 'text-[var(--text-tertiary)]' };
  }
}

function getTimeAgo(timestamp: number | null | undefined): string | null {
  if (!timestamp) return null;
  const now = Date.now();
  const saved = new Date(timestamp);
  const today = new Date();
  if (saved.getFullYear() !== today.getFullYear() ||
      saved.getMonth() !== today.getMonth() ||
      saved.getDate() !== today.getDate()) return null;
  const mins = Math.floor((now - timestamp) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m ago` : `${hrs}h ago`;
}

export function MedsStatusBar({ selfCare, medConfig, onLogDose, canLogDose }: MedsStatusBarProps) {
  const navigate = useNavigate();
  const status = useSelfCareStatus(selfCare, medConfig);

  const activeDose = status.dose3Active ? { num: 3, status: status.dose3Status }
    : status.dose2Active ? { num: 2, status: status.dose2Status }
    : status.dose1Active ? { num: 1, status: status.dose1Status }
    : null;

  const lastDoseTime = selfCare?.dose3Time || selfCare?.dose2Time || selfCare?.dose1Time;
  const isToday = lastDoseTime && (() => {
    const d = new Date(lastDoseTime);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  })();

  const display = activeDose
    ? getStatusDisplay(activeDose.status)
    : getStatusDisplay(null);

  const timeAgo = isToday ? getTimeAgo(lastDoseTime) : null;

  return (
    <div className="page-container">
      <div
        className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] cursor-pointer active:opacity-80 transition-opacity"
        onClick={() => navigate('/me')}
      >
        <Pill size={16} className={display.color} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${display.color}`}>
            {activeDose ? `Dose ${activeDose.num}: ${display.text}` : display.text}
          </span>
          {timeAgo && (
            <span className="text-xs text-[var(--text-tertiary)] ml-2">{timeAgo}</span>
          )}
        </div>
        {canLogDose && (
          <button
            onClick={(e) => { e.stopPropagation(); onLogDose(); }}
            className="px-3 py-1.5 text-xs font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full active:scale-90 transition-all duration-150 flex-shrink-0"
          >
            Log Dose
          </button>
        )}
      </div>
    </div>
  );
}
