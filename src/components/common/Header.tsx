import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Trophy,
  MoreHorizontal,
  Zap,
  WifiOff
} from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

// Simplified consistent navigation - always the same 5 items
const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/me', icon: Zap, label: 'Me' },
  { path: '/competitions', icon: Trophy, label: 'Compete' },
  { path: '/settings', icon: MoreHorizontal, label: 'More' },
];

// Sync status indicator component
function SyncIndicator() {
  const { status } = useSyncStatus();

  const indicators = {
    idle: { icon: Cloud, color: 'text-blush-300/60', title: 'Synced' },
    syncing: { icon: Loader2, color: 'text-blush-200 animate-spin', title: 'Syncing...' },
    success: { icon: Check, color: 'text-green-400', title: 'Saved' },
    error: { icon: CloudOff, color: 'text-red-400', title: 'Sync failed' },
    offline: { icon: CloudOff, color: 'text-amber-400', title: 'Offline' },
  };

  const { icon: Icon, color, title } = indicators[status];

  return (
    <div
      className={`p-1.5 ${color}`}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{title}</span>
    </div>
  );
}

// Offline banner
function OfflineBanner() {
  const { status } = useSyncStatus();

  if (status !== 'offline') return null;

  return (
    <div
      className="bg-amber-500 text-white text-center text-xs py-1.5 px-4 font-medium"
      role="alert"
    >
      <WifiOff size={12} className="inline-block mr-1.5 -mt-0.5" aria-hidden="true" />
      You're offline -- changes will sync when connected
    </div>
  );
}

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-forest-600 border-b border-forest-700 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2" aria-label="DWD Collective home">
            <img
              src="/images/logo.png"
              alt="DWD Collective"
              className="w-10 h-10 object-contain"
              width="40"
              height="40"
              loading="eager"
            />
            <span className="font-semibold text-lg text-blush-100">DWD Collective</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Sync Status */}
            <SyncIndicator />

            {/* Desktop Nav - only show on large screens, iPad uses bottom nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(path));
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blush-200 text-forest-600'
                        : 'text-blush-200 hover:bg-forest-500'
                    }`}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
      <OfflineBanner />
    </header>
  );
}

export function MobileNav() {
  const location = useLocation();

  // Check which nav item is active based on current path
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/schedule') {
      return location.pathname.startsWith('/schedule') ||
             location.pathname.startsWith('/class') ||
             location.pathname.startsWith('/event') ||
             location.pathname.startsWith('/plan');
    }
    if (path === '/competitions') {
      return location.pathname.startsWith('/competitions') ||
             location.pathname.startsWith('/dance/');
    }
    if (path === '/me') {
      return location.pathname === '/me';
    }
    if (path === '/settings') {
      return location.pathname.startsWith('/settings') ||
             location.pathname.startsWith('/students') ||
             location.pathname.startsWith('/library') ||
             location.pathname.startsWith('/formations');
    }
    return location.pathname === path;
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-forest-600 border-t border-forest-500 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-1.5 py-1 rounded-lg transition-colors active:bg-forest-500 ${
                active
                  ? 'text-blush-200'
                  : 'text-blush-300/60'
              }`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} aria-hidden="true" />
              <span className="text-xs font-medium" aria-hidden="true">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
