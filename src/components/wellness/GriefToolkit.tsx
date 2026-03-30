import { useState, useMemo, useCallback } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { haptic } from '../../utils/haptics';
import { generateId } from '../../utils/id';
import type {
  GriefData,
  GriefEmotion,
  GriefEmotionalCheckin,
  GriefLetter,
} from '../../types';

interface GriefToolkitProps {
  data: GriefData;
  onUpdate: (updates: Partial<GriefData>) => void;
}

const EMOTIONS: { id: GriefEmotion; label: string }[] = [
  { id: 'numb', label: 'Numb' },
  { id: 'angry', label: 'Angry' },
  { id: 'sad', label: 'Sad' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'guilty', label: 'Guilty' },
  { id: 'overwhelmed', label: 'Overwhelmed' },
  { id: 'disconnected', label: 'Disconnected' },
  { id: 'peaceful', label: 'Peaceful' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'relieved', label: 'Relieved' },
  { id: 'creative', label: 'Creative' },
  { id: 'all_of_it', label: 'All of it' },
  { id: 'dont_know', label: "Don't know" },
];

const PERMISSION_SLIPS = [
  "You don't have to be productive today.",
  "It's okay to laugh. It doesn't mean you've forgotten.",
  "You're allowed to be angry about this.",
  "You don't have to explain how you're feeling to anyone.",
  "Some days the grief is loud. Some days it's quiet. Both are real.",
  "You don't have to hold it together for everyone else.",
  "There is no right way to do this.",
  "You're allowed to need help.",
  "Rest is not giving up. It's how you keep going.",
  "You can hold love and grief in the same hand.",
  "Some days survival is the whole victory.",
  "Today doesn't have to be anything more than today.",
  "You're carrying something heavy. Of course you're tired.",
  "Healing isn't linear. Bad days don't erase good ones.",
];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function GriefToolkit({ data, onUpdate }: GriefToolkitProps) {
  const today = todayStr();

  // Find today's check-in if one exists
  const todayCheckin = useMemo(() =>
    data.emotionalCheckins.find(c => c.date === today),
    [data.emotionalCheckins, today]
  );

  const [selectedEmotions, setSelectedEmotions] = useState<GriefEmotion[]>(
    todayCheckin?.emotions || []
  );
  const [checkinSaved, setCheckinSaved] = useState(!!todayCheckin);

  // Letter writing
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');

  // Permission slip — stable per session
  const [slipIndex] = useState(() => {
    const last = data.lastPermissionSlipIndex ?? -1;
    let next = last + 1;
    if (next >= PERMISSION_SLIPS.length) next = 0;
    return next;
  });

  const toggleEmotion = useCallback((emotion: GriefEmotion) => {
    haptic('light');
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
    setCheckinSaved(false);
  }, []);

  const saveCheckin = useCallback(() => {
    if (selectedEmotions.length === 0) return;
    haptic('medium');

    const existing = data.emotionalCheckins.filter(c => c.date !== today);
    const checkin: GriefEmotionalCheckin = {
      id: todayCheckin?.id || generateId(),
      date: today,
      emotions: selectedEmotions,
      context: null,
      createdAt: todayCheckin?.createdAt || new Date().toISOString(),
    };

    onUpdate({
      emotionalCheckins: [...existing, checkin],
      lastModified: new Date().toISOString(),
    });
    setCheckinSaved(true);
    toast.success('Check-in saved', { duration: 2000 });
  }, [selectedEmotions, data.emotionalCheckins, today, todayCheckin, onUpdate]);

  const saveLetter = useCallback(() => {
    if (!letterText.trim()) return;
    haptic('medium');

    const now = new Date().toISOString();
    const letter: GriefLetter = {
      id: generateId(),
      date: today,
      content: letterText.trim(),
      prompt: null,
      createdAt: now,
      updatedAt: now,
    };

    onUpdate({
      letters: [letter, ...data.letters],
      lastModified: new Date().toISOString(),
    });
    setLetterText('');
    setLetterOpen(false);
    toast.success('Letter saved', { duration: 2000 });
  }, [letterText, today, data.letters, onUpdate]);

  const shuffleSlip = useCallback(() => {
    haptic('light');
    onUpdate({
      lastPermissionSlipIndex: slipIndex,
      lastModified: new Date().toISOString(),
    });
  }, [slipIndex, onUpdate]);

  return (
    <div className="space-y-5">
      {/* Permission slip — quiet, always visible */}
      <div
        className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-5 py-5"
        onClick={shuffleSlip}
      >
        <p className="type-body text-[var(--text-secondary)] italic leading-relaxed text-center">
          "{PERMISSION_SLIPS[slipIndex]}"
        </p>
      </div>

      {/* Emotional check-in */}
      <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-4 py-4 space-y-3">
        <h3 className="type-label text-[var(--text-secondary)] uppercase tracking-wider">
          How are you feeling{checkinSaved ? ' today' : ''}?
        </h3>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map(({ id, label }) => {
            const selected = selectedEmotions.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleEmotion(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40 shadow-sm'
                    : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {selectedEmotions.length > 0 && !checkinSaved && (
          <button
            onClick={saveCheckin}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium"
          >
            <Check size={14} />
            Save
          </button>
        )}
        {checkinSaved && (
          <p className="text-xs text-[var(--text-tertiary)]">
            Saved for today
          </p>
        )}
      </div>

      {/* Letter writing — collapsible */}
      <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden">
        <button
          onClick={() => { setLetterOpen(!letterOpen); haptic('light'); }}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="type-label text-[var(--text-secondary)] uppercase tracking-wider">
            Write something
          </span>
          {letterOpen ? <ChevronUp size={16} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={16} className="text-[var(--text-tertiary)]" />}
        </button>
        {letterOpen && (
          <div className="px-4 pb-4 space-y-3">
            <textarea
              value={letterText}
              onChange={e => setLetterText(e.target.value)}
              placeholder="Whatever you need to say..."
              rows={6}
              className="w-full bg-[var(--surface-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] rounded-lg px-3 py-3 text-sm leading-relaxed resize-none border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent-primary)]/40"
              autoFocus
            />
            {letterText.trim() && (
              <button
                onClick={saveLetter}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-medium"
              >
                <Check size={14} />
                Save letter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent letters — quiet list */}
      {data.letters.length > 0 && (
        <div className="space-y-2">
          <h3 className="type-label text-[var(--text-tertiary)] uppercase tracking-wider px-1">
            Recent
          </h3>
          {data.letters.slice(0, 3).map(letter => (
            <div
              key={letter.id}
              className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] px-4 py-3"
            >
              <p className="text-xs text-[var(--text-tertiary)] mb-1">
                {new Date(letter.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="type-body text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                {letter.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
