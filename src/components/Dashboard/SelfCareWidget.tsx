import { Link } from 'react-router-dom';
import { Pill, Flame, ChevronRight, Zap, Sun, Target, Sunset, Moon } from 'lucide-react';
import type { SelfCareStatus } from '../../hooks/useSelfCareStatus';

interface SelfCareWidgetProps {
  status: SelfCareStatus;
}

const SESSION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'morning-wake': Sun,
  'peak-focus': Target,
  'midday-recharge': Zap,
  'afternoon-push': Target,
  'evening-wind': Sunset,
  'pre-sleep': Moon,
};

export function SelfCareWidget({ status }: SelfCareWidgetProps) {
  const SessionIcon = SESSION_ICONS[status.currentSessionKey] || Zap;

  return (
    <Link
      to="/me"
      className="block bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden shadow-sm"
    >
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800 dark:text-white flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          My Timeline
        </h3>
        <ChevronRight size={16} className="text-stone-400" />
      </div>

      <div className="p-4 space-y-3">
        {/* Medication Status Row */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Pill size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            {status.dose1Active ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Dose 1
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getDoseStatusBg(status.dose1Status)}`}>
                  {status.dose1Status}
                </span>
                {status.dose2Active && (
                  <>
                    <span className="text-stone-300 dark:text-stone-600">|</span>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Dose 2</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getDoseStatusBg(status.dose2Status)}`}>
                      {status.dose2Status}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-sm text-stone-500 dark:text-stone-400">No dose logged today</span>
            )}
          </div>
        </div>

        {/* Current Session + Progress */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
            <SessionIcon size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {status.currentSessionTitle}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {status.currentSessionTime}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {status.overallProgress}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${status.overallProgress}%` }}
          />
        </div>

        {/* Bottom Row: Sessions done + Streak */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>{status.completedSessions}/{status.totalSessions} sessions done</span>
          {status.currentStreak > 0 && (
            <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-medium">
              <Flame size={12} />
              {status.currentStreak} day streak
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function getDoseStatusBg(status: string | null): string {
  switch (status) {
    case 'Building': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    case 'Peak Window': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'Wearing Off':
    case 'Tapering': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
    case 'Expired': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    default: return 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400';
  }
}
