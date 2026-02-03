import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Calendar,
  Trophy,
  ChevronRight,
  Users,
  Play,
  Clock,
  MapPin,
  AlertCircle,
  Sparkles,
  FileText
} from 'lucide-react';
import { useCurrentClass } from '../hooks/useCurrentClass';
import { useAppData } from '../hooks/useAppData';
import { useTeachingStats } from '../hooks/useTeachingStats';
import { useSelfCareStatus } from '../hooks/useSelfCareStatus';
import { getCurrentDayOfWeek, formatTimeDisplay, formatWeekOf, getWeekStart, timeToMinutes } from '../utils/time';
import { getClassesByDay } from '../data/classes';
import { WeekStats } from '../components/Dashboard/WeekStats';
import { SelfCareWidget } from '../components/Dashboard/SelfCareWidget';
import { RemindersWidget } from '../components/Dashboard/RemindersWidget';
import { TodaysAgenda } from '../components/Dashboard/TodaysAgenda';
import { CalendarEvent } from '../types';

export function Dashboard() {
  const { data } = useAppData();
  const stats = useTeachingStats(data);
  const selfCareStatus = useSelfCareStatus(data.selfCare);

  // Track time updates efficiently - only re-render when minute changes
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Derive currentTime from currentMinute to avoid extra state
  const currentTime = useMemo(() => {
    const now = new Date();
    // Reset to start of current minute for consistency
    now.setSeconds(0, 0);
    return now;
  }, [currentMinute]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const newMinute = now.getHours() * 60 + now.getMinutes();
      setCurrentMinute(prev => prev !== newMinute ? newMinute : prev);
    };
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // These only need to recalculate on day change, not every minute
  const currentDay = useMemo(() => getCurrentDayOfWeek(), []);
  const todayClasses = useMemo(
    () => getClassesByDay(data.classes, currentDay),
    [data.classes, currentDay]
  );

  const classInfo = useCurrentClass(data.classes);

  // Today's date string - only changes at midnight
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayCalendarEvents = useMemo(
    () => (data.calendarEvents || [])
      .filter((e: CalendarEvent) => e.date === todayStr && e.startTime && e.startTime !== '00:00')
      .sort((a: CalendarEvent, b: CalendarEvent) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [data.calendarEvents, todayStr]
  );

  // Next upcoming calendar event (for hero card when no regular class is active)
  const nextCalendarEvent = useMemo(() => {
    return todayCalendarEvents.find((e: CalendarEvent) => timeToMinutes(e.startTime) > currentMinute) || null;
  }, [todayCalendarEvents, currentMinute]);

  const nextComp = useMemo(() => {
    const today = new Date();
    return data.competitions
      .filter(c => parseISO(c.date) >= today)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0];
  }, [data.competitions]);

  const daysUntilComp = nextComp
    ? differenceInDays(parseISO(nextComp.date), new Date())
    : null;

  const compPrepProgress = useMemo(() => {
    if (!nextComp) return { dances: 0, totalDances: 0 };

    const compDances = data.competitionDances?.filter(d => nextComp.dances?.includes(d.id)) || [];
    const dancesWithNotes = compDances.filter(d => d.rehearsalNotes && d.rehearsalNotes.length > 0).length;

    return {
      dances: dancesWithNotes,
      totalDances: compDances.length,
    };
  }, [nextComp, data.competitionDances]);

  const currentClassHasPlan = useMemo(() => {
    if (!classInfo.class) return false;
    const weekOf = formatWeekOf(getWeekStart());
    const weekNotes = data.weekNotes.find(w => w.weekOf === weekOf);
    if (!weekNotes) return false;
    const classNotes = weekNotes.classNotes[classInfo.class.id];
    return classNotes?.plan && classNotes.plan.trim().length > 0;
  }, [classInfo.class, data.weekNotes]);

  const currentStudio = classInfo.class
    ? data.studios.find(s => s.id === classInfo.class?.studioId)
    : null;

  const getLastWeekNotes = (classId: string) => {
    const sorted = [...(data.weekNotes || [])].sort((a, b) =>
      new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime()
    );
    for (const week of sorted) {
      const notes = week.classNotes[classId];
      if (notes && notes.liveNotes.length > 0) {
        return notes.liveNotes.slice(-3);
      }
    }
    return [];
  };

  const lastNotes = classInfo.class ? getLastWeekNotes(classInfo.class.id) : [];

  const enrolledStudents = classInfo.class
    ? (data.students || []).filter(s => s.classIds.includes(classInfo.class!.id))
    : [];

  const dayName = format(currentTime, 'EEEE');
  const dateStr = format(currentTime, 'MMMM d');
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeGradient = hour < 12 ? 'bg-time-morning' : hour < 17 ? 'bg-time-afternoon' : 'bg-time-evening';

  return (
    <div className="pb-24 bg-blush-50 dark:bg-blush-900">
      {/* Header */}
      <div className={`${timeGradient} dark:bg-blush-800 px-4 pt-6 pb-4`}>
        <div className="page-w">
          <p className="text-blush-600 dark:text-blush-400 text-sm">{greeting}</p>
          <h1 className="text-2xl font-bold text-blush-900 dark:text-white">{dayName}, {dateStr}</h1>
        </div>
      </div>

      {/* Competition Banner */}
      {nextComp && daysUntilComp !== null && daysUntilComp <= 14 && (
        <div className="page-w px-4 -mt-2">
          <Link
            to="/choreography"
            className={`block rounded-xl overflow-hidden ${
              daysUntilComp <= 3
                ? 'bg-red-500'
                : daysUntilComp <= 7
                ? 'bg-orange-500'
                : 'bg-forest-600'
            } text-white shadow-sm`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <div className="font-semibold">{nextComp.name}</div>
                    <div className="text-sm text-white/80">{format(parseISO(nextComp.date), 'EEEE, MMM d')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-3xl font-bold">{daysUntilComp}</span>
                    <span className="text-sm ml-1">days</span>
                  </div>
                  <ChevronRight size={18} className="opacity-60" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <FileText size={14} />
                  <span>Rehearsed: {compPrepProgress.dances}/{compPrepProgress.totalDances}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="page-w px-4 pt-4 space-y-4">
        {/* Self-Care Timeline Widget (Medication Tracking) */}
        <SelfCareWidget status={selfCareStatus} />

        {/* Reminders Widget */}
        <RemindersWidget reminders={data.selfCare?.reminders || []} />

        {/* Current/Next Class or Calendar Event */}
        {classInfo.class && (classInfo.status === 'during' || classInfo.status === 'before') ? (
          <div className={`bg-white dark:bg-blush-800 rounded-xl shadow-sm overflow-hidden ${
            classInfo.status === 'during' ? 'live-class-card' : 'border border-blush-200 dark:border-blush-700'
          }`}>
            <div className="bg-forest-600 dark:bg-forest-700 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {classInfo.status === 'during' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full live-dot" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-xs text-forest-200 uppercase">Up Next</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold">{classInfo.class.name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {classInfo.status === 'during' ? classInfo.timeRemaining : classInfo.timeUntilStart}
                  </div>
                  <div className="text-xs text-forest-200">
                    {classInfo.status === 'during' ? 'min left' : 'min until'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-blush-600 dark:text-blush-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} className="text-forest-600" />
                  {formatTimeDisplay(classInfo.class.startTime)} - {formatTimeDisplay(classInfo.class.endTime)}
                </div>
                {currentStudio && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-forest-600" />
                    {currentStudio.shortName}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-forest-600" />
                  {enrolledStudents.length} dancers
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                currentClassHasPlan
                  ? 'bg-forest-50 dark:bg-blush-700 text-forest-700 dark:text-forest-400'
                  : 'bg-orange-50 dark:bg-blush-700 text-orange-700 dark:text-orange-400'
              }`}>
                <FileText size={16} />
                {currentClassHasPlan ? (
                  <span>Plan ready</span>
                ) : (
                  <Link to="/plan" className="hover:underline">
                    No plan — tap to add
                  </Link>
                )}
              </div>

              {lastNotes.length > 0 && (
                <div className="bg-blush-100 dark:bg-blush-700/50 rounded-lg p-3">
                  <div className="text-xs font-medium text-blush-500 dark:text-blush-400 mb-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    From Last Week
                  </div>
                  <ul className="text-sm text-blush-700 dark:text-blush-300 space-y-1">
                    {lastNotes.map(note => (
                      <li key={note.id} className="flex items-start gap-1.5">
                        <span className="text-blush-400">•</span>
                        <span className="line-clamp-1">{note.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                to={`/class/${classInfo.class.id}/notes`}
                className="flex items-center justify-center gap-2 w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                <Play size={20} />
                {classInfo.status === 'during' ? 'Continue Class' : 'Start Class'}
              </Link>
            </div>
          </div>
        ) : nextCalendarEvent ? (
          // Calendar event is the next thing — show it as a hero card
          (() => {
            const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const minutesUntil = timeToMinutes(nextCalendarEvent.startTime) - nowMinutes;
            const hoursUntil = Math.floor(minutesUntil / 60);
            const minsUntil = minutesUntil % 60;
            const countdownStr = hoursUntil > 0 ? `${hoursUntil}h ${minsUntil}m` : `${minsUntil}m`;
            const locationLine = nextCalendarEvent.location?.split('\n').filter(Boolean)[0];

            return (
              <div className="bg-white dark:bg-blush-800 rounded-xl shadow-sm overflow-hidden border border-blush-200 dark:border-blush-700">
                <div className="bg-amber-500 dark:bg-amber-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-amber-100 uppercase flex items-center gap-1">
                          <Calendar size={12} /> Up Next
                        </span>
                      </div>
                      <h2 className="text-xl font-bold">{nextCalendarEvent.title}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{countdownStr}</div>
                      <div className="text-xs text-amber-100">until start</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-blush-600 dark:text-blush-400">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-amber-500" />
                      {formatTimeDisplay(nextCalendarEvent.startTime)}
                      {nextCalendarEvent.endTime && nextCalendarEvent.endTime !== '00:00' && (
                        <> - {formatTimeDisplay(nextCalendarEvent.endTime)}</>
                      )}
                    </div>
                    {locationLine && (
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-amber-500" />
                        {locationLine}
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/event/${nextCalendarEvent.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-semibold transition-colors mt-2"
                  >
                    <Play size={20} />
                    Start Notes
                  </Link>
                </div>
              </div>
            );
          })()
        ) : (
          // Truly no class or event coming up
          <div className="bg-white dark:bg-blush-800 rounded-xl p-6 text-center border border-blush-200 dark:border-blush-700">
            <Sparkles size={36} className="mx-auto text-forest-500 mb-3" />
            <h2 className="text-lg font-bold text-blush-800 dark:text-white mb-1">No Class Right Now</h2>
            <p className="text-blush-500 dark:text-blush-400 text-sm mb-4">
              {todayClasses.length > 0 || todayCalendarEvents.length > 0
                ? "All done for today!"
                : "You're off today!"
              }
            </p>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-1 text-forest-600 dark:text-forest-500 font-medium hover:text-forest-700"
            >
              View Full Schedule
              <ChevronRight size={16} />
            </Link>
          </div>
        )}

        {/* Week Stats */}
        <WeekStats stats={stats} />

        {/* Today's Agenda - Full day view with energy overlay and travel times */}
        <TodaysAgenda
          classes={todayClasses}
          studios={data.studios}
          students={data.students || []}
          weekNotes={data.weekNotes}
          competitions={data.competitions}
          competitionDances={data.competitionDances || []}
          calendarEvents={todayCalendarEvents}
          selfCare={data.selfCare}
          currentClassId={classInfo.class?.id}
        />
      </div>
    </div>
  );
}
