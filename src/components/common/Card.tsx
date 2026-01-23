import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  onClick,
  interactive = false,
  selected = false,
  padding = 'md',
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl border shadow-sm';

  const borderStyles = selected
    ? 'border-2 border-forest-500'
    : 'border border-blush-200';

  const interactiveStyles = interactive || onClick
    ? 'hover:shadow-md hover:border-forest-300 transition-all cursor-pointer'
    : '';

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`${baseStyles} ${borderStyles} ${interactiveStyles} ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

// Section header for consistent typography
interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h2 className="text-lg font-semibold text-forest-700">{title}</h2>
      {action}
    </div>
  );
}

// Page container for consistent layout
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function PageContainer({
  children,
  className = '',
  maxWidth = 'lg',
}: PageContainerProps) {
  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div className={`${widthStyles[maxWidth]} mx-auto px-4 py-6 pb-24 ${className}`}>
      {children}
    </div>
  );
}
