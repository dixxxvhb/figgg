import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  items: { label: string; to?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-4 px-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.to ? (
            <Link to={item.to} className="hover:text-[var(--text-secondary)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--text-secondary)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
