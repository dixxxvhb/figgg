import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Pill, Zap, Moon, SkipForward, Undo2, Check, X, ChevronRight, Clock, ChevronDown,
} from 'lucide-react';
import type { SelfCareData, MedConfig, Class, Studio, LearningData } from '../../types';
import { DEFAULT_MED_CONFIG } from '../../types';
import { getCurrentDayOfWeek } from '../../utils/time';
import { haptic } from '../../utils/haptics';

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime12(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m)]} ${parseInt(d)}`;
}

function getDoseInfo(takenAt: number): { status: string; color: string; percent: number } {
  const hours = (Date.now() - takenAt) / (60 * 60 * 1000);
  if (hours < 0.5) return { status: 'Kicking in', color: 'bg-[var(--status-warning)]', percent: 15 };
  if (hours < 1) return { status: 'Building', color: 'bg-[var(--status-warning)]', percent: 40 };
  if (hours < 2) return { status: 'Peak Focus', color: 'bg-[var(--status-success)]', percent: 100 };
  if (hours < 3) return { status: 'Peak Focus', color: 'bg-[var(--status-success)]', percent: 90 };
  if (hours < 4) return { status: 'Wearing Off', color: 'bg-[var(--status-warning)]', percent: 60 };
  if (hours < 5) return { status: 'Low', color: 'bg-[var(--status-warning)]', percent: 30 };
  return { status: 'Worn Off', color: 'bg-[var(--surface-inset)]', percent: 10 };
}

function isTodayTimestamp(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

function DoseCard({ num, time, info, skipped, onTake, onSkip, onUndoSkip, onEdit, onUndo }: {
  num: number; time: number | null; info: ReturnType<typeof getDoseInfo> | null;
  skipped: boolean; onTake: () => void; onSkip: () => void; onUndoSkip: () => void;
  onEdit: () => void; onUndo: () => void;
}) {
  return (
    <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3">
      {skipped && !time ? (
        <div className="text-center">
          <SkipForward size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
          <div className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Dose {num} Skipped</div>
          <div className="flex gap-1">
            <button onClick={onUndoSkip} className="flex-1 px-2 py-1.5 text-xs text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--surface-inset)]">Undo</button>
            <button onClick={onTake} className="flex-1 px-2 py-1.5 text-xs bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium rounded-[var(--radius-sm)] active:scale-90 transition-all duration-150">Take</button>
          </div>
        </div>
      ) : time ? (
        <div className="text-center opacity-80">
          <Pill size={18} className="mx-auto text-[var(--status-success)] mb-1" />
          <div className="text-xs font-bold text-[var(--text-primary)]">Dose {num}</div>
          <div className="type-caption text-[var(--text-secondary)] mb-2">{formatTime12(new Date(time))} &bull; {info?.status}</div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="flex-1 px-2 py-1.5 text-xs border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">Edit</button>
            <button onClick={onUndo} className="flex-1 px-2 py-1.5 text-xs text-[var(--status-danger)] rounded-[var(--radius-sm)]">Clear</button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Pill size={18} className="mx-auto text-[var(--text-tertiary)] mb-1" />
          <div className="text-xs font-bold text-[var(--text-primary)]">Dose {num}</div>
          <div className="type-caption text-[var(--text-tertiary)] mb-2">Not taken</div>
          <button onClick={onTake} className="w-full px-3 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-semibold rounded-[var(--radius-sm)] min-h-[36px] active:scale-90 transition-all duration-150">Take Now</button>
        </div>
      )}
    </div>
  );
}

interface MedsTrackerProps {
  selfCare: SelfCareData | undefined;
  medConfig: MedConfig;
  classes: Class[];
  studios: Studio[];
  onUpdateSelfCare: (updates: Partial<SelfCareData>) => void;
  learningData?: LearningData;
}

export function MedsTracker({ selfCare, medConfig, classes, studios, onUpdateSelfCare, learningData }: MedsTrackerProps) {
  const sc = selfCare || {};
  const config = medConfig || DEFAULT_MED_CONFIG;

  const [dose1Time, setDose1Time] = useState<number | null>(null);
  const [dose2Time, setDose2Time] = useState<number | null>(null);
  const [dose3Time, setDose3Time] = useState<number | null>(null);
  const [skippedToday, setSkippedToday] = useState(false);
  const [skippedDose1, setSkippedDose1] = useState(false);
  const [skippedDose2, setSkippedDose2] = useState(false);
  const [skippedDose3, setSkippedDose3] = useState(false);
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [showOptionalDose3, setShowOptionalDose3] = useState(false);
  const [editingDose, setEditingDose] = useState<1 | 2 | 3 | null>(null);
  const [editTimeValue, setEditTimeValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Auto-expand optional dose 3 if AI suggested it
  useEffect(() => {
    if (config.maxDoses === 2 && sc?.suggestedDose3Date === getTodayKey()) {
      setShowOptionalDose3(true);
    }
  }, [selfCare, config.maxDoses]);

  // Load meds from selfCare (reactive to sync)
  useEffect(() => {
    if (isTodayTimestamp(sc.dose1Time)) setDose1Time(sc.dose1Time!);
    else setDose1Time(null);
    if (isTodayTimestamp(sc.dose2Time)) setDose2Time(sc.dose2Time!);
    else setDose2Time(null);
    if (isTodayTimestamp(sc.dose3Time)) setDose3Time(sc.dose3Time!);
    else setDose3Time(null);
    const today = getTodayKey();
    setSkippedToday(sc.skippedDoseDate === today);
    setSkippedDose1(sc.skippedDose1Date === today);
    setSkippedDose2(sc.skippedDose2Date === today);
    setSkippedDose3(sc.skippedDose3Date === today);
  }, [selfCare]);

  // Current time for status updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    onUpdateSelfCare(updates);
  }, [onUpdateSelfCare]);

  // Dose handlers
  const handleTakeDose1 = () => {
    const now = Date.now();
    setDose1Time(now);
    setSkippedToday(false);
    setSkippedDose1(false);
    haptic('light');
    persist({ dose1Time: now, dose1Date: getTodayKey(), skippedDoseDate: null, skippedDose1Date: null });
  };

  const handleTakeDose2 = () => {
    const now = Date.now();
    setDose2Time(now);
    setSkippedDose2(false);
    if (dose1Time) setSkippedToday(false);
    haptic('light');
    persist({ dose2Time: now, dose2Date: getTodayKey(), skippedDose2Date: null, skippedDoseDate: dose1Time ? null : undefined });
  };

  const handleTakeDose3 = () => {
    const now = Date.now();
    setDose3Time(now);
    setSkippedDose3(false);
    haptic('light');
    persist({ dose3Time: now, dose3Date: getTodayKey(), skippedDose3Date: null });
  };

  const handleSkipToday = () => {
    setSkippedToday(true);
    setSkippedDose1(true);
    setSkippedDose2(true);
    setSkippedDose3(true);
    setDose1Time(null);
    setDose2Time(null);
    setDose3Time(null);
    setShowSkipOptions(false);
    persist({
      skippedDoseDate: getTodayKey(), skippedDose1Date: getTodayKey(), skippedDose2Date: getTodayKey(), skippedDose3Date: getTodayKey(),
      dose1Time: null, dose1Date: getTodayKey(), dose2Time: null, dose2Date: getTodayKey(), dose3Time: null, dose3Date: getTodayKey(),
    });
  };

  const handleSkipDose1 = () => { setSkippedDose1(true); setDose1Time(null); setShowSkipOptions(false); persist({ skippedDose1Date: getTodayKey(), dose1Time: null, dose1Date: getTodayKey() }); };
  const handleSkipDose2 = () => { setSkippedDose2(true); setDose2Time(null); setShowSkipOptions(false); persist({ skippedDose2Date: getTodayKey(), dose2Time: null, dose2Date: getTodayKey() }); };
  const handleSkipDose3 = () => { setSkippedDose3(true); setDose3Time(null); setShowSkipOptions(false); persist({ skippedDose3Date: getTodayKey(), dose3Time: null, dose3Date: getTodayKey() }); };

  const handleUndoSkip = () => { setSkippedToday(false); setSkippedDose1(false); setSkippedDose2(false); setSkippedDose3(false); persist({ skippedDoseDate: null, skippedDose1Date: null, skippedDose2Date: null, skippedDose3Date: null }); };
  const handleUndoSkipDose1 = () => { setSkippedDose1(false); if (!skippedDose2) setSkippedToday(false); persist({ skippedDose1Date: null, skippedDoseDate: skippedDose2 ? getTodayKey() : null }); };
  const handleUndoSkipDose2 = () => { setSkippedDose2(false); if (!skippedDose1) setSkippedToday(false); persist({ skippedDose2Date: null, skippedDoseDate: skippedDose1 ? getTodayKey() : null }); };
  const handleUndoSkipDose3 = () => { setSkippedDose3(false); persist({ skippedDose3Date: null }); };

  const handleUndoDose1 = () => { setDose1Time(null); persist({ dose1Time: null, dose1Date: getTodayKey() }); };
  const handleUndoDose2 = () => { setDose2Time(null); persist({ dose2Time: null, dose2Date: getTodayKey() }); };
  const handleUndoDose3 = () => { setDose3Time(null); persist({ dose3Time: null, dose3Date: getTodayKey() }); };

  const handleEditDose = (doseNum: 1 | 2 | 3) => {
    const doseTime = doseNum === 1 ? dose1Time : doseNum === 2 ? dose2Time : dose3Time;
    if (doseTime) {
      const date = new Date(doseTime);
      setEditTimeValue(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    } else {
      const now = new Date();
      setEditTimeValue(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }
    setEditingDose(doseNum);
  };

  const handleSaveEditTime = () => {
    if (!editingDose || !editTimeValue) return;
    const [hours, mins] = editTimeValue.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, mins, 0, 0);
    const timestamp = newTime.getTime();
    if (editingDose === 1) { setDose1Time(timestamp); setSkippedToday(false); persist({ dose1Time: timestamp, dose1Date: getTodayKey(), skippedDoseDate: null }); }
    else if (editingDose === 2) { setDose2Time(timestamp); persist({ dose2Time: timestamp, dose2Date: getTodayKey() }); }
    else if (editingDose === 3) { setDose3Time(timestamp); persist({ dose3Time: timestamp, dose3Date: getTodayKey() }); }
    setEditingDose(null);
  };

  // Computed
  const dose1Info = dose1Time ? getDoseInfo(dose1Time) : null;
  const dose2Info = dose2Time ? getDoseInfo(dose2Time) : null;
  const dose3Info = dose3Time ? getDoseInfo(dose3Time) : null;
  const activeDose = dose3Info && dose3Info.status !== 'Worn Off'
    ? { info: dose3Info, time: dose3Time, num: 3 }
    : dose2Info && dose2Info.status !== 'Worn Off'
      ? { info: dose2Info, time: dose2Time, num: 2 }
      : dose1Info && dose1Info.status !== 'Worn Off'
        ? { info: dose1Info, time: dose1Time, num: 1 }
        : null;

  const [historyRange, setHistoryRange] = useState<7 | 30>(7);

  // Build dose history from learningData snapshots + today's live data
  const doseHistory = useMemo(() => {
    const today = getTodayKey();
    type HistoryEntry = { date: string; dose1: string; dose2: string; dose3?: string; skipped?: boolean };
    const entries: HistoryEntry[] = [];

    // Today's live entry
    entries.push({
      date: today,
      dose1: dose1Time ? formatTime12(new Date(dose1Time)) : skippedDose1 ? 'Skipped' : '—',
      dose2: dose2Time ? formatTime12(new Date(dose2Time)) : skippedDose2 ? 'Skipped' : '—',
      dose3: (config.maxDoses === 3 || dose3Time) ? (dose3Time ? formatTime12(new Date(dose3Time)) : skippedDose3 ? 'Skipped' : '—') : undefined,
      skipped: skippedToday,
    });

    // Past days from learningData snapshots
    const snapshots = learningData?.dailySnapshots || [];
    const pastDays = snapshots
      .filter(s => s.date !== today && s.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, historyRange - 1);

    for (const snap of pastDays) {
      entries.push({
        date: snap.date,
        dose1: snap.dose1Time || (snap.skippedDoses ? 'Skipped' : '—'),
        dose2: snap.dose2Time || (snap.skippedDoses ? 'Skipped' : '—'),
        dose3: (config.maxDoses === 3 || snap.dose3Time) ? (snap.dose3Time || (snap.skippedDoses ? 'Skipped' : '—')) : undefined,
        skipped: snap.skippedDoses,
      });
    }

    return entries;
  }, [dose1Time, dose2Time, dose3Time, skippedToday, skippedDose1, skippedDose2, skippedDose3, config.maxDoses, learningData, historyRange]);

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Status bar */}
      {!skippedToday && activeDose && (
        <div className={`rounded-[var(--radius-md)] px-3 py-2.5 ${activeDose.info.color} text-[var(--text-on-accent)] flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Zap size={16} className="opacity-90" />
            <span className="font-bold text-sm">{activeDose.info.status}</span>
            <span className="text-xs opacity-75">Dose {activeDose.num} &bull; {formatTime12(new Date(activeDose.time!))}</span>
          </div>
          <span className="text-lg font-bold">{activeDose.info.percent}%</span>
        </div>
      )}

      {/* Skipped banner */}
      {skippedToday && skippedDose1 && skippedDose2 && (
        <div className="rounded-[var(--radius-md)] px-3 py-2.5 bg-[var(--surface-inset)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-[var(--text-tertiary)]" />
            <span className="font-semibold text-sm text-[var(--text-primary)]">Off Day</span>
            <span className="text-xs text-[var(--text-tertiary)]">No meds today</span>
          </div>
          <button onClick={handleUndoSkip} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card)] rounded-[var(--radius-sm)]">
            <Undo2 size={12} /> Undo
          </button>
        </div>
      )}

      {/* Dose cards */}
      {!(skippedToday && skippedDose1 && skippedDose2 && skippedDose3) && (
        <>
          <div className={`grid gap-2 ${(config.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <DoseCard num={1} time={dose1Time} info={dose1Info} skipped={skippedDose1}
              onTake={handleTakeDose1} onSkip={handleSkipDose1} onUndoSkip={handleUndoSkipDose1}
              onEdit={() => handleEditDose(1)} onUndo={handleUndoDose1} />
            <DoseCard num={2} time={dose2Time} info={dose2Info} skipped={skippedDose2}
              onTake={handleTakeDose2} onSkip={handleSkipDose2} onUndoSkip={handleUndoSkipDose2}
              onEdit={() => handleEditDose(2)} onUndo={handleUndoDose2} />
            {(config.maxDoses === 3 || showOptionalDose3 || dose3Time || skippedDose3) && (
              <DoseCard num={3} time={dose3Time} info={dose3Info} skipped={skippedDose3}
                onTake={handleTakeDose3} onSkip={handleSkipDose3} onUndoSkip={handleUndoSkipDose3}
                onEdit={() => handleEditDose(3)} onUndo={handleUndoDose3} />
            )}
          </div>

          {/* Optional dose 3 prompt */}
          {config.maxDoses === 2 && dose2Time && !showOptionalDose3 && !dose3Time && !skippedDose3 && (
            <button
              onClick={() => { setShowOptionalDose3(true); haptic('light'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
            >
              <Zap size={14} />
              <span className="text-xs font-medium">Long day? Add a 3rd dose</span>
            </button>
          )}

          {/* Edit dose time */}
          {editingDose && (
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] p-3 flex items-center gap-3">
              <Pill size={16} className="text-[var(--accent-primary)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Dose {editingDose}</span>
              <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="flex-1 px-2 py-1.5 text-sm border border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--surface-inset)] text-[var(--text-primary)]" autoFocus />
              <button onClick={handleSaveEditTime} className="p-1.5 bg-[var(--status-success)] text-white rounded-[var(--radius-sm)]" aria-label="Save"><Check size={16} /></button>
              <button onClick={() => setEditingDose(null)} className="p-1.5 bg-[var(--surface-inset)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]" aria-label="Cancel"><X size={16} /></button>
            </div>
          )}

          {/* Skip */}
          {((!dose1Time && !skippedDose1) || (!dose2Time && !skippedDose2) || ((config.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3)) && (
            <div className="relative">
              <button onClick={() => setShowSkipOptions(!showSkipOptions)} className="w-full flex items-center justify-center gap-1.5 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <SkipForward size={13} />
                <span className="text-xs">Skip</span>
                <ChevronRight size={12} className={`transition-transform ${showSkipOptions ? 'rotate-90' : ''}`} />
              </button>
              {showSkipOptions && (
                <div className="mt-1 bg-[var(--surface-card)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
                  {!dose1Time && !skippedDose1 && (
                    <button onClick={handleSkipDose1} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                      <SkipForward size={14} className="text-[var(--accent-primary)]" />
                      <span className="text-sm text-[var(--text-primary)]">Skip Dose 1</span>
                    </button>
                  )}
                  {!dose2Time && !skippedDose2 && (
                    <button onClick={handleSkipDose2} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                      <SkipForward size={14} className="text-[var(--status-warning)]" />
                      <span className="text-sm text-[var(--text-primary)]">Skip Dose 2</span>
                    </button>
                  )}
                  {(config.maxDoses === 3 || showOptionalDose3) && !dose3Time && !skippedDose3 && (
                    <button onClick={handleSkipDose3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                      <SkipForward size={14} className="text-[var(--accent-primary)]" />
                      <span className="text-sm text-[var(--text-primary)]">Skip Dose 3</span>
                    </button>
                  )}
                  <button onClick={handleSkipToday} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--surface-inset)]">
                    <Moon size={14} className="text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-primary)]">Skip all day</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        <Clock size={12} />
        <span className="text-xs">{showHistory ? 'Hide' : 'Show'} history</span>
        <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
      </button>
      {showHistory && (
        <div className="bg-[var(--surface-inset)] rounded-[var(--radius-md)] p-3 space-y-2">
          {/* Range toggle */}
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setHistoryRange(7)} className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${historyRange === 7 ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' : 'text-[var(--text-tertiary)]'}`}>7 days</button>
            <button onClick={() => setHistoryRange(30)} className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${historyRange === 30 ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]' : 'text-[var(--text-tertiary)]'}`}>30 days</button>
          </div>
          {doseHistory.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-2">No history yet</p>
          ) : (
            <div className="space-y-0.5">
              {doseHistory.map((entry, idx) => {
                const isToday = idx === 0;
                const dateLabel = isToday ? 'Today' : formatShortDate(entry.date);
                const allTaken = entry.dose1 !== '—' && entry.dose1 !== 'Skipped' && entry.dose2 !== '—' && entry.dose2 !== 'Skipped';
                return (
                  <div key={entry.date} className={`flex items-center gap-2 text-xs py-1 px-1 rounded ${isToday ? 'bg-[var(--surface-card)]' : ''}`}>
                    <span className={`w-12 flex-shrink-0 ${isToday ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{dateLabel}</span>
                    <span className={`w-3 text-center ${entry.skipped ? '❌' : allTaken ? '' : ''}`}>
                      {entry.skipped ? <Moon size={10} className="text-[var(--text-tertiary)]" /> : allTaken ? <Check size={10} className="text-[var(--status-success)]" /> : <span className="text-[var(--text-tertiary)]">·</span>}
                    </span>
                    <span className="text-[var(--text-secondary)]">{entry.dose1}</span>
                    <span className="text-[var(--text-tertiary)]">|</span>
                    <span className="text-[var(--text-secondary)]">{entry.dose2}</span>
                    {entry.dose3 !== undefined && <><span className="text-[var(--text-tertiary)]">|</span><span className="text-[var(--text-secondary)]">{entry.dose3}</span></>}
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
