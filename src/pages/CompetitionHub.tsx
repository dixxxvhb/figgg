import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { 
  Trophy, 
  ChevronRight, 
  Music,
  ClipboardList,
  ListOrdered,
  MapPin,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { getScheduleForCompetition } from '../data/competitionSchedules';

export function CompetitionHub() {
  const { data } = useAppData();

  // Split competitions into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const sorted = [...data.competitions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return {
      upcoming: sorted.filter(c => new Date(c.endDate || c.date) >= now),
      past: sorted.filter(c => new Date(c.endDate || c.date) < now).reverse(),
    };
  }, [data.competitions]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link 
          to="/" 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blush-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-forest-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-forest-700">Competition</h1>
          <p className="text-sm text-forest-400">
            {data.competitionDances.length} dance{data.competitionDances.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          to="/dances"
          className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors"
        >
          <Music className="text-purple-600" size={20} />
          <div>
            <div className="font-medium text-forest-700">All Dances</div>
            <div className="text-xs text-forest-400">{data.competitionDances.length} entries</div>
          </div>
        </Link>
        <Link
          to="/formations"
          className="flex items-center gap-3 p-4 bg-forest-50 rounded-xl border border-forest-200 hover:bg-forest-100 transition-colors"
        >
          <ListOrdered className="text-forest-600" size={20} />
          <div>
            <div className="font-medium text-forest-700">Formations</div>
            <div className="text-xs text-forest-400">Stage layouts</div>
          </div>
        </Link>
      </div>

      {/* Upcoming Competitions */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-forest-500 uppercase tracking-wide mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map(comp => {
              const daysUntil = differenceInDays(new Date(comp.date), new Date());
              const schedule = getScheduleForCompetition(comp.id);
              const dancesInComp = data.competitionDances.filter(d => 
                comp.dances?.includes(d.id)
              );

              return (
                <div 
                  key={comp.id} 
                  className="bg-white rounded-xl border border-blush-200 shadow-sm overflow-hidden"
                >
                  {/* Competition Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Trophy className="text-rose-600" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-forest-700">{comp.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-forest-400 mt-0.5">
                          <Calendar size={14} />
                          <span>
                            {format(new Date(comp.date), 'MMM d')}
                            {comp.endDate && ` - ${format(new Date(comp.endDate), 'MMM d')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-forest-400 mt-0.5">
                          <MapPin size={14} />
                          <span className="truncate">{comp.location}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-rose-600">
                          {daysUntil <= 0 ? 'Now' : daysUntil}
                        </div>
                        {daysUntil > 0 && (
                          <div className="text-xs text-forest-400">days</div>
                        )}
                      </div>
                    </div>
                    
                    {dancesInComp.length > 0 && (
                      <div className="mt-3 text-sm text-forest-500">
                        {dancesInComp.length} dance{dancesInComp.length !== 1 ? 's' : ''} entered
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="flex border-t border-blush-100">
                    {schedule.length > 0 && (
                      <Link 
                        to={`/competition/${comp.id}/schedule`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-forest-500 hover:bg-blush-50 transition-colors border-r border-blush-100"
                      >
                        <ListOrdered size={16} />
                        Schedule
                      </Link>
                    )}
                    <Link 
                      to={`/competition/${comp.id}/checklist`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-forest-500 hover:bg-blush-50 transition-colors"
                    >
                      <ClipboardList size={16} />
                      Checklist
                    </Link>
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
          <h2 className="text-sm font-semibold text-forest-500 uppercase tracking-wide mb-3">
            Past
          </h2>
          <div className="space-y-2">
            {past.slice(0, 5).map(comp => (
              <div 
                key={comp.id} 
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blush-200 opacity-60"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Trophy className="text-gray-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-forest-600 truncate">{comp.name}</div>
                  <div className="text-xs text-forest-400">
                    {format(new Date(comp.date), 'MMM d, yyyy')}
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
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-rose-400" size={32} />
          </div>
          <h3 className="font-medium text-forest-700 mb-1">No competitions yet</h3>
          <p className="text-sm text-forest-400">
            Competitions will appear here when added
          </p>
        </div>
      )}
    </div>
  );
}
