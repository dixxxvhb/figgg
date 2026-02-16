import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  if (hours < 0.5) return { status: 'Kicking in', color: 'bg-amber-400', percent: 15 };
  if (hours < 1) return { status: 'Building', color: 'bg-amber-500', percent: 40 };
  if (hours < 2) return { status: 'Peak Focus', color: 'bg-green-500', percent: 100 };
  if (hours < 3) return { status: 'Peak Focus', color: 'bg-green-500', percent: 90 };
  if (hours < 4) return { status: 'Wearing Off', color: 'bg-orange-500', percent: 60 };
  if (hours < 5) return { status: 'Low', color: 'bg-orange-600', percent: 30 };
  return { status: 'Worn Off', color: 'bg-gray-400', percent: 10 };
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
  none: 'text-gray-400 dark:text-blush-500',
  low: 'text-blue-500',
  medium: 'text-orange-500',
  high: 'text-red-500',
};

type SmartListType = 'today' | 'scheduled' | 'all' | 'flagged';

export function Me({ initialTab }: { initialTab?: 'meds' | 'reminders' } = {}) {
  const { data, updateSelfCare } = useAppData();
  const [activeTab, setActiveTab] = useState<'meds' | 'reminders'>(() => {
    // If initialTab prop is set (e.g. from /tasks route), use it
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
    if (medConfig.maxDoses === 2 && (sc as Record<string, unknown>).suggestedDose3Date === getTodayKey()) {
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

  // Data-driven wellness checklist — reads from settings, applies conditions dynamically
  type WellnessSection = { title: string; Icon: LucideIcon; items: { id: string; label: string; Icon: LucideIcon }[] };
  const wellnessConfig = data.settings?.wellnessItems || DEFAULT_WELLNESS_ITEMS;
  const WELLNESS_SECTIONS: WellnessSection[] = useMemo(() => {
    const hour = new Date().getHours();
    const hasClasses = todayClasses.length > 0;
    const tookMeds = dose1Time !== null || dose2Time !== null;

    const sectionMap: Record<string, LucideIcon> = { morning: Sunrise, afternoon: CloudSun, evening: Sunset };
    const sectionOrder: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];

    return sectionOrder.map(sec => {
      const items = wellnessConfig
        .filter(item => item.enabled && item.section === sec)
        .filter(item => {
          const c = item.conditions;
          if (!c) return true;
          if (c.requiresMedsTaken && !tookMeds) return false;
          if (c.onlyOnClassDays && !hasClasses) return false;
          if (c.onlyOnOffDays && hasClasses) return false;
          if (c.afterHour !== undefined && hour < c.afterHour) return false;
          return true;
        })
        .sort((a, b) => a.order - b.order)
        .map(item => ({
          id: item.id,
          label: item.label,
          Icon: ICON_MAP[item.icon] || Circle,
        }));

      return {
        title: sec.charAt(0).toUpperCase() + sec.slice(1),
        Icon: sectionMap[sec],
        items,
      };
    }).filter(s => s.items.length > 0);
  }, [wellnessConfig, todayClasses.length, dose1Time, dose2Time]);

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
    <div className="pb-24 bg-gray-50 dark:bg-blush-900">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {activeTab === 'meds' ? 'Meds' : 'Tasks'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-blush-400">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* === Meds Tab === */}
        {activeTab === 'meds' && (<>
        <div className="space-y-3">
            {/* Status bar — compact inline */}
            {!skippedToday && activeDose && (
              <div className={`rounded-xl px-3 py-2.5 ${activeDose.info.color} text-white flex items-center justify-between`}>
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
              <div className="rounded-xl px-3 py-2.5 bg-slate-200 dark:bg-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={16} className="text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">Off Day</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">No meds today</span>
                </div>
                <button onClick={handleUndoSkip} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg">
                  <Undo2 size={12} /> Undo
                </button>
              </div>
            )}

            {/* Dose cards — side by side */}
            {!(skippedToday && skippedDose1 && skippedDose2 && skippedDose3) && (
              <>
                <div className={`grid gap-2 ${(medConfig.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Dose 1 */}
                  <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 p-3">
                    {skippedDose1 && !dose1Time ? (
                      <div className="text-center">
                        <SkipForward size={18} className="mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Dose 1 Skipped</div>
                        <div className="flex gap-1">
                          <button onClick={handleUndoSkipDose1} className="flex-1 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600">Undo</button>
                          <button onClick={handleTakeDose1} className="flex-1 px-2 py-1.5 text-xs bg-forest-600 text-white font-medium rounded-lg">Take</button>
                        </div>
                      </div>
                    ) : dose1Time ? (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-green-600 dark:text-green-400 mb-1" />
                        <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 1</div>
                        <div className="text-[11px] text-gray-500 dark:text-blush-400 mb-2">{formatTime12(new Date(dose1Time))} &bull; {dose1Info?.status}</div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditDose(1)} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-blush-600 text-gray-600 dark:text-blush-300 rounded-lg">Edit</button>
                          <button onClick={handleUndoDose1} className="flex-1 px-2 py-1.5 text-xs text-red-500 dark:text-red-400 rounded-lg">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-gray-400 dark:text-blush-400 mb-1" />
                        <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 1</div>
                        <div className="text-[11px] text-gray-400 dark:text-blush-500 mb-2">Not taken</div>
                        <button onClick={handleTakeDose1} className="w-full px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white text-xs font-semibold rounded-lg min-h-[36px]">Take Now</button>
                      </div>
                    )}
                  </div>

                  {/* Dose 2 */}
                  <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 p-3">
                    {skippedDose2 && !dose2Time ? (
                      <div className="text-center">
                        <SkipForward size={18} className="mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Dose 2 Skipped</div>
                        <div className="flex gap-1">
                          <button onClick={handleUndoSkipDose2} className="flex-1 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600">Undo</button>
                          <button onClick={handleTakeDose2} className="flex-1 px-2 py-1.5 text-xs bg-amber-500 text-white font-medium rounded-lg">Take</button>
                        </div>
                      </div>
                    ) : dose2Time ? (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-green-600 dark:text-green-400 mb-1" />
                        <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 2</div>
                        <div className="text-[11px] text-gray-500 dark:text-blush-400 mb-2">{formatTime12(new Date(dose2Time))} &bull; {dose2Info?.status}</div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditDose(2)} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-blush-600 text-gray-600 dark:text-blush-300 rounded-lg">Edit</button>
                          <button onClick={handleUndoDose2} className="flex-1 px-2 py-1.5 text-xs text-red-500 dark:text-red-400 rounded-lg">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Pill size={18} className="mx-auto text-gray-400 dark:text-blush-400 mb-1" />
                        <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 2</div>
                        <div className="text-[11px] text-gray-400 dark:text-blush-500 mb-2">Not taken</div>
                        <button onClick={handleTakeDose2} className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg min-h-[36px]">Take Now</button>
                      </div>
                    )}
                  </div>

                  {/* Dose 3 — shown when maxDoses=3, OR when optional dose 3 is expanded/taken */}
                  {(medConfig.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) && (
                    <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 p-3">
                      {skippedDose3 && !dose3Time ? (
                        <div className="text-center">
                          <SkipForward size={18} className="mx-auto text-slate-400 dark:text-slate-500 mb-1" />
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Dose 3 Skipped</div>
                          <div className="flex gap-1">
                            <button onClick={handleUndoSkipDose3} className="flex-1 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600">Undo</button>
                            <button onClick={handleTakeDose3} className="flex-1 px-2 py-1.5 text-xs bg-purple-500 text-white font-medium rounded-lg">Take</button>
                          </div>
                        </div>
                      ) : dose3Time ? (
                        <div className="text-center">
                          <Pill size={18} className="mx-auto text-green-600 dark:text-green-400 mb-1" />
                          <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 3</div>
                          <div className="text-[11px] text-gray-500 dark:text-blush-400 mb-2">{formatTime12(new Date(dose3Time))} &bull; {dose3Info?.status}</div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditDose(3)} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-blush-600 text-gray-600 dark:text-blush-300 rounded-lg">Edit</button>
                            <button onClick={handleUndoDose3} className="flex-1 px-2 py-1.5 text-xs text-red-500 dark:text-red-400 rounded-lg">Clear</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Pill size={18} className="mx-auto text-gray-400 dark:text-blush-400 mb-1" />
                          <div className="text-xs font-bold text-gray-800 dark:text-white">Dose 3</div>
                          <div className="text-[11px] text-gray-400 dark:text-blush-500 mb-2">Not taken</div>
                          <button onClick={handleTakeDose3} className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-lg min-h-[36px]">Take Now</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Dose 3 prompt — only when maxDoses=2, dose 2 taken, dose 3 not yet shown */}
                {medConfig.maxDoses === 2 && dose2Time && !showOptionalDose3 && !dose3Time && !skippedDose3 && (
                  <button
                    onClick={() => { setShowOptionalDose3(true); haptic('light'); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <Zap size={14} />
                    <span className="text-xs font-medium">Long day? Add a 3rd dose</span>
                  </button>
                )}

                {/* Edit dose time — full width below grid when editing */}
                {editingDose && (
                  <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 p-3 flex items-center gap-3">
                    <Pill size={16} className={editingDose === 1 ? 'text-forest-600 dark:text-forest-400' : editingDose === 2 ? 'text-amber-600 dark:text-amber-400' : 'text-purple-600 dark:text-purple-400'} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">Dose {editingDose}</span>
                    <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-gray-800 dark:text-white" autoFocus />
                    <button onClick={handleSaveEditTime} className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg" aria-label="Save"><Check size={16} /></button>
                    <button onClick={() => setEditingDose(null)} className="p-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-blush-600 dark:hover:bg-blush-500 text-gray-600 dark:text-white rounded-lg" aria-label="Cancel"><X size={16} /></button>
                  </div>
                )}

                {/* Skip — compact link */}
                {((!dose1Time && !skippedDose1) || (!dose2Time && !skippedDose2) || ((medConfig.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3)) && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSkipOptions(!showSkipOptions)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-gray-400 dark:text-blush-500 hover:text-gray-600 dark:hover:text-blush-300"
                    >
                      <SkipForward size={13} />
                      <span className="text-xs">Skip</span>
                      <ChevronRight size={12} className={`transition-transform ${showSkipOptions ? 'rotate-90' : ''}`} />
                    </button>
                    {showSkipOptions && (
                      <div className="mt-1 bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 overflow-hidden">
                        {!dose1Time && !skippedDose1 && (
                          <button onClick={handleSkipDose1} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-blush-700 border-b border-gray-100 dark:border-blush-700">
                            <SkipForward size={14} className="text-forest-600 dark:text-forest-400" />
                            <span className="text-sm text-gray-800 dark:text-white">Skip Dose 1</span>
                          </button>
                        )}
                        {!dose2Time && !skippedDose2 && (
                          <button onClick={handleSkipDose2} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-blush-700 border-b border-gray-100 dark:border-blush-700">
                            <SkipForward size={14} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-sm text-gray-800 dark:text-white">Skip Dose 2</span>
                          </button>
                        )}
                        {(medConfig.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3 && (
                          <button onClick={handleSkipDose3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-blush-700 border-b border-gray-100 dark:border-blush-700">
                            <SkipForward size={14} className="text-purple-600 dark:text-purple-400" />
                            <span className="text-sm text-gray-800 dark:text-white">Skip Dose 3</span>
                          </button>
                        )}
                        <button onClick={handleSkipToday} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-blush-700">
                          <Moon size={14} className="text-slate-500 dark:text-slate-400" />
                          <span className="text-sm text-gray-800 dark:text-white">Skip all day</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Wellness check-in */}
            <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-blush-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-blush-400 uppercase tracking-wide">Daily Check-in</span>
                <span className="text-xs text-gray-400 dark:text-blush-500">
                  {ALL_WELLNESS_ITEMS.filter(i => wellnessStates[i.id]).length}/{ALL_WELLNESS_ITEMS.length}
                </span>
              </div>
              {WELLNESS_SECTIONS.map(section => (
                <div key={section.title}>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 bg-gray-50 dark:bg-blush-850">
                    <section.Icon size={12} className="text-gray-400 dark:text-blush-500" />
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-blush-500 uppercase tracking-wide">{section.title}</span>
                  </div>
                  {section.items.map(item => {
                    const done = wellnessStates[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => { toggleWellness(item.id); haptic('light'); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${done ? 'opacity-50' : 'active:bg-gray-50 dark:active:bg-blush-700'}`}
                      >
                        {done ? (
                          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" fill="currentColor" strokeWidth={0} />
                        ) : (
                          <Circle size={18} className="text-gray-300 dark:text-blush-600 flex-shrink-0" strokeWidth={1.5} />
                        )}
                        <item.Icon size={14} className={done ? 'text-gray-400 dark:text-blush-500' : 'text-gray-500 dark:text-blush-400'} />
                        <span className={`text-sm ${done ? 'text-gray-400 dark:text-blush-500 line-through' : 'text-gray-700 dark:text-blush-200'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
        </div>
        </>)}

        {/* === Reminders Tab === */}
        {activeTab === 'reminders' && (<>
        <div>
        {!showReminderDetail && (
          <>
            {/* Smart List Filters — compact pill row */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
              {([
                { id: 'today' as SmartListType, label: 'Today', count: smartCounts.today, activeClass: 'bg-blue-500 text-white', badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', Icon: CalendarDays },
                { id: 'scheduled' as SmartListType, label: 'Scheduled', count: smartCounts.scheduled, activeClass: 'bg-red-500 text-white', badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', Icon: Calendar },
                { id: 'all' as SmartListType, label: 'All', count: smartCounts.all, activeClass: 'bg-purple-500 text-white', badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', Icon: Inbox },
                { id: 'flagged' as SmartListType, label: 'Flagged', count: smartCounts.flagged, activeClass: 'bg-orange-500 text-white', badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', Icon: Flag },
              ]).map(({ id, label, count, activeClass, badgeClass, Icon }) => {
                const isActive = currentView === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCurrentView(id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors min-h-[40px] flex-shrink-0 ${
                      isActive
                        ? activeClass
                        : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700 text-gray-700 dark:text-blush-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                    {count > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isActive ? 'bg-white/25' : badgeClass
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
                <span className="text-[11px] font-semibold text-gray-400 dark:text-blush-500 uppercase tracking-wide flex-shrink-0">Lists</span>
                {lists.map(list => {
                  const count = reminders.filter(r => !r.completed && r.listId === list.id).length;
                  const isActive = currentView === list.id;
                  return (
                    <button
                      key={list.id}
                      onClick={() => setCurrentView(list.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700 text-gray-700 dark:text-blush-300'
                      }`}
                      style={isActive ? { backgroundColor: list.color } : {}}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : list.color }}
                      />
                      {list.name}
                      {count > 0 && (
                        <span className={`text-xs font-bold ${isActive ? 'text-white/70' : 'text-gray-400 dark:text-blush-500'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowNewList(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0"
                >
                  <Plus size={12} />
                  New
                </button>
              </div>
            )}

            {/* Current View Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold" style={{ color: getViewColor() }}>
                {getViewTitle()}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-blush-500">
                  {filteredReminders.filter(r => !r.completed).length} tasks
                </span>
                {currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' && currentView !== 'inbox' && (
                  <button
                    onClick={() => handleOpenEditList(lists.find(l => l.id === currentView)!)}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-blush-500 hover:text-gray-600 dark:hover:text-blush-300 hover:bg-gray-100 dark:hover:bg-blush-700"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Reminders List */}
            <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden mb-4">
              {filteredReminders.length === 0 ? (
                <div className="px-8 pt-6 pb-2 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
                  <p className="text-gray-600 dark:text-blush-300 font-medium text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-blush-700">
                  {filteredReminders.map((reminder) => {
                    const SWIPE_THRESHOLD = 80;
                    return (
                      <div
                        key={reminder.id}
                        className="relative overflow-hidden"
                      >
                        {/* Green reveal behind the swipe */}
                        <div className="absolute inset-0 bg-green-500 flex items-center justify-end pr-6">
                          <Check size={24} className="text-white" />
                        </div>
                        <div
                          className="relative bg-white dark:bg-blush-800 flex items-start gap-3 p-4 active:bg-gray-50 dark:active:bg-blush-700 cursor-pointer transition-transform"
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
                              <CheckCircle2 size={24} className="text-blue-500" fill="currentColor" strokeWidth={0} />
                            ) : (
                              <Circle
                                size={24}
                                className={PRIORITY_COLORS[reminder.priority]}
                                strokeWidth={reminder.priority === 'high' ? 2.5 : 1.5}
                              />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${reminder.completed ? 'text-gray-400 dark:text-blush-500 line-through' : 'text-gray-800 dark:text-white'}`}>
                              {reminder.title}
                            </p>
                            {reminder.notes && (
                              <p className="text-sm text-gray-400 dark:text-blush-500 line-clamp-1 mt-0.5">
                                {reminder.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {reminder.dueDate && (
                                <span className={`text-xs flex items-center gap-1 ${
                                  !reminder.completed && reminder.dueDate && isPast(startOfDay(parseISO(reminder.dueDate))) && reminder.dueDate !== todayStr
                                    ? 'text-red-500'
                                    : 'text-gray-400 dark:text-blush-500'
                                }`}>
                                  <Bell size={10} />
                                  {formatDueDate(reminder.dueDate, reminder.dueTime)}
                                </span>
                              )}
                              {reminder.recurring && (
                                <span className="text-xs text-gray-400 dark:text-blush-500 flex items-center gap-1">
                                  <Repeat size={10} />
                                  {reminder.recurring.type}
                                </span>
                              )}
                              {reminder.subtasks && reminder.subtasks.length > 0 && (
                                <span className="text-xs text-gray-400 dark:text-blush-500">
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
                            <Flag size={18} className={reminder.flagged ? 'text-orange-500 fill-orange-500' : 'text-gray-300 dark:text-blush-600'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}

              {/* Inline quick-add — always visible */}
              <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-blush-700">
                <Plus size={20} className="text-gray-300 dark:text-blush-600 flex-shrink-0" />
                <input
                  ref={inlineInputRef}
                  type="text"
                  value={inlineAddText}
                  onChange={(e) => setInlineAddText(e.target.value)}
                  placeholder="Add a reminder..."
                  className="flex-1 bg-transparent text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-blush-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlineAddText.trim()) handleInlineAdd();
                  }}
                />
              </div>

              {completedCount > 0 && (
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full p-3 text-sm text-gray-500 dark:text-blush-400 flex items-center justify-center gap-1 border-t border-gray-100 dark:border-blush-700"
                >
                  {showCompleted ? 'Hide' : 'Show'} {completedCount} Completed
                  <ChevronRight size={14} className={showCompleted ? 'rotate-90 transition-transform' : 'transition-transform'} />
                </button>
              )}
            </div>

            {/* New List Modal */}
            {showNewList && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white dark:bg-blush-800 rounded-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-blush-700 flex items-center justify-between">
                    <button onClick={() => setShowNewList(false)} className="text-blue-500 font-medium">Cancel</button>
                    <h3 className="font-semibold text-gray-800 dark:text-white">New List</h3>
                    <button
                      onClick={handleAddList}
                      disabled={!newListName.trim()}
                      className="text-blue-500 font-medium disabled:opacity-50"
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
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-blush-700 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-blush-500 outline-none"
                      autoFocus
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-blush-400 mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewListColor(color)}
                            className={`w-10 h-10 rounded-full ${newListColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
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
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                <div className="bg-white dark:bg-blush-800 rounded-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-blush-700 flex items-center justify-between">
                    <button onClick={() => setEditingList(null)} className="text-blue-500 font-medium">Cancel</button>
                    <h3 className="font-semibold text-gray-800 dark:text-white">Edit List</h3>
                    <button
                      onClick={handleSaveEditList}
                      disabled={!editListName.trim()}
                      className="text-blue-500 font-medium disabled:opacity-50"
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
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-blush-700 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-blush-500 outline-none"
                      autoFocus
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-blush-400 mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditListColor(color)}
                            className={`w-10 h-10 rounded-full ${editListColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteList(editingList.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-medium"
                    >
                      <Trash2 size={16} />
                      Delete List
                    </button>
                    <p className="text-xs text-gray-400 dark:text-blush-500 text-center">
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
        <button onClick={onClose} className="flex items-center gap-1 text-blue-500 font-medium">
          <ChevronLeft size={20} />
          Back
        </button>
        <button onClick={handleSave} className="text-blue-500 font-medium">
          Done
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden">
        {/* Title */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <input
            type="text"
            value={editedReminder.title}
            onChange={(e) => setEditedReminder({ ...editedReminder, title: e.target.value })}
            className="w-full text-lg font-semibold text-gray-800 dark:text-white bg-transparent outline-none"
            placeholder="Title"
          />
        </div>

        {/* Notes */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <textarea
            value={editedReminder.notes || ''}
            onChange={(e) => setEditedReminder({ ...editedReminder, notes: e.target.value })}
            className="w-full text-gray-600 dark:text-blush-300 bg-transparent outline-none resize-none"
            placeholder="Notes"
            rows={3}
          />
        </div>

        {/* URL */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700 flex items-center gap-3">
          <LinkIcon size={18} className="text-gray-400" />
          <input
            type="url"
            value={editedReminder.url || ''}
            onChange={(e) => setEditedReminder({ ...editedReminder, url: e.target.value })}
            className="flex-1 text-gray-600 dark:text-blush-300 bg-transparent outline-none"
            placeholder="Add URL"
          />
        </div>

        {/* Date & Time */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <div className="flex items-center gap-3 mb-3">
            <Calendar size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300">Date</span>
            <input
              type="date"
              value={editedReminder.dueDate || ''}
              onChange={(e) => setEditedReminder({ ...editedReminder, dueDate: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-lg bg-gray-100 dark:bg-blush-700 text-gray-800 dark:text-white border-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300">Time</span>
            <input
              type="time"
              value={editedReminder.dueTime || ''}
              onChange={(e) => setEditedReminder({ ...editedReminder, dueTime: e.target.value || undefined })}
              className="ml-auto px-3 py-1 rounded-lg bg-gray-100 dark:bg-blush-700 text-gray-800 dark:text-white border-0"
            />
          </div>
        </div>

        {/* Recurring */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <button
            onClick={() => setShowRecurring(!showRecurring)}
            className="flex items-center gap-3 w-full"
          >
            <Repeat size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300">Repeat</span>
            <span className="ml-auto text-gray-400 dark:text-blush-500">
              {editedReminder.recurring ? editedReminder.recurring.type : 'Never'}
            </span>
            <ChevronRight size={16} className="text-gray-300" />
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
                  className={`block w-full text-left px-3 py-2 rounded-lg ${
                    editedReminder.recurring?.type === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setEditedReminder({ ...editedReminder, recurring: undefined })}
                className={`block w-full text-left px-3 py-2 rounded-lg ${
                  !editedReminder.recurring
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300'
                }`}
              >
                Never
              </button>
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300">Priority</span>
          </div>
          <div className="flex gap-2 ml-8">
            {(['none', 'low', 'medium', 'high'] as const).map(priority => (
              <button
                key={priority}
                onClick={() => setEditedReminder({ ...editedReminder, priority })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  editedReminder.priority === priority
                    ? priority === 'none' ? 'bg-gray-200 dark:bg-blush-600 text-gray-700 dark:text-white'
                    : priority === 'low' ? 'bg-blue-500 text-white'
                    : priority === 'medium' ? 'bg-orange-500 text-white'
                    : 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300'
                }`}
              >
                {priority === 'none' ? 'None' : priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="p-4 border-b border-gray-100 dark:border-blush-700">
          <div className="flex items-center gap-3 mb-3">
            <List size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300">List</span>
          </div>
          <div className="flex gap-2 ml-8 flex-wrap">
            {lists.map(l => (
              <button
                key={l.id}
                onClick={() => setEditedReminder({ ...editedReminder, listId: l.id })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  editedReminder.listId === l.id
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300'
                }`}
                style={editedReminder.listId === l.id ? { backgroundColor: l.color } : {}}
              >
                <div
                  className="w-3 h-3 rounded-full"
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
          className="w-full p-4 flex items-center gap-3 border-b border-gray-100 dark:border-blush-700"
        >
          <Flag size={18} className={editedReminder.flagged ? 'text-orange-500 fill-orange-500' : 'text-gray-400'} />
          <span className="text-gray-600 dark:text-blush-300">Flagged</span>
          <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            editedReminder.flagged ? 'bg-orange-500 border-orange-500' : 'border-gray-300 dark:border-blush-600'
          }`}>
            {editedReminder.flagged && <Check size={12} className="text-white" />}
          </div>
        </button>

        {/* Subtasks */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 size={18} className="text-gray-400" />
            <span className="text-gray-600 dark:text-blush-300 font-medium">Subtasks</span>
          </div>
          <div className="space-y-2 ml-8">
            {editedReminder.subtasks?.map(subtask => (
              <div key={subtask.id} className="flex items-center gap-3">
                <button onClick={() => onToggleSubtask(editedReminder.id, subtask.id)}>
                  {subtask.completed ? (
                    <CheckCircle2 size={20} className="text-blue-500" fill="currentColor" strokeWidth={0} />
                  ) : (
                    <Circle size={20} className="text-gray-300 dark:text-blush-600" strokeWidth={1.5} />
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
                  className={`flex-1 bg-transparent outline-none ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-blush-300'}`}
                />
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Plus size={20} className="text-gray-300 dark:text-blush-600" />
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
                placeholder="Add subtask..."
                className="flex-1 bg-transparent text-gray-600 dark:text-blush-300 placeholder-gray-400 dark:placeholder-blush-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(editedReminder.id)}
        className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-2xl flex items-center justify-center gap-2"
      >
        <Trash2 size={18} />
        Delete Reminder
      </button>
    </div>
  );
}
