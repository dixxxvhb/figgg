import type { ReactNode } from 'react';

interface HeroShellProps {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
}

// Hero wrapper — glass panel with active cobalt border, 22px corners,
// generous padding. The one prominent surface on the home screen.
export function HeroShell({ children, className = '', onTap }: HeroShellProps) {
  const Comp = onTap ? 'button' : 'div';
  return (
    <Comp
      onClick={onTap}
      className={`dx-hero ${className}`}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        backgroundColor: 'var(--dx-elevated)',
        color: 'var(--dx-text-1)',
        border: '1px solid var(--dx-border-active)',
        borderRadius: '12px',
        padding: '20px',
        fontFamily: 'var(--font-body)',
        transition: 'border-color 250ms ease, background-color 150ms ease',
        position: 'relative',
        overflow: 'hidden',
        cursor: onTap ? 'pointer' : undefined,
      }}
    >
      {children}
    </Comp>
  );
}
