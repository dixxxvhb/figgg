import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../../contexts/AppDataContext';
import { ZoneLabel } from '../ZoneLabel';
import { StatusDot } from '../StatusDot';
import { getClassesByDay } from '../../../data/classes';
import { getCurrentDayOfWeek, timeToMinutes } from '../../../utils/time';

interface RiverRow {
  id: string;
  time: string;           // "09:30"
  label: string;          // "ballet iii"
  sublabel?: string;      // "studio a"
  state: 'done' | 'now' | 'future' | 'overdue';
  href?: string;
}

// Today's timeline — calendar events + classes + med windows + reminders
// sorted chronologically with done/now/future/overdue states.
export function River() {
  const { data } = useAppData();

  const rows = useMemo<RiverRow[]>(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().slice(0, 10);
    const out: RiverRow[] = [];

    // Classes today
    const dayName = getCurrentDayOfWeek();
    const classesToday = getClassesByDay(data.classes, dayName);
    for (const c of classesToday) {
      const startMins = timeToMinutes(c.startTime);
      const endMins = timeToMinutes(c.endTime);
      const state: RiverRow['state'] =
        nowMins < startMins ? 'future' :
        nowMins <= endMins ? 'now' :
        'done';
      const studio = data.studios?.find(s => s.id === c.studioId);
      out.push({
        id: `cls-${c.id}`,
        time: c.startTime,
        label: c.name.toLowerCase(),
        sublabel: studio?.name.toLowerCase(),
        state,
        href: `/class/${c.id}`,
      });
    }

    // Calendar events today
    const hiddenIds = new Set(data.settings?.hiddenCalendarEventIds || []);
    const events = (data.calendarEvents || []).filter(e => e.date === todayStr && !hiddenIds.has(e.id));
    for (const e of events) {
      if (!e.startTime) continue;
      const startMins = timeToMinutes(e.startTime);
      const endMins = e.endTime ? timeToMinutes(e.endTime) : startMins + 60;
      const state: RiverRow['state'] =
        nowMins < startMins ? 'future' :
        nowMins <= endMins ? 'now' :
        'done';
      out.push({
        id: `cal-${e.id}`,
        time: e.startTime,
        label: (e.title || 'event').toLowerCase(),
        sublabel: e.location?.toLowerCase(),
        state,
        href: `/event/${e.id}`,
      });
    }

    // Overdue reminders
    const reminders = (data.selfCare?.reminders || []).filter(r => !r.completed);
    for (const r of reminders) {
      if (!r.dueDate) continue;
      if (r.dueDate < todayStr) {
        out.push({
          id: `rem-${r.id}`,
          time: '—',
          label: r.title.toLowerCase(),
          sublabel: `overdue ${r.dueDate}`,
          state: 'overdue',
          href: '/tasks',
        });
      } else if (r.dueDate === todayStr) {
        out.push({
          id: `rem-${r.id}`,
          time: '—',
          label: r.title.toLowerCase(),
          sublabel: 'due today',
          state: 'future',
          href: '/tasks',
        });
      }
    }

    return out.sort((a, b) => {
      if (a.state === 'overdue') return -1;
      if (b.state === 'overdue') return 1;
      return a.time.localeCompare(b.time);
    }).slice(0, 8);
  }, [data]);

  const statusForDot = (s: RiverRow['state']) =>
    s === 'overdue' ? 'warn' :
    s === 'now'     ? 'on'   :
    s === 'done'    ? 'muted' :
                      'off';

  return (
    <section>
      <ZoneLabel>today</ZoneLabel>
      {rows.length === 0 ? (
        <div
          style={{
            padding: '16px 12px',
            color: 'var(--dx-text-3)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
          }}
        >
          empty day. suspicious.
        </div>
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rows.map((row) => (
            <li key={row.id}>
              <RiverRowItem row={row} statusForDot={statusForDot} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RiverRowItem({ row, statusForDot }: { row: RiverRow; statusForDot: (s: RiverRow['state']) => 'on' | 'off' | 'warn' | 'muted' }) {
  const isDone = row.state === 'done';
  const isNow = row.state === 'now';
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px',
        padding: '8px 0',
        borderBottom: '1px solid var(--dx-border-dim)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.8125rem',
        color: isDone ? 'var(--dx-text-4)' : 'var(--dx-text-2)',
        textDecoration: isDone ? 'line-through' : 'none',
        opacity: isDone ? 0.6 : 1,
      }}
    >
      <span style={{ width: '44px', fontFamily: 'var(--font-mono)', color: 'var(--dx-text-3)', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', flexShrink: 0 }}>
        {row.time}
      </span>
      <StatusDot status={statusForDot(row.state)} size={6} />
      <span style={{ flex: 1, color: isNow ? 'var(--dx-accent)' : undefined, fontWeight: isNow ? 500 : 400 }}>{row.label}</span>
      {row.sublabel && (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--dx-text-4)', fontSize: '0.6875rem', letterSpacing: '0.06em' }}>
          {row.sublabel}
        </span>
      )}
    </div>
  );
  return row.href ? <Link to={row.href} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link> : content;
}
