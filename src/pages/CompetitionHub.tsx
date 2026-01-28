import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Trophy,
  Radio,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Music,
  ListOrdered,
  MapPin,
  Calendar,
  ArrowLeft,
  Search,
  Users,
  User,
  Clock,
  Scissors,
  Printer
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { getScheduleForCompetition, getEarliestCallTimeForDancer } from '../data/competitionSchedules';
import { Competition, DanceCategory, DanceLevel, DanceStyle, CompetitionDance } from '../types';
import { Button } from '../components/common/Button';
import { LiveTab } from '../components/LiveTab';

type TabType = 'competitions' | 'dances' | 'schedule' | 'live';

const categoryOrder: DanceCategory[] = ['production', 'large-group', 'small-group', 'trio', 'duet', 'solo'];

const categoryLabels: Record<DanceCategory, string> = {
  'production': 'Production',
  'large-group': 'Large Group',
  'small-group': 'Small Group',
  'trio': 'Trio',
  'duet': 'Duet',
  'solo': 'Solo',
};

const levelColors: Record<DanceLevel, string> = {
  'beginner': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'intermediate': 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'advanced': 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
};

const styleColors: Record<DanceStyle, string> = {
  'jazz': 'bg-purple-100 text-purple-700',
  'contemporary': 'bg-blue-100 text-blue-700',
  'lyrical': 'bg-pink-100 text-pink-700',
  'musical-theatre': 'bg-orange-100 text-orange-700',
  'tap': 'bg-gray-100 text-gray-700',
  'hip-hop': 'bg-red-100 text-red-700',
  'acro': 'bg-teal-100 text-teal-700',
  'open': 'bg-indigo-100 text-indigo-700',
  'monologue': 'bg-violet-100 text-violet-700',
};



export function CompetitionHub() {
  const { data } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab and selected competition from URL
  const activeTab = (searchParams.get('tab') as TabType) || 'competitions';
  const selectedCompId = searchParams.get('comp');

  const selectedCompetition = selectedCompId
    ? data.competitions.find(c => c.id === selectedCompId)
    : null;

  const setActiveTab = (tab: TabType) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    setSearchParams(params);
  };

  const selectCompetition = (compId: string, tab: TabType = 'schedule') => {
    const params = new URLSearchParams(searchParams);
    params.set('comp', compId);
    params.set('tab', tab);
    setSearchParams(params);
  };

  // Split competitions into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sorted = [...data.competitions].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    );

    return {
      upcoming: sorted.filter(c => parseISO(c.endDate || c.date) >= now),
      past: sorted.filter(c => parseISO(c.endDate || c.date) < now).reverse(),
    };
  }, [data.competitions]);

  // Get next competition for quick access
  const nextComp = upcoming[0];

  return (
    <div className="page-w px-4 py-6 pb-24 overflow-y-auto h-full dark:bg-blush-900">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blush-200 dark:hover:bg-blush-700 transition-colors"
        >
          <ArrowLeft size={20} className="text-forest-600 dark:text-white" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-forest-700 dark:text-white">Compete</h1>
          {selectedCompetition ? (
            <p className="text-sm text-blush-500">{selectedCompetition.name}</p>
          ) : (
            <p className="text-sm text-forest-400 dark:text-blush-400">
              {data.competitionDances.length} dance{data.competitionDances.length !== 1 ? 's' : ''} registered
            </p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-forest-100 dark:bg-blush-800 rounded-xl p-1" role="tablist">
        <button
          onClick={() => setActiveTab('competitions')}
          role="tab"
          aria-selected={activeTab === 'competitions'}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'competitions'
              ? 'bg-white dark:bg-blush-700 text-forest-700 dark:text-white shadow-sm'
              : 'text-forest-500 dark:text-blush-400 hover:text-forest-700'
          }`}
        >
          <Trophy size={16} className="inline mr-1.5 -mt-0.5" />
          Events
        </button>
        <button
          onClick={() => setActiveTab('dances')}
          role="tab"
          aria-selected={activeTab === 'dances'}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'dances'
              ? 'bg-white dark:bg-blush-700 text-forest-700 dark:text-white shadow-sm'
              : 'text-forest-500 dark:text-blush-400 hover:text-forest-700'
          }`}
        >
          <Music size={16} className="inline mr-1.5 -mt-0.5" />
          Dances
        </button>
        {selectedCompetition && (
          <>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-blush-700 text-forest-700 dark:text-white shadow-sm'
                  : 'text-forest-500 dark:text-blush-400 hover:text-forest-700'
              }`}
            >
              <ListOrdered size={16} className="inline mr-1.5 -mt-0.5" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-blush-700 text-forest-700 dark:text-white shadow-sm'
                  : 'text-forest-500 dark:text-blush-400 hover:text-forest-700'
              }`}
            >
              <Radio size={16} className="inline mr-1.5 -mt-0.5" />
              Live
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'competitions' && (
        <CompetitionsTab
          upcoming={upcoming}
          past={past}
          data={data}
          onSelectCompetition={selectCompetition}
        />
      )}
      {activeTab === 'dances' && (
        <DancesTab data={data} />
      )}
      {activeTab === 'schedule' && selectedCompetition && (
        <ScheduleTab
          competition={selectedCompetition}
          competitionDances={data.competitionDances}
        />
      )}
      {activeTab === 'live' && selectedCompetition && (
        <LiveTab
          competition={selectedCompetition}
          competitionDances={data.competitionDances}
        />
      )}
    </div>
  );
}

