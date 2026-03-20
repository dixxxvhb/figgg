import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Calendar, Heart, AlertTriangle, Clock } from 'lucide-react';
import type { DailyBriefing } from '../../types';

interface DailyBriefingWidgetProps {
  briefing: DailyBriefing | undefined;
}

export function DailyBriefingWidget({ briefing }: DailyBriefingWidgetProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  if (!briefing) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const generatedTime = briefing.generatedAt
    ? new Date(briefing.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  const hasCalendar = briefing.calendar?.today?.length > 0 || briefing.calendar?.upcoming7Days?.length > 0;
  const hasDeadlines = briefing.deadlines && briefing.deadlines.length > 0;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--accent-primary)]" />
          <h2 className="type-h1">Daily Briefing</h2>
        </div>
        <div className="flex items-center gap-2">
          {briefing.enriched && (
            <span className="type-label px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
              Enriched
            </span>
          )}
          <span className="type-caption text-[var(--text-tertiary)]">{generatedTime}</span>
        </div>
      </div>

      {/* Summary — always visible */}
      <div className="px-4 py-3.5">
        <p className="type-body text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
          {briefing.summary}
        </p>
      </div>

      {/* Yesterday You */}
      {briefing.yesterdayYou && briefing.yesterdayYou.length > 0 && (
        <CollapsibleSection
          title="Yesterday You"
          icon={<Clock size={14} />}
          expanded={expandedSections.has('yesterday')}
          onToggle={() => toggleSection('yesterday')}
        >
          <ul className="space-y-1">
            {briefing.yesterdayYou.map((item, i) => (
              <li key={i} className="type-body text-[var(--text-secondary)] flex gap-2">
                <span className="text-[var(--text-tertiary)] shrink-0">--</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Calendar */}
      {hasCalendar && (
        <CollapsibleSection
          title="Schedule"
          icon={<Calendar size={14} />}
          expanded={expandedSections.has('calendar')}
          onToggle={() => toggleSection('calendar')}
        >
          {briefing.calendar.today.length > 0 && (
            <div className="space-y-1.5">
              <div className="type-label text-[var(--text-tertiary)]">Today</div>
              {briefing.calendar.today.map((event, i) => (
                <div key={i} className="flex gap-3 items-baseline">
                  <span className="type-caption text-[var(--text-tertiary)] shrink-0 w-14 text-right font-display">
                    {event.startTime || 'All day'}
                  </span>
                  <span className="type-body text-[var(--text-secondary)]">{event.title}</span>
                </div>
              ))}
            </div>
          )}
          {briefing.calendar.upcoming7Days.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <div className="type-label text-[var(--text-tertiary)]">Coming Up</div>
              {briefing.calendar.upcoming7Days.slice(0, 5).map((event, i) => (
                <div key={i} className="flex gap-3 items-baseline">
                  <span className="type-caption text-[var(--text-tertiary)] shrink-0 w-14 text-right">
                    {formatShortDate(event.date)}
                  </span>
                  <span className="type-body text-[var(--text-secondary)]">{event.title}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Wellness */}
      {briefing.wellness && (
        <CollapsibleSection
          title="Wellness"
          icon={<Heart size={14} />}
          expanded={expandedSections.has('wellness')}
          onToggle={() => toggleSection('wellness')}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="type-caption text-[var(--text-tertiary)]">Meds:</span>
              <span className={`type-body ${briefing.wellness.medsStatus.onTrack ? 'text-[var(--status-success)]' : 'text-[var(--text-secondary)]'}`}>
                {briefing.wellness.medsStatus.onTrack ? 'On track' : 'Check in'}
              </span>
              {briefing.wellness.medsStatus.missedRecently && (
                <span className="type-label px-1.5 py-0.5 rounded-full bg-[var(--status-warning)]/10 text-[var(--status-warning)]">
                  Missed recently
                </span>
              )}
            </div>
            {briefing.wellness.moodTrend && (
              <div className="flex items-center gap-2">
                <span className="type-caption text-[var(--text-tertiary)]">Mood:</span>
                <span className="type-body text-[var(--text-secondary)] capitalize">{briefing.wellness.moodTrend}</span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Deadlines */}
      {hasDeadlines && (
        <CollapsibleSection
          title="Deadlines"
          icon={<AlertTriangle size={14} />}
          expanded={expandedSections.has('deadlines')}
          onToggle={() => toggleSection('deadlines')}
        >
          <div className="space-y-1.5">
            {briefing.deadlines!.map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span className="type-body text-[var(--text-secondary)]">{d.description}</span>
                <span className={`type-label shrink-0 ${d.daysLeft <= 3 ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
                  {d.daysLeft === 0 ? 'Today' : d.daysLeft === 1 ? 'Tomorrow' : `${d.daysLeft}d`}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Nudge — visually distinct */}
      {briefing.nudge && (
        <div className="mx-3 mb-3 px-3.5 py-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-primary)]/15">
          <div className="type-label text-[var(--accent-primary)] mb-1">Nudge</div>
          <p className="type-body text-[var(--text-primary)]">{briefing.nudge}</p>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[var(--border-subtle)]">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[var(--surface-card-hover)] transition-colors"
      >
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          {icon}
          <span className="type-h3">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
