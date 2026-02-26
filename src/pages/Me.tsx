import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pill, Clock, Zap, Moon, SkipForward, Undo2, Pencil, X, Check, Plus, Circle,
  CheckCircle2, CheckSquare, Flag, ChevronRight, Calendar, Bell, List, ChevronLeft, Trash2,
  CalendarDays, Inbox, AlertCircle, Repeat, Link as LinkIcon,
  Droplets, Utensils, Footprints, Sun, Coffee, BedDouble, Sunrise, CloudSun, Sunset,
  Brain, Smartphone, Sparkles, BookOpen, type LucideIcon
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { getCurrentDayOfWeek } from '../utils/time';
import { haptic } from '../utils/haptics';
import {
  format, isToday as isDateToday, isTomorrow, isPast, parseISO, startOfDay,
  addDays, isAfter
} from 'date-fns';
import type { Class, Studio, Reminder, ReminderList, Subtask, RecurringSchedule, MedConfig, WellnessItemConfig } from '../types';
import { DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS } from '../types';
import { MoodTrends } from '../components/MoodTrends';

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, Utensils, Footprints, Sun, Coffee, BedDouble, Sunrise, CloudSun, Sunset,
  Brain, Smartphone, Sparkles, BookOpen, Pill, Moon, Zap, Bell, Check,
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime12(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatTimeFromString(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getDoseInfo(takenAt: number): { status: string; color: string; percent: number } {
  const hours = (Date.now() - takenAt) / (60 * 60 * 1000);
  if (hours < 0.5) return { status: 'Kicking in', color: 'bg-[var(--status-warning)]', percent: 15 };
  if (hours < 1) return { status: 'Building', color: 'bg-[var(--status-warning)]', percent: 40 };
  if (hours < 2) return { status: 'Peak Focus', color: 'bg-[var(--status-success)]', percent: 100 };
  if (hours < 3) return { status: 'Peak Focus', color: 'bg-[var(--status-success)]', percent: 90 };
  if (hours < 4) return { status: 'Wearing Off', color: 'bg-[var(--status-warning)]', percent: 60 };
  if (hours < 5) return { status: 'Low', color: 'bg-[var(--status-warning)]', percent: 30 };
  return { status: 'Worn Off', color: 'bg-[var(--surface-inset)]', percent: 10 };
}

function isTodayTimestamp(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const LIST_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#00C7BE', '#30B0C7', '#A2845E'
];

const DEFAULT_LISTS: ReminderList[] = [
  { id: 'inbox', name: 'Reminders', color: '#007AFF', icon: 'Inbox', order: 0, createdAt: new Date().toISOString() },
];

const PRIORITY_COLORS = {
  none: 'text-[var(--text-tertiary)]',
  low: 'text-blue-500',
  medium: 'text-[var(--status-warning)]',
  high: 'text-[var(--status-danger)]',
};

type SmartListType = 'today' | 'scheduled' | 'all' | 'flagged';

// Confetti burst — fires when all wellness items are checked
const CONFETTI_COLORS = ['#f43f5e','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa','#f472b6'];
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 0.8,
    size: 5 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * (0.6 + Math.random() * 0.8),
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function Me({ initialTab }: { initialTab?: 'meds' | 'reminders' } = {}) {
  const { data, updateSelfCare } = useAppData();
  const [searchParams] = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<'meds' | 'reminders'>(() => {
    // URL query param takes priority (e.g. /me?tab=reminders from dashboard)
    const urlTab = searchParams.get('tab');
    if (urlTab === 'tasks' || urlTab === 'reminders') return 'reminders';
    if (initialTab) return initialTab;
    const target = sessionStorage.getItem('meTabTarget');
    if (target === 'tasks') {
      sessionStorage.removeItem('meTabTarget');
      sessionStorage.setItem('meActiveTab', 'reminders');
      return 'reminders';
    }
    return (sessionStorage.getItem('meActiveTab') as 'meds' | 'reminders') || 'meds';
  });

  // Listen for tab changes from bottom nav
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail as 'meds' | 'reminders';
      setActiveTab(tab);
    };
    window.addEventListener('meTabChange', handler);
    return () => window.removeEventListener('meTabChange', handler);
  }, []);

  // Med config
  const medConfig: MedConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;

  // Meds state
  const [dose1Time, setDose1Time] = useState<number | null>(null);
  const [dose2Time, setDose2Time] = useState<number | null>(null);
  const [dose3Time, setDose3Time] = useState<number | null>(null);
  const [skippedToday, setSkippedToday] = useState(false);
  const [skippedDose1, setSkippedDose1] = useState(false);
  const [skippedDose2, setSkippedDose2] = useState(false);
  const [skippedDose3, setSkippedDose3] = useState(false);
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [showOptionalDose3, setShowOptionalDose3] = useState(false);
  const [todayClasses, setTodayClasses] = useState<(Class & { studio?: Studio })[]>([]);

  // Auto-expand optional dose 3 if AI suggested it for today
  useEffect(() => {
    const sc = data.selfCare || {};
    if (medConfig.maxDoses === 2 && sc?.suggestedDose3Date === getTodayKey()) {
      setShowOptionalDose3(true);
    }
  }, [data.selfCare, medConfig.maxDoses]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingDose, setEditingDose] = useState<1 | 2 | 3 | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');

  // Tasks state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [lists, setLists] = useState<ReminderList[]>(DEFAULT_LISTS);
  const [currentView, setCurrentView] = useState<SmartListType | string>('all');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReminderDetail, setShowReminderDetail] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [editingList, setEditingList] = useState<ReminderList | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editListColor, setEditListColor] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [inlineAddText, setInlineAddText] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Smart wellness checklist — adapts to your day
  // (moved after state declarations so it can reference meds/class state)

  const todayKey = getTodayKey();
  const wellnessStates = useMemo(() => {
    const sc = data.selfCare || {};
    // Reset if day changed
    if (sc.unifiedTaskDate !== todayKey) return {} as Record<string, boolean>;
    return sc.unifiedTaskStates || {};
  }, [data.selfCare, todayKey]);

  const toggleWellness = useCallback((id: string) => {
    const sc = data.selfCare || {};
    const currentStates = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
    const updated = { ...currentStates, [id]: !currentStates[id] };
    // Only send changed fields — spreading ...sc would overwrite cloud reminders with stale local copy
    updateSelfCare({
      unifiedTaskStates: updated,
      unifiedTaskDate: todayKey,
    });
  }, [data.selfCare, todayKey, updateSelfCare]);

  // Load meds data from selfCare (reactive to sync changes)
  useEffect(() => {
    const sc = data.selfCare || {};
    const today = getTodayKey();
    if (isTodayTimestamp(sc.dose1Time)) setDose1Time(sc.dose1Time!);
    else setDose1Time(null);
    if (isTodayTimestamp(sc.dose2Time)) setDose2Time(sc.dose2Time!);
    else setDose2Time(null);
    if (isTodayTimestamp(sc.dose3Time)) setDose3Time(sc.dose3Time!);
    else setDose3Time(null);
    setSkippedToday(sc.skippedDoseDate === today);
    setSkippedDose1(sc.skippedDose1Date === today);
    setSkippedDose2(sc.skippedDose2Date === today);
    setSkippedDose3(sc.skippedDose3Date === today);
  }, [data.selfCare]);

  // Load today's classes
  useEffect(() => {
    const currentDay = getCurrentDayOfWeek();
    const studios = data.studios || [];
    const classes = (data.classes || [])
      .filter((c: Class) => c.day === currentDay)
      .map((c: Class) => ({ ...c, studio: studios.find((s: Studio) => s.id === c.studioId) }))
      .sort((a: Class, b: Class) => a.startTime.localeCompare(b.startTime));
    setTodayClasses(classes);
  }, [data.classes, data.studios]);

  // Reminders & lists reactive to sync
  useEffect(() => {
    const sc = data.selfCare || {};
    setReminders(sc.reminders || []);
    setLists(sc.reminderLists || DEFAULT_LISTS);
  }, [data.selfCare]);


  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Day mode — set by AI or auto-detected from competition entries
  const dayMode = useMemo(() => {
    const sc = data.selfCare;
    if (sc?.dayModeDate === getTodayKey()) {
      return sc.dayMode || 'normal';
    }
    return 'normal';
  }, [data.selfCare]);

  // Auto-detect competition day — comp entries have "#" + number in the title
  useEffect(() => {
    const todayKey = getTodayKey();
    const sc = data.selfCare;
    // Don't override if a mode was already set today
    if (sc?.dayModeDate === todayKey) return;
    const todayEvents = (data.calendarEvents || []).filter(e => e.date === todayKey);
    const hasCompEntries = todayEvents.some(e => /#\d+/.test(e.title));
    if (hasCompEntries) {
      updateSelfCare({ dayMode: 'comp', dayModeDate: todayKey });
    }
  }, [data.calendarEvents, data.selfCare, updateSelfCare]);

  // Dynamic wellness items injected by day mode
  const DAY_MODE_ITEMS: Record<string, Array<{ id: string; label: string; icon: string; section: 'morning' | 'afternoon' | 'evening'; order: number }>> = {
    light: [
      { id: 'dm_breathe', label: 'Breathing exercise (2 min)', icon: 'Sparkles', section: 'morning', order: 99 },
      { id: 'dm_gentle', label: 'Gentle walk or stretch', icon: 'Footprints', section: 'afternoon', order: 99 },
    ],
    comp: [
      { id: 'dm_warmup', label: 'Competition warmup', icon: 'Zap', section: 'morning', order: 0 },
      { id: 'dm_fuel', label: 'Pre-performance fuel', icon: 'Utensils', section: 'morning', order: 1 },
    ],
    intense: [
      { id: 'dm_protein', label: 'Extra protein/fuel', icon: 'Utensils', section: 'afternoon', order: 99 },
    ],
    normal: [],
  };

  // Data-driven wellness checklist — reads from settings, applies conditions + day mode dynamically
  type WellnessSection = { title: string; Icon: LucideIcon; items: { id: string; label: string; Icon: LucideIcon }[] };
  const wellnessConfig = data.settings?.wellnessItems || DEFAULT_WELLNESS_ITEMS;
  const WELLNESS_SECTIONS: WellnessSection[] = useMemo(() => {
    const hour = new Date().getHours();
    const hasClasses = todayClasses.length > 0;
    const tookMeds = dose1Time !== null || dose2Time !== null;

    // In comp mode, only show essentials (hydration + food + comp-specific)
    const isCompDay = dayMode === 'comp';
    const compEssentialIds = new Set(['am_water', 'am_food', 'pm_water', 'ev_food', 'dm_warmup', 'dm_fuel']);

    const sectionMap: Record<string, LucideIcon> = { morning: Sunrise, afternoon: CloudSun, evening: Sunset };
    const sectionOrder: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];

    // Merge day mode items into the config
    const modeItems = DAY_MODE_ITEMS[dayMode] || [];

    return sectionOrder.map(sec => {
      const baseItems = wellnessConfig
        .filter(item => item.enabled && item.section === sec)
        .filter(item => {
          const c = item.conditions;
          if (!c) return true;
          if (c.requiresMedsTaken && !tookMeds) return false;
          if (c.onlyOnClassDays && !hasClasses) return false;
          if (c.onlyOnOffDays && hasClasses) return false;
          if (c.afterHour !== undefined && hour < c.afterHour) return false;
          return true;
        });

      // Add day mode items for this section
      const injected = modeItems
        .filter(m => m.section === sec)
        .map(m => ({ ...m, enabled: true, conditions: undefined }));

      const combined = [...baseItems, ...injected]
        .filter(item => !isCompDay || compEssentialIds.has(item.id))
        .sort((a, b) => a.order - b.order)
        .map(item => ({
          id: item.id,
          label: item.label,
          Icon: ICON_MAP[item.icon] || Circle,
        }));

      return {
        title: sec.charAt(0).toUpperCase() + sec.slice(1),
        Icon: sectionMap[sec],
        items: combined,
      };
    }).filter(s => s.items.length > 0);
  }, [wellnessConfig, todayClasses.length, dose1Time, dose2Time, dayMode]);

  // Flatten all items for counting
  const ALL_WELLNESS_ITEMS = useMemo(() =>
    WELLNESS_SECTIONS.flatMap(s => s.items), [WELLNESS_SECTIONS]);

  const persist = useCallback((updates: Record<string, unknown>) => {
    updateSelfCare(updates);
  }, [updateSelfCare]);

  // Meds handlers
  const handleTakeDose1 = () => {
    const now = Date.now();
    setDose1Time(now);
    setSkippedToday(false);
    setSkippedDose1(false);
    persist({ dose1Time: now, dose1Date: getTodayKey(), skippedDoseDate: null, skippedDose1Date: null });
  };

  const handleTakeDose2 = () => {
    const now = Date.now();
    setDose2Time(now);
    setSkippedDose2(false);
    // If both doses are now taken, clear the whole day skip
    if (dose1Time) setSkippedToday(false);
    persist({ dose2Time: now, dose2Date: getTodayKey(), skippedDose2Date: null, skippedDoseDate: dose1Time ? null : undefined });
  };

  const handleSkipToday = () => {
    setSkippedToday(true);
    setSkippedDose1(true);
    setSkippedDose2(true);
    setSkippedDose3(true);
    setDose1Time(null);
    setDose2Time(null);
    setDose3Time(null);
    setShowSkipOptions(false);
    persist({
      skippedDoseDate: getTodayKey(),
      skippedDose1Date: getTodayKey(),
      skippedDose2Date: getTodayKey(),
      skippedDose3Date: getTodayKey(),
      dose1Time: null,
      dose1Date: getTodayKey(),
      dose2Time: null,
      dose2Date: getTodayKey(),
      dose3Time: null,
      dose3Date: getTodayKey(),
    });
  };

  const handleSkipDose1 = () => {
    setSkippedDose1(true);
    setDose1Time(null);
    setShowSkipOptions(false);
    persist({ skippedDose1Date: getTodayKey(), dose1Time: null, dose1Date: getTodayKey() });
  };

  const handleSkipDose2 = () => {
    setSkippedDose2(true);
    setDose2Time(null);
    setShowSkipOptions(false);
    persist({ skippedDose2Date: getTodayKey(), dose2Time: null, dose2Date: getTodayKey() });
  };

  const handleUndoSkip = () => {
    setSkippedToday(false);
    setSkippedDose1(false);
    setSkippedDose2(false);
    setSkippedDose3(false);
    persist({ skippedDoseDate: null, skippedDose1Date: null, skippedDose2Date: null, skippedDose3Date: null });
  };

  const handleUndoSkipDose1 = () => {
    setSkippedDose1(false);
    // If we undid both individual skips, also undo the "whole day" skip
    if (!skippedDose2) setSkippedToday(false);
    persist({ skippedDose1Date: null, skippedDoseDate: skippedDose2 ? getTodayKey() : null });
  };

  const handleUndoSkipDose2 = () => {
    setSkippedDose2(false);
    // If we undid both individual skips, also undo the "whole day" skip
    if (!skippedDose1) setSkippedToday(false);
    persist({ skippedDose2Date: null, skippedDoseDate: skippedDose1 ? getTodayKey() : null });
  };

  const handleUndoDose1 = () => {
    setDose1Time(null);
    // Keep date as today so merge logic knows this was a deliberate clear
    persist({ dose1Time: null, dose1Date: getTodayKey() });
  };

  const handleUndoDose2 = () => {
    setDose2Time(null);
    // Keep date as today so merge logic knows this was a deliberate clear
    persist({ dose2Time: null, dose2Date: getTodayKey() });
  };

  // Dose 3 handlers
  const handleTakeDose3 = () => {
    const now = Date.now();
    setDose3Time(now);
    setSkippedDose3(false);
    persist({ dose3Time: now, dose3Date: getTodayKey(), skippedDose3Date: null });
  };

  const handleSkipDose3 = () => {
    setSkippedDose3(true);
    setDose3Time(null);
    setShowSkipOptions(false);
    persist({ skippedDose3Date: getTodayKey(), dose3Time: null, dose3Date: getTodayKey() });
  };

  const handleUndoSkipDose3 = () => {
    setSkippedDose3(false);
    persist({ skippedDose3Date: null });
  };

  const handleUndoDose3 = () => {
    setDose3Time(null);
    persist({ dose3Time: null, dose3Date: getTodayKey() });
  };

  const handleEditDose = (doseNum: 1 | 2 | 3) => {
    const doseTime = doseNum === 1 ? dose1Time : doseNum === 2 ? dose2Time : dose3Time;
    if (doseTime) {
      const date = new Date(doseTime);
      setEditTimeValue(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    } else {
      const now = new Date();
      setEditTimeValue(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    setEditingDose(doseNum);
  };

  const handleSaveEditTime = () => {
    if (!editingDose || !editTimeValue) return;
    const [hours, mins] = editTimeValue.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, mins, 0, 0);
    const timestamp = newTime.getTime();

    if (editingDose === 1) {
      setDose1Time(timestamp);
      setSkippedToday(false);
      persist({ dose1Time: timestamp, dose1Date: getTodayKey(), skippedDoseDate: null });
    } else if (editingDose === 2) {
      setDose2Time(timestamp);
      persist({ dose2Time: timestamp, dose2Date: getTodayKey() });
    } else if (editingDose === 3) {
      setDose3Time(timestamp);
      persist({ dose3Time: timestamp, dose3Date: getTodayKey() });
    }
    setEditingDose(null);
  };

  // Tasks handlers
  const persistTasks = useCallback((newReminders: Reminder[], newLists: ReminderList[]) => {
    updateSelfCare({ reminders: newReminders, reminderLists: newLists });
  }, [updateSelfCare]);

  const handleInlineAdd = useCallback(() => {
    if (!inlineAddText.trim()) return;
    const reminder: Reminder = {
      id: generateId(),
      title: inlineAddText.trim(),
      notes: '',
      listId: currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' ? currentView : 'inbox',
      completed: false,
      priority: 'none',
      flagged: false,
      dueDate: undefined,
      dueTime: undefined,
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...reminders, reminder];
    setReminders(updated);
    persistTasks(updated, lists);
    setInlineAddText('');
    // Keep focus for rapid entry
    setTimeout(() => inlineInputRef.current?.focus(), 0);
  }, [inlineAddText, reminders, lists, persistTasks, currentView]);

  const handleToggleComplete = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const nowCompleted = !r.completed;
          if (nowCompleted && r.recurring && r.dueDate) {
            const nextDate = getNextRecurringDate(r.dueDate, r.recurring);
            if (nextDate) {
              const newReminder: Reminder = {
                ...r,
                id: generateId(),
                completed: false,
                completedAt: undefined,
                dueDate: nextDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setTimeout(() => {
                setReminders(p => {
                  const withNew = [...p, newReminder];
                  persistTasks(withNew, lists);
                  return withNew;
                });
              }, 0);
            }
          }
          return {
            ...r,
            completed: nowCompleted,
            completedAt: nowCompleted ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return r;
      });
      persistTasks(updated, lists);
      return updated;
    });
  }, [lists, persistTasks]);

  const handleToggleFlag = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r =>
        r.id === id ? { ...r, flagged: !r.flagged, updatedAt: new Date().toISOString() } : r
      );
      persistTasks(updated, lists);
      return updated;
    });
  }, [lists, persistTasks]);

  const handleDeleteReminder = useCallback((id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    persistTasks(updated, lists);
    setSelectedReminder(null);
    setShowReminderDetail(false);
  }, [reminders, lists, persistTasks]);

  const handleUpdateReminder = useCallback((updated: Reminder) => {
    const newReminders = reminders.map(r => r.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : r);
    setReminders(newReminders);
    persistTasks(newReminders, lists);
    setSelectedReminder(updated);
  }, [reminders, lists, persistTasks]);

  const handleAddList = useCallback(() => {
    if (!newListName.trim()) return;
    const newList: ReminderList = {
      id: generateId(),
      name: newListName.trim(),
      color: newListColor,
      icon: 'List',
      order: lists.length,
      createdAt: new Date().toISOString(),
    };
    const updated = [...lists, newList];
    setLists(updated);
    persistTasks(reminders, updated);
    setNewListName('');
    setNewListColor(LIST_COLORS[0]);
    setShowNewList(false);
    setCurrentView(newList.id);
  }, [newListName, newListColor, lists, reminders, persistTasks]);

  const handleDeleteList = useCallback((listId: string) => {
    if (listId === 'inbox') return; // Can't delete inbox
    const updatedLists = lists.filter(l => l.id !== listId);
    // Move reminders from deleted list to inbox
    const updatedReminders = reminders.map(r => r.listId === listId ? { ...r, listId: 'inbox' } : r);
    setLists(updatedLists);
    setReminders(updatedReminders);
    persistTasks(updatedReminders, updatedLists);
    setCurrentView('today');
    setEditingList(null);
  }, [lists, reminders, persistTasks]);

  const handleOpenEditList = useCallback((list: ReminderList) => {
    setEditListName(list.name);
    setEditListColor(list.color);
    setEditingList(list);
  }, []);

  const handleSaveEditList = useCallback(() => {
    if (!editingList || !editListName.trim()) return;
    const updatedLists = lists.map(l =>
      l.id === editingList.id ? { ...l, name: editListName.trim(), color: editListColor } : l
    );
    setLists(updatedLists);
    persistTasks(reminders, updatedLists);
    setEditingList(null);
  }, [editingList, editListName, editListColor, lists, reminders, persistTasks]);

  const handleToggleSubtask = useCallback((reminderId: string, subtaskId: string) => {
    const updated = reminders.map(r => {
      if (r.id === reminderId && r.subtasks) {
        return {
          ...r,
          subtasks: r.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s),
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    setReminders(updated);
    persistTasks(updated, lists);
    const updatedReminder = updated.find(r => r.id === reminderId);
    if (updatedReminder) setSelectedReminder(updatedReminder);
  }, [reminders, lists, persistTasks]);

  // Helper function to get next recurring date
  const getNextRecurringDate = (currentDate: string, recurring: RecurringSchedule): string | null => {
    const date = parseISO(currentDate);
    let nextDate: Date;

    switch (recurring.type) {
      case 'daily':
        nextDate = addDays(date, recurring.interval);
        break;
      case 'weekly':
        nextDate = addDays(date, 7 * recurring.interval);
        break;
      case 'monthly':
        nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + recurring.interval);
        break;
      case 'yearly':
        nextDate = new Date(date);
        nextDate.setFullYear(nextDate.getFullYear() + recurring.interval);
        break;
      default:
        return null;
    }

    if (recurring.endDate && isAfter(nextDate, parseISO(recurring.endDate))) {
      return null;
    }

    return format(nextDate, 'yyyy-MM-dd');
  };

  // Computed values
  const dose1Info = dose1Time ? getDoseInfo(dose1Time) : null;
  const dose2Info = dose2Time ? getDoseInfo(dose2Time) : null;
  const dose3Info = dose3Time ? getDoseInfo(dose3Time) : null;
  const activeDose = dose3Info && dose3Info.status !== 'Worn Off'
    ? { info: dose3Info, time: dose3Time, num: 3 }
    : dose2Info && dose2Info.status !== 'Worn Off'
      ? { info: dose2Info, time: dose2Time, num: 2 }
      : dose1Info && dose1Info.status !== 'Worn Off'
        ? { info: dose1Info, time: dose1Time, num: 1 }
        : null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Smart list counts
  const smartCounts = useMemo(() => {
    const incomplete = reminders.filter(r => !r.completed);
    return {
      today: incomplete.filter(r => r.dueDate === todayStr || (r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr)).length,
      scheduled: incomplete.filter(r => r.dueDate).length,
      all: incomplete.length,
      flagged: incomplete.filter(r => r.flagged).length,
    };
  }, [reminders, todayStr]);

  // Get reminders for current view
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Filter by view
    switch (currentView) {
      case 'today':
        filtered = reminders.filter(r =>
          r.dueDate === todayStr ||
          (r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr)
        );
        break;
      case 'scheduled':
        filtered = reminders.filter(r => r.dueDate);
        break;
      case 'all':
        // Show all
        break;
      case 'flagged':
        filtered = reminders.filter(r => r.flagged);
        break;
      default:
        // Custom list
        filtered = reminders.filter(r => r.listId === currentView);
    }

    // Filter completed
    if (!showCompleted) {
      filtered = filtered.filter(r => !r.completed);
    }

    // Sort: incomplete first, then by due date, then by creation
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reminders, currentView, todayStr, showCompleted]);

  const completedCount = useMemo(() => {
    switch (currentView) {
      case 'today':
        return reminders.filter(r => r.completed && (r.dueDate === todayStr || (r.dueDate && isPast(startOfDay(parseISO(r.dueDate)))))).length;
      case 'scheduled':
        return reminders.filter(r => r.completed && r.dueDate).length;
      case 'all':
        return reminders.filter(r => r.completed).length;
      case 'flagged':
        return reminders.filter(r => r.completed && r.flagged).length;
      default:
        return reminders.filter(r => r.completed && r.listId === currentView).length;
    }
  }, [reminders, currentView, todayStr]);

  const formatDueDate = (dueDate?: string, dueTime?: string) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    const timeStr = dueTime ? ` at ${formatTimeFromString(dueTime)}` : '';
    if (isDateToday(date)) return `Today${timeStr}`;
    if (isTomorrow(date)) return `Tomorrow${timeStr}`;
    if (isPast(startOfDay(date))) return `Overdue: ${format(date, 'MMM d')}${timeStr}`;
    return format(date, 'EEE, MMM d') + timeStr;
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'today': return 'Today';
      case 'scheduled': return 'Scheduled';
      case 'all': return 'All';
      case 'flagged': return 'Flagged';
      default:
        const list = lists.find(l => l.id === currentView);
        return list?.name || 'Reminders';
    }
  };

  const getViewColor = () => {
    switch (currentView) {
      case 'today': return '#007AFF';
      case 'scheduled': return '#FF3B30';
      case 'all': return '#5856D6';
      case 'flagged': return '#FF9500';
      default:
        const list = lists.find(l => l.id === currentView);
        return list?.color || '#007AFF';
    }
  };

  return (
    <div className="pb-24 bg-[var(--surface-primary)]">
      <ConfettiBurst active={showConfetti} />
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="type-h1 text-[var(--text-primary)]">
            {activeTab === 'meds' ? 'Meds' : 'Tasks'}
          </h1>
          <p className="type-caption text-[var(--text-secondary)]">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* === Meds Tab === */}
        {activeTab === 'meds' && (<>
        <div className="space-y-3">
            {/* Status bar — compact inline */}
            {!skippedToday && activeDose && (
              <div className={`rounded-[var(--radius-md)] px-3 py-2.5 ${activeDose.info.color} text-[var(--text-on-accent)] flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="opacity-90" />
                  <span className="font-bold text-sm">{activeDose.info.status}</span>
                  <span className="text-xs opacity-75">Dose {activeDose.num} &bull; {formatTime12(new Date(activeDose.time!))}</span>
                </div>
                <span className="text-lg font-bold">{activeDose.info.percent}%</span>
              </div>
            )}

            {/* Skipped banner — compact */}
            {skippedToday && skippedDose1 && skippedDose2 && (
              <div className="rounded-[var(--radius-md)] px-3 py-2.5 bg-[var(--surface-inset)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={16} className="text-[var(--text-tertiary)]" />
                  <span className="font-semibold text-sm text-[var(--text-primary)]">Off Day</span>
                  <span className="text-xs text-[var(--text-tertiary)]">No meds today</span>
                </div>
                <button onClick={handleUndoSkip} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card)] rounded-[var(--radius-sm)]">
                  <Undo2 size={12} /> Undo
                </button>
              </div>
            )}

            {/* Dose cards — side by side */}
            {!(skippedToday && skippedDose1 && skippedDose2 && skippedDose3) && (
              <>
                <div className={`grid gap-2 ${(medConfig.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Dose 1 */}
                  <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3">
                    {skippedDose1 && !dose1Time ? (
                      <div className="text-center">
                        <SkipForward size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                        <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Dose 1 Skipped</div>
                        <div className="flex gap-1">
                          <button onClick={handleUndoSkipDose1} className="flex-1 px-2 py-1.5 text-xs text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)]">Undo</button>
                          <button onClick={handleTakeDose1} className="flex-1 px-2 py-1.5 text-xs bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-[var(--radius-sm)]">Take</button>
                        </div>
                      </div>
                    ) : dose1Time ? (
                      <div className="text-center opacity-80">
                        <Pill size={18} className="mx-auto text-[var(--status-success)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Dose 1</div>
                        <div className="type-caption text-[var(--text-secondary)] mb-2">{formatTime12(new Date(dose1Time))} &bull; {dose1Info?.status}</div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditDose(1)} className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">Edit</button>
                          <button onClick={handleUndoDose1} className="flex-1 px-2 py-1.5 text-xs text-[var(--status-danger)] rounded-[var(--radius-sm)]">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Dose 1</div>
                        <div className="type-caption text-[var(--text-tertiary)] mb-2">Not taken</div>
                        <button onClick={handleTakeDose1} className="w-full px-3 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-semibold rounded-[var(--radius-sm)] min-h-[36px]">Take Now</button>
                      </div>
                    )}
                  </div>

                  {/* Dose 2 */}
                  <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3">
                    {skippedDose2 && !dose2Time ? (
                      <div className="text-center">
                        <SkipForward size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                        <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Dose 2 Skipped</div>
                        <div className="flex gap-1">
                          <button onClick={handleUndoSkipDose2} className="flex-1 px-2 py-1.5 text-xs text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)]">Undo</button>
                          <button onClick={handleTakeDose2} className="flex-1 px-2 py-1.5 text-xs bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-[var(--radius-sm)]">Take</button>
                        </div>
                      </div>
                    ) : dose2Time ? (
                      <div className="text-center opacity-80">
                        <Pill size={18} className="mx-auto text-[var(--status-success)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Dose 2</div>
                        <div className="type-caption text-[var(--text-secondary)] mb-2">{formatTime12(new Date(dose2Time))} &bull; {dose2Info?.status}</div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditDose(2)} className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">Edit</button>
                          <button onClick={handleUndoDose2} className="flex-1 px-2 py-1.5 text-xs text-[var(--status-danger)] rounded-[var(--radius-sm)]">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Dose 2</div>
                        <div className="type-caption text-[var(--text-tertiary)] mb-2">Not taken</div>
                        <button onClick={handleTakeDose2} className="w-full px-3 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-semibold rounded-[var(--radius-sm)] min-h-[36px]">Take Now</button>
                      </div>
                    )}
                  </div>

                  {/* Dose 3 — shown when maxDoses=3, OR when optional dose 3 is expanded/taken */}
                  {(medConfig.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) && (
                    <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3">
                      {skippedDose3 && !dose3Time ? (
                        <div className="text-center">
                          <SkipForward size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                          <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Dose 3 Skipped</div>
                          <div className="flex gap-1">
                            <button onClick={handleUndoSkipDose3} className="flex-1 px-2 py-1.5 text-xs text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)]">Undo</button>
                            <button onClick={handleTakeDose3} className="flex-1 px-2 py-1.5 text-xs bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-[var(--radius-sm)]">Take</button>
                          </div>
                        </div>
                      ) : dose3Time ? (
                        <div className="text-center opacity-80">
                          <Pill size={18} className="mx-auto text-[var(--status-success)] mb-1" />
                          <div className="text-xs font-bold text-[var(--text-primary)]">Dose 3</div>
                          <div className="type-caption text-[var(--text-secondary)] mb-2">{formatTime12(new Date(dose3Time))} &bull; {dose3Info?.status}</div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditDose(3)} className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">Edit</button>
                            <button onClick={handleUndoDose3} className="flex-1 px-2 py-1.5 text-xs text-[var(--status-danger)] rounded-[var(--radius-sm)]">Clear</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Pill size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
                          <div className="text-xs font-bold text-[var(--text-primary)]">Dose 3</div>
                          <div className="type-caption text-[var(--text-tertiary)] mb-2">Not taken</div>
                          <button onClick={handleTakeDose3} className="w-full px-3 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-semibold rounded-[var(--radius-sm)] min-h-[36px]">Take Now</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Dose 3 prompt — only when maxDoses=2, dose 2 taken, dose 3 not yet shown */}
                {medConfig.maxDoses === 2 && dose2Time && !showOptionalDose3 && !dose3Time && !skippedDose3 && (
                  <button
                    onClick={() => { setShowOptionalDose3(true); haptic('light'); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
                  >
                    <Zap size={14} />
                    <span className="text-xs font-medium">Long day? Add a 3rd dose</span>
                  </button>
                )}

                {/* Edit dose time — full width below grid when editing */}
                {editingDose && (
                  <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3 flex items-center gap-3">
                    <Pill size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Dose {editingDose}</span>
                    <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="flex-1 px-2 py-1.5 text-sm border border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)]" autoFocus />
                    <button onClick={handleSaveEditTime} className="p-1.5 bg-[var(--status-success)] text-white rounded-[var(--radius-sm)]" aria-label="Save"><Check size={16} /></button>
                    <button onClick={() => setEditingDose(null)} className="p-1.5 bg-[var(--surface-inset)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]" aria-label="Cancel"><X size={16} /></button>
                  </div>
                )}

                {/* Skip — compact link */}
                {((!dose1Time && !skippedDose1) || (!dose2Time && !skippedDose2) || ((medConfig.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3)) && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSkipOptions(!showSkipOptions)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      <SkipForward size={13} />
                      <span className="text-xs">Skip</span>
                      <ChevronRight size={12} className={`transition-transform ${showSkipOptions ? 'rotate-90' : ''}`} />
                    </button>
                    {showSkipOptions && (
                      <div className="mt-1 bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
                        {!dose1Time && !skippedDose1 && (
                          <button onClick={handleSkipDose1} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                            <SkipForward size={14} className="text-[var(--accent-primary)]" />
                            <span className="text-sm text-[var(--text-primary)]">Skip Dose 1</span>
                          </button>
                        )}
                        {!dose2Time && !skippedDose2 && (
                          <button onClick={handleSkipDose2} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                            <SkipForward size={14} className="text-[var(--status-warning)]" />
                            <span className="text-sm text-[var(--text-primary)]">Skip Dose 2</span>
                          </button>
                        )}
                        {(medConfig.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3 && (
                          <button onClick={handleSkipDose3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                            <SkipForward size={14} className="text-[var(--accent-primary)]" />
                            <span className="text-sm text-[var(--text-primary)]">Skip Dose 3</span>
                          </button>
                        )}
                        <button onClick={handleSkipToday} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)]">
                          <Moon size={14} className="text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Skip all day</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Wellness check-in */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="type-label text-[var(--text-tertiary)] uppercase tracking-wide">Daily Check-in</span>
                  {dayMode !== 'normal' && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[var(--radius-full)] ${
                      dayMode === 'light' ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' :
                      dayMode === 'comp' ? 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' :
                      'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                    }`}>
                      {dayMode}
                    </span>
                  )}
                </div>
                <span className="type-caption text-[var(--text-tertiary)]">
                  {ALL_WELLNESS_ITEMS.filter(i => wellnessStates[i.id]).length}/{ALL_WELLNESS_ITEMS.length}
                </span>
              </div>
              {WELLNESS_SECTIONS.map(section => (
                <div key={section.title}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 bg-[var(--surface-inset)]">
                    <section.Icon size={12} className="text-[var(--text-tertiary)]" />
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{section.title}</span>
                  </div>
                  {section.items.map(item => {
                    const done = wellnessStates[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          toggleWellness(item.id);
                          haptic('light');
                          // Fire confetti if this is the last item being checked
                          if (!done) {
                            const othersDone = ALL_WELLNESS_ITEMS
                              .filter(i => i.id !== item.id)
                              .every(i => wellnessStates[i.id]);
                            if (othersDone) {
                              setShowConfetti(true);
                              setTimeout(() => setShowConfetti(false), 2500);
                            }
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${done ? 'opacity-50' : 'active:bg-[var(--surface-inset)]'}`}
                      >
                        {done ? (
                          <CheckCircle2 size={18} className="text-[var(--status-success)] flex-shrink-0" fill="currentColor" strokeWidth={0} />
                        ) : (
                          <Circle size={18} className="text-[var(--border-subtle)] flex-shrink-0" strokeWidth={1.5} />
                        )}
                        <item.Icon size={14} className={done ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'} />
                        <span className={`type-body ${done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
        </div>

        {/* Mood Trends */}
        <MoodTrends checkIns={data.aiCheckIns || []} snapshots={data.learningData?.dailySnapshots || []} />
        </>)}

        {/* === Reminders Tab === */}
        {activeTab === 'reminders' && (<>
        <div>
        {!showReminderDetail && (
          <>
            {/* Smart List Filters — compact pill row */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
              {([
                { id: 'today' as SmartListType, label: 'Today', count: smartCounts.today, Icon: CalendarDays },
                { id: 'scheduled' as SmartListType, label: 'Scheduled', count: smartCounts.scheduled, Icon: Calendar },
                { id: 'all' as SmartListType, label: 'All', count: smartCounts.all, Icon: Inbox },
                { id: 'flagged' as SmartListType, label: 'Flagged', count: smartCounts.flagged, Icon: Flag },
              ]).map(({ id, label, count, Icon }) => {
                const isActive = currentView === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCurrentView(id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-full)] text-sm font-semibold whitespace-nowrap transition-colors min-h-[40px] flex-shrink-0 ${
                      isActive
                        ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                        : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                    {count > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-[var(--radius-full)] min-w-[20px] text-center ${
                        isActive ? 'bg-white/25' : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Lists — compact inline pills */}
            {lists.length > 0 && (
              <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
                <span className="type-label text-[var(--text-tertiary)] uppercase tracking-wide flex-shrink-0">Lists</span>
                {lists.map(list => {
                  const count = reminders.filter(r => !r.completed && r.listId === list.id).length;
                  const isActive = currentView === list.id;
                  return (
                    <button
                      key={list.id}
                      onClick={() => setCurrentView(list.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                      style={isActive ? { backgroundColor: list.color } : {}}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-[var(--radius-full)] flex-shrink-0"
                        style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : list.color }}
                      />
                      {list.name}
                      {count > 0 && (
                        <span className={`text-xs font-bold ${isActive ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowNewList(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-full)] text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] flex-shrink-0"
                >
                  <Plus size={12} />
                  New
                </button>
              </div>
            )}

            {/* Current View Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="type-h2" style={{ color: getViewColor() }}>
                {getViewTitle()}
              </h2>
              <div className="flex items-center gap-3">
                <span className="type-caption text-[var(--text-tertiary)]">
                  {filteredReminders.filter(r => !r.completed).length} tasks
                </span>
                {currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' && currentView !== 'inbox' && (
                  <button
                    onClick={() => handleOpenEditList(lists.find(l => l.id === currentView)!)}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Reminders List */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden mb-4">
              {filteredReminders.length === 0 ? (
                <div className="px-8 pt-6 pb-2 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-[var(--status-success)]" />
                  <p className="type-body font-medium text-[var(--text-secondary)]">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filteredReminders.map((reminder) => {
                    const SWIPE_THRESHOLD = 80;
                    return (
                      <div
                        key={reminder.id}
                        className="relative overflow-hidden"
                      >
                        {/* Green reveal behind the swipe */}
                        <div className="absolute inset-0 bg-[var(--status-success)] flex items-center justify-end pr-6">
                          <Check size={24} className="text-white" />
                        </div>
                        <div
                          className="relative bg-[var(--surface-card)] flex items-start gap-3 p-4 active:bg-[var(--surface-inset)] cursor-pointer transition-transform"
                          style={{ touchAction: 'pan-y' }}
                          onTouchStart={(e) => {
                            const el = e.currentTarget;
                            const startX = e.touches[0].clientX;
                            const startY = e.touches[0].clientY;
                            let deltaX = 0;
                            let isHorizontal: boolean | null = null;

                            const onMove = (ev: TouchEvent) => {
                              const dx = ev.touches[0].clientX - startX;
                              const dy = ev.touches[0].clientY - startY;
                              // Determine direction on first significant movement
                              if (isHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                                isHorizontal = Math.abs(dx) > Math.abs(dy);
                              }
                              if (!isHorizontal) return;
                              ev.preventDefault();
                              deltaX = Math.min(0, dx); // Only allow left swipe
                              el.style.transform = `translateX(${deltaX}px)`;
                              el.style.transition = 'none';
                            };

                            const onEnd = () => {
                              document.removeEventListener('touchmove', onMove);
                              document.removeEventListener('touchend', onEnd);
                              if (deltaX < -SWIPE_THRESHOLD && !reminder.completed) {
                                // Complete the reminder
                                el.style.transition = 'transform 0.2s ease-out';
                                el.style.transform = 'translateX(-100%)';
                                haptic('medium');
                                setTimeout(() => {
                                  handleToggleComplete(reminder.id);
                                  el.style.transition = 'none';
                                  el.style.transform = '';
                                }, 200);
                              } else {
                                // Snap back
                                el.style.transition = 'transform 0.2s ease-out';
                                el.style.transform = '';
                              }
                            };

                            document.addEventListener('touchmove', onMove, { passive: false });
                            document.addEventListener('touchend', onEnd);
                          }}
                          onClick={() => {
                            setSelectedReminder(reminder);
                            setShowReminderDetail(true);
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComplete(reminder.id);
                            }}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {reminder.completed ? (
                              <CheckCircle2 size={24} className="text-[var(--accent-primary)]" fill="currentColor" strokeWidth={0} />
                            ) : (
                              <Circle
                                size={24}
                                className={PRIORITY_COLORS[reminder.priority]}
                                strokeWidth={reminder.priority === 'high' ? 2.5 : 1.5}
                              />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`type-body font-medium ${reminder.completed ? 'text-[var(--text-tertiary)] line-through opacity-50' : 'text-[var(--text-primary)]'}`}>
                              {reminder.title}
                            </p>
                            {reminder.notes && (
                              <p className="type-caption text-[var(--text-tertiary)] line-clamp-1 mt-0.5">
                                {reminder.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {reminder.dueDate && (
                                <span className={`type-label flex items-center gap-1 ${
                                  !reminder.completed && reminder.dueDate && isPast(startOfDay(parseISO(reminder.dueDate))) && reminder.dueDate !== todayStr
                                    ? 'text-[var(--status-danger)]'
                                    : 'text-[var(--text-tertiary)]'
                                }`}>
                                  <Bell size={10} />
                                  {formatDueDate(reminder.dueDate, reminder.dueTime)}
                                </span>
                              )}
                              {reminder.recurring && (
                                <span className="type-label text-[var(--text-tertiary)] flex items-center gap-1">
                                  <Repeat size={10} />
                                  {reminder.recurring.type}
                                </span>
                              )}
                              {reminder.subtasks && reminder.subtasks.length > 0 && (
                                <span className="type-label text-[var(--text-tertiary)]">
                                  {reminder.subtasks.filter(s => s.completed).length}/{reminder.subtasks.length} subtasks
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFlag(reminder.id);
                            }}
                            className="flex-shrink-0 p-1"
                          >
                            <Flag size={18} className={reminder.flagged ? 'text-[var(--status-warning)] fill-current' : 'text-[var(--border-subtle)]'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}

              {/* Inline quick-add — always visible */}
              <div className="flex items-center gap-3 p-4 border-t border-[var(--border-subtle)]">
                <Plus size={20} className="text-[var(--border-subtle)] flex-shrink-0" />
                <input
                  ref={inlineInputRef}
                  type="text"
                  value={inlineAddText}
                  onChange={(e) => setInlineAddText(e.target.value)}
                  placeholder="Add a reminder..."
                  className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlineAddText.trim()) handleInlineAdd();
                  }}
                />
              </div>

              {completedCount > 0 && (
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full p-3 text-sm text-[var(--text-secondary)] flex items-center justify-center gap-1 border-t border-[var(--border-subtle)]"
                >
                  {showCompleted ? 'Hide' : 'Show'} {completedCount} Completed
                  <ChevronRight size={14} className={showCompleted ? 'rotate-90 transition-transform' : 'transition-transform'} />
                </button>
              )}
            </div>

            {/* New List Modal */}
            {showNewList && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-[var(--surface-elevated)] rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)] w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <button onClick={() => setShowNewList(false)} className="text-[var(--accent-primary)] font-medium">Cancel</button>
                    <h3 className="type-h3 text-[var(--text-primary)]">New List</h3>
                    <button
                      onClick={handleAddList}
                      disabled={!newListName.trim()}
                      className="text-[var(--accent-primary)] font-medium disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="List Name"
                      className="w-full px-4 py-3 bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                      autoFocus
                    />
                    <div>
                      <label className="type-label text-[var(--text-secondary)] mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewListColor(color)}
                            className={`w-10 h-10 rounded-[var(--radius-full)] ${newListColor === color ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)]' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit List Modal */}
            {editingList && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-[var(--surface-elevated)] rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)] w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <button onClick={() => setEditingList(null)} className="text-[var(--accent-primary)] font-medium">Cancel</button>
                    <h3 className="type-h3 text-[var(--text-primary)]">Edit List</h3>
                    <button
                      onClick={handleSaveEditList}
                      disabled={!editListName.trim()}
                      className="text-[var(--accent-primary)] font-medium disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input
                      type="text"
                      value={editListName}
                      onChange={(e) => setEditListName(e.target.value)}
                      placeholder="List Name"
                      className="w-full px-4 py-3 bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                      autoFocus
                    />
                    <div>
                      <label className="type-label text-[var(--text-secondary)] mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditListColor(color)}
                            className={`w-10 h-10 rounded-[var(--radius-full)] ${editListColor === color ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)]' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteList(editingList.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--status-danger)]/10 text-[var(--status-danger)] rounded-[var(--radius-md)] font-medium"
                    >
                      <Trash2 size={16} />
                      Delete List
                    </button>
                    <p className="type-caption text-[var(--text-tertiary)] text-center">
                      Tasks in this list will be moved to Reminders
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Reminder Detail View */}
        {showReminderDetail && selectedReminder && (
          <ReminderDetailView
            reminder={selectedReminder}
            lists={lists}
            onClose={() => {
              setShowReminderDetail(false);
              setSelectedReminder(null);
            }}
            onUpdate={handleUpdateReminder}
            onDelete={handleDeleteReminder}
            onToggleSubtask={handleToggleSubtask}
          />
        )}
        </>)}

      </div>
    </div>
  );
}

// Reminder Detail Component
interface ReminderDetailViewProps {
  reminder: Reminder;
  lists: ReminderList[];
  onClose: () => void;
  onUpdate: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (reminderId: string, subtaskId: string) => void;
}

function ReminderDetailView({ reminder, lists, onClose, onUpdate, onDelete, onToggleSubtask }: ReminderDetailViewProps) {
  const [editedReminder, setEditedReminder] = useState<Reminder>(reminder);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showRecurring, setShowRecurring] = useState(false);

  useEffect(() => {
    setEditedReminder(reminder);
  }, [reminder]);

  const handleSave = () => {
    onUpdate(editedReminder);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setEditedReminder({
      ...editedReminder,
      subtasks: [...(editedReminder.subtasks || []), newSubtask],
    });
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setEditedReminder({
      ...editedReminder,
      subtasks: editedReminder.subtasks?.filter(s => s.id !== subtaskId) || [],
    });
  };

  const list = lists.find(l => l.id === editedReminder.listId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-[var(--accent-primary)] font-medium">
          <ChevronLeft size={20} />
          Back
        </button>
        <button onClick={handleSave} className="text-[var(--accent-primary)] font-medium">
          Done
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Title */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <input
            type="text"
            value={editedReminder.title}
            onChange={(e) => setEditedReminder({ ...editedReminder, title: e.target.value })}
            className="w-full text-lg font-semibold text-[var(--text-primary)] bg-transparent outline-none"
            placeholder="Title"
          />
        </div>

        {/* Notes */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <textarea
            value={editedReminder.notes || ''}
            onChange={(e) => setEditedReminder({ ...editedReminder, notes: e.target.value })}
            className="w-full text-[var(--text-secondary)] bg-transparent outline-none resize-none"
            placeholder="Notes"
            rows={3}
          />
        </div>

        {/* URL */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
          <LinkIcon size={18} className="text-[var(--text-tertiary)]" />
          <input
            type="url"
            value={editedReminder.url || ''}
            onChange={(e) => setEditedReminder({ ...editedReminder, url: e.target.value })}
            className="flex-1 text-[var(--text-secondary)] bg-transparent outline-none"
            placeholder="Add URL"
          />
        </div>

        {/* Date & Time */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Date</span>
            <input
              type="date"
              value={editedReminder.dueDate || ''}
              onChange={(e) => setEditedReminder({ ...editedReminder, dueDate: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)] border-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Time</span>
            <input
              type="time"
              value={editedReminder.dueTime || ''}
              onChange={(e) => setEditedReminder({ ...editedReminder, dueTime: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)] border-0"
            />
          </div>
        </div>

        {/* Recurring */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setShowRecurring(!showRecurring)}
            className="flex items-center gap-3 w-full"
          >
            <Repeat size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Repeat</span>
            <span className="ml-auto text-[var(--text-tertiary)]">
              {editedReminder.recurring ? editedReminder.recurring.type : 'Never'}
            </span>
            <ChevronRight size={16} className="text-[var(--border-subtle)]" />
          </button>
          {showRecurring && (
            <div className="mt-3 ml-8 space-y-2">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    if (editedReminder.recurring?.type === type) {
                      setEditedReminder({ ...editedReminder, recurring: undefined });
                    } else {
                      setEditedReminder({
                        ...editedReminder,
                        recurring: { type, interval: 1 },
                      });
                    }
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-[var(--radius-sm)] ${
                    editedReminder.recurring?.type === type
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                      : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setEditedReminder({ ...editedReminder, recurring: undefined })}
                className={`block w-full text-left px-3 py-2 rounded-[var(--radius-sm)] ${
                  !editedReminder.recurring
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                }`}
              >
                Never
              </button>
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">Priority</span>
          </div>
          <div className="flex gap-2 ml-8">
            {(['none', 'low', 'medium', 'high'] as const).map(priority => (
              <button
                key={priority}
                onClick={() => setEditedReminder({ ...editedReminder, priority })}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium ${
                  editedReminder.priority === priority
                    ? priority === 'none' ? 'bg-[var(--surface-inset)] text-[var(--text-primary)]'
                    : priority === 'low' ? 'bg-blue-500 text-white'
                    : priority === 'medium' ? 'bg-[var(--status-warning)] text-white'
                    : 'bg-[var(--status-danger)] text-white'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                }`}
              >
                {priority === 'none' ? 'None' : priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <List size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">List</span>
          </div>
          <div className="flex gap-2 ml-8 flex-wrap">
            {lists.map(l => (
              <button
                key={l.id}
                onClick={() => setEditedReminder({ ...editedReminder, listId: l.id })}
                className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium flex items-center gap-2 ${
                  editedReminder.listId === l.id
                    ? 'text-white'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                }`}
                style={editedReminder.listId === l.id ? { backgroundColor: l.color } : {}}
              >
                <div
                  className="w-3 h-3 rounded-[var(--radius-full)]"
                  style={{ backgroundColor: editedReminder.listId === l.id ? 'rgba(255,255,255,0.5)' : l.color }}
                />
                {l.name}
              </button>
            ))}
          </div>
        </div>

        {/* Flag */}
        <button
          onClick={() => setEditedReminder({ ...editedReminder, flagged: !editedReminder.flagged })}
          className="w-full p-4 flex items-center gap-3 border-b border-[var(--border-subtle)]"
        >
          <Flag size={18} className={editedReminder.flagged ? 'text-[var(--status-warning)] fill-current' : 'text-[var(--text-tertiary)]'} />
          <span className="text-[var(--text-secondary)]">Flagged</span>
          <div className={`ml-auto w-5 h-5 rounded-[var(--radius-full)] border-2 flex items-center justify-center ${
            editedReminder.flagged ? 'bg-[var(--status-warning)] border-[var(--status-warning)]' : 'border-[var(--border-subtle)]'
          }`}>
            {editedReminder.flagged && <Check size={12} className="text-white" />}
          </div>
        </button>

        {/* Subtasks */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={18} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)] font-medium">Subtasks</span>
          </div>
          <div className="space-y-2 ml-8">
            {editedReminder.subtasks?.map(subtask => (
              <div key={subtask.id} className="flex items-center gap-3">
                <button onClick={() => onToggleSubtask(editedReminder.id, subtask.id)}>
                  {subtask.completed ? (
                    <CheckCircle2 size={20} className="text-[var(--accent-primary)]" fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Circle size={20} className="text-[var(--border-subtle)]" strokeWidth={1.5} />
                  )}
                </button>
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) => {
                    setEditedReminder({
                      ...editedReminder,
                      subtasks: editedReminder.subtasks?.map(s =>
                        s.id === subtask.id ? { ...s, title: e.target.value } : s
                      ),
                    });
                  }}
                  className={`flex-1 bg-transparent outline-none ${subtask.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'}`}
                />
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--status-danger)]"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Plus size={20} className="text-[var(--border-subtle)]" />
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="Add subtask..."
                className="flex-1 bg-transparent text-[var(--text-secondary)] placeholder-[var(--text-tertiary)] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(editedReminder.id)}
        className="w-full p-4 bg-[var(--status-danger)]/10 text-[var(--status-danger)] font-medium rounded-[var(--radius-lg)] flex items-center justify-center gap-2"
      >
        <Trash2 size={18} />
        Delete Reminder
      </button>
    </div>
  );
}
