import { useEffect } from 'react';
import { Hero } from '../components/dx/home/Hero';
import { River } from '../components/dx/home/River';
import { Orbit } from '../components/dx/home/Orbit';
import { Pulse } from '../components/dx/home/Pulse';
import { useAmbientTheme } from '../hooks/useAmbientTheme';
import { useEnergyMode } from '../hooks/useEnergyMode';
import { DxSignature } from '../components/dx/DxSignature';

export function Dashboard() {
  // Subscribe to ambient-time shifts so bg/border/accent refresh on each window change
  useAmbientTheme();
  const { mode, cycle, effective } = useEnergyMode();

  useEffect(() => {
    document.title = 'figgg';
  }, []);

  return (
    <div
      className="page-w"
      style={{
        padding: '16px 16px 96px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <Hero />
      <River />
      {effective === 'high' && (
        <>
          <Orbit />
          <Pulse />
        </>
      )}

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--dx-border-dim)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.625rem',
          color: 'var(--dx-text-4)',
          letterSpacing: '0.1em',
        }}
      >
        <button
          type="button"
          onClick={cycle}
          aria-label={`energy mode: ${mode}. tap to cycle.`}
          style={{
            background: 'transparent',
            border: '1px solid var(--dx-border-dim)',
            borderRadius: '2px',
            color: 'var(--dx-text-3)',
            padding: '4px 8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            letterSpacing: '0.12em',
            cursor: 'pointer',
            textTransform: 'lowercase',
          }}
        >
          // energy · {mode} ↻
        </button>
        <DxSignature compact />
      </footer>
    </div>
  );
}
