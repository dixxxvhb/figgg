import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Wind, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { haptic } from '../../utils/haptics';
import type { BreathingPattern, BreathingSession } from '../../types';

const PRESET_PATTERNS: BreathingPattern[] = [
  { id: 'calm-478', name: '4-7-8 Calm', description: 'Slow your nervous system', inhale: 4, hold: 7, exhale: 8, rounds: 4 },
  { id: 'box', name: 'Box Breathing', description: 'Reset and center', inhale: 4, hold: 4, exhale: 4, holdAfterExhale: 4, rounds: 4 },
  { id: 'quick-24', name: '2-4 Quick Calm', description: 'Fast relief in 1 minute', inhale: 2, hold: 0, exhale: 4, rounds: 6 },
  { id: 'balance-55', name: '5-5 Balance', description: 'Simple and grounding', inhale: 5, hold: 0, exhale: 5, rounds: 5 },
];

type Phase = 'inhale' | 'hold' | 'exhale' | 'holdAfterExhale';

const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'Breathe In',
  hold: 'Hold',
  exhale: 'Breathe Out',
  holdAfterExhale: 'Hold',
};

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTimingLabel(p: BreathingPattern): string {
  const parts = [String(p.inhale)];
  if (p.hold > 0) parts.push(String(p.hold));
  parts.push(String(p.exhale));
  if (p.holdAfterExhale && p.holdAfterExhale > 0) parts.push(String(p.holdAfterExhale));
  return parts.join('-');
}

