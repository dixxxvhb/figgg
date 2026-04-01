import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Trophy, Users, Car, CalendarOff, XCircle, RotateCcw } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { DayOfWeek, CalendarEvent } from '../types';
import { formatTimeDisplay, timeToMinutes, getCurrentDayOfWeek, formatWeekOf } from '../utils/time';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { estimateTravelTime, formatTravelTime } from '../services/location';
import { useTeachingStats } from '../hooks/useTeachingStats';
import { WeekStats } from '../components/Dashboard/WeekStats';
import { WeekMomentumBar } from '../components/Dashboard/WeekMomentumBar';
import { StreakCard } from '../components/Dashboard/StreakCard';
import { EventCountdown } from '../components/Dashboard/EventCountdown';
import { classifyCalendarEvent, shouldPreferCalendarEventOverClass } from '../utils/calendarEventType';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export function Schedule() {
  const { data, getWeekNotes, saveWeekNotes } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWeek = parseInt(searchParams.get('week') || '0', 10);
  const initialDay = (searchParams.get('day') as DayOfWeek) || getCurrentDayOfWeek();
  const [weekOffset, setWeekOffset] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(initialDay);

  // Update URL when week or day changes
  useEffect(() => {
    const params: Record<string, string> = {};
    if (weekOffset !== 0) params.week = weekOffset.toString();
    if (selectedDay !== getCurrentDayOfWeek() || weekOffset !== 0) params.day = selectedDay;
    setSearchParams(params, { replace: true });
  }, [weekOffset, selectedDay, setSearchParams]);

  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const weekLabel = format(weekStart, "'Week of' MMM d");
  const weekOf = formatWeekOf(weekStart);

  // Build query string preserving week + day for outgoing links
  const scheduleQuery = (() => {
    const params = new URLSearchParams();
    if (weekOffset !== 0) params.set('week', weekOffset.toString());
    if (selectedDay !== getCurrentDayOfWeek() || weekOffset !== 0) params.set('day', selectedDay);
    const str = params.toString();
    return str ? `?${str}` : '';
  })();

  const stats = useTeachingStats(data);

  const getStudio = (studioId: string) => data.studios.find(s => s.id === studioId);

  // Manual cancel/restore toggle for classes
  const toggleClassException = (classId: string, currentException?: { type: string }) => {
    const wn = getWeekNotes(weekOf) || { id: `week_${weekOf}`, weekOf, classNotes: {} };
    const existing = wn.classNotes[classId] || { classId, plan: '', liveNotes: [], isOrganized: false };
    if (currentException) {
      // Restore — remove exception
      const { exception: _, ...rest } = existing as typeof existing & { exception?: unknown };
      wn.classNotes[classId] = rest;
    } else {
      // Cancel
      wn.classNotes[classId] = { ...existing, exception: { type: 'cancelled' as const, reason: 'personal' as const } };
    }
    saveWeekNotes(wn);
  };

  // Look up weekNotes for exception status (cancelled/subbed classes)
  const currentWeekNotes = data.weekNotes.find(w => w.weekOf === weekOf);

  const getClassException = (classId: string, eventTitle?: string, eventStartTime?: string) => {
    // Direct ID lookup first
    const direct = currentWeekNotes?.classNotes[classId]?.exception;
    if (direct) return direct;
    // Cross-reference: calendar event → matching internal class by name+time
    if (!currentWeekNotes || !eventTitle) return undefined;
    const normTitle = eventTitle.toLowerCase();
    const eventMinutes = eventStartTime ? timeToMinutes(eventStartTime) : -1;
    // Check internal classes with exceptions
    for (const cls of data.classes) {
      const exc = currentWeekNotes.classNotes[cls.id]?.exception;
      if (!exc) continue;
      const sameName = cls.name.toLowerCase() === normTitle;
      const sameTime = eventMinutes >= 0 && Math.abs(timeToMinutes(cls.startTime) - eventMinutes) <= 10;
      if (sameName || sameTime) return exc;
    }
    // Check orphaned classNotes entries (IDs not in data.classes)
    for (const [, cn] of Object.entries(currentWeekNotes.classNotes)) {
      if (!cn.exception || !cn.classId) continue;
      const idParts = cn.classId.toLowerCase().split('-');
      const studioHint = idParts.find(p => p.length > 2 && normTitle.includes(p));
      const timeHint = idParts.find(p => /^\d{4}$/.test(p));
      if (studioHint && timeHint && eventMinutes >= 0) {
        const hintMinutes = parseInt(timeHint.slice(0, 2)) * 60 + parseInt(timeHint.slice(2));
        if (Math.abs(hintMinutes - eventMinutes) <= 10) return cn.exception;
      }
    }
    return undefined;
  };

  const selectedDayDate = addDays(weekStart, DAYS.findIndex(d => d.key === selectedDay));
  const selectedDateStr = format(selectedDayDate, 'yyyy-MM-dd');

  // Get calendar events for the selected day (from synced calendar), sorted by start time
  const hiddenEventIds = new Set(data.settings?.hiddenCalendarEventIds || []);
  const calendarEventsForDay = (data.calendarEvents || [])
    .filter(e => e.date === selectedDateStr && !hiddenEventIds.has(e.id))
    .sort((a, b) => timeToMinutes(a.startTime || '00:00') - timeToMinutes(b.startTime || '00:00'));

  // Get competitions happening on the selected day
  const competitionsForDay = (data.competitions || []).filter(comp => {
    const startDate = parseISO(comp.date);
    const endDate = comp.endDate ? parseISO(comp.endDate) : startDate;
    const selectedDate = parseISO(selectedDateStr);
    return isWithinInterval(selectedDate, { start: startDate, end: endDate });
  });

  // Check if it's a weekend
  const isWeekend = selectedDay === 'saturday' || selectedDay === 'sunday';

  const dayClasses = data.classes
    .filter(c => c.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const visibleDayClasses = dayClasses.filter(cls =>
    !shouldPreferCalendarEventOverClass(cls, calendarEventsForDay, {
      classes: data.classes,
      allEvents: data.calendarEvents || [],
      competitionDances: data.competitionDances || [],
      students: data.students || [],
      studios: data.studios,
    })
  );

  // Count students enrolled in each class (or dancers in competition dance for rehearsals)
  const getStudentCount = (classId: string) => {
    const cls = data.classes.find(c => c.id === classId);
    // For rehearsal classes, count from competition dance
    if (cls?.competitionDanceId) {
      const dance = data.competitionDances?.find(d => d.id === cls.competitionDanceId);
      return dance?.dancerIds?.length || 0;
    }
    // Regular classes - count from student enrollments
    return (data.students || []).filter(s => s.classIds?.includes(classId)).length;
  };

  // Merge classes and calendar events into a single time-sorted list
  type ScheduleItem =
    | { type: 'class'; data: typeof dayClasses[number]; time: number }
    | { type: 'event'; data: CalendarEvent; time: number }
    | { type: 'travel'; fromStudio: string; toStudio: string; travelMinutes: number; time: number };

  const mergedSchedule = (() => {
    const items: ScheduleItem[] = [];

    // Build class lookup for deduplication (by time and name)
    const classTimeSet = new Set(
      visibleDayClasses.map(cls => timeToMinutes(cls.startTime))
    );
    const classNameSet = new Set(
      visibleDayClasses.map(cls => cls.name.toLowerCase())
    );

    visibleDayClasses.forEach(cls => {
      items.push({ type: 'class', data: cls, time: timeToMinutes(cls.startTime) });
    });

    // Only add calendar events that don't overlap with a class (by time within 10 min OR matching name)
    calendarEventsForDay.forEach(event => {
      const eventTime = timeToMinutes(event.startTime || '00:00');
      const isDuplicateByTime = Array.from(classTimeSet).some(ct => Math.abs(ct - eventTime) <= 10);
      const isDuplicateByName = classNameSet.has(event.title.toLowerCase());
      if (!isDuplicateByTime && !isDuplicateByName) {
        items.push({ type: 'event', data: event, time: eventTime });
      }
    });

    const sorted = items.sort((a, b) => a.time - b.time);

    // Insert travel time cards between consecutive classes at different studios
    const withTravel: ScheduleItem[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const prev = sorted[i - 1];

      if (prev && current.type === 'class' && prev.type === 'class') {
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
              });
            }
          }
        }
      }

      withTravel.push(current);
    }

    return withTravel;
  })();

  return (
    <div className="page-container pb-24 xl:max-w-5xl">
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

      {/* Today + Week Review buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setWeekOffset(0);
            setSelectedDay(getCurrentDayOfWeek());
          }}
        >
          Today
        </Button>
        <Link
          to="/week-review"
          className="px-4 py-2 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-full text-sm font-medium hover:text-[var(--text-primary)] transition-colors shadow-sm min-h-[44px] flex items-center"
        >
          Week Review
        </Link>
        <Link
          to="/students"
          className="px-4 py-2 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-full text-sm font-medium hover:text-[var(--text-primary)] transition-colors shadow-sm min-h-[44px] flex items-center gap-1.5"
        >
          <Users size={14} />
          Students
        </Link>
      </div>

      {/* Week Overview */}
      <div className="space-y-3 mb-4">
        <WeekMomentumBar stats={stats} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <WeekStats
            stats={stats}
            classes={data.classes}
            competitions={data.competitions}
            weekNotes={data.weekNotes}
          />
          <StreakCard
            selfCare={data.selfCare}
            learningData={data.learningData}
            notesThisWeek={stats.classesThisWeek.completed}
            totalClassesThisWeek={stats.classesThisWeek.total}
          />
          <div className="sm:col-span-2 lg:col-span-1">
            <EventCountdown competitions={data.competitions || []} />
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 md:grid md:grid-cols-7 md:overflow-visible">
        {DAYS.map(({ key, short }) => {
          const isSelected = selectedDay === key;
          const rawDayClasses = data.classes.filter(c => c.day === key);
          const dayDate = addDays(weekStart, DAYS.findIndex(d => d.key === key));
          const dayDateStr = format(dayDate, 'yyyy-MM-dd');
          const dayCalendarEvents = (data.calendarEvents || []).filter(e => e.date === dayDateStr && !hiddenEventIds.has(e.id));
          const visibleClasses = rawDayClasses.filter(cls =>
            !shouldPreferCalendarEventOverClass(cls, dayCalendarEvents, {
              classes: data.classes,
              allEvents: data.calendarEvents || [],
              competitionDances: data.competitionDances || [],
              students: data.students || [],
              studios: data.studios,
            })
          );
          const hasClasses = visibleClasses.length > 0;
          const hasWorkCalendarEvents = dayCalendarEvents.some(event =>
            classifyCalendarEvent(event, {
              classes: data.classes,
              allEvents: data.calendarEvents || [],
              competitionDances: data.competitionDances || [],
              students: data.students || [],
            }).isWork
          );
          const hasGenericCalendarEvents = dayCalendarEvents.some(event =>
            !classifyCalendarEvent(event, {
              classes: data.classes,
              allEvents: data.calendarEvents || [],
              competitionDances: data.competitionDances || [],
              students: data.students || [],
            }).isWork
          );
          const hasCompetitions = data.competitions?.some(comp => {
            const startDate = parseISO(comp.date);
            const endDate = comp.endDate ? parseISO(comp.endDate) : startDate;
            const checkDate = parseISO(dayDateStr);
            return isWithinInterval(checkDate, { start: startDate, end: endDate });
          });
          const isToday = dayDateStr === format(new Date(), 'yyyy-MM-dd');

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all min-h-[64px] md:min-w-0 ${
                isSelected
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm'
                  : 'hover:bg-[var(--surface-card-hover)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="text-xs opacity-80">{short}</div>
              <div className={`text-lg font-medium ${isToday && !isSelected ? 'text-[var(--accent-primary)]' : ''}`}>
                {format(dayDate, 'd')}
              </div>
              {!isSelected && (hasClasses || dayCalendarEvents.length > 0 || hasCompetitions) && (
                <div className="flex gap-0.5 justify-center mt-1">
                  {hasClasses && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
                  {hasWorkCalendarEvents && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/70" />}
                  {hasGenericCalendarEvents && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  {hasCompetitions && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

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
                  {comp.endDate && comp.endDate !== comp.date && (
                    <> - {format(parseISO(comp.endDate), 'MMM d')}</>
                  )}
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

      {/* Weekend message when no calendar connected, no competitions, and no classes */}
      {isWeekend && calendarEventsForDay.length === 0 && competitionsForDay.length === 0 && visibleDayClasses.length === 0 && !data.settings?.calendarUrl && (
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

      {/* All items sorted by time */}
      <div className="space-y-3">
        {mergedSchedule.length === 0 && competitionsForDay.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={`No classes on ${DAYS.find(d => d.key === selectedDay)?.label}`}
          />
        ) : (
          mergedSchedule.map(item => {
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
              const cls = item.data;
              const studio = getStudio(cls.studioId);
              const studentCount = getStudentCount(cls.id);
              const exception = getClassException(cls.id);
              const hasException = !!exception;

              const classCard = (
                <div className="flex items-start gap-3">
                  <div
                    className="w-1.5 h-full min-h-[60px] rounded-full"
                    style={{ backgroundColor: hasException ? '#9ca3af' : (studio?.color || '#9ca3af') }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`type-h2 ${hasException ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} ${exception?.type === 'cancelled' ? 'line-through' : ''}`}>{cls.name}</div>
                      <div className="flex items-center gap-1.5">
                        {exception?.type === 'cancelled' && (
                          <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full font-medium">
                            Cancelled
                          </span>
                        )}
                        {exception?.type === 'subbed' && (
                          <span className="text-xs text-[var(--status-success)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full">
                            Sub{exception.subName ? `: ${exception.subName}` : ''}
                          </span>
                        )}
                        {exception?.type === 'time-change' && exception.timeOverride && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                            Moved to {exception.timeOverride.startTime}
                          </span>
                        )}
                        {!hasException && studentCount > 0 && (
                          <div className="flex items-center gap-1 text-sm bg-[var(--accent-muted)] text-[var(--accent-primary)] px-2 py-0.5 rounded-full">
                            <Users size={14} />
                            <span>{studentCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm mt-1 ${hasException ? 'text-[var(--text-tertiary)]' : 'text-[var(--color-honey)] dark:text-[var(--color-honey-light)]'}`}>
                      {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
                    </div>
                    <div className={`text-sm ${hasException ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>
                      {studio?.name}
                    </div>
                    {!hasException && cls.recitalSong && (
                      <div className={`text-sm mt-2 font-medium ${
                        cls.isRecitalSong
                          ? 'text-purple-600'
                          : 'text-[var(--text-secondary)]'
                      }`}>
                        {cls.isRecitalSong ? '⭐ Recital: ' : 'Combo: '}{cls.recitalSong}
                      </div>
                    )}
                  </div>
                </div>
              );

              if (hasException) {
                return (
                  <div
                    key={cls.id}
                    className="block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 opacity-60"
                  >
                    {classCard}
                    <button
                      onClick={() => toggleClassException(cls.id, exception)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:opacity-80 transition-opacity ml-4"
                    >
                      <RotateCcw size={12} />
                      Restore class
                    </button>
                  </div>
                );
              }

              return (
                <div key={cls.id} className="relative group">
                  <Link
                    to={`/class/${cls.id}${scheduleQuery}`}
                    className="block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)] transition-all"
                  >
                    {classCard}
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleClassException(cls.id); }}
                    className="absolute top-3 right-3 p-2 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Cancel class"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              );
            } else {
              const event = item.data;
              const eventType = classifyCalendarEvent(event, {
                classes: data.classes,
                allEvents: data.calendarEvents || [],
                competitionDances: data.competitionDances || [],
                students: data.students || [],
              });
              const isWorkEvent = eventType.isWork;
              const calException = getClassException(event.id, event.title, event.startTime);
              const isCancelled = calException?.type === 'cancelled';
              const isSubbed = calException?.type === 'subbed';
              // Toggle exception for calendar events
              const toggleCalEventException = (evId: string, evTitle: string, evStartTime?: string, hasExc?: boolean) => {
                const wn = getWeekNotes(weekOf) || { id: `week_${weekOf}`, weekOf, classNotes: {} };
                // Find matching internal class ID
                const normTitle = evTitle.toLowerCase();
                const evMins = evStartTime ? timeToMinutes(evStartTime) : -1;
                let targetId = evId;
                for (const cls of data.classes) {
                  const sameName = cls.name.toLowerCase() === normTitle;
                  const sameTime = evMins >= 0 && Math.abs(timeToMinutes(cls.startTime) - evMins) <= 10;
                  if (sameName && sameTime) { targetId = cls.id; break; }
                }
                if (hasExc) {
                  // Restore — remove exception from both IDs
                  for (const id of [targetId, evId]) {
                    if (wn.classNotes[id]?.exception) {
                      const { exception: _, ...rest } = wn.classNotes[id] as typeof wn.classNotes[string] & { exception?: unknown };
                      wn.classNotes[id] = rest as typeof wn.classNotes[string];
                    }
                  }
                } else {
                  // Cancel — set on both IDs
                  for (const id of [targetId, evId]) {
                    const existing = wn.classNotes[id] || { classId: id, plan: '', liveNotes: [], isOrganized: false };
                    wn.classNotes[id] = { ...existing, exception: { type: 'cancelled' as const, reason: 'personal' as const } };
                  }
                }
                saveWeekNotes(wn);
              };

              if (isCancelled || isSubbed) {
                return (
                  <div
                    key={event.id}
                    className="block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 opacity-60"
                  >
                    <Link to={`/event/${event.id}${scheduleQuery}`} className="block">
                      <div className="flex items-start gap-3">
                        <div className="w-1.5 h-full min-h-[60px] rounded-full bg-[var(--text-tertiary)]" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="type-h2 text-[var(--text-tertiary)] line-through">{event.title}</div>
                            <div className="flex items-center gap-1.5">
                              {isCancelled && (
                                <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full font-medium">Cancelled</span>
                              )}
                              {isSubbed && calException?.subName && (
                                <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Sub: {calException.subName}</span>
                              )}
                            </div>
                          </div>
                          {event.startTime && event.startTime !== '00:00' && (
                            <div className="text-sm text-[var(--text-tertiary)] mt-1">{formatTimeDisplay(event.startTime)}{event.endTime && event.endTime !== '00:00' && <> - {formatTimeDisplay(event.endTime)}</>}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => toggleCalEventException(event.id, event.title, event.startTime, true)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-primary)] hover:opacity-80 transition-opacity ml-4"
                    >
                      <RotateCcw size={12} />
                      Restore event
                    </button>
                  </div>
                );
              }

              return (
                <div key={event.id} className="relative group">
                <Link
                  to={`/event/${event.id}${scheduleQuery}`}
                  className={`block bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-4 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)] transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 h-full min-h-[60px] rounded-full ${isWorkEvent ? 'bg-[var(--accent-primary)]' : 'bg-amber-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className={`type-h2 ${isCancelled ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{event.title}</div>
                        <div className="flex items-center gap-1.5">
                          {isCancelled && (
                            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-inset)] px-2 py-0.5 rounded-full">
                              Cancelled
                            </span>
                          )}
                          {isSubbed && calException?.subName && (
                            <span className="text-xs text-[var(--status-info)] bg-[var(--status-info)]/10 px-2 py-0.5 rounded-full">
                              Sub: {calException.subName}
                            </span>
                          )}
                          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            isWorkEvent
                              ? 'text-[var(--accent-primary)] bg-[var(--accent-muted)]'
                              : 'text-[var(--status-warning)] bg-[var(--status-warning)]/10'
                          }`}>
                            <Calendar size={12} />
                            <span>{eventType.badgeLabel}</span>
                          </div>
                        </div>
                      </div>
                      {event.startTime && event.startTime !== '00:00' && (
                        <div className="flex items-center gap-1 text-sm text-[var(--color-honey)] dark:text-[var(--color-honey-light)] mt-1">
                          <Clock size={14} />
                          {formatTimeDisplay(event.startTime)}
                          {event.endTime && event.endTime !== '00:00' && (
                            <> - {formatTimeDisplay(event.endTime)}</>
                          )}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start gap-1 text-sm text-[var(--text-secondary)] mt-1">
                          <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                          <div>
                            {(() => {
                              const lines = event.location.split('\n').filter(Boolean);
                              const venueName = lines[0];
                              const address = lines.length > 1 ? lines.slice(1).join(', ') : null;
                              return (
                                <>
                                  <span>{venueName}</span>
                                  {address && (
                                    <a
                                      href={`https://maps.apple.com/?q=${encodeURIComponent(address)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-[var(--text-secondary)] underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {address}
                                    </a>
                                  )}
                                  {!address && lines.length === 1 && (
                                    <a
                                      href={`https://maps.apple.com/?q=${encodeURIComponent(venueName)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-[var(--text-secondary)] underline text-xs mt-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Get directions
                                    </a>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      {event.description && (
                        <div className="text-sm text-[var(--text-secondary)] mt-2">{event.description}</div>
                      )}
                    </div>
                  </div>
                </Link>
                {(eventType.isClassLike || isWorkEvent) && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCalEventException(event.id, event.title, event.startTime, false); }}
                    className="absolute top-3 right-3 p-2 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100"
                    title="Cancel event"
                  >
                    <XCircle size={18} />
                  </button>
                )}
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
}
