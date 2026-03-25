import { useState, useRef } from 'react';
import { Bug, Send, Check, Trash2, ChevronDown } from 'lucide-react';
import type { FixItem } from '../../types';
import { haptic } from '../../utils/haptics';

const PAGES = ['Dashboard', 'Schedule', 'Calendar', 'Classes', 'Students', 'Self-Care', 'Settings', 'AI Chat', 'Other'];
const PRIORITIES: { value: FixItem['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-[var(--text-tertiary)]' },
  { value: 'medium', label: 'Med', color: 'bg-[var(--status-warning)]' },
  { value: 'high', label: 'High', color: 'bg-[var(--status-error)]' },
];

interface FixItemWidgetProps {
  fixItems: FixItem[];
  onAdd: (description: string, page?: string, priority?: FixItem['priority']) => void;
  onDelete: (id: string) => void;
}

export function FixItemWidget({ fixItems, onAdd, onDelete }: FixItemWidgetProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const [priority, setPriority] = useState<FixItem['priority']>('medium');
  const [saved, setSaved] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = fixItems.filter(f => !f.processed);
  const processed = fixItems.filter(f => f.processed);

  const handleSubmit = () => {
    if (!text.trim()) return;
    haptic('light');
    onAdd(text.trim(), page || undefined, priority);
    setText('');
    setPage('');
    setPriority('medium');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); haptic('light'); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-subtle)]/60 shadow-[var(--shadow-card)] text-left active:scale-[0.98] transition-transform"
      >
        <Bug size={18} className="text-[var(--accent-primary)] shrink-0" />
        <span className="text-sm text-[var(--text-secondary)]">Log an app fix...</span>
        {pending.length > 0 && (
          <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--status-warning)]/15 text-[var(--status-warning)]">
            {pending.length} pending
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-subtle)]/60 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug size={16} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">App Fixes</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-xs text-[var(--text-tertiary)] px-2 py-1">
            Done
          </button>
        </div>

        {/* Saved flash */}
        {saved && (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <Check size={14} className="text-[var(--status-success)]" />
            <span className="text-xs text-[var(--status-success)] font-medium">Logged</span>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="What needs fixing?"
            className="flex-1 px-3 py-2.5 text-sm bg-[var(--surface-inset)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] disabled:opacity-30 active:scale-90 transition-all duration-150"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Page + Priority row */}
        <div className="flex gap-2 items-center">
          {/* Page picker */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowPagePicker(!showPagePicker)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-[var(--surface-inset)] text-[var(--text-secondary)] w-full"
            >
              <span className="truncate">{page || 'Page (optional)'}</span>
              <ChevronDown size={12} className="shrink-0 text-[var(--text-tertiary)]" />
            </button>
            {showPagePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                <button
                  onClick={() => { setPage(''); setShowPagePicker(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]"
                >
                  None
                </button>
                {PAGES.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); setShowPagePicker(false); haptic('light'); }}
                    className={`w-full text-left px-3 py-1.5 text-xs border-b border-[var(--border-subtle)] last:border-b-0 ${
                      p === page ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] font-medium' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority chips */}
          <div className="flex gap-1">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => { setPriority(p.value); haptic('light'); }}
                className={`px-2 py-1 text-[10px] font-medium rounded-full transition-all active:scale-90 ${
                  priority === p.value
                    ? `${p.color} text-white`
                    : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pending items */}
        {pending.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]/40">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
              Pending ({pending.length})
            </span>
            {pending.map(item => (
              <div key={item.id} className="flex items-start gap-2 py-1.5">
                <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${
                  item.priority === 'high' ? 'bg-[var(--status-error)]' :
                  item.priority === 'medium' ? 'bg-[var(--status-warning)]' :
                  'bg-[var(--text-tertiary)]'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-primary)] leading-snug">{item.description}</p>
                  {item.page && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">{item.page}</span>
                  )}
                </div>
                <button
                  onClick={() => { onDelete(item.id); haptic('light'); }}
                  className="p-1 text-[var(--text-tertiary)] hover:text-[var(--status-error)] shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Processed count */}
        {processed.length > 0 && (
          <p className="text-[10px] text-[var(--text-tertiary)] pt-1">
            {processed.length} fix{processed.length !== 1 ? 'es' : ''} processed by Cowork
          </p>
        )}
      </div>
    </div>
  );
}
