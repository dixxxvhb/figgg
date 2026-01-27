import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Pill, Clock, Sun, Target, Zap, Sunset, Moon,
  Plus, Settings2, Pencil, Trash2, Check, ChevronDown, ChevronUp,
  Flame, Trophy, Droplets, Egg, Apple, Salad, Utensils, Footprints,
  TreePine, Brain, Sparkles, ClipboardList, Briefcase, Calendar,
  Bath, Award, Crown, Gem, type LucideIcon
} from 'lucide-react';
import { loadData, saveData } from '../services/storage';
import { useSmartTasks } from '../hooks/useSmartTasks';
import type { ADHDSessions, ADHDTaskStates, ADHDStreakData, SelfCareData } from '../types';

// ============ DEFAULT SESSIONS ============
const DEFAULT_SESSIONS: ADHDSessions = {
  'morning-wake': {
    title: 'Wake Up',
    timeRange: '10:00 AM',
    tasks: ['Take Adderall with water', 'Eat protein breakfast', 'Hydrate (16oz water)', 'Natural light exposure']
  },
  'peak-focus': {
    title: 'Peak Focus Window',
    timeRange: '11:30 AM',
    tasks: ['Tackle #1 priority task', 'Work in 25min focus blocks', 'Take 5min breaks between blocks']
  },
  'midday-recharge': {
    title: 'Midday Reset',
    timeRange: '2:30 PM',
    tasks: ['Eat real meal (not snacks)', 'Movement (15min walk/stretch)', 'Hydration check']
  },
  'afternoon-push': {
    title: 'Afternoon Session',
    timeRange: '4:00 PM',
    tasks: ['Complete remaining priorities', 'Check if 2nd dose needed', 'Process communications']
  },
  'evening-wind': {
    title: 'Wind Down',
    timeRange: '7:00 PM',
    tasks: ['Dinner with protein', 'Review today (wins only)', 'Plan tomorrow (3 tasks max)']
  },
  'pre-sleep': {
    title: 'Sleep Prep',
    timeRange: '10:00 PM',
    tasks: ['Reduce screen brightness', 'Evening hygiene', 'Phone across room']
  }
};

const SESSION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'morning-wake': Sun,
  'peak-focus': Target,
  'midday-recharge': Zap,
  'afternoon-push': Target,
  'evening-wind': Sunset,
  'pre-sleep': Moon,
};

// Map icon name strings (from smartTasks) to Lucide components
const TASK_ICON_MAP: Record<string, LucideIcon> = {
  droplets: Droplets,
  egg: Egg,
  apple: Apple,
  salad: Salad,
  utensils: Utensils,
  footprints: Footprints,
  trees: TreePine,
  stretch: Zap,
  flame: Flame,
  brain: Brain,
  biceps: Zap,
  trophy: Trophy,
  clipboard: ClipboardList,
  briefcase: Briefcase,
  target: Target,
  calendar: Calendar,
  bath: Bath,
  sparkles: Sparkles,
  moon: Moon,
};

const BADGE_MILESTONES: { key: string; days: number; icon: LucideIcon; name: string }[] = [
  { key: 'week-warrior', days: 7, icon: Trophy, name: 'Week Warrior' },
  { key: 'two-week-champion', days: 14, icon: Award, name: 'Two Week Champion' },
  { key: 'monthly-master', days: 30, icon: Crown, name: 'Monthly Master' },
  { key: 'sixty-day-hero', days: 60, icon: Flame, name: 'Sixty Day Hero' },
  { key: 'centurion', days: 100, icon: Gem, name: 'Centurion' },
];

// ============ HELPERS ============

