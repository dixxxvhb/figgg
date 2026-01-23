import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Library, Settings, FileText, Star, Play, Grid3X3, Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { useAppData } from '../../hooks/useAppData';
import { useCurrentClass } from '../../hooks/useCurrentClass';
import { useSyncStatus } from '../../contexts/SyncContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/plan', icon: FileText, label: 'Plan' },
  { path: '/dances', icon: Star, label: 'Dances' },
  { path: '/library', icon: Library, label: 'Library' },
  { path: '/settings', icon: Settings, label: 'Settings' },
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
    <div className={`p-1.5 ${color}`} title={title}>
      <Icon size={16} />
    </div>
  );
}

export function Header() {
  const location = useLocation();
  const { data } = useAppData();
  const classInfo = useCurrentClass(data.classes);

  // Show quick jump if there's a current or upcoming class and we're not already on class pages
  const showQuickJump = classInfo.class &&
    (classInfo.status === 'during' || classInfo.status === 'before') &&
    !location.pathname.includes('/class/') &&
    !location.pathname.includes('/notes');

  return (
    <header className="bg-forest-600 border-b border-forest-700 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="DWD Collective"
              className="w-10 h-10 object-contain"
            />
            <span className="font-semibold text-lg text-blush-100">DWD Collective</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Sync Status */}
            <SyncIndicator />
            {/* Formation Builder Button */}
            <Link
              to="/formations"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                location.pathname.startsWith('/formations')
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <Grid3X3 size={14} />
              <span className="hidden sm:inline">Formations</span>
            </Link>

            {/* Quick Jump to Current Class */}
            {showQuickJump && classInfo.class && (
              <Link
                to={`/class/${classInfo.class.id}/notes`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blush-200 text-forest-700 rounded-full text-sm font-medium hover:bg-blush-100 transition-colors"
              >
                <Play size={14} />
                <span className="hidden sm:inline">
                  {classInfo.status === 'during' ? 'Live' : 'Start'}
                </span>
                <span className="max-w-[100px] truncate">
                  {classInfo.class.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </Link>
            )}

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blush-200 text-forest-600'
                        : 'text-blush-200 hover:bg-forest-500'
                    }`}
                    title={label}
                  >
                    <Icon size={20} />
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-forest-600 border-t border-forest-500 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-blush-200'
                  : 'text-blush-300/60'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
