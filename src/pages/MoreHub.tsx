import { Link } from 'react-router-dom';
import {
  Heart, Users, BookOpen, Settings, MessageCircle,
  CalendarCheck, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface HubRow {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
  badge?: number;
}

function HubItem({ row }: { row: HubRow }) {
  return (
    <Link
      to={row.to}
      className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] hover:bg-[var(--surface-card)] transition-colors"
    >
      <div
        className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${row.color} 15%, transparent)` }}
      >
        <row.icon size={20} style={{ color: row.color }} />
      </div>
      <span className="flex-1 text-[var(--text-primary)] font-medium">{row.label}</span>
      {row.badge !== undefined && row.badge > 0 && (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--accent-muted)] text-[var(--accent-primary)]">
          {row.badge}
        </span>
      )}
      <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
    </Link>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="type-caption uppercase tracking-wider text-[var(--text-tertiary)] px-4 pt-6 pb-2">
      {title}
    </h2>
  );
}

export function MoreHub() {
  const wellnessRows: HubRow[] = [
    { to: '/me', icon: Heart, label: 'Wellness', color: '#ec4899' },
  ];

  const teachingRows: HubRow[] = [
    { to: '/students', icon: Users, label: 'Students', color: '#06b6d4' },
    { to: '/library', icon: BookOpen, label: 'Library', color: '#8b5cf6' },
  ];

  const planningRows: HubRow[] = [
    { to: '/week-review', icon: CalendarCheck, label: 'Week Review', color: '#10b981' },
  ];

  const appRows: HubRow[] = [
    { to: '/settings', icon: Settings, label: 'Settings', color: 'var(--text-secondary)' },
    { to: '/ai', icon: MessageCircle, label: 'AI Chat', color: '#f59e0b' },
  ];

  return (
    <div className="page-container px-4 pb-24">
      <h1 className="type-display text-[var(--text-primary)] mb-2">More</h1>

      <nav aria-label="More navigation">
      <SectionHeader title="Wellness" />
      {wellnessRows.map(row => <HubItem key={row.to} row={row} />)}

      <SectionHeader title="Teaching Tools" />
      {teachingRows.map(row => <HubItem key={row.to} row={row} />)}

      <SectionHeader title="Planning" />
      {planningRows.map(row => <HubItem key={row.to} row={row} />)}

      <SectionHeader title="App" />
      {appRows.map(row => <HubItem key={row.to} row={row} />)}
      </nav>
    </div>
  );
}
