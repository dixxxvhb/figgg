import React from 'react';
import { format } from 'date-fns';
import { CurrentClassCard } from '../components/Dashboard/CurrentClassCard';
import { TodaySchedule } from '../components/Dashboard/TodaySchedule';
import { QuickStats } from '../components/Dashboard/QuickStats';
import { useCurrentClass } from '../hooks/useCurrentClass';
import { useLocation } from '../hooks/useLocation';
import { useAppData } from '../hooks/useAppData';
import { getCurrentDayOfWeek } from '../utils/time';
import { getClassesByDay } from '../data/classes';

export function Dashboard() {
  const { data } = useAppData();
  const currentDay = getCurrentDayOfWeek();
  const todayClasses = getClassesByDay(data.classes, currentDay);
  const classInfo = useCurrentClass(data.classes);
  const { isNearCurrentStudio } = useLocation(
    data.studios,
    classInfo.class?.studioId
  );

  const dayName = format(new Date(), 'EEEE');
  const dateStr = format(new Date(), 'MMMM d');

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{dayName}</h1>
        <p className="text-gray-500">{dateStr}</p>
      </div>

      {/* Current/Next Class */}
      <div className="mb-6">
        <CurrentClassCard
          classInfo={classInfo}
          isNearStudio={isNearCurrentStudio}
        />
      </div>

      {/* Quick Stats */}
      <div className="mb-6">
        <QuickStats
          todayClasses={todayClasses}
          projects={data.projects}
          competitions={data.competitions}
        />
      </div>

      {/* Today's Full Schedule */}
      <TodaySchedule classes={todayClasses} studios={data.studios} />
    </div>
  );
}
