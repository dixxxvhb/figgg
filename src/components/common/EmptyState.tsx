import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Icon size={48} className="text-[var(--text-tertiary)] mb-4" strokeWidth={1.5} />
      <h3 className="type-h2 text-[var(--text-secondary)] mb-1">{title}</h3>
      {description && (
        <p className="type-body text-[var(--text-tertiary)] text-center max-w-[280px]">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
