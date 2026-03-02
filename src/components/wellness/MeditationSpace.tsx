import { useState, useRef, useEffect, useCallback } from 'react';
import { Wind, Play, Pause, Square, Eye, Hand, Snowflake, Timer, Plus, Minus } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { generateId } from '../../utils/id';
import type { MeditationData, MeditationExerciseType, BreathingExerciseType } from '../../types';

interface MeditationSpaceProps {
  data: MeditationData;
  onUpdate: (updates: Partial<MeditationData>) => void;
}

type BreathingPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

interface BreathingExercise {
  id: BreathingExerciseType;
  name: string;
  description: string;
  phases: { phase: BreathingPhase; duration: number; label: string }[];
  defaultRoundsKey: 'box' | 'fourSevenEight' | 'slow';
  estimateMinutes: (rounds: number) => number;
}

const BREATHING_EXERCISES: BreathingExercise[] = [
  {
    id: 'box_breathing',
    name: 'Box Breathing',
    description: 'Calming anxiety, regaining focus',
    phases: [
      { phase: 'inhale', duration: 4, label: 'Inhale...' },
      { phase: 'hold_in', duration: 4, label: 'Hold...' },
      { phase: 'exhale', duration: 4, label: 'Exhale...' },
      { phase: 'hold_out', duration: 4, label: 'Hold...' },
    ],
    defaultRoundsKey: 'box',
    estimateMinutes: (rounds: number) => Math.round((rounds * 16) / 60),
  },
  {
    id: '478_breathing',
    name: '4-7-8 Breathing',
    description: 'Acute stress, slowing down',
    phases: [
      { phase: 'inhale', duration: 4, label: 'Inhale...' },
      { phase: 'hold_in', duration: 7, label: 'Hold...' },
      { phase: 'exhale', duration: 8, label: 'Exhale...' },
    ],
    defaultRoundsKey: 'fourSevenEight',
    estimateMinutes: (rounds: number) => Math.round((rounds * 19) / 60),
  },
  {
    id: 'slow_breathing',
    name: 'Slow Breathing',
    description: 'Quick reset, easiest anywhere',
    phases: [
      { phase: 'inhale', duration: 5, label: 'Inhale...' },
      { phase: 'exhale', duration: 5, label: 'Exhale...' },
    ],
    defaultRoundsKey: 'slow',
    estimateMinutes: (rounds: number) => Math.round((rounds * 10) / 60),
  },
];

interface GroundingExercise {
  id: 'body_scan' | 'grounding' | 'cold_reset';
  name: string;
  icon: typeof Eye;
  content: string;
  hasTimer?: boolean;
  timerSeconds?: number;
}

