import { useState, useCallback, useMemo } from 'react';
import {
  Circle, CheckCircle2, Droplets, Pill, Utensils, Sun,
  Footprints, BookOpen, Phone, Target, Battery, Moon, Sofa,
  Music, PenLine, Wind, Heart, Scroll, ClipboardCheck,
  NotebookPen, Coffee, MonitorOff, Sparkles, type LucideIcon,
} from 'lucide-react';
import type {
  SelfCareData, AICheckIn, TherapistData, GriefData, MeditationData,
  Class, DayOfWeek, GriefEmotion,
} from '../../types';
import { haptic } from '../../utils/haptics';

type WellnessMode = 'okay' | 'rough' | 'survival';

interface SmartChecklistProps {
  selfCare: SelfCareData | undefined;
  aiCheckIns: AICheckIn[] | undefined;
  dose1Taken: boolean;
  onUpdateSelfCare: (updates: Partial<SelfCareData>) => void;
  therapist?: TherapistData;
  grief?: GriefData;
  meditation?: MeditationData;
  classes?: Class[];
}

interface ChecklistItem {
  id: string;
  emoji: string;
  label: string;
  icon: LucideIcon;
}

interface ContextualItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  priority: 1 | 2 | 3 | 4;
  signal: (ctx: SignalContext) => boolean;
}

interface SignalContext {
  today: string; // YYYY-MM-DD
  todayDayOfWeek: DayOfWeek;
  therapist?: TherapistData;
  grief?: GriefData;
  meditation?: MeditationData;
  classesToday: Class[];
}

const CORE_ITEMS: ChecklistItem[] = [
  { id: 'core_water', emoji: '💧', label: 'Drink water', icon: Droplets },
  { id: 'core_meds', emoji: '💊', label: 'Take meds', icon: Pill },
  { id: 'core_eat', emoji: '🍽️', label: 'Eat something', icon: Utensils },
  { id: 'core_sun', emoji: '☀️', label: 'Get some sunlight', icon: Sun },
];

// Helper: days between two YYYY-MM-DD date strings (positive = dateB is in the future)
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getJsDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function isWeekend(day: DayOfWeek): boolean {
  return day === 'saturday' || day === 'sunday';
}

const CONTEXTUAL_ITEMS: ContextualItemDef[] = [
  // Priority 1 — Therapy
  {
    id: 'ctx_therapy_prep',
    label: 'Review therapy prep notes',
    icon: Scroll,
    priority: 1,
    signal: ({ today, therapist }) => {
      if (!therapist?.nextSession?.date) return false;
      const diff = daysBetween(today, therapist.nextSession.date);
      return diff >= 0 && diff <= 2;
    },
  },
  {
    id: 'ctx_therapy_write',
    label: 'Write down what to bring up in therapy',
    icon: NotebookPen,
    priority: 1,
    signal: ({ today, therapist }) => {
      if (!therapist?.nextSession?.date) return false;
      const diff = daysBetween(today, therapist.nextSession.date);
      if (diff < 0 || diff > 2) return false;
      // Show when no prep notes exist
      return !therapist.prepNotes || therapist.prepNotes.length === 0;
    },
  },
  {
    id: 'ctx_therapy_reflect',
    label: 'Write post-session reflection',
    icon: PenLine,
    priority: 1,
    signal: ({ today, therapist }) => {
      if (!therapist?.sessions || therapist.sessions.length === 0) return false;
      const lastSession = therapist.sessions[therapist.sessions.length - 1];
      return daysBetween(lastSession.date, today) === 1;
    },
  },
  {
    id: 'ctx_therapy_actions',
    label: 'Review action items from therapy',
    icon: ClipboardCheck,
    priority: 1,
    signal: ({ therapist }) => {
      if (!therapist?.sessions) return false;
      return therapist.sessions.some(s =>
        s.actionItems?.some(a => !a.completed)
      );
    },
  },

  // Priority 2 — Emotional
  {
    id: 'ctx_feelings',
    label: 'Do a feelings check-in',
    icon: Heart,
    priority: 2,
    signal: ({ today, grief }) => {
      if (!grief?.emotionalCheckins) return true; // No checkins at all
      return !grief.emotionalCheckins.some(c => c.date === today);
    },
  },
  {
    id: 'ctx_write_anything',
    label: 'Write something — even one sentence counts',
    icon: PenLine,
    priority: 2,
    signal: ({ today, grief }) => {
      if (!grief?.letters || grief.letters.length === 0) return true;
      const lastLetter = grief.letters[grief.letters.length - 1];
      return daysBetween(lastLetter.date, today) >= 3;
    },
  },
  {
    id: 'ctx_permission_slip',
    label: 'Read a permission slip',
    icon: Scroll,
    priority: 2,
    signal: ({ today, grief }) => {
      if (!grief?.emotionalCheckins) return false;
      const targetEmotions: GriefEmotion[] = ['sad', 'angry', 'numb'];
      // Check last 3 days of checkins
      const recentCheckins = grief.emotionalCheckins.filter(c => {
        const diff = daysBetween(c.date, today);
        return diff >= 0 && diff <= 3;
      });
      return recentCheckins.some(c =>
        c.emotions.some(e => targetEmotions.includes(e))
      );
    },
  },

  // Priority 3 — Schedule
  {
    id: 'ctx_eat_before_class',
    label: 'Eat before teaching',
    icon: Coffee,
    priority: 3,
    signal: ({ classesToday }) => classesToday.length > 0,
  },
  {
    id: 'ctx_plan_recovery',
    label: 'Plan recovery time',
    icon: Sparkles,
    priority: 3,
    signal: ({ classesToday }) => classesToday.length >= 3,
  },
  {
    id: 'ctx_breathing',
    label: '5 minutes of breathing',
    icon: Wind,
    priority: 3,
    signal: ({ today, meditation }) => {
      if (!meditation?.sessions || meditation.sessions.length === 0) return true;
      const lastSession = meditation.sessions[meditation.sessions.length - 1];
      return daysBetween(lastSession.date, today) >= 3;
    },
  },

  // Priority 4 — General wellness (filler)
  {
    id: 'ctx_rest',
    label: 'Rest without guilt',
    icon: Sofa,
    priority: 4,
    signal: ({ todayDayOfWeek, classesToday }) =>
      isWeekend(todayDayOfWeek) || classesToday.length === 0,
  },
  {
    id: 'ctx_just_for_you',
    label: 'Do something just for you',
    icon: Sparkles,
    priority: 4,
    signal: ({ todayDayOfWeek }) => isWeekend(todayDayOfWeek),
  },
  {
    id: 'ctx_move',
    label: 'Move your body',
    icon: Footprints,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_connect',
    label: 'Connect with someone',
    icon: Phone,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_screen_break',
    label: 'Screen break — 10 minutes',
    icon: MonitorOff,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_wind_down',
    label: 'Wind down by 10 PM',
    icon: Moon,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_future_you',
    label: 'Do one thing for future-you',
    icon: Target,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_journal',
    label: 'Write in your journal',
    icon: BookOpen,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_music',
    label: 'Put on music that helps',
    icon: Music,
    priority: 4,
    signal: () => true,
  },
  {
    id: 'ctx_battery',
    label: 'Check your energy level',
    icon: Battery,
    priority: 4,
    signal: () => true,
  },
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

const MODE_LIMITS: Record<WellnessMode, number> = {
  okay: 5,
  rough: 3,
  survival: 1,
};

function selectContextualItems(
  mode: WellnessMode,
  ctx: SignalContext,
): ChecklistItem[] {
  if (mode === 'survival') {
    return [{
      id: 'survival_gentle',
      emoji: '🤍',
      label: 'You made it through today. That counts.',
      icon: Circle,
    }];
  }

  const limit = MODE_LIMITS[mode];

  // Evaluate signals and collect matching items
  const matching = CONTEXTUAL_ITEMS
    .filter(item => item.signal(ctx))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);

  return matching.map(item => ({
    id: item.id,
    emoji: '',
    label: item.label,
    icon: item.icon,
  }));
}

