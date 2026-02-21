import React from 'react';

type CardVariant = 'standard' | 'elevated' | 'inset' | 'highlight' | 'stat' | 'modal';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: CardVariant;
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  highlightColor?: string; // CSS color for highlight variant left border
  // Legacy prop support
  interactive?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  variant = 'standard',
  selected = false,
  padding = 'md',
  highlightColor,
  interactive = false,
}: CardProps) {
  // Determine effective variant — interactive prop maps to elevated for backwards compat
  const effectiveVariant = interactive && variant === 'standard' ? 'elevated' : variant;

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const variantStyles: Record<CardVariant, string> = {
    standard: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
    ].join(' '),
    elevated: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'transition-all',
      'duration-[var(--duration-fast)]',
      onClick ? 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--border-strong)] active:scale-[0.98]' : '',
    ].join(' '),
    inset: [
      'rounded-[var(--radius-sm)]',
      'border',
      'bg-[var(--surface-inset)]',
      'border-[var(--border-subtle)]',
    ].join(' '),
    highlight: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--surface-card)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'border-l-[3px]',
    ].join(' '),
    stat: [
      'rounded-[var(--radius-md)]',
      'border',
      'bg-[var(--accent-muted)]',
      'border-[var(--border-subtle)]',
      'shadow-[var(--shadow-card)]',
      'text-center',
    ].join(' '),
    modal: [
      'rounded-[var(--radius-lg)]',
      'bg-[var(--surface-elevated)]',
      'shadow-[var(--shadow-elevated)]',
    ].join(' '),
  };

  const selectedStyles = selected ? 'ring-2 ring-[var(--accent-primary)]' : '';

  const Component = onClick ? 'button' : 'div';

  const style: React.CSSProperties = {};
  if (effectiveVariant === 'highlight' && highlightColor) {
    style.borderLeftColor = highlightColor;
  } else if (effectiveVariant === 'highlight') {
    style.borderLeftColor = 'var(--accent-primary)';
  }

  return (
    <Component
      className={`${variantStyles[effectiveVariant]} ${selectedStyles} ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {children}
    </Component>
  );
}
