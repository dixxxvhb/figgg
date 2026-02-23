import { useState } from 'react';
import { BookOpen, Sparkles, Loader2, Clock, MapPin } from 'lucide-react';
import type { ClassWithContext } from '../../hooks/useClassTiming';
import type { AppData } from '../../types';
import { callAIChat } from '../../services/ai';
import { buildFullAIContext } from '../../services/aiContext';
import { haptic } from '../../utils/haptics';

interface PrepCardProps {
  classContext: ClassWithContext;
  minutesUntil: number;
  data: AppData;
}

export function PrepCard({ classContext, minutesUntil, data }: PrepCardProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const cls = classContext.class;

  const handleSmartPrep = async () => {
    setIsLoading(true);
    haptic('light');
    try {
      const context = buildFullAIContext(data, `Preparing for ${cls.name}`);
      const result = await callAIChat({
        mode: 'prep',
        userMessage: `Prep me for ${cls.name}`,
        context: {
          ...context,
          classPrep: {
            classId: cls.id,
            className: cls.name,
            lastWeekNotes: classContext.lastWeekNotes.map(n => n.text),
            thisWeekPlan: classContext.thisWeekPlan,
            studentFlags: classContext.studentFlags,
          },
        },
      });
      setAiSummary(result.response);
    } catch {
      setAiSummary("Couldn't generate prep. Check the details below.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Prep: {cls.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          <Clock size={12} />
          <span>in {minutesUntil}min</span>
        </div>
      </div>

      {/* AI Summary (if available) */}
      {aiSummary && (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed mb-3">
          {aiSummary}
        </p>
      )}

      {/* Quick prep details */}
      {!aiSummary && (
        <div className="space-y-2 text-sm">
          {classContext.studio && (
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <MapPin size={12} />
              <span>{classContext.studio.name}</span>
            </div>
          )}
          {classContext.thisWeekPlan && (
            <div>
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Plan:</span>
              <p className="text-[var(--text-primary)] mt-0.5">{classContext.thisWeekPlan}</p>
            </div>
          )}
          {classContext.lastWeekNotes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Last week:</span>
              <ul className="mt-0.5 space-y-0.5">
                {classContext.lastWeekNotes.slice(0, 3).map(note => (
                  <li key={note.id} className="text-[var(--text-secondary)] text-xs truncate">
                    {note.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {classContext.studentFlags && classContext.studentFlags.length > 0 && (
            <div>
              <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase">Student notes:</span>
              <ul className="mt-0.5 space-y-0.5">
                {classContext.studentFlags.slice(0, 2).map((flag, i) => (
                  <li key={i} className="text-[var(--text-secondary)] text-xs truncate">{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Smart prep button */}
      {!aiSummary && (
        <button
          onClick={handleSmartPrep}
          disabled={isLoading}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-muted)] rounded-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {isLoading ? 'Generating...' : 'Get AI summary'}
        </button>
      )}
    </div>
  );
}
