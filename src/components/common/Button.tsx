import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-all duration-[var(--duration-instant)] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:scale-[0.98]';

  const variants = {
    primary: 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary-hover)] focus:ring-[var(--accent-primary)] shadow-sm hover:shadow',
    secondary: 'bg-[var(--surface-inset)] text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] focus:ring-[var(--border-subtle)] border border-[var(--border-subtle)]',
    ghost: 'text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] focus:ring-[var(--accent-primary)]',
    danger: 'bg-[var(--status-danger)] text-white hover:opacity-90 focus:ring-[var(--status-danger)]',
    success: 'bg-[var(--status-success)] text-white hover:opacity-90 focus:ring-[var(--status-success)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
