import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  defaultExpanded?: boolean;
  children: ReactNode;
  /** Optional muted/quieter style for sensitive sections */
  muted?: boolean;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded = false,
  children,
  muted = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);
  // After expand animation finishes, remove maxHeight so content is never clipped
  const [animationDone, setAnimationDone] = useState(defaultExpanded);

  // Use ResizeObserver to track content height changes (dynamic child content)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setContentHeight(el.scrollHeight);
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // When expanding, start animation; when collapsing, re-enable maxHeight constraint
  useEffect(() => {
    if (expanded) {
      setAnimationDone(false);
      const timer = setTimeout(() => setAnimationDone(true), 350);
      return () => clearTimeout(timer);
    } else {
      setAnimationDone(false);
    }
  }, [expanded]);

  const handleTransitionEnd = useCallback(() => {
    if (expanded) setAnimationDone(true);
  }, [expanded]);

  return (
    <div className={`rounded-[var(--radius-md)] border shadow-[var(--shadow-card)] overflow-hidden ${
      muted
        ? 'bg-[var(--surface-primary)] border-[var(--border-subtle)]/50'
        : 'bg-[var(--surface-card)] border-[var(--border-subtle)]'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-[var(--surface-inset)] transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className={muted ? 'text-[var(--text-tertiary)]' : 'text-[var(--accent-primary)]'} />
          <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        onTransitionEnd={handleTransitionEnd}
        style={{
          maxHeight: expanded
            ? (animationDone ? 'none' : contentHeight)
            : 0,
          opacity: expanded ? 1 : 0,
          overflow: animationDone && expanded ? 'visible' : 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.2s ease',
        }}
      >
        <div ref={contentRef} className="border-t border-[var(--border-subtle)]">
          {children}
        </div>
      </div>
    </div>
  );
}
