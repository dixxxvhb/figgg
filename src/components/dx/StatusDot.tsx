type Status = 'on' | 'off' | 'warn' | 'error' | 'muted';

interface StatusDotProps {
  status?: Status;
  size?: number;
  pulse?: boolean;
}

const COLOR: Record<Status, string> = {
  on:    'var(--dx-accent)',
  off:   'var(--dx-text-4)',
  warn:  'var(--dx-warn)',
  error: 'var(--dx-error)',
  muted: 'var(--dx-border-dim)',
};

export function StatusDot({ status = 'on', size = 8, pulse = false }: StatusDotProps) {
  return (
    <span
      className={pulse ? 'dx-dot-pulse' : undefined}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '9999px',
        backgroundColor: COLOR[status],
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}
