import { useState, useCallback, useMemo } from 'react';
import {
  Circle, CheckCircle2, Settings, Droplets, Pill, Utensils, Sun,
  Footprints, BookOpen, Phone, Target, Battery, Moon, Sofa,
  Music, Snowflake, PenLine, Wind, type LucideIcon,
} from 'lucide-react';
import type { SelfCareData, AICheckIn } from '../../types';
import { haptic } from '../../utils/haptics';

type WellnessMode = 'okay' | 'rough' | 'survival';

interface SmartChecklistProps {
  selfCare: SelfCareData | undefined;
  aiCheckIns: AICheckIn[] | undefined;
  dose1Taken: boolean;
  onUpdateSelfCare: (updates: Partial<SelfCareData>) => void;
}

interface ChecklistItem {
  id: string;
  emoji: string;
  label: string;
  icon: LucideIcon;
}

const CORE_ITEMS: ChecklistItem[] = [
  { id: 'core_water', emoji: '💧', label: 'Drink water', icon: Droplets },
  { id: 'core_meds', emoji: '💊', label: 'Take meds', icon: Pill },
  { id: 'core_eat', emoji: '🍽️', label: 'Eat something', icon: Utensils },
  { id: 'core_sun', emoji: '☀️', label: 'Get some sunlight', icon: Sun },
];

const OKAY_EXTRAS: ChecklistItem[] = [
  { id: 'okay_move', emoji: '🏃', label: 'Move your body', icon: Footprints },
  { id: 'okay_journal', emoji: '📓', label: 'Write in your journal', icon: BookOpen },
  { id: 'okay_breathe', emoji: '🧘', label: '5 minutes of breathing', icon: Wind },
  { id: 'okay_connect', emoji: '📞', label: 'Connect with someone', icon: Phone },
  { id: 'okay_future', emoji: '🎯', label: 'Do one thing for future-you', icon: Target },
  { id: 'okay_screen', emoji: '🔋', label: 'Screen break — 10 minutes', icon: Battery },
  { id: 'okay_wind', emoji: '🌙', label: 'Wind down by 10 PM', icon: Moon },
];

const ROUGH_EXTRAS: ChecklistItem[] = [
  { id: 'rough_rest', emoji: '🛋️', label: 'Rest without guilt', icon: Sofa },
  { id: 'rough_reach', emoji: '📞', label: 'Reach out to one person', icon: Phone },
  { id: 'rough_music', emoji: '🎵', label: 'Put on music that helps', icon: Music },
  { id: 'rough_cold', emoji: '🧊', label: 'Cold water or a shower', icon: Snowflake },
  { id: 'rough_write', emoji: '📝', label: 'Write one sentence about how you feel', icon: PenLine },
];

const SURVIVAL_EXTRAS: ChecklistItem[] = [
  { id: 'survival_gentle', emoji: '🤍', label: 'You made it through today. That counts.', icon: Circle },
];

const GENTLE_MESSAGES: string[] = [
  'If you can do one more thing, let it be drinking water again.',
  'You made it through today. That counts.',
  'The bare minimum is enough today.',
  'You don\'t have to do anything else.',
];