function parseTimeRange(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function formatTime12(date: Date): string {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

function getCurrentSessionKey(sessions: ADHDSessions): string {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sessionTimes = Object.entries(sessions).map(([key, data]) => ({
    key,
    minutes: parseTimeRange(data.timeRange)
  })).sort((a, b) => a.minutes - b.minutes);

  if (sessionTimes.length === 0) return '';
  if (currentMinutes < sessionTimes[0].minutes) {
    return sessionTimes[sessionTimes.length - 1].key;
  }
  for (let i = 0; i < sessionTimes.length; i++) {
    const current = sessionTimes[i];
    const next = sessionTimes[i + 1];
    if (next && currentMinutes >= current.minutes && currentMinutes < next.minutes) return current.key;
    if (!next && currentMinutes >= current.minutes) return current.key;
  }
  return sessionTimes[0].key;
}

function isToday(timestamp: number | null | undefined, dateStr: string | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

function getDoseStatus(elapsed: number, medType: 'IR' | 'XR'): string {
  const hours = elapsed / (60 * 60 * 1000);
  if (medType === 'IR') {
    if (hours < 1) return 'Building';
    if (hours <= 3) return 'Peak Window';
    if (hours < 5) return 'Wearing Off';
    return 'Expired';
  } else {
    if (hours < 4) return 'Building';
    if (hours <= 7) return 'Peak Window';
    if (hours < 10) return 'Tapering';
    return 'Expired';
  }
}

function getDoseStatusColor(status: string): string {
  switch (status) {
    case 'Building': return 'text-amber-500 dark:text-amber-400';
    case 'Peak Window': return 'text-green-500 dark:text-green-400';
    case 'Wearing Off':
    case 'Tapering': return 'text-orange-500 dark:text-orange-400';
    case 'Expired': return 'text-red-500 dark:text-red-400';
    default: return 'text-blush-500';
  }
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

// ============ COMPONENT ============

export function SelfCare() {
  const [sessions, setSessions] = useState<ADHDSessions>(DEFAULT_SESSIONS);
  const [sessionStates, setSessionStates] = useState<Record<string, ADHDTaskStates>>({});
  const [dose1Time, setDose1Time] = useState<number | null>(null);
  const [dose2Time, setDose2Time] = useState<number | null>(null);
  const [medType, setMedType] = useState<'IR' | 'XR'>('IR');
  const [editMode, setEditMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streakData, setStreakData] = useState<ADHDStreakData>({
    currentStreak: 0, longestStreak: 0, lastCompletedDate: null, badges: [], weeklyHistory: {}
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddSession, setQuickAddSession] = useState('current');
  const [toast, setToast] = useState<string | null>(null);
  const [editingDose, setEditingDose] = useState<1 | 2 | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const activeSessionRef = useRef<HTMLDivElement>(null);
  const { smartTasksBySession, isSmartTaskDone, toggleSmartTask, smartTaskStats } = useSmartTasks();

  // Load data on mount
  useEffect(() => {
    const data = loadData();
    const sc = data.selfCare || {};
    if (sc.sessions && Object.keys(sc.sessions).length > 0) setSessions(sc.sessions);
    if (sc.sessionStates) setSessionStates(sc.sessionStates);
    if (sc.medType) setMedType(sc.medType);
    // Load doses only if they're from today
    if (isToday(sc.dose1Time, sc.dose1Date)) {
      setDose1Time(sc.dose1Time!);
      // Adjust session times based on dose
      if (sc.dose1Time && sc.sessions) {
        const adjusted = adjustSessionTimes(sc.dose1Time, sc.sessions || DEFAULT_SESSIONS);
        setSessions(adjusted);
      }
    }
    if (isToday(sc.dose2Time, sc.dose2Date)) setDose2Time(sc.dose2Time!);
    if (sc.streakData) setStreakData(sc.streakData);
  }, []);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to active session on load
  useEffect(() => {
    setTimeout(() => {
      activeSessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  // Save helper
  const persist = useCallback((updates: Partial<SelfCareData>) => {
    const data = loadData();
    data.selfCare = { ...data.selfCare, ...updates };
    saveData(data);
  }, []);

  // Toast helper
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // Adjust session times based on medication dose
  function adjustSessionTimes(medTimestamp: number, baseSessions: ADHDSessions): ADHDSessions {
    const updated = { ...baseSessions };
    const offsets: Record<string, number> = {
      'morning-wake': 0,
      'peak-focus': 90,
      'midday-recharge': 270,
      'afternoon-push': 360,
      'evening-wind': 540,
      'pre-sleep': 720,
    };
    Object.entries(offsets).forEach(([key, mins]) => {
      if (updated[key]) {
        const t = new Date(medTimestamp + mins * 60 * 1000);
        updated[key] = { ...updated[key], timeRange: formatTime12(t) };
      }
    });
    return updated;
  }

  // ============ DOSE FUNCTIONS ============

  const logDose = (num: 1 | 2) => {
    const now = Date.now();
    const dateStr = new Date().toDateString();
    if (num === 1) {
      setDose1Time(now);
      const adjusted = adjustSessionTimes(now, sessions);
      setSessions(adjusted);
      persist({ dose1Time: now, dose1Date: dateStr, sessions: adjusted });
    } else {
      setDose2Time(now);
      persist({ dose2Time: now, dose2Date: dateStr });
    }
    showToast(`Dose #${num} logged`);
  };

  const clearDose = (num: 1 | 2) => {
    if (num === 1) {
      setDose1Time(null);
      persist({ dose1Time: null, dose1Date: null });
    } else {
      setDose2Time(null);
      persist({ dose2Time: null, dose2Date: null });
    }
    showToast(`Dose #${num} cleared`);
  };

  const startEditDose = (num: 1 | 2) => {
    const time = num === 1 ? dose1Time : dose2Time;
    if (!time) return;
    const d = new Date(time);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setEditTimeValue(`${hh}:${mm}`);
    setEditingDose(num);
  };

  const saveEditDose = () => {
    if (!editingDose || !editTimeValue) return;
    const [h, m] = editTimeValue.split(':').map(Number);
    const now = new Date();
    now.setHours(h, m, 0, 0);
    const ts = now.getTime();
    const dateStr = now.toDateString();
    if (editingDose === 1) {
      setDose1Time(ts);
      const adjusted = adjustSessionTimes(ts, sessions);
      setSessions(adjusted);
      persist({ dose1Time: ts, dose1Date: dateStr, sessions: adjusted });
    } else {
      setDose2Time(ts);
      persist({ dose2Time: ts, dose2Date: dateStr });
    }
    setEditingDose(null);
    showToast(`Dose #${editingDose} updated`);
  };

  // ============ TASK FUNCTIONS ============

  const toggleTask = (sessionKey: string, taskIndex: number) => {
    if (editMode) return;
    const states = { ...sessionStates };
    const sessionState = { ...(states[sessionKey] || {}) };
    sessionState[taskIndex] = !sessionState[taskIndex];
    states[sessionKey] = sessionState;
    setSessionStates(states);
    persist({ sessionStates: states });

    // Check if session just completed
    const tasks = sessions[sessionKey]?.tasks || [];
    const allDone = tasks.every((_, idx) => states[sessionKey]?.[idx]);
    if (allDone) {
      showToast(`Session complete!`);
      checkStreak(states);
    }
  };

  const addTask = (sessionKey: string) => {
    const text = prompt('Enter new task:');
    if (!text?.trim()) return;
    const updated = { ...sessions };
    updated[sessionKey] = { ...updated[sessionKey], tasks: [...updated[sessionKey].tasks, text.trim()] };
    setSessions(updated);
    persist({ sessions: updated });
    showToast('Task added');
  };

  const editTask = (sessionKey: string, idx: number) => {
    const current = sessions[sessionKey].tasks[idx];
    const newText = prompt('Edit task:', current);
    if (!newText?.trim()) return;
    const updated = { ...sessions };
    const newTasks = [...updated[sessionKey].tasks];
    newTasks[idx] = newText.trim();
    updated[sessionKey] = { ...updated[sessionKey], tasks: newTasks };
    setSessions(updated);
    persist({ sessions: updated });
  };

  const deleteTask = (sessionKey: string, idx: number) => {
    if (!confirm('Delete this task?')) return;
    const updated = { ...sessions };
    const newTasks = updated[sessionKey].tasks.filter((_, i) => i !== idx);
    updated[sessionKey] = { ...updated[sessionKey], tasks: newTasks };
    setSessions(updated);
    // Clean up states
    const states = { ...sessionStates };
    const newState: ADHDTaskStates = {};
    newTasks.forEach((_, i) => {
      // Remap indices
      const oldIdx = i >= idx ? i + 1 : i;
      if (states[sessionKey]?.[oldIdx]) newState[i] = true;
    });
    states[sessionKey] = newState;
    setSessionStates(states);
    persist({ sessions: updated, sessionStates: states });
  };

  const saveQuickAdd = () => {
    if (!quickAddText.trim()) return;
    const key = quickAddSession === 'current' ? getCurrentSessionKey(sessions) : quickAddSession;
    if (!sessions[key]) return;
    const updated = { ...sessions };
    updated[key] = { ...updated[key], tasks: [...updated[key].tasks, quickAddText.trim()] };
    setSessions(updated);
    persist({ sessions: updated });
    setQuickAddText('');
    setShowQuickAdd(false);
    showToast('Task added');
  };

  // ============ STREAK ============

  const checkStreak = (states: Record<string, ADHDTaskStates>) => {
    let completedSessions = 0;
    Object.keys(sessions).forEach(key => {
      const tasks = sessions[key].tasks;
      if (tasks.length === 0) return;
      const allDone = tasks.every((_, idx) => states[key]?.[idx]);
      if (allDone) completedSessions++;
    });

    const today = getTodayKey();
    const updated = { ...streakData, weeklyHistory: { ...streakData.weeklyHistory, [today]: completedSessions } };

    if (completedSessions >= 4) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      if (updated.lastCompletedDate === yesterdayKey || updated.lastCompletedDate === today) {
        if (updated.lastCompletedDate !== today) {
          updated.currentStreak++;
        }
      } else {
        updated.currentStreak = 1;
      }
      updated.lastCompletedDate = today;
      if (updated.currentStreak > updated.longestStreak) {
        updated.longestStreak = updated.currentStreak;
      }

      // Check badges
      BADGE_MILESTONES.forEach(badge => {
        if (updated.currentStreak >= badge.days && !updated.badges.includes(badge.key)) {
          updated.badges.push(badge.key);
          showToast(`Badge Unlocked: ${badge.name}!`);
        }
      });
    }

    setStreakData(updated);
    persist({ streakData: updated });
  };

  // ============ PROGRESS ============

  const currentSessionKey = getCurrentSessionKey(sessions);
  let totalTasks = 0;
  let completedTasks = 0;
  let completedSessions = 0;

  Object.entries(sessions).forEach(([key, session]) => {
    totalTasks += session.tasks.length;
    const done = session.tasks.filter((_, i) => sessionStates[key]?.[i]).length;
    completedTasks += done;
    if (done === session.tasks.length && session.tasks.length > 0) completedSessions++;
  });

  // Include smart tasks in totals
  const allTotalTasks = totalTasks + smartTaskStats.total;
  const allCompletedTasks = completedTasks + smartTaskStats.completed;
  const progressPct = allTotalTasks > 0 ? Math.round((allCompletedTasks / allTotalTasks) * 100) : 0;

  // Dose countdown
  const nextDoseHours = medType === 'IR' ? 5 : 10;
  const dose1Elapsed = dose1Time ? Date.now() - dose1Time : 0;
  const nextDoseReady = dose1Time ? dose1Time + nextDoseHours * 60 * 60 * 1000 : 0;
  const timeUntilNextDose = nextDoseReady ? nextDoseReady - Date.now() : 0;
  const dose2Ready = dose1Time && timeUntilNextDose <= 0;

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/settings" className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 rounded-lg text-forest-700 dark:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-forest-700 dark:text-white">ADHD Focus</h1>
            <p className="text-xs text-blush-500 dark:text-blush-400">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streakData.currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-pop-100 dark:bg-pop-900/50 text-pop-600 dark:text-pop-400 px-2 py-1 rounded-full text-xs font-bold">
                <Flame size={14} /> {streakData.currentStreak}d
              </div>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`p-2 rounded-lg transition-colors ${editMode ? 'bg-pop-200 dark:bg-pop-700 text-pop-700 dark:text-white' : 'text-blush-500 hover:bg-blush-100 dark:hover:bg-blush-700'}`}
            >
              <Pencil size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-blush-500 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-lg">
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-blush-500 dark:text-blush-400 mb-1">
            <span>{allCompletedTasks}/{allTotalTasks} tasks</span>
            <span>{completedSessions}/{Object.keys(sessions).length} sessions</span>
          </div>
          <div className="h-2 bg-blush-200 dark:bg-blush-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-forest-500 to-pop-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Dose Countdown in Header */}
        {dose1Time && !dose2Time && (
          <div className={`text-center text-sm font-medium mb-3 px-3 py-2 rounded-lg ${
            dose2Ready
              ? 'bg-pop-100 dark:bg-pop-900/50 text-pop-600 dark:text-pop-400'
              : 'bg-blush-100 dark:bg-blush-800 text-blush-600 dark:text-blush-300'
          }`}>
            <Pill size={14} className="inline mr-1" />
            {dose2Ready
              ? 'Dose #2 Ready!'
              : `Next dose in ${Math.floor(timeUntilNextDose / 3600000)}h ${Math.floor((timeUntilNextDose % 3600000) / 60000)}m`
            }
          </div>
        )}

        {/* Medication Card */}
        <div className="bg-gradient-to-br from-forest-600 to-forest-700 rounded-2xl p-4 mb-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={20} />
            <span className="font-bold">Medication ({medType})</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Dose 1 */}
            <div className="bg-white/15 rounded-xl p-3">
              <div className="text-xs text-white/70 mb-2">Dose #1</div>
              {dose1Time ? (
                <div>
                  <div className="text-sm font-medium">{new Date(dose1Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className={`text-xs mt-1 font-bold ${getDoseStatusColor(getDoseStatus(dose1Elapsed, medType)).replace('text-', 'text-')}`}>
                    {getDoseStatus(dose1Elapsed, medType)}
                  </div>
                  {editingDose === 1 ? (
                    <div className="flex gap-1 mt-2">
                      <input type="time" value={editTimeValue} onChange={e => setEditTimeValue(e.target.value)} className="bg-white/20 rounded px-1 py-0.5 text-xs w-20" />
                      <button onClick={saveEditDose} className="text-xs text-green-300 hover:text-green-100">Save</button>
                      <button onClick={() => setEditingDose(null)} className="text-xs text-white/50 hover:text-white/80">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => startEditDose(1)} className="text-xs text-white/50 hover:text-white/80">Edit</button>
                      <button onClick={() => clearDose(1)} className="text-xs text-white/50 hover:text-white/80">Clear</button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => logDose(1)} className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">
                  Log Time
                </button>
              )}
            </div>
            {/* Dose 2 */}
            <div className="bg-white/15 rounded-xl p-3">
              <div className="text-xs text-white/70 mb-2">Dose #2</div>
              {dose2Time ? (
                <div>
                  <div className="text-sm font-medium">{new Date(dose2Time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className={`text-xs mt-1 font-bold ${getDoseStatusColor(getDoseStatus(Date.now() - dose2Time, medType)).replace('text-', 'text-')}`}>
                    {getDoseStatus(Date.now() - dose2Time, medType)}
                  </div>
                  {editingDose === 2 ? (
                    <div className="flex gap-1 mt-2">
                      <input type="time" value={editTimeValue} onChange={e => setEditTimeValue(e.target.value)} className="bg-white/20 rounded px-1 py-0.5 text-xs w-20" />
                      <button onClick={saveEditDose} className="text-xs text-green-300 hover:text-green-100">Save</button>
                      <button onClick={() => setEditingDose(null)} className="text-xs text-white/50 hover:text-white/80">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => startEditDose(2)} className="text-xs text-white/50 hover:text-white/80">Edit</button>
                      <button onClick={() => clearDose(2)} className="text-xs text-white/50 hover:text-white/80">Clear</button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => logDose(2)}
                  disabled={!dose1Time || !dose2Ready}
                  className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                    dose1Time && dose2Ready
                      ? 'bg-white/20 hover:bg-white/30'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {!dose1Time ? 'Log Dose 1 First' : dose2Ready ? 'Log Time' : 'Waiting...'}
                </button>
              )}
            </div>
          </div>
          {dose1Time && !dose2Time && !dose2Ready && (
            <div className="mt-3 text-center text-xs text-white/70">
              <Clock size={12} className="inline mr-1" />
              Next dose in {Math.floor(timeUntilNextDose / 3600000)}h {Math.floor((timeUntilNextDose % 3600000) / 60000)}m
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4 mb-4">
            <h2 className="font-bold text-forest-700 dark:text-white mb-3">Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-blush-600 dark:text-blush-300 mb-1">Medication Type</label>
                <select
                  value={medType}
                  onChange={(e) => { const v = e.target.value as 'IR' | 'XR'; setMedType(v); persist({ medType: v }); }}
                  className="w-full px-3 py-2 border border-blush-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-forest-700 dark:text-white"
                >
                  <option value="IR">Immediate Release (IR)</option>
                  <option value="XR">Extended Release (XR)</option>
                </select>
              </div>
              <div className="pt-2 border-t border-blush-100 dark:border-blush-700">
                <h4 className="text-sm font-medium text-forest-700 dark:text-white mb-2">Badges Earned</h4>
                {streakData.badges.length === 0 ? (
                  <p className="text-sm text-blush-400">No badges yet. Complete 4+ sessions daily to build your streak!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {BADGE_MILESTONES.filter(b => streakData.badges.includes(b.key)).map(b => {
                      const BadgeIcon = b.icon;
                      return (
                        <span key={b.key} className="inline-flex items-center gap-1 px-2 py-1 bg-pop-100 dark:bg-pop-900/50 rounded-full text-xs font-bold text-pop-600 dark:text-pop-400">
                          <BadgeIcon size={12} /> {b.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-blush-100 dark:border-blush-700">
                <p className="text-xs text-blush-400">Longest streak: {streakData.longestStreak} days</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-3">
          {Object.entries(sessions).map(([key, session]) => {
            const isActive = key === currentSessionKey;
            const tasksDone = session.tasks.filter((_, i) => sessionStates[key]?.[i]).length;
            const isComplete = tasksDone === session.tasks.length && session.tasks.length > 0;
            const SessionIcon = SESSION_ICONS[key] || Target;

            return (
              <div
                key={key}
                ref={isActive ? activeSessionRef : undefined}
                className={`rounded-2xl border-2 transition-all ${
                  isActive
                    ? 'border-forest-400 dark:border-forest-500 bg-white dark:bg-blush-800 shadow-lg'
                    : isComplete
                      ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 opacity-60'
                      : 'border-blush-200 dark:border-blush-700 bg-white dark:bg-blush-800 opacity-70'
                }`}
              >
                {/* Session Header */}
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    isActive ? 'bg-forest-500 animate-pulse' : isComplete ? 'bg-green-400' : 'bg-blush-300 dark:bg-blush-600'
                  }`} />
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-forest-100 dark:bg-forest-900/50 text-forest-600 dark:text-forest-400'
                      : isComplete
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                        : 'bg-blush-100 dark:bg-blush-700 text-blush-500 dark:text-blush-400'
                  }`}>
                    {session.timeRange}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-forest-700 dark:text-white text-sm">{session.title}</div>
                    {isActive && <div className="text-xs text-forest-500 dark:text-forest-400">Happening now</div>}
                  </div>
                  <SessionIcon size={18} className={isActive ? 'text-forest-500' : 'text-blush-400 dark:text-blush-500'} />
                </div>

                {/* Tasks */}
                <div className="px-4 pb-3 space-y-1.5">
                  {session.tasks.map((task, idx) => {
                    const done = sessionStates[key]?.[idx] || false;
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTask(key, idx)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          done
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-blush-50 dark:bg-blush-700/50 hover:bg-blush-100 dark:hover:bg-blush-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          done
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-blush-300 dark:border-blush-500'
                        }`}>
                          {done && <Check size={12} />}
                        </div>
                        <span className={`flex-1 text-sm ${
                          done ? 'line-through text-blush-400 dark:text-blush-500' : 'text-forest-700 dark:text-white'
                        }`}>
                          {task}
                        </span>
                        {editMode && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); editTask(key, idx); }}
                              className="p-1 text-blush-400 hover:text-forest-600 dark:hover:text-white"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTask(key, idx); }}
                              className="p-1 text-blush-400 hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {editMode && (
                    <button
                      onClick={() => addTask(key)}
                      className="w-full py-2 text-sm text-forest-500 dark:text-forest-400 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} /> Add Task
                    </button>
                  )}

                  {/* Smart Tasks — personalized daily goals */}
                  {smartTasksBySession[key] && smartTasksBySession[key].length > 0 && (
                    <>
                      <div className="border-t border-dashed border-violet-200 dark:border-violet-800 mt-2 mb-1" />
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-400 dark:text-violet-500 px-1 mb-0.5">
                        Today's goals
                      </div>
                      {smartTasksBySession[key].map((st) => {
                        const stDone = isSmartTaskDone(st.id);
                        return (
                          <div
                            key={st.id}
                            onClick={() => toggleSmartTask(st.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                              stDone
                                ? 'bg-violet-50 dark:bg-violet-900/20'
                                : 'bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-100 dark:hover:bg-violet-900/20'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              stDone
                                ? 'bg-violet-500 border-violet-500 text-white'
                                : 'border-violet-300 dark:border-violet-500'
                            }`}>
                              {stDone && <Check size={12} />}
                            </div>
                            <span className={`flex-1 text-sm inline-flex items-center gap-1.5 ${
                              stDone ? 'line-through text-violet-300 dark:text-violet-600' : 'text-violet-700 dark:text-violet-300'
                            }`}>
                              {(() => { const TaskIcon = TASK_ICON_MAP[st.icon]; return TaskIcon ? <TaskIcon size={14} className="flex-shrink-0" /> : null; })()}
                              {st.text}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Session progress */}
                  {(() => {
                    const sessionSmartTasks = smartTasksBySession[key] || [];
                    const smartDone = sessionSmartTasks.filter(st => isSmartTaskDone(st.id)).length;
                    const totalSessionTasks = session.tasks.length + sessionSmartTasks.length;
                    const totalSessionDone = tasksDone + smartDone;
                    return (
                      <div className="text-xs text-blush-400 dark:text-blush-500 text-right pt-1">
                        {totalSessionDone}/{totalSessionTasks} complete
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add FAB */}
        <button
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-forest-600 hover:bg-forest-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
        >
          <Plus size={24} />
        </button>

        {/* Quick Add Modal */}
        {showQuickAdd && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowQuickAdd(false)} />
            <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto">
              <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 p-4 shadow-xl">
                <h2 className="font-bold text-forest-700 dark:text-white mb-3">Quick Add Task</h2>
                <input
                  type="text"
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveQuickAdd()}
                  placeholder="What do you need to do?"
                  autoFocus
                  aria-label="Task description"
                  className="w-full px-4 py-3 border border-blush-300 dark:border-blush-600 rounded-xl bg-white dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400 dark:placeholder-blush-500 mb-3"
                />
                <select
                  value={quickAddSession}
                  onChange={(e) => setQuickAddSession(e.target.value)}
                  aria-label="Session"
                  className="w-full px-4 py-3 border border-blush-300 dark:border-blush-600 rounded-xl bg-white dark:bg-blush-700 text-forest-700 dark:text-white mb-3"
                >
                  <option value="current">Current Session</option>
                  {Object.entries(sessions).map(([key, s]) => (
                    <option key={key} value={key}>{s.title} ({s.timeRange})</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowQuickAdd(false)} className="flex-1 py-2 text-blush-500 dark:text-blush-400 border border-blush-200 dark:border-blush-600 rounded-xl">Cancel</button>
                  <button onClick={saveQuickAdd} className="flex-1 py-2 bg-forest-600 text-white rounded-xl font-medium hover:bg-forest-700">Add</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-forest-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-bold animate-fade-in">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
