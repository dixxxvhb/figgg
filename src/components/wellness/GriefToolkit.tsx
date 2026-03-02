import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Heart, RefreshCw, Plus, ChevronRight, Calendar,
  Pencil, X, ArrowLeft,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import type {
  GriefData,
  GriefLetter,
  GriefEmotionalCheckin,
  GriefEmotion,
} from '../../types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface GriefToolkitProps {
  data: GriefData;
  onUpdate: (updates: Partial<GriefData>) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

type SubTab = 'letters' | 'feelings' | 'permission' | 'timeline';

const WRITING_PROMPTS = [
  'What do I want her to know?',
  "What's a memory I keep coming back to?",
  'What did she teach me that I carry every day?',
  "What am I afraid of?",
  'What would I want to tell her about my life right now?',
  'What would she say to me today?',
];

const EMOTION_LABELS: Record<GriefEmotion, string> = {
  numb: 'Numb',
  angry: 'Angry',
  sad: 'Sad',
  anxious: 'Anxious',
  guilty: 'Guilty',
  peaceful: 'Peaceful',
  grateful: 'Grateful',
  all_of_it: 'All of it at once',
  dont_know: "I don't know",
};

const EMOTION_COLORS: Record<GriefEmotion, string> = {
  numb: 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  angry: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40',
  sad: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40',
  anxious: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40',
  guilty: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40',
  peaceful: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40',
  grateful: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800/40',
  all_of_it: 'bg-[var(--surface-inset)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  dont_know: 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border-[var(--border-subtle)]',
};

const EMOTION_SELECTED_COLORS: Record<GriefEmotion, string> = {
  numb: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
  angry: 'bg-red-100 text-red-800 border-red-400 ring-1 ring-red-300/50 dark:bg-red-900/40 dark:text-red-200 dark:border-red-600',
  sad: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-300/50 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-600',
  anxious: 'bg-amber-100 text-amber-800 border-amber-400 ring-1 ring-amber-300/50 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600',
  guilty: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-300/50 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-600',
  peaceful: 'bg-emerald-100 text-emerald-800 border-emerald-400 ring-1 ring-emerald-300/50 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600',
  grateful: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-300/50 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-600',
  all_of_it: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
  dont_know: 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30',
};