export function SmartChecklist({
  selfCare, aiCheckIns, dose1Taken, onUpdateSelfCare,
  therapist, grief, meditation, classes,
}: SmartChecklistProps) {
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

  // Signal context for contextual item evaluation
  const todayDayOfWeek = getJsDayOfWeek();
  const classesToday = useMemo(() => {
    if (!classes) return [];
    return classes.filter(c => c.day === todayDayOfWeek);
  }, [classes, todayDayOfWeek]);

  const signalCtx: SignalContext = useMemo(() => ({
    today: todayKey,
    todayDayOfWeek,
    therapist,
    grief,
    meditation,
    classesToday,
  }), [todayKey, todayDayOfWeek, therapist, grief, meditation, classesToday]);

  // Build items list based on mode, with daily pinning
  const items = useMemo(() => {
    // Core items — update meds status label
    const core = CORE_ITEMS.map(item => {
      if (item.id === 'core_meds' && dose1Taken) {
        return { ...item, label: 'Take meds ✓' };
      }
      return item;
    });

    // Check if we have pinned contextual items for today with the same mode
    const pinnedForToday = sc.contextualItemsDate === todayKey &&
      sc.contextualItemIds &&
      sc.contextualItemIds.length > 0;

    let extras: ChecklistItem[];

    if (pinnedForToday && sc.contextualItemIds) {
      // Mode changed? Re-evaluate. Otherwise use pinned.
      const pinnedCount = sc.contextualItemIds.length;
      const expectedCount = MODE_LIMITS[currentMode];
      const isSurvivalMismatch = currentMode === 'survival' && pinnedCount !== 1;
      const isModeMismatch = currentMode !== 'survival' && pinnedCount !== expectedCount;

      if (isSurvivalMismatch || isModeMismatch) {
        // Mode changed — re-select
        extras = selectContextualItems(currentMode, signalCtx);
        // Save new pinned items (don't trigger re-render loop — this is a side effect)
        setTimeout(() => {
          onUpdateSelfCare({
            contextualItemIds: extras.map(e => e.id),
            contextualItemsDate: todayKey,
          });
        }, 0);
      } else {
        // Use pinned items — reconstruct from IDs
        const pinnedIds = sc.contextualItemIds;
        if (currentMode === 'survival') {
          extras = [{
            id: 'survival_gentle',
            emoji: '🤍',
            label: 'You made it through today. That counts.',
            icon: Circle,
          }];
        } else {
          extras = pinnedIds.map(id => {
            const def = CONTEXTUAL_ITEMS.find(ci => ci.id === id);
            if (def) {
              return { id: def.id, emoji: '', label: def.label, icon: def.icon };
            }
            // Fallback if item definition no longer exists
            return { id, emoji: '', label: id, icon: Circle };
          });
        }
      }
    } else {
      // First load today or no pinned items — select and pin
      extras = selectContextualItems(currentMode, signalCtx);
      setTimeout(() => {
        onUpdateSelfCare({
          contextualItemIds: extras.map(e => e.id),
          contextualItemsDate: todayKey,
        });
      }, 0);
    }

    return [...core, ...extras];
  }, [currentMode, dose1Taken, sc.contextualItemIds, sc.contextualItemsDate, todayKey, signalCtx, onUpdateSelfCare]);

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
              {item.emoji && <span className="text-sm mr-1">{item.emoji}</span>}
              <item.icon size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
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
