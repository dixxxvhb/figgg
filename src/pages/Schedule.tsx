import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Trophy, Users } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { DayOfWeek, CalendarEvent } from '../types';
import { formatTimeDisplay, timeToMinutes, getCurrentDayOfWeek } from '../utils/time';

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
  const { data } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWeek = parseInt(searchParams.get('week') || '0', 10);
  const [weekOffset, setWeekOffset] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());

  // Update URL when week changes
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

  // Get calendar events for the selected day (from synced calendar), sorted by start time
  const calendarEventsForDay = useMemo(() => {
    if (!data.calendarEvents) return [];
    return data.calendarEvents
      .filter(e => e.date === selectedDateStr)
      .sort((a, b) => timeToMinutes(a.startTime || '00:00') - timeToMinutes(b.startTime || '00:00'));
  }, [data.calendarEvents, selectedDateStr]);

  // Get competitions happening on the selected day
  const competitionsForDay = useMemo(() => {
    if (!data.competitions) return [];
    return data.competitions.filter(comp => {
      const startDate = parseISO(comp.date);
      const endDate = comp.endDate ? parseISO(comp.endDate) : startDate;
      const selectedDate = parseISO(selectedDateStr);
      return isWithinInterval(selectedDate, { start: startDate, end: endDate });
    });
  }, [data.competitions, selectedDateStr]);

  // Check if it's a weekend
  const isWeekend = selectedDay === 'saturday' || selectedDay === 'sunday';

  const dayClasses = data.classes
    .filter(c => c.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

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

  // Show all classes for the day (including weekend rehearsals)
  const displayClasses = dayClasses;

  // Merge classes and calendar events into a single time-sorted list
  type ScheduleItem =
    | { type: 'class'; data: typeof displayClasses[number]; time: number }
    | { type: 'event'; data: CalendarEvent; time: number };

  const mergedSchedule = useMemo(() => {
    const items: ScheduleItem[] = [];

    displayClasses.forEach(cls => {
      items.push({ type: 'class', data: cls, time: timeToMinutes(cls.startTime) });
    });

    calendarEventsForDay.forEach(event => {
      items.push({ type: 'event', data: event, time: timeToMinutes(event.startTime || '00:00') });
    });

    return items.sort((a, b) => a.time - b.time);
  }, [displayClasses, calendarEventsForDay]);

  return (
    <div className="page-w px-4 py-6 pb-24">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-blush-200 dark:hover:bg-blush-700 rounded-lg text-forest-600 dark:text-forest-400 transition-colors min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-forest-700 dark:text-white text-base">{weekLabel}</h1>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-blush-200 dark:hover:bg-blush-700 rounded-lg text-forest-600 dark:text-forest-400 transition-colors min-h-[44px] min-w-[44px]"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Today Button - always visible */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => {
            setWeekOffset(0);
            setSelectedDay(getCurrentDayOfWeek());
          }}
          className="px-4 py-2 bg-forest-600 text-white rounded-full text-sm font-medium hover:bg-forest-700 transition-colors shadow-sm min-h-[44px]"
        >
          Today
        </button>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {DAYS.map(({ key, short }) => {
          const isSelected = selectedDay === key;
          const hasClasses = data.classes.some(c => c.day === key);
          const dayDate = addDays(weekStart, DAYS.findIndex(d => d.key === key));
          const dayDateStr = format(dayDate, 'yyyy-MM-dd');
          const hasCalendarEvents = data.calendarEvents?.some(e => e.date === dayDateStr);
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
              className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all min-h-[64px] ${
                isSelected
                  ? 'bg-forest-600 text-white shadow-md'
                  : 'hover:bg-blush-200 dark:hover:bg-blush-700 text-forest-600 dark:text-blush-200'
              }`}
            >
              <div className="text-xs opacity-80">{short}</div>
              <div className={`text-lg font-medium ${isToday && !isSelected ? 'text-forest-500 dark:text-forest-400' : ''}`}>
                {format(dayDate, 'd')}
              </div>
              {(hasClasses || hasCalendarEvents || hasCompetitions) && !isSelected && (
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${hasCompetitions ? 'bg-purple-400' : hasCalendarEvents ? 'bg-blush-400' : 'bg-forest-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Competitions */}
      {competitionsForDay.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-purple-500 dark:text-purple-400 mb-3">
            <Trophy size={16} />
            <span>Competition</span>
          </div>
          <div className="space-y-3">
            {competitionsForDay.map(comp => (
              <Link
                key={comp.id}
                to={`/choreography/${comp.id}`}
                className="block bg-gradient-to-r from-purple-50 to-blush-50 dark:from-purple-900/30 dark:to-blush-800 rounded-xl border border-purple-200 dark:border-purple-800 p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all"
              >
                <div className="font-medium text-forest-700 dark:text-white">{comp.name}</div>
                <div className="flex items-center gap-1 text-sm text-forest-400 dark:text-blush-400 mt-1">
                  <Calendar size={14} />
                  {format(parseISO(comp.date), 'MMM d')}
                  {comp.endDate && comp.endDate !== comp.date && (
                    <> - {format(parseISO(comp.endDate), 'MMM d')}</>
                  )}
                </div>
                {comp.location && (
                  <div className="flex items-center gap-1 text-sm text-forest-400 dark:text-blush-400 mt-1">
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
      {isWeekend && calendarEventsForDay.length === 0 && competitionsForDay.length === 0 && displayClasses.length === 0 && !data.settings?.calendarUrl && (
        <div className="bg-white dark:bg-blush-800 rounded-xl p-6 mb-4 text-center border border-blush-200 dark:border-blush-700">
          <div className="w-12 h-12 bg-blush-100 dark:bg-blush-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="text-forest-500 dark:text-forest-400" size={24} />
          </div>
          <p className="text-sm text-forest-500 dark:text-blush-300">
            Connect your calendar in Settings to see your weekend competition schedule here
          </p>
          <Link to="/settings" className="text-sm text-forest-600 dark:text-forest-400 font-medium mt-3 inline-block hover:text-forest-700 dark:hover:text-forest-300">
            Go to Settings →
          </Link>
        </div>
      )}

      {/* All items sorted by time */}
      <div className="space-y-3">
        {mergedSchedule.length === 0 && competitionsForDay.length === 0 ? (
          <div className="text-center py-12 text-forest-400 dark:text-blush-400">
            No classes on {DAYS.find(d => d.key === selectedDay)?.label}
          </div>
        ) : (
          mergedSchedule.map(item => {
            if (item.type === 'class') {
              const cls = item.data;
              const studio = getStudio(cls.studioId);
              const studentCount = getStudentCount(cls.id);
              return (
                <Link
                  key={cls.id}
                  to={`/class/${cls.id}${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`}
                  className="block bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 hover:border-forest-300 dark:hover:border-forest-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-full min-h-[60px] rounded-full"
                      style={{ backgroundColor: studio?.color || '#9ca3af' }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-forest-700 dark:text-white">{cls.name}</div>
                        {studentCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-forest-500 dark:text-forest-400 bg-forest-50 dark:bg-forest-900/30 px-2 py-0.5 rounded-full">
                            <Users size={14} />
                            <span>{studentCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-forest-400 dark:text-blush-400 mt-1">
                        {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
                      </div>
                      <div className="text-sm text-forest-400 dark:text-blush-400">
                        {studio?.name}
                      </div>
                      {cls.recitalSong && (
                        <div className={`text-sm mt-2 font-medium ${
                          cls.isRecitalSong
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-blush-500 dark:text-blush-400'
                        }`}>
                          {cls.isRecitalSong ? '⭐ Recital: ' : 'Combo: '}{cls.recitalSong}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            } else {
              const event = item.data;
              return (
                <Link
                  key={event.id}
                  to={`/event/${event.id}`}
                  className="block bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 hover:border-blush-300 dark:hover:border-blush-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-full min-h-[60px] rounded-full bg-amber-400" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-forest-700 dark:text-white">{event.title}</div>
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          <Calendar size={12} />
                          <span>Calendar</span>
                        </div>
                      </div>
                      {event.startTime && event.startTime !== '00:00' && (
                        <div className="flex items-center gap-1 text-sm text-forest-400 dark:text-blush-400 mt-1">
                          <Clock size={14} />
                          {formatTimeDisplay(event.startTime)}
                          {event.endTime && event.endTime !== '00:00' && (
                            <> - {formatTimeDisplay(event.endTime)}</>
                          )}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start gap-1 text-sm text-forest-400 dark:text-blush-400 mt-1">
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
                                      className="block text-forest-500 dark:text-blush-300 underline"
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
                                      className="block text-forest-500 dark:text-blush-300 underline text-xs mt-0.5"
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
                        <div className="text-sm text-forest-500 dark:text-blush-300 mt-2">{event.description}</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            }
          })
        )}
      </div>
    </div>
  );
}
