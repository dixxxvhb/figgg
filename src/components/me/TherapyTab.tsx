import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronUp, ChevronLeft, Send, Trash2, Calendar } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { haptic } from '../../utils/haptics';
import { MoodSelector } from './MoodSelector';
import type { TherapySessionNote, TherapyWeekNote, MoodRating } from '../../types';

const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type SubView = 'main' | 'newSession' | 'viewSession';

export function TherapyTab() {
  const { data, updateSelfCare } = useAppData();
  const [subView, setSubView] = useState<SubView>('main');
  const [viewingSession, setViewingSession] = useState<TherapySessionNote | null>(null);
  const [weekNoteText, setWeekNoteText] = useState('');
  const [showAllNotes, setShowAllNotes] = useState(false);

  const therapy = data.selfCare?.therapy || { sessions: [], weekNotes: [] };
  const sessions = useMemo(() =>
    [...therapy.sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [therapy.sessions]
  );
  const weekNotes = useMemo(() =>
    [...therapy.weekNotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [therapy.weekNotes]
  );
  const visibleWeekNotes = showAllNotes ? weekNotes : weekNotes.slice(0, 5);

  const addWeekNote = () => {
    if (!weekNoteText.trim()) return;
    const note: TherapyWeekNote = {
      id: `tnote_${Date.now()}`,
      date: getTodayKey(),
      text: weekNoteText.trim(),
      createdAt: new Date().toISOString(),
    };
    updateSelfCare({
      therapy: { ...therapy, weekNotes: [...therapy.weekNotes, note] },
    });
    setWeekNoteText('');
    haptic('light');
  };

  const deleteWeekNote = (id: string) => {
    updateSelfCare({
      therapy: { ...therapy, weekNotes: therapy.weekNotes.filter(n => n.id !== id) },
    });
    haptic('light');
  };

  const saveSession = (session: TherapySessionNote) => {
    const existing = therapy.sessions;
    const idx = existing.findIndex(s => s.id === session.id);
    const updated = idx >= 0
      ? existing.map(s => s.id === session.id ? { ...session, updatedAt: new Date().toISOString() } : s)
      : [...existing, session];
    updateSelfCare({ therapy: { ...therapy, sessions: updated } });
    haptic('medium');
    setSubView('main');
  };

  const deleteSession = (id: string) => {
    updateSelfCare({
      therapy: { ...therapy, sessions: therapy.sessions.filter(s => s.id !== id) },
    });
    haptic('medium');
    setSubView('main');
    setViewingSession(null);
  };

  // New session form
  if (subView === 'newSession') {
    return (
      <SessionEditor
        weekNotes={weekNotes}
        onSave={saveSession}
        onBack={() => setSubView('main')}
      />
    );
  }

  // View session
  if (subView === 'viewSession' && viewingSession) {
    return (
      <SessionDetail
        session={viewingSession}
        onEdit={(s) => { setViewingSession(s); }}
        onSave={saveSession}
        onDelete={() => deleteSession(viewingSession.id)}
        onBack={() => { setSubView('main'); setViewingSession(null); }}
      />
    );
  }

  // Main view
  return (
    <div className="space-y-4 pb-8">
      {/* Quick week note capture */}
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
        <div className="type-label text-[var(--text-tertiary)] mb-2">Quick Note</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={weekNoteText}
            onChange={e => setWeekNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addWeekNote(); }}
            placeholder="Something to bring up in therapy..."
            className="flex-1 bg-[var(--surface-inset)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none min-h-[44px]"
          />
          <button
            onClick={addWeekNote}
            disabled={!weekNoteText.trim()}
            className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl px-3 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Week notes list */}
      {weekNotes.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="type-label text-[var(--text-tertiary)]">Week Notes ({weekNotes.length})</span>
          </div>
          <div className="border-t border-[var(--border-subtle)]">
            {visibleWeekNotes.map(note => (
              <div key={note.id} className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)]">{note.text}</div>
                  <div className="type-caption text-[var(--text-tertiary)] mt-0.5">{formatDate(note.date)}</div>
                </div>
                <button
                  onClick={() => deleteWeekNote(note.id)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--status-danger)] min-w-[32px] min-h-[32px] flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {weekNotes.length > 5 && (
            <button
              onClick={() => setShowAllNotes(a => !a)}
              className="w-full px-4 py-2.5 flex items-center justify-center gap-1 text-[var(--accent-primary)] text-xs font-medium border-t border-[var(--border-subtle)]"
            >
              {showAllNotes ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {weekNotes.length}</>}
            </button>
          )}
        </div>
      )}

      {/* New session button */}
      <button
        onClick={() => setSubView('newSession')}
        className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-2xl py-3.5 px-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
      >
        <Plus size={18} />
        Log Session
      </button>

      {/* Past sessions */}
      {sessions.length > 0 && (
        <div>
          <div className="type-label text-[var(--text-tertiary)] mb-2">Sessions</div>
          <div className="space-y-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => { setViewingSession(session); setSubView('viewSession'); }}
                className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="type-label text-[var(--text-tertiary)]">{formatDate(session.date)}</span>
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: MOOD_COLORS[session.mood - 1] }}
                  />
                </div>
                {session.takeaways && (
                  <div className="text-sm text-[var(--text-secondary)] line-clamp-2">{session.takeaways}</div>
                )}
                {!session.takeaways && session.sessionNotes && (
                  <div className="text-sm text-[var(--text-secondary)] line-clamp-2">{session.sessionNotes}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mood trend (last sessions) */}
      {sessions.length >= 3 && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
          <div className="type-label text-[var(--text-tertiary)] mb-3">Mood Trend</div>
          <div className="flex items-end gap-1 h-16">
            {sessions.slice(0, 14).reverse().map(s => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm min-w-[4px]"
                  style={{
                    height: `${(s.mood / 5) * 100}%`,
                    backgroundColor: MOOD_COLORS[s.mood - 1],
                    opacity: 0.8,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="type-caption text-[var(--text-tertiary)]">Oldest</span>
            <span className="type-caption text-[var(--text-tertiary)]">Latest</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Session Editor =====

interface SessionEditorProps {
  weekNotes: TherapyWeekNote[];
  onSave: (session: TherapySessionNote) => void;
  onBack: () => void;
  existing?: TherapySessionNote;
}

function SessionEditor({ weekNotes, onSave, onBack, existing }: SessionEditorProps) {
  const [date, setDate] = useState(existing?.date || getTodayKey());
  const [preSessionNotes, setPreSessionNotes] = useState(
    existing?.preSessionNotes || weekNotes.map(n => `- ${n.text}`).join('\n')
  );
  const [sessionNotes, setSessionNotes] = useState(existing?.sessionNotes || '');
  const [mood, setMood] = useState<MoodRating | undefined>(existing?.mood);
  const [moodLabel, setMoodLabel] = useState(existing?.moodLabel || '');
  const [takeaways, setTakeaways] = useState(existing?.takeaways || '');

  const handleSave = () => {
    if (!sessionNotes.trim() || !mood) return;
    const session: TherapySessionNote = {
      id: existing?.id || `tsession_${Date.now()}`,
      date,
      preSessionNotes,
      sessionNotes,
      mood,
      moodLabel: moodLabel.trim() || undefined,
      takeaways: takeaways.trim() || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(session);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-[var(--accent-primary)] min-h-[44px]">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <button
          onClick={handleSave}
          disabled={!sessionNotes.trim() || !mood}
          className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 min-h-[44px]"
        >
          Save Session
        </button>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-[var(--text-tertiary)]" />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-[var(--surface-inset)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none min-h-[44px]"
        />
      </div>

      {/* Pre-session notes */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">Pre-session Notes</div>
        <textarea
          value={preSessionNotes}
          onChange={e => setPreSessionNotes(e.target.value)}
          placeholder="Things on your mind going in..."
          className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none min-h-[100px] leading-relaxed"
        />
      </div>

      {/* Session notes */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">Session Notes</div>
        <textarea
          value={sessionNotes}
          onChange={e => setSessionNotes(e.target.value)}
          placeholder="What came up during the session..."
          className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none min-h-[150px] leading-relaxed"
          autoFocus
        />
      </div>

      {/* Mood */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">How did you feel after?</div>
        <MoodSelector value={mood} onChange={m => setMood(m as MoodRating)} />
        <input
          type="text"
          value={moodLabel}
          onChange={e => setMoodLabel(e.target.value)}
          placeholder="In a word... (optional)"
          className="mt-2 w-full bg-[var(--surface-inset)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none min-h-[44px]"
        />
      </div>

      {/* Takeaways */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">Key Takeaways</div>
        <textarea
          value={takeaways}
          onChange={e => setTakeaways(e.target.value)}
          placeholder="What to remember from this session..."
          className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none min-h-[80px] leading-relaxed"
        />
      </div>
    </div>
  );
}

// ===== Session Detail =====

interface SessionDetailProps {
  session: TherapySessionNote;
  onEdit: (session: TherapySessionNote) => void;
  onSave: (session: TherapySessionNote) => void;
  onDelete: () => void;
  onBack: () => void;
}

function SessionDetail({ session, onSave, onDelete, onBack }: SessionDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(session.sessionNotes);
  const [takeaways, setTakeaways] = useState(session.takeaways || '');

  if (isEditing) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 text-[var(--accent-primary)] min-h-[44px]">
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Cancel</span>
          </button>
          <button
            onClick={() => {
              onSave({ ...session, sessionNotes, takeaways: takeaways.trim() || undefined });
              setIsEditing(false);
            }}
            className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl px-4 py-2 text-sm font-semibold min-h-[44px]"
          >
            Save
          </button>
        </div>
        <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] outline-none resize-none min-h-[150px] leading-relaxed" />
        <div>
          <div className="type-label text-[var(--text-tertiary)] mb-2">Takeaways</div>
          <textarea value={takeaways} onChange={e => setTakeaways(e.target.value)} className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] outline-none resize-none min-h-[80px] leading-relaxed" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-[var(--accent-primary)] min-h-[44px]">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsEditing(true)} className="text-[var(--accent-primary)] text-sm font-medium min-h-[44px] px-3">Edit</button>
          <button onClick={onDelete} className="text-[var(--status-danger)] text-sm font-medium min-h-[44px] px-3">Delete</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="type-label text-[var(--text-tertiary)]">{formatDate(session.date)}</span>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MOOD_COLORS[session.mood - 1] }} />
        {session.moodLabel && <span className="type-caption text-[var(--text-secondary)]">{session.moodLabel}</span>}
      </div>

      {session.preSessionNotes && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
          <div className="type-label text-[var(--text-tertiary)] mb-2">Going In</div>
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{session.preSessionNotes}</div>
        </div>
      )}

      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
        <div className="type-label text-[var(--text-tertiary)] mb-2">Session Notes</div>
        <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{session.sessionNotes}</div>
      </div>

      {session.takeaways && (
        <div className="bg-[var(--accent-muted)] rounded-2xl p-4">
          <div className="type-label text-[var(--accent-primary)] mb-2">Takeaways</div>
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{session.takeaways}</div>
        </div>
      )}
    </div>
  );
}
