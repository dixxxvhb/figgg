import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { StaggerReveal } from '../components/common/StaggerReveal';
import {
  flattenAllNotes,
  filterNotes,
  groupByDay,
  highlightSegments,
  type NoteSearchFilters,
  type NoteSearchResult,
} from '../services/notesSearch';
import type { LiveNote } from '../types';

type CatFilter = LiveNote['category'] | 'all';

const CATS: { id: CatFilter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'worked-on',   label: 'Worked' },
  { id: 'needs-work',  label: 'Needs' },
  { id: 'next-week',   label: 'Next week' },
  { id: 'ideas',       label: 'Ideas' },
];

const CAT_COLORS: Record<string, { bg: string; fg: string }> = {
  'worked-on':  { bg: 'rgba(107, 143, 113, 0.18)', fg: 'var(--status-success)' },
  'needs-work': { bg: 'rgba(220, 181, 67, 0.14)',  fg: 'var(--status-warning)' },
  'next-week':  { bg: 'var(--accent-muted)',       fg: 'var(--accent-primary)' },
  'ideas':      { bg: 'rgba(232, 180, 160, 0.12)', fg: 'var(--accent-secondary)' },
  // legacy values
  'covered':      { bg: 'rgba(107, 143, 113, 0.18)', fg: 'var(--status-success)' },
  'observation':  { bg: 'rgba(220, 181, 67, 0.14)',  fg: 'var(--status-warning)' },
  'reminder':     { bg: 'var(--accent-muted)',       fg: 'var(--accent-primary)' },
  'choreography': { bg: 'rgba(232, 180, 160, 0.12)', fg: 'var(--accent-secondary)' },
};

function NoteRow({ result, query }: { result: NoteSearchResult; query: string }) {
  const { note, sourceId, sourceLabel, sourceKind, category } = result;
  const catKey = category || 'ideas';
  const cat = CAT_COLORS[catKey] || CAT_COLORS['ideas'];
  const href = sourceKind === 'event' ? `/event/${sourceId}/notes` : `/class/${sourceId}/notes`;
  const time = format(parseISO(note.timestamp), 'h:mm a');
  const segments = query ? highlightSegments(note.text, query) : [{ text: note.text, match: false }];

  return (
    <Link
      to={href}
      style={{
        display: 'block',
        padding: '14px 0',
        borderTop: '1px solid var(--border-subtle)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
          {sourceLabel}
        </span>
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 4,
            fontWeight: 600,
            background: cat.bg,
            color: cat.fg,
          }}
        >
          {catKey?.replace('-', ' ')}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontVariantNumeric: 'tabular-nums oldstyle-nums',
          }}
        >
          {time}
        </span>
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--text-primary)' }}>
        {segments.map((seg, i) =>
          seg.match ? (
            <mark
              key={i}
              style={{
                background: 'color-mix(in oklab, var(--status-warning) 35%, transparent)',
                color: 'var(--text-primary)',
                padding: '0 2px',
                borderRadius: 2,
              }}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
    </Link>
  );
}

function DayGroup({
  day,
  items,
  query,
}: {
  day: string;
  items: NoteSearchResult[];
  query: string;
}) {
  const d = parseISO(day + 'T12:00:00');
  const dateLabel = format(d, 'MMM d');
  const weekday = format(d, 'EEE');
  const today = format(new Date(), 'yyyy-MM-dd');
  const yest = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  const isToday = day === today;
  const isYest = day === yest;
  const weekdayHint = isToday ? 'Today' : isYest ? 'Yesterday' : weekday;

  return (
    <section style={{ padding: '22px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2
          className="cc-wonk"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: 'var(--text-primary)',
          }}
        >
          {dateLabel}
        </h2>
        <span className="cc-label" style={{ color: 'var(--text-tertiary)' }}>
          {weekdayHint} · {items.length} {items.length === 1 ? 'note' : 'notes'}
        </span>
      </div>
      {items.map((r) => (
        <NoteRow key={r.note.id + r.sourceId} result={r} query={query} />
      ))}
    </section>
  );
}

export function Notes() {
  const { data } = useAppData();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<CatFilter>('all');

  const all = useMemo(
    () => flattenAllNotes(data.weekNotes || [], {
      classes: data.classes || [],
      calendarEvents: data.calendarEvents || [],
    }),
    [data.weekNotes, data.classes, data.calendarEvents]
  );

  const filtered = useMemo(() => {
    const filters: NoteSearchFilters = {
      query: query.trim(),
      categories: activeCat === 'all' ? undefined : [activeCat],
    };
    return filterNotes(all, filters);
  }, [all, query, activeCat]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="pb-20 min-h-screen" style={{ background: 'var(--surface-primary)' }}>
      <StaggerReveal resetKey="notes">
        <header className="px-6 pt-10 pb-3">
          <p className="cc-label">Across every class, every event</p>
          <h1
            className="cc-wonk"
            style={{
              fontSize: 48,
              lineHeight: 0.95,
              marginTop: 6,
              color: 'var(--text-primary)',
            }}
          >
            Notes
          </h1>
        </header>

        {/* Search */}
        <div style={{ padding: '0 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16,
            }}
          >
            <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every note…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 16,
                outline: 'none',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'transparent',
                  border: 0,
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category filters */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '14px 24px 0',
            overflowX: 'auto',
          }}
        >
          {CATS.map((c) => {
            const on = activeCat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                style={{
                  background: on ? 'var(--accent-primary)' : 'transparent',
                  border: '1px solid ' + (on ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                  color: on ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  padding: '7px 14px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 200ms ease',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Timeline / Empty */}
        {grouped.length === 0 ? (
          <div
            style={{
              padding: '48px 32px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontVariationSettings: '"opsz" 36, "wght" 500',
                fontSize: 20,
                marginBottom: 8,
                color: 'var(--text-primary)',
              }}
            >
              {query ? 'No notes match.' : 'Nothing here yet.'}
            </p>
            <p style={{ fontSize: 14 }}>
              {query
                ? 'Try a different word or clear filters.'
                : 'Notes you take in class or at events land here.'}
            </p>
          </div>
        ) : (
          grouped.map((g) => (
            <DayGroup key={g.day} day={g.day} items={g.items} query={query.trim()} />
          ))
        )}
      </StaggerReveal>
    </div>
  );
}
