import { useState, useRef, useEffect } from 'react';
import { Send, Clock, CheckCircle, Lightbulb, AlertCircle, Pencil, Trash2, Check, X, StickyNote } from 'lucide-react';
import { LiveNote, normalizeNoteCategory } from '../../types';
import { safeFormat } from '../../utils/time';
import { v4 as uuid } from 'uuid';
import { EmptyState } from './EmptyState';

// Shared across LiveNotes and EventNotes
export const QUICK_TAGS = [
  { id: 'worked-on', label: 'Worked On', icon: CheckCircle, color: 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' },
  { id: 'needs-work', label: 'Needs More Work', icon: AlertCircle, color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]' },
  { id: 'next-week', label: 'Next Week', icon: Clock, color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
] as const;

export type QuickTag = typeof QUICK_TAGS[number];

// --- Autocomplete types ---
export interface AutocompleteSuggestion {
  id: string;
  term: string;
  pronunciation?: string;
  categoryLabel?: string;
}

export interface AutocompleteConfig {
  /** Called when text changes — return suggestions (or empty array). */
  getSuggestions: (text: string, selectedTag?: string) => AutocompleteSuggestion[];
  /** Delay (ms) before calling getSuggestions. Default: 200 */
  debounceMs?: number;
}

// --- NoteInput props ---
export interface NoteInputProps {
  notes: LiveNote[];
  onSaveNote: (note: LiveNote) => void;
  onDeleteNote: (noteId: string) => void;
  onEditNote?: (noteId: string, newText: string) => void;
  /** Placeholder for the input field */
  placeholder?: string;
  /** Optional terminology autocomplete */
  autocomplete?: AutocompleteConfig;
  /** Extra content rendered per-note (e.g. "Reminder created" badge) */
  renderNoteExtra?: (note: LiveNote) => React.ReactNode;
  /** If true, show a read-only collapsed view (notes already saved) */
  savedMode?: boolean;
  /** Children rendered between notes list and input (e.g. next-week goal) */
  children?: React.ReactNode;
}

// ─── Notes List ────────────────────────────────────────────────────
function NotesList({
  notes,
  onDeleteNote,
  onEditNote,
  renderNoteExtra,
  savedMode,
}: Pick<NoteInputProps, 'notes' | 'onDeleteNote' | 'onEditNote' | 'renderNoteExtra' | 'savedMode'>) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (note: LiveNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    if (!editingNoteId || !editText.trim() || !onEditNote) return;
    onEditNote(editingNoteId, editText.trim());
    setEditingNoteId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="No notes yet"
        description="Start typing below to add notes"
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]">
      {notes.map(note => {
        const tag = QUICK_TAGS.find(t => t.id === normalizeNoteCategory(note.category));
        const isEditing = editingNoteId === note.id;

        return (
          <div
            key={note.id}
            className={`group relative px-3 py-2.5 ${
              savedMode
                ? 'opacity-85'
                : isEditing
                  ? 'bg-[var(--accent-muted)]/50'
                  : 'hover:bg-[var(--surface-inset)]/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {tag ? (
                    <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${tag.color}`}>
                      <tag.icon size={11} />
                      {!savedMode && tag.label}
                    </span>
                  ) : (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--border-strong)]" />
                  )}
                {isEditing && onEditNote ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                      else if (e.key === 'Escape') { cancelEdit(); }
                    }}
                    autoFocus
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-transparent focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className={`${savedMode ? 'text-sm' : 'text-sm'} leading-5 text-[var(--text-primary)]`}>
                      {note.text}
                    </p>
                    {renderNoteExtra?.(note)}
                  </div>
                )}
                </div>
              </div>
              <div className="flex items-start gap-1">
                <div className="whitespace-nowrap pt-0.5 text-[11px] text-[var(--text-tertiary)]">
                  {safeFormat(note.timestamp, 'h:mm a')}
                </div>
                {!savedMode && (
                  isEditing && onEditNote ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-[var(--accent-primary)] transition-colors hover:bg-[var(--surface-card)] hover:text-[var(--accent-primary-hover)]"
                        title="Save edit"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-card)] hover:text-[var(--status-danger)]"
                        title="Cancel edit"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      {onEditNote && (
                        <button
                          onClick={() => startEdit(note)}
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-[var(--text-tertiary)] opacity-80 transition-colors hover:bg-[var(--surface-card)] hover:text-[var(--accent-primary)] sm:opacity-0 sm:group-hover:opacity-100"
                          title="Edit note"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg p-2 text-[var(--text-tertiary)] opacity-80 transition-colors hover:bg-[var(--surface-card)] hover:text-[var(--status-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Input Bar (tags + text + send) ────────────────────────────────
function InputBar({
  onSaveNote,
  placeholder = 'Add a note...',
  autocomplete,
  selectedTag,
  setSelectedTag,
}: {
  onSaveNote: (note: LiveNote) => void;
  placeholder?: string;
  autocomplete?: AutocompleteConfig;
  selectedTag: string | undefined;
  setSelectedTag: (tag: string | undefined) => void;
}) {
  const [noteText, setNoteText] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setNoteText(newText);
    setSelectedSuggestionIndex(-1);

    if (!autocomplete) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const results = autocomplete.getSuggestions(newText, selectedTag);
      setSuggestions(results);
    }, autocomplete.debounceMs ?? 200);
  };

  const applySuggestion = (term: string) => {
    const words = noteText.split(/\s+/);
    words[words.length - 1] = term;
    const newText = words.join(' ') + ' ';
    setNoteText(newText);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  const submitNote = () => {
    if (!noteText.trim()) return;

    const newNote: LiveNote = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      text: noteText.trim(),
      category: selectedTag as LiveNote['category'],
    };

    onSaveNote(newNote);
    setNoteText('');
    setSelectedTag(undefined);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete keyboard navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIndex].term);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitNote();
    }
  };

  return (
    <>
      {/* Quick Tags */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {QUICK_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setSelectedTag(selectedTag === tag.id ? undefined : tag.id)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm whitespace-nowrap transition-all ${
              selectedTag === tag.id
                ? tag.color + ' shadow-sm'
                : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)]'
            }`}
          >
            <tag.icon size={14} />
            {tag.label}
          </button>
        ))}
      </div>

      {/* Text Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative" ref={inputWrapperRef}>
          <input
            type="text"
            value={noteText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={autocomplete ? () => {
              setTimeout(() => {
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
              }, 150);
            } : undefined}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            className="w-full px-4 py-3 border border-[var(--border-subtle)] rounded-xl focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
          />
          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-10 max-h-[300px] overflow-y-auto">
              {suggestions.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(entry.term);
                  }}
                  className={`w-full text-left px-4 py-3 min-h-[44px] transition-colors flex items-center justify-between ${
                    index === selectedSuggestionIndex
                      ? 'bg-[var(--surface-highlight)]'
                      : 'hover:bg-[var(--surface-inset)]'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {entry.term}
                    </span>
                    {entry.pronunciation && (
                      <span className="text-xs text-[var(--text-tertiary)] ml-2">
                        ({entry.pronunciation})
                      </span>
                    )}
                  </div>
                  {entry.categoryLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] ml-2 flex-shrink-0">
                      {entry.categoryLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={submitNote}
          disabled={!noteText.trim()}
          className="px-4 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-xl disabled:opacity-50 hover:bg-[var(--accent-secondary)] transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </>
  );
}

// ─── Main NoteInput component ──────────────────────────────────────
export function NoteInput({
  notes,
  onSaveNote,
  onDeleteNote,
  onEditNote,
  placeholder,
  autocomplete,
  renderNoteExtra,
  savedMode,
  children,
}: NoteInputProps) {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  return (
    <>
      {/* Notes list area (rendered by parent in the scrollable area) */}
      <NotesList
        notes={notes}
        onDeleteNote={onDeleteNote}
        onEditNote={onEditNote}
        renderNoteExtra={renderNoteExtra}
        savedMode={savedMode}
      />

      {/* Extra content between notes and input (e.g. next-week goal) */}
      {children}

      {/* Input bar is rendered separately — parent wraps it in their bottom sticky area */}
    </>
  );
}

// Export InputBar separately so parents can place it in their sticky footer
export { NotesList, InputBar };
