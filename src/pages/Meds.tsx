import { useMemo } from 'react';
import { format } from 'date-fns';
import { useAppData } from '../contexts/AppDataContext';
import { useSelfCareStatus } from '../hooks/useSelfCareStatus';
import { DEFAULT_MED_CONFIG } from '../types';
import { MedsTracker } from '../components/wellness/MedsTracker';
import { StaggerReveal } from '../components/common/StaggerReveal';
import { getMedsDisplay, toneColorVar } from '../utils/medsStatus';

function formatElapsed(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function highestActiveDoseTime(selfCare: ReturnType<typeof useAppData>['data']['selfCare']): number | null {
  if (!selfCare) return null;
  const today = format(new Date(), 'yyyy-MM-dd');
  const cand = [
    { t: selfCare.dose3Time, d: selfCare.dose3Date },
    { t: selfCare.dose2Time, d: selfCare.dose2Date },
    { t: selfCare.dose1Time, d: selfCare.dose1Date },
  ];
  for (const c of cand) {
    if (c.t && c.d === today) return c.t;
  }
  return null;
}

export function Meds() {
  const { data, updateSelfCare } = useAppData();
  const medConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const status = useSelfCareStatus(data.selfCare, medConfig);
  const display = getMedsDisplay(status);
  const activeAt = highestActiveDoseTime(data.selfCare);
  const elapsed = activeAt ? formatElapsed(Date.now() - activeAt) : null;

  const dayName = format(new Date(), 'EEEE');
  const dateStr = format(new Date(), 'MMMM d');

  // Upcoming class collision — if any class is within next 90 minutes and
  // meds projected to be worn off by then
  const collision = useMemo(() => {
    if (!activeAt) return null;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const today = format(new Date(), 'EEEE').toLowerCase();
    const upcoming = (data.classes || [])
      .filter(c => c.day === today)
      .map(c => {
        const [h, m] = c.startTime.split(':').map(Number);
        return { cls: c, start: h * 60 + m };
      })
      .filter(({ start }) => start >= nowMin && start - nowMin <= 90)
      .sort((a, b) => a.start - b.start)[0];
    if (!upcoming) return null;
    const projected = status.projectedStatus(upcoming.start - nowMin);
    if (!projected) return null;
    const concerning = /wearing|taper|expired|worn/i.test(projected);
    if (!concerning) return null;
    return { name: upcoming.cls.name, time: upcoming.cls.startTime, projected };
  }, [data.classes, status, activeAt]);

  return (
    <div className="pb-20 min-h-screen" style={{ background: 'var(--surface-primary)' }}>
      <StaggerReveal resetKey="meds">
        <header className="px-6 pt-10 pb-3">
          <p className="cc-label" style={{ color: 'var(--text-tertiary)' }}>
            {dayName} · {dateStr}
          </p>
          <h1
            className="cc-wonk"
            style={{
              fontSize: 48,
              lineHeight: 0.95,
              marginTop: 6,
              color: 'var(--text-primary)',
            }}
          >
            Meds
          </h1>
        </header>

        {/* NOW card — editorial status hero */}
        <div className="px-6 pt-2">
          <div
            style={{
              padding: '28px 24px',
              background:
                'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--accent-primary) 8%, var(--surface-card)), var(--surface-card) 80%)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 24,
              textAlign: 'center',
              overflow: 'hidden',
            }}
          >
            <p
              className="cc-label"
              style={{ marginBottom: 12, color: 'var(--text-tertiary)' }}
            >
              Right now
            </p>
            <div
              className="cc-wonk"
              style={{
                fontSize: 52,
                lineHeight: 1,
                color: toneColorVar(display.tone),
                marginBottom: 10,
              }}
            >
              {display.label}
            </div>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 16, "wght" 400',
              }}
            >
              {display.blurb}
            </div>
            {elapsed && (
              <div
                style={{
                  marginTop: 16,
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontVariantNumeric: 'tabular-nums oldstyle-nums',
                  fontVariationSettings: '"opsz" 36, "wght" 500',
                  fontSize: 32,
                  color: 'var(--text-primary)',
                }}
              >
                {elapsed}
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginLeft: 6,
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                  }}
                >
                  since dose
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Class-meds collision warning, if any */}
        {collision && (
          <div className="px-6 pt-4">
            <div
              style={{
                padding: '14px 18px',
                background: 'color-mix(in oklab, var(--status-warning) 10%, var(--surface-card))',
                border: '1px solid color-mix(in oklab, var(--status-warning) 30%, transparent)',
                borderRadius: 16,
                color: 'var(--text-primary)',
                fontSize: 14,
              }}
            >
              Meds projected <strong style={{ color: 'var(--status-warning)' }}>{collision.projected.toLowerCase()}</strong> by{' '}
              <strong>{collision.name}</strong> at {collision.time}. Consider timing.
            </div>
          </div>
        )}

        {/* Existing MedsTracker — full-featured dose log, history, skip menu, config */}
        <div className="px-2 pt-4">
          <MedsTracker
            selfCare={data.selfCare}
            medConfig={medConfig}
            classes={data.classes || []}
            studios={data.studios || []}
            onUpdateSelfCare={updateSelfCare}
            learningData={data.learningData}
          />
        </div>
      </StaggerReveal>
    </div>
  );
}
