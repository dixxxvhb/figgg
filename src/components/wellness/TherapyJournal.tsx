import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Heart, RefreshCw, Plus, ChevronRight,
  Pencil, X, ArrowLeft,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { generateId } from '../../utils/id';
import type {
  GriefData,
  GriefLetter,
  GriefEmotionalCheckin,
  GriefEmotion,
} from '../../types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TherapyJournalProps {
  data: GriefData;
  onUpdate: (updates: Partial<GriefData>) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

type SubTab = 'entries' | 'feelings' | 'affirmations';

const PROMPT_CATEGORIES: { key: string; label: string; prompts: string[] }[] = [
  {
    key: 'grief',
    label: 'Grief',
    prompts: [
      "What's taking up the most space in my mind right now?",
      'What am I avoiding thinking about?',
      'What would I tell a friend going through this?',
      "What do I need right now that I'm not giving myself?",
      "What felt different about today?",
      "What am I grateful for, even in the hard stuff?",
      "What do I want her to know?",
      "What's a memory I keep coming back to?",
    ],
  },
  {
    key: 'therapy',
    label: 'Therapy',
    prompts: [
      "What came up in my last session that I'm still thinking about?",
      "What pattern am I starting to notice?",
      "What am I avoiding bringing up in therapy?",
      "What would I say if I was being completely honest?",
      "What did I learn about myself recently?",
    ],
  },
  {
    key: 'stress',
    label: 'Stress',
    prompts: [
      "What's weighing on me most right now?",
      "What can I actually control in this situation?",
      "What would make tomorrow 10% easier?",
      "Where am I overextending myself?",
      "What boundary do I need to set?",
    ],
  },
  {
    key: 'identity',
    label: 'Identity',
    prompts: [
      "Who am I becoming through all of this?",
      "What old story about myself is no longer true?",
      "What would the version of me I'm growing into do?",
      "What am I most afraid of right now?",
      "What am I most excited about right now?",
    ],
  },
];

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
  all_of_it: 'All of it at once',
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

const EMOTION_GROUPS: { label: string; emotions: GriefEmotion[] }[] = [
  { label: 'Difficult', emotions: ['numb', 'angry', 'sad', 'anxious', 'guilty', 'overwhelmed', 'disconnected'] },
  { label: 'Positive', emotions: ['peaceful', 'grateful', 'hopeful', 'relieved', 'creative'] },
  { label: '', emotions: ['all_of_it', 'dont_know'] },
];

const AFFIRMATIONS = [
  "You don't have to be productive today.",
  "It's okay to laugh. It doesn't mean you've forgotten.",
  "You're allowed to be angry about this.",
  'Crying in the car counts as processing.',
  "You don't have to explain how you're feeling to anyone.",
  "Being far from home right now is hard. You're doing what you can.",
  "You can miss her while she's still here. That's allowed.",
  'Some days the grief is loud. Some days it\'s quiet. Both are real.',
  "You don't have to hold it together for everyone else.",
  "Taking care of yourself is not selfish. It's how you keep showing up.",
  'There is no right way to do this.',
  "You're allowed to need help.",
  "The fact that you're here, trying, matters.",
  "You don't owe anyone a performance of being okay.",
  "Rest is not giving up. It's how you keep going.",
  "Your feelings don't need to make sense right now.",
  "It's okay to not want to talk about it.",
  'You can hold love and grief in the same hand.',
  'Some days survival is the whole victory.',
  "You don't have to earn the right to fall apart.",
  "Missing her doesn't make you weak. It makes you human.",
  "You're carrying something heavy. Of course you're tired.",
  "It's okay to need a break from being brave.",
  'You can love her and be furious at the same time.',
  "Today doesn't have to be anything more than today.",
  "Progress isn't always visible. That doesn't mean it's not happening.",
  'You are allowed to outgrow old versions of yourself.',
  "Healing isn't linear. Bad days don't erase good ones.",
  "You're doing harder things than most people realize.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function firstLine(text: string): string {
  const line = text.trim().split('\n')[0];
  return line.length > 80 ? line.slice(0, 80) + '...' : line;
}

/** Find which category a prompt belongs to, returns the key or null */
function findPromptCategory(prompt: string): string | null {
  for (const cat of PROMPT_CATEGORIES) {
    if (cat.prompts.includes(prompt)) return cat.key;
  }
  return null;
}

