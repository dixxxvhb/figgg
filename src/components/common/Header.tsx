import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  CheckSquare,
  MoreHorizontal,
  WifiOff,
  Pill,
  Rocket,
} from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

// 6-tab navigation: Home, Schedule, Meds, Tasks, DWDC, More
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/me', icon: Pill, label: 'Meds' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/launch', icon: Rocket, label: 'DWDC' },
  { path: '/settings', icon: MoreHorizontal, label: 'More' },
];

// Sync status indicator component — tappable for manual sync
function SyncIndicator() {
  const { status, triggerSync } = useSyncStatus();

  const indicators = {
    idle: { icon: Cloud, color: 'text-[var(--text-tertiary)]', title: 'Synced — tap to sync' },
    syncing: { icon: Loader2, color: 'text-[var(--text-secondary)] animate-spin', title: 'Syncing...' },
    success: { icon: Check, color: 'text-[var(--status-success)]', title: 'Saved' },
    error: { icon: CloudOff, color: 'text-[var(--status-danger)]', title: 'Sync failed — tap to retry' },
    offline: { icon: CloudOff, color: 'text-[var(--status-warning)]', title: 'Offline' },
  };

  const { icon: Icon, color, title } = indicators[status];
  const showBadge = status === 'error' || status === 'offline';
  const badgeColor = status === 'error' ? 'bg-[var(--status-danger)]' : 'bg-[var(--status-warning)]';

  const handleTap = () => {
    if (status !== 'syncing') {
      triggerSync();
    }
  };

  return (
    <button
      onClick={handleTap}
      className={`relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center ${color} active:scale-90 transition-transform`}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <Icon size={16} aria-hidden="true" />
      {showBadge && (
        <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${badgeColor}`} />
      )}
      <span className="sr-only">{title}</span>
    </button>
  );
}

// Offline pill — displayed inline in header next to SyncIndicator
function OfflineBanner() {
  const { status } = useSyncStatus();

  if (status !== 'offline') return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide text-[var(--status-warning)]"
      style={{ backgroundColor: 'color-mix(in srgb, var(--status-warning) 10%, transparent)' }}
      role="alert"
    >
      <WifiOff size={10} className="shrink-0" aria-hidden="true" />
      Offline
    </span>
  );
}

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <Link to="/" className="flex items-center gap-2" aria-label="FIG home">
            <span className="font-display text-xl font-bold text-[var(--accent-primary)]">FIG</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Offline pill */}
            <OfflineBanner />

            {/* Sync Status */}
            <SyncIndicator />

            {/* Desktop Nav - only show on large screens, iPad uses bottom nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map((item) => {
                const { path, icon: Icon, label } = item;
                const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
                const handleClick = () => {
                  if (path === '/me') {
                    sessionStorage.setItem('meActiveTab', 'meds');
                    sessionStorage.removeItem('meTabTarget');
                    window.dispatchEvent(new CustomEvent('meTabChange', { detail: 'meds' }));
                  }
                };
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={handleClick}
                    className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl transition-colors ${
                      isActive
                        ? 'text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-muted)] active:opacity-80'
                    }`}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const location = useLocation();

  const isActive = (item: typeof navItems[0]) => {
    const { path } = item;
    if (path === '/') return location.pathname === '/';
    if (path === '/schedule') {
      return location.pathname.startsWith('/schedule') ||
             location.pathname.startsWith('/class') ||
             location.pathname.startsWith('/event') ||
             location.pathname.startsWith('/plan');
    }
    if (path === '/me') return location.pathname === '/me';
    if (path === '/tasks') return location.pathname === '/tasks';
    if (path === '/launch') return location.pathname === '/launch';
    if (path === '/settings') {
      return location.pathname.startsWith('/settings') ||
             location.pathname.startsWith('/students') ||
             location.pathname.startsWith('/library') ||
             location.pathname.startsWith('/formations') ||
             location.pathname.startsWith('/choreography');
    }
    return location.pathname === path;
  };

  const handleNavClick = (path: string) => {
    if (path === '/me') {
      sessionStorage.setItem('meActiveTab', 'meds');
      sessionStorage.removeItem('meTabTarget');
      window.dispatchEvent(new CustomEvent('meTabChange', { detail: 'meds' }));
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-lg border-t border-[var(--border-subtle)] z-50"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-primary) 95%, transparent)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const { path, icon: Icon, label } = item;
          const active = isActive(item);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => handleNavClick(path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[48px] px-1 py-1 transition-all duration-150 active:scale-95 ${
                active
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-tertiary)]'
              }`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              {active ? (
                <span className="bg-[var(--accent-muted)] rounded-full px-3 py-1">
                  <Icon size={20} aria-hidden="true" />
                </span>
              ) : (
                <Icon size={20} aria-hidden="true" />
              )}
              <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`} aria-hidden="true">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
