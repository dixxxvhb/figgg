import type { ReactNode, HTMLAttributes } from 'react';

interface TileProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  dwd?: boolean;
  active?: boolean;
  as?: 'div' | 'button' | 'a';
  href?: string;
}

export function Tile({ children, dwd = false, active = false, className = '', style, ...rest }: TileProps) {
  return (
    <div
      className={`dx-tile ${className}`}
      style={{
        backgroundColor: 'var(--dx-elevated)',
        color: 'var(--dx-text-2)',
        borderRadius: '2px',
        padding: '12px',
        border: `1px solid ${active ? 'var(--dx-border-active)' : 'var(--dx-border-dim)'}`,
        borderBottom: dwd ? '1px solid var(--dx-dwd-terracotta)' : undefined,
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        transition: 'border-color 150ms ease, background-color 150ms ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
