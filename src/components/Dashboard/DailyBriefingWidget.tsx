import { useState } from 'react';
import { format } from 'date-fns';
import {
  FileText, ChevronDown, ChevronUp, Calendar, Heart, AlertTriangle,
  Clock, Mail, MessageCircle, FolderGit2, StickyNote, Circle, Plus, Check
} from 'lucide-react';
import type { DailyBriefing, Reminder, CalendarEvent } from '../../types';

const COLLAPSE_STORAGE_KEY = 'figgg-briefing-collapsed';
const SUMMARY_LINE_LIMIT = 8;

function getInitialCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw) as { date: string; collapsed: boolean };
    const today = format(new Date(), 'yyyy-MM-dd');
    return stored.date === today ? stored.collapsed : false;
  } catch {
    return false;
  }
}

export interface CreateTaskOptions {
  notes?: string;
  dueDate?: string;
  priority?: Reminder['priority'];
  flagged?: boolean;
}

interface DailyBriefingWidgetProps {
  briefing: DailyBriefing | undefined;
  onCreateTask?: (title: string, opts?: CreateTaskOptions) => void;
  calendarEvents?: CalendarEvent[];
}

export function DailyBriefingWidget({ briefing, onCreateTask, calendarEvents = [] }: DailyBriefingWidgetProps) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  if (!briefing) return null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify({
        date: format(new Date(), 'yyyy-MM-dd'),
        collapsed: next,
      }));
    } catch { /* localStorage full or unavailable */ }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleAddTask = (key: string, title: string, opts?: CreateTaskOptions) => {
    if (!onCreateTask || addedItems.has(key)) return;
    onCreateTask(title, opts);
    setAddedItems(prev => new Set(prev).add(key));
  };

  const latestTimestamp = briefing.enrichedAt || briefing.generatedAt;
  const generatedTime = latestTimestamp
    ? new Date(latestTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const dateDisplay = format(new Date(briefing.date + 'T12:00:00'), 'EEEE, MMMM d');
  const today = format(new Date(), 'yyyy-MM-dd');

  // Merge briefing calendar data with frontend-fetched calendar events
  const briefingToday = briefing.calendar?.today || [];
  const mergedToday = briefingToday.length > 0
    ? briefingToday
    : calendarEvents.map(e => ({
        title: e.title,
        startTime: e.startTime || '',
        endTime: e.endTime || '',
        calendarName: '',
      }));
  const upcoming7Days = briefing.calendar?.upcoming7Days || [];
  const hasCalendar = true; // Always show — "No events today" when empty
  const hasDeadlines = briefing.deadlines && briefing.deadlines.length > 0;
  const hasEmail = briefing.email && (
    (briefing.email.needsResponse?.length ?? 0) > 0 ||
    (briefing.email.actionRequired?.length ?? 0) > 0 ||
    (briefing.email.fyiCount ?? 0) > 0
  );
  const hasMessages = briefing.messages?.threads && briefing.messages.threads.length > 0;
  const hasProjects = briefing.projects?.status && briefing.projects.status.length > 0;
  const hasNotes = briefing.notes?.newOrModified && briefing.notes.newOrModified.length > 0;

  // Strip the "TODAY'S CALENDAR" placeholder from summary — we render real calendar data in the Schedule section
  const cleanedSummary = (briefing.summary ?? '')
    .replace(/TODAY'S CALENDAR:\s*\n[^\n]*(?:\n|$)/g, '')  // Remove the header + its content line
    .replace(/(---\s*\n)\s*---/g, '$1')                     // Collapse consecutive --- dividers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Summary truncation
  const summaryLines = cleanedSummary.split('\n');
  const summaryNeedsTruncation = summaryLines.length > SUMMARY_LINE_LIMIT;
  const displayedSummary = summaryNeedsTruncation && !summaryExpanded
    ? summaryLines.slice(0, SUMMARY_LINE_LIMIT).join('\n')
    : cleanedSummary;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden border-t-[3px] border-t-[var(--accent-primary)]">
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className={`w-full px-4 py-3 flex items-start justify-between gap-2 hover:bg-[var(--surface-card-hover)] transition-colors ${collapsed ? '' : 'border-b border-[var(--border-subtle)]'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-[var(--accent-primary)] shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="type-h2 text-[var(--text-primary)] whitespace-nowrap">Today's Briefing</h2>
              {briefing.enriched && (
                <span className="type-label px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)] shrink-0">
                  Enriched
                </span>
              )}
            </div>
            <span className="type-caption text-[var(--text-tertiary)]">{dateDisplay} · {generatedTime}</span>
          </div>
        </div>
        <div className="flex items-center shrink-0">
          {collapsed ? (
            <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {/* Animated content wrapper */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden">

      {/* Summary */}
      <div className="px-4 py-3.5">
        <p className="type-body text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
          {displayedSummary}
        </p>
        {summaryNeedsTruncation && (
          <button
            onClick={(e) => { e.stopPropagation(); setSummaryExpanded(!summaryExpanded); }}
            className="type-caption text-[var(--accent-primary)] mt-1.5 hover:underline"
          >
            {summaryExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>

      {/* Email */}
      {hasEmail && (
        <CollapsibleSection
          title="Email"
          icon={<Mail size={14} />}
          expanded={expandedSections.has('email')}
          onToggle={() => toggleSection('email')}
          summary={emailSummaryLine(briefing.email!)}
        >
          {(briefing.email!.needsResponse?.length ?? 0) > 0 && (
            <div className="space-y-1.5 mb-2">
              <div className="type-label text-[var(--text-tertiary)]">Needs Response</div>
              {briefing.email!.needsResponse.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 pl-2 ${e.priority === 'high' ? 'border-l-[3px] border-l-[var(--status-warning)]' : 'border-l-[3px] border-l-transparent'}`}
                >
                  <div className="flex items-baseline gap-2 min-w-0 flex-1">
                    <span className="type-body text-[var(--text-primary)] font-medium shrink-0">{e.from}</span>
                    <span className="type-caption text-[var(--text-secondary)] truncate">{e.subject}</span>
                    {e.priority === 'high' && (
                      <span className="type-label px-1.5 py-0.5 rounded-full bg-[var(--status-warning)]/10 text-[var(--status-warning)] shrink-0">
                        High
                      </span>
                    )}
                  </div>
                  {onCreateTask && (
                    <AddTaskButton
                      added={addedItems.has(`email-resp-${i}`)}
                      onAdd={() => handleAddTask(`email-resp-${i}`, `Reply to ${e.from}: ${e.subject}`, {
                        priority: e.priority === 'high' ? 'high' : 'medium',
                        dueDate: today,
                        notes: 'From briefing email',
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {(briefing.email!.actionRequired?.length ?? 0) > 0 && (
            <div className="space-y-1.5 mb-2">
              <div className="type-label text-[var(--text-tertiary)]">Action Required</div>
              {briefing.email!.actionRequired.map((e, i) => (
                <div key={i} className="flex items-center gap-2 pl-2 border-l-[3px] border-l-[var(--status-danger)]">
                  <div className="flex items-baseline gap-2 min-w-0 flex-1">
                    <span className="type-body text-[var(--text-primary)] font-medium shrink-0">{e.from}</span>
                    <span className="type-caption text-[var(--text-secondary)] truncate">{e.subject}</span>
                    <span className="type-label px-1.5 py-0.5 rounded-full bg-[var(--surface-inset)] text-[var(--text-tertiary)] shrink-0 capitalize">
                      {e.actionType}
                    </span>
                  </div>
                  {onCreateTask && (
                    <AddTaskButton
                      added={addedItems.has(`email-action-${i}`)}
                      onAdd={() => handleAddTask(`email-action-${i}`, e.subject, {
                        priority: 'high',
                        dueDate: today,
                        notes: `Action: ${e.actionType}`,
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {((briefing.email!.fyiCount ?? 0) > 0 || (briefing.email!.marketingCount ?? 0) > 0) && (
            <div className="type-caption text-[var(--text-tertiary)] pt-1">
              {briefing.email!.fyiCount ?? 0} FYI{briefing.email!.marketingCount ? ` · ${briefing.email!.marketingCount} marketing` : ''}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Messages */}
      {hasMessages && (
        <CollapsibleSection
          title="Messages"
          icon={<MessageCircle size={14} />}
          expanded={expandedSections.has('messages')}
          onToggle={() => toggleSection('messages')}
          summary={messagesSummaryLine(briefing.messages!.threads)}
        >
          <div className="space-y-2">
            {briefing.messages!.threads.map((t, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 pl-2 ${t.priority === 'high' ? 'border-l-[3px] border-l-[var(--accent-primary)]' : 'border-l-[3px] border-l-transparent'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="type-body text-[var(--text-primary)] font-medium">{t.contact}</span>
                    {!t.youReplied && (
                      <Circle size={6} fill="var(--status-warning)" className="text-[var(--status-warning)] shrink-0" />
                    )}
                    {t.youReplied && (
                      <span className="type-label text-[var(--status-success)]">Replied</span>
                    )}
                  </div>
                  <p className="type-caption text-[var(--text-secondary)] truncate">
                    {t.lastMessage}
                  </p>
                </div>
                <span className="type-label text-[var(--text-tertiary)] shrink-0">
                  {t.messageCount} msg{t.messageCount !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Schedule */}
      {hasCalendar && (
        <CollapsibleSection
          title="Schedule"
          icon={<Calendar size={14} />}
          expanded={expandedSections.has('calendar')}
          onToggle={() => toggleSection('calendar')}
          summary={mergedToday.length > 0 ? `${mergedToday.length} today${upcoming7Days.length > 0 ? ` · ${upcoming7Days.length} upcoming` : ''}` : 'No events today'}
        >
          {mergedToday.length === 0 && upcoming7Days.length === 0 && (
            <p className="type-body text-[var(--text-tertiary)] italic">Nothing scheduled — open day.</p>
          )}
          {mergedToday.length > 0 && (
            <div className="space-y-1.5">
              <div className="type-label text-[var(--text-tertiary)]">Today</div>
              {mergedToday.map((event, i) => (
                <div key={i} className="flex gap-3 items-baseline">
                  <span className="flex items-center gap-1.5 shrink-0 w-16 justify-end">
                    <Circle size={4} fill="var(--accent-primary)" className="text-[var(--accent-primary)]" />
                    <span className="type-caption text-[var(--text-tertiary)] font-display">
                      {event.startTime || 'All day'}
                    </span>
                  </span>
                  <span className="type-body text-[var(--text-secondary)]">{event.title}</span>
                </div>
              ))}
            </div>
          )}
          {upcoming7Days.length > 0 && (
            <div className="space-y-1.5 mt-3">
              <div className="type-label text-[var(--text-tertiary)]">Coming Up</div>
              {upcoming7Days.slice(0, 5).map((event, i) => (
                <div key={i} className="flex gap-3 items-baseline">
                  <span className="type-caption text-[var(--text-tertiary)] shrink-0 w-16 text-right">
                    {formatShortDate(event.date)}
                  </span>
                  <span className="type-body text-[var(--text-secondary)]">{event.title}</span>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Projects — inline, no expand */}
      {hasProjects && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <FolderGit2 size={14} className="text-[var(--text-secondary)]" />
            <span className="type-h3 text-[var(--text-secondary)]">Projects</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {briefing.projects!.status.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-inset)] max-w-full" title={p.note || ''}>
                <Circle
                  size={6}
                  fill={healthColor(p.health)}
                  className="shrink-0"
                  style={{ color: healthColor(p.health) }}
                />
                <span className="type-caption text-[var(--text-secondary)] whitespace-nowrap">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wellness */}
      {briefing.wellness && (
        <CollapsibleSection
          title="Wellness"
          icon={<Heart size={14} />}
          expanded={expandedSections.has('wellness')}
          onToggle={() => toggleSection('wellness')}
          summary={wellnessSummaryLine(briefing.wellness)}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Circle
                size={6}
                fill={briefing.wellness.medsStatus.onTrack ? 'var(--status-success)' : 'var(--status-warning)'}
                style={{ color: briefing.wellness.medsStatus.onTrack ? 'var(--status-success)' : 'var(--status-warning)' }}
              />
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
                <Circle
                  size={6}
                  fill={moodColor(briefing.wellness.moodTrend)}
                  style={{ color: moodColor(briefing.wellness.moodTrend) }}
                />
                <span className="type-caption text-[var(--text-tertiary)]">Mood:</span>
                <span className="type-body text-[var(--text-secondary)] capitalize">{briefing.wellness.moodTrend}</span>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Yesterday You */}
      {briefing.yesterdayYou && briefing.yesterdayYou.length > 0 && (
        <CollapsibleSection
          title="Yesterday You"
          icon={<Clock size={14} />}
          expanded={expandedSections.has('yesterday')}
          onToggle={() => toggleSection('yesterday')}
          summary={`${briefing.yesterdayYou.length} thing${briefing.yesterdayYou.length !== 1 ? 's' : ''}`}
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

      {/* Deadlines */}
      {hasDeadlines && (
        <CollapsibleSection
          title="Deadlines"
          icon={<AlertTriangle size={14} />}
          expanded={expandedSections.has('deadlines')}
          onToggle={() => toggleSection('deadlines')}
          summary={`${briefing.deadlines!.length} deadline${briefing.deadlines!.length !== 1 ? 's' : ''}`}
        >
          <div className="space-y-1.5">
            {briefing.deadlines!.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 pl-2 ${d.daysLeft <= 3 ? 'border-l-[3px] border-l-[var(--status-danger)]' : 'border-l-[3px] border-l-transparent'}`}
              >
                <span className="type-body text-[var(--text-secondary)] flex-1 min-w-0">{d.description}</span>
                <span className={`type-label shrink-0 ${d.daysLeft <= 3 ? 'text-[var(--status-danger)]' : 'text-[var(--text-tertiary)]'}`}>
                  {d.daysLeft === 0 ? 'Today' : d.daysLeft === 1 ? 'Tomorrow' : `${d.daysLeft}d`}
                </span>
                {onCreateTask && (
                  <AddTaskButton
                    added={addedItems.has(`deadline-${i}`)}
                    onAdd={() => handleAddTask(`deadline-${i}`, d.description, {
                      priority: d.daysLeft <= 3 ? 'high' : 'medium',
                      dueDate: d.dueDate,
                    })}
                  />
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Notes */}
      {hasNotes && (
        <CollapsibleSection
          title="Notes"
          icon={<StickyNote size={14} />}
          expanded={expandedSections.has('notes')}
          onToggle={() => toggleSection('notes')}
          summary={`${briefing.notes!.newOrModified.length} new`}
        >
          <div className="space-y-2">
            {briefing.notes!.newOrModified.map((n, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="type-body text-[var(--text-primary)] font-medium">{n.title}</span>
                  <span className="type-label text-[var(--text-tertiary)] shrink-0">
                    {formatRelativeTime(n.modifiedAt)}
                  </span>
                </div>
                <p className="type-caption text-[var(--text-secondary)] truncate">{n.snippet}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Nudge — visually distinct callout */}
      {briefing.nudge && (
        <div className="mx-3 mb-3 mt-1 px-3.5 py-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-primary)]/15 border-l-[3px] border-l-[var(--accent-primary)]">
          <div className="type-label text-[var(--accent-primary)] mb-1">Nudge</div>
          <p className="type-body text-[var(--text-primary)] leading-relaxed">{briefing.nudge}</p>
          {onCreateTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const title = briefing.nudge!.length > 80 ? briefing.nudge!.slice(0, 80) + '...' : briefing.nudge!;
                handleAddTask('nudge', title, {
                  priority: 'low',
                  dueDate: today,
                  notes: briefing.nudge!.length > 80 ? briefing.nudge! : undefined,
                });
              }}
              disabled={addedItems.has('nudge')}
              className={`mt-2 type-caption flex items-center gap-1 transition-colors ${
                addedItems.has('nudge')
                  ? 'text-[var(--status-success)]'
                  : 'text-[var(--accent-primary)] hover:underline'
              }`}
            >
              {addedItems.has('nudge') ? (
                <><Check size={12} /> Added to tasks</>
              ) : (
                <><Plus size={12} /> Add to tasks</>
              )}
            </button>
          )}
        </div>
      )}

        </div>{/* end overflow-hidden */}
      </div>{/* end grid animation wrapper */}
    </div>
  );
}

/* --- Add Task Button --- */

function AddTaskButton({ added, onAdd }: { added: boolean; onAdd: () => void }) {
  if (added) {
    return (
      <div className="w-6 h-6 rounded-full bg-[var(--status-success)]/10 flex items-center justify-center shrink-0">
        <Check size={12} className="text-[var(--status-success)]" />
      </div>
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onAdd(); }}
      className="w-6 h-6 rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)] flex items-center justify-center hover:bg-[var(--accent-primary)] hover:text-[var(--text-on-accent)] transition-colors shrink-0"
      title="Add to tasks"
    >
      <Plus size={12} />
    </button>
  );
}

/* --- Collapsible Section with summary line --- */

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  summary,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  summary?: string;
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
          {!expanded && summary && (
            <span className="type-caption text-[var(--text-tertiary)] ml-1">{summary}</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
        )}
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Helpers --- */

function emailSummaryLine(email: NonNullable<DailyBriefing['email']>): string {
  const parts: string[] = [];
  if ((email.needsResponse?.length ?? 0) > 0) parts.push(`${email.needsResponse.length} need response`);
  if ((email.actionRequired?.length ?? 0) > 0) parts.push(`${email.actionRequired.length} action`);
  if ((email.fyiCount ?? 0) > 0) parts.push(`${email.fyiCount} FYI`);
  return parts.join(' · ') || 'No new email';
}

function messagesSummaryLine(threads: NonNullable<DailyBriefing['messages']>['threads']): string {
  const unreplied = threads.filter(t => !t.youReplied);
  const highPriority = threads.filter(t => t.priority === 'high');
  if (highPriority.length > 0) {
    return `${highPriority[0].contact}${unreplied.length > 0 ? ` · ${unreplied.length} unreplied` : ''}`;
  }
  if (unreplied.length > 0) return `${unreplied.length} unreplied`;
  return `${threads.length} thread${threads.length !== 1 ? 's' : ''}`;
}

function wellnessSummaryLine(wellness: NonNullable<DailyBriefing['wellness']>): string {
  const parts: string[] = [];
  parts.push(wellness.medsStatus.onTrack ? 'Meds on track' : 'Meds: check in');
  if (wellness.moodTrend) parts.push(`Mood ${wellness.moodTrend}`);
  return parts.join(' · ');
}

function healthColor(health: string): string {
  switch (health) {
    case 'healthy': return 'var(--status-success)';
    case 'warning': return 'var(--status-warning)';
    case 'error': return 'var(--status-danger)';
    default: return 'var(--text-tertiary)';
  }
}

function moodColor(trend: string): string {
  switch (trend) {
    case 'improving': return 'var(--status-success)';
    case 'stable': return 'var(--accent-primary)';
    case 'declining': return 'var(--status-warning)';
    default: return 'var(--text-tertiary)';
  }
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
