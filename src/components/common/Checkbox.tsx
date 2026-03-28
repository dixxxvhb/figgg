import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
}: CheckboxProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5' };

  return (
    <label className={`inline-flex items-center gap-2.5 min-h-[44px] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`${sizes[size]} rounded-[var(--radius-sm)] border-2 flex items-center justify-center transition-all duration-[var(--duration-instant)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] ${
          checked
            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
            : 'bg-transparent border-[var(--border-strong)]'
        }`}
      >
        {checked && <Check size={size === 'sm' ? 10 : 13} className="text-[var(--text-on-accent)]" strokeWidth={3} />}
      </button>
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </label>
  );
}
