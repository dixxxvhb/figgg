import { useState, useRef, useEffect } from 'react';
import { StickyNote, X } from 'lucide-react';

interface ScratchpadWidgetProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScratchpadWidget({ value, onChange }: ScratchpadWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => { setDraft(value); }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isExpanded, draft]);

  const handleChange = (text: string) => {
    setDraft(text);
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => onChange(text), 400);
  };

  const handleClear = () => {
    setDraft('');
    onChange('');
  };

  // Collapsed: show preview or tap-to-add
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full text-left bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3"
      >
        <div className="flex items-start gap-2">
          <StickyNote size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          {value ? (
            <p className="text-sm text-[var(--text-primary)] line-clamp-2 whitespace-pre-wrap">{value}</p>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)] italic">Tap to jot something down...</p>
          )}
        </div>
      </button>
    );
  }

  // Expanded: editable textarea
  return (
    <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-subtle)] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <StickyNote size={14} className="text-[var(--accent-secondary)]" />
          <span className="type-h1 text-[var(--text-primary)]">Scratchpad</span>
        </div>
        <div className="flex items-center gap-1">
          {draft && (
            <button onClick={handleClear} className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--status-danger)] px-1.5 py-0.5">
              Clear
            </button>
          )}
          <button onClick={() => setIsExpanded(false)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            <X size={14} />
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => handleChange(e.target.value)}
        placeholder="Quick thought, reminder, idea..."
        rows={2}
        className="w-full text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-lg p-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
      />
    </div>
  );
}
