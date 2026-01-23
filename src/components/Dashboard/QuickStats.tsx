import { differenceInDays, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Class, Project, Competition } from '../../types';
import { Trophy, ListOrdered, ClipboardList } from 'lucide-react';
import { getScheduleForCompetition } from '../../data/competitionSchedules';

interface QuickStatsProps {
  todayClasses: Class[];
  projects: Project[];
  competitions: Competition[];
}

export function QuickStats({ todayClasses, projects, competitions }: QuickStatsProps) {
  const inProgressProjects = projects.filter(p => p.status === 'in-progress');
  const upcomingCompetitions = competitions
    .filter(c => new Date(c.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextComp = upcomingCompetitions[0];
  const daysUntilNextComp = nextComp
    ? differenceInDays(new Date(nextComp.date), new Date())
    : null;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center border border-blush-200 shadow-sm">
          <div className="text-2xl font-bold text-forest-600">{todayClasses.length}</div>
          <div className="text-xs text-forest-400">Classes Today</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-blush-200 shadow-sm">
          <div className="text-2xl font-bold text-blush-500">{inProgressProjects.length}</div>
          <div className="text-xs text-forest-400">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center border border-blush-200 shadow-sm">
          <div className="text-2xl font-bold text-forest-500">{upcomingCompetitions.length}</div>
          <div className="text-xs text-forest-400">Competitions</div>
        </div>
      </div>

      {/* Next Competition Countdown */}
      {nextComp && (
        <div className="bg-gradient-to-r from-blush-200 to-blush-100 rounded-xl p-4 border border-blush-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-forest-600 rounded-full flex items-center justify-center">
              <Trophy className="text-blush-200" size={24} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-forest-500">Next Competition</div>
              <div className="font-semibold text-forest-700">{nextComp.name}</div>
              <div className="text-sm text-forest-500">
                {format(new Date(nextComp.date), 'MMM d')}
                {nextComp.endDate && ` - ${format(new Date(nextComp.endDate), 'MMM d')}`}
                {' • '}{nextComp.location}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-forest-600">{daysUntilNextComp}</div>
              <div className="text-xs text-forest-400">days</div>
            </div>
          </div>
          {/* Quick Links for Competition */}
          <div className="flex gap-2">
            {getScheduleForCompetition(nextComp.id).length > 0 && (
              <Link
                to={`/competition/${nextComp.id}/schedule`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-forest-600 text-white rounded-lg text-sm font-medium hover:bg-forest-700 transition-colors"
              >
                <ListOrdered size={16} />
                Schedule
              </Link>
            )}
            <Link
              to={`/competition/${nextComp.id}/checklist`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                getScheduleForCompetition(nextComp.id).length > 0
                  ? 'bg-white text-forest-700 border border-forest-300 hover:bg-forest-50'
                  : 'bg-forest-600 text-white hover:bg-forest-700'
              }`}
            >
              <ClipboardList size={16} />
              Checklist
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
