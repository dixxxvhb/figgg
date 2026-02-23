import { useState, useRef } from 'react';
import { MessageSquare, Send, Loader2, Check, X } from 'lucide-react';
import type { ClassWithContext } from '../../hooks/useClassTiming';
import type { AppData, WeekNotes, ClassWeekNotes, LiveNote } from '../../types';
import { callAIChat } from '../../services/ai';
import { buildFullAIContext } from '../../services/aiContext';
import { haptic } from '../../utils/haptics';

interface PostClassCaptureProps {
  classContext: ClassWithContext;
  data: AppData;
  onSaveNotes: (weekNote: WeekNotes) => void;
  getCurrentWeekNotes: () => WeekNotes;
}

type CaptureState = 'input' | 'loading' | 'preview' | 'saved' | 'dismissed';

interface StructuredNote {
  text: string;
  category: string;
}

export function PostClassCapture({ classContext, data, onSaveNotes, getCurrentWeekNotes }: PostClassCaptureProps) {
  const [state, setState] = useState<CaptureState>('input');
  const [rawText, setRawText] = useState('');
  const [structuredNotes, setStructuredNotes] = useState<StructuredNote[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cls = classContext.class;

  if (state === 'dismissed') return null;

  const handleSubmit = async () => {
    if (!rawText.trim()) return;
    setState('loading');
    haptic('light');

    try {
      const context = buildFullAIContext(data, rawText.trim());
      const result = await callAIChat({
        mode: 'capture',
        userMessage: rawText.trim(),
        context: {
          ...context,
          classCapture: {
            classId: cls.id,
            className: cls.name,
            plannedContent: classContext.thisWeekPlan,
            rawDump: rawText.trim(),
          },
        },
      });

      if (result.structuredNotes?.length) {
        setStructuredNotes(result.structuredNotes);
        setState('preview');
      } else {
        // Fallback: save raw text as a single note
        saveRawNote(rawText.trim());
        setState('saved');
        setTimeout(() => setState('dismissed'), 2000);
      }
    } catch {
      // Save raw text as fallback
      saveRawNote(rawText.trim());
      setState('saved');
      setTimeout(() => setState('dismissed'), 2000);
    }
  };

  const saveRawNote = (text: string) => {
    const weekNote = getCurrentWeekNotes();
    const existing: ClassWeekNotes = weekNote.classNotes[cls.id] || {
      classId: cls.id, plan: '', liveNotes: [], isOrganized: false,
    };
    const newNote: LiveNote = {
      id: `capture-${Date.now()}`,
      timestamp: new Date().toISOString(),
      text,
    };
    weekNote.classNotes[cls.id] = {
      ...existing,
      liveNotes: [...existing.liveNotes, newNote],
    };
    onSaveNotes(weekNote);
  };

  const handleSaveStructured = () => {
    haptic('light');
    const weekNote = getCurrentWeekNotes();
    const existing: ClassWeekNotes = weekNote.classNotes[cls.id] || {
      classId: cls.id, plan: '', liveNotes: [], isOrganized: false,
    };
    const newNotes: LiveNote[] = structuredNotes.map((sn, i) => ({
      id: `capture-${Date.now()}-${i}`,
      timestamp: new Date().toISOString(),
      text: sn.text,
      category: sn.category as LiveNote['category'],
    }));
    weekNote.classNotes[cls.id] = {
      ...existing,
      liveNotes: [...existing.liveNotes, ...newNotes],
    };
    onSaveNotes(weekNote);
    setState('saved');
    setTimeout(() => setState('dismissed'), 2000);
  };

  const CATEGORY_LABELS: Record<string, string> = {
    'worked-on': 'Worked On',
    'needs-work': 'Needs Work',
    'next-week': 'Next Week',
    'ideas': 'Ideas',
  };

  return (
    <div className="bg-white dark:bg-blush-800 rounded-2xl border border-blush-200 dark:border-blush-700 overflow-hidden">
      {/* Input state */}
      {state === 'input' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-forest-500" />
              <span className="text-sm font-semibold text-forest-700 dark:text-white">
                How'd {cls.name} go?
              </span>
            </div>
            <button onClick={() => setState('dismissed')} className="text-blush-400 hover:text-blush-600">
              <X size={14} />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Quick brain dump — what happened, what to work on..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-blush-50 dark:bg-blush-700 border border-blush-200 dark:border-blush-600 rounded-xl text-forest-700 dark:text-white placeholder-blush-400 focus:outline-none focus:ring-1 focus:ring-forest-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <button onClick={() => setState('dismissed')} className="text-xs text-blush-400 hover:text-blush-600">
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!rawText.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest-600 text-white rounded-lg active:scale-95 transition-transform disabled:opacity-30"
            >
              <Send size={12} />
              Save & Organize
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <div className="p-4 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-forest-500" />
          <span className="text-sm text-blush-400">Organizing notes...</span>
        </div>
      )}

      {/* Preview structured notes */}
      {state === 'preview' && (
        <div className="p-4">
          <p className="text-xs font-medium text-blush-400 mb-2 uppercase">Organized Notes</p>
          <div className="space-y-2">
            {structuredNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-forest-50 dark:bg-forest-900/20 text-forest-600 dark:text-forest-400 whitespace-nowrap mt-0.5">
                  {CATEGORY_LABELS[note.category] || note.category}
                </span>
                <p className="text-sm text-forest-700 dark:text-blush-200">{note.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveStructured}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest-600 text-white rounded-lg active:scale-95 transition-transform"
            >
              <Check size={12} />
              Save
            </button>
            <button
              onClick={() => { saveRawNote(rawText.trim()); setState('saved'); setTimeout(() => setState('dismissed'), 2000); }}
              className="px-3 py-1.5 text-xs text-blush-400 hover:text-blush-600"
            >
              Save raw instead
            </button>
          </div>
        </div>
      )}

      {/* Saved confirmation */}
      {state === 'saved' && (
        <div className="p-4 flex items-center gap-2">
          <Check size={16} className="text-green-500" />
          <span className="text-sm text-forest-700 dark:text-blush-200">Notes saved</span>
        </div>
      )}
    </div>
  );
}
