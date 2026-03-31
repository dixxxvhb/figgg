import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { formatWeekOf, getWeekStart, formatTimeDisplay } from '../utils/time';
import { normalizeNoteCategory } from '../types';
import type { LiveNote, Class } from '../types';
import { useTeachingStats } from '../hooks/useTeachingStats';
import { WeeklyInsight } from '../components/Dashboard/WeeklyInsight';

const CATEGORY_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  'worked-on': { label: 'Worked On', icon: FileText, color: 'text-[var(--status-success)]' },
  'needs-work': { label: 'Needs Work', icon: AlertTriangle, color: 'text-[var(--status-warning)]' },
  'next-week': { label: 'Next Week', icon: ArrowRight, color: 'text-[var(--accent-primary)]' },
  'ideas': { label: 'Ideas', icon: Lightbulb, color: 'text-[var(--status-info,var(--accent-primary))]' },
};

export function WeekReview() {
  const { data } = useAppData();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current, -1 = last week, etc.
  const stats = useTeachingStats(data);

  const weekData = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);
    const weekOf = formatWeekOf(getWeekStart(baseDate));
    const weekNote = data.weekNotes.find(w => w.weekOf === weekOf);

    // Build a map of classId -> Class for name lookup (includes calendar events)
    const classMap = new Map<string, Class>();
    for (const cls of data.classes) classMap.set(cls.id, cls);
    // Also map calendar events so notes saved against cal-* IDs resolve names
    for (const e of (data.calendarEvents || [])) {
      if (!classMap.has(e.id) && e.title) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
        const d = new Date(`${e.date}T12:00:00`);
        classMap.set(e.id, {
          id: e.id,
          name: e.title,
          day: dayNames[d.getDay()],
          startTime: e.startTime || '',
          endTime: e.endTime || '',
          studioId: '',
          musicLinks: [],
        });
      }
    }

    // Aggregate notes per class, sorted by day/time
    const classSummaries: {
      classId: string;
      className: string;
      day: string;
      startTime: string;
      notes: (LiveNote & { normalizedCategory: LiveNote['category'] })[];
      plan?: string;
      nextWeekGoal?: string;
    }[] = [];

    if (weekNote) {
      for (const [classId, cn] of Object.entries(weekNote.classNotes)) {
        if (!cn.liveNotes?.length && !cn.plan) continue;
        const cls = classMap.get(classId);
        classSummaries.push({
          classId,
          className: cls?.name || classId,
          day: cls?.day || '',
          startTime: cls?.startTime || '',
          notes: cn.liveNotes.map(n => ({
            ...n,
            normalizedCategory: normalizeNoteCategory(n.category),
          })),
          plan: cn.plan || undefined,
          nextWeekGoal: cn.nextWeekGoal || undefined,
        });
      }
    }

    // Sort by day-of-week order
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    classSummaries.sort((a, b) => {
      const da = dayOrder.indexOf(a.day);
      const db = dayOrder.indexOf(b.day);
      if (da !== db) return da - db;
      return a.startTime.localeCompare(b.startTime);
    });

    const totalNotes = classSummaries.reduce((sum, cs) => sum + cs.notes.length, 0);

    // Format week label
    const monday = getWeekStart(baseDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${fmt(monday)} – ${fmt(sunday)}`;

    return { weekOf, classSummaries, totalNotes, weekLabel, reflection: weekNote?.reflection };
  }, [data, weekOffset]);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <Link to={`/schedule${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Week Review</h1>
      </div>

      {/* Week navigation */}
      <div className="px-4 flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-inset)]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{weekData.weekLabel}</span>
        <button
          onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
          disabled={weekOffset >= 0}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-4 px-3 py-2 bg-[var(--surface-inset)] rounded-xl text-xs text-[var(--text-secondary)]">
          <span><strong className="text-[var(--text-primary)]">{weekData.classSummaries.length}</strong> classes with notes</span>
          <span><strong className="text-[var(--text-primary)]">{weekData.totalNotes}</strong> total notes</span>
        </div>
      </div>

      {/* Weekly Insight */}
      <div className="px-4 mb-4">
        <WeeklyInsight
          stats={stats}
          classes={data.classes}
          competitions={data.competitions}
          weekNotes={data.weekNotes}
        />
      </div>

      {/* Empty state */}
      {weekData.classSummaries.length === 0 && (
        <div className="px-4 py-12 text-center">
          <FileText size={32} className="mx-auto text-[var(--text-tertiary)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">No notes this week</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Notes will appear here as you capture them</p>
        </div>
      )}

      {/* Reflection if exists */}
      {weekData.reflection?.aiSummary && (
        <div className="px-4 mb-4">
          <div className="bg-[var(--accent-muted)] rounded-xl p-3">
            <p className="text-[10px] font-medium text-[var(--accent-primary)] uppercase tracking-wide mb-1">AI Summary</p>
            <p className="text-sm text-[var(--text-primary)]">{weekData.reflection.aiSummary}</p>
          </div>
        </div>
      )}

      {/* Per-class sections */}
      <div className="px-4 space-y-4">
        {weekData.classSummaries.map(cs => (
          <div key={cs.classId} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
            {/* Class header */}
            <Link
              to={`/class/${cs.classId}`}
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] hover:bg-[var(--surface-inset)]"
            >
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{cs.className}</h3>
                <p className="text-[10px] text-[var(--text-tertiary)] capitalize">
                  {cs.day} {cs.startTime && `· ${formatTimeDisplay(cs.startTime)}`}
                </p>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">{cs.notes.length} notes</span>
            </Link>

            {/* Plan if present */}
            {cs.plan && (
              <div className="px-4 py-2 bg-[var(--surface-inset)] border-b border-[var(--border-subtle)]">
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">Plan</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{cs.plan}</p>
              </div>
            )}

            {/* Notes grouped by category */}
            <div className="px-4 py-3 space-y-2">
              {cs.notes.map(note => {
                const cat = note.normalizedCategory;
                const meta = cat ? CATEGORY_META[cat] : null;
                return (
                  <div key={note.id} className="flex items-start gap-2">
                    {meta ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${meta.color} bg-[var(--surface-inset)] whitespace-nowrap mt-0.5 font-medium`}>
                        {meta.label}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-inset)] text-[var(--text-tertiary)] whitespace-nowrap mt-0.5">
                        Note
                      </span>
                    )}
                    <p className="text-sm text-[var(--text-primary)] leading-snug">{note.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Next week goal */}
            {cs.nextWeekGoal && (
              <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--accent-muted)]">
                <p className="text-[10px] font-medium text-[var(--accent-primary)]">Next Week Goal</p>
                <p className="text-xs text-[var(--text-primary)] mt-0.5">{cs.nextWeekGoal}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
