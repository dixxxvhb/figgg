import { Link } from 'react-router-dom';
import { useAppData } from '../../../contexts/AppDataContext';
import { useSelfCareStatus } from '../../../hooks/useSelfCareStatus';
import { useStreaks } from '../../../hooks/useStreaks';
import { ZoneLabel } from '../ZoneLabel';
import { Tile } from '../Tile';
import { StatusDot } from '../StatusDot';
import { DEFAULT_MED_CONFIG } from '../../../types';
import { getClassesFromCalendar } from '../../../utils/calendarEventType';

interface TileDef {
  label: string;
  value: string;
  href?: string;
  status?: 'on' | 'off' | 'warn' | 'muted';
  streak?: number;
  dwd?: boolean;
}

function Cluster({ zone, suffix, tiles }: { zone: string; suffix?: string; tiles: TileDef[] }) {
  return (
    <div>
      <ZoneLabel suffix={suffix}>{zone}</ZoneLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {tiles.map((t) => {
          const inner = (
            <Tile dwd={t.dwd} style={{ minHeight: '64px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {t.status && <StatusDot status={t.status} size={5} />}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    color: 'var(--dx-text-3)',
                    letterSpacing: '0.18em',
                    textTransform: 'lowercase',
                  }}
                >
                  {t.label}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'var(--dx-text-1)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}
              >
                {t.value}
              </div>
              {typeof t.streak === 'number' && t.streak > 0 && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5625rem',
                    color: 'var(--dx-accent)',
                    letterSpacing: '0.15em',
                    marginTop: '4px',
                  }}
                >
                  · {t.streak}d
                </div>
              )}
              {typeof t.streak === 'number' && t.streak === 0 && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5625rem',
                    color: 'var(--dx-text-4)',
                    letterSpacing: '0.15em',
                    marginTop: '4px',
                  }}
                >
                  // reset
                </div>
              )}
            </Tile>
          );
          return t.href ? (
            <Link key={t.label} to={t.href} style={{ textDecoration: 'none', display: 'block' }}>
              {inner}
            </Link>
          ) : (
            <div key={t.label}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

// 4 clusters × 4 tiles.
export function Orbit() {
  const { data } = useAppData();
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const selfCare = useSelfCareStatus(data.selfCare, medConfig);
  const streaks = useStreaks();

  const todayStr = new Date().toISOString().slice(0, 10);
  const checkIns = (data.aiCheckIns || []).filter(c => c.date === todayStr && !!c.mood);
  const latestMood = checkIns[checkIns.length - 1]?.mood?.toLowerCase() || '—';
  const openReminders = (data.selfCare?.reminders || []).filter(r => !r.completed).length;
  const studentCount = (data.students || []).length;
  const studioCount = (data.studios || []).length;
  const weekClasses = getClassesFromCalendar(data, { week: true }).length;

  const personal: TileDef[] = [
    { label: 'mood', value: latestMood, href: '/me', status: latestMood === '—' ? 'warn' : 'on', streak: streaks.moodLogged },
    { label: 'meds', value: selfCare.dose1Active ? (selfCare.dose2Active ? '2/2' : '1/2') : '0/2', href: '/meds', status: selfCare.dose1Active ? 'on' : 'off', streak: streaks.medsOnTime },
    { label: 'wellness', value: data.selfCare?.wellnessMode || '—', href: '/me', status: data.selfCare?.wellnessMode ? 'on' : 'muted', streak: streaks.wellnessTouch },
    { label: 'tasks', value: String(openReminders), href: '/tasks', status: openReminders > 0 ? 'warn' : 'on' },
  ];

  const teaching: TileDef[] = [
    { label: 'students', value: String(studentCount), href: '/students' },
    { label: 'studios', value: String(studioCount), href: '/schedule' },
    { label: 'classes', value: String(weekClasses), href: '/schedule' },
    { label: 'library', value: 'open', href: '/library' },
  ];

  const projects: TileDef[] = [
    { label: 'figgg', value: 'live' },
    { label: 'dwd', value: 'live', dwd: true },
    { label: 'creator', value: 'live' },
    { label: 'website', value: 'live', dwd: true },
  ];

  const system: TileDef[] = [
    { label: 'sync', value: 'ok', status: 'on' },
    { label: 'build', value: 'dx·v1', status: 'on' },
    { label: 'ai', value: 'ready', href: '/ai', status: 'on' },
    { label: 'more', value: '↗', href: '/more' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Cluster zone="personal" tiles={personal} />
      <Cluster zone="teaching" tiles={teaching} />
      <Cluster zone="projects" tiles={projects} />
      <Cluster zone="system" tiles={system} />
    </div>
  );
}