const GROUNDING_EXERCISES: GroundingExercise[] = [
  {
    id: 'grounding',
    name: '5-4-3-2-1 Senses',
    icon: Eye,
    content:
      'Name 5 things you can see, 4 you can hear, 3 you can touch, 2 you can smell, 1 you can taste.',
  },
  {
    id: 'body_scan',
    name: 'Body Scan (1 min)',
    icon: Hand,
    content:
      'Close your eyes. Start at the top of your head. Slowly move your attention down through your face, neck, shoulders, arms, hands, chest, belly, hips, legs, and feet. Notice any tension. Breathe into it. Let it soften.',
    hasTimer: true,
    timerSeconds: 60,
  },
  {
    id: 'cold_reset',
    name: 'Cold Reset',
    icon: Snowflake,
    content:
      'Splash cold water on your face. Hold ice cubes. Take a cold sip of water. These reset your nervous system.',
  },
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Monday = 0, Sunday = 6
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// -- Breathing Timer Component --

interface BreathingTimerProps {
  exercise: BreathingExercise;
  rounds: number;
  onComplete: (durationSeconds: number) => void;
  onStop: () => void;
}

function BreathingTimer({ exercise, rounds, onComplete, onStop }: BreathingTimerProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(exercise.phases[0].duration);
  const [isActive, setIsActive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);

  const startTimeRef = useRef(Date.now());
  const pausedTimeRef = useRef(0);
  const pauseStartRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const currentPhaseData = exercise.phases[phaseIndex];
  const phase = currentPhaseData.phase;

  // Compute circle scale based on phase
  const getCircleScale = (): number => {
    if (phase === 'inhale' || phase === 'hold_in') return 1.5;
    return 0.8;
  };

  // Compute transition duration for current phase
  const getTransitionDuration = (): number => {
    if (phase === 'hold_in' || phase === 'hold_out') return 0.3;
    return currentPhaseData.duration;
  };

  const tick = useCallback(() => {
    setSecondsRemaining((prev) => {
      if (prev <= 1) {
        // Move to next phase or round
        setPhaseIndex((prevPhase) => {
          const nextPhase = prevPhase + 1;
          if (nextPhase >= exercise.phases.length) {
            // End of round
            setCurrentRound((prevRound) => {
              if (prevRound >= rounds) {
                // All rounds complete
                setIsActive(false);
                setIsComplete(true);
                const totalPausedMs = pausedTimeRef.current;
                const elapsed = Math.round((Date.now() - startTimeRef.current - totalPausedMs) / 1000);
                setCompletedDuration(elapsed);
                return prevRound;
              }
              return prevRound + 1;
            });
            // Reset to first phase for new round (or final state)
            setSecondsRemaining(exercise.phases[0].duration);
            return 0;
          }
          setSecondsRemaining(exercise.phases[nextPhase].duration);
          return nextPhase;
        });
        return 0; // will be overwritten by setSecondsRemaining above
      }
      return prev - 1;
    });
  }, [exercise.phases, rounds]);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, tick]);

  // Handle completion callback
  useEffect(() => {
    if (isComplete && completedDuration > 0) {
      const timer = setTimeout(() => {
        onComplete(completedDuration);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, completedDuration, onComplete]);

  const handlePause = () => {
    haptic('light');
    if (isPaused) {
      // Resuming — accumulate how long we were paused
      pausedTimeRef.current += Date.now() - pauseStartRef.current;
      setIsPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    haptic('light');
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onStop();
  };

  if (isComplete) {
    const mins = Math.floor(completedDuration / 60);
    const secs = completedDuration % 60;
    return (
      <div className="flex flex-col items-center py-8 gap-4">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-muted)' }}
        >
          <Wind size={40} style={{ color: 'var(--accent-secondary)' }} />
        </div>
        <p className="type-h2" style={{ color: 'var(--text-primary)' }}>
          Complete
        </p>
        <p className="type-body" style={{ color: 'var(--text-secondary)' }}>
          {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} of {exercise.name.toLowerCase()}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6 gap-5">
      {/* Round counter */}
      <p className="type-caption" style={{ color: 'var(--text-tertiary)' }}>
        Round {currentRound} of {rounds}
      </p>

      {/* Animated breathing circle */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'var(--accent-secondary)',
            opacity: 0.25,
            transform: `scale(${getCircleScale()})`,
            transition: `transform ${getTransitionDuration()}s ease-in-out`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="type-h2 text-lg" style={{ color: 'var(--text-primary)' }}>
            {currentPhaseData.label}
          </p>
          <p
            className="text-3xl font-light mt-1"
            style={{ color: 'var(--accent-secondary)', fontVariantNumeric: 'tabular-nums' }}
          >
            {secondsRemaining}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePause}
          className="flex items-center justify-center w-12 h-12 rounded-full active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button
          onClick={handleStop}
          className="flex items-center justify-center w-12 h-12 rounded-full active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
          aria-label="Stop"
        >
          <Square size={20} />
        </button>
      </div>
    </div>
  );
}

// -- Body Scan Timer --

function BodyScanTimer({ onComplete }: { onComplete: () => void }) {
  const [seconds, setSeconds] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      haptic('medium');
      onComplete();
    }
  }, [seconds, onComplete]);

  return (
    <div className="flex items-center gap-2 mt-3">
      <Timer size={16} style={{ color: 'var(--accent-secondary)' }} />
      <span
        className="type-label"
        style={{
          color: seconds > 0 ? 'var(--accent-secondary)' : 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {seconds > 0 ? `${seconds}s remaining` : 'Complete'}
      </span>
    </div>
  );
}

// -- Main Component --

export function MeditationSpace({ data, onUpdate }: MeditationSpaceProps) {
  const [activeExercise, setActiveExercise] = useState<BreathingExerciseType | null>(null);
  const [roundsOverride, setRoundsOverride] = useState<Record<string, number>>({});
  const [expandedGrounding, setExpandedGrounding] = useState<string | null>(null);
  const [bodyScanDone, setBodyScanDone] = useState(false);

  const today = getToday();
  const weekDates = getWeekDates();

  // Calculate today's minutes
  const todaysSessions = data.sessions.filter((s) => s.date === today);
  const todayMinutes = Math.round(
    todaysSessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
  );

  // Which days this week have sessions
  const sessionDates = new Set(data.sessions.map((s) => s.date));

  const getRounds = (exercise: BreathingExercise): number => {
    return roundsOverride[exercise.id] ?? data.preferences.defaultRounds[exercise.defaultRoundsKey];
  };

  const adjustRounds = (exerciseId: string, defaultKey: string, delta: number) => {
    haptic('light');
    const current =
      roundsOverride[exerciseId] ??
      data.preferences.defaultRounds[defaultKey as keyof typeof data.preferences.defaultRounds];
    const next = Math.max(1, Math.min(20, current + delta));
    setRoundsOverride((prev) => ({ ...prev, [exerciseId]: next }));
  };

  const startExercise = (exerciseId: BreathingExerciseType) => {
    haptic('light');
    setActiveExercise(exerciseId);
  };

  const handleComplete = useCallback(
    (type: MeditationExerciseType, durationSeconds: number) => {
      const session = {
        id: generateId(),
        date: getToday(),
        type,
        durationSeconds,
        completedAt: new Date().toISOString(),
      };
      onUpdate({
        sessions: [...data.sessions, session],
        lastModified: new Date().toISOString(),
      });
    },
    [data.sessions, onUpdate]
  );

  const handleBreathingComplete = useCallback(
    (durationSeconds: number) => {
      if (activeExercise) {
        handleComplete(activeExercise, durationSeconds);
      }
      setActiveExercise(null);
    },
    [activeExercise, handleComplete]
  );

  const handleBreathingStop = () => {
    setActiveExercise(null);
  };

  const toggleGrounding = (id: string) => {
    haptic('light');
    if (expandedGrounding === id) {
      setExpandedGrounding(null);
      setBodyScanDone(false);
    } else {
      setExpandedGrounding(id);
      setBodyScanDone(false);
    }
  };

  const handleBodyScanComplete = useCallback(() => {
    setBodyScanDone(true);
    handleComplete('body_scan', 60);
  }, [handleComplete]);

  const handleGroundingComplete = (id: string) => {
    haptic('light');
    if (id === 'grounding') {
      handleComplete('grounding', 30);
    }
    setExpandedGrounding(null);
  };

  // Active breathing exercise
  const activeExerciseData = activeExercise
    ? BREATHING_EXERCISES.find((e) => e.id === activeExercise)
    : null;

  return (
    <div className="space-y-5">
      {/* Minutes Tracked */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer size={16} style={{ color: 'var(--accent-secondary)' }} />
            <span className="type-label" style={{ color: 'var(--text-secondary)' }}>
              Today
            </span>
          </div>
          <span className="type-h2" style={{ color: 'var(--text-primary)' }}>
            {todayMinutes} min{todayMinutes !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Weekly dots */}
        <div className="flex items-center justify-between">
          {weekDates.map((date, i) => {
            const hasSessions = sessionDates.has(date);
            const isToday = date === today;
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: hasSessions ? 'var(--accent-secondary)' : 'var(--surface-inset)',
                    border: isToday ? '2px solid var(--accent-primary)' : 'none',
                  }}
                >
                  {hasSessions && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'white' }}
                    />
                  )}
                </div>
                <span
                  className="type-caption text-[10px]"
                  style={{ color: isToday ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                >
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breathing Exercises */}
      <div>
        <h3 className="type-label mb-3" style={{ color: 'var(--text-secondary)' }}>
          Breathing Exercises
        </h3>

        {activeExerciseData ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Wind size={16} style={{ color: 'var(--accent-secondary)' }} />
              <span className="type-label" style={{ color: 'var(--text-primary)' }}>
                {activeExerciseData.name}
              </span>
            </div>
            <BreathingTimer
              exercise={activeExerciseData}
              rounds={getRounds(activeExerciseData)}
              onComplete={handleBreathingComplete}
              onStop={handleBreathingStop}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {BREATHING_EXERCISES.map((exercise) => {
              const rounds = getRounds(exercise);
              const minutes = exercise.estimateMinutes(rounds);
              return (
                <div
                  key={exercise.id}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-card)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Wind size={16} style={{ color: 'var(--accent-secondary)' }} />
                        <span className="type-body font-medium" style={{ color: 'var(--text-primary)' }}>
                          {exercise.name}
                        </span>
                      </div>
                      <p
                        className="type-caption mt-0.5 ml-6"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {exercise.description}
                      </p>
                    </div>
                    <button
                      onClick={() => startExercise(exercise.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                      style={{
                        backgroundColor: 'var(--accent-muted)',
                        color: 'var(--accent-primary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <Play size={14} />
                      <span className="type-label text-xs">Start</span>
                    </button>
                  </div>

                  {/* Rounds adjuster */}
                  <div className="flex items-center gap-2 mt-2.5 ml-6">
                    <button
                      onClick={() => adjustRounds(exercise.id, exercise.defaultRoundsKey, -1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{
                        backgroundColor: 'var(--surface-inset)',
                        color: 'var(--text-tertiary)',
                      }}
                      aria-label="Fewer rounds"
                    >
                      <Minus size={12} />
                    </button>
                    <span
                      className="type-caption min-w-[80px] text-center"
                      style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {rounds} rounds ~{minutes || 1}m
                    </span>
                    <button
                      onClick={() => adjustRounds(exercise.id, exercise.defaultRoundsKey, 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{
                        backgroundColor: 'var(--surface-inset)',
                        color: 'var(--text-tertiary)',
                      }}
                      aria-label="More rounds"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grounding Exercises */}
      <div>
        <h3 className="type-label mb-3" style={{ color: 'var(--text-secondary)' }}>
          Grounding
        </h3>
        <div className="space-y-2">
          {GROUNDING_EXERCISES.map((exercise) => {
            const isExpanded = expandedGrounding === exercise.id;
            const Icon = exercise.icon;
            return (
              <div
                key={exercise.id}
                className="rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <button
                  onClick={() => toggleGrounding(exercise.id)}
                  className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent-muted)' }}
                  >
                    <Icon size={16} style={{ color: 'var(--accent-secondary)' }} />
                  </div>
                  <span className="type-body font-medium" style={{ color: 'var(--text-primary)' }}>
                    {exercise.name}
                  </span>
                </button>

                {isExpanded && (
                  <div
                    className="px-4 pb-4"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <p
                      className="type-body mt-3 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {exercise.content}
                    </p>

                    {exercise.hasTimer && !bodyScanDone && (
                      <BodyScanTimer onComplete={handleBodyScanComplete} />
                    )}

                    {exercise.hasTimer && bodyScanDone && (
                      <div className="flex items-center gap-2 mt-3">
                        <Timer size={16} style={{ color: 'var(--accent-secondary)' }} />
                        <span className="type-label" style={{ color: 'var(--accent-secondary)' }}>
                          Complete - session saved
                        </span>
                      </div>
                    )}

                    {!exercise.hasTimer && (
                      <button
                        onClick={() => handleGroundingComplete(exercise.id)}
                        className="mt-3 px-3 py-1.5 rounded-lg active:scale-95 transition-transform type-label text-xs"
                        style={{
                          backgroundColor: 'var(--accent-muted)',
                          color: 'var(--accent-primary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
