import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface DropdownMenuProps {
  items: MenuItem[];
  className?: string;
}

export function DropdownMenu({ items, className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="More options"
        className="p-3 hover:bg-[var(--surface-card-hover)] active:bg-[var(--surface-inset)] rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <MoreVertical size={20} className="text-[var(--text-secondary)]" />
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 top-full mt-1 bg-[var(--surface-card)] rounded-lg border border-[var(--border-subtle)] py-1 min-w-[160px] z-50" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          {items.map((item, index) => (
            <button
              key={index}
              role="menuitem"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors min-h-[44px] ${
                item.danger
                  ? 'text-[var(--status-danger)] hover:bg-[var(--surface-inset)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] active:bg-[var(--surface-inset)]'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