const MODE_CONFIG: Record<WellnessMode, { label: string; description: string; emoji: string; color: string }> = {
  okay: {
    label: "I'm okay today",
    description: 'Full checklist with growth-oriented extras',
    emoji: '🟢',
    color: 'var(--status-success)',
  },
  rough: {
    label: 'Rough day',
    description: 'Reduced checklist, focused on basics',
    emoji: '🟡',
    color: 'var(--status-warning)',
  },
  survival: {
    label: 'Survival mode',
    description: 'Just the non-negotiables',
    emoji: '🔴',
    color: 'var(--status-danger)',
  },
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getAISuggestedMode(checkIns: AICheckIn[] | undefined): WellnessMode | null {
  if (!checkIns || checkIns.length === 0) return null;
  const today = getTodayKey();
  const todayCheckIn = checkIns.find(c => c.date === today);
  if (!todayCheckIn?.mood) return null;

  const m = parseInt(todayCheckIn.mood);
  if (isNaN(m)) return null;

  if (m <= 2) return 'survival';
  if (m <= 3) return 'rough';
  return null;
}

export function SmartChecklist({ selfCare, aiCheckIns, dose1Taken, onUpdateSelfCare }: SmartChecklistProps) {
  const todayKey = getTodayKey();
  const sc = selfCare || {};
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Current mode
  const currentMode: WellnessMode = useMemo(() => {
    if (sc.wellnessModeDate === todayKey && sc.wellnessMode) {
      return sc.wellnessMode;
    }
    return 'okay';
  }, [sc.wellnessMode, sc.wellnessModeDate, todayKey]);

  // AI suggestion
  const suggestedMode = useMemo(() => getAISuggestedMode(aiCheckIns), [aiCheckIns]);
  const showSuggestion = suggestedMode && suggestedMode !== currentMode &&
    !(sc.wellnessModeDate === todayKey && sc.wellnessModeSuggested === false);

  // Set mode
  const setMode = useCallback((mode: WellnessMode, fromSuggestion = false) => {
    haptic('light');
    onUpdateSelfCare({
      wellnessMode: mode,
      wellnessModeDate: todayKey,
      wellnessModeSuggested: fromSuggestion,
    });
    setShowModeSelector(false);
  }, [todayKey, onUpdateSelfCare]);

  const dismissSuggestion = useCallback(() => {
    onUpdateSelfCare({ wellnessModeSuggested: false, wellnessModeDate: todayKey });
  }, [todayKey, onUpdateSelfCare]);

  // Checklist states
  const checkStates: Record<string, boolean> = useMemo(() => {
    if (sc.unifiedTaskDate !== todayKey) return {};
    return sc.unifiedTaskStates || {};
  }, [sc.unifiedTaskStates, sc.unifiedTaskDate, todayKey]);

  const toggleItem = useCallback((id: string) => {
    haptic('light');
    const current = sc.unifiedTaskDate === todayKey ? (sc.unifiedTaskStates || {}) : {};
    onUpdateSelfCare({
      unifiedTaskStates: { ...current, [id]: !current[id] },
      unifiedTaskDate: todayKey,
    });
  }, [sc, todayKey, onUpdateSelfCare]);

  // Build items list based on mode
  const items = useMemo(() => {
    // Core items — update meds status label
    const core = CORE_ITEMS.map(item => {
      if (item.id === 'core_meds' && dose1Taken) {
        return { ...item, label: 'Take meds ✓' };
      }
      return item;
    });

    let extras: ChecklistItem[] = [];
    if (currentMode === 'okay') {
      // Pick 5 rotating extras
      extras = OKAY_EXTRAS.slice(0, 5);
    } else if (currentMode === 'rough') {
      extras = ROUGH_EXTRAS.slice(0, 3);
    } else {
      extras = SURVIVAL_EXTRAS.slice(0, 1);
    }

    return [...core, ...extras];
  }, [currentMode, dose1Taken]);

  const doneCount = items.filter(i => checkStates[i.id]).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const modeConfig = MODE_CONFIG[currentMode];

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Mode selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowModeSelector(!showModeSelector)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-full)] bg-[var(--surface-inset)] text-sm font-medium text-[var(--text-primary)] active:opacity-70"
        >
          <span>{modeConfig.emoji}</span>
          <span>{modeConfig.label}</span>
        </button>
        <span className="type-caption text-[var(--text-tertiary)]">
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* AI suggestion banner */}
      {showSuggestion && suggestedMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent-muted)] border border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-secondary)] flex-1">
            Based on your check-in, today might be a <strong>{MODE_CONFIG[suggestedMode].label.toLowerCase()}</strong> kind of day.
          </span>
          <button
            onClick={() => setMode(suggestedMode, true)}
            className="px-2 py-1 text-xs font-medium text-[var(--accent-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--accent-muted)]"
          >
            Switch
          </button>
          <button
            onClick={dismissSuggestion}
            className="px-2 py-1 text-xs text-[var(--text-tertiary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mode selector dropdown */}
      {showModeSelector && (
        <div className="space-y-1">
          {(Object.entries(MODE_CONFIG) as [WellnessMode, typeof modeConfig][]).map(([mode, config]) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors ${
                currentMode === mode
                  ? 'bg-[var(--accent-muted)] border border-[var(--accent-primary)]'
                  : 'bg-[var(--surface-inset)] hover:bg-[var(--surface-card-hover)]'
              }`}
            >
              <span className="text-lg">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{config.label}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{config.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 rounded-[var(--radius-full)] bg-[var(--surface-inset)] overflow-hidden">
        <div
          className="h-full rounded-[var(--radius-full)] transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: modeConfig.color,
          }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-0.5">
        {items.map(item => {
          const done = checkStates[item.id];
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-left transition-all ${
                done ? 'opacity-50' : 'active:bg-[var(--surface-inset)]'
              }`}
            >
              {done ? (
                <CheckCircle2 size={20} className="text-[var(--status-success)] flex-shrink-0" fill="currentColor" strokeWidth={0} />
              ) : (
                <Circle size={20} className="text-[var(--border-subtle)] flex-shrink-0" strokeWidth={1.5} />
              )}
              <span className="text-sm mr-1">{item.emoji}</span>
              <span className={`text-sm ${done ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Survival mode gentle message */}
      {currentMode === 'survival' && (
        <p className="text-center text-xs text-[var(--text-tertiary)] italic px-6 py-2">
          {GENTLE_MESSAGES[new Date().getDate() % GENTLE_MESSAGES.length]}
        </p>
      )}
    </div>
  );
}
