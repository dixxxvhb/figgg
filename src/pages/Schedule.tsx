import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
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

  // Get calendar events for the selected day (from synced calendar)
  const calendarEventsForDay = useMemo(() => {
    if (!data.calendarEvents) return [];
    return data.calendarEvents.filter(e => e.date === selectedDateStr);
  }, [data.calendarEvents, selectedDateStr]);

  // Check if it's a weekend
  const isWeekend = selectedDay === 'saturday' || selectedDay === 'sunday';

  const dayClasses = data.classes
    .filter(c => c.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // For weekends, we might have placeholder classes that we want to hide if we have calendar events
  const showPlaceholderClasses = isWeekend && calendarEventsForDay.length === 0;
  const displayClasses = isWeekend && calendarEventsForDay.length > 0 ? [] : dayClasses;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{weekLabel}</div>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-sm text-violet-600"
            >
              Go to this week
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight size={20} />
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
          const isToday = dayDateStr === format(new Date(), 'yyyy-MM-dd');

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={`flex-1 min-w-[48px] py-2 px-1 rounded-lg text-center transition-colors ${
                isSelected
                  ? 'bg-violet-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="text-xs">{short}</div>
              <div className={`text-lg font-medium ${isToday && !isSelected ? 'text-violet-600' : ''}`}>
                {format(dayDate, 'd')}
              </div>
              {(hasClasses || hasCalendarEvents) && !isSelected && (
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${hasCalendarEvents ? 'bg-amber-400' : 'bg-violet-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Events (for weekends with synced calendar) */}
      {calendarEventsForDay.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
            <Calendar size={16} />
            <span>From your calendar</span>
          </div>
          <div className="space-y-3">
            {calendarEventsForDay.map(event => (
              <div
                key={event.id}
                className="bg-amber-50 rounded-xl border border-amber-200 p-4"
              >
                <div className="font-medium text-gray-900">{event.title}</div>
                {event.startTime && event.startTime !== '00:00' && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Clock size={14} />
                    {formatTimeDisplay(event.startTime)}
                    {event.endTime && event.endTime !== '00:00' && (
                      <> - {formatTimeDisplay(event.endTime)}</>
                    )}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin size={14} />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <div className="text-sm text-gray-600 mt-2">{event.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekend message when no calendar connected */}
      {isWeekend && calendarEventsForDay.length === 0 && !data.settings?.calendarUrl && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
          <Calendar className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-500">
            Connect your calendar in Settings to see your weekend competition schedule here
          </p>
          <Link to="/settings" className="text-sm text-violet-600 font-medium mt-2 inline-block">
            Go to Settings
          </Link>
        </div>
      )}

      {/* Regular Classes */}
      <div className="space-y-3">
        {displayClasses.length === 0 && calendarEventsForDay.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No classes on {DAYS.find(d => d.key === selectedDay)?.label}
          </div>
        ) : (
          displayClasses.map(cls => {
            const studio = getStudio(cls.studioId);
            return (
              <Link
                key={cls.id}
                to={`/class/${cls.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-full min-h-[60px] rounded-full"
                    style={{ backgroundColor: studio?.color || '#9ca3af' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{cls.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatTimeDisplay(cls.startTime)} - {formatTimeDisplay(cls.endTime)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {studio?.name}
                    </div>
                    {cls.recitalSong && (
                      <div className="text-sm text-violet-600 mt-2">
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
