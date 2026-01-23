import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Play, ChevronRight, CheckCircle } from 'lucide-react';
import { CurrentClassInfo } from '../../types';
import { formatTimeDisplay, formatDuration } from '../../utils/time';
import { Button } from '../common/Button';

interface CurrentClassCardProps {
  classInfo: CurrentClassInfo;
  isNearStudio?: boolean;
}

export function CurrentClassCard({ classInfo, isNearStudio }: CurrentClassCardProps) {
  const { class: currentClass, studio, status, timeUntilStart, timeRemaining, nextClass, nextStudio } = classInfo;

  if (status === 'none' || !currentClass) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <p className="text-gray-500">No classes scheduled for today</p>
        <Link to="/schedule" className="text-violet-600 font-medium mt-2 inline-block">
          View full schedule
        </Link>
      </div>
    );
  }

  if (status === 'after') {
    return (
      <div className="bg-green-50 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <CheckCircle size={20} />
          <span className="font-medium">All done for today!</span>
        </div>
        <p className="text-green-600">Great work teaching today.</p>
        <Link to="/plan" className="text-green-700 font-medium mt-4 inline-block">
          Review today's notes
        </Link>
      </div>
    );
  }

  const studioColor = studio?.color || '#8b5cf6';
  const isDuring = status === 'during';

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ backgroundColor: studioColor }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-white/80 text-sm mb-1">
              {isDuring ? 'Currently Teaching' : 'Up Next'}
            </div>
            <h2 className="text-2xl font-bold">{currentClass.name}</h2>
          </div>
          {isDuring && (
            <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
              LIVE
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-white/90 mb-6">
          <div className="flex items-center gap-1.5">
            <Clock size={16} />
            <span>
              {formatTimeDisplay(currentClass.startTime)} - {formatTimeDisplay(currentClass.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={16} />
            <span>{studio?.name || 'Unknown Studio'}</span>
          </div>
        </div>

        {/* Time Status */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          {isDuring ? (
            <div>
              <div className="text-white/70 text-sm mb-1">Time Remaining</div>
              <div className="text-3xl font-bold">{formatDuration(timeRemaining || 0)}</div>
            </div>
          ) : (
            <div>
              <div className="text-white/70 text-sm mb-1">Starts In</div>
              <div className="text-3xl font-bold">{formatDuration(timeUntilStart || 0)}</div>
            </div>
          )}
        </div>

        {/* Location Status */}
        {isNearStudio !== undefined && (
          <div className={`flex items-center gap-2 text-sm ${isNearStudio ? 'text-white' : 'text-white/70'}`}>
            <MapPin size={14} />
            {isNearStudio ? (
              <span>You're at {studio?.shortName}</span>
            ) : (
              <span>Not at studio yet</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Link to={`/class/${currentClass.id}/notes`} className="flex-1">
            <Button
              variant="secondary"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Play size={16} className="mr-2" />
              {isDuring ? 'Open Notes' : 'Start Notes'}
            </Button>
          </Link>
          <Link to={`/class/${currentClass.id}`}>
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <ChevronRight size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Next Class Preview */}
      {nextClass && (
        <Link
          to={`/class/${nextClass.id}`}
          className="block bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-500 text-sm">After this</div>
              <div className="font-medium">{nextClass.name}</div>
              <div className="text-sm text-gray-500">
                {formatTimeDisplay(nextClass.startTime)} at {nextStudio?.shortName}
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </Link>
      )}
    </div>
  );
}
