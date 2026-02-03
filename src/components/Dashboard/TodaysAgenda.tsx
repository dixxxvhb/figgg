import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Car,
  AlertTriangle,
  Trophy,
  Zap,
  FileText,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning
} from 'lucide-react';
import type { Class, Studio, Competition, CompetitionDance, CalendarEvent, SelfCareData, WeekNotes } from '../../types';
import { formatTimeDisplay, timeToMinutes, formatWeekOf, getWeekStart } from '../../utils/time';
import { estimateTravelTime, formatTravelTime } from '../../services/location';

interface TodaysAgendaProps {
  classes: Class[];
  studios: Studio[];
  students: { id: string; classIds: string[] }[];
  weekNotes: WeekNotes[];
  competitions: Competition[];
  competitionDances: CompetitionDance[];
  calendarEvents: CalendarEvent[];
  selfCare: SelfCareData | undefined;
  currentClassId?: string;
}

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
};

function getEnergyFromDose(doseTime: number | null | undefined, doseDate: string | null | undefined, classStartMinutes: number): 'peak' | 'building' | 'fading' | 'low' | 'none' {
  if (!doseTime || !doseDate) return 'none';

  const today = format(new Date(), 'yyyy-MM-dd');
  if (doseDate !== today) return 'none';

  const doseDate_obj = new Date(doseTime);
  const doseMinutes = doseDate_obj.getHours() * 60 + doseDate_obj.getMinutes();
  const minutesSinceDose = classStartMinutes - doseMinutes;
  const hoursSinceDose = minutesSinceDose / 60;

  // IR medication timing
  if (hoursSinceDose < 0.5) return 'building';
  if (hoursSinceDose < 1) return 'building';
  if (hoursSinceDose < 3) return 'peak';
  if (hoursSinceDose < 4) return 'fading';
  return 'low';
}

function getEffectiveEnergy(
  selfCare: SelfCareData | undefined,
  classStartMinutes: number
): 'peak' | 'building' | 'fading' | 'low' | 'none' {
  if (!selfCare) return 'none';

  const today = format(new Date(), 'yyyy-MM-dd');

  // Check if user skipped meds today
  if (selfCare.skippedDoseDate === today) return 'none';

  // Get energy from both doses
  const dose1Energy = getEnergyFromDose(selfCare.dose1Time, selfCare.dose1Date, classStartMinutes);
  const dose2Energy = getEnergyFromDose(selfCare.dose2Time, selfCare.dose2Date, classStartMinutes);

  // Return best energy level from either dose
  const energyPriority: Record<string, number> = { peak: 4, building: 3, fading: 2, low: 1, none: 0 };
  return energyPriority[dose1Energy] >= energyPriority[dose2Energy] ? dose1Energy : dose2Energy;
}

const EnergyIcon = ({ energy }: { energy: 'peak' | 'building' | 'fading' | 'low' | 'none' }) => {
  switch (energy) {
    case 'peak':
      return <BatteryFull size={14} className="text-green-500" />;
    case 'building':
      return <BatteryMedium size={14} className="text-amber-500" />;
    case 'fading':
      return <BatteryLow size={14} className="text-orange-500" />;
    case 'low':
      return <BatteryWarning size={14} className="text-red-500" />;
    default:
      return <Battery size={14} className="text-blush-400" />;
  }
};

