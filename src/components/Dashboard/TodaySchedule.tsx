import React from 'react';
import { Link } from 'react-router-dom';
import { Class, Studio } from '../../types';
import { formatTimeDisplay, getCurrentTimeMinutes, timeToMinutes } from '../../utils/time';

interface TodayScheduleProps {
  classes: Class[];
  studios: Studio[];
}

export function TodaySchedule({ classes, studios }: TodayScheduleProps) {
  const currentMinutes = getCurrentTimeMinutes();

  const getStudio = (studioId: string) => studios.find(s => s.id === studioId);

  if (classes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm">
      <div className="p-4 border-b border-blush-100 dark:border-blush-700">
        <h3 className="font-semibold text-forest-700 dark:text-white">Today's Schedule</h3>
      </div>
      <div className="divide-y divide-blush-100 dark:divide-blush-700">
        {classes.map(cls => {
          const studio = getStudio(cls.studioId);
          const startMinutes = timeToMinutes(cls.startTime);
          const endMinutes = timeToMinutes(cls.endTime);
          const isPast = currentMinutes >= endMinutes;
          const isCurrent = currentMinutes >= startMinutes && currentMinutes < endMinutes;

          return (
            <Link
              key={cls.id}
              to={`/class/${cls.id}`}
              className={`flex items-center gap-4 p-4 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors ${
                isPast ? 'opacity-50' : ''
              }`}
            >
              {/* Time */}
              <div className="w-20 text-sm">
                <div className={isCurrent ? 'text-forest-600 dark:text-forest-400 font-medium' : 'text-forest-500 dark:text-blush-300'}>
                  {formatTimeDisplay(cls.startTime)}
                </div>
                <div className="text-forest-400 dark:text-blush-400">
                  {formatTimeDisplay(cls.endTime)}
                </div>
              </div>

              {/* Studio Color Bar */}
              <div
                className="w-1.5 h-12 rounded-full"
                style={{ backgroundColor: studio?.color || '#9ca3af' }}
              />

              {/* Class Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${isCurrent ? 'text-forest-600 dark:text-forest-400' : 'text-forest-700 dark:text-white'}`}>
                  {cls.name}
                </div>
                <div className="text-sm text-forest-400 dark:text-blush-400 truncate">
                  {studio?.shortName}
                  {cls.recitalSong && ` · ${cls.recitalSong}`}
                </div>
              </div>

              {/* Status */}
              {isCurrent && (
                <div className="bg-blush-200 dark:bg-blush-600 text-forest-700 dark:text-white text-xs font-bold px-2 py-1 rounded-full">
                  NOW
                </div>
              )}
              {isPast && (
                <div className="text-forest-400 dark:text-blush-500 text-xs">Done</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
