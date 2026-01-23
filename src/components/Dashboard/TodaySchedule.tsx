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
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
      </div>
      <div className="divide-y divide-gray-100">
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
              className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                isPast ? 'opacity-50' : ''
              }`}
            >
              {/* Time */}
              <div className="w-20 text-sm">
                <div className={isCurrent ? 'text-violet-600 font-medium' : 'text-gray-600'}>
                  {formatTimeDisplay(cls.startTime)}
                </div>
                <div className="text-gray-400">
                  {formatTimeDisplay(cls.endTime)}
                </div>
              </div>

              {/* Studio Color Bar */}
              <div
                className="w-1 h-12 rounded-full"
                style={{ backgroundColor: studio?.color || '#9ca3af' }}
              />

              {/* Class Info */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${isCurrent ? 'text-violet-600' : 'text-gray-900'}`}>
                  {cls.name}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {studio?.shortName}
                  {cls.recitalSong && ` · ${cls.recitalSong}`}
                </div>
              </div>

              {/* Status */}
              {isCurrent && (
                <div className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-1 rounded-full">
                  NOW
                </div>
              )}
              {isPast && (
                <div className="text-gray-400 text-xs">Done</div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
