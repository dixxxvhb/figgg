import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Eye, Edit3 } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay, formatWeekOf, timeToMinutes } from '../utils/time';
import { DayOfWeek, ClassWeekNotes } from '../types';
import { Button } from '../components/common/Button';
import { v4 as uuid } from 'uuid';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function WeekPlanner() {
  const { data, getWeekNotes, saveWeekNotes, getCurrentWeekNotes } = useAppData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showLastWeek, setShowLastWeek] = useState(false);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const viewingWeekStart = addWeeks(currentWeekStart, weekOffset);
  const lastWeekStart = addWeeks(viewingWeekStart, -1);

  const weekLabel = format(viewingWeekStart, "'Week of' MMM d");
  const lastWeekLabel = format(lastWeekStart, "'Week of' MMM d");

  const currentWeekNotes = getWeekNotes(formatWeekOf(viewingWeekStart)) || {
    id: uuid(),
    weekOf: formatWeekOf(viewingWeekStart),
    classNotes: {},
  };

  const lastWeekNotes = getWeekNotes(formatWeekOf(lastWeekStart));

  const getStudio = (studioId: string) => data.studios.find(s => s.id === studioId);

  // Group classes by day
  const classesByDay = useMemo(() => {
    const grouped: Record<DayOfWeek, typeof data.classes> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    data.classes.forEach(cls => {
      grouped[cls.day].push(cls);
    });

    // Sort each day by time
    Object.keys(grouped).forEach(day => {
      grouped[day as DayOfWeek].sort((a, b) =>
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
    });

    return grouped;
  }, [data.classes]);

  const copyFromLastWeek = () => {
    if (!lastWeekNotes) return;

    const newNotes = {
      ...currentWeekNotes,
      classNotes: { ...lastWeekNotes.classNotes },
    };

    // Reset isOrganized and liveNotes for each class
    Object.keys(newNotes.classNotes).forEach(classId => {
      newNotes.classNotes[classId] = {
        ...newNotes.classNotes[classId],
        liveNotes: [],
        isOrganized: false,
      };
    });

    saveWeekNotes(newNotes);
  };

  const updatePlan = (classId: string, plan: string) => {
    const classNotes: ClassWeekNotes = currentWeekNotes.classNotes[classId] || {
      classId,
      plan: '',
      liveNotes: [],
      isOrganized: false,
    };

    const updatedNotes = {
      ...currentWeekNotes,
      classNotes: {
        ...currentWeekNotes.classNotes,
        [classId]: { ...classNotes, plan },
      },
    };

    saveWeekNotes(updatedNotes);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{weekLabel}</div>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Today Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setWeekOffset(0)}
          className="px-4 py-2 bg-forest-600 text-white rounded-full text-sm font-medium hover:bg-forest-700 transition-colors shadow-sm"
        >
          Today
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <Button
          variant={showLastWeek ? 'primary' : 'secondary'}
          onClick={() => setShowLastWeek(!showLastWeek)}
          className="flex-1"
        >
          <Eye size={16} className="mr-2" />
          {showLastWeek ? 'Hide Last Week' : 'Show Last Week'}
        </Button>
        {lastWeekNotes && (
          <Button variant="secondary" onClick={copyFromLastWeek}>
            <Copy size={16} className="mr-2" />
            Copy Plans
          </Button>
        )}
      </div>

      {/* Last Week Reference */}
      {showLastWeek && lastWeekNotes && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="text-sm font-medium text-gray-500 mb-3">{lastWeekLabel}</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(lastWeekNotes.classNotes).map(([classId, notes]) => {
              const cls = data.classes.find(c => c.id === classId);
              if (!cls || !notes.plan) return null;
              return (
                <div key={classId} className="text-sm">
                  <span className="font-medium">{cls.name}:</span>{' '}
                  <span className="text-gray-600">{notes.plan}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week Grid */}
      <div className="space-y-6">
        {DAYS.map(day => {
          const classes = classesByDay[day];
          if (classes.length === 0) return null;

          const dayDate = addDays(viewingWeekStart, DAYS.indexOf(day));
          const dayLabel = format(dayDate, 'EEEE, MMM d');

          return (
            <div key={day}>
              <h3 className="font-semibold text-gray-900 mb-3">{dayLabel}</h3>
              <div className="space-y-3">
                {classes.map(cls => {
                  const studio = getStudio(cls.studioId);
                  const classNotes = currentWeekNotes.classNotes[cls.id];
                  const lastWeekClassNotes = lastWeekNotes?.classNotes[cls.id];

                  return (
                    <div
                      key={cls.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ borderLeft: `4px solid ${studio?.color || '#9ca3af'}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/class/${cls.id}`}
                            className="font-medium text-gray-900 hover:text-forest-600"
                          >
                            {cls.name}
                          </Link>
                          <div className="text-sm text-gray-500">
                            {formatTimeDisplay(cls.startTime)} · {studio?.shortName}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-gray-50">
                        {showLastWeek && lastWeekClassNotes?.plan && (
                          <div className="text-sm text-gray-500 mb-2">
                            <span className="font-medium">Last week:</span> {lastWeekClassNotes.plan}
                          </div>
                        )}
                        <textarea
                          value={classNotes?.plan || ''}
                          onChange={(e) => updatePlan(cls.id, e.target.value)}
                          placeholder="Plan for this class..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                        />
                        {classNotes?.liveNotes && classNotes.liveNotes.length > 0 && (
                          <div className="mt-2 text-xs text-forest-600">
                            {classNotes.liveNotes.length} note{classNotes.liveNotes.length !== 1 ? 's' : ''} from class
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
