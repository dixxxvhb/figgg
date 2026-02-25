import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import {
  ChevronRight,
  Car,
  Trophy,
  Sun,
  MapPin,
  Users,
  AlertTriangle,
  FileText,
  Calendar,
} from 'lucide-react';
import type { Class, Studio, Competition, CompetitionDance, CalendarEvent, SelfCareData, WeekNotes, DayOfWeek, MedConfig } from '../../types';
import { getClassesByDay } from '../../data/classes';
import { formatTimeDisplay, timeToMinutes, formatWeekOf, getWeekStart } from '../../utils/time';
import { estimateTravelTime, formatTravelTime } from '../../services/location';
import { useSelfCareStatus } from '../../hooks/useSelfCareStatus';

interface TodaysAgendaProps {
  classes: Class[];
  studios: Studio[];
  students: { id: string; classIds: string[] }[];
  weekNotes: WeekNotes[];
  competitions: Competition[];
  competitionDances: CompetitionDance[];
  calendarEvents: CalendarEvent[];
  selfCare: SelfCareData | undefined;
  medConfig?: MedConfig;
  currentClassId?: string;
  allClasses?: Class[];
  allCalendarEvents?: CalendarEvent[];
  currentMinute: number;
}

type ItemStatus = 'past' | 'current' | 'next' | 'upcoming';

type AgendaItem = {
  type: 'class' | 'event' | 'travel';
  id: string;
  name: string;
  startTime: string;
  endTime?: string;
  studioId?: string;
  studio?: Studio;
  studentCount?: number;
  hasPlan?: boolean;
  energy?: 'peak' | 'building' | 'fading' | 'low' | 'none';
  travelMinutes?: number;
  fromStudio?: string;
  toStudio?: string;
  location?: string;
  status?: ItemStatus;
  exception?: { type: 'cancelled' | 'subbed'; subName?: string };
};

function statusToEnergy(status: string | null): 'peak' | 'building' | 'fading' | 'low' | 'none' {
  if (!status) return 'none';
  switch (status) {
    case 'Peak Window': return 'peak';
    case 'Building': return 'building';
    case 'Wearing Off':
    case 'Tapering': return 'fading';
    case 'Expired': return 'low';
    default: return 'none';
  }
}

