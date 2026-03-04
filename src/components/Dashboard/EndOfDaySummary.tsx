import { useMemo } from 'react';
import { Check, FileText, Pill, Heart, Sparkles } from 'lucide-react';
import type { Class, AppData, WeekNotes } from '../../types';
import { formatWeekOf, getWeekStart } from '../../utils/time';

interface EndOfDaySummaryProps {
  todayClasses: Class[];
  data: AppData;
}

const AFFIRM_MESSAGES = [
  "You showed up today. That counts.",
  "Another day in the books.",
  "Well done — rest up.",
  "You made it through. Be proud.",
  "Good work today. Tomorrow's a new day.",
  "That's a wrap. You earned this rest.",
  "Day done. Let it go.",
];

export function EndOfDaySummary({ todayClasses, data }: EndOfDaySummaryProps) {
  const summary = useMemo(() => {
    const weekOf = formatWeekOf(getWeekStart());
    const weekNote: WeekNotes | undefined = data.weekNotes.find(w => w.weekOf === weekOf);
    const todayStr = new Date().toISOString().split('T')[0];

    // Count notes captured today across all classes
    let notesCount = 0;
    if (weekNote) {
      for (const classId of todayClasses.map(c => c.id)) {
        const cn = weekNote.classNotes[classId];
        if (cn?.liveNotes) {
          notesCount += cn.liveNotes.filter(n =>
            n.timestamp.startsWith(todayStr)
          ).length;
        }
      }
    }

    // Wellness checklist progress
    const sc = data.selfCare;
    const checklistStates = sc?.unifiedTaskDate === todayStr ? sc.unifiedTaskStates || {} : {};
    const checklistDone = Object.values(checklistStates).filter(Boolean).length;

    // Meds
    const dose1 = sc?.dose1Date === todayStr && sc.dose1Time;
    const dose2 = sc?.dose2Date === todayStr && sc.dose2Time;
    const medsStatus = sc?.skippedDoseDate === todayStr ? 'skipped'
      : (dose1 && dose2) ? 'all' : dose1 ? 'partial' : 'none';

    // Affirmation
    const idx = Math.floor(Date.now() / 86400000) % AFFIRM_MESSAGES.length;
    const affirmation = AFFIRM_MESSAGES[idx];

    return { notesCount, checklistDone, medsStatus, affirmation };
  }, [todayClasses, data]);

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Day Wrap-Up</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Classes taught */}
          <div className="text-center py-2 px-1 rounded-xl bg-[var(--surface-inset)]">
            <div className="text-lg font-bold text-[var(--text-primary)]">{todayClasses.length}</div>
            <div className="text-[10px] text-[var(--text-tertiary)]">
              {todayClasses.length === 1 ? 'Class' : 'Classes'}
            </div>
          </div>
          {/* Notes captured */}
          <div className="text-center py-2 px-1 rounded-xl bg-[var(--surface-inset)]">
            <div className="flex items-center justify-center gap-1">
              <FileText size={12} className="text-[var(--accent-primary)]" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{summary.notesCount}</span>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Notes</div>
          </div>
          {/* Checklist */}
          <div className="text-center py-2 px-1 rounded-xl bg-[var(--surface-inset)]">
            <div className="flex items-center justify-center gap-1">
              <Check size={12} className="text-[var(--status-success)]" />
              <span className="text-lg font-bold text-[var(--text-primary)]">{summary.checklistDone}</span>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">Checklist</div>
          </div>
        </div>

        {/* Meds status */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-3">
          <Pill size={12} />
          <span>
            {summary.medsStatus === 'all' && 'All doses taken'}
            {summary.medsStatus === 'partial' && 'Dose 1 taken'}
            {summary.medsStatus === 'skipped' && 'Off day — no meds'}
            {summary.medsStatus === 'none' && 'No meds logged'}
          </span>
        </div>

        {/* Affirmation */}
        <p className="text-sm text-[var(--text-primary)] italic flex items-center gap-2">
          <Heart size={12} className="text-[var(--status-danger)] flex-shrink-0" />
          {summary.affirmation}
        </p>
      </div>
    </div>
  );
}
