import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, XCircle, RotateCcw, UserPlus, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { formatTimeDisplay, formatWeekOf, getWeekStart, timeToMinutes } from '../utils/time';
import { classifyCalendarEvent } from '../utils/calendarEventType';
import type { DayOfWeek, ClassWeekNotes, CalendarEvent, Class } from '../types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

type ExceptionType = 'cancelled' | 'subbed' | 'time-change';

interface ScheduleItem {
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  day: DayOfWeek;
  type: 'class' | 'calendar';
  studioId?: string;
  exception?: { type: ExceptionType; subName?: string; reason?: string; timeOverride?: { startTime: string; endTime?: string } };
  // For setting exceptions: the ID to write to weekNotes
  exceptionTargetId: string;
}

export function ClassManager() {
  const { data, getWeekNotes, saveWeekNotes } = useAppData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterDay, setFilterDay] = useState<DayOfWeek | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled' | 'subbed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weekStart = addWeeks(getWeekStart(), weekOffset);
  const weekOf = formatWeekOf(weekStart);
  const weekNotes = getWeekNotes(weekOf) || { id: `week_${weekOf}`, weekOf, classNotes: {} };

  // Build unified schedule items
  const items: ScheduleItem[] = useMemo(() => {
    const result: ScheduleItem[] = [];

    // Internal classes
    for (const cls of data.classes) {
      const exc = weekNotes.classNotes[cls.id]?.exception;
      result.push({
        id: cls.id,
        name: cls.name,
        startTime: cls.startTime,
        endTime: cls.endTime,
        day: cls.day as DayOfWeek,
        type: 'class',
        studioId: cls.studioId,
        exception: exc,
        exceptionTargetId: cls.id,
      });
    }

    // Calendar events for this week that look like classes
    const weekEnd = addWeeks(weekStart, 1);
    const dayMap: Record<number, DayOfWeek> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    const calEvents = (data.calendarEvents || []).filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d >= weekStart && d < weekEnd && e.startTime && e.startTime !== '00:00';
    });

    for (const ev of calEvents) {
      const eventType = classifyCalendarEvent(ev, {
        classes: data.classes,
        allEvents: data.calendarEvents || [],
        competitionDances: data.competitionDances || [],
        students: data.students || [],
      });
      if (!eventType.isClassLike && !eventType.isWork) continue;

      // Skip if already represented by an internal class
      const normTitle = ev.title.toLowerCase();
      const evMins = timeToMinutes(ev.startTime);
      const evDay = dayMap[new Date(ev.date + 'T12:00:00').getDay()];
      const hasInternalMatch = data.classes.some(c =>
        c.name.toLowerCase() === normTitle && c.day === evDay && Math.abs(timeToMinutes(c.startTime) - evMins) <= 10
      );
      if (hasInternalMatch) continue;

      // Find exception via cross-reference
      let exc = weekNotes.classNotes[ev.id]?.exception;
      if (!exc) {
        for (const cls of data.classes) {
          const cExc = weekNotes.classNotes[cls.id]?.exception;
          if (!cExc) continue;
          if (cls.name.toLowerCase() === normTitle || Math.abs(timeToMinutes(cls.startTime) - evMins) <= 10) {
            exc = cExc;
            break;
          }
        }
      }

      result.push({
        id: ev.id,
        name: ev.title,
        startTime: ev.startTime,
        endTime: ev.endTime,
        day: evDay,
        type: 'calendar',
        exception: exc,
        exceptionTargetId: ev.id,
      });
    }

    // Sort by day then time
    const dayOrder: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 };
    result.sort((a, b) => (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    return result;
  }, [data.classes, data.calendarEvents, data.competitionDances, data.students, weekNotes, weekStart]);

  // Apply filters
  const filtered = items.filter(item => {
    if (filterDay !== 'all' && item.day !== filterDay) return false;
    if (filterStatus === 'active' && item.exception) return false;
    if (filterStatus === 'cancelled' && item.exception?.type !== 'cancelled') return false;
    if (filterStatus === 'subbed' && item.exception?.type !== 'subbed') return false;
    return true;
  });

  // ── Exception actions ──
  const setException = (item: ScheduleItem, type: ExceptionType, subName?: string) => {
    const wn = { ...weekNotes, classNotes: { ...weekNotes.classNotes } };
    const existing = wn.classNotes[item.exceptionTargetId] || { classId: item.exceptionTargetId, plan: '', liveNotes: [], isOrganized: false };
    wn.classNotes[item.exceptionTargetId] = {
      ...existing,
      exception: { type, ...(subName ? { subName } : {}), reason: 'personal' as const },
    };
    // Also set on alternate ID
    if (item.id !== item.exceptionTargetId) {
      const altExisting = wn.classNotes[item.id] || { classId: item.id, plan: '', liveNotes: [], isOrganized: false };
      wn.classNotes[item.id] = { ...altExisting, exception: { type, ...(subName ? { subName } : {}), reason: 'personal' as const } };
    }
    saveWeekNotes(wn);
  };

  const clearException = (item: ScheduleItem) => {
    const wn = { ...weekNotes, classNotes: { ...weekNotes.classNotes } };
    for (const id of [item.exceptionTargetId, item.id]) {
      if (wn.classNotes[id]?.exception) {
        const { exception: _, ...rest } = wn.classNotes[id] as typeof wn.classNotes[string] & { exception?: unknown };
        wn.classNotes[id] = rest as ClassWeekNotes;
      }
    }
    saveWeekNotes(wn);
  };

  const handleCancel = (item: ScheduleItem) => setException(item, 'cancelled');
  const handleSub = (item: ScheduleItem) => {
    const subName = window.prompt('Sub name:');
    if (subName) setException(item, 'subbed', subName);
  };
  const handleRestore = (item: ScheduleItem) => clearException(item);

  // Bulk actions
  const cancelAll = () => {
    if (!window.confirm(`Cancel ALL ${filtered.length} items for this week?`)) return;
    for (const item of filtered) {
      if (!item.exception) setException(item, 'cancelled');
    }
  };
  const restoreAll = () => {
    for (const item of filtered) {
      if (item.exception) clearException(item);
    }
  };

  const cancelledCount = items.filter(i => i.exception?.type === 'cancelled').length;
  const subbedCount = items.filter(i => i.exception?.type === 'subbed').length;
  const activeCount = items.filter(i => !i.exception).length;

  return (
    <div className="page-w px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/settings" className="p-2 hover:bg-[var(--surface-card-hover)] rounded-lg text-[var(--text-primary)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Class Manager</h1>
          <p className="text-sm text-[var(--text-secondary)]">Cancel, sub, and restore classes</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]">
          <ChevronDown size={18} className="rotate-90" />
        </button>
        <div className="text-center">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            Week of {format(weekStart, 'MMM d')}
          </div>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-[var(--accent-primary)]">
              Back to this week
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]">
          <ChevronDown size={18} className="-rotate-90" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[var(--surface-card)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <div className="text-lg font-bold text-[var(--text-primary)]">{activeCount}</div>
          <div className="text-xs text-[var(--text-secondary)]">Active</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-200 dark:border-red-800">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{cancelledCount}</div>
          <div className="text-xs text-red-500 dark:text-red-400">Cancelled</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{subbedCount}</div>
          <div className="text-xs text-green-500 dark:text-green-400">Subbed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <select
          value={filterDay}
          onChange={e => setFilterDay(e.target.value as DayOfWeek | 'all')}
          className="text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
        >
          <option value="all">All days</option>
          {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="subbed">Subbed</option>
        </select>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={cancelAll}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
        >
          Cancel all shown
        </button>
        <button
          onClick={restoreAll}
          className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)]"
        >
          Restore all shown
        </button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-tertiary)]">No items match filters</div>
        ) : (
          filtered.map(item => {
            const exc = item.exception;
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] overflow-hidden ${exc ? 'opacity-75' : ''}`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Status indicator */}
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
                    exc?.type === 'cancelled' ? 'bg-red-400' :
                    exc?.type === 'subbed' ? 'bg-green-400' :
                    exc?.type === 'time-change' ? 'bg-blue-400' :
                    'bg-[var(--accent-primary)]'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`type-h2 truncate ${exc?.type === 'cancelled' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                        {item.name}
                      </span>
                      {item.type === 'calendar' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex-shrink-0">
                          Cal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5">
                      <span className="capitalize">{item.day.slice(0, 3)}</span>
                      <span>{formatTimeDisplay(item.startTime)}{item.endTime ? ` - ${formatTimeDisplay(item.endTime)}` : ''}</span>
                    </div>
                    {exc && (
                      <div className="mt-1">
                        {exc.type === 'cancelled' && <span className="text-xs text-red-500 font-medium">Cancelled</span>}
                        {exc.type === 'subbed' && <span className="text-xs text-green-600 font-medium">Sub: {exc.subName || 'TBD'}</span>}
                        {exc.type === 'time-change' && <span className="text-xs text-blue-600 font-medium">Moved to {exc.timeOverride?.startTime}</span>}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {exc ? (
                      <button
                        onClick={() => handleRestore(item)}
                        className="p-2 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCancel(item)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Cancel"
                        >
                          <XCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleSub(item)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 min-h-[40px] min-w-[40px] flex items-center justify-center"
                          title="Assign sub"
                        >
                          <UserPlus size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
