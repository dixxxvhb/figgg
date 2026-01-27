import { BookOpen, Users, FileText, UserCheck, TrendingUp } from 'lucide-react';
import { TeachingStats } from '../../hooks/useTeachingStats';

interface WeekStatsProps {
  stats: TeachingStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subValue?: string;
  color: 'green' | 'orange' | 'blue' | 'gray';
}

function StatCard({ icon, value, label, subValue, color }: StatCardProps) {
  const styles = {
    green: {
      bg: 'bg-green-50 dark:bg-stone-800',
      icon: 'bg-green-500',
      text: 'text-green-700 dark:text-green-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-stone-800',
      icon: 'bg-orange-500',
      text: 'text-orange-700 dark:text-orange-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-stone-800',
      icon: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
    },
    gray: {
      bg: 'bg-stone-100 dark:bg-stone-800',
      icon: 'bg-stone-500',
      text: 'text-stone-700 dark:text-stone-300',
    },
  };

  const s = styles[color];

  return (
    <div className={`flex-shrink-0 w-28 rounded-xl p-3 ${s.bg}`}>
      <div className={`w-8 h-8 ${s.icon} text-white rounded-lg flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${s.text}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-stone-500 dark:text-stone-400 -mt-0.5">{subValue}</div>
      )}
      <div className={`text-xs font-medium ${s.text} opacity-80 mt-0.5`}>{label}</div>
    </div>
  );
}

export function WeekStats({ stats }: WeekStatsProps) {
  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400 mb-3 flex items-center gap-2">
        <TrendingUp size={14} />
        This Week
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        <StatCard
          icon={<BookOpen size={16} />}
          value={stats.classesThisWeek.completed}
          subValue={`of ${stats.classesThisWeek.total}`}
          label="Classes"
          color="green"
        />
        <StatCard
          icon={<FileText size={16} />}
          value={stats.notesThisWeek}
          label="Notes"
          color="orange"
        />
        <StatCard
          icon={<Users size={16} />}
          value={stats.studentsSeenThisWeek}
          label="Students"
          color="blue"
        />
        <StatCard
          icon={<FileText size={16} />}
          value={stats.plansFilled.filled}
          subValue={`of ${stats.plansFilled.total}`}
          label="Plans"
          color="gray"
        />
        {stats.attendanceRate > 0 && (
          <StatCard
            icon={<UserCheck size={16} />}
            value={`${stats.attendanceRate}%`}
            label="Attendance"
            color="green"
          />
        )}
      </div>
    </div>
  );
}
