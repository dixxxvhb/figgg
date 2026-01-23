import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Users, User, Scissors, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppData } from '../hooks/useAppData';
import { getScheduleForCompetition, getEarliestCallTimeForDancer } from '../data/competitionSchedules';
import { DanceCategory, CompetitionDance } from '../types';

const categoryLabels: Record<DanceCategory, string> = {
  'production': 'Production',
  'large-group': 'Large Group',
  'small-group': 'Small Group',
  'trio': 'Trio',
  'duet': 'Duet',
  'solo': 'Solo',
};

const levelColors: Record<string, string> = {
  'beginner': 'bg-emerald-100 text-emerald-700',
  'intermediate': 'bg-amber-100 text-amber-700',
  'advanced': 'bg-rose-100 text-rose-700',
};

// Compact costume display component
function CostumeInfo({ dance }: { dance: CompetitionDance }) {
  if (!dance.costume) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium mb-2">
        <Scissors size={12} />
        Costume & Hair
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-gray-400">Hair:</span>{' '}
          <span className="text-gray-700">{dance.costume.hair}</span>
        </div>
        {dance.costume.hairAccessories && (
          <div>
            <span className="text-gray-400">Accessories:</span>{' '}
            <span className="text-gray-700">{dance.costume.hairAccessories}</span>
          </div>
        )}
        {dance.costume.tights && (
          <div>
            <span className="text-gray-400">Tights:</span>{' '}
            <span className="text-gray-700">{dance.costume.tights}</span>
          </div>
        )}
        {dance.costume.shoes && (
          <div>
            <span className="text-gray-400">Shoes:</span>{' '}
            <span className="text-gray-700">{dance.costume.shoes}</span>
          </div>
        )}
      </div>
      {dance.costume.notes && (
        <div className="mt-2 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
          {dance.costume.notes}
        </div>
      )}
    </div>
  );
}