// ─── Sub-tab pills ───────────────────────────────────────────────────────────

const TABS: { key: SubTab; label: string }[] = [
  { key: 'entries', label: 'Entries' },
  { key: 'feelings', label: 'Feelings' },
  { key: 'affirmations', label: 'Permissions' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function TherapyJournal({ data: rawData, onUpdate }: TherapyJournalProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('entries');

  // Ensure arrays are always defined even if Firestore doc is sparse
  const data: GriefData = useMemo(() => ({
    ...rawData,
    letters: rawData.letters ?? [],
    emotionalCheckins: rawData.emotionalCheckins ?? [],
    lastPermissionSlipIndex: rawData.lastPermissionSlipIndex ?? -1,
    lastModified: rawData.lastModified ?? new Date().toISOString(),
  }), [rawData]);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); haptic('light'); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'entries' && <EntriesSection data={data} onUpdate={onUpdate} />}
      {activeTab === 'feelings' && <FeelingsSection data={data} onUpdate={onUpdate} />}
      {activeTab === 'affirmations' && <AffirmationsSection data={data} onUpdate={onUpdate} />}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// A. Journal Entries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type EntryView = 'list' | 'write' | 'read';

function EntriesSection({ data, onUpdate }: TherapyJournalProps) {
  const [view, setView] = useState<EntryView>('list');
  const [activeEntry, setActiveEntry] = useState<GriefLetter | null>(null);
  const [draft, setDraft] = useState('');
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [promptTags, setPromptTags] = useState<string[]>([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const [promptCategory, setPromptCategory] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const entries = useMemo(
    () => [...data.letters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.letters],
  );

  const filteredEntries = useMemo(
    () => tagFilter ? entries.filter(e => e.tags?.includes(tagFilter)) : entries,
    [entries, tagFilter],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    data.letters.forEach(e => e.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [data.letters]);

  const visiblePrompts = useMemo(() => {
    if (promptCategory === 'all') {
      return PROMPT_CATEGORIES.flatMap(c => c.prompts);
    }
    return PROMPT_CATEGORIES.find(c => c.key === promptCategory)?.prompts ?? [];
  }, [promptCategory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [draft, view]);

  // Focus textarea when entering write mode
  useEffect(() => {
    if ((view === 'write' || isEditing) && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [view, isEditing]);

  // Debounced auto-save
  const autoSave = useCallback(
    (content: string, entry: GriefLetter | null, prompt: string | null, tags: string[]) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        if (entry) {
          const updated = data.letters.map(l =>
            l.id === entry.id ? { ...l, content, updatedAt: now } : l,
          );
          onUpdate({ letters: updated });
        } else if (content.trim()) {
          const newEntry: GriefLetter = {
            id: generateId(),
            date: todayStr(),
            content,
            prompt,
            ...(tags.length > 0 ? { tags } : {}),
            createdAt: now,
            updatedAt: now,
          };
          onUpdate({ letters: [...data.letters, newEntry] });
          setActiveEntry(newEntry);
        }
      }, 500);
    },
    [data.letters, onUpdate],
  );

  const handleDraftChange = (value: string) => {
    setDraft(value);
    autoSave(value, isEditing ? activeEntry : (activeEntry?.id && view === 'write' ? activeEntry : null), usedPrompt, promptTags);
  };

  const startNewEntry = (prompt?: string) => {
    const catKey = prompt ? findPromptCategory(prompt) : null;
    setActiveEntry(null);
    setDraft('');
    setUsedPrompt(prompt ?? null);
    setPromptTags(catKey ? [catKey] : []);
    setShowPrompts(!prompt);
    setIsEditing(false);
    setView('write');
    haptic('light');
  };

  const openEntry = (entry: GriefLetter) => {
    setActiveEntry(entry);
    setDraft(entry.content);
    setIsEditing(false);
    setView('read');
    haptic('light');
  };

  const startEditing = () => {
    setIsEditing(true);
    setView('write');
  };

  const backToList = () => {
    clearTimeout(saveTimeoutRef.current);
    if (view === 'write' && draft.trim()) {
      const now = new Date().toISOString();
      if (activeEntry) {
        const updated = data.letters.map(l =>
          l.id === activeEntry.id ? { ...l, content: draft, updatedAt: now } : l,
        );
        onUpdate({ letters: updated });
      } else {
        const newEntry: GriefLetter = {
          id: generateId(),
          date: todayStr(),
          content: draft,
          prompt: usedPrompt,
          ...(promptTags.length > 0 ? { tags: promptTags } : {}),
          createdAt: now,
          updatedAt: now,
        };
        onUpdate({ letters: [...data.letters, newEntry] });
      }
    }
    setView('list');
    setActiveEntry(null);
    setDraft('');
    setIsEditing(false);
  };

  // ── List view ──
  if (view === 'list') {
    return (
      <div className="space-y-4">
        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => { setTagFilter(null); haptic('light'); }}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 ${
                tagFilter === null
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => { setTagFilter(tag === tagFilter ? null : tag); haptic('light'); }}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 capitalize ${
                  tagFilter === tag
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                    : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => startNewEntry()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">New Entry</span>
        </button>

        {filteredEntries.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen size={28} className="mx-auto text-[var(--text-tertiary)] opacity-40 mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">
              {tagFilter ? 'No entries with this tag.' : 'A space to process and reflect.'}
            </p>
            {!tagFilter && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
                Just for you.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => openEntry(entry)}
                className="w-full text-left p-4 rounded-[var(--radius-md)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]/50 hover:border-[var(--border-subtle)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {formatDate(entry.date)}
                    </span>
                    {entry.tags?.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {firstLine(entry.content)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Read view ──
  if (view === 'read' && activeEntry && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={backToList}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">
              {formatDate(activeEntry.date)}
            </span>
            {activeEntry.tags?.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
          {activeEntry.prompt && (
            <p className="text-xs text-[var(--text-tertiary)] italic mt-1">
              {activeEntry.prompt}
            </p>
          )}
        </div>

        <div className="py-4 min-h-[200px]">
          <p className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap font-[var(--font-display,inherit)]">
            {activeEntry.content}
          </p>
        </div>
      </div>
    );
  }

  // ── Write view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <span className="text-xs text-[var(--text-tertiary)]">
          {draft.trim() ? 'Auto-saving' : ''}
        </span>
      </div>

      {/* Writing prompts — only for new entries */}
      {showPrompts && !isEditing && !activeEntry && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">
              If you need a place to start...
            </span>
            <button
              onClick={() => setShowPrompts(false)}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              <X size={12} />
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => { setPromptCategory('all'); haptic('light'); }}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 ${
                promptCategory === 'all'
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
              }`}
            >
              All
            </button>
            {PROMPT_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setPromptCategory(cat.key); haptic('light'); }}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 ${
                  promptCategory === cat.key
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                    : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {visiblePrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => startNewEntry(prompt)}
                className="text-xs px-2.5 py-1.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]/40 hover:border-[var(--border-subtle)] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active prompt display */}
      {usedPrompt && (
        <p className="text-xs text-[var(--text-tertiary)] italic px-1">
          {usedPrompt}
        </p>
      )}

      {/* Writing area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => handleDraftChange(e.target.value)}
          placeholder="Write what's on your mind..."
          className="w-full min-h-[280px] bg-transparent text-sm text-[var(--text-secondary)] leading-[1.8] placeholder-[var(--text-tertiary)]/50 focus:outline-none resize-none font-[var(--font-display,inherit)] px-1"
        />
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// B. How I'm Feeling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function FeelingsSection({ data, onUpdate }: TherapyJournalProps) {
  const today = todayStr();
  const todayCheckin = data.emotionalCheckins.find(c => c.date === today);
  const [selectedEmotions, setSelectedEmotions] = useState<GriefEmotion[]>(
    todayCheckin?.emotions ?? [],
  );
  const [context, setContext] = useState(todayCheckin?.context ?? '');
  const [saved, setSaved] = useState(!!todayCheckin);

  const recentCheckins = useMemo(
    () =>
      [...data.emotionalCheckins]
        .filter(c => c.date !== today)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7),
    [data.emotionalCheckins, today],
  );

  const toggleEmotion = (emotion: GriefEmotion) => {
    haptic('light');
    setSelectedEmotions(prev =>
      prev.includes(emotion) ? prev.filter(e => e !== emotion) : [...prev, emotion],
    );
    setSaved(false);
  };

  const saveCheckin = () => {
    if (selectedEmotions.length === 0) return;
    haptic('medium');
    const now = new Date().toISOString();
    const checkin: GriefEmotionalCheckin = {
      id: todayCheckin?.id ?? generateId(),
      date: today,
      emotions: selectedEmotions,
      context: context.trim() || null,
      createdAt: todayCheckin?.createdAt ?? now,
    };
    const updated = todayCheckin
      ? data.emotionalCheckins.map(c => (c.id === todayCheckin.id ? checkin : c))
      : [...data.emotionalCheckins, checkin];
    onUpdate({ emotionalCheckins: updated });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          Tap what fits. Pick as many as you need.
        </p>
        <div className="space-y-3">
          {EMOTION_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="type-label text-[var(--text-tertiary)] uppercase tracking-wide text-[10px] mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {group.emotions.map(emotion => {
                  const isSelected = selectedEmotions.includes(emotion);
                  return (
                    <button
                      key={emotion}
                      onClick={() => toggleEmotion(emotion)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected ? EMOTION_SELECTED_COLORS[emotion] : EMOTION_COLORS[emotion]
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
      </div>

      <div>
        <input
          type="text"
          value={context}
          onChange={e => { setContext(e.target.value); setSaved(false); }}
          placeholder="What's on your mind..."
          className="w-full text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)]/60 rounded-[var(--radius-sm)] px-3 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/40"
        />
      </div>

      <button
        onClick={saveCheckin}
        disabled={selectedEmotions.length === 0}
        className={`w-full py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors ${
          saved
            ? 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]/40'
            : selectedEmotions.length > 0
            ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)]'
            : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]/40 opacity-50'
        }`}
      >
        {saved ? 'Saved' : todayCheckin ? 'Update' : 'Save'}
      </button>

      {recentCheckins.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
            Recent
          </p>
          <div className="space-y-2">
            {recentCheckins.map(checkin => (
              <div
                key={checkin.id}
                className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]/40"
              >
                <span className="text-xs text-[var(--text-tertiary)] block mb-1.5">
                  {formatDate(checkin.date)}
                </span>
                <div className="flex flex-wrap gap-1">
                  {checkin.emotions.map(e => (
                    <span
                      key={e}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${EMOTION_COLORS[e]}`}
                    >
                      {EMOTION_LABELS[e]}
                    </span>
                  ))}
                </div>
                {checkin.context && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5 italic">
                    {checkin.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// C. Permissions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AffirmationsSection({ data, onUpdate }: TherapyJournalProps) {
  const favorites = data.favoritePermissionIndices ?? [];
  const [index, setIndex] = useState(() => {
    const last = data.lastPermissionSlipIndex;
    return last >= 0 && last < AFFIRMATIONS.length - 1 ? last + 1 : 0;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isFavorited = favorites.includes(index);

  const toggleFavorite = () => {
    haptic('light');
    const updated = isFavorited
      ? favorites.filter(i => i !== index)
      : [...favorites, index];
    onUpdate({ favoritePermissionIndices: updated });
  };

  const shuffle = () => {
    haptic('light');
    setIsTransitioning(true);
    setTimeout(() => {
      // Build pool with 2x weight for favorites
      const pool: number[] = [];
      for (let i = 0; i < AFFIRMATIONS.length; i++) {
        pool.push(i);
        if (favorites.includes(i)) pool.push(i);
      }
      let next: number;
      do {
        next = pool[Math.floor(Math.random() * pool.length)];
      } while (next === index && AFFIRMATIONS.length > 1);
      setIndex(next);
      onUpdate({ lastPermissionSlipIndex: next });
      setIsTransitioning(false);
    }, 150);
  };

  useEffect(() => {
    if (data.lastPermissionSlipIndex !== index) {
      onUpdate({ lastPermissionSlipIndex: index });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-2 min-h-[280px]">
      <div
        className={`text-center max-w-[300px] transition-opacity duration-150 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-base italic leading-relaxed text-[var(--text-secondary)] font-[var(--font-display,inherit)]">
          &ldquo;{AFFIRMATIONS[index]}&rdquo;
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={toggleFavorite}
          className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
            isFavorited
              ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30'
              : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border-[var(--border-subtle)]/40 hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
          }`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={shuffle}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--surface-inset)] border border-[var(--border-subtle)]/40 hover:border-[var(--border-subtle)] transition-colors"
        >
          <RefreshCw size={13} />
          <span>Another</span>
        </button>
      </div>
    </div>
  );
}
