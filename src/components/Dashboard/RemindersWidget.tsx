import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight, Flag, Clock } from 'lucide-react';
import { format, parseISO, isPast, startOfDay } from 'date-fns';
import type { Reminder } from '../../types';

interface RemindersWidgetProps {
  reminders: Reminder[];
  onToggle?: (id: string) => void;
}

export function RemindersWidget({ reminders, onToggle }: RemindersWidgetProps) {
  const navigate = useNavigate();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { displayReminders, overdueCount, totalIncomplete } = useMemo(() => {
    const incomplete = reminders.filter(r => !r.completed);
    const overdue = incomplete.filter(r => r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr);
    const today = incomplete.filter(r => r.dueDate === todayStr);
    const upcoming = incomplete.filter(r => r.dueDate && r.dueDate > todayStr);
    const noDate = incomplete.filter(r => !r.dueDate);

    const sorted = [
      ...overdue.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
      ...today,
      ...upcoming.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
      ...noDate,
    ];

    return {
      displayReminders: sorted.slice(0, 5),
      overdueCount: overdue.length,
      totalIncomplete: incomplete.length,
    };
  }, [reminders, todayStr]);

  const getDueBadge = (reminder: Reminder) => {
    if (!reminder.dueDate) return null;
    if (reminder.dueDate === todayStr) {
      return <span className="text-[10px] font-semibold text-blue-500">Today</span>;
    }
    if (isPast(startOfDay(parseISO(reminder.dueDate)))) {
      return <span className="text-[10px] font-semibold text-red-500">Overdue</span>;
    }
    return <span className="type-caption text-[var(--text-tertiary)]">{format(parseISO(reminder.dueDate), 'MMM d')}</span>;
  };

  const isOverdue = (r: Reminder) => r.dueDate && isPast(startOfDay(parseISO(r.dueDate))) && r.dueDate !== todayStr;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Header — tapping navigates to full tasks */}
      <button
        onClick={() => navigate('/me?tab=tasks')}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h3 className="type-h1 text-[var(--text-primary)]">
            Tasks
          </h3>
          {overdueCount > 0 && (
            <span className="type-label px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-[var(--status-danger)]">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
      </button>

      {/* Task list — individual items have inline toggle */}
      <div className="px-4 pb-4 space-y-2.5">
        {displayReminders.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-[var(--text-tertiary)]">No tasks yet</p>
          </div>
        ) : (
          <>
            {displayReminders.map(reminder => (
              <div key={reminder.id} className="flex items-start gap-3">
                {onToggle ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(reminder.id);
                    }}
                    className="flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
                  >
                    <Circle
                      size={16}
                      className={
                        isOverdue(reminder) ? 'text-[var(--status-danger)]' :
                        reminder.priority === 'high' ? 'text-orange-500 dark:text-orange-400' :
                        reminder.priority === 'medium' ? 'text-[var(--accent-primary)]' :
                        'text-[var(--text-tertiary)]'
                      }
                      strokeWidth={reminder.priority === 'high' ? 2.5 : reminder.priority === 'medium' ? 2 : 1.5}
                    />
                  </button>
                ) : (
                  <Circle
                    size={16}
                    className={`flex-shrink-0 mt-0.5 ${
                      isOverdue(reminder) ? 'text-[var(--status-danger)]' :
                      reminder.priority === 'high' ? 'text-orange-500 dark:text-orange-400' :
                      reminder.priority === 'medium' ? 'text-[var(--accent-primary)]' :
                      'text-[var(--text-tertiary)]'
                    }`}
                    strokeWidth={reminder.priority === 'high' ? 2.5 : reminder.priority === 'medium' ? 2 : 1.5}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                    {reminder.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {reminder.dueTime && (
                      <span className="type-caption text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock size={10} />
                        {reminder.dueTime}
                      </span>
                    )}
                    {getDueBadge(reminder)}
                  </div>
                </div>
                {reminder.flagged && (
                  <Flag size={12} className="text-orange-500 fill-orange-500 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
            {totalIncomplete > displayReminders.length && (
              <button
                onClick={() => navigate('/me?tab=tasks')}
                className="type-caption text-[var(--text-tertiary)] text-center pt-1 w-full"
              >
                +{totalIncomplete - displayReminders.length} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
