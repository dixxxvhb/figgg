import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Pill,
  Timer,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { isPast, startOfDay, parseISO } from 'date-fns';
import { formatTimeDisplay, formatDuration, timeToMinutes } from '../../utils/time';
import { haptic } from '../../utils/haptics';
import { callAIChat } from '../../services/ai';
import { buildFullAIContext } from '../../services/aiContext';
import type { Class, Reminder, CurrentClassInfo, CalendarEvent, AppData } from '../../types';
import type { SelfCareStatus } from '../../hooks/useSelfCareStatus';

interface NextUpInfo {
  type: 'class' | 'event' | 'during';
  name: string;
  startMinutes?: number;
  timeRemaining?: number;
  timeUntilStart?: number;
}

interface MorningBriefingProps {
  todayClasses: Class[];
  todayCalendarEvents: CalendarEvent[];
  selfCareStatus: SelfCareStatus;
  classInfo: CurrentClassInfo;
  nextUpInfo: NextUpInfo | null;
  reminders: Reminder[];
  skippedDoseDate?: string | null;
  onLogDose?: () => void;
  canLogDose?: boolean;
  dayPlanProgress?: { done: number; total: number } | null;
  data: AppData;
}

export function MorningBriefing({
  todayClasses,
  todayCalendarEvents,
  selfCareStatus,
  classInfo,
  nextUpInfo,
  reminders,
  skippedDoseDate,
  onLogDose,
  canLogDose,
  dayPlanProgress,
  data,
}: MorningBriefingProps) {
  const [justLogged, setJustLogged] = useState(false);

  // AI-generated morning briefing text (cached per day in sessionStorage)
  const [briefingText, setBriefingText] = useState<string | null>(() => {
    const cached = sessionStorage.getItem('figgg-briefing-text');
    const cachedDate = sessionStorage.getItem('figgg-briefing-date');
    const today = new Date().toISOString().slice(0, 10);
    return cachedDate === today ? cached : null;
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cachedDate = sessionStorage.getItem('figgg-briefing-date');
    if (cachedDate === today || briefingText) return;

    let cancelled = false;
    (async () => {
      try {
        const context = buildFullAIContext(data, 'morning briefing');
        const result = await callAIChat({
          mode: 'briefing',
          userMessage: 'Generate my morning briefing',
          context,
        });
        if (!cancelled && result.briefing) {
          setBriefingText(result.briefing);
          sessionStorage.setItem('figgg-briefing-text', result.briefing);
          sessionStorage.setItem('figgg-briefing-date', today);
        }
      } catch {
        // Silent fail — static briefing is fine
      }
    })();
    return () => { cancelled = true; };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickLogDose = () => {
    if (!onLogDose || !canLogDose) return;
    onLogDose();
    haptic('medium');
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  };
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const totalItems = todayClasses.length + todayCalendarEvents.length;

  const firstItemTime = useMemo(() => {
    const times: string[] = [
      ...todayClasses.map(c => c.startTime),
      ...todayCalendarEvents.map(e => e.startTime),
    ];
    if (times.length === 0) return null;
    return times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b))[0];
  }, [todayClasses, todayCalendarEvents]);

  const countdownInfo = useMemo(() => {
    if (totalItems === 0) return { text: 'Off', sub: 'No classes', color: 'text-[var(--text-secondary)]' };
    if (!nextUpInfo) return { text: 'Done', sub: `${totalItems} today`, color: 'text-[var(--status-success)]' };
    if (nextUpInfo.type === 'during') {
      return { text: `${nextUpInfo.timeRemaining}m`, sub: 'remaining', color: 'text-[var(--status-success)]' };
    }
    if (nextUpInfo.type === 'class' && nextUpInfo.timeUntilStart !== undefined) {
      return { text: formatDuration(nextUpInfo.timeUntilStart), sub: 'until next', color: 'text-[var(--accent-primary)]' };
    }
    if (nextUpInfo.startMinutes !== undefined) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const minutesUntil = nextUpInfo.startMinutes - currentMinutes;
      return { text: formatDuration(Math.max(0, minutesUntil)), sub: 'until next', color: 'text-[var(--accent-primary)]' };
    }
    return { text: 'Done', sub: `${totalItems} today`, color: 'text-[var(--text-secondary)]' };
  }, [totalItems, nextUpInfo]);

  const medsInfo = useMemo(() => {
    const isSkipped = skippedDoseDate === todayStr;
    if (isSkipped) return { text: 'Skip', color: 'text-[var(--text-tertiary)]' };
    const statusPriority: Record<string, number> = { 'Peak Window': 4, 'Building': 3, 'Wearing Off': 2, 'Tapering': 2, 'Expired': 1 };
    // Find the best (most active) dose status across all taken doses
    const activeDoses: Array<{ status: string | null }> = [];
    if (selfCareStatus.dose1Active) activeDoses.push({ status: selfCareStatus.dose1Status });
    if (selfCareStatus.dose2Active) activeDoses.push({ status: selfCareStatus.dose2Status });
    if (selfCareStatus.dose3Active) activeDoses.push({ status: selfCareStatus.dose3Status });
    if (activeDoses.length > 0) {
      const best = activeDoses.reduce((a, b) =>
        (statusPriority[b.status || ''] || 0) >= (statusPriority[a.status || ''] || 0) ? b : a
      );
      return { text: best.status || '—', color: getDoseColor(best.status) };
    }
    return { text: 'None', color: 'text-[var(--status-warning)]' };
  }, [selfCareStatus, skippedDoseDate, todayStr]);

  const alerts = useMemo(() => {
    const items: Array<{ text: string; color: string; bg: string; to: string }> = [];
    const overdueCount = reminders.filter(
      r => !r.completed && r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr
    ).length;
    if (overdueCount > 0) {
      items.push({
        text: `${overdueCount} overdue`,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        to: '/me?tab=reminders',
      });
    }
    const todayDueCount = reminders.filter(r => !r.completed && r.dueDate === todayStr).length;
    if (todayDueCount > 0) {
      items.push({ text: `${todayDueCount} due today`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', to: '/me?tab=reminders' });
    }
    if (selfCareStatus.dose2Window) {
      const w = selfCareStatus.dose2Window;
      if (w.closing) items.push({ text: 'D2 window closing', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', to: '/me' });
      else if (w.active) items.push({ text: 'Time for dose 2', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', to: '/me' });
      else if (w.approaching) items.push({ text: 'D2 window soon', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', to: '/me' });
    }
    if (selfCareStatus.dose3Window) {
      const w = selfCareStatus.dose3Window;
      if (w.closing) items.push({ text: 'D3 window closing', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', to: '/me' });
      else if (w.active) items.push({ text: 'Time for dose 3', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', to: '/me' });
      else if (w.approaching) items.push({ text: 'D3 window soon', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', to: '/me' });
    }
    return items;
  }, [reminders, todayStr, selfCareStatus.dose2Window, selfCareStatus.dose3Window]);

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* ── AI Briefing Text ── */}
      {briefingText && (
        <div className="px-4 pt-3.5 pb-1">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {briefingText}
          </p>
        </div>
      )}
      {/* ── 3-column stat row with large serif numbers ── */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)]">
        {/* Classes */}
        <Link to="/schedule" className="p-3.5 bg-[var(--accent-muted)] hover:opacity-90 transition-colors text-center">
          <div className="type-label text-[var(--text-tertiary)] mb-1">
            Classes
          </div>
          <div className="type-stat text-[var(--text-primary)] leading-none">
            {totalItems}
          </div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1 truncate">
            {firstItemTime ? `First ${formatTimeDisplay(firstItemTime)}` : 'None'}
          </div>
        </Link>

        {/* Meds */}
        {canLogDose && !justLogged ? (
          <button onClick={handleQuickLogDose} className="p-3.5 bg-[var(--accent-muted)] hover:opacity-90 transition-colors text-center active:scale-95">
            <div className="type-label text-purple-400 dark:text-purple-500 mb-1">
              Tap to log
            </div>
            <div className={`text-lg font-display ${medsInfo.color} leading-none`}>{medsInfo.text}</div>
          </button>
        ) : justLogged ? (
          <div className="p-3.5 bg-[var(--accent-muted)] text-center">
            <div className="type-label text-[var(--status-success)] mb-1">Logged</div>
            <div className="type-stat text-[var(--status-success)] leading-none"><Check size={24} className="mx-auto" /></div>
          </div>
        ) : (
          <Link to="/me" className="p-3.5 bg-[var(--accent-muted)] hover:opacity-90 transition-colors text-center">
            <div className="type-label text-[var(--text-tertiary)] mb-1">Meds</div>
            <div className={`text-lg font-display ${medsInfo.color} leading-none`}>{medsInfo.text}</div>
          </Link>
        )}

        {/* Countdown */}
        <div className="p-3.5 bg-[var(--accent-muted)] text-center">
          <div className="type-label text-[var(--text-tertiary)] mb-1">
            {nextUpInfo?.type === 'during' ? 'Live' : 'Next'}
          </div>
          <div className={`type-stat ${countdownInfo.color} leading-none`}>
            {countdownInfo.text}
          </div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1 truncate">
            {countdownInfo.sub}
          </div>
        </div>
      </div>

      {/* Alerts + Day Plan Progress */}
      {(alerts.length > 0 || dayPlanProgress) && (
        <div className="px-3.5 py-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
          {alerts.length > 0 && (
            <AlertTriangle size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
          )}
          {alerts.map((alert, i) => (
            <Link key={i} to={alert.to} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${alert.bg} ${alert.color}`}>
              {alert.text}
            </Link>
          ))}
          {dayPlanProgress && dayPlanProgress.total > 0 && (
            <span className="type-label px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)] ml-auto">
              Plan: {dayPlanProgress.done}/{dayPlanProgress.total}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getDoseColor(status: string | null): string {
  switch (status) {
    case 'Building': return 'text-[var(--status-warning)]';
    case 'Peak Window': return 'text-[var(--status-success)]';
    case 'Wearing Off':
    case 'Tapering': return 'text-orange-600 dark:text-orange-400';
    case 'Expired': return 'text-[var(--status-danger)]';
    default: return 'text-[var(--text-secondary)]';
  }
}
