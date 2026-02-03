import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Eye } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { formatTimeDisplay, formatWeekOf, timeToMinutes } from '../utils/time';
import { DayOfWeek, ClassWeekNotes, WeekNotes } from '../types';
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
  const viewingWeekOf = formatWeekOf(viewingWeekStart);

  // Get initial week notes and keep in local state
  const getInitialWeekNotes = (): WeekNotes => {
    return getWeekNotes(viewingWeekOf) || {
      id: uuid(),
      weekOf: viewingWeekOf,
      classNotes: {},
    };
  };

  const [currentWeekNotes, setCurrentWeekNotes] = useState<WeekNotes>(getInitialWeekNotes);

  // Sync when weekOffset changes or when data changes from cloud
  useEffect(() => {
    setCurrentWeekNotes(getInitialWeekNotes());
  }, [weekOffset, data.weekNotes, viewingWeekOf]);

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

  const saveNotes = (updatedNotes: WeekNotes) => {
    setCurrentWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

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

    saveNotes(newNotes);
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

    saveNotes(updatedNotes);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 active:bg-blush-200 dark:active:bg-blush-700 rounded-lg text-forest-700 dark:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-semibold text-forest-900 dark:text-white">{weekLabel}</div>
        </div>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 hover:bg-blush-100 dark:hover:bg-blush-800 active:bg-blush-200 dark:active:bg-blush-700 rounded-lg text-forest-700 dark:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Today Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setWeekOffset(0)}
          className="px-4 py-2 bg-forest-600 text-white rounded-full text-sm font-medium hover:bg-forest-700 active:scale-[0.98] transition-colors shadow-sm"
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
        <div className="bg-blush-50 dark:bg-blush-800 rounded-xl p-4 mb-6">
          <div className="text-sm font-medium text-blush-500 dark:text-blush-400 mb-3">{lastWeekLabel}</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(lastWeekNotes.classNotes).map(([classId, notes]) => {
              const cls = data.classes.find(c => c.id === classId);
              if (!cls || !notes.plan) return null;
              return (
                <div key={classId} className="text-sm">
                  <span className="font-medium text-forest-700 dark:text-white">{cls.name}:</span>{' '}
                  <span className="text-blush-600 dark:text-blush-300">{notes.plan}</span>
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
              <h3 className="font-semibold text-forest-900 dark:text-white mb-3">{dayLabel}</h3>
              <div className="space-y-3">
                {classes.map(cls => {
                  const studio = getStudio(cls.studioId);
                  const classNotes = currentWeekNotes.classNotes[cls.id];
                  const lastWeekClassNotes = lastWeekNotes?.classNotes[cls.id];

                  return (
                    <div
                      key={cls.id}
                      className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden"
                    >
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ borderLeft: `4px solid ${studio?.color || '#9ca3af'}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/class/${cls.id}`}
                            className="font-medium text-forest-900 dark:text-white hover:text-forest-600 dark:hover:text-forest-400"
                          >
                            {cls.name}
                          </Link>
                          <div className="text-sm text-blush-500 dark:text-blush-400">
                            {formatTimeDisplay(cls.startTime)} · {studio?.shortName}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-blush-50 dark:bg-blush-900/50">
                        {showLastWeek && lastWeekClassNotes?.plan && (
                          <div className="text-sm text-blush-500 dark:text-blush-400 mb-2">
                            <span className="font-medium">Last week:</span> {lastWeekClassNotes.plan}
                          </div>
                        )}
                        <textarea
                          value={classNotes?.plan || ''}
                          onChange={(e) => updatePlan(cls.id, e.target.value)}
                          placeholder="Plan for this class..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
                        />
                        {classNotes?.liveNotes && classNotes.liveNotes.length > 0 && (
                          <div className="mt-2 text-xs text-forest-600 dark:text-forest-400">
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
