import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());

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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-blush-200 rounded-lg text-forest-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-forest-700">{weekLabel}</div>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-blush-200 rounded-lg text-forest-600 transition-colors"
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
          className="px-4 py-2 bg-forest-600 text-white rounded-full text-sm font-medium hover:bg-forest-700 transition-colors shadow-sm"
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
              className={`flex-1 min-w-[48px] py-2 px-1 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-forest-600 text-white shadow-md'
                  : 'hover:bg-blush-200 text-forest-600'
              }`}
            >
              <div className="text-xs opacity-80">{short}</div>
              <div className={`text-lg font-medium ${isToday && !isSelected ? 'text-forest-500' : ''}`}>
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
          <div className="flex items-center gap-2 text-sm text-purple-500 mb-3">
            <Trophy size={16} />
            <span>Competition</span>
          </div>
          <div className="space-y-3">
            {competitionsForDay.map(comp => (
              <Link
                key={comp.id}
                to={`/competition/${comp.id}`}
                className="block bg-gradient-to-r from-purple-50 to-blush-50 rounded-xl border border-purple-200 p-4 hover:border-purple-300 hover:shadow-md transition-all"
              >
                <div className="font-medium text-forest-700">{comp.name}</div>
                <div className="flex items-center gap-1 text-sm text-forest-400 mt-1">
                  <Calendar size={14} />
                  {format(parseISO(comp.date), 'MMM d')}
                  {comp.endDate && comp.endDate !== comp.date && (
                    <> - {format(parseISO(comp.endDate), 'MMM d')}</>
                  )}
                </div>
                {comp.location && (
                  <div className="flex items-center gap-1 text-sm text-forest-400 mt-1">
                    <MapPin size={14} />
                    {comp.location}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Events (for weekends with synced calendar) */}
      {calendarEventsForDay.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-blush-500 mb-3">
            <Calendar size={16} />
            <span>From your calendar</span>
          </div>
          <div className="space-y-3">
            {calendarEventsForDay.map(event => (
              <Link
                key={event.id}
                to={`/event/${event.id}`}
                className="block bg-white rounded-xl border border-blush-200 p-4 hover:border-blush-300 hover:shadow-md transition-all"
              >
                <div className="font-medium text-forest-700">{event.title}</div>
                {event.startTime && event.startTime !== '00:00' && (
                  <div className="flex items-center gap-1 text-sm text-forest-400 mt-1">
                    <Clock size={14} />
                    {formatTimeDisplay(event.startTime)}
                    {event.endTime && event.endTime !== '00:00' && (
                      <> - {formatTimeDisplay(event.endTime)}</>
                    )}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-sm text-forest-400 mt-1">
                    <MapPin size={14} />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <div className="text-sm text-forest-500 mt-2">{event.description}</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Weekend message when no calendar connected, no competitions, and no classes */}
      {isWeekend && calendarEventsForDay.length === 0 && competitionsForDay.length === 0 && displayClasses.length === 0 && !data.settings?.calendarUrl && (
        <div className="bg-white rounded-xl p-6 mb-4 text-center border border-blush-200">
          <div className="w-12 h-12 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="text-forest-500" size={24} />
          </div>
          <p className="text-sm text-forest-500">
            Connect your calendar in Settings to see your weekend competition schedule here
          </p>
          <Link to="/settings" className="text-sm text-forest-600 font-medium mt-3 inline-block hover:text-forest-700">
            Go to Settings →
          </Link>
        </div>
      )}

      {/* Regular Classes */}
      <div className="space-y-3">
        {displayClasses.length === 0 && calendarEventsForDay.length === 0 && competitionsForDay.length === 0 ? (
          <div className="text-center py-12 text-forest-400">
            No classes on {DAYS.find(d => d.key === selectedDay)?.label}
          </div>
        ) : displayClasses.length === 0 ? null : (
          displayClasses.map(cls => {
            const studio = getStudio(cls.studioId);
            const studentCount = getStudentCount(cls.id);
            return (
              <Link
                key={cls.id}
                to={`/class/${cls.id}`}
                className="block bg-white rounded-xl border border-blush-200 p-4 hover:border-forest-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1.5 h-full min-h-[60px] rounded-full"
                    style={{ backgroundColor: studio?.color || '#9ca3af' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-forest-700">{cls.name}</div>
                      {studentCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-forest-500 bg-forest-50 px-2 py-0.5 rounded-full">
                          <Users size={14} />
                          <span>{studentCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-forest-400 mt-1">
                      {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
                    </div>
                    <div className="text-sm text-forest-400">
                      {studio?.name}
                    </div>
                    {cls.recitalSong && (
                      <div className="text-sm text-blush-500 mt-2 font-medium">
                        Recital: {cls.recitalSong}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
