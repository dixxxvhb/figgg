import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trash2,
  Clock,
  MessageSquare,
  Smile,
  Meh,
  CloudRain,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { haptic } from '../../utils/haptics';
import { safeFormat, safeTime } from '../../utils/time';
import { generateId } from '../../utils/id';
import type {
  TherapistData,
  TherapistPrepNote,
  TherapistSession,
  TherapistActionItem,
  GriefEmotion,
  GriefLetter,
  CalendarEvent,
} from '../../types';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent as updateGCalEvent,
  deleteGoogleCalendarEvent,
} from '../../services/googleCalendar';

// ─── Shared Emotion Config ─────────────────────────────────────

const EMOTION_LABELS: Record<GriefEmotion, string> = {
  numb: 'Numb',
  angry: 'Angry',
  sad: 'Sad',
  anxious: 'Anxious',
  guilty: 'Guilty',
  overwhelmed: 'Overwhelmed',
  disconnected: 'Disconnected',
  peaceful: 'Peaceful',
  grateful: 'Grateful',
  hopeful: 'Hopeful',
  relieved: 'Relieved',
  creative: 'Creative',
  all_of_it: 'All of it',
  dont_know: "I don't know",
};

const EMOTION_COLORS: Record<GriefEmotion, string> = {
  numb: 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  angry: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
  sad: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40',
  anxious: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
  guilty: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40',
  overwhelmed: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/40',
  disconnected: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-800/40',
  peaceful: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40',
  grateful: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800/40',
  hopeful: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40',
  relieved: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/30 dark:text-lime-300 dark:border-lime-800/40',
  creative: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:border-fuchsia-800/40',
  all_of_it: 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  dont_know: 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border-[var(--border-subtle)]',
};

const EMOTION_SELECTED_COLORS: Record<GriefEmotion, string> = {
  numb: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
  angry: 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-300/50 dark:bg-red-900/40 dark:text-red-200 dark:border-red-600',
  sad: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-300/50 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-600',
  anxious: 'bg-amber-100 text-amber-800 border-amber-400 ring-1 ring-amber-300/50 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600',
  guilty: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-300/50 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-600',
  overwhelmed: 'bg-orange-100 text-orange-800 border-orange-400 ring-1 ring-orange-300/50 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-600',
  disconnected: 'bg-slate-100 text-slate-700 border-slate-400 ring-1 ring-slate-300/50 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-600',
  peaceful: 'bg-emerald-100 text-emerald-800 border-emerald-400 ring-1 ring-emerald-300/50 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600',
  grateful: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-300/50 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-600',
  hopeful: 'bg-sky-100 text-sky-800 border-sky-400 ring-1 ring-sky-300/50 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-600',
  relieved: 'bg-lime-100 text-lime-800 border-lime-400 ring-1 ring-lime-300/50 dark:bg-lime-900/40 dark:text-lime-200 dark:border-lime-600',
  creative: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-400 ring-1 ring-fuchsia-300/50 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-600',
  all_of_it: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
  dont_know: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
};

const DIFFICULT_EMOTIONS: GriefEmotion[] = ['numb', 'angry', 'sad', 'anxious', 'guilty', 'overwhelmed', 'disconnected'];
const NEUTRAL_EMOTIONS: GriefEmotion[] = ['all_of_it', 'dont_know'];
const POSITIVE_EMOTIONS: GriefEmotion[] = ['peaceful', 'grateful', 'hopeful', 'relieved', 'creative'];

function derivesMoodAfter(emotions: GriefEmotion[]): TherapistSession['moodAfter'] {
  const hasPositive = emotions.some(e => POSITIVE_EMOTIONS.includes(e));
  const onlyNeutral = emotions.every(e => NEUTRAL_EMOTIONS.includes(e));
  if (hasPositive) return 'better';
  if (onlyNeutral) return 'same';
  return 'heavier';
}

interface TherapistTrackerProps {
  data: TherapistData;
  onUpdate: (updates: Partial<TherapistData>) => void;
  journalEntries?: GriefLetter[];
  calendarEvents?: CalendarEvent[];
}

// ─── Open Action Items Banner ──────────────────────────────────

