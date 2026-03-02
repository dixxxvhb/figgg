import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Clock,
  MessageSquare,
  Smile,
  Meh,
  CloudRain,
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { haptic } from '../../utils/haptics';
import type {
  TherapistData,
  TherapistPrepNote,
  TherapistSession,
  TherapistActionItem,
} from '../../types';

interface TherapistTrackerProps {
  data: TherapistData;
  onUpdate: (updates: Partial<TherapistData>) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Next Session ───────────────────────────────────────────────

function NextSessionSection({
  nextSession,
  onUpdate,
  onAddPrepNote,
}: {
  nextSession: TherapistData['nextSession'];
  onUpdate: (next: TherapistData['nextSession']) => void;
  onAddPrepNote: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(nextSession?.date || '');
  const [time, setTime] = useState(nextSession?.time || '');
  const [notes, setNotes] = useState(nextSession?.notes || '');
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDate(nextSession?.date || '');
    setTime(nextSession?.time || '');
    setNotes(nextSession?.notes || '');
  }, [nextSession]);

  const handleSave = () => {
    haptic('light');
    if (date) {
      onUpdate({ date, time, notes });
    } else {
      onUpdate(undefined);
    }
    setEditing(false);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => {
      if (date) {
        onUpdate({ date, time, notes: value });
      }
    }, 500);
  };

  const handleClear = () => {
    haptic('light');
    onUpdate(undefined);
    setDate('');
    setTime('');
    setNotes('');
    setEditing(false);
  };

  const getCountdown = (): string | null => {
    if (!nextSession?.date) return null;
    const sessionDate = startOfDay(parseISO(nextSession.date));
    const today = startOfDay(new Date());
    const days = differenceInDays(sessionDate, today);
    if (days < 0) return 'past due';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  };

  if (!nextSession && !editing) {
    return (
      <div className="space-y-2">
        <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
          <Calendar size={14} className="text-[var(--accent-primary)]" />
          Next Session
        </h3>
        <button
          onClick={() => { haptic('light'); setEditing(true); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-tertiary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Plus size={14} />
          Set next session
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
          <Calendar size={14} className="text-[var(--accent-primary)]" />
          Next Session
        </h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-28 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
          </div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Session notes or focus areas..."
            rows={2}
            className="w-full text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] py-2 hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDate(nextSession?.date || ''); setTime(nextSession?.time || ''); setNotes(nextSession?.notes || ''); }}
              className="px-4 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Display mode
  const countdown = getCountdown();
  const isToday = countdown === 'today';
  const isPastDue = countdown === 'past due';

  return (
    <div className="space-y-2">
      <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
        <Calendar size={14} className="text-[var(--accent-primary)]" />
        Next Session
      </h3>
      <div className="bg-[var(--surface-inset)] rounded-[var(--radius-md)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="type-body text-[var(--text-primary)] font-medium">
              {format(parseISO(nextSession!.date), 'EEE, MMM d')}
            </span>
            {nextSession!.time && (
              <span className="type-caption text-[var(--text-tertiary)] flex items-center gap-1">
                <Clock size={11} />
                {nextSession!.time}
              </span>
            )}
          </div>
          <span
            className={`type-caption font-medium px-2 py-0.5 rounded-full ${
              isPastDue
                ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : isToday
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
            }`}
          >
            {countdown}
          </span>
        </div>
        {nextSession!.notes && (
          <p className="type-caption text-[var(--text-secondary)]">{nextSession!.notes}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { haptic('light'); onAddPrepNote(); }}
            className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
          >
            <Plus size={12} />
            Add to prep notes
          </button>
          <span className="text-[var(--border-subtle)]">|</span>
          <button
            onClick={() => { haptic('light'); setEditing(true); }}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Edit
          </button>
          <span className="text-[var(--border-subtle)]">|</span>
          <button
            onClick={handleClear}
            className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Prep Notes ─────────────────────────────────────────────────

function PrepNotesSection({
  prepNotes,
  onUpdate,
  inputRef,
}: {
  prepNotes: TherapistPrepNote[];
  onUpdate: (notes: TherapistPrepNote[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [newNote, setNewNote] = useState('');
  const sorted = [...prepNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleAdd = () => {
    if (!newNote.trim()) return;
    haptic('light');
    const note: TherapistPrepNote = {
      id: generateId(),
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
      discussed: false,
    };
    onUpdate([...prepNotes, note]);
    setNewNote('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const toggleDiscussed = (id: string) => {
    haptic('light');
    onUpdate(
      prepNotes.map(n => (n.id === id ? { ...n, discussed: !n.discussed } : n))
    );
  };

  const handleDelete = (id: string) => {
    haptic('light');
    onUpdate(prepNotes.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-2">
      <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
        <MessageSquare size={14} className="text-[var(--accent-primary)]" />
        Prep Notes
      </h3>

      {/* Inline add input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What to bring up next session..."
          className="flex-1 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
        <button
          onClick={handleAdd}
          disabled={!newNote.trim()}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <p className="type-caption text-[var(--text-tertiary)] text-center py-3">
          No prep notes yet. Jot down topics for your next session.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(note => (
            <div
              key={note.id}
              className={`flex items-start gap-2 p-2 rounded-[var(--radius-sm)] ${
                note.discussed
                  ? 'bg-[var(--surface-inset)] opacity-60'
                  : 'bg-[var(--surface-card)]'
              }`}
            >
              <button
                onClick={() => toggleDiscussed(note.id)}
                className="flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
              >
                {note.discussed ? (
                  <Check size={16} className="text-[var(--status-success)]" />
                ) : (
                  <div className="w-4 h-4 rounded border border-[var(--border-subtle)]" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`type-body text-sm ${
                    note.discussed
                      ? 'line-through text-[var(--text-tertiary)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {note.text}
                </p>
                <span className="type-caption text-[var(--text-tertiary)]">
                  {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="flex-shrink-0 p-1 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mood Indicator ─────────────────────────────────────────────

const MOOD_CONFIG: Record<
  TherapistSession['moodAfter'],
  { icon: typeof Smile; label: string; colorClass: string; bgClass: string }
> = {
  better: {
    icon: Smile,
    label: 'Better',
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/20',
  },
  same: {
    icon: Meh,
    label: 'Same',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/20',
  },
  heavier: {
    icon: CloudRain,
    label: 'Heavier',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/20',
  },
};

function MoodBadge({ mood }: { mood: TherapistSession['moodAfter'] }) {
  const cfg = MOOD_CONFIG[mood];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bgClass} ${cfg.colorClass}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ─── New Session Form ───────────────────────────────────────────

function NewSessionForm({
  onSave,
  onCancel,
}: {
  onSave: (session: TherapistSession) => void;
  onCancel: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [actionItems, setActionItems] = useState<TherapistActionItem[]>([]);
  const [newAction, setNewAction] = useState('');
  const [moodAfter, setMoodAfter] = useState<TherapistSession['moodAfter'] | null>(null);

  const handleAddAction = () => {
    if (!newAction.trim()) return;
    haptic('light');
    setActionItems(prev => [
      ...prev,
      { id: generateId(), text: newAction.trim(), completed: false },
    ]);
    setNewAction('');
  };

  const handleActionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAction();
    }
  };

  const removeAction = (id: string) => {
    setActionItems(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = () => {
    if (!summary.trim() || !moodAfter) return;
    haptic('light');
    const session: TherapistSession = {
      id: generateId(),
      date,
      summary: summary.trim(),
      takeaways: takeaways.trim(),
      actionItems,
      moodAfter,
      createdAt: new Date().toISOString(),
    };
    onSave(session);
  };

  const canSave = summary.trim() && moodAfter;

  return (
    <div className="space-y-3 bg-[var(--surface-inset)] rounded-[var(--radius-md)] p-3">
      <h4 className="type-label text-[var(--text-primary)] font-medium">Log Session</h4>

      {/* Date */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
      </div>

      {/* Summary */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1">Summary</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="What did you discuss?"
          rows={3}
          className="w-full text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
        />
      </div>

      {/* Takeaways */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1">Key Takeaways</label>
        <textarea
          value={takeaways}
          onChange={e => setTakeaways(e.target.value)}
          placeholder="What stood out or resonated?"
          rows={2}
          className="w-full text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
        />
      </div>

      {/* Action Items */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1">Action Items</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newAction}
            onChange={e => setNewAction(e.target.value)}
            onKeyDown={handleActionKeyDown}
            placeholder="Add an action item..."
            className="flex-1 text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
          <button
            onClick={handleAddAction}
            disabled={!newAction.trim()}
            className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
        {actionItems.length > 0 && (
          <div className="space-y-1.5">
            {actionItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <div className="w-4 h-4 rounded border border-[var(--border-subtle)] flex-shrink-0" />
                <span className="flex-1">{item.text}</span>
                <button
                  onClick={() => removeAction(item.id)}
                  className="p-0.5 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mood After */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1.5">How do you feel after?</label>
        <div className="flex gap-2">
          {(['better', 'same', 'heavier'] as const).map(mood => {
            const cfg = MOOD_CONFIG[mood];
            const Icon = cfg.icon;
            const selected = moodAfter === mood;
            return (
              <button
                key={mood}
                onClick={() => { haptic('light'); setMoodAfter(mood); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-sm)] border text-sm font-medium transition-all ${
                  selected
                    ? `${cfg.bgClass} ${cfg.colorClass} border-current`
                    : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Save Session
        </button>
        <button
          onClick={() => { haptic('light'); onCancel(); }}
          className="px-4 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Session History ────────────────────────────────────────────

function SessionHistory({
  sessions,
  onToggleAction,
}: {
  sessions: TherapistSession[];
  onToggleAction: (sessionId: string, actionId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) return null;

  const toggle = (id: string) => {
    haptic('light');
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-2">
      <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
        <Clock size={14} className="text-[var(--accent-primary)]" />
        Session History
      </h3>
      <div className="space-y-2">
        {sorted.map(session => {
          const isExpanded = expandedId === session.id;
          const completedActions = session.actionItems.filter(a => a.completed).length;
          const totalActions = session.actionItems.length;

          return (
            <div
              key={session.id}
              className="bg-[var(--surface-inset)] rounded-[var(--radius-md)] overflow-hidden"
            >
              {/* Session header - tap to expand */}
              <button
                onClick={() => toggle(session.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="type-body text-sm font-medium text-[var(--text-primary)]">
                      {format(parseISO(session.date), 'MMM d, yyyy')}
                    </span>
                    <MoodBadge mood={session.moodAfter} />
                  </div>
                  <p className="type-caption text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                    {session.summary}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-subtle)]">
                  {/* Summary */}
                  <div className="pt-2">
                    <span className="type-caption text-[var(--text-tertiary)] block mb-0.5">Summary</span>
                    <p className="type-body text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                      {session.summary}
                    </p>
                  </div>

                  {/* Takeaways */}
                  {session.takeaways && (
                    <div>
                      <span className="type-caption text-[var(--text-tertiary)] block mb-0.5">Key Takeaways</span>
                      <p className="type-body text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                        {session.takeaways}
                      </p>
                    </div>
                  )}

                  {/* Action Items */}
                  {totalActions > 0 && (
                    <div>
                      <span className="type-caption text-[var(--text-tertiary)] block mb-1">
                        Action Items ({completedActions}/{totalActions})
                      </span>
                      <div className="space-y-1.5">
                        {session.actionItems.map(item => (
                          <div key={item.id} className="flex items-start gap-2">
                            <button
                              onClick={() => {
                                haptic('light');
                                onToggleAction(session.id, item.id);
                              }}
                              className="flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
                            >
                              {item.completed ? (
                                <Check size={16} className="text-[var(--status-success)]" />
                              ) : (
                                <div className="w-4 h-4 rounded border border-[var(--border-subtle)]" />
                              )}
                            </button>
                            <span
                              className={`type-body text-sm ${
                                item.completed
                                  ? 'line-through text-[var(--text-tertiary)]'
                                  : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function TherapistTracker({ data, onUpdate }: TherapistTrackerProps) {
  const [showNewSession, setShowNewSession] = useState(false);
  const prepInputRef = useRef<HTMLInputElement | null>(null);

  const handleNextSessionUpdate = (next: TherapistData['nextSession']) => {
    onUpdate({ nextSession: next });
  };

  const handlePrepNotesUpdate = (prepNotes: TherapistPrepNote[]) => {
    onUpdate({ prepNotes });
  };

  const handleAddPrepNote = () => {
    prepInputRef.current?.focus();
  };

  const handleSaveSession = (session: TherapistSession) => {
    haptic('light');
    onUpdate({ sessions: [...data.sessions, session] });
    setShowNewSession(false);
  };

  const handleToggleAction = (sessionId: string, actionId: string) => {
    const updated = data.sessions.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        actionItems: s.actionItems.map(a =>
          a.id === actionId ? { ...a, completed: !a.completed } : a
        ),
      };
    });
    onUpdate({ sessions: updated });
  };

  return (
    <div className="space-y-5">
      {/* A. Next Session */}
      <NextSessionSection
        nextSession={data.nextSession}
        onUpdate={handleNextSessionUpdate}
        onAddPrepNote={handleAddPrepNote}
      />

      {/* B. Prep Notes */}
      <PrepNotesSection
        prepNotes={data.prepNotes}
        onUpdate={handlePrepNotesUpdate}
        inputRef={prepInputRef}
      />

      {/* C. Log Session */}
      <div className="space-y-2">
        <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
          <Plus size={14} className="text-[var(--accent-primary)]" />
          Log Session
        </h3>
        {showNewSession ? (
          <NewSessionForm
            onSave={handleSaveSession}
            onCancel={() => setShowNewSession(false)}
          />
        ) : (
          <button
            onClick={() => { haptic('light'); setShowNewSession(true); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-tertiary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Plus size={14} />
            Log a session
          </button>
        )}
      </div>

      {/* D. Session History */}
      <SessionHistory
        sessions={data.sessions}
        onToggleAction={handleToggleAction}
      />
    </div>
  );
}
