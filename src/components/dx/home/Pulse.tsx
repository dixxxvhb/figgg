import { useMemo } from 'react';
import { useAppData } from '../../../contexts/AppDataContext';
import { ZoneLabel } from '../ZoneLabel';

interface Spark {
  label: string;
  values: number[];
  current: string;
}

// Tiny 7-day sparklines — mood, meds-on-time, class completion.
export function Pulse() {
  const { data } = useAppData();
  const sparks = useMemo<Spark[]>(() => {
    const learning = data.learningData;
    const snapshots = learning?.dailySnapshots || [];
    const last7 = snapshots.slice(-7);

    const moodValues = last7.map((s) => numericMood(s.mood));
    const medsValues = last7.map((s) => countDoses(s));
    const classValues = last7.map((s) => s.classesScheduled ?? 0);

    return [
      { label: 'mood · 7d', values: moodValues, current: last7[last7.length - 1]?.mood || '—' },
      { label: 'meds · 7d', values: medsValues, current: `${medsValues[medsValues.length - 1] ?? 0}` },
      { label: 'class · 7d', values: classValues, current: `${classValues[classValues.length - 1] ?? 0}` },
    ];
  }, [data]);

  return (
    <div>
      <ZoneLabel>pulse</ZoneLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {sparks.map((s) => (
          <SparkCell key={s.label} spark={s} />
        ))}
      </div>
    </div>
  );
}

function SparkCell({ spark }: { spark: Spark }) {
  const path = useMemo(() => toSparkPath(spark.values), [spark.values]);
  const hasData = spark.values.some((v) => v > 0);
  return (
    <div
      style={{
        backgroundColor: 'var(--dx-elevated)',
        border: '1px solid var(--dx-border-dim)',
        borderRadius: '2px',
        padding: '10px 10px 6px',
        fontFamily: 'var(--font-mono)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: '0.625rem', color: 'var(--dx-text-3)', letterSpacing: '0.18em', marginBottom: '4px' }}>
        {spark.label}
      </div>
      <div style={{ fontSize: '1rem', color: 'var(--dx-text-1)', fontVariantNumeric: 'tabular-nums', minHeight: '1.2em' }}>
        {spark.current}
      </div>
      {hasData && (
        <svg viewBox="0 0 100 24" width="100%" height="18" style={{ marginTop: '6px', display: 'block' }} aria-hidden="true">
          <path d={path} fill="none" stroke="var(--dx-accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
      {!hasData && (
        <div style={{ fontSize: '0.625rem', color: 'var(--dx-text-4)', marginTop: '6px', opacity: 0.7 }}>// no data</div>
      )}
    </div>
  );
}

function toSparkPath(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(1, ...values);
  const step = 100 / Math.max(1, values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = 22 - (v / max) * 18;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function countDoses(s: { dose1Time?: string; dose2Time?: string; dose3Time?: string }): number {
  return (s.dose1Time ? 1 : 0) + (s.dose2Time ? 1 : 0) + (s.dose3Time ? 1 : 0);
}

function numericMood(mood: string | undefined): number {
  if (!mood) return 0;
  const map: Record<string, number> = {
    focused: 5, energized: 5, excited: 5,
    neutral: 3, okay: 3,
    anxious: 2, stressed: 2,
    tired: 1, low: 1,
  };
  return map[mood.toLowerCase()] ?? 3;
}
