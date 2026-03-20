import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, BookOpen, Lightbulb, X } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { haptic } from '../../utils/haptics';
import { MoodSelector } from './MoodSelector';
import type { JournalEntry, MoodRating } from '../../types';

const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

const DEFAULT_PROMPTS = [
  'What am I feeling right now?',
  'What would I tell my past self?',
  'What small thing went well today?',
  'What am I holding onto that I can let go of?',
  'What does moving forward look like for me?',
];

const TAG_OPTIONS = ['grief', 'progress', 'gratitude', 'anxiety', 'clarity', 'growth', 'memory', 'hope'];

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function JournalTab() {
  const { data, updateSelfCare } = useAppData();
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  const entries = useMemo(() =>
    [...(data.selfCare?.journal?.entries || [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data.selfCare?.journal?.entries]
  );

  const saveEntry = (entry: JournalEntry) => {
    const existing = data.selfCare?.journal?.entries || [];
    const idx = existing.findIndex(e => e.id === entry.id);
    const updated = idx >= 0
      ? existing.map(e => e.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : e)
      : [...existing, entry];
    updateSelfCare({ journal: { ...data.selfCare?.journal, entries: updated } });
    haptic('medium');
    setEditingEntry(null);
    setIsNew(false);
  };

  const deleteEntry = (id: string) => {
    const existing = data.selfCare?.journal?.entries || [];
    updateSelfCare({ journal: { ...data.selfCare?.journal, entries: existing.filter(e => e.id !== id) } });
    haptic('medium');
    setEditingEntry(null);
    setIsNew(false);
  };

  const startNew = () => {
    const entry: JournalEntry = {
      id: `journal_${Date.now()}`,
      date: getTodayKey(),
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingEntry(entry);
    setIsNew(true);
  };

  // Edit/write view
  if (editingEntry) {
    return (
      <JournalEditor
        entry={editingEntry}
        isNew={isNew}
        onSave={saveEntry}
        onDelete={!isNew ? () => deleteEntry(editingEntry.id) : undefined}
        onBack={() => { setEditingEntry(null); setIsNew(false); }}
        showPrompts={showPrompts}
        onTogglePrompts={() => setShowPrompts(p => !p)}
      />
    );
  }

  // Entry list view
  return (
    <div className="space-y-3 pb-8">
      {/* New entry button */}
      <button
        onClick={startNew}
        className="w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-2xl py-3.5 px-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform min-h-[48px]"
      >
        <Plus size={18} />
        New Entry
      </button>

      {entries.length === 0 && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-8 text-center">
          <BookOpen size={32} className="mx-auto text-[var(--text-tertiary)] mb-3" />
          <div className="text-[var(--text-secondary)] text-sm">Your journal is empty.</div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1">Start writing when you're ready.</div>
        </div>
      )}

      {entries.map(entry => (
        <button
          key={entry.id}
          onClick={() => { setEditingEntry(entry); setIsNew(false); }}
          className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="type-label text-[var(--text-tertiary)]">{formatDate(entry.date)}</span>
            <div className="flex items-center gap-1.5">
              {entry.mood && (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: MOOD_COLORS[entry.mood - 1] }}
                />
              )}
            </div>
          </div>
          {entry.title && (
            <div className="font-semibold text-[var(--text-primary)] text-sm mb-0.5">{entry.title}</div>
          )}
          <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
            {entry.content || 'Empty entry'}
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="type-caption px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">{tag}</span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

interface JournalEditorProps {
  entry: JournalEntry;
  isNew: boolean;
  onSave: (entry: JournalEntry) => void;
  onDelete?: () => void;
  onBack: () => void;
  showPrompts: boolean;
  onTogglePrompts: () => void;
}

function JournalEditor({ entry, isNew, onSave, onDelete, onBack, showPrompts, onTogglePrompts }: JournalEditorProps) {
  const [title, setTitle] = useState(entry.title || '');
  const [content, setContent] = useState(entry.content);
  const [mood, setMood] = useState<MoodRating | undefined>(entry.mood);
  const [tags, setTags] = useState<string[]>(entry.tags || []);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({ ...entry, title: title.trim() || undefined, content, mood, tags: tags.length > 0 ? tags : undefined });
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const applyPrompt = (prompt: string) => {
    setContent(prev => prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`);
    onTogglePrompts();
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-[var(--accent-primary)] min-h-[44px] min-w-[44px]">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete} className="text-[var(--status-danger)] text-sm font-medium min-h-[44px] px-3">
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 min-h-[44px]"
          >
            Save
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="type-label text-[var(--text-tertiary)]">{formatDate(entry.date)}</div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full bg-transparent text-lg font-display font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write whatever comes to mind..."
        className="w-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none min-h-[200px] leading-relaxed"
        autoFocus={isNew}
      />

      {/* Prompts toggle */}
      <button
        onClick={onTogglePrompts}
        className="flex items-center gap-2 text-[var(--accent-primary)] text-sm font-medium min-h-[44px]"
      >
        <Lightbulb size={16} />
        {showPrompts ? 'Hide prompts' : 'Need a prompt?'}
      </button>

      {showPrompts && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-3 space-y-1">
          {DEFAULT_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => applyPrompt(prompt)}
              className="w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 px-3 rounded-xl hover:bg-[var(--accent-muted)] transition-colors min-h-[44px]"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Mood */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">Mood</div>
        <MoodSelector value={mood} onChange={(m) => setMood(m as MoodRating)} />
      </div>

      {/* Tags */}
      <div>
        <div className="type-label text-[var(--text-tertiary)] mb-2">Tags</div>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                tags.includes(tag)
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