const PERMISSION_SLIPS = [
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
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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

// ─── Sub-tab pills ───────────────────────────────────────────────────────────

const TABS: { key: SubTab; label: string }[] = [
  { key: 'letters', label: 'Letters' },
  { key: 'feelings', label: 'Feelings' },
  { key: 'permission', label: 'Permission Slips' },
  { key: 'timeline', label: 'Timeline' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function GriefToolkit({ data, onUpdate }: GriefToolkitProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('letters');

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
      {activeTab === 'letters' && <LettersSection data={data} onUpdate={onUpdate} />}
      {activeTab === 'feelings' && <FeelingsSection data={data} onUpdate={onUpdate} />}
      {activeTab === 'permission' && <PermissionSlipsSection data={data} onUpdate={onUpdate} />}
      {activeTab === 'timeline' && <TimelineSection data={data} />}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// A. Letters
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type LetterView = 'list' | 'write' | 'read';

function LettersSection({ data, onUpdate }: GriefToolkitProps) {
  const [view, setView] = useState<LetterView>('list');
  const [activeLetter, setActiveLetter] = useState<GriefLetter | null>(null);
  const [draft, setDraft] = useState('');
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const letters = useMemo(
    () => [...data.letters].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.letters],
  );

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
    (content: string, letter: GriefLetter | null, prompt: string | null) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const now = new Date().toISOString();
        if (letter) {
          // Update existing letter
          const updated = data.letters.map(l =>
            l.id === letter.id ? { ...l, content, updatedAt: now } : l,
          );
          onUpdate({ letters: updated });
        } else if (content.trim()) {
          // Create new letter
          const newLetter: GriefLetter = {
            id: generateId(),
            date: todayStr(),
            content,
            prompt,
            createdAt: now,
            updatedAt: now,
          };
          onUpdate({ letters: [...data.letters, newLetter] });
          // Set as active so further edits update rather than create
          setActiveLetter(newLetter);
        }
      }, 500);
    },
    [data.letters, onUpdate],
  );

  const handleDraftChange = (value: string) => {
    setDraft(value);
    autoSave(value, isEditing ? activeLetter : (activeLetter?.id && view === 'write' ? activeLetter : null), usedPrompt);
  };

  const startNewLetter = (prompt?: string) => {
    setActiveLetter(null);
    setDraft('');
    setUsedPrompt(prompt ?? null);
    setShowPrompts(!prompt);
    setIsEditing(false);
    setView('write');
    haptic('light');
  };

  const openLetter = (letter: GriefLetter) => {
    setActiveLetter(letter);
    setDraft(letter.content);
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
    // Final save if there's unsaved content
    if (view === 'write' && draft.trim()) {
      const now = new Date().toISOString();
      if (activeLetter) {
        const updated = data.letters.map(l =>
          l.id === activeLetter.id ? { ...l, content: draft, updatedAt: now } : l,
        );
        onUpdate({ letters: updated });
      } else {
        const newLetter: GriefLetter = {
          id: generateId(),
          date: todayStr(),
          content: draft,
          prompt: usedPrompt,
          createdAt: now,
          updatedAt: now,
        };
        onUpdate({ letters: [...data.letters, newLetter] });
      }
    }
    setView('list');
    setActiveLetter(null);
    setDraft('');
    setIsEditing(false);
  };

  // ── List view ──
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => startNewLetter()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--accent-primary)] transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">New Letter</span>
        </button>

        {letters.length === 0 ? (
          <div className="py-10 text-center">
            <Mail size={28} className="mx-auto text-[var(--text-tertiary)] opacity-40 mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">
              A quiet place to write what you need to say.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
              No one reads these but you.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {letters.map(letter => (
              <button
                key={letter.id}
                onClick={() => openLetter(letter)}
                className="w-full text-left p-4 rounded-[var(--radius-md)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]/50 hover:border-[var(--border-subtle)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {formatDate(letter.date)}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {firstLine(letter.content)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Read view ──
  if (view === 'read' && activeLetter && !isEditing) {
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
          <span className="text-xs text-[var(--text-tertiary)]">
            {formatDate(activeLetter.date)}
          </span>
          {activeLetter.prompt && (
            <p className="text-xs text-[var(--text-tertiary)] italic mt-1">
              {activeLetter.prompt}
            </p>
          )}
        </div>

        <div className="py-4 min-h-[200px]">
          <p className="text-sm text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap font-[var(--font-display,inherit)]">
            {activeLetter.content}
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

      {/* Writing prompts — only for new letters */}
      {showPrompts && !isEditing && !activeLetter && (
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
          <div className="flex flex-wrap gap-1.5">
            {WRITING_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => startNewLetter(prompt)}
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
          placeholder="Write what you need to say..."
          className="w-full min-h-[280px] bg-transparent text-sm text-[var(--text-secondary)] leading-[1.8] placeholder-[var(--text-tertiary)]/50 focus:outline-none resize-none font-[var(--font-display,inherit)] px-1"
        />
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// B. How I'm Feeling Right Now
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ALL_EMOTIONS: GriefEmotion[] = [
  'numb', 'angry', 'sad', 'anxious', 'guilty',
  'peaceful', 'grateful', 'all_of_it', 'dont_know',
];

function FeelingsSection({ data, onUpdate }: GriefToolkitProps) {
  const today = todayStr();
  const todayCheckin = data.emotionalCheckins.find(c => c.date === today);
  const [selectedEmotions, setSelectedEmotions] = useState<GriefEmotion[]>(
    todayCheckin?.emotions ?? [],
  );
  const [context, setContext] = useState(todayCheckin?.context ?? '');
  const [saved, setSaved] = useState(!!todayCheckin);

  // Recent check-ins (last 7, excluding today)
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
      {/* Emotion chips */}
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          Tap what fits. Pick as many as you need.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_EMOTIONS.map(emotion => {
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

      {/* Optional context */}
      <div>
        <input
          type="text"
          value={context}
          onChange={e => { setContext(e.target.value); setSaved(false); }}
          placeholder="Today was hard because..."
          className="w-full text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)]/60 rounded-[var(--radius-sm)] px-3 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-tertiary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]/40"
        />
      </div>

      {/* Save button */}
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

      {/* Recent check-ins */}
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
// C. Permission Slips
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PermissionSlipsSection({ data, onUpdate }: GriefToolkitProps) {
  const [index, setIndex] = useState(() => {
    const last = data.lastPermissionSlipIndex;
    // Show the next one from where they left off, wrapping around
    return last >= 0 && last < PERMISSION_SLIPS.length - 1 ? last + 1 : 0;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const shuffle = () => {
    haptic('light');
    setIsTransitioning(true);
    setTimeout(() => {
      let next: number;
      do {
        next = Math.floor(Math.random() * PERMISSION_SLIPS.length);
      } while (next === index && PERMISSION_SLIPS.length > 1);
      setIndex(next);
      onUpdate({ lastPermissionSlipIndex: next });
      setIsTransitioning(false);
    }, 150);
  };

  // Save initial index on mount
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
          &ldquo;{PERMISSION_SLIPS[index]}&rdquo;
        </p>
      </div>

      <button
        onClick={shuffle}
        className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-[var(--surface-inset)] border border-[var(--border-subtle)]/40 hover:border-[var(--border-subtle)] transition-colors"
      >
        <RefreshCw size={13} />
        <span>Another</span>
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// D. Grief Log (Timeline)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type TimelineEntry =
  | { type: 'letter'; date: string; letter: GriefLetter }
  | { type: 'checkin'; date: string; checkin: GriefEmotionalCheckin };

function TimelineSection({ data }: { data: GriefData }) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const all: TimelineEntry[] = [
      ...data.letters.map(
        (letter): TimelineEntry => ({ type: 'letter', date: letter.createdAt, letter }),
      ),
      ...data.emotionalCheckins.map(
        (checkin): TimelineEntry => ({ type: 'checkin', date: checkin.createdAt, checkin }),
      ),
    ];
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }, [data.letters, data.emotionalCheckins]);

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center">
        <Calendar size={28} className="mx-auto text-[var(--text-tertiary)] opacity-40 mb-3" />
        <p className="text-sm text-[var(--text-tertiary)]">
          Nothing here yet. That&apos;s okay.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        if (entry.type === 'letter') {
          return (
            <div
              key={`letter-${entry.letter.id}`}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]/40"
            >
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[var(--surface-inset)] flex items-center justify-center flex-shrink-0">
                <Mail size={13} className="text-[var(--text-tertiary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDate(entry.letter.date)}
                </span>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                  {firstLine(entry.letter.content)}
                </p>
              </div>
            </div>
          );
        }
        return (
          <div
            key={`checkin-${entry.checkin.id}`}
            className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--surface-primary)] border border-[var(--border-subtle)]/40"
          >
            <div className="mt-0.5 w-7 h-7 rounded-full bg-[var(--surface-inset)] flex items-center justify-center flex-shrink-0">
              <Heart size={13} className="text-[var(--text-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-[var(--text-tertiary)]">
                {formatDate(entry.checkin.date)}
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.checkin.emotions.map(e => (
                  <span
                    key={e}
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${EMOTION_COLORS[e]}`}
                  >
                    {EMOTION_LABELS[e]}
                  </span>
                ))}
              </div>
              {entry.checkin.context && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1 italic">
                  {entry.checkin.context}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
