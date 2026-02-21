import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Eye, Calendar, MessageSquare, Sparkles, Loader2, CalendarOff } from 'lucide-react';
import { format, addWeeks, startOfWeek, addDays } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { formatTimeDisplay, formatWeekOf, timeToMinutes } from '../utils/time';
import { DayOfWeek, ClassWeekNotes, WeekNotes, WeekReflection, CalendarEvent } from '../types';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { v4 as uuid } from 'uuid';
import { normalizeTitle } from '../utils/smartNotes';
import { generatePlan } from '../services/ai';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function WeekPlanner() {
  const navigate = useNavigate();
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

  // Group calendar events by day of the viewing week
  const eventsByDay = useMemo(() => {
    const grouped: Record<DayOfWeek, CalendarEvent[]> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };

    (data.calendarEvents || []).forEach(event => {
      if (!event.date) return;
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(viewingWeekStart, i);
        if (format(dayDate, 'yyyy-MM-dd') === event.date) {
          grouped[DAYS[i]].push(event);
          break;
        }
      }
    });

    DAYS.forEach(day => {
      grouped[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    });

    return grouped;
  }, [data.calendarEvents, viewingWeekStart]);

  const saveNotes = (updatedNotes: WeekNotes) => {
    setCurrentWeekNotes(updatedNotes);
    saveWeekNotes(updatedNotes);
  };

  const copyFromLastWeek = () => {
    if (!lastWeekNotes) return;

    const copiedClassNotes: Record<string, ClassWeekNotes> = {};

    // Build a map of this week's event titles → IDs for remapping
    const thisWeekEventsByTitle = new Map<string, string>();
    for (const events of Object.values(eventsByDay)) {
      for (const ev of events) {
        thisWeekEventsByTitle.set(normalizeTitle(ev.title), ev.id);
      }
    }

    Object.entries(lastWeekNotes.classNotes).forEach(([id, notes]) => {
      // For calendar events (cal-*), remap to this week's matching event ID
      let targetId = id;
      if (id.startsWith('cal-') && notes.eventTitle) {
        const match = thisWeekEventsByTitle.get(normalizeTitle(notes.eventTitle));
        if (match) targetId = match;
        else return; // No matching event this week — skip
      }

      copiedClassNotes[targetId] = {
        ...notes,
        classId: targetId,
        liveNotes: [],
        isOrganized: false,
      };
    });

    saveNotes({ ...currentWeekNotes, classNotes: copiedClassNotes });
  };

  const updateReflection = (field: keyof WeekReflection, value: string) => {
    const reflection: WeekReflection = {
      ...(currentWeekNotes.reflection || { date: new Date().toISOString() }),
      [field]: value,
      date: new Date().toISOString(),
    };
    saveNotes({ ...currentWeekNotes, reflection });
  };

  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleAIPlan = useCallback(async (classId: string) => {
    const cls = data.classes.find(c => c.id === classId);
    if (!cls) return;
    setGeneratingId(classId);
    try {
      // Gather last week's notes for context
      const lastNotes = lastWeekNotes?.classNotes[classId]?.liveNotes || [];
      const prevPlans = lastWeekNotes?.classNotes[classId]?.plan
        ? [lastWeekNotes.classNotes[classId].plan!]
        : [];
      const plan = await generatePlan({
        classInfo: {
          id: cls.id,
          name: cls.name,
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
          level: cls.level,
          recitalSong: cls.recitalSong,
          isRecitalSong: cls.isRecitalSong,
        },
        notes: lastNotes,
        previousPlans: prevPlans,
      });
      updatePlan(classId, plan);
    } catch (e) {
      console.error('[WeekPlanner] AI plan generation failed', e);
    } finally {
      setGeneratingId(null);
    }
  }, [data.classes, lastWeekNotes]);

  const updatePlan = (classId: string, plan: string, eventTitle?: string) => {
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
        [classId]: {
          ...classNotes,
          plan,
          ...(eventTitle && { eventTitle }),
        },
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
      {data.classes.length === 0 && (!data.calendarEvents || data.calendarEvents.length === 0) ? (
        <EmptyState
          icon={CalendarOff}
          title="No classes set up yet"
          description="Add your schedule to start planning your week."
          actionLabel="Go to Schedule"
          onAction={() => navigate('/schedule')}
        />
      ) : (
      <div className="space-y-6">
        {DAYS.map(day => {
          const classes = classesByDay[day];
          const dayEvents = eventsByDay[day] || [];
          if (classes.length === 0 && dayEvents.length === 0) return null;

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
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="text-xs text-forest-600 dark:text-forest-400">
                            {classNotes?.liveNotes && classNotes.liveNotes.length > 0
                              ? `${classNotes.liveNotes.length} note${classNotes.liveNotes.length !== 1 ? 's' : ''} from class`
                              : ''}
                          </div>
                          <button
                            onClick={() => handleAIPlan(cls.id)}
                            disabled={generatingId === cls.id}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-forest-500 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/30 rounded-md transition-colors disabled:opacity-50"
                          >
                            {generatingId === cls.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            {generatingId === cls.id ? 'Generating...' : 'AI Plan'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Calendar Events */}
                {dayEvents.map(event => {
                  const eventNotes = currentWeekNotes.classNotes[event.id];
                  // Event IDs change weekly (include date), so match by normalized title
                  const titleNorm = normalizeTitle(event.title);
                  const lastWeekEventNotes = lastWeekNotes
                    ? Object.values(lastWeekNotes.classNotes).find(
                        n => n.eventTitle && normalizeTitle(n.eventTitle) === titleNorm
                      )
                    : undefined;

                  return (
                    <div
                      key={event.id}
                      className="bg-white dark:bg-blush-800 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden"
                    >
                      <div className="px-4 py-3 flex items-center gap-3 border-l-4 border-amber-400">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/event/${event.id}`}
                            className="font-medium text-forest-900 dark:text-white hover:text-forest-600 dark:hover:text-forest-400"
                          >
                            {event.title}
                          </Link>
                          <div className="text-sm text-blush-500 dark:text-blush-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {event.startTime && event.startTime !== '00:00'
                              ? formatTimeDisplay(event.startTime)
                              : 'All day'}
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-blush-50 dark:bg-blush-900/50">
                        {showLastWeek && lastWeekEventNotes?.plan && (
                          <div className="text-sm text-blush-500 dark:text-blush-400 mb-2">
                            <span className="font-medium">Last session:</span> {lastWeekEventNotes.plan}
                          </div>
                        )}
                        <textarea
                          value={eventNotes?.plan || ''}
                          onChange={(e) => updatePlan(event.id, e.target.value, event.title)}
                          placeholder="Plan / prep notes for this event..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-amber-200 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white dark:bg-blush-800 text-forest-700 dark:text-white placeholder-blush-400"
                        />
                        {eventNotes?.liveNotes && eventNotes.liveNotes.length > 0 && (
                          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            {eventNotes.liveNotes.length} note{eventNotes.liveNotes.length !== 1 ? 's' : ''} from event
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
      )}

      {/* Weekly Reflection — show for current & past weeks */}
      {weekOffset <= 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-forest-500" />
            <h3 className="font-semibold text-forest-900 dark:text-white">Week Reflection</h3>
          </div>
          <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-blush-500 dark:text-blush-400 mb-1 block">What went well?</label>
              <textarea
                value={currentWeekNotes.reflection?.wentWell || ''}
                onChange={e => updateReflection('wentWell', e.target.value)}
                placeholder="Wins, breakthroughs, good moments..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none bg-blush-50 dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-blush-500 dark:text-blush-400 mb-1 block">What was challenging?</label>
              <textarea
                value={currentWeekNotes.reflection?.challenges || ''}
                onChange={e => updateReflection('challenges', e.target.value)}
                placeholder="Hard moments, things that didn't go as planned..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none bg-blush-50 dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-blush-500 dark:text-blush-400 mb-1 block">Focus for next week</label>
              <textarea
                value={currentWeekNotes.reflection?.nextWeekFocus || ''}
                onChange={e => updateReflection('nextWeekFocus', e.target.value)}
                placeholder="What to carry forward, adjust, or try..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none bg-blush-50 dark:bg-blush-700 text-forest-700 dark:text-white placeholder-blush-400"
              />
            </div>
            {currentWeekNotes.reflection?.aiSummary && (
              <div className="pt-2 border-t border-blush-100 dark:border-blush-700">
                <p className="text-xs font-medium text-forest-500 dark:text-forest-400 mb-1">AI Summary</p>
                <p className="text-sm text-forest-700 dark:text-blush-200 leading-relaxed">{currentWeekNotes.reflection.aiSummary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
