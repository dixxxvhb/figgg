import { Link } from 'react-router-dom';
import { useHeroPriority } from '../../../hooks/useHeroPriority';
import { useAIPanel } from '../../../contexts/AIPanelContext';
import { ZoneLabel } from '../ZoneLabel';
import { TamaraMark } from '../../common/TamaraMark';

export function Hero() {
  const card = useHeroPriority();
  const { open: openAIPanel } = useAIPanel();
  if (!card) return null;

  const ctaStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--dx-accent)',
    borderRadius: '4px',
    color: 'var(--dx-accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textDecoration: 'none',
    lineHeight: 1.2,
    textTransform: 'lowercase' as const,
    cursor: 'pointer',
  };

  const kindColor = card.kind === 'alert'
    ? 'var(--dx-warn)'
    : card.kind === 'action'
      ? 'var(--dx-accent)'
      : 'var(--dx-text-3)';

  return (
    <section
      className="dx-hero"
      style={{
        position: 'relative',
        backgroundColor: 'var(--dx-elevated)',
        border: '1px solid var(--dx-border-active)',
        borderRadius: '12px',
        padding: '20px 20px 16px',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <ZoneLabel>{card.zone.replace(/^\/\/\s*/, '')}</ZoneLabel>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: '9999px',
            backgroundColor: kindColor,
            flexShrink: 0,
          }}
        />
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(1.25rem, 5vw, 1.75rem)',
          fontWeight: 600,
          lineHeight: 1.2,
          color: 'var(--dx-text-1)',
          margin: '4px 0 10px',
          letterSpacing: '0.01em',
        }}
      >
        {card.title}
      </h2>

      {card.body && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: 'var(--dx-text-2)',
            margin: '0 0 16px',
          }}
        >
          {card.body}
        </p>
      )}

      {card.ctaLabel && card.ctaAction === 'logMood' ? (
        <button type="button" onClick={() => openAIPanel('mood')} style={{ ...ctaStyle, background: 'transparent' }}>
          {card.ctaLabel}
        </button>
      ) : card.ctaHref && card.ctaLabel ? (
        <Link to={card.ctaHref} style={ctaStyle}>
          {card.ctaLabel}
        </Link>
      ) : null}

      <TamaraMark size={28} color="var(--dx-tamara-gold)" opacity={0.55} style={{ position: 'absolute', bottom: 10, right: 10 }} />
    </section>
  );
}
