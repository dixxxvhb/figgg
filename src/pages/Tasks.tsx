import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Clock, Circle, CheckCircle2, Flag, ChevronRight, Calendar, Bell,
  CalendarDays, Inbox, AlertCircle, Repeat, Plus, Check, Pencil, Trash2, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppData } from '../contexts/AppDataContext';
import { haptic } from '../utils/haptics';
import { safeTime } from '../utils/time';
import { generateId } from '../utils/id';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import {
  format, isToday as isDateToday, isTomorrow, isPast, parseISO, startOfDay,
  addDays, isAfter,
} from 'date-fns';
import type { Reminder, ReminderList, Subtask, RecurringSchedule } from '../types';
import { ReminderDetailView } from '../components/tasks/ReminderDetailView';

const LIST_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
  '#5856D6', '#FF2D55', '#00C7BE', '#30B0C7', '#A2845E',
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

function formatTimeFromString(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function Tasks() {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const { data, updateSelfCare } = useAppData();

  // ===== Tasks/Reminders State =====
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
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  // Reminders & lists reactive to sync
  useEffect(() => {
    const sc = data.selfCare || {};
    queueMicrotask(() => {
      setReminders(sc.reminders || []);
      setLists(sc.reminderLists || DEFAULT_LISTS);
    });
  }, [data.selfCare]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...reminders, reminder];
    setReminders(updated);
    persistTasks(updated, lists);
    setInlineAddText('');
    setTimeout(() => inlineInputRef.current?.focus(), 0);
  }, [inlineAddText, reminders, lists, persistTasks, currentView]);

  function getNextRecurringDate(currentDate: string, recurring: RecurringSchedule): string | null {
    const date = parseISO(currentDate);
    let nextDate: Date;
    switch (recurring.type) {
      case 'daily': nextDate = addDays(date, recurring.interval); break;
      case 'weekly': nextDate = addDays(date, 7 * recurring.interval); break;
      case 'monthly': nextDate = new Date(date); nextDate.setMonth(nextDate.getMonth() + recurring.interval); break;
      case 'yearly': nextDate = new Date(date); nextDate.setFullYear(nextDate.getFullYear() + recurring.interval); break;
      default: return null;
    }
    if (recurring.endDate && isAfter(nextDate, parseISO(recurring.endDate))) return null;
    return format(nextDate, 'yyyy-MM-dd');
  }

  const handleToggleComplete = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => {
        if (r.id === id) {
          const nowCompleted = !r.completed;
          if (nowCompleted && r.recurring && r.dueDate) {
            const nextDate = getNextRecurringDate(r.dueDate, r.recurring);
            if (nextDate) {
              const newReminder: Reminder = {
                ...r, id: generateId(), completed: false, completedAt: undefined,
                dueDate: nextDate, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              };
              setTimeout(() => {
                setReminders(p => { const withNew = [...p, newReminder]; persistTasks(withNew, listsRef.current); return withNew; });
              }, 0);
            }
          }
          if (nowCompleted) toast.success(`Done: ${r.title}`, { duration: 2000 });
          return { ...r, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : undefined, updatedAt: new Date().toISOString() };
        }
        return r;
      });
      persistTasks(updated, lists);
      return updated;
    });
  }, [lists, persistTasks]);

  const handleToggleFlag = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, flagged: !r.flagged, updatedAt: new Date().toISOString() } : r);
      persistTasks(updated, lists);
      return updated;
    });
  }, [lists, persistTasks]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const confirmed = await confirm('This reminder will be permanently deleted.', {
      title: 'Delete Reminder',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    persistTasks(updated, lists);
    setSelectedReminder(null);
    setShowReminderDetail(false);
  }, [reminders, lists, persistTasks, confirm]);

  const handleUpdateReminder = useCallback((updated: Reminder) => {
    const newReminders = reminders.map(r => r.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : r);
    setReminders(newReminders);
    persistTasks(newReminders, lists);
    setSelectedReminder(updated);
  }, [reminders, lists, persistTasks]);

  const handleAddList = useCallback(() => {
    if (!newListName.trim()) return;
    const newList: ReminderList = {
      id: generateId(), name: newListName.trim(), color: newListColor, icon: 'List', order: lists.length, createdAt: new Date().toISOString(),
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
    if (listId === 'inbox') return;
    const updatedLists = lists.filter(l => l.id !== listId);
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
    const updatedLists = lists.map(l => l.id === editingList.id ? { ...l, name: editListName.trim(), color: editListColor } : l);
    setLists(updatedLists);
    persistTasks(reminders, updatedLists);
    setEditingList(null);
  }, [editingList, editListName, editListColor, lists, reminders, persistTasks]);

  const handleToggleSubtask = useCallback((reminderId: string, subtaskId: string) => {
    const updated = reminders.map(r => {
      if (r.id === reminderId && r.subtasks) {
        return { ...r, subtasks: r.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s), updatedAt: new Date().toISOString() };
      }
      return r;
    });
    setReminders(updated);
    persistTasks(updated, lists);
    const updatedReminder = updated.find(r => r.id === reminderId);
    if (updatedReminder) setSelectedReminder(updatedReminder);
  }, [reminders, lists, persistTasks]);

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

  const filteredReminders = useMemo(() => {
    let filtered = reminders;
    switch (currentView) {
      case 'today': filtered = reminders.filter(r => r.dueDate === todayStr || (r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr)); break;
      case 'scheduled': filtered = reminders.filter(r => r.dueDate); break;
      case 'all': break;
      case 'flagged': filtered = reminders.filter(r => r.flagged); break;
      default: filtered = reminders.filter(r => r.listId === currentView);
    }
    if (!showCompleted) filtered = filtered.filter(r => !r.completed);
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return safeTime(b.createdAt) - safeTime(a.createdAt);
    });
  }, [reminders, currentView, todayStr, showCompleted]);

  const completedCount = useMemo(() => {
    switch (currentView) {
      case 'today': return reminders.filter(r => r.completed && (r.dueDate === todayStr || (r.dueDate && isPast(startOfDay(parseISO(r.dueDate)))))).length;
      case 'scheduled': return reminders.filter(r => r.completed && r.dueDate).length;
      case 'all': return reminders.filter(r => r.completed).length;
      case 'flagged': return reminders.filter(r => r.completed && r.flagged).length;
      default: return reminders.filter(r => r.completed && r.listId === currentView).length;
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
      default: return lists.find(l => l.id === currentView)?.name || 'Reminders';
    }
  };

  const getViewColor = () => {
    switch (currentView) {
      case 'today': return '#007AFF';
      case 'scheduled': return '#FF3B30';
      case 'all': return '#5856D6';
      case 'flagged': return '#FF9500';
      default: return lists.find(l => l.id === currentView)?.color || '#007AFF';
    }
  };

  return (
    <div className="pb-24 bg-[var(--surface-primary)]">
      {confirmDialog}
      <div className="page-container xl:max-w-5xl">
        <div className="mb-4">
          <h1 className="type-h1 text-[var(--text-primary)]">Tasks</h1>
          <p className="type-caption text-[var(--text-secondary)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div>
        {!showReminderDetail && (
          <>
            {/* Smart List Filters */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide pb-1">
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
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-semibold whitespace-nowrap transition-colors min-h-[36px] flex-shrink-0 ${
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
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Lists */}
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
                        isActive ? 'text-white shadow-sm' : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                      style={isActive ? { backgroundColor: list.color } : {}}
                    >
                      <div className="w-2.5 h-2.5 rounded-[var(--radius-full)] flex-shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : list.color }} />
                      {list.name}
                      {count > 0 && <span className={`text-xs font-bold ${isActive ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>{count}</span>}
                    </button>
                  );
                })}
                <button onClick={() => setShowNewList(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-full)] text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] flex-shrink-0">
                  <Plus size={12} /> New
                </button>
              </div>
            )}

            {/* View Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="type-h2" style={{ color: getViewColor() }}>{getViewTitle()}</h2>
              <div className="flex items-center gap-3">
                <span className="type-caption text-[var(--text-tertiary)]">{filteredReminders.filter(r => !r.completed).length} tasks</span>
                {currentView !== 'today' && currentView !== 'scheduled' && currentView !== 'all' && currentView !== 'flagged' && currentView !== 'inbox' && lists.find(l => l.id === currentView) && (
                  <button onClick={() => handleOpenEditList(lists.find(l => l.id === currentView)!)} className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]">
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
                      <div key={reminder.id} className="relative overflow-hidden">
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
                              if (isHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) isHorizontal = Math.abs(dx) > Math.abs(dy);
                              if (!isHorizontal) return;
                              ev.preventDefault();
                              deltaX = Math.min(0, dx);
                              el.style.transform = `translateX(${deltaX}px)`;
                              el.style.transition = 'none';
                            };
                            const onEnd = () => {
                              document.removeEventListener('touchmove', onMove);
                              document.removeEventListener('touchend', onEnd);
                              if (deltaX < -SWIPE_THRESHOLD && !reminder.completed) {
                                el.style.transition = 'transform 0.2s ease-out';
                                el.style.transform = 'translateX(-100%)';
                                haptic('medium');
                                setTimeout(() => { handleToggleComplete(reminder.id); el.style.transition = 'none'; el.style.transform = ''; }, 200);
                              } else {
                                el.style.transition = 'transform 0.2s ease-out';
                                el.style.transform = '';
                              }
                            };
                            document.addEventListener('touchmove', onMove, { passive: false });
                            document.addEventListener('touchend', onEnd);
                          }}
                          onClick={() => { setSelectedReminder(reminder); setShowReminderDetail(true); }}
                        >
                          <button onClick={(e) => { e.stopPropagation(); handleToggleComplete(reminder.id); }} className="mt-0.5 flex-shrink-0">
                            {reminder.completed ? (
                              <CheckCircle2 size={24} className="text-[var(--accent-primary)]" fill="currentColor" strokeWidth={0} />
                            ) : (
                              <Circle size={24} className={PRIORITY_COLORS[reminder.priority]} strokeWidth={reminder.priority === 'high' ? 2.5 : 1.5} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`type-body font-medium ${reminder.completed ? 'text-[var(--text-tertiary)] line-through opacity-50' : 'text-[var(--text-primary)]'}`}>{reminder.title}</p>
                            {reminder.notes && <p className="type-caption text-[var(--text-tertiary)] line-clamp-1 mt-0.5">{reminder.notes}</p>}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {(() => {
                                const linkedStudent = (data.students || []).find(student => student.id === reminder.studentId);
                                if (!linkedStudent || (!linkedStudent.parentPhone && !linkedStudent.parentEmail)) return null;
                                return (
                                  <span className="type-label flex items-center gap-1 text-[var(--accent-primary)]">
                                    <Phone size={10} />
                                    {linkedStudent.parentPhone || linkedStudent.parentEmail}
                                  </span>
                                );
                              })()}
                              {reminder.dueDate && (
                                <span className={`type-label flex items-center gap-1 ${!reminder.completed && reminder.dueDate && isPast(startOfDay(parseISO(reminder.dueDate))) && reminder.dueDate !== todayStr ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
                                  <Bell size={10} />{formatDueDate(reminder.dueDate, reminder.dueTime)}
                                </span>
                              )}
                              {reminder.recurring && <span className="type-label text-[var(--text-tertiary)] flex items-center gap-1"><Repeat size={10} />{reminder.recurring.type}</span>}
                              {reminder.subtasks && reminder.subtasks.length > 0 && (
                                <span className="type-label text-[var(--text-tertiary)]">{reminder.subtasks.filter(s => s.completed).length}/{reminder.subtasks.length} subtasks</span>
                              )}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleToggleFlag(reminder.id); }} className="flex-shrink-0 p-1">
                            <Flag size={18} className={reminder.flagged ? 'text-[var(--status-warning)] fill-current' : 'text-[var(--border-subtle)]'} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline quick-add */}
              <div className="flex items-center gap-3 p-4 border-t border-[var(--border-subtle)]">
                <Plus size={20} className="text-[var(--border-subtle)] flex-shrink-0" />
                <input ref={inlineInputRef} type="text" value={inlineAddText} onChange={(e) => setInlineAddText(e.target.value)}
                  placeholder="Add a reminder..." className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && inlineAddText.trim()) handleInlineAdd(); }} />
              </div>

              {completedCount > 0 && (
                <button onClick={() => setShowCompleted(!showCompleted)} className="w-full p-3 text-sm text-[var(--text-secondary)] flex items-center justify-center gap-1 border-t border-[var(--border-subtle)]">
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
                    <button onClick={handleAddList} disabled={!newListName.trim()} className="text-[var(--accent-primary)] font-medium disabled:opacity-50">Done</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="List Name"
                      className="w-full px-4 py-3 bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" autoFocus />
                    <div>
                      <label className="type-label text-[var(--text-secondary)] mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button key={color} onClick={() => setNewListColor(color)} className={`w-10 h-10 rounded-[var(--radius-full)] ${newListColor === color ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)]' : ''}`} style={{ backgroundColor: color }} />
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
                    <button onClick={handleSaveEditList} disabled={!editListName.trim()} className="text-[var(--accent-primary)] font-medium disabled:opacity-50">Done</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <input type="text" value={editListName} onChange={(e) => setEditListName(e.target.value)} placeholder="List Name"
                      className="w-full px-4 py-3 bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none" autoFocus />
                    <div>
                      <label className="type-label text-[var(--text-secondary)] mb-2 block">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {LIST_COLORS.map(color => (
                          <button key={color} onClick={() => setEditListColor(color)} className={`w-10 h-10 rounded-[var(--radius-full)] ${editListColor === color ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)]' : ''}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteList(editingList.id)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--status-danger)]/10 text-[var(--status-danger)] rounded-[var(--radius-md)] font-medium">
                      <Trash2 size={16} /> Delete List
                    </button>
                    <p className="type-caption text-[var(--text-tertiary)] text-center">Tasks in this list will be moved to Reminders</p>
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
            students={data.students || []}
            onClose={() => { setShowReminderDetail(false); setSelectedReminder(null); }}
            onUpdate={handleUpdateReminder}
            onDelete={handleDeleteReminder}
            onToggleSubtask={handleToggleSubtask}
          />
        )}

      </div>
    </div>
  );
}
