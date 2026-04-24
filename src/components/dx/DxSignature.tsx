interface DxSignatureProps {
  prefix?: string;
  compact?: boolean;
}

// `figgg/` or `dx/` with a blinking cursor on the slash.
export function DxSignature({ prefix = 'figgg', compact = false }: DxSignatureProps) {
  return (
    <span
      className="dx-signature"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0,
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontSize: compact ? '0.6875rem' : '1rem',
        letterSpacing: '0.02em',
        color: 'var(--dx-text-2)',
        lineHeight: 1,
      }}
    >
      <span>{prefix}</span>
      <span className="dx-slash" style={{ color: 'var(--dx-accent)', marginLeft: '1px' }}>
        /
      </span>
    </span>
  );
}
