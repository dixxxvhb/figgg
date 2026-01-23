import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Settings,
  FileText,
  Users,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Trophy,
  Music,
  Grid3X3,
  BookOpen
} from 'lucide-react';
import { useSyncStatus } from '../../contexts/SyncContext';

// Determine which section we're in based on path
function getActiveSection(pathname: string): 'home' | 'teaching' | 'competition' | 'choreography' {
  if (pathname === '/') return 'home';
  if (
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/class') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/plan') ||
    pathname.startsWith('/event')
  ) {
    return 'teaching';
  }
  if (
    pathname.startsWith('/competitions') ||
    pathname.startsWith('/dances') ||
    pathname.startsWith('/dance/') ||
    pathname.startsWith('/competition/')
  ) {
    return 'competition';
  }
  if (
    pathname.startsWith('/formations') ||
    pathname.startsWith('/library')
  ) {
    return 'choreography';
  }
  return 'home';
}

// Navigation items for each section
const teachingNav = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/students', icon: Users, label: 'Students' },
  { path: '/plan', icon: FileText, label: 'Plan' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const competitionNav = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/competitions', icon: Trophy, label: 'Comps' },
  { path: '/dances', icon: Music, label: 'Dances' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const choreographyNav = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/formations', icon: Grid3X3, label: 'Formations' },
  { path: '/library', icon: BookOpen, label: 'Library' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const homeNav = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/competitions', icon: Trophy, label: 'Comps' },
  { path: '/formations', icon: Grid3X3, label: 'Formations' },
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

// Section indicator pill
function SectionIndicator({ section }: { section: 'home' | 'teaching' | 'competition' | 'choreography' }) {
  if (section === 'home') return null;
  
  const config = {
    teaching: { label: 'Teaching', bg: 'bg-forest-100', text: 'text-forest-700', icon: Calendar },
    competition: { label: 'Competition', bg: 'bg-rose-100', text: 'text-rose-700', icon: Trophy },
    choreography: { label: 'Choreography', bg: 'bg-purple-100', text: 'text-purple-700', icon: Grid3X3 },
  };

  const { label, bg, text, icon: Icon } = config[section];

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

export function Header() {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);

  // Get nav items based on active section
  const getNavItems = () => {
    switch (activeSection) {
      case 'teaching': return teachingNav;
      case 'competition': return competitionNav;
      case 'choreography': return choreographyNav;
      default: return homeNav;
    }
  };

  const navItems = getNavItems();

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
            
            {/* Section Indicator */}
            <SectionIndicator section={activeSection} />

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path || 
                  (path !== '/' && location.pathname.startsWith(path));
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
  const activeSection = getActiveSection(location.pathname);

  // Get nav items based on active section
  const getNavItems = () => {
    switch (activeSection) {
      case 'teaching': return teachingNav;
      case 'competition': return competitionNav;
      case 'choreography': return choreographyNav;
      default: return homeNav;
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-forest-600 border-t border-forest-500 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[48px] px-2 py-1 rounded-lg transition-colors active:bg-forest-500 ${
                isActive
                  ? 'text-blush-200'
                  : 'text-blush-300/60'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
