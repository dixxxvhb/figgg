import React from 'react';
import { Class, Project, Competition } from '../../types';

interface QuickStatsProps {
  todayClasses: Class[];
  projects: Project[];
  competitions: Competition[];
}

export function QuickStats({ todayClasses, projects, competitions }: QuickStatsProps) {
  const inProgressProjects = projects.filter(p => p.status === 'in-progress');
  const upcomingCompetitions = competitions.filter(c => new Date(c.date) >= new Date());

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-violet-50 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-violet-700">{todayClasses.length}</div>
        <div className="text-xs text-violet-600">Classes Today</div>
      </div>
      <div className="bg-pink-50 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-pink-700">{inProgressProjects.length}</div>
        <div className="text-xs text-pink-600">In Progress</div>
      </div>
      <div className="bg-amber-50 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-amber-700">{upcomingCompetitions.length}</div>
        <div className="text-xs text-amber-600">Competitions</div>
      </div>
    </div>
  );
}
