import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Circle, ChevronRight, Flag, Calendar, Clock } from 'lucide-react';
import { format, isToday, parseISO, isPast, startOfDay } from 'date-fns';
import type { Reminder } from '../../types';

interface RemindersWidgetProps {
  reminders: Reminder[];
}

export function RemindersWidget({ reminders }: RemindersWidgetProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Get today's reminders and overdue
  const { todayReminders, overdueCount, upcomingCount } = useMemo(() => {
    const incomplete = reminders.filter(r => !r.completed);
    const today = incomplete.filter(r => r.dueDate === todayStr);
    const overdue = incomplete.filter(r => r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr);
    const upcoming = incomplete.filter(r => r.dueDate && r.dueDate > todayStr);

    return {
      todayReminders: today.slice(0, 3), // Show max 3
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
    };
  }, [reminders, todayStr]);

  const totalIncomplete = reminders.filter(r => !r.completed).length;

  return (
    <Link
      to="/me"
      className="block bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden shadow-sm"
      onClick={() => {
        // Store that we want to open tasks tab
        sessionStorage.setItem('meTabTarget', 'tasks');
      }}
    >
      <div className="px-4 py-3 border-b border-blush-100 dark:border-blush-700 flex items-center justify-between">
        <h3 className="font-semibold text-blush-800 dark:text-white flex items-center gap-2">
          <CheckSquare size={16} className="text-blue-500" />
          Reminders
        </h3>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {overdueCount} overdue
            </span>
          )}
          <ChevronRight size={16} className="text-blush-400" />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {todayReminders.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-blush-500 dark:text-blush-400">No tasks due today</p>
            {upcomingCount > 0 && (
              <p className="text-xs text-blush-400 dark:text-blush-500 mt-1">
                {upcomingCount} upcoming
              </p>
            )}
          </div>
        ) : (
          <>
            {todayReminders.map(reminder => (
              <div key={reminder.id} className="flex items-start gap-3">
                <Circle
                  size={18}
                  className="text-gray-300 dark:text-blush-600 flex-shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blush-700 dark:text-blush-300 line-clamp-1">
                    {reminder.title}
                  </p>
                  {reminder.dueTime && (
                    <p className="text-xs text-blush-400 dark:text-blush-500 flex items-center gap-1">
                      <Clock size={10} />
                      {reminder.dueTime}
                    </p>
                  )}
                </div>
                {reminder.flagged && (
                  <Flag size={14} className="text-orange-500 fill-orange-500 flex-shrink-0" />
                )}
              </div>
            ))}
            {todayReminders.length < reminders.filter(r => !r.completed && r.dueDate === todayStr).length && (
              <p className="text-xs text-blush-400 dark:text-blush-500 text-center">
                +{reminders.filter(r => !r.completed && r.dueDate === todayStr).length - todayReminders.length} more
              </p>
            )}
          </>
        )}

        {/* Summary Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-blush-100 dark:border-blush-700 text-xs text-blush-500 dark:text-blush-400">
          <span>{totalIncomplete} incomplete tasks</span>
          <span className="flex items-center gap-1 text-blue-500">
            <Calendar size={12} />
            View all
          </span>
        </div>
      </div>
    </Link>
  );
}