function OpenActionItemsBanner({
  sessions,
  onToggleAction,
}: {
  sessions: TherapistSession[];
  onToggleAction: (sessionId: string, actionId: string) => void;
}) {
  const openItems = sessions.flatMap(s =>
    s.actionItems
      .filter(a => !a.completed)
      .map(a => ({ ...a, sessionId: s.id, sessionDate: s.date }))
  );

  if (openItems.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
        <AlertCircle size={14} className="text-[var(--accent-primary)]" />
        Open Action Items
      </h3>
      <div className="space-y-1.5">
        {openItems.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--surface-card)]"
          >
            <button
              onClick={() => {
                haptic('light');
                onToggleAction(item.sessionId, item.id);
              }}
              className="flex-shrink-0 mt-0.5 active:scale-90 transition-transform"
            >
              <div className="w-4 h-4 rounded border border-[var(--border-subtle)]" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="type-body text-sm text-[var(--text-primary)]">{item.text}</p>
              <span className="type-caption text-[var(--text-tertiary)]">
                from {format(parseISO(item.sessionDate), 'MMM d')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Next Session ───────────────────────────────────────────────

function NextSessionSection({
  nextSession,
  onUpdate,
  onAddPrepNote,
  onLogSession,
}: {
  nextSession: TherapistData['nextSession'];
  onUpdate: (next: TherapistData['nextSession']) => void;
  onAddPrepNote: () => void;
  onLogSession: (date: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(nextSession?.date || '');
  const [time, setTime] = useState(nextSession?.time || '');
  const [notes, setNotes] = useState(nextSession?.notes || '');
  const [syncing, setSyncing] = useState(false);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDate(nextSession?.date || '');
    setTime(nextSession?.time || '');
    setNotes(nextSession?.notes || '');
  }, [nextSession]);

  // Sync nextSession to Google Calendar (fire-and-forget, updates googleCalendarEventId on success)
  const syncToGoogleCalendar = async (
    sessionData: { date: string; time: string; notes: string },
    existingGCalId?: string
  ) => {
    setSyncing(true);
    try {
      const input = {
        title: 'Therapy - Brian Mandel',
        date: sessionData.date,
        startTime: sessionData.time || '10:00',
        endTime: '', // 1-hour default handled by Cloud Function
        description: sessionData.notes || '',
      };

      if (existingGCalId) {
        await updateGCalEvent(existingGCalId, input);
        // ID stays the same, no need to update
      } else {
        const result = await createGoogleCalendarEvent(input);
        // Save the Google Calendar event ID back to nextSession
        onUpdate({
          ...sessionData,
          googleCalendarEventId: result.googleCalendarEventId,
        });
      }
    } catch (err) {
      console.warn('Google Calendar sync failed (session saved locally):', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = () => {
    haptic('light');
    if (date) {
      const sessionData = { date, time, notes };
      onUpdate(sessionData);
      // Sync to Google Calendar as side effect
      syncToGoogleCalendar(sessionData, nextSession?.googleCalendarEventId);
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
        onUpdate({ date, time, notes: value, googleCalendarEventId: nextSession?.googleCalendarEventId });
      }
    }, 500);
  };

  const handleClear = () => {
    haptic('light');
    // Delete from Google Calendar if linked
    if (nextSession?.googleCalendarEventId) {
      deleteGoogleCalendarEvent(nextSession.googleCalendarEventId).catch(err =>
        console.warn('Failed to delete Google Calendar event:', err)
      );
    }
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
  const canLogNow = isToday || isPastDue;

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
        <button
          onClick={() => {
            haptic('light');
            onLogSession(nextSession!.date);
          }}
          className={`w-full rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
            canLogNow
              ? 'bg-[var(--accent-primary)] text-white hover:opacity-90'
              : 'bg-[var(--surface-card)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
          }`}
        >
          {canLogNow ? 'Log this session' : 'Open log for this session'}
        </button>
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
          {syncing && (
            <span className="text-xs text-[var(--text-tertiary)] italic">syncing...</span>
          )}
          {!syncing && nextSession?.googleCalendarEventId && (
            <span className="text-xs text-[var(--text-tertiary)]">on calendar</span>
          )}
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
  journalEntries,
}: {
  prepNotes: TherapistPrepNote[];
  onUpdate: (notes: TherapistPrepNote[]) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  journalEntries?: GriefLetter[];
}) {
  const [newNote, setNewNote] = useState('');
  const [showJournalPicker, setShowJournalPicker] = useState(false);
  const sorted = [...prepNotes].sort(
    (a, b) => safeTime(b.createdAt) - safeTime(a.createdAt)
  );

  const recentJournals = (journalEntries || [])
    .slice()
    .sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))
    .slice(0, 10);

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

  const handleAddFromJournal = (entry: GriefLetter) => {
    haptic('light');
    const firstLine = entry.content.split('\n')[0].slice(0, 100);
    const note: TherapistPrepNote = {
      id: generateId(),
      text: firstLine,
      createdAt: new Date().toISOString(),
      discussed: false,
      linkedJournalId: entry.id,
    };
    onUpdate([...prepNotes, note]);
    setShowJournalPicker(false);
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

  const findJournalDate = (linkedId: string): string | null => {
    const entry = (journalEntries || []).find(e => e.id === linkedId);
    return entry ? entry.date : null;
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
        {journalEntries && journalEntries.length > 0 && (
          <button
            onClick={() => { haptic('light'); setShowJournalPicker(!showJournalPicker); }}
            className={`px-3 py-2 rounded-[var(--radius-sm)] transition-colors ${
              showJournalPicker
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]'
            }`}
            title="From journal"
          >
            <BookOpen size={16} />
          </button>
        )}
        <button
          onClick={handleAdd}
          disabled={!newNote.trim()}
          className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Journal picker dropdown */}
      {showJournalPicker && recentJournals.length > 0 && (
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <span className="type-caption text-[var(--text-tertiary)]">Recent journal entries</span>
          </div>
          {recentJournals.map(entry => (
            <button
              key={entry.id}
              onClick={() => handleAddFromJournal(entry)}
              className="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-inset)] transition-colors border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <span className="type-caption text-[var(--text-tertiary)] block">
                {format(parseISO(entry.date), 'MMM d, yyyy')}
              </span>
              <p className="type-body text-sm text-[var(--text-primary)] line-clamp-1">
                {entry.content.split('\n')[0].slice(0, 80)}
              </p>
            </button>
          ))}
        </div>
      )}

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
                <div className="flex items-center gap-2">
                  <span className="type-caption text-[var(--text-tertiary)]">
                    {safeFormat(note.createdAt, 'MMM d, h:mm a')}
                  </span>
                  {note.linkedJournalId && (
                    <span className="type-caption text-[var(--text-tertiary)] flex items-center gap-0.5">
                      <BookOpen size={10} />
                      from journal{(() => {
                        const jDate = findJournalDate(note.linkedJournalId!);
                        return jDate ? ` ${format(parseISO(jDate), 'MMM d')}` : '';
                      })()}
                    </span>
                  )}
                </div>
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

function EmotionTags({ emotions }: { emotions: GriefEmotion[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {emotions.map(emotion => (
        <span
          key={emotion}
          className={`text-xs px-1.5 py-0.5 rounded-full border ${EMOTION_COLORS[emotion]}`}
        >
          {EMOTION_LABELS[emotion]}
        </span>
      ))}
    </div>
  );
}

// ─── Emotion Picker (for New Session Form) ──────────────────────

function EmotionPicker({
  selected,
  onToggle,
}: {
  selected: GriefEmotion[];
  onToggle: (emotion: GriefEmotion) => void;
}) {
  const groups: { label: string; emotions: GriefEmotion[] }[] = [
    { label: 'Difficult', emotions: DIFFICULT_EMOTIONS },
    { label: 'Neutral', emotions: NEUTRAL_EMOTIONS },
    { label: 'Positive', emotions: POSITIVE_EMOTIONS },
  ];

  return (
    <div className="space-y-2">
      {groups.map(group => (
        <div key={group.label}>
          <span className="type-caption text-[var(--text-tertiary)] block mb-1">{group.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {group.emotions.map(emotion => {
              const isSelected = selected.includes(emotion);
              return (
                <button
                  key={emotion}
                  onClick={() => { haptic('light'); onToggle(emotion); }}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                    isSelected
                      ? EMOTION_SELECTED_COLORS[emotion]
                      : EMOTION_COLORS[emotion]
                  }`}
                >
                  {EMOTION_LABELS[emotion]}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── New Session Form ───────────────────────────────────────────

function NewSessionForm({
  onSave,
  onCancel,
  initialDate,
  lastSessionPrepNotes,
}: {
  onSave: (session: TherapistSession) => void;
  onCancel: () => void;
  initialDate?: string;
  lastSessionPrepNotes?: TherapistPrepNote[];
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(initialDate || today);
  const [summary, setSummary] = useState('');
  const [takeaways, setTakeaways] = useState('');
  const [actionItems, setActionItems] = useState<TherapistActionItem[]>([]);
  const [newAction, setNewAction] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<GriefEmotion[]>([]);
  const [showLastSessionPrep, setShowLastSessionPrep] = useState(false);

  useEffect(() => {
    setDate(initialDate || today);
  }, [initialDate, today]);

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

  const toggleEmotion = (emotion: GriefEmotion) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion]
    );
  };

  const handleSave = () => {
    if (!summary.trim() || selectedEmotions.length === 0) return;
    haptic('light');
    const moodAfter = derivesMoodAfter(selectedEmotions);
    const session: TherapistSession = {
      id: generateId(),
      date,
      summary: summary.trim(),
      takeaways: takeaways.trim(),
      actionItems,
      moodAfter,
      emotions: selectedEmotions,
      createdAt: new Date().toISOString(),
    };
    onSave(session);
  };

  const canSave = summary.trim() && selectedEmotions.length > 0;

  return (
    <div className="space-y-3 bg-[var(--surface-inset)] rounded-[var(--radius-md)] p-3">
      <h4 className="type-label text-[var(--text-primary)] font-medium">Log Session</h4>

      {lastSessionPrepNotes && lastSessionPrepNotes.length > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <button
            onClick={() => {
              haptic('light');
              setShowLastSessionPrep(prev => !prev);
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="type-caption font-medium text-[var(--text-secondary)]">
              Last session&apos;s prep
            </span>
            {showLastSessionPrep ? (
              <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
            )}
          </button>
          {showLastSessionPrep && (
            <div className="space-y-1 border-t border-[var(--border-subtle)] px-3 py-2">
              {lastSessionPrepNotes.map(note => (
                <div key={note.id} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${note.discussed ? 'bg-[var(--status-success)]' : 'bg-[var(--accent-primary)]'}`} />
                  <span className={note.discussed ? 'line-through opacity-70' : ''}>{note.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Emotions (replaces mood selector) */}
      <div>
        <label className="type-caption text-[var(--text-tertiary)] block mb-1.5">How do you feel after?</label>
        <EmotionPicker selected={selectedEmotions} onToggle={toggleEmotion} />
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

// ─── Session Frequency Insight ──────────────────────────────────

function SessionFrequencyInsight({ sessions }: { sessions: TherapistSession[] }) {
  if (sessions.length === 0) return null;

  const sorted = [...sessions].sort(
    (a, b) => safeTime(b.date) - safeTime(a.date)
  );

  const today = startOfDay(new Date());
  const lastSessionDate = startOfDay(parseISO(sorted[0].date));
  const daysSinceLast = differenceInDays(today, lastSessionDate);

  if (sessions.length === 1) {
    return (
      <p className="type-caption text-[var(--text-tertiary)]">
        Last session: {daysSinceLast} day{daysSinceLast !== 1 ? 's' : ''} ago
      </p>
    );
  }

  // Compute average gap
  let totalGap = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = startOfDay(parseISO(sorted[i].date));
    const b = startOfDay(parseISO(sorted[i + 1].date));
    totalGap += differenceInDays(a, b);
  }
  const avgGap = Math.round(totalGap / (sorted.length - 1));

  return (
    <p className="type-caption text-[var(--text-tertiary)]">
      Last session: {daysSinceLast} day{daysSinceLast !== 1 ? 's' : ''} ago — Avg: every {avgGap} day{avgGap !== 1 ? 's' : ''}
    </p>
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
    (a, b) => safeTime(b.date) - safeTime(a.date)
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
      <SessionFrequencyInsight sessions={sessions} />
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

                  {/* Emotions */}
                  {session.emotions && session.emotions.length > 0 && (
                    <div>
                      <span className="type-caption text-[var(--text-tertiary)] block mb-1">Feeling after</span>
                      <EmotionTags emotions={session.emotions} />
                    </div>
                  )}

                  {/* Takeaways */}
                  {session.takeaways && (
                    <div>
                      <span className="type-caption text-[var(--text-tertiary)] block mb-0.5">Key Takeaways</span>
                      <p className="type-body text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                        {session.takeaways}
                      </p>
                    </div>
                  )}

                  {session.prepNotesSnapshot && session.prepNotesSnapshot.length > 0 && (
                    <div>
                      <span className="type-caption text-[var(--text-tertiary)] block mb-1">
                        Prep Notes From That Session
                      </span>
                      <div className="space-y-1.5">
                        {session.prepNotesSnapshot.map(note => (
                          <div key={note.id} className="flex items-start gap-2">
                            <span className={`mt-1 h-1.5 w-1.5 rounded-full ${note.discussed ? 'bg-[var(--status-success)]' : 'bg-[var(--accent-primary)]'}`} />
                            <span
                              className={`type-body text-sm ${
                                note.discussed
                                  ? 'line-through text-[var(--text-tertiary)]'
                                  : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {note.text}
                            </span>
                          </div>
                        ))}
                      </div>
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

// Detect therapy-related calendar events
const THERAPY_KEYWORDS = ['therapy', 'therapist', 'brian mandel', 'brian m', 'betterhelp', 'counseling'];

function isTherapyEvent(event: CalendarEvent): boolean {
  const text = `${event.title} ${event.description || ''}`.toLowerCase();
  return THERAPY_KEYWORDS.some(kw => text.includes(kw));
}

function CalendarTherapySuggestion({
  event,
  onAccept,
}: {
  event: CalendarEvent;
  onAccept: () => void;
}) {
  return (
    <div className="bg-[var(--accent-muted)] border border-[var(--accent-primary)]/20 rounded-[var(--radius-md)] p-3 space-y-2">
      <p className="type-caption text-[var(--text-secondary)]">
        Found a therapy event on your calendar:
      </p>
      <p className="type-body text-sm text-[var(--text-primary)] font-medium">
        {event.title} — {format(parseISO(event.date), 'EEE, MMM d')}{event.startTime ? ` at ${event.startTime}` : ''}
      </p>
      <button
        onClick={() => { haptic('light'); onAccept(); }}
        className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
      >
        Set as next session
      </button>
    </div>
  );
}

export function TherapistTracker({ data, onUpdate, journalEntries, calendarEvents }: TherapistTrackerProps) {
  const [showNewSession, setShowNewSession] = useState(false);
  const [draftSessionDate, setDraftSessionDate] = useState<string | undefined>(undefined);
  const [recentlyLoggedSessionDate, setRecentlyLoggedSessionDate] = useState<string | null>(null);
  const [dismissedCalEventIds, setDismissedCalEventIds] = useState<string[]>([]);
  const prepInputRef = useRef<HTMLInputElement | null>(null);

  const lastSession = (data.sessions || [])
    .slice()
    .sort((a, b) => safeTime(b.date) - safeTime(a.date))[0];

  const scheduledSessionIsDue = (() => {
    if (!data.nextSession?.date) return false;
    return data.nextSession.date <= format(new Date(), 'yyyy-MM-dd');
  })();

  // Find upcoming therapy events from calendar that aren't already linked to nextSession
  const upcomingTherapyEvent = (calendarEvents || [])
    .filter(e => {
      if (!isTherapyEvent(e)) return false;
      // Must be in the future
      if (e.date < format(new Date(), 'yyyy-MM-dd')) return false;
      // Not already linked as next session
      if (data.nextSession?.googleCalendarEventId === e.googleCalendarEventId) return false;
      if (data.nextSession?.date === e.date && data.nextSession?.time === e.startTime) return false;
      // Not dismissed
      if (dismissedCalEventIds.includes(e.id)) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const handleAcceptCalendarEvent = (event: CalendarEvent) => {
    onUpdate({
      nextSession: {
        date: event.date,
        time: event.startTime || '',
        notes: event.description || '',
        googleCalendarEventId: event.googleCalendarEventId,
      },
    });
  };

  const handleNextSessionUpdate = (next: TherapistData['nextSession']) => {
    if (next) {
      setRecentlyLoggedSessionDate(null);
    }
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
    const prepNotesSnapshot = (data.prepNotes || []).map(note => ({ ...note }));
    const carryForwardPrepNotes = prepNotesSnapshot
      .filter(note => !note.discussed)
      .map(note => ({ ...note, discussed: false }));

    if (data.nextSession?.googleCalendarEventId) {
      deleteGoogleCalendarEvent(data.nextSession.googleCalendarEventId).catch(err =>
        console.warn('Failed to delete Google Calendar event:', err)
      );
    }

    onUpdate({
      sessions: [...(data.sessions || []), { ...session, prepNotesSnapshot }],
      prepNotes: carryForwardPrepNotes,
      nextSession: undefined,
    });
    setShowNewSession(false);
    setDraftSessionDate(undefined);
    setRecentlyLoggedSessionDate(session.date);
  };

  const handleOpenLogSession = (date?: string) => {
    haptic('light');
    setDraftSessionDate(date || data.nextSession?.date || format(new Date(), 'yyyy-MM-dd'));
    setShowNewSession(true);
  };

  const handleToggleAction = (sessionId: string, actionId: string) => {
    const updated = (data.sessions || []).map(s => {
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
      {/* A. Open Action Items Banner */}
      <OpenActionItemsBanner
        sessions={data.sessions || []}
        onToggleAction={handleToggleAction}
      />

      {/* Calendar → Therapy suggestion */}
      {upcomingTherapyEvent && !data.nextSession && (
        <CalendarTherapySuggestion
          event={upcomingTherapyEvent}
          onAccept={() => handleAcceptCalendarEvent(upcomingTherapyEvent)}
        />
      )}

      {/* B. Next Session */}
      {recentlyLoggedSessionDate && !data.nextSession && (
        <div className="rounded-[var(--radius-md)] border border-[var(--accent-primary)]/20 bg-[var(--accent-muted)] p-3">
          <p className="type-body text-sm font-medium text-[var(--text-primary)]">
            Session logged for {format(parseISO(recentlyLoggedSessionDate), 'MMM d')}.
          </p>
          <p className="type-caption mt-1 text-[var(--text-secondary)]">
            Schedule the next session when you&apos;re ready so this cycle stays current.
          </p>
        </div>
      )}
      <NextSessionSection
        nextSession={data.nextSession}
        onUpdate={handleNextSessionUpdate}
        onAddPrepNote={handleAddPrepNote}
        onLogSession={handleOpenLogSession}
      />

      {/* C. Prep Notes */}
      <PrepNotesSection
        prepNotes={data.prepNotes || []}
        onUpdate={handlePrepNotesUpdate}
        inputRef={prepInputRef}
        journalEntries={journalEntries}
      />

      {/* D. Log Session */}
      <div className="space-y-2">
        <h3 className="type-label text-[var(--text-secondary)] flex items-center gap-1.5">
          <Plus size={14} className="text-[var(--accent-primary)]" />
          Log Session
        </h3>
        {data.nextSession && (
          <div className={`rounded-[var(--radius-md)] border p-3 ${
            scheduledSessionIsDue
              ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]'
              : 'border-[var(--border-subtle)] bg-[var(--surface-card)]'
          }`}>
            <p className="type-body text-sm text-[var(--text-primary)] font-medium">
              {scheduledSessionIsDue ? 'This session is ready to log.' : 'A session is scheduled.'}
            </p>
            <p className="type-caption text-[var(--text-secondary)] mt-1">
              Logging it will move it into history, clear the next-session slot, and carry forward any undiscussed prep notes.
            </p>
            <button
              onClick={() => handleOpenLogSession(data.nextSession?.date)}
              className={`mt-3 w-full rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors ${
                scheduledSessionIsDue
                  ? 'bg-[var(--accent-primary)] text-white hover:opacity-90'
                  : 'bg-[var(--surface-inset)] text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
              }`}
            >
              Log this session
            </button>
          </div>
        )}
        {showNewSession ? (
          <NewSessionForm
            onSave={handleSaveSession}
            onCancel={() => {
              setShowNewSession(false);
              setDraftSessionDate(undefined);
            }}
            initialDate={draftSessionDate}
            lastSessionPrepNotes={lastSession?.prepNotesSnapshot}
          />
        ) : (
          <button
            onClick={() => handleOpenLogSession()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-tertiary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Plus size={14} />
            Log a session
          </button>
        )}
      </div>

      {/* E. Session History */}
      <SessionHistory
        sessions={data.sessions || []}
        onToggleAction={handleToggleAction}
      />
    </div>
  );
}
