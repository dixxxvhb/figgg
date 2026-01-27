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
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 hover:bg-blush-100 dark:hover:bg-blush-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <MoreVertical size={20} className="text-blush-600 dark:text-blush-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-blush-800 rounded-lg shadow-lg border border-blush-200 dark:border-blush-700 py-1 min-w-[160px] z-50">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors min-h-[44px] ${
                item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                  : 'text-blush-700 dark:text-blush-200 hover:bg-blush-50 dark:hover:bg-blush-700'
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
