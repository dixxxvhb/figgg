import { useState } from 'react';
import { History, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PastSession } from '../../utils/smartNotes';
import { normalizeNoteCategory } from '../../types';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  'worked-on': { label: 'Worked On', color: 'bg-forest-100 text-forest-700' },
  'needs-work': { label: 'Needs Work', color: 'bg-amber-100 text-amber-700' },
  'next-week': { label: 'Next Week', color: 'bg-blue-100 text-blue-700' },
  'ideas': { label: 'Ideas', color: 'bg-purple-100 text-purple-700' },
};

interface PreviousSessionsPanelProps {
  sessions: PastSession[];
}

export function PreviousSessionsPanel({ sessions }: PreviousSessionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  if (sessions.length === 0) return null;

  const toggleSession = (eventId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className="mt-4 mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <History size={14} className="text-forest-400 dark:text-blush-500" />
        <span className="text-xs font-medium text-forest-500 dark:text-blush-400">
          {sessions.length} previous session{sessions.length !== 1 ? 's' : ''}
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-forest-400 dark:text-blush-500 ml-auto" />
        ) : (
          <ChevronDown size={14} className="text-forest-400 dark:text-blush-500 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {sessions.map(session => {
            const isSessionExpanded = expandedSessions.has(session.eventId);
            const noteCount = session.notes.liveNotes.length;

            return (
              <div
                key={session.eventId}
                className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSession(session.eventId)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-left"
                >
                  <div>
                    <div className="text-sm font-medium text-forest-700 dark:text-blush-200">
                      {format(parseISO(session.weekOf), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-forest-400 dark:text-blush-500">
                      {noteCount} note{noteCount !== 1 ? 's' : ''}
                      {session.notes.nextWeekGoal ? ' -- has goal' : ''}
                    </div>
                  </div>
                  {isSessionExpanded ? (
                    <ChevronUp size={14} className="text-forest-400" />
                  ) : (
                    <ChevronDown size={14} className="text-forest-400" />
                  )}
                </button>

                {isSessionExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-blush-100 dark:border-blush-700 pt-2">
                    {/* Next session goal */}
                    {session.notes.nextWeekGoal && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock size={12} className="text-blue-500" />
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Next Session Goal</span>
                        </div>
                        <p className="text-sm text-forest-700 dark:text-blush-300">{session.notes.nextWeekGoal}</p>
                      </div>
                    )}

                    {/* Plan */}
                    {session.notes.plan && (
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Plan</div>
                        <p className="text-sm text-forest-700 dark:text-blush-300 whitespace-pre-wrap">{session.notes.plan}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {session.notes.liveNotes.map(note => {
                      const cat = normalizeNoteCategory(note.category);
                      const catInfo = cat ? CATEGORY_LABELS[cat] : null;
                      return (
                        <div key={note.id} className="text-sm text-forest-600 dark:text-blush-300">
                          {catInfo && (
                            <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full mr-1.5 ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          )}
                          {note.text}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
