import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Play, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
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
      <div className="bg-white rounded-2xl p-6 text-center border border-blush-200 shadow-sm">
        <div className="w-12 h-12 bg-blush-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles className="text-forest-500" size={24} />
        </div>
        <p className="text-forest-400">No classes scheduled for today</p>
        <Link to="/schedule" className="text-forest-600 font-medium mt-2 inline-block hover:text-forest-700">
          View full schedule →
        </Link>
      </div>
    );
  }

  if (status === 'after') {
    return (
      <div className="bg-gradient-to-br from-forest-600 to-forest-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blush-200 rounded-full flex items-center justify-center">
            <CheckCircle size={18} className="text-forest-600" />
          </div>
          <span className="font-semibold text-lg">All done for today!</span>
        </div>
        <p className="text-blush-200 mb-4">Great work teaching today.</p>
        <Link
          to="/plan"
          className="inline-flex items-center gap-2 bg-blush-200 text-forest-700 px-4 py-2 rounded-lg font-medium hover:bg-blush-100 transition-colors"
        >
          Review today's notes
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  const isDuring = status === 'during';

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="bg-gradient-to-br from-forest-600 to-forest-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-blush-200 text-sm mb-1">
              {isDuring ? 'Currently Teaching' : 'Up Next'}
            </div>
            <h2 className="text-2xl font-bold">{currentClass.name}</h2>
          </div>
          {isDuring && (
            <div className="bg-blush-200 text-forest-700 rounded-full px-3 py-1 text-sm font-bold animate-pulse">
              LIVE
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-blush-200/90 mb-6">
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
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 border border-white/10">
          {isDuring ? (
            <div>
              <div className="text-blush-200/80 text-sm mb-1">Time Remaining</div>
              <div className="text-3xl font-bold text-blush-100">{formatDuration(timeRemaining || 0)}</div>
            </div>
          ) : (
            <div>
              <div className="text-blush-200/80 text-sm mb-1">Starts In</div>
              <div className="text-3xl font-bold text-blush-100">{formatDuration(timeUntilStart || 0)}</div>
            </div>
          )}
        </div>

        {/* Location Status */}
        {isNearStudio !== undefined && (
          <div className={`flex items-center gap-2 text-sm ${isNearStudio ? 'text-blush-100' : 'text-blush-200/70'}`}>
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
              className="w-full bg-blush-200 hover:bg-blush-100 text-forest-700 border-0 font-semibold"
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
          className="block bg-white rounded-xl p-4 hover:shadow-md transition-all border border-blush-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-forest-400 text-sm">After this</div>
              <div className="font-medium text-forest-700">{nextClass.name}</div>
              <div className="text-sm text-forest-400">
                {formatTimeDisplay(nextClass.startTime)} at {nextStudio?.shortName}
              </div>
            </div>
            <ChevronRight size={20} className="text-blush-300" />
          </div>
        </Link>
      )}
    </div>
  );
}
