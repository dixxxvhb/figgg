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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] active:scale-[0.98]';

  const variants = {
    primary: 'bg-forest-600 text-white hover:bg-forest-500 focus:ring-forest-500 shadow-sm hover:shadow dark:bg-forest-600 dark:hover:bg-forest-500',
    secondary: 'bg-blush-100 text-forest-700 hover:bg-blush-200 focus:ring-blush-300 border border-blush-200 dark:bg-blush-800 dark:text-blush-100 dark:border-blush-700 dark:hover:bg-blush-700',
    ghost: 'text-forest-600 hover:bg-blush-100 focus:ring-forest-500 dark:text-forest-400 dark:hover:bg-blush-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600',
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

// Icon-only button variant for toolbars
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for accessibility
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variants = {
    primary: 'bg-forest-600 text-white hover:bg-forest-500 focus:ring-forest-500 dark:bg-forest-600 dark:hover:bg-forest-500',
    secondary: 'bg-blush-100 text-forest-700 hover:bg-blush-200 focus:ring-blush-300 dark:bg-blush-800 dark:text-blush-100 dark:hover:bg-blush-700',
    ghost: 'text-forest-600 hover:bg-blush-100 focus:ring-forest-500 dark:text-forest-400 dark:hover:bg-blush-800',
    danger: 'text-red-600 hover:bg-red-50 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/30',
  };

  const sizes = {
    sm: 'p-1.5 min-h-[36px] min-w-[36px]',
    md: 'p-2 min-h-[44px] min-w-[44px]',
    lg: 'p-3 min-h-[52px] min-w-[52px]',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
    </button>
  );
}
