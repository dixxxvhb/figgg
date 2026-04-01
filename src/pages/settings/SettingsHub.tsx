import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette, LayoutDashboard, Heart, Sparkles,
  Cloud, Database, Wrench, ChevronRight, ChevronDown, Users, BookOpen, Rocket, CalendarCheck,
} from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { themes } from '../../styles/themes';
import { DEFAULT_AI_CONFIG, DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS } from '../../types';

interface SettingRow {
  to: string;
  icon: typeof Palette;
  label: string;
  subtitle: string;
  color: string;
}

function SettingCard({ row }: { row: SettingRow }) {
  return (
    <Link to={row.to} className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] transition-colors">
      <div
        className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${row.color} 15%, transparent)` }}
      >
        <row.icon size={20} style={{ color: row.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="type-body font-medium text-[var(--text-primary)]">{row.label}</p>
        <p className="type-caption text-[var(--text-muted)] truncate">{row.subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-[var(--text-tertiary)] flex-shrink-0" />
    </Link>
  );
}

export function SettingsHub() {
  const { data } = useAppData();
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const settings = data.settings || {};
  const aiConfig = settings.aiConfig || DEFAULT_AI_CONFIG;
  const medConfig = settings.medConfig || DEFAULT_MED_CONFIG;

  // Build live subtitles
  const themeName = themes.find(t => t.id === settings.themeId)?.name || 'Ink & Gold';
  const darkLabel = settings.darkMode ? 'Dark' : 'Light';
  const fontLabel = settings.fontSize === 'extra-large' ? 'XL text' : settings.fontSize === 'large' ? 'Large text' : 'Normal text';

  const hiddenCount = (settings.hiddenWidgets || []).length;
  const nudgeLabel = settings.nudgesEnabled === false ? 'Nudges off' : `Nudges ${settings.nudgeSensitivity || 'balanced'}`;

  const medLabel = `${medConfig.medType || 'IR'}, ${medConfig.maxDoses || 2} doses`;
  const wellnessCount = (settings.wellnessItems || DEFAULT_WELLNESS_ITEMS).filter(w => w.enabled).length;

  const toneLabel = (aiConfig.tone || 'direct').charAt(0).toUpperCase() + (aiConfig.tone || 'direct').slice(1);
  const checkInLabel = aiConfig.morningCheckInEnabled !== false ? 'Check-ins on' : 'Check-ins off';

  const syncLabel = user ? `Signed in as ${user.email}` : 'Not signed in';
  const calCount = (settings.calendarUrls || []).length;

  const classCount = (data.classes || []).length;
  const noteCount = Object.keys(data.weekNotes || {}).length;

  const appRows: SettingRow[] = [
    { to: '/settings/display', icon: Palette, label: 'Display', subtitle: `${themeName}, ${darkLabel}, ${fontLabel}`, color: 'var(--accent-primary)' },
    { to: '/settings/dashboard', icon: LayoutDashboard, label: 'Dashboard', subtitle: `${hiddenCount > 0 ? `${hiddenCount} hidden` : 'All visible'}, ${nudgeLabel}`, color: '#7c3aed' },
  ];

  const youRows: SettingRow[] = [
    { to: '/settings/wellness', icon: Heart, label: 'Wellness', subtitle: `${medLabel}, ${wellnessCount} items`, color: '#ec4899' },
    { to: '/settings/ai', icon: Sparkles, label: 'AI Assistant', subtitle: `${toneLabel}, ${checkInLabel}`, color: '#f59e0b' },
  ];

  const studentCount = (data.students || []).length;

  const teachingRows: SettingRow[] = [
    { to: '/settings/students', icon: Users, label: 'Students', subtitle: `${studentCount} student${studentCount !== 1 ? 's' : ''}`, color: '#06b6d4' },
    { to: '/settings/classes', icon: CalendarCheck, label: 'Class Manager', subtitle: 'Cancel, sub, restore classes', color: '#ef4444' },
  ];

  const dataRows: SettingRow[] = [
    { to: '/settings/sync', icon: Cloud, label: 'Sync', subtitle: `${syncLabel}${calCount > 0 ? `, ${calCount} calendar${calCount !== 1 ? 's' : ''}` : ''}`, color: '#0ea5e9' },
    { to: '/settings/data', icon: Database, label: 'Data', subtitle: `${classCount} classes, ${noteCount} week notes`, color: '#64748b' },
  ];

  const advancedRows: SettingRow[] = [
    { to: '/settings/advanced', icon: Wrench, label: 'Advanced', subtitle: 'Migration, recovery, compression', color: '#6b7280' },
  ];

  const quickAccessRows: SettingRow[] = [
    { to: '/library', icon: BookOpen, label: 'Library', subtitle: 'Terminology, competitions, songs', color: '#8b5cf6' },
    { to: '/launch', icon: Rocket, label: 'Launch Plan', subtitle: 'DWD launch tracker', color: '#f97316' },
  ];

  return (
    <div className="page-container px-4 pb-24">
      <h1 className="type-display text-[var(--text-primary)] mb-6">Settings</h1>

      {/* Quick Access */}
      <section className="mb-5">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">Quick Access</h2>
        <div className="space-y-2">
          {quickAccessRows.map(r => <SettingCard key={r.to} row={r} />)}
        </div>
      </section>

      {/* App */}
      <section className="mb-5">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">App</h2>
        <div className="space-y-2">
          {appRows.map(r => <SettingCard key={r.to} row={r} />)}
        </div>
      </section>

      {/* You */}
      <section className="mb-5">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">You</h2>
        <div className="space-y-2">
          {youRows.map(r => <SettingCard key={r.to} row={r} />)}
        </div>
      </section>

      {/* Teaching */}
      <section className="mb-5">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">Teaching</h2>
        <div className="space-y-2">
          {teachingRows.map(r => <SettingCard key={r.to} row={r} />)}
        </div>
      </section>

      {/* Data & Sync */}
      <section className="mb-5">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">Data & Sync</h2>
        <div className="space-y-2">
          {dataRows.map(r => <SettingCard key={r.to} row={r} />)}
        </div>
      </section>

      {/* Advanced (collapsed by default) */}
      <section className="mb-5">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-1 mb-2 type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide"
        >
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
          Advanced
        </button>
        {showAdvanced && (
          <div className="space-y-2">
            {advancedRows.map(r => <SettingCard key={r.to} row={r} />)}
          </div>
        )}
      </section>

      <p className="type-caption text-[var(--text-tertiary)] text-center mt-8">Figgg v3.0</p>
    </div>
  );
}
