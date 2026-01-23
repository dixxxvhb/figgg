import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, Library, Settings, FileText } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/plan', icon: FileText, label: 'Plan' },
  { path: '/library', icon: Library, label: 'Library' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="font-semibold text-lg text-gray-900">
            Dance Notes
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-violet-100 text-violet-700'
                      : 'text-gray-500 hover:bg-gray-100'
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
    </header>
  );
}

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-violet-700'
                  : 'text-gray-500'
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