export function CompetitionSchedule() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { data } = useAppData();
  const [viewMode, setViewMode] = useState<'schedule' | 'call-times'>('schedule');

  const competition = data.competitions.find(c => c.id === competitionId);
  const competitionDances = data.competitionDances || [];

  // Get schedule data
  const schedule = useMemo(() => {
    if (!competitionId) return [];
    return getScheduleForCompetition(competitionId);
  }, [competitionId]);

  // Group by date
  const scheduleByDate = useMemo(() => {
    const grouped: Record<string, typeof schedule> = {};
    schedule.forEach(entry => {
      if (!grouped[entry.performanceDate]) {
        grouped[entry.performanceDate] = [];
      }
      grouped[entry.performanceDate].push(entry);
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.entryNumber - b.entryNumber);
    });
    return grouped;
  }, [schedule]);

  const scheduleDates = Object.keys(scheduleByDate).sort();

  // Get unique dancers and their call times per day
  const dancerCallTimes = useMemo(() => {
    const dancers = new Set<string>();
    schedule.forEach(entry => {
      entry.dancers.forEach(d => {
        if (!d.includes('All')) dancers.add(d);
      });
    });

    const result: Record<string, { name: string; dates: Record<string, { callTime: string; firstDance: string }> }> = {};

    Array.from(dancers).sort().forEach(dancer => {
      result[dancer] = { name: dancer, dates: {} };
      scheduleDates.forEach(date => {
        const earliest = getEarliestCallTimeForDancer(competitionId || '', dancer, date);
        if (earliest) {
          const dance = competitionDances.find(d => d.id === earliest.danceId);
          result[dancer].dates[date] = {
            callTime: earliest.callTime,
            firstDance: dance?.registrationName || earliest.danceId,
          };
        }
      });
    });

    return result;
  }, [schedule, scheduleDates, competitionId, competitionDances]);

  if (!competition) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-forest-600">Competition not found</p>
        <Link to="/dances" className="text-forest-500 hover:text-forest-600">Back to dances</Link>
      </div>
    );
  }

  if (schedule.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dances" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-forest-700">{competition.name}</h1>
        </div>
        <p className="text-forest-500">No schedule data available for this competition yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/dances" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-forest-700">{competition.name}</h1>
          <div className="text-sm text-gray-500">
            {format(new Date(competition.date), 'MMM d')} - {format(new Date(competition.endDate || competition.date), 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('schedule')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'schedule'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Full Schedule
        </button>
        <button
          onClick={() => setViewMode('call-times')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'call-times'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 text-forest-600 hover:bg-forest-200'
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Dancer Call Times
        </button>
      </div>

      {viewMode === 'schedule' ? (
        /* Full Schedule View */
        <div className="space-y-6">
          {scheduleDates.map(date => {
            const dayEntries = scheduleByDate[date];
            const earliestCallTime = dayEntries[0]?.callTime;

            return (
              <div key={date}>
                <div className="sticky top-0 bg-gray-50 py-2 z-10">
                  <h2 className="font-bold text-forest-700 text-lg">
                    {format(parseISO(date), 'EEEE, MMMM d')}
                  </h2>
                  <div className="text-sm text-forest-600">
                    {dayEntries.length} entries • Earliest call: {earliestCallTime}
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {dayEntries.map(entry => {
                    const dance = competitionDances.find(d => d.id === entry.danceId);

                    return (
                      <div
                        key={entry.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-forest-400 hover:shadow-sm transition-all"
                      >
                        <Link to={`/dance/${entry.danceId}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  #{entry.entryNumber}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {dance?.registrationName || entry.danceId}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[entry.level]}`}>
                                  {entry.level}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {categoryLabels[entry.category]} • {entry.style} • Ages {entry.ageGroup}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                {entry.category === 'solo' ? <User size={12} /> : <Users size={12} />}
                                <span className="truncate">
                                  {entry.dancers.length <= 3
                                    ? entry.dancers.join(', ')
                                    : `${entry.dancers.length} dancers`}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-3 flex flex-col items-end gap-1">
                              <div className="text-sm text-gray-500">Show: {entry.scheduledTime}</div>
                              <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide opacity-90">Call Time</div>
                                <div className="text-lg font-bold -mt-0.5">{entry.callTime}</div>
                              </div>
                            </div>
                          </div>
                        </Link>
                        {/* Costume Info displayed directly */}
                        {dance && <CostumeInfo dance={dance} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dancer Call Times View */
        <div className="space-y-6">
          {scheduleDates.map(date => (
            <div key={date}>
              <div className="sticky top-0 bg-gray-50 py-2 z-10">
                <h2 className="font-bold text-forest-700 text-lg">
                  {format(parseISO(date), 'EEEE, MMMM d')}
                </h2>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-3">
                <div className="divide-y divide-gray-100">
                  {Object.values(dancerCallTimes)
                    .filter(dancer => dancer.dates[date])
                    .sort((a, b) => {
                      // Sort by call time
                      const timeA = a.dates[date]?.callTime || '';
                      const timeB = b.dates[date]?.callTime || '';
                      return timeA.localeCompare(timeB);
                    })
                    .map(dancer => (
                      <div key={dancer.name} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{dancer.name}</div>
                          <div className="text-sm text-gray-500">
                            First dance: {dancer.dates[date].firstDance}
                          </div>
                        </div>
                        <div className="bg-amber-500 text-white px-4 py-2 rounded-lg text-center">
                          <div className="text-[10px] uppercase tracking-wide opacity-90">Call</div>
                          <div className="text-xl font-bold -mt-0.5">{dancer.dates[date].callTime}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}

          {/* All Dancers Production Call */}
          {schedule.some(e => e.category === 'production') && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="font-medium text-amber-800">Production Call Time</div>
              <div className="text-sm text-amber-700 mt-1">
                All dancers must be present for the production number. Check the schedule for the production call time.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            to={`/competition/${competitionId}/checklist`}
            className="block w-full bg-forest-600 text-white text-center py-3 rounded-xl font-medium shadow-lg hover:bg-forest-700 transition-colors"
          >
            View Packing Checklist
          </Link>
        </div>
      </div>
    </div>
  );
}
