import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Pill, Clock, Zap, Moon, SkipForward, Undo2, Pencil, X, Check, Plus, Circle,
  CheckCircle2, Flag, ChevronRight, Calendar, Bell, List, ChevronLeft, Trash2,
  CalendarDays, Inbox, Star, AlertCircle, MoreHorizontal, Tag, Repeat, Link as LinkIcon
} from 'lucide-react';
import { loadData, saveData } from '../services/storage';
import { getCurrentDayOfWeek } from '../utils/time';
import {
  format, isToday as isDateToday, isTomorrow, isPast, parseISO, startOfDay,
  addDays, isAfter, isBefore, isEqual
} from 'date-fns';
import type { Class, Studio, Reminder, ReminderList, Subtask, RecurringSchedule } from '../types';

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

export function Me() {
  const [activeTab, setActiveTab] = useState<'meds' | 'tasks'>('meds');

  // Check if we should open tasks tab (from dashboard click)
  useEffect(() => {
    const target = sessionStorage.getItem('meTabTarget');
    if (target === 'tasks') {
      setActiveTab('tasks');
      sessionStorage.removeItem('meTabTarget');
    }
  }, []);

  // Meds state
  const [dose1Time, setDose1Time] = useState<number | null>(null);
  const [dose2Time, setDose2Time] = useState<number | null>(null);
  const [skippedToday, setSkippedToday] = useState(false);
  const [skippedDose1, setSkippedDose1] = useState(false);
  const [skippedDose2, setSkippedDose2] = useState(false);
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [todayClasses, setTodayClasses] = useState<(Class & { studio?: Studio })[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingDose, setEditingDose] = useState<1 | 2 | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');

  // Tasks state
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [lists, setLists] = useState<ReminderList[]>(DEFAULT_LISTS);
  const [currentView, setCurrentView] = useState<SmartListType | string>('today');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReminderDetail, setShowReminderDetail] = useState(false);
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [showCompleted, setShowCompleted] = useState(false);

  // New reminder form state
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    title: '',
    notes: '',
    listId: 'inbox',
    priority: 'none',
    flagged: false,
    dueDate: undefined,
    dueTime: undefined,
    subtasks: [],
  });

  // Load all data on mount
  useEffect(() => {
    const data = loadData();
    const sc = data.selfCare || {};
    const today = getTodayKey();

    // Load meds data
    if (isTodayTimestamp(sc.dose1Time)) setDose1Time(sc.dose1Time!);
    if (isTodayTimestamp(sc.dose2Time)) setDose2Time(sc.dose2Time!);
    if (sc.skippedDoseDate === today) setSkippedToday(true);
    if (sc.skippedDose1Date === today) setSkippedDose1(true);
    if (sc.skippedDose2Date === today) setSkippedDose2(true);

    // Load today's classes
    const currentDay = getCurrentDayOfWeek();
    const studios = data.studios || [];
    const classes = (data.classes || [])
      .filter((c: Class) => c.day === currentDay)
      .map((c: Class) => ({ ...c, studio: studios.find((s: Studio) => s.id === c.studioId) }))
      .sort((a: Class, b: Class) => a.startTime.localeCompare(b.startTime));
    setTodayClasses(classes);

    // Load tasks data
    setReminders(sc.reminders || []);
    setLists(sc.reminderLists || DEFAULT_LISTS);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    const data = loadData();
    data.selfCare = { ...data.selfCare, ...updates };
    saveData(data);
  }, []);

  // Meds handlers
  const handleTakeDose1 = () => {
    const now = Date.now();
    setDose1Time(now);
    setSkippedToday(false);
    setSkippedDose1(false);
    persist({ dose1Time: now, dose1Date: new Date().toDateString(), skippedDoseDate: null, skippedDose1Date: null });
  };

  const handleTakeDose2 = () => {
    const now = Date.now();
    setDose2Time(now);
    setSkippedDose2(false);
    // If both doses are now taken, clear the whole day skip
    if (dose1Time) setSkippedToday(false);
    persist({ dose2Time: now, dose2Date: new Date().toDateString(), skippedDose2Date: null, skippedDoseDate: dose1Time ? null : undefined });
  };

  const handleSkipToday = () => {
    setSkippedToday(true);
    setSkippedDose1(true);
    setSkippedDose2(true);
    setDose1Time(null);
    setDose2Time(null);
    setShowSkipOptions(false);
    persist({
      skippedDoseDate: getTodayKey(),
      skippedDose1Date: getTodayKey(),
      skippedDose2Date: getTodayKey(),
      dose1Time: null,
      dose1Date: null,
      dose2Time: null,
      dose2Date: null
    });
  };

  const handleSkipDose1 = () => {
    setSkippedDose1(true);
    setDose1Time(null);
    setShowSkipOptions(false);
    persist({ skippedDose1Date: getTodayKey(), dose1Time: null, dose1Date: null });
  };

  const handleSkipDose2 = () => {
    setSkippedDose2(true);
    setDose2Time(null);
    setShowSkipOptions(false);
    persist({ skippedDose2Date: getTodayKey(), dose2Time: null, dose2Date: null });
  };

  const handleUndoSkip = () => {
    setSkippedToday(false);
    setSkippedDose1(false);
    setSkippedDose2(false);
    persist({ skippedDoseDate: null, skippedDose1Date: null, skippedDose2Date: null });
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
    persist({ dose1Time: null, dose1Date: null });
  };

  const handleUndoDose2 = () => {
    setDose2Time(null);
    persist({ dose2Time: null, dose2Date: null });
  };

  const handleEditDose = (doseNum: 1 | 2) => {
    const doseTime = doseNum === 1 ? dose1Time : dose2Time;
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
      persist({ dose1Time: timestamp, dose1Date: new Date().toDateString(), skippedDoseDate: null });
    } else {
      setDose2Time(timestamp);
      persist({ dose2Time: timestamp, dose2Date: new Date().toDateString() });
    }
    setEditingDose(null);
  };

  // Tasks handlers
  const persistTasks = useCallback((newReminders: Reminder[], newLists: ReminderList[]) => {
    const data = loadData();
    data.selfCare = { ...data.selfCare, reminders: newReminders, reminderLists: newLists };
    saveData(data);
  }, []);

  const handleAddReminder = useCallback(() => {
    if (!newReminder.title?.trim()) return;
    const reminder: Reminder = {
      id: generateId(),
      title: newReminder.title.trim(),
      notes: newReminder.notes || '',
      listId: newReminder.listId || 'inbox',
      completed: false,
      priority: newReminder.priority || 'none',
      flagged: newReminder.flagged || false,
      dueDate: newReminder.dueDate,
      dueTime: newReminder.dueTime,
      subtasks: newReminder.subtasks || [],
      recurring: newReminder.recurring,
      url: newReminder.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...reminders, reminder];
    setReminders(updated);
    persistTasks(updated, lists);
    setNewReminder({
      title: '',
      notes: '',
      listId: currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' ? currentView : 'inbox',
      priority: 'none',
      flagged: currentView === 'flagged',
      dueDate: currentView === 'today' ? getTodayKey() : undefined,
      dueTime: undefined,
      subtasks: [],
    });
    setShowNewReminder(false);
  }, [newReminder, reminders, lists, persistTasks, currentView]);

  const handleToggleComplete = useCallback((id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        const nowCompleted = !r.completed;
        // Handle recurring tasks
        if (nowCompleted && r.recurring && r.dueDate) {
          const nextDate = getNextRecurringDate(r.dueDate, r.recurring);
          if (nextDate) {
            // Create a new instance for the next occurrence
            const newReminder: Reminder = {
              ...r,
              id: generateId(),
              completed: false,
              completedAt: undefined,
              dueDate: nextDate,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Add to reminders after the map
            setTimeout(() => {
              setReminders(prev => {
                const withNew = [...prev, newReminder];
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
    setReminders(updated);
    persistTasks(updated, lists);
  }, [reminders, lists, persistTasks]);

  const handleToggleFlag = useCallback((id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) return { ...r, flagged: !r.flagged, updatedAt: new Date().toISOString() };
      return r;
    });
    setReminders(updated);
    persistTasks(updated, lists);
  }, [reminders, lists, persistTasks]);

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
  }, [lists, reminders, persistTasks]);

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
  const activeDose = dose2Info && dose2Info.status !== 'Worn Off'
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

  const totalIncomplete = reminders.filter(r => !r.completed).length;

  return (
    <div className="h-full overflow-y-auto pb-24 bg-gray-50 dark:bg-blush-900 ios-scroll">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Me</h1>
          <p className="text-sm text-gray-500 dark:text-blush-400">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-200 dark:bg-blush-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('meds')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'meds'
                ? 'bg-white dark:bg-blush-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-blush-400'
            }`}
          >
            <Pill size={16} />
            Meds
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-blush-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-blush-400'
            }`}
          >
            <CheckCircle2 size={16} />
            Tasks
            {totalIncomplete > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {totalIncomplete}
              </span>
            )}
          </button>
        </div>

        {/* Meds Tab */}
        {activeTab === 'meds' && (
          <>
            {/* Current Status Banner */}
            {!skippedToday && activeDose && (
              <div className={`rounded-2xl p-4 mb-4 ${activeDose.info.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap size={24} className="opacity-90" />
                    <div>
                      <div className="font-bold text-lg">{activeDose.info.status}</div>
                      <div className="text-sm opacity-90">
                        Dose {activeDose.num} • took at {formatTime12(new Date(activeDose.time!))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{activeDose.info.percent}%</div>
                    <div className="text-xs opacity-75">effectiveness</div>
                  </div>
                </div>
              </div>
            )}

            {/* Skipped Banner */}
            {/* Full Day Skipped Banner */}
            {skippedToday && skippedDose1 && skippedDose2 && (
              <div className="rounded-2xl p-4 mb-4 bg-slate-200 dark:bg-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon size={24} className="text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200">Off Day</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">No meds today</div>
                    </div>
                  </div>
                  <button onClick={handleUndoSkip} className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg">
                    <Undo2 size={14} /> Undo
                  </button>
                </div>
              </div>
            )}

            {/* Dose Buttons */}
            {!(skippedToday && skippedDose1 && skippedDose2) && (
              <div className="space-y-3 mb-6">
                {/* Dose 1 */}
                <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden">
                  <div className="p-4">
                    {skippedDose1 && !dose1Time ? (
                      // Dose 1 skipped
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                            <SkipForward size={20} className="text-slate-400 dark:text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 1</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Skipped</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleUndoSkipDose1} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg">Undo</button>
                          <button onClick={handleTakeDose1} className="px-3 py-1.5 text-sm bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-lg">Take Instead</button>
                        </div>
                      </div>
                    ) : editingDose === 1 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-forest-100 dark:bg-forest-900/30">
                          <Pill size={20} className="text-forest-600 dark:text-forest-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-white mb-2">Dose 1 Time</div>
                          <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-gray-800 dark:text-white" autoFocus />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={handleSaveEditTime} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"><Check size={18} /></button>
                          <button onClick={() => setEditingDose(null)} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-blush-600 dark:hover:bg-blush-500 text-gray-600 dark:text-white rounded-lg"><X size={18} /></button>
                        </div>
                      </div>
                    ) : dose1Time ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                            <Pill size={20} className="text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 1</div>
                            <div className="text-sm text-gray-500 dark:text-blush-400">{formatTime12(new Date(dose1Time))} • {dose1Info?.status}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditDose(1)} className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-blush-600 text-gray-700 dark:text-blush-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-blush-700">Edit Time</button>
                          <button onClick={handleUndoDose1} className="flex-1 py-2.5 px-4 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-blush-700">
                            <Pill size={20} className="text-gray-400 dark:text-blush-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 1</div>
                            <div className="text-sm text-gray-400 dark:text-blush-500">Not taken yet</div>
                          </div>
                        </div>
                        <button onClick={handleTakeDose1} className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white font-medium rounded-xl">Take Now</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dose 2 */}
                <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden">
                  <div className="p-4">
                    {skippedDose2 && !dose2Time ? (
                      // Dose 2 skipped
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                            <SkipForward size={20} className="text-slate-400 dark:text-slate-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 2</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Skipped</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleUndoSkipDose2} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg">Undo</button>
                          <button onClick={handleTakeDose2} className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg">Take Instead</button>
                        </div>
                      </div>
                    ) : editingDose === 2 ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                          <Pill size={20} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-white mb-2">Dose 2 Time</div>
                          <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-blush-600 rounded-lg bg-white dark:bg-blush-700 text-gray-800 dark:text-white" autoFocus />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={handleSaveEditTime} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"><Check size={18} /></button>
                          <button onClick={() => setEditingDose(null)} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-blush-600 dark:hover:bg-blush-500 text-gray-600 dark:text-white rounded-lg"><X size={18} /></button>
                        </div>
                      </div>
                    ) : dose2Time ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                            <Pill size={20} className="text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 2</div>
                            <div className="text-sm text-gray-500 dark:text-blush-400">{formatTime12(new Date(dose2Time))} • {dose2Info?.status}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditDose(2)} className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-blush-600 text-gray-700 dark:text-blush-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-blush-700">Edit Time</button>
                          <button onClick={handleUndoDose2} className="flex-1 py-2.5 px-4 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">Clear</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-blush-700">
                            <Pill size={20} className="text-gray-400 dark:text-blush-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-white">Dose 2</div>
                            <div className="text-sm text-gray-400 dark:text-blush-500">Not taken yet</div>
                          </div>
                        </div>
                        <button onClick={handleTakeDose2} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl">Take Now</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skip Options */}
                {(!dose1Time || !dose2Time) && !skippedDose1 && !skippedDose2 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSkipOptions(!showSkipOptions)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 dark:text-blush-400 hover:text-gray-700 dark:hover:text-blush-300"
                    >
                      <SkipForward size={16} />
                      <span className="text-sm">Skip options</span>
                      <ChevronRight size={14} className={`transition-transform ${showSkipOptions ? 'rotate-90' : ''}`} />
                    </button>

                    {showSkipOptions && (
                      <div className="mt-2 bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 overflow-hidden">
                        {!dose1Time && (
                          <button
                            onClick={handleSkipDose1}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-blush-700 border-b border-gray-100 dark:border-blush-700"
                          >
                            <div className="w-8 h-8 rounded-full bg-forest-100 dark:bg-forest-900/30 flex items-center justify-center">
                              <SkipForward size={16} className="text-forest-600 dark:text-forest-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">Skip Dose 1 only</div>
                              <div className="text-xs text-gray-500 dark:text-blush-400">Still plan to take Dose 2 later</div>
                            </div>
                          </button>
                        )}
                        {!dose2Time && (
                          <button
                            onClick={handleSkipDose2}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-blush-700 border-b border-gray-100 dark:border-blush-700"
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <SkipForward size={16} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">Skip Dose 2 only</div>
                              <div className="text-xs text-gray-500 dark:text-blush-400">Just taking one dose today</div>
                            </div>
                          </button>
                        )}
                        <button
                          onClick={handleSkipToday}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-blush-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <Moon size={16} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-white">Skip all day</div>
                            <div className="text-xs text-gray-500 dark:text-blush-400">Off day - no meds today</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Today's Schedule */}
            <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-blush-700">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-gray-500 dark:text-blush-400" />
                  <h2 className="font-semibold text-gray-800 dark:text-white">Today's Schedule</h2>
                </div>
              </div>
              {todayClasses.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600 dark:text-blush-300 font-medium">No classes today</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-blush-700">
                  {todayClasses.map((cls) => (
                    <div key={cls.id} className="p-4 flex items-center gap-3">
                      <div className="text-right min-w-[60px]">
                        <div className="font-medium text-gray-800 dark:text-white">{formatTimeFromString(cls.startTime)}</div>
                        <div className="text-xs text-gray-400 dark:text-blush-500">{formatTimeFromString(cls.endTime)}</div>
                      </div>
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: cls.studio?.color || '#888' }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-gray-800 dark:text-white">{cls.name}</div>
                        <div className="text-sm text-gray-500 dark:text-blush-400 truncate">{cls.studio?.shortName || cls.studio?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && !showReminderDetail && (
          <>
            {/* Smart Lists Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setCurrentView('today')}
                className={`p-4 rounded-2xl text-left transition-all ${
                  currentView === 'today'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  currentView === 'today' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <CalendarDays size={18} className={currentView === 'today' ? 'text-white' : 'text-blue-500'} />
                </div>
                <div className="text-2xl font-bold">{smartCounts.today}</div>
                <div className={`text-sm ${currentView === 'today' ? 'text-white/80' : 'text-gray-500 dark:text-blush-400'}`}>Today</div>
              </button>

              <button
                onClick={() => setCurrentView('scheduled')}
                className={`p-4 rounded-2xl text-left transition-all ${
                  currentView === 'scheduled'
                    ? 'bg-red-500 text-white'
                    : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  currentView === 'scheduled' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <Calendar size={18} className={currentView === 'scheduled' ? 'text-white' : 'text-red-500'} />
                </div>
                <div className="text-2xl font-bold">{smartCounts.scheduled}</div>
                <div className={`text-sm ${currentView === 'scheduled' ? 'text-white/80' : 'text-gray-500 dark:text-blush-400'}`}>Scheduled</div>
              </button>

              <button
                onClick={() => setCurrentView('all')}
                className={`p-4 rounded-2xl text-left transition-all ${
                  currentView === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  currentView === 'all' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-900/30'
                }`}>
                  <Inbox size={18} className={currentView === 'all' ? 'text-white' : 'text-purple-500'} />
                </div>
                <div className="text-2xl font-bold">{smartCounts.all}</div>
                <div className={`text-sm ${currentView === 'all' ? 'text-white/80' : 'text-gray-500 dark:text-blush-400'}`}>All</div>
              </button>

              <button
                onClick={() => setCurrentView('flagged')}
                className={`p-4 rounded-2xl text-left transition-all ${
                  currentView === 'flagged'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-blush-800 border border-gray-200 dark:border-blush-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                  currentView === 'flagged' ? 'bg-white/20' : 'bg-orange-100 dark:bg-orange-900/30'
                }`}>
                  <Flag size={18} className={currentView === 'flagged' ? 'text-white' : 'text-orange-500'} />
                </div>
                <div className="text-2xl font-bold">{smartCounts.flagged}</div>
                <div className={`text-sm ${currentView === 'flagged' ? 'text-white/80' : 'text-gray-500 dark:text-blush-400'}`}>Flagged</div>
              </button>
            </div>

            {/* Custom Lists */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-blush-400 uppercase tracking-wide">My Lists</h3>
                <button
                  onClick={() => setShowNewList(true)}
                  className="text-blue-500 text-sm font-medium"
                >
                  Add List
                </button>
              </div>
              <div className="space-y-2">
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setCurrentView(list.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      currentView === list.id
                        ? 'bg-white dark:bg-blush-700 shadow-sm border border-gray-200 dark:border-blush-600'
                        : 'hover:bg-white/50 dark:hover:bg-blush-800/50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${list.color}20` }}
                    >
                      <List size={16} style={{ color: list.color }} />
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-800 dark:text-white">{list.name}</span>
                    <span className="text-gray-400 dark:text-blush-500">
                      {reminders.filter(r => !r.completed && r.listId === list.id).length}
                    </span>
                    <ChevronRight size={16} className="text-gray-300 dark:text-blush-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Current View Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: getViewColor() }}>
                {getViewTitle()}
              </h2>
              <span className="text-sm text-gray-500 dark:text-blush-400">
                {filteredReminders.filter(r => !r.completed).length} tasks
              </span>
            </div>

            {/* Reminders List */}
            <div className="bg-white dark:bg-blush-800 rounded-2xl border border-gray-200 dark:border-blush-700 overflow-hidden mb-4">
              {filteredReminders.length === 0 && !showNewReminder ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
                  <p className="text-gray-600 dark:text-blush-300 font-medium">All caught up!</p>
                  <p className="text-sm text-gray-400 dark:text-blush-500">No tasks in this list</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-blush-700">
                  {filteredReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 p-4 active:bg-gray-50 dark:active:bg-blush-700 cursor-pointer"
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
                  ))}

                  {showNewReminder && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Circle size={24} className="text-gray-300 dark:text-blush-600 mt-0.5" strokeWidth={1.5} />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newReminder.title}
                            onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                            placeholder="New reminder..."
                            className="w-full bg-transparent text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-blush-500 outline-none font-medium"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newReminder.title?.trim()) handleAddReminder();
                              if (e.key === 'Escape') { setShowNewReminder(false); setNewReminder({ title: '', listId: 'inbox', priority: 'none', flagged: false }); }
                            }}
                          />
                          <input
                            type="text"
                            value={newReminder.notes || ''}
                            onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })}
                            placeholder="Add note..."
                            className="w-full bg-transparent text-sm text-gray-500 dark:text-blush-400 placeholder-gray-400 dark:placeholder-blush-500 outline-none mt-1"
                          />
                        </div>
                      </div>

                      {/* Quick options */}
                      <div className="flex items-center gap-2 ml-9 flex-wrap">
                        <input
                          type="date"
                          value={newReminder.dueDate || ''}
                          onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value || undefined })}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300 border-0"
                        />
                        <input
                          type="time"
                          value={newReminder.dueTime || ''}
                          onChange={(e) => setNewReminder({ ...newReminder, dueTime: e.target.value || undefined })}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300 border-0"
                        />
                        <select
                          value={newReminder.priority}
                          onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value as Reminder['priority'] })}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300 border-0"
                        >
                          <option value="none">No Priority</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <button
                          onClick={() => setNewReminder({ ...newReminder, flagged: !newReminder.flagged })}
                          className={`p-1 rounded ${newReminder.flagged ? 'text-orange-500' : 'text-gray-400'}`}
                        >
                          <Flag size={16} className={newReminder.flagged ? 'fill-orange-500' : ''} />
                        </button>
                      </div>

                      <div className="flex gap-2 ml-9">
                        <button
                          onClick={handleAddReminder}
                          disabled={!newReminder.title?.trim()}
                          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setShowNewReminder(false); setNewReminder({ title: '', listId: 'inbox', priority: 'none', flagged: false }); }}
                          className="px-4 py-2 text-gray-500 dark:text-blush-400 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

            {/* Add Reminder Button */}
            {!showNewReminder && (
              <button
                onClick={() => {
                  setNewReminder({
                    title: '',
                    notes: '',
                    listId: currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' ? currentView : 'inbox',
                    priority: 'none',
                    flagged: currentView === 'flagged',
                    dueDate: currentView === 'today' ? todayStr : undefined,
                    subtasks: [],
                  });
                  setShowNewReminder(true);
                }}
                className="flex items-center gap-2 text-blue-500 font-medium"
              >
                <Plus size={20} />
                New Reminder
              </button>
            )}

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
          </>
        )}

        {/* Reminder Detail View */}
        {activeTab === 'tasks' && showReminderDetail && selectedReminder && (
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
                <span className={`flex-1 ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-blush-300'}`}>
                  {subtask.title}
                </span>
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
