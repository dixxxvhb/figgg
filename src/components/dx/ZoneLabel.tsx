import type { ReactNode } from 'react';

interface ZoneLabelProps {
  children: ReactNode;
  suffix?: string;
}

// `// today`, `// personal`, `// business · dwd` — dx section headers.
export function ZoneLabel({ children, suffix }: ZoneLabelProps) {
  return (
    <div
      className="dx-zone-label"
      style={{
        color: 'var(--dx-text-3)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.625rem',
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'lowercase',
        lineHeight: 1.2,
        marginBottom: '8px',
      }}
    >
      <span style={{ opacity: 0.55 }}>// </span>
      {children}
      {suffix && <span style={{ opacity: 0.55 }}> · {suffix}</span>}
    </div>
  );
}