const EnergyBadge = ({ energy }: { energy: 'peak' | 'building' | 'fading' | 'low' | 'none' }) => {
  const config = {
    peak: { label: 'Peak', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    building: { label: 'Building', bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    fading: { label: 'Fading', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
    low: { label: 'Low', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    none: { label: '', bg: '' },
  };

  if (energy === 'none') return null;

  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config[energy].bg} flex items-center gap-1`}>
      <EnergyIcon energy={energy} />
      {config[energy].label}
    </span>
  );
};

export function TodaysAgenda({
  classes,
  studios,
  students,
  weekNotes,
  competitions,
  competitionDances,
  calendarEvents,
  selfCare,
  currentClassId,
}: TodaysAgendaProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekOf = formatWeekOf(getWeekStart());
  const currentWeekNotes = weekNotes.find(w => w.weekOf === weekOf);

  // Build agenda items with travel times inserted
  const agendaItems = useMemo(() => {
    const items: AgendaItem[] = [];

    // Add classes
    classes.forEach(c => {
      const studio = studios.find(s => s.id === c.studioId);
      const studentCount = students.filter(s => s.classIds.includes(c.id)).length;
      const classNotes = currentWeekNotes?.classNotes[c.id];
      const hasPlan = !!(classNotes?.plan && classNotes.plan.trim().length > 0);
      const classStartMinutes = timeToMinutes(c.startTime);
      const energy = getEffectiveEnergy(selfCare, classStartMinutes);

      items.push({
        type: 'class',
        id: c.id,
        name: c.name,
        startTime: c.startTime,
        endTime: c.endTime,
        studioId: c.studioId,
        studio,
        studentCount,
        hasPlan,
        energy,
      });
    });

    // Add calendar events
    calendarEvents
      .filter(e => e.date === today && e.startTime && e.startTime !== '00:00')
      .forEach(e => {
        const classStartMinutes = timeToMinutes(e.startTime);
        const energy = getEffectiveEnergy(selfCare, classStartMinutes);
        items.push({
          type: 'event',
          id: e.id,
          name: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          energy,
        });
      });

    // Sort by start time
    items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    // Insert travel times between items at different studios
    const itemsWithTravel: AgendaItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const prev = items[i - 1];

      // Check if we need travel time between this and previous item
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
              });
            }
          }
        }
      }

      itemsWithTravel.push(current);
    }

    return itemsWithTravel;
  }, [classes, studios, students, calendarEvents, currentWeekNotes, selfCare, today]);

  // Get upcoming competition within 7 days
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

  const daysUntilComp = upcomingComp
    ? differenceInDays(parseISO(upcomingComp.date), new Date())
    : null;

  // Get competition prep status
  const compPrepStatus = useMemo(() => {
    if (!upcomingComp) return null;

    const compDances = competitionDances.filter(d => upcomingComp.dances?.includes(d.id));
    const readyDances = compDances.filter(d => d.rehearsalNotes && d.rehearsalNotes.length > 0);
    const needsCostumes = compDances.filter(d => !d.costume?.hair && !d.costume?.shoes);

    return {
      total: compDances.length,
      ready: readyDances.length,
      needsCostumes: needsCostumes.length,
    };
  }, [upcomingComp, competitionDances]);

  if (agendaItems.length === 0 && !upcomingComp) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-blush-100 dark:border-blush-700 flex items-center justify-between">
        <h2 className="font-semibold text-blush-800 dark:text-white flex items-center gap-2">
          <Calendar size={16} className="text-forest-600" />
          Today's Agenda
        </h2>
        <Link to="/schedule" className="text-sm text-forest-600 dark:text-forest-500 hover:text-forest-700">
          Full Week →
        </Link>
      </div>

      <div className="divide-y divide-blush-100 dark:divide-blush-700">
        {agendaItems.map(item => {
          if (item.type === 'travel') {
            return (
              <div
                key={item.id}
                className="px-4 py-2 bg-blush-50 dark:bg-blush-700/30 flex items-center gap-2 text-sm text-blush-600 dark:text-blush-400"
              >
                <Car size={14} className="text-blush-500" />
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
                className="block px-4 py-3 hover:bg-blush-50 dark:hover:bg-blush-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-blush-800 dark:text-white flex items-center gap-2 flex-wrap">
                      <span className="truncate">{item.name}</span>
                      <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                        Event
                      </span>
                      {item.energy !== 'none' && <EnergyBadge energy={item.energy!} />}
                    </div>
                    <div className="text-sm text-blush-500 dark:text-blush-400 flex items-center gap-2 mt-0.5">
                      <Clock size={12} />
                      <span>{formatTimeDisplay(item.startTime)}</span>
                      {locationLine && (
                        <>
                          <span className="text-blush-300">•</span>
                          <span className="truncate">{locationLine}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-blush-400 flex-shrink-0" />
                </div>
              </Link>
            );
          }

          // Class item
          const isActive = item.id === currentClassId;
          return (
            <Link
              key={item.id}
              to={`/class/${item.id}`}
              className={`block px-4 py-3 hover:bg-blush-50 dark:hover:bg-blush-700/50 transition-colors ${
                isActive ? 'bg-forest-50 dark:bg-forest-900/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blush-800 dark:text-white flex items-center gap-2 flex-wrap">
                    <span className="truncate">{item.name}</span>
                    {isActive && <span className="w-2 h-2 bg-forest-500 rounded-full flex-shrink-0" />}
                    {item.energy !== 'none' && <EnergyBadge energy={item.energy!} />}
                  </div>
                  <div className="text-sm text-blush-500 dark:text-blush-400 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeDisplay(item.startTime)}
                    </span>
                    {item.studio && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {item.studio.shortName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {item.studentCount}
                    </span>
                    {item.hasPlan === false && (
                      <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400">
                        <AlertTriangle size={12} />
                        No plan
                      </span>
                    )}
                    {item.hasPlan === true && (
                      <span className="flex items-center gap-1 text-forest-600 dark:text-forest-400">
                        <FileText size={12} />
                        Ready
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-blush-400 flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}

        {/* Competition countdown if within 7 days */}
        {upcomingComp && daysUntilComp !== null && compPrepStatus && (
          <Link
            to="/choreography"
            className="block px-4 py-3 hover:bg-blush-50 dark:hover:bg-blush-700/50 transition-colors border-t-2 border-dashed border-blush-200 dark:border-blush-600"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                daysUntilComp <= 3 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Trophy size={20} className={daysUntilComp <= 3 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-blush-800 dark:text-white flex items-center gap-2">
                  <span className="truncate">{upcomingComp.name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    daysUntilComp <= 3
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {daysUntilComp === 0 ? 'TODAY' : `${daysUntilComp}d`}
                  </span>
                </div>
                <div className="text-sm text-blush-500 dark:text-blush-400 flex items-center gap-2 mt-0.5">
                  <span>{compPrepStatus.ready}/{compPrepStatus.total} dances ready</span>
                  {compPrepStatus.needsCostumes > 0 && (
                    <span className="text-orange-500">• {compPrepStatus.needsCostumes} need costumes</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-blush-400 flex-shrink-0" />
            </div>
          </Link>
        )}
      </div>

      {agendaItems.length === 0 && upcomingComp && (
        <div className="px-4 py-6 text-center text-blush-500 dark:text-blush-400">
          <Zap size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No classes today - rest up for competition!</p>
        </div>
      )}
    </div>
  );
}