export function BreathingTab() {
  const { data, updateSelfCare } = useAppData();
  const [activePattern, setActivePattern] = useState<BreathingPattern | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const breathing = data.selfCare?.breathing;
  const recentSessions = (breathing?.sessions || [])
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 7);

  const getPhaseSequence = useCallback((pattern: BreathingPattern): { phase: Phase; duration: number }[] => {
    const seq: { phase: Phase; duration: number }[] = [];
    seq.push({ phase: 'inhale', duration: pattern.inhale });
    if (pattern.hold > 0) seq.push({ phase: 'hold', duration: pattern.hold });
    seq.push({ phase: 'exhale', duration: pattern.exhale });
    if (pattern.holdAfterExhale && pattern.holdAfterExhale > 0) {
      seq.push({ phase: 'holdAfterExhale', duration: pattern.holdAfterExhale });
    }
    return seq;
  }, []);

  const phaseIndexRef = useRef(0);
  const roundRef = useRef(1);

  const stopExercise = useCallback((completed: boolean) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (completed && activePattern && totalElapsed > 0) {
      const session: BreathingSession = {
        id: `breath_${Date.now()}`,
        patternId: activePattern.id,
        date: getTodayKey(),
        durationSeconds: totalElapsed,
        completedRounds: roundRef.current,
        timestamp: new Date().toISOString(),
      };
      const existing = data.selfCare?.breathing?.sessions || [];
      updateSelfCare({ breathing: { ...data.selfCare?.breathing, sessions: [...existing, session] } });
      haptic('medium');
    }

    setIsRunning(false);
    setIsPaused(false);
    setActivePattern(null);
    setTotalElapsed(0);
    setCurrentRound(1);
    phaseIndexRef.current = 0;
    roundRef.current = 1;
  }, [activePattern, totalElapsed, data.selfCare?.breathing, updateSelfCare]);

  const startExercise = useCallback((pattern: BreathingPattern) => {
    setActivePattern(pattern);
    setIsRunning(true);
    setIsPaused(false);
    setTotalElapsed(0);
    setCurrentRound(1);
    phaseIndexRef.current = 0;
    roundRef.current = 1;
    startTimeRef.current = Date.now();

    const seq = getPhaseSequence(pattern);
    setCurrentPhase(seq[0].phase);
    setPhaseSecondsLeft(seq[0].duration);
    haptic('medium');
  }, [getPhaseSequence]);

  // Main timer tick
  useEffect(() => {
    if (!isRunning || isPaused || !activePattern) return;

    const seq = getPhaseSequence(activePattern);

    intervalRef.current = setInterval(() => {
      setTotalElapsed(prev => prev + 1);
      setPhaseSecondsLeft(prev => {
        if (prev <= 1) {
          // Move to next phase
          phaseIndexRef.current++;
          if (phaseIndexRef.current >= seq.length) {
            // Next round
            phaseIndexRef.current = 0;
            roundRef.current++;
            setCurrentRound(roundRef.current);
            if (roundRef.current > activePattern.rounds) {
              // Done
              stopExercise(true);
              return 0;
            }
          }
          const next = seq[phaseIndexRef.current];
          setCurrentPhase(next.phase);
          haptic('light');
          return next.duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isPaused, activePattern, getPhaseSequence, stopExercise]);

  // Circle scale based on phase
  const circleScale = currentPhase === 'inhale'
    ? 1.0
    : currentPhase === 'exhale'
      ? 0.5
      : (currentPhase === 'hold' ? 1.0 : 0.5);

  // Active exercise view
  if (isRunning && activePattern) {
    const seq = getPhaseSequence(activePattern);
    const currentPhaseDuration = seq[phaseIndexRef.current]?.duration || 1;
    const progress = 1 - (phaseSecondsLeft / currentPhaseDuration);

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 gap-8">
        {/* Pattern name */}
        <div className="text-center">
          <div className="type-label text-[var(--text-tertiary)]">{activePattern.name}</div>
          <div className="type-caption text-[var(--text-tertiary)] mt-1">
            Round {Math.min(currentRound, activePattern.rounds)} of {activePattern.rounds}
          </div>
        </div>

        {/* Animated circle */}
        <div className="relative w-52 h-52 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full transition-transform"
            style={{
              backgroundColor: 'var(--accent-primary)',
              opacity: 0.15,
              transform: `scale(${circleScale})`,
              transitionDuration: `${currentPhaseDuration}s`,
              transitionTimingFunction: 'ease-in-out',
            }}
          />
          <div
            className="absolute inset-4 rounded-full border-2 border-[var(--accent-primary)] transition-transform"
            style={{
              opacity: 0.3,
              transform: `scale(${circleScale})`,
              transitionDuration: `${currentPhaseDuration}s`,
              transitionTimingFunction: 'ease-in-out',
            }}
          />
          <div className="text-center z-10">
            <div className="text-3xl font-display font-bold text-[var(--accent-primary)]">
              {phaseSecondsLeft}
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              {PHASE_LABELS[currentPhase]}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1.5 rounded-full bg-[var(--surface-inset)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setIsPaused(p => !p); haptic('light'); }}
            className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center"
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button
            onClick={() => stopExercise(false)}
            className="w-12 h-12 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--status-danger)]"
          >
            <Square size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Pattern selector view
  return (
    <div className="space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-3">
        {PRESET_PATTERNS.map(pattern => (
          <button
            key={pattern.id}
            onClick={() => startExercise(pattern)}
            className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wind size={16} className="text-[var(--accent-primary)]" />
              <span className="type-label text-[var(--accent-primary)]">{formatTimingLabel(pattern)}</span>
            </div>
            <div className="font-semibold text-[var(--text-primary)] text-sm">{pattern.name}</div>
            <div className="type-caption text-[var(--text-tertiary)] mt-1">{pattern.description}</div>
            <div className="type-caption text-[var(--text-tertiary)] mt-1">{pattern.rounds} rounds</div>
          </button>
        ))}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <span className="type-label text-[var(--text-tertiary)]">Recent ({recentSessions.length})</span>
            </div>
            {showHistory ? <ChevronUp size={14} className="text-[var(--text-tertiary)]" /> : <ChevronDown size={14} className="text-[var(--text-tertiary)]" />}
          </button>
          {showHistory && (
            <div className="border-t border-[var(--border-subtle)]">
              {recentSessions.map(s => {
                const pattern = PRESET_PATTERNS.find(p => p.id === s.patternId);
                return (
                  <div key={s.id} className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--border-subtle)] last:border-0">
                    <div>
                      <div className="text-sm text-[var(--text-primary)]">{pattern?.name || s.patternId}</div>
                      <div className="type-caption text-[var(--text-tertiary)]">{s.completedRounds} rounds, {Math.floor(s.durationSeconds / 60)}:{String(s.durationSeconds % 60).padStart(2, '0')}</div>
                    </div>
                    <div className="type-caption text-[var(--text-tertiary)]">{s.date}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