export function TodaysAgenda({
  classes,
  studios,
  students,
  weekNotes,
  competitions,
  competitionDances,
  calendarEvents,
  selfCare,
  medConfig,
  currentClassId,
  allClasses,
  allCalendarEvents,
  currentMinute,
}: TodaysAgendaProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekOf = formatWeekOf(getWeekStart());
  const currentWeekNotes = weekNotes.find(w => w.weekOf === weekOf);
  const medStatus = useSelfCareStatus(selfCare, medConfig);
  const skippedToday = selfCare?.skippedDoseDate === today;

  const agendaItems = useMemo(() => {
    const items: AgendaItem[] = [];

    classes.forEach(c => {
      const studio = studios.find(s => s.id === c.studioId);
      const studentCount = students.filter(s => s.classIds?.includes(c.id)).length;
      const classNotes = currentWeekNotes?.classNotes[c.id];
      const hasPlan = !!(classNotes?.plan && classNotes.plan.trim().length > 0);
      const classStartMinutes = timeToMinutes(c.startTime);
      const minutesFromNow = classStartMinutes - currentMinute;
      const energy = skippedToday ? 'none' as const : statusToEnergy(medStatus.projectedStatus(minutesFromNow));

      items.push({
        type: 'class', id: c.id, name: c.name,
        startTime: c.startTime, endTime: c.endTime,
        studioId: c.studioId, studio, studentCount, hasPlan, energy,
        exception: classNotes?.exception,
      });
    });

    calendarEvents
      .filter(e => e.date === today && e.startTime && e.startTime !== '00:00')
      .forEach(e => {
        if (e.cancelled) return; // Skip cancelled events from agenda
        const eventStartMinutes = timeToMinutes(e.startTime);
        const minutesFromNow = eventStartMinutes - currentMinute;
        const energy = skippedToday ? 'none' as const : statusToEnergy(medStatus.projectedStatus(minutesFromNow));
        items.push({
          type: 'event', id: e.id, name: e.title,
          startTime: e.startTime, endTime: e.endTime,
          location: e.location, energy,
        });
      });

    items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Assign status: past, current, next, upcoming
    let foundNext = false;
    items.forEach(item => {
      if (item.type === 'travel') return;
      const start = timeToMinutes(item.startTime);
      const end = item.endTime && item.endTime !== '00:00'
        ? timeToMinutes(item.endTime)
        : start + 60;

      if (start <= currentMinute && currentMinute < end) {
        item.status = 'current';
      } else if (end <= currentMinute) {
        item.status = 'past';
      } else if (!foundNext) {
        item.status = 'next';
        foundNext = true;
      } else {
        item.status = 'upcoming';
      }
    });

    const itemsWithTravel: AgendaItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const prev = items[i - 1];

      if (prev && current.type === 'class' && prev.type === 'class') {
        if (prev.studioId && current.studioId && prev.studioId !== current.studioId) {
          const prevStudio = studios.find(s => s.id === prev.studioId);
          const currStudio = studios.find(s => s.id === current.studioId);
          if (prevStudio && currStudio) {
            const travelMins = estimateTravelTime(prevStudio, currStudio);
            if (travelMins) {
              itemsWithTravel.push({
                type: 'travel',
                id: `travel-${prev.id}-${current.id}`,
                name: `Drive to ${currStudio.shortName}`,
                startTime: prev.endTime || prev.startTime,
                travelMinutes: travelMins,
                fromStudio: prevStudio.shortName,
                toStudio: currStudio.shortName,
                status: prev.status === 'past' ? 'past' : undefined,
              });
            }
          }
        }
      }

      itemsWithTravel.push(current);
    }

    return itemsWithTravel;
  }, [classes, studios, students, calendarEvents, currentWeekNotes, medStatus, skippedToday, today, currentMinute]);

  const upcomingComp = useMemo(() => {
    const now = new Date();
    return competitions
      .filter(c => {
        const compDate = parseISO(c.date);
        const daysUntil = differenceInDays(compDate, now);
        return daysUntil >= 0 && daysUntil <= 7;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0];
  }, [competitions]);

  const daysUntilComp = upcomingComp ? differenceInDays(parseISO(upcomingComp.date), new Date()) : null;

  const compPrepStatus = useMemo(() => {
    if (!upcomingComp) return null;
    const compDances = competitionDances.filter(d => upcomingComp.dances?.includes(d.id));
    const readyDances = compDances.filter(d => d.rehearsalNotes && d.rehearsalNotes.length > 0);
    const needsCostumes = compDances.filter(d => !d.costume?.hair && !d.costume?.shoes);
    return { total: compDances.length, ready: readyDances.length, needsCostumes: needsCostumes.length };
  }, [upcomingComp, competitionDances]);

  const nextClassId = useMemo(() => {
    if (currentClassId) return currentClassId;
    const upcoming = agendaItems.find(
      item => item.type === 'class' && (item.status === 'current' || item.status === 'next')
    );
    return upcoming?.id || agendaItems.find(item => item.type === 'class')?.id;
  }, [agendaItems, currentClassId]);

  const tomorrowPreview = useMemo(() => {
    const realAgendaItems = agendaItems.filter(i => i.type !== 'travel');
    const hasActiveItems = realAgendaItems.some(i => i.status !== 'past');
    // Show tomorrow if no items today OR all items are past
    if (hasActiveItems) return null;

    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const tomorrowDay = days[tomorrow.getDay()];

    const tomorrowClasses = allClasses ? getClassesByDay(allClasses, tomorrowDay) : [];
    const tomorrowEvents = (allCalendarEvents || [])
      .filter(e => e.date === tomorrowStr && e.startTime && e.startTime !== '00:00');

    type TomorrowItem = { name: string; time: string; studio?: Studio; location?: string; type: 'class' | 'event'; id: string };
    const items: TomorrowItem[] = [];

    tomorrowClasses.forEach(c => {
      items.push({ name: c.name, time: c.startTime, studio: studios.find(s => s.id === c.studioId), type: 'class', id: c.id });
    });

    tomorrowEvents.forEach(e => {
      items.push({ name: e.title, time: e.startTime, location: e.location?.split('\n').filter(Boolean)[0], type: 'event', id: e.id });
    });

    items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    if (items.length === 0) return null;

    return { first: items[0], totalCount: items.length, dayLabel: format(tomorrow, 'EEEE') };
  }, [agendaItems, allClasses, allCalendarEvents, studios]);

  const realItems = agendaItems.filter(i => i.type !== 'travel');
  const hasRealItems = realItems.length > 0;
  const allPast = hasRealItems && realItems.every(i => i.status === 'past');
  // Show today's items only if some are still current/next/upcoming; otherwise show tomorrow
  const showTodayItems = hasRealItems && !allPast;
  const displayItems = showTodayItems ? agendaItems : [];

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Section header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <h2 className="type-h1 text-[var(--text-primary)]">
          {showTodayItems ? 'Today' : tomorrowPreview ? 'Looking Ahead' : allPast ? 'Done for Today' : 'Today'}
        </h2>
        <Link to="/schedule" className="type-label text-[var(--accent-primary)]">
          Full Week
        </Link>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {displayItems.map(item => {
          const isPast = item.status === 'past';
          const isCurrent = item.status === 'current';
          const isNext = item.status === 'next';

          if (item.type === 'travel') {
            return (
              <div key={item.id} className={`px-4 py-2 bg-[var(--surface-inset)] flex items-center gap-2 text-sm text-[var(--text-secondary)] ${isPast ? 'opacity-40' : ''}`}>
                <Car size={14} className="text-[var(--text-tertiary)]" />
                <span className="font-medium">{formatTravelTime(item.travelMinutes!)}</span>
                <span>drive to {item.toStudio}</span>
              </div>
            );
          }

          if (item.type === 'event') {
            const locationLine = item.location?.split('\n').filter(Boolean)[0];
            return (
              <Link
                key={item.id}
                to={`/event/${item.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                  isPast ? 'opacity-40' :
                  isCurrent ? 'bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-amber-500' :
                  isNext ? 'bg-amber-50/30 dark:bg-amber-900/5' :
                  'hover:bg-[var(--surface-card-hover)]'
                }`}
              >
                {/* Big time on left */}
                <div className="flex-shrink-0 w-14 text-right">
                  <div className={`text-lg font-display leading-none tabular-nums ${
                    isPast ? 'text-[var(--text-tertiary)]' :
                    isCurrent ? 'text-amber-600 dark:text-amber-400' :
                    'text-[--color-honey] dark:text-[--color-honey-light]'
                  }`}>
                    {formatTimeDisplay(item.startTime)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <span className="truncate">{item.name}</span>
                    {isCurrent && (
                      <span className="type-label text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Now
                      </span>
                    )}
                    {isNext && (
                      <span className="type-label text-[var(--accent-primary)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Next
                      </span>
                    )}
                    {!isCurrent && !isNext && (
                      <span className="type-label text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Event
                      </span>
                    )}
                  </div>
                  {locationLine && !isPast && (
                    <div className="text-sm text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1 truncate">
                      <MapPin size={11} className="flex-shrink-0" />
                      <span className="truncate">{locationLine}</span>
                    </div>
                  )}
                </div>

                {!isPast && <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />}
              </Link>
            );
          }

          // Class item
          const isActive = item.id === currentClassId;
          const hasException = !!item.exception;
          const classItemContent = (
            <>
              {/* Big time on left */}
              <div className="flex-shrink-0 w-14 text-right">
                <div className={`text-lg font-display leading-none tabular-nums ${
                  hasException || isPast ? 'text-[var(--text-tertiary)]' :
                  isCurrent || isActive ? 'text-[var(--accent-primary)]' :
                  'text-[--color-honey] dark:text-[--color-honey-light]'
                }`}>
                  {formatTimeDisplay(item.startTime)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <span className="truncate">{item.name}</span>
                  {!hasException && isCurrent && (
                    <span className="type-label text-[var(--text-on-accent)] bg-[var(--accent-primary)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Now
                    </span>
                  )}
                  {!hasException && isNext && (
                    <span className="type-label text-[var(--accent-primary)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Next
                    </span>
                  )}
                  {!hasException && isActive && !isCurrent && <span className="w-2 h-2 bg-[var(--accent-primary)] rounded-full flex-shrink-0" />}
                  {hasException && item.exception?.type === 'cancelled' && (
                    <span className="type-label text-[var(--text-tertiary)] bg-[var(--surface-inset)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Cancelled
                    </span>
                  )}
                  {hasException && item.exception?.type === 'subbed' && (
                    <span className="type-label text-[var(--status-success)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Sub{item.exception.subName ? `: ${item.exception.subName}` : ''}
                    </span>
                  )}
                </div>
                {!isPast && !hasException && (
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-[var(--text-tertiary)]">
                    {item.studio && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="flex-shrink-0" />
                        {item.studio.shortName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={11} className="flex-shrink-0" />
                      {item.studentCount}
                    </span>
                    {item.hasPlan === false && (isCurrent || isNext || isActive || item.id === nextClassId) && (
                      <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400">
                        <AlertTriangle size={11} />
                        No plan
                      </span>
                    )}
                    {item.hasPlan === true && (isCurrent || isNext || isActive || item.id === nextClassId) && (
                      <span className="flex items-center gap-1 text-[--color-sage] dark:text-[--color-sage-light]">
                        <FileText size={11} />
                        Ready
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isPast && !hasException && <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />}
            </>
          );

          if (hasException) {
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-4 py-3.5 opacity-50"
              >
                {classItemContent}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={`/class/${item.id}`}
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                isPast ? 'opacity-40' :
                isCurrent || isActive ? 'bg-[var(--accent-muted)] border-l-4 border-[var(--accent-primary)]' :
                isNext ? 'bg-[var(--accent-muted)]/50' :
                'hover:bg-[var(--surface-card-hover)]'
              }`}
            >
              {classItemContent}
            </Link>
          );
        })}

        {/* Competition countdown if within 7 days */}
        {upcomingComp && daysUntilComp !== null && compPrepStatus && (
          <Link
            to="/choreography"
            className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--surface-card-hover)] transition-colors"
          >
            <div className="flex-shrink-0 w-14 text-right">
              <div className={`text-lg font-display leading-none tabular-nums ${
                daysUntilComp <= 3 ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'
              }`}>
                {daysUntilComp === 0 ? 'NOW' : `${daysUntilComp}d`}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Trophy size={14} className={daysUntilComp <= 3 ? 'text-[var(--status-danger)]' : 'text-[var(--status-warning)]'} />
                <span className="truncate">{upcomingComp.name}</span>
              </div>
              <div className="text-sm text-[var(--text-tertiary)] mt-0.5">
                {compPrepStatus.ready}/{compPrepStatus.total} dances ready
                {compPrepStatus.needsCostumes > 0 && (
                  <span className="text-orange-500"> · {compPrepStatus.needsCostumes} need costumes</span>
                )}
              </div>
            </div>

            <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
          </Link>
        )}
      </div>

      {/* Empty state when no items today */}
      {!showTodayItems && !upcomingComp && !tomorrowPreview && (
        <div className="px-4 py-6 text-center text-[var(--text-tertiary)]">
          <Calendar size={20} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">{allPast ? 'All done for today' : 'No classes today'}</p>
        </div>
      )}

      {!showTodayItems && upcomingComp && !tomorrowPreview && (
        <div className="px-4 py-6 text-center text-[var(--text-tertiary)]">
          <p className="text-sm">{allPast ? 'All done — rest up for competition' : 'No classes today — rest up for competition'}</p>
        </div>
      )}

      {/* First Thing Tomorrow — shown when today is empty OR all past */}
      {tomorrowPreview && !showTodayItems && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sun size={14} className="text-amber-500" />
            <h3 className="type-label text-[var(--text-secondary)]">
              First Thing {tomorrowPreview.dayLabel}
            </h3>
          </div>
          <Link
            to={tomorrowPreview.first.type === 'class' ? `/class/${tomorrowPreview.first.id}` : `/event/${tomorrowPreview.first.id}`}
            className="flex items-center gap-4 py-2 hover:bg-[var(--surface-card-hover)] -mx-1 px-1 rounded-xl transition-colors"
          >
            <div className="flex-shrink-0 w-14 text-right">
              <div className="text-lg font-display text-[--color-honey] dark:text-[--color-honey-light] leading-none">
                {formatTimeDisplay(tomorrowPreview.first.time)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                <span className="truncate">{tomorrowPreview.first.name}</span>
                {tomorrowPreview.first.type === 'event' && (
                  <span className="type-label text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Event
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--text-tertiary)] mt-0.5 flex items-center gap-2">
                {tomorrowPreview.first.studio && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {tomorrowPreview.first.studio.shortName}
                  </span>
                )}
                {tomorrowPreview.first.location && (
                  <span className="truncate">{tomorrowPreview.first.location}</span>
                )}
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
          </Link>
          {tomorrowPreview.totalCount > 1 && (
            <p className="type-caption text-[var(--text-tertiary)] mt-1 pl-[4.5rem]">
              + {tomorrowPreview.totalCount - 1} more {tomorrowPreview.dayLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
