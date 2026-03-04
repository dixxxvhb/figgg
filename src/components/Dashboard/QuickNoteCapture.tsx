import { useState, useRef, useEffect } from 'react';
import { Pencil, Send, Check, X, ChevronDown } from 'lucide-react';
import type { Class, WeekNotes, ClassWeekNotes, LiveNote } from '../../types';
import { haptic } from '../../utils/haptics';

const QUICK_CATEGORIES: { id: LiveNote['category']; label: string; color: string }[] = [
  { id: 'worked-on', label: 'Worked on', color: 'bg-[var(--status-success)]' },
  { id: 'needs-work', label: 'Needs work', color: 'bg-[var(--status-warning)]' },
  { id: 'next-week', label: 'Next week', color: 'bg-[var(--accent-primary)]' },
  { id: 'ideas', label: 'Idea', color: 'bg-[var(--status-info,var(--accent-primary))]' },
];

interface QuickNoteCaptureProps {
  todayClasses: Class[];
  currentClassId?: string; // ID of the class currently being taught (during status)
  onSaveNote: (classId: string, note: LiveNote) => void;
}

export function QuickNoteCapture({ todayClasses, currentClassId, onSaveNote }: QuickNoteCaptureProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<LiveNote['category']>(undefined);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select: current class > first today's class
  useEffect(() => {
    if (currentClassId) {
      setSelectedClassId(currentClassId);
    } else if (todayClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(todayClasses[0].id);
    }
  }, [currentClassId, todayClasses, selectedClassId]);

  if (todayClasses.length === 0) return null;

  const selectedClass = todayClasses.find(c => c.id === selectedClassId) || todayClasses[0];

  const handleOpen = () => {
    setOpen(true);
    setSaved(false);
    haptic('light');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = () => {
    if (!text.trim() || !selectedClass) return;
    haptic('light');
    const note: LiveNote = {
      id: `quick-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      text: text.trim(),
      category,
    };
    onSaveNote(selectedClass.id, note);
    setText('');
    setCategory(undefined);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      // Keep open so Dixon can rapid-fire notes
    }, 1500);
  };

  const handleClose = () => {
    setOpen(false);
    setText('');
    setCategory(undefined);
    setShowClassPicker(false);
  };

  // FAB button
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-lg shadow-[var(--accent-primary)]/30 flex items-center justify-center active:scale-90 transition-all duration-150"
        aria-label="Quick note"
      >
        <Pencil size={22} />
      </button>
    );
  }

  // Expanded capture panel
  return (
    <div className="fixed bottom-24 right-4 left-4 z-40 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xl shadow-black/20 overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Header: class selector + close */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowClassPicker(!showClassPicker)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-inset)] text-sm font-medium text-[var(--text-primary)] active:scale-95 transition-transform"
          >
            <span className="truncate max-w-[200px]">{selectedClass.name}</span>
            <ChevronDown size={14} className={`text-[var(--text-tertiary)] transition-transform ${showClassPicker ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={handleClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            <X size={16} />
          </button>
        </div>

        {/* Class picker dropdown */}
        {showClassPicker && (
          <div className="bg-[var(--surface-inset)] rounded-xl overflow-hidden">
            {todayClasses.map(cls => (
              <button
                key={cls.id}
                onClick={() => { setSelectedClassId(cls.id); setShowClassPicker(false); haptic('light'); }}
                className={`w-full text-left px-3 py-2 text-sm border-b border-[var(--border-subtle)] last:border-b-0 ${
                  cls.id === selectedClassId ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium' : 'text-[var(--text-primary)]'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}

        {/* Saved confirmation */}
        {saved && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <Check size={14} className="text-[var(--status-success)]" />
            <span className="text-xs text-[var(--status-success)] font-medium">Saved</span>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Quick note..."
            className="flex-1 px-3 py-2.5 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-30 active:scale-90 transition-all duration-150"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Quick category chips */}
        <div className="flex gap-1.5">
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategory(category === cat.id ? undefined : cat.id); haptic('light'); }}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-all duration-150 active:scale-90 ${
                category === cat.id
                  ? `${cat.color} text-white`
                  : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
