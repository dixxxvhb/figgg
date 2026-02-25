import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Trophy,
  Users, Car, CalendarOff, Plus, X, Ban, RotateCcw, Trash2,
  CheckSquare, Eye, EyeOff, Edit2, Check,
} from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { DayOfWeek, CalendarEvent, Class, ClassWeekNotes, WeekNotes } from '../types';
import { formatTimeDisplay, timeToMinutes, getCurrentDayOfWeek, formatWeekOf, getWeekStart } from '../utils/time';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { estimateTravelTime, formatTravelTime } from '../services/location';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

type ScheduleItem =
  | { type: 'class'; data: Class; time: number; exception?: ClassWeekNotes['exception']; cancelled: boolean }
  | { type: 'event'; data: CalendarEvent; time: number; cancelled: boolean }
  | { type: 'travel'; fromStudio: string; toStudio: string; travelMinutes: number; time: number; cancelled: boolean };

// ── Create/Edit Event Form ──────────────────────────────────────────

interface EventFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

function EventForm({
  initial,
  defaultDate,
  onSave,
  onCancel,
}: {
  initial?: EventFormData;
  defaultDate: string;
  onSave: (data: EventFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EventFormData>(initial || {
    title: '',
    date: defaultDate,
    startTime: '',
    endTime: '',
    location: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const startTime = form.startTime || '09:00';
    // Default end time: 1 hour after start
    let endTime = form.endTime;
    if (!endTime && startTime) {
      const [h, m] = startTime.split(':').map(Number);
      endTime = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    onSave({ ...form, startTime, endTime: endTime || '10:00' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--surface-card)] rounded-xl border border-[var(--accent-primary)] p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-sm text-[var(--text-primary)]">
          {initial ? 'Edit Event' : 'New Event'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1 text-[var(--text-tertiary)]">
          <X size={16} />
        </button>
      </div>
      <input
        type="text"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Event title"
        className="w-full px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        autoFocus
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
        <input
          type="time"
          value={form.startTime}
          onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
          placeholder="Start"
          className="px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
        <input
          type="time"
          value={form.endTime}
          onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
          placeholder="End"
          className="px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
      </div>
      <input
        type="text"
        value={form.location}
        onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
        placeholder="Location (optional)"
        className="w-full px-3 py-2 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface-inset)] rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.title.trim()}
          className="flex-1 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-primary)] rounded-lg disabled:opacity-40"
        >
          {initial ? 'Save' : 'Add Event'}
        </button>
      </div>
    </form>
  );
}

// ── Main Schedule Page ──────────────────────────────────────────────

export function Schedule() {
  const {
    data, saveWeekNotes, getWeekNotes, updateCalendarEvent,
    addCalendarEvent, deleteCalendarEvent, deleteClass,
  } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWeek = parseInt(searchParams.get('week') || '0', 10);
  const [weekOffset, setWeekOffset] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());
  const [showCancelled, setShowCancelled] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'class' | 'event'; name: string } | null>(null);

  useEffect(() => {
    if (weekOffset !== 0) {
      setSearchParams({ week: weekOffset.toString() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [weekOffset, setSearchParams]);

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const weekLabel = format(weekStart, "'Week of' MMM d");

  const getStudio = (studioId: string) => data.studios.find(s => s.id === studioId);

  const selectedDayDate = addDays(weekStart, DAYS.findIndex(d => d.key === selectedDay));
  const selectedDateStr = format(selectedDayDate, 'yyyy-MM-dd');

  // Get weekNotes for selected week to check class exceptions
  const selectedWeekOf = formatWeekOf(getWeekStart(selectedDayDate));
  const selectedWeekNotes = getWeekNotes(selectedWeekOf);

  const getClassException = useCallback((classId: string) => {
    return selectedWeekNotes?.classNotes[classId]?.exception;
  }, [selectedWeekNotes]);

  const calendarEventsForDay = useMemo(() => {
    if (!data.calendarEvents) return [];
    return data.calendarEvents
      .filter(e => e.date === selectedDateStr)
      .sort((a, b) => timeToMinutes(a.startTime || '00:00') - timeToMinutes(b.startTime || '00:00'));
  }, [data.calendarEvents, selectedDateStr]);

  const competitionsForDay = useMemo(() => {
    if (!data.competitions) return [];
    return data.competitions.filter(comp => {
      const startDate = parseISO(comp.date);
      const endDate = comp.endDate ? parseISO(comp.endDate) : startDate;
      const selectedDate = parseISO(selectedDateStr);
      return isWithinInterval(selectedDate, { start: startDate, end: endDate });
    });
  }, [data.competitions, selectedDateStr]);

  const isWeekend = selectedDay === 'saturday' || selectedDay === 'sunday';

  const dayClasses = data.classes
    .filter(c => c.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const getStudentCount = (classId: string) => {
    const cls = data.classes.find(c => c.id === classId);
    if (cls?.competitionDanceId) {
      const dance = data.competitionDances?.find(d => d.id === cls.competitionDanceId);
      return dance?.dancerIds?.length || 0;
    }
    return (data.students || []).filter(s => s.classIds?.includes(classId)).length;
  };

  // ── Cancel / Restore / Delete Actions ────────────────────────────

  const cancelClass = useCallback((classId: string) => {
    const existing = data.weekNotes.find(w => w.weekOf === selectedWeekOf);
    const weekNote: WeekNotes = existing
      ? { ...existing, classNotes: { ...existing.classNotes } }
      : { id: `week_${selectedWeekOf}`, weekOf: selectedWeekOf, classNotes: {} };
    const cn: ClassWeekNotes = weekNote.classNotes[classId] || {
      classId, plan: '', liveNotes: [], isOrganized: false,
    };
    weekNote.classNotes[classId] = { ...cn, exception: { type: 'cancelled' } };
    saveWeekNotes(weekNote);
  }, [data.weekNotes, selectedWeekOf, saveWeekNotes]);

  const uncancelClass = useCallback((classId: string) => {
    const existing = data.weekNotes.find(w => w.weekOf === selectedWeekOf);
    if (!existing) return;
    const weekNote = { ...existing, classNotes: { ...existing.classNotes } };
    const cn = weekNote.classNotes[classId];
    if (cn?.exception) {
      weekNote.classNotes[classId] = { ...cn, exception: undefined };
      saveWeekNotes(weekNote);
    }
  }, [data.weekNotes, selectedWeekOf, saveWeekNotes]);

  const cancelEvent = useCallback((eventId: string) => {
    const event = data.calendarEvents?.find(e => e.id === eventId);
    if (event) updateCalendarEvent({ ...event, cancelled: true });
  }, [data.calendarEvents, updateCalendarEvent]);

  const uncancelEvent = useCallback((eventId: string) => {
    const event = data.calendarEvents?.find(e => e.id === eventId);
    if (event) updateCalendarEvent({ ...event, cancelled: false });
  }, [data.calendarEvents, updateCalendarEvent]);

  const handleDeleteConfirm = useCallback(() => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'class') {
      deleteClass(confirmDelete.id);
    } else {
      deleteCalendarEvent(confirmDelete.id);
    }
    setConfirmDelete(null);
  }, [confirmDelete, deleteClass, deleteCalendarEvent]);

  const handleCreateEvent = useCallback((formData: EventFormData) => {
    addCalendarEvent({
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location || undefined,
    });
    setShowCreateForm(false);
  }, [addCalendarEvent]);

  const handleEditEvent = useCallback((formData: EventFormData) => {
    if (!editingEvent) return;
    updateCalendarEvent({
      ...editingEvent,
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location || undefined,
    });
    setEditingEvent(null);
  }, [editingEvent, updateCalendarEvent]);

  // ── Bulk Actions ────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkCancel = useCallback(() => {
    const existing = data.weekNotes.find(w => w.weekOf === selectedWeekOf);
    const weekNote: WeekNotes = existing
      ? { ...existing, classNotes: { ...existing.classNotes } }
      : { id: `week_${selectedWeekOf}`, weekOf: selectedWeekOf, classNotes: {} };

    let classesChanged = false;
    for (const id of selectedIds) {
      if (data.classes.some(c => c.id === id)) {
        const cn: ClassWeekNotes = weekNote.classNotes[id] || {
          classId: id, plan: '', liveNotes: [], isOrganized: false,
        };
        if (!cn.exception) {
          weekNote.classNotes[id] = { ...cn, exception: { type: 'cancelled' } };
          classesChanged = true;
        }
      }
      const event = data.calendarEvents?.find(e => e.id === id);
      if (event && !event.cancelled) {
        updateCalendarEvent({ ...event, cancelled: true });
      }
    }
    if (classesChanged) saveWeekNotes(weekNote);
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, data.classes, data.calendarEvents, data.weekNotes, selectedWeekOf, saveWeekNotes, updateCalendarEvent]);

  const bulkDelete = useCallback(() => {
    for (const id of selectedIds) {
      if (data.classes.some(c => c.id === id)) {
        deleteClass(id);
      }
      if (data.calendarEvents?.some(e => e.id === id)) {
        deleteCalendarEvent(id);
      }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, data.classes, data.calendarEvents, deleteClass, deleteCalendarEvent]);

  // ── Merged Schedule ─────────────────────────────────────────────────

  const mergedSchedule = useMemo(() => {
    const items: ScheduleItem[] = [];
    const classTimeSet = new Set(dayClasses.map(cls => timeToMinutes(cls.startTime)));

    dayClasses.forEach(cls => {
      const exception = getClassException(cls.id);
      items.push({
        type: 'class', data: cls, time: timeToMinutes(cls.startTime),
        exception, cancelled: !!exception,
      });
    });

    calendarEventsForDay.forEach(event => {
      const eventTime = timeToMinutes(event.startTime || '00:00');
      const isDuplicate = Array.from(classTimeSet).some(ct => Math.abs(ct - eventTime) <= 10);
      if (!isDuplicate) {
        items.push({
          type: 'event', data: event, time: eventTime,
          cancelled: !!event.cancelled,
        });
      }
    });

    const sorted = items.sort((a, b) => a.time - b.time);

    // Insert travel cards only between non-cancelled consecutive classes at different studios
    const withTravel: ScheduleItem[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      if (prev && current.type === 'class' && prev.type === 'class' && !current.cancelled && !prev.cancelled) {
        const prevStudioId = prev.data.studioId;
        const currStudioId = current.data.studioId;
        if (prevStudioId && currStudioId && prevStudioId !== currStudioId) {
          const prevStudio = data.studios.find(s => s.id === prevStudioId);
          const currStudio = data.studios.find(s => s.id === currStudioId);
          if (prevStudio && currStudio) {
            const travelMins = estimateTravelTime(prevStudio, currStudio);
            if (travelMins) {
              withTravel.push({
                type: 'travel',
                fromStudio: prevStudio.shortName || prevStudio.name,
                toStudio: currStudio.shortName || currStudio.name,
                travelMinutes: travelMins,
                time: timeToMinutes(prev.data.endTime),
                cancelled: false,
              });
            }
          }
        }
      }
      withTravel.push(current);
    }

    return withTravel;
  }, [dayClasses, calendarEventsForDay, data.studios, getClassException]);

  const cancelledCount = mergedSchedule.filter(i => i.cancelled).length;
  const visibleSchedule = showCancelled ? mergedSchedule : mergedSchedule.filter(i => !i.cancelled);

  return (
    <div className="page-w px-4 py-6 pb-24">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-[var(--accent-muted)] rounded-lg text-[var(--accent-primary)] transition-colors min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-[var(--text-primary)] text-base">{weekLabel}</h1>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-[var(--accent-muted)] rounded-lg text-[var(--accent-primary)] transition-colors min-h-[44px] min-w-[44px]"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => { setWeekOffset(0); setSelectedDay(getCurrentDayOfWeek()); }}
          className="px-4 py-2 bg-[var(--accent-muted)] text-[var(--accent-primary)] rounded-full text-sm font-medium hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-accent)] transition-colors shadow-sm min-h-[44px]"
        >
          Today
        </button>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-full text-sm font-medium shadow-sm min-h-[44px] flex items-center gap-1.5"
        >
          <Plus size={14} />
          Add Event
        </button>
        <button
          onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
          className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] flex items-center gap-1.5 transition-colors ${
            selectMode
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
              : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'
          }`}
        >
          <CheckSquare size={14} />
          Select
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4 p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)]">
          <span className="text-sm text-[var(--text-secondary)] mr-2">{selectedIds.size} selected</span>
          <button
            onClick={bulkCancel}
            className="px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full flex items-center gap-1"
          >
            <Ban size={12} /> Cancel
          </button>
          <button
            onClick={bulkDelete}
            className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center gap-1"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Cancelled toggle */}
      {cancelledCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowCancelled(!showCancelled)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showCancelled ? <EyeOff size={12} /> : <Eye size={12} />}
            {showCancelled ? `Hide cancelled (${cancelledCount})` : `Show cancelled (${cancelledCount})`}
          </button>
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {DAYS.map(({ key, short }) => {
          const isSelected = selectedDay === key;
          const hasClasses = data.classes.some(c => c.day === key);
          const dayDate = addDays(weekStart, DAYS.findIndex(d => d.key === key));
          const dayDateStr = format(dayDate, 'yyyy-MM-dd');
          const hasCalendarEvents = data.calendarEvents?.some(e => e.date === dayDateStr && !e.cancelled);
          const hasCompetitions = data.competitions?.some(comp => {
            const sD = parseISO(comp.date);
            const eD = comp.endDate ? parseISO(comp.endDate) : sD;
            return isWithinInterval(parseISO(dayDateStr), { start: sD, end: eD });
          });
          const isToday = dayDateStr === format(new Date(), 'yyyy-MM-dd');

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all min-h-[64px] ${
                isSelected
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm'
                  : 'hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="text-xs opacity-80">{short}</div>
              <div className={`text-lg font-medium ${isToday && !isSelected ? 'text-[var(--accent-primary)]' : ''}`}>
                {format(dayDate, 'd')}
              </div>
              {!isSelected && (hasClasses || hasCalendarEvents || hasCompetitions) && (
                <div className="flex gap-0.5 justify-center mt-1">
                  {hasClasses && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
                  {hasCalendarEvents && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {hasCompetitions && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <EventForm defaultDate={selectedDateStr} onSave={handleCreateEvent} onCancel={() => setShowCreateForm(false)} />
      )}
      {editingEvent && (
        <EventForm
          initial={{ title: editingEvent.title, date: editingEvent.date, startTime: editingEvent.startTime, endTime: editingEvent.endTime, location: editingEvent.location || '' }}
          defaultDate={editingEvent.date}
          onSave={handleEditEvent}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {/* Competitions */}
      {competitionsForDay.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-purple-500 mb-3">
            <Trophy size={16} />
            <span>Competition</span>
          </div>
          <div className="space-y-3">
            {competitionsForDay.map(comp => (
              <Link
                key={comp.id}
                to={`/choreography/${comp.id}`}
                className="block bg-gradient-to-r from-purple-50 to-[var(--surface-card)] dark:from-purple-900/30 dark:to-[var(--surface-card)] rounded-xl border border-purple-200 dark:border-purple-800 p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all"
              >
                <div className="font-medium text-[var(--text-primary)]">{comp.name}</div>
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] mt-1">
                  <Calendar size={14} />
                  {format(parseISO(comp.date), 'MMM d')}
                  {comp.endDate && comp.endDate !== comp.date && <> - {format(parseISO(comp.endDate), 'MMM d')}</>}
                </div>
                {comp.location && (
                  <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] mt-1">
                    <MapPin size={14} />
                    {comp.location}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Weekend empty state */}
      {isWeekend && calendarEventsForDay.length === 0 && competitionsForDay.length === 0 && dayClasses.length === 0 && !data.settings?.calendarUrl && (
        <div className="bg-[var(--surface-card)] rounded-xl p-6 mb-4 text-center border border-[var(--border-subtle)]">
          <div className="w-12 h-12 bg-[var(--surface-inset)] rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="text-[var(--accent-primary)]" size={24} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Connect your calendar in Settings to see your weekend competition schedule here
          </p>
          <Link to="/settings" className="text-sm text-[var(--accent-primary)] font-medium mt-3 inline-block hover:opacity-80">
            Go to Settings →
          </Link>
        </div>
      )}

      {/* Schedule Items */}
      <div className="space-y-3">
        {visibleSchedule.length === 0 && competitionsForDay.length === 0 ? (
          <EmptyState icon={CalendarOff} title={`No classes on ${DAYS.find(d => d.key === selectedDay)?.label}`} />
        ) : (
          visibleSchedule.map(item => {
            if (item.type === 'travel') {
              return (
                <div key={`travel-${item.time}`} className="flex items-center gap-3 px-4 py-2 bg-[var(--surface-inset)] rounded-xl border border-[var(--border-subtle)]">
                  <Car size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">{formatTravelTime(item.travelMinutes)}</span> drive to {item.toStudio}
                  </span>
                </div>
              );
            }

            if (item.type === 'class') {
              return (
                <ClassCard
                  key={item.data.id}
                  cls={item.data}
                  studio={getStudio(item.data.studioId)}
                  studentCount={getStudentCount(item.data.id)}
                  exception={item.exception}
                  isCancelled={item.cancelled}
                  weekOffset={weekOffset}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(item.data.id)}
                  onToggleSelect={() => toggleSelect(item.data.id)}
                  onCancel={() => cancelClass(item.data.id)}
                  onRestore={() => uncancelClass(item.data.id)}
                  onDelete={() => setConfirmDelete({ id: item.data.id, type: 'class', name: item.data.name })}
                />
              );
            }

            return (
              <EventCard
                key={item.data.id}
                event={item.data}
                isCancelled={item.cancelled}
                selectMode={selectMode}
                isSelected={selectedIds.has(item.data.id)}
                onToggleSelect={() => toggleSelect(item.data.id)}
                onCancel={() => cancelEvent(item.data.id)}
                onRestore={() => uncancelEvent(item.data.id)}
                onEdit={() => setEditingEvent(item.data)}
                onDelete={() => setConfirmDelete({ id: item.data.id, type: 'event', name: item.data.title })}
              />
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.type === 'class' ? 'Class' : 'Event'}`}
        message={`Are you sure you want to permanently delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ── Class Card ──────────────────────────────────────────────────────

function ClassCard({
  cls, studio, studentCount, exception, isCancelled, weekOffset,
  selectMode, isSelected, onToggleSelect, onCancel, onRestore, onDelete,
}: {
  cls: Class;
  studio: ReturnType<typeof Array.prototype.find>;
  studentCount: number;
  exception?: ClassWeekNotes['exception'];
  isCancelled: boolean;
  weekOffset: number;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const content = (
    <div className="flex items-start gap-3">
      {selectMode && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-strong)]'
          }`}
        >
          {isSelected && <Check size={12} className="text-[var(--text-on-accent)]" />}
        </button>
      )}
      <div className="w-1.5 h-full min-h-[60px] rounded-full flex-shrink-0" style={{ backgroundColor: isCancelled ? '#9ca3af' : ((studio as any)?.color || '#9ca3af') }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className={`type-h2 ${isCancelled ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{cls.name}</div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCancelled && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] uppercase tracking-wide">Cancelled</span>
            )}
            {exception?.type === 'subbed' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 uppercase tracking-wide">
                Sub{exception.subName ? `: ${exception.subName}` : ''}
              </span>
            )}
            {studentCount > 0 && !isCancelled && (
              <div className="flex items-center gap-1 text-sm bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full">
                <Users size={14} /><span>{studentCount}</span>
              </div>
            )}
          </div>
        </div>
        <div className={`text-sm mt-1 ${isCancelled ? 'text-[var(--text-tertiary)]' : 'text-[--color-honey] dark:text-[--color-honey-light]'}`}>
          {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
        </div>
        <div className={`text-sm ${isCancelled ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>{(studio as any)?.name}</div>
        {cls.recitalSong && !isCancelled && (
          <div className={`text-sm mt-2 font-medium ${cls.isRecitalSong ? 'text-purple-600' : 'text-[var(--text-secondary)]'}`}>
            {cls.isRecitalSong ? 'Recital: ' : 'Combo: '}{cls.recitalSong}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 transition-all ${
      isCancelled ? 'opacity-60' : 'hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]'
    }`}>
      {!isCancelled ? <Link to={`/class/${cls.id}${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`}>{content}</Link> : content}
      {!selectMode && (
        <div className="flex items-center gap-1 mt-2 pl-5">
          {isCancelled ? (
            <button onClick={onRestore} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full hover:bg-green-100 transition-colors">
              <RotateCcw size={11} /> Restore
            </button>
          ) : (
            <button onClick={onCancel} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full hover:bg-amber-100 transition-colors">
              <Ban size={11} /> Cancel
            </button>
          )}
          <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 transition-colors">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Event Card ──────────────────────────────────────────────────────

function EventCard({
  event, isCancelled, selectMode, isSelected,
  onToggleSelect, onCancel, onRestore, onEdit, onDelete,
}: {
  event: CalendarEvent;
  isCancelled: boolean;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const content = (
    <div className="flex items-start gap-3">
      {selectMode && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-strong)]'
          }`}
        >
          {isSelected && <Check size={12} className="text-[var(--text-on-accent)]" />}
        </button>
      )}
      <div className={`w-1.5 h-full min-h-[60px] rounded-full flex-shrink-0 ${isCancelled ? 'bg-gray-400' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className={`type-h2 ${isCancelled ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{event.title}</div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCancelled ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] uppercase tracking-wide">Cancelled</span>
            ) : (
              <div className="flex items-center gap-1 text-xs text-[var(--status-warning)] bg-[var(--status-warning)]/10 px-2 py-0.5 rounded-full">
                <Calendar size={12} /><span>Event</span>
              </div>
            )}
          </div>
        </div>
        {event.startTime && event.startTime !== '00:00' && (
          <div className={`flex items-center gap-1 text-sm mt-1 ${isCancelled ? 'text-[var(--text-tertiary)]' : 'text-[--color-honey] dark:text-[--color-honey-light]'}`}>
            <Clock size={14} />
            {formatTimeDisplay(event.startTime)}
            {event.endTime && event.endTime !== '00:00' && <> - {formatTimeDisplay(event.endTime)}</>}
          </div>
        )}
        {event.location && !isCancelled && (
          <div className="flex items-start gap-1 text-sm text-[var(--text-secondary)] mt-1">
            <MapPin size={14} className="flex-shrink-0 mt-0.5" />
            <span>{event.location.split('\n').filter(Boolean)[0]}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 transition-all ${
      isCancelled ? 'opacity-60' : 'hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]'
    }`}>
      {!isCancelled ? <Link to={`/event/${event.id}`}>{content}</Link> : content}
      {!selectMode && (
        <div className="flex items-center gap-1 mt-2 pl-5">
          {isCancelled ? (
            <button onClick={onRestore} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full hover:bg-green-100 transition-colors">
              <RotateCcw size={11} /> Restore
            </button>
          ) : (
            <button onClick={onCancel} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full hover:bg-amber-100 transition-colors">
              <Ban size={11} /> Cancel
            </button>
          )}
          {event.isUserCreated && (
            <>
              <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-muted)] rounded-full hover:opacity-80 transition-colors">
                <Edit2 size={11} /> Edit
              </button>
              <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 transition-colors">
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
