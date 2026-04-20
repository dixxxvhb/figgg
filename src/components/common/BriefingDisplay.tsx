import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PlanDisplay } from './PlanDisplay';
import type { Briefing } from '../../types';

interface BriefingDisplayProps {
  /** Structured briefing, if present on the class's week notes. */
  briefing?: Briefing;
  /** Legacy plan string, used as fallback when no structured briefing exists. */
  legacyPlan?: string;
  /** Start collapsed after the user has posted their first note of the class. */
  initiallyCollapsed?: boolean;
}

/**
 * Renders last week's carry-forward briefing at the top of LiveNotes.
 *
 * Precedence:
 *  1. Structured `briefing` → three labeled sections (What we did / How it went / For today).
 *  2. Legacy `legacyPlan` string → rendered via PlanDisplay under "Last week's plan".
 *  3. Neither → returns null (hides entirely).
 *
 * Auto-collapsible card. When collapsed, shows only the header; tap to expand.
 */
export function BriefingDisplay({
  briefing,
  legacyPlan,
  initiallyCollapsed = false,
}: BriefingDisplayProps) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  const hasBriefing = !!briefing;
  const hasLegacy = !hasBriefing && !!legacyPlan && legacyPlan.trim().length > 0;

  if (!hasBriefing && !hasLegacy) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] overflow-hidden"
      aria-label="Last week briefing"
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-inset)]/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="type-caption uppercase tracking-wider text-[var(--text-tertiary)]">
          From last week
        </span>
        {collapsed ? (
          <ChevronDown size={16} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {hasBriefing ? (
            <>
              <BriefingSection title="What we did" body={briefing!.recap} />
              {briefing!.assessment.trim().length > 0 && (
                <BriefingSection title="How it went" body={briefing!.assessment} />
              )}
              {briefing!.forToday.length > 0 && (
                <BriefingBullets title="For today" items={briefing!.forToday} />
              )}
            </>
          ) : (
            <div>
              <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                Last week's plan
              </h3>
              <PlanDisplay text={legacyPlan!} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BriefingSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--text-primary)]">{body}</p>
    </div>
  );
}

function BriefingBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
        {title}
      </h3>
      <ul className="text-sm leading-relaxed text-[var(--text-primary)] space-y-1">
        {items.map((item, i) => (
          <li key={i} className="pl-3 relative">
            <span className="absolute left-0 text-[var(--text-tertiary)]">-</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