// ============ COMPETITIONS TAB ============
function CompetitionsTab({
  upcoming,
  past,
  data,
  onSelectCompetition
}: {
  upcoming: typeof data.competitions;
  past: typeof data.competitions;
  data: ReturnType<typeof useAppData>['data'];
  onSelectCompetition: (id: string, tab: TabType) => void;
}) {
  return (
    <div>
      {/* Upcoming Competitions */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-forest-500 dark:text-blush-400 uppercase tracking-wide mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map(comp => {
              const daysUntil = differenceInDays(parseISO(comp.date), new Date());
              const schedule = getScheduleForCompetition(comp.id);
              const dancesInComp = data.competitionDances.filter(d =>
                comp.dances?.includes(d.id)
              );

              return (
                <div
                  key={comp.id}
                  className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden"
                >
                  {/* Competition Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trophy className="text-rose-600 dark:text-rose-400" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-forest-700 dark:text-white">{comp.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-forest-400 dark:text-blush-400 mt-0.5">
                          <Calendar size={14} />
                          <span>
                            {format(parseISO(comp.date), 'MMM d')}
                            {comp.endDate && ` - ${format(parseISO(comp.endDate), 'MMM d')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-forest-400 dark:text-blush-400 mt-0.5">
                          <MapPin size={14} />
                          <span className="truncate">{comp.location}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                          {daysUntil <= 0 ? 'Now' : daysUntil}
                        </div>
                        {daysUntil > 0 && (
                          <div className="text-xs text-forest-400 dark:text-blush-500">days</div>
                        )}
                      </div>
                    </div>

                    {dancesInComp.length > 0 && (
                      <div className="mt-3 text-sm text-forest-500 dark:text-blush-400">
                        {dancesInComp.length} dance{dancesInComp.length !== 1 ? 's' : ''} entered
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="flex border-t border-blush-100 dark:border-blush-700">
                    {schedule.length > 0 && (
                      <button
                        onClick={() => onSelectCompetition(comp.id, 'schedule')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-forest-500 dark:text-blush-300 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors"
                      >
                        <ListOrdered size={16} />
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Competitions */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-forest-500 dark:text-blush-400 uppercase tracking-wide mb-3">
            Past
          </h2>
          <div className="space-y-2">
            {past.slice(0, 5).map(comp => (
              <div
                key={comp.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 opacity-60"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-blush-700 rounded-lg flex items-center justify-center">
                  <Trophy className="text-gray-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-forest-600 dark:text-blush-300 truncate">{comp.name}</div>
                  <div className="text-xs text-forest-400 dark:text-blush-500">
                    {format(parseISO(comp.date), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.competitions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-rose-400" size={32} />
          </div>
          <h2 className="font-medium text-forest-700 dark:text-white mb-1">No competitions yet</h2>
          <p className="text-sm text-forest-400 dark:text-blush-400">
            Competitions will appear here when added
          </p>
        </div>
      )}
    </div>
  );
}

// ============ DANCES TAB ============
function DancesTab({ data }: { data: ReturnType<typeof useAppData>['data'] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<DanceCategory | 'all'>('all');

  const dances = data.competitionDances || [];

  const filteredDances = dances.filter(dance => {
    const matchesSearch =
      dance.registrationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dance.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dance.dancers.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || dance.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedDances = categoryOrder.reduce((acc, category) => {
    const categoryDances = filteredDances.filter(d => d.category === category);
    if (categoryDances.length > 0) {
      acc[category] = categoryDances;
    }
    return acc;
  }, {} as Record<DanceCategory, typeof dances>);

  const getDancerCount = (dancers: string[]) => {
    const match = dancers[0]?.match(/\((\d+)\)/);
    if (match) return parseInt(match[1]);
    return dancers.length;
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dances, dancers..."
          aria-label="Search dances"
          className="w-full pl-10 pr-4 py-3 border border-forest-200 dark:border-blush-600 rounded-xl bg-white dark:bg-blush-800 dark:text-white focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filterCategory === 'all'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-forest-200'
          }`}
        >
          All ({dances.length})
        </button>
        {categoryOrder.map(category => {
          const count = dances.filter(d => d.category === category).length;
          if (count === 0) return null;
          return (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === category
                  ? 'bg-forest-600 text-white'
                  : 'bg-forest-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-forest-200'
              }`}
            >
              {categoryLabels[category]} ({count})
            </button>
          );
        })}
      </div>

      {/* Dance List */}
      {Object.entries(groupedDances).length === 0 ? (
        <div className="text-center py-12 text-forest-500 dark:text-blush-400">
          No dances found
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDances).map(([category, categoryDances]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-forest-600 dark:text-white mb-3 flex items-center gap-2">
                {categoryLabels[category as DanceCategory]}
                <span className="text-sm font-normal text-forest-400 dark:text-blush-400">
                  ({categoryDances.length})
                </span>
              </h2>

              <div className="space-y-3">
                {categoryDances.map(dance => (
                  <Link
                    key={dance.id}
                    to={`/dance/${dance.id}`}
                    className="block bg-white dark:bg-blush-800 rounded-xl border border-forest-200 dark:border-blush-700 p-4 hover:border-forest-400 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-forest-700 dark:text-white">{dance.registrationName}</h3>
                        <div className="flex items-center gap-1 text-sm text-forest-500/70 dark:text-blush-400">
                          <Music size={12} />
                          <span className="line-clamp-1">{dance.songTitle}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[dance.style]}`}>
                          {dance.style}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[dance.level]}`}>
                          {dance.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-forest-500 dark:text-blush-400">
                      <div className="flex items-center gap-1">
                        {dance.category === 'solo' ? <User size={14} /> : <Users size={14} />}
                        <span>
                          {dance.category === 'solo'
                            ? dance.dancers[0]
                            : `${getDancerCount(dance.dancers)} dancers`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{dance.duration}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SCHEDULE TAB ============
function ScheduleTab({
  competition,
  competitionDances
}: {
  competition: Competition;
  competitionDances: CompetitionDance[];
}) {
  const [viewMode, setViewMode] = useState<'schedule' | 'call-times'>('schedule');

  const schedule = useMemo(() => {
    return getScheduleForCompetition(competition.id);
  }, [competition.id]);

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
        const earliest = getEarliestCallTimeForDancer(competition.id, dancer, date);
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
  }, [schedule, scheduleDates, competition.id, competitionDances]);

  if (schedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto text-forest-300 dark:text-blush-600 mb-3" size={40} />
        <p className="text-forest-500 dark:text-blush-400">No schedule data available yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('schedule')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'schedule'
              ? 'bg-forest-600 text-white'
              : 'bg-forest-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-forest-200'
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
              : 'bg-forest-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-forest-200'
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Call Times
        </button>
        <button
          onClick={() => window.print()}
          className="py-2 px-4 rounded-lg font-medium text-sm bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 hover:bg-blush-200 transition-colors"
          title="Print Schedule"
        >
          <Printer size={16} />
        </button>
      </div>

      {viewMode === 'schedule' ? (
        <div className="space-y-6">
          {scheduleDates.map(date => {
            const dayEntries = scheduleByDate[date];
            const earliestCallTime = dayEntries[0]?.callTime;

            return (
              <div key={date}>
                <div className="sticky top-0 bg-blush-50 dark:bg-blush-900 py-2 z-10">
                  <h2 className="font-bold text-forest-700 dark:text-white text-lg">
                    {format(parseISO(date), 'EEEE, MMMM d')}
                  </h2>
                  <div className="text-sm text-forest-600 dark:text-blush-400">
                    {dayEntries.length} entries • Earliest call: {earliestCallTime}
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {dayEntries.map(entry => {
                    const dance = competitionDances.find(d => d.id === entry.danceId);

                    return (
                      <div
                        key={entry.id}
                        className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 p-4"
                      >
                        <Link to={`/dance/${entry.danceId}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono bg-gray-100 dark:bg-blush-700 text-gray-600 dark:text-blush-300 px-1.5 py-0.5 rounded">
                                  #{entry.entryNumber}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {dance?.registrationName || entry.danceId}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[entry.level as DanceLevel]}`}>
                                  {entry.level}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-blush-400 mt-1">
                                {categoryLabels[entry.category as DanceCategory]} • {entry.style}
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <div className="text-sm text-gray-500 dark:text-blush-400">Show: {entry.scheduledTime}</div>
                              <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg mt-1">
                                <div className="text-[10px] uppercase tracking-wide opacity-90">Call</div>
                                <div className="text-lg font-bold -mt-0.5">{entry.callTime}</div>
                              </div>
                            </div>
                          </div>
                        </Link>
                        {dance?.costume && <CostumeInfo dance={dance} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {scheduleDates.map(date => (
            <div key={date}>
              <div className="sticky top-0 bg-blush-50 dark:bg-blush-900 py-2 z-10">
                <h2 className="font-bold text-forest-700 dark:text-white text-lg">
                  {format(parseISO(date), 'EEEE, MMMM d')}
                </h2>
              </div>

              <div className="bg-white dark:bg-blush-800 rounded-xl border border-gray-200 dark:border-blush-700 overflow-hidden mt-3">
                <div className="divide-y divide-gray-100 dark:divide-blush-700">
                  {Object.values(dancerCallTimes)
                    .filter(dancer => dancer.dates[date])
                    .sort((a, b) => {
                      const timeA = a.dates[date]?.callTime || '';
                      const timeB = b.dates[date]?.callTime || '';
                      return timeA.localeCompare(timeB);
                    })
                    .map(dancer => (
                      <div key={dancer.name} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">{dancer.name}</div>
                          <div className="text-sm text-gray-500 dark:text-blush-400">
                            First: {dancer.dates[date].firstDance}
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
        </div>
      )}
    </div>
  );
}

// Costume info component
function CostumeInfo({ dance }: { dance: CompetitionDance }) {
  if (!dance.costume) return null;

  return (
    <div className="mt-3 pt-3 border-t border-blush-100 dark:border-blush-700">
      <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">
        <Scissors size={12} />
        Costume & Hair
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-blush-400 dark:text-blush-500">Hair:</span>{' '}
          <span className="text-blush-700 dark:text-blush-300">{dance.costume.hair}</span>
        </div>
        {dance.costume.tights && (
          <div>
            <span className="text-blush-400 dark:text-blush-500">Tights:</span>{' '}
            <span className="text-blush-700 dark:text-blush-300">{dance.costume.tights}</span>
          </div>
        )}
        {dance.costume.shoes && (
          <div>
            <span className="text-blush-400 dark:text-blush-500">Shoes:</span>{' '}
            <span className="text-blush-700 dark:text-blush-300">{dance.costume.shoes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

