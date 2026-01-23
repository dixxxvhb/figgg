import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { DayOfWeek } from '../types';
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

  const dayClasses = data.classes
    .filter(c => c.day === selectedDay)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

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
          const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

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
              {hasClasses && !isSelected && (
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mx-auto mt-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day Classes */}
      <div className="space-y-3">
        {dayClasses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No classes on {DAYS.find(d => d.key === selectedDay)?.label}
          </div>
        ) : (
          dayClasses.map(cls => {
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
