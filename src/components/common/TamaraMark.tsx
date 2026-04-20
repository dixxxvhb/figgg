/**
 * TamaraMark — two overlapping gold circles for Mom (Tamara S. Bowles).
 * DWD brand tribute. Ghosts behind Dixon's countdowns / surfaces. Not
 * announced, just there. Pure SVG for crisp rendering at any size.
 *
 * Gold is the memorial color — only use this mark with the gold stroke.
 * Default opacity is low (28%) so it sits behind content, not on top of it.
 */
export function TamaraMark({
  size = 40,
  opacity = 0.28,
  color = '#F4D35E',
  className = '',
  style,
}: {
  size?: number;
  opacity?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const r = size * 0.275;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ opacity, pointerEvents: 'none', ...style }}
    >
      <circle cx="14" cy="14" r={r} stroke={color} strokeWidth="1.5" />
      <circle cx="24" cy="22" r={r} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
