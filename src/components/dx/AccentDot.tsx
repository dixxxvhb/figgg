// A single cobalt dot — used for active-nav indicator, hero priority marker, etc.
export function AccentDot({ size = 4 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '9999px',
        backgroundColor: 'var(--dx-accent)',
      }}
    />
  );
}
