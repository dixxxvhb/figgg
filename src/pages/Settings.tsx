import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Download, Upload, Check, Calendar, Sparkles, RefreshCw, AlertCircle, Cloud,
  BookOpen, Sun, Moon, Type, Users, Grid3X3, ChevronRight, ArrowLeft, Music, Star,
  ChevronDown, ChevronUp, Palette, Pill, Heart, Plus, Trash2, GripVertical, Circle,
  Pencil, Droplets, Utensils, Footprints, Coffee, Brain, Smartphone, BedDouble, Zap, Bell, Bot,
  type LucideIcon,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { exportData, importData, updateCalendarEvents, updateSettings, syncFromCloud, pushToCloud } from '../services/storage';
import { DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS, DEFAULT_AI_CONFIG } from '../types';
import type { MedConfig, WellnessItemConfig, AIConfig } from '../types';
import { fetchCalendarEvents } from '../services/calendar';
import { Button } from '../components/common/Button';
import { themes } from '../styles/themes';
import { applyTheme } from '../styles/applyTheme';

export function Settings() {
  const { data, refreshData, updateStudio, updateClass } = useAppData();
  const [showRecitalSongs, setShowRecitalSongs] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [editingStudio, setEditingStudio] = useState<string | null>(null);
  const [studioAddress, setStudioAddress] = useState('');
  const [calendarUrls, setCalendarUrls] = useState<string[]>(() => {
    const urls: string[] = [];
    if (data.settings?.calendarUrl) urls.push(data.settings.calendarUrl);
    if (data.settings?.calendarUrls) {
      data.settings.calendarUrls.forEach((u: string) => {
        if (!urls.includes(u)) urls.push(u);
      });
    }
    return urls;
  });
  const [newCalendarUrl, setNewCalendarUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fontSize, setFontSize] = useState(data.settings?.fontSize || 'normal');
  const [darkMode, setDarkMode] = useState(data.settings?.darkMode || false);
  const [themeId, setThemeId] = useState(data.settings?.themeId || 'forest');
  const [medConfig, setMedConfig] = useState<MedConfig>(() => ({
    ...DEFAULT_MED_CONFIG,
    ...(data.settings?.medConfig || {}),
  }));

  const handleMedConfigChange = (patch: Partial<MedConfig>) => {
    const updated = { ...medConfig, ...patch };
    setMedConfig(updated);
    updateSettings({ ...data.settings, medConfig: updated });
    refreshData();
  };

  const [wellnessItems, setWellnessItems] = useState<WellnessItemConfig[]>(() =>
    data.settings?.wellnessItems || [...DEFAULT_WELLNESS_ITEMS]
  );
  const [showWellnessEditor, setShowWellnessEditor] = useState(false);
  const [editingWellnessId, setEditingWellnessId] = useState<string | null>(null);

  const saveWellnessItems = (items: WellnessItemConfig[]) => {
    setWellnessItems(items);
    updateSettings({ ...data.settings, wellnessItems: items });
    refreshData();
  };

  const handleToggleWellnessItem = (id: string) => {
    const updated = wellnessItems.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i);
    saveWellnessItems(updated);
  };

  const handleDeleteWellnessItem = (id: string) => {
    saveWellnessItems(wellnessItems.filter(i => i.id !== id));
  };

  const handleAddWellnessItem = (section: 'morning' | 'afternoon' | 'evening') => {
    const maxOrder = Math.max(...wellnessItems.filter(i => i.section === section).map(i => i.order), -1);
    const newItem: WellnessItemConfig = {
      id: `custom_${Date.now()}`,
      label: 'New item',
      icon: 'Circle',
      section,
      enabled: true,
      order: maxOrder + 1,
    };
    saveWellnessItems([...wellnessItems, newItem]);
    setEditingWellnessId(newItem.id);
  };

  const handleUpdateWellnessItem = (id: string, patch: Partial<WellnessItemConfig>) => {
    const updated = wellnessItems.map(i => i.id === id ? { ...i, ...patch } : i);
    saveWellnessItems(updated);
  };

  const handleResetWellness = () => {
    saveWellnessItems([...DEFAULT_WELLNESS_ITEMS]);
  };

  // AI config
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => ({
    ...DEFAULT_AI_CONFIG,
    ...(data.settings?.aiConfig || {}),
  }));

  const handleAiConfigChange = (patch: Partial<AIConfig>) => {
    const updated = { ...aiConfig, ...patch };
    setAiConfig(updated);
    updateSettings({ ...data.settings, aiConfig: updated });
    refreshData();
  };

  // Apply font size to document
  useEffect(() => {
    const root = document.documentElement;
    switch (fontSize) {
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'extra-large':
        root.style.fontSize = '20px';
        break;
      default:
        root.style.fontSize = '16px';
    }
  }, [fontSize]);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleFontSizeChange = (size: 'normal' | 'large' | 'extra-large') => {
    setFontSize(size);
    updateSettings({ ...data.settings, fontSize: size });
    refreshData();
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    updateSettings({ ...data.settings, darkMode: newDarkMode });
    applyTheme(themeId, newDarkMode);
    refreshData();
  };

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    applyTheme(id, document.documentElement.classList.contains('dark'));
    updateSettings({ ...data.settings, themeId: id });
    refreshData();
  };

  const handleCloudSync = async () => {
    setCloudSyncing(true);
    setCloudStatus('idle');
    try {
      // First push local data to cloud
      const pushResult = await pushToCloud();
      if (pushResult) {
        // Then pull latest from cloud
        await syncFromCloud();
        refreshData();
        setCloudStatus('success');
        setTimeout(() => setCloudStatus('idle'), 3000);
      } else {
        setCloudStatus('error');
      }
    } catch (e) {
      console.error('Cloud sync failed:', e);
      setCloudStatus('error');
    } finally {
      setCloudSyncing(false);
    }
  };

  const handleAddCalendar = () => {
    const url = newCalendarUrl.trim();
    if (!url) { setSyncError('Please enter a calendar URL'); return; }
    if (calendarUrls.includes(url)) { setSyncError('This URL is already added'); return; }
    const updated = [...calendarUrls, url];
    setCalendarUrls(updated);
    setNewCalendarUrl('');
    updateSettings({ ...data.settings, calendarUrl: updated[0], calendarUrls: updated });
    setSyncError(null);
  };

  const handleRemoveCalendar = (url: string) => {
    const updated = calendarUrls.filter(u => u !== url);
    setCalendarUrls(updated);
    updateSettings({ ...data.settings, calendarUrl: updated[0] || '', calendarUrls: updated });
  };

  const handleSyncCalendar = async () => {
    if (calendarUrls.length === 0) {
      setSyncError('Add a calendar URL first');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      let allEvents: Awaited<ReturnType<typeof fetchCalendarEvents>> = [];
      for (const url of calendarUrls) {
        try {
          const events = await fetchCalendarEvents(url);
          allEvents = allEvents.concat(events);
        } catch (e) {
          console.warn(`Calendar fetch failed for URL: ${url}`, e);
        }
      }
      if (allEvents.length === 0) {
        setSyncError('No events found. Check your URLs are correct.');
      } else {
        updateCalendarEvents(allEvents);
        refreshData();
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Calendar sync failed:', e);
      setSyncError('Calendar sync failed. Check connection and try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dixxx-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importData(content)) {
        refreshData();
        setShowImportSuccess(true);
        setTimeout(() => setShowImportSuccess(false), 3000);
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="page-w px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blush-200 dark:hover:bg-blush-700 transition-colors"
        >
          <ArrowLeft size={18} className="text-forest-600 dark:text-white" />
        </Link>
        <h1 className="text-xl font-bold text-forest-700 dark:text-white">More</h1>
      </div>

      {/* Teaching Tools */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Teaching Tools</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden">
          {([
            { to: '/students', icon: Users, iconBg: 'bg-forest-100 dark:bg-forest-900/50', iconColor: 'text-forest-600 dark:text-forest-400', label: 'Students', sub: `${(data.students || []).length} enrolled` },
            { to: '/formations', icon: Grid3X3, iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconColor: 'text-purple-600 dark:text-purple-400', label: 'Formations', sub: 'Stage layouts' },
            { to: '/library', icon: BookOpen, iconBg: 'bg-blue-100 dark:bg-blue-900/50', iconColor: 'text-blue-600 dark:text-blue-400', label: 'Library', sub: 'Glossary & exercises' },
          ] as const).map((item, i, arr) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-3 py-2.5 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors ${i < arr.length - 1 ? 'border-b border-blush-100 dark:border-blush-700' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 ${item.iconBg} rounded-lg flex items-center justify-center`}>
                  <item.icon size={15} className={item.iconColor} />
                </div>
                <div>
                  <div className="text-sm font-medium text-forest-700 dark:text-white">{item.label}</div>
                  <div className="text-xs text-forest-400 dark:text-blush-400">{item.sub}</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-forest-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recital Songs */}
      <section className="mb-5">
        <button
          onClick={() => setShowRecitalSongs(!showRecitalSongs)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
              <Music size={15} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-forest-700 dark:text-white">Recital Songs</div>
              <div className="text-xs text-forest-400 dark:text-blush-400">
                {data.classes.filter(c => c.recitalSong && c.isRecitalSong).length} recital • {data.classes.filter(c => c.recitalSong && !c.isRecitalSong).length} combos
              </div>
            </div>
          </div>
          {showRecitalSongs ? <ChevronUp size={16} className="text-forest-400" /> : <ChevronDown size={16} className="text-forest-400" />}
        </button>

        {showRecitalSongs && (
          <div className="mt-2 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden">
            <div className="divide-y divide-blush-100 dark:divide-blush-700">
              {data.classes
                .filter(c => c.recitalSong)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(cls => (
                  <div key={cls.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="font-medium text-forest-700 dark:text-white text-sm truncate">{cls.name}</div>
                      <div className="text-xs text-forest-400 dark:text-blush-400 truncate">{cls.recitalSong}</div>
                    </div>
                    <button
                      onClick={() => updateClass({ ...cls, isRecitalSong: !cls.isRecitalSong })}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        cls.isRecitalSong
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : 'bg-blush-100 dark:bg-blush-700 text-blush-600 dark:text-blush-300 border border-blush-300 dark:border-blush-600'
                      }`}
                    >
                      <Star size={10} className={cls.isRecitalSong ? 'fill-purple-500' : ''} />
                      {cls.isRecitalSong ? 'Recital' : 'Combo'}
                    </button>
                  </div>
                ))}
              {data.classes.filter(c => c.recitalSong).length === 0 && (
                <div className="p-4 text-center text-[var(--text-tertiary)]">
                  <Music size={24} className="mx-auto mb-2 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  <p className="text-sm">No songs assigned yet</p>
                  <p className="text-xs mt-0.5 text-[var(--text-tertiary)]">Add songs in each class's detail page</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Display */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Display</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3 shadow-sm space-y-3">
          {/* Theme */}
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-forest-600 dark:text-forest-400 flex-shrink-0" />
            <div className="flex gap-3 overflow-x-auto flex-1 pb-0.5">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all ${themeId === theme.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                >
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full border-2 ${themeId === theme.id ? 'border-forest-600 dark:border-white shadow-md' : 'border-blush-300 dark:border-blush-600'} ${theme.special === 'rainbow' && themeId === theme.id ? 'swatch-rainbow-spin' : ''}`}
                      style={theme.special === 'rainbow'
                        ? { background: 'conic-gradient(#f43f5e, #fb923c, #facc15, #4ade80, #60a5fa, #a78bfa, #f472b6, #f43f5e)' }
                        : { backgroundColor: theme.preview.primary }
                      }
                    />
                    {themeId === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check size={12} className={theme.special === 'rainbow' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-white drop-shadow-md'} />
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] font-medium leading-none text-center max-w-[40px] truncate transition-colors ${themeId === theme.id ? 'text-forest-600 dark:text-forest-400' : 'text-blush-400 dark:text-blush-500'}`}>
                    {theme.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size — inline row */}
          <div className="flex items-center gap-2 border-t border-blush-100 dark:border-blush-700 pt-3">
            <Type size={14} className="text-forest-600 dark:text-forest-400 flex-shrink-0" />
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              {([['normal', 'Aa', 'text-xs'], ['large', 'Aa', 'text-sm'], ['extra-large', 'Aa', 'text-base']] as const).map(([size, label, textClass]) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`px-2 py-1.5 rounded-lg ${textClass} font-medium transition-colors ${
                    fontSize === size ? 'bg-forest-600 text-white' : 'bg-forest-100 text-forest-600 dark:bg-blush-700 dark:text-blush-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode — tight row */}
          <div className="flex items-center justify-between border-t border-blush-100 dark:border-blush-700 pt-2">
            <button
              onClick={handleDarkModeToggle}
              role="switch"
              aria-checked={darkMode}
              className="w-full flex items-center justify-between py-1 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                {darkMode ? <Moon size={14} className="text-blush-500" /> : <Sun size={14} className="text-amber-500" />}
                <span className="text-sm font-medium text-forest-700 dark:text-white">Dark Mode</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${darkMode ? 'bg-blush-500' : 'bg-blush-300 dark:bg-blush-600'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Medications */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Medications</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3 shadow-sm space-y-3">
          {/* Med Type */}
          <div className="flex items-center gap-2">
            <Pill size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-sm font-medium text-forest-700 dark:text-white flex-1">Type</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['IR', 'XR'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleMedConfigChange({ medType: type })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    medConfig.medType === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-600 dark:bg-blush-700 dark:text-blush-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Dose Count */}
          <div className="flex items-center gap-2 border-t border-blush-100 dark:border-blush-700 pt-3">
            <span className="text-sm font-medium text-forest-700 dark:text-white flex-1 pl-6">Daily Doses</span>
            <div className="grid grid-cols-2 gap-1.5">
              {([2, 3] as const).map(count => (
                <button
                  key={count}
                  onClick={() => handleMedConfigChange({ maxDoses: count })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    medConfig.maxDoses === count
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-600 dark:bg-blush-700 dark:text-blush-300'
                  }`}
                >
                  {count}x
                </button>
              ))}
            </div>
          </div>

          {/* IR Timing */}
          {medConfig.medType === 'IR' && (
            <div className="border-t border-blush-100 dark:border-blush-700 pt-3 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-blush-400 dark:text-blush-500 pl-6">IR Timing</div>
              <TimingRow label="Peak" value={medConfig.irPeakHours} suffix="h" min={1} max={6} onChange={v => handleMedConfigChange({ irPeakHours: v })} />
              <TimingRow label="Duration" value={medConfig.irDurationHours} suffix="h" min={2} max={8} onChange={v => handleMedConfigChange({ irDurationHours: v })} />
              <TimingRow label="D2 window" value={medConfig.dose2WindowStart} suffix="h" min={2} max={8} onChange={v => handleMedConfigChange({ dose2WindowStart: v })} secondValue={medConfig.dose2WindowEnd} onSecondChange={v => handleMedConfigChange({ dose2WindowEnd: v })} secondMin={3} secondMax={10} />
              {medConfig.maxDoses === 3 && (
                <TimingRow label="D3 window" value={medConfig.dose3WindowStart} suffix="h" min={2} max={8} onChange={v => handleMedConfigChange({ dose3WindowStart: v })} secondValue={medConfig.dose3WindowEnd} onSecondChange={v => handleMedConfigChange({ dose3WindowEnd: v })} secondMin={3} secondMax={10} />
              )}
            </div>
          )}

          {/* XR Timing */}
          {medConfig.medType === 'XR' && (
            <div className="border-t border-blush-100 dark:border-blush-700 pt-3 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-blush-400 dark:text-blush-500 pl-6">XR Timing</div>
              <TimingRow label="Peak" value={medConfig.xrPeakHours} suffix="h" min={3} max={12} onChange={v => handleMedConfigChange({ xrPeakHours: v })} />
              <TimingRow label="Duration" value={medConfig.xrDurationHours} suffix="h" min={6} max={16} onChange={v => handleMedConfigChange({ xrDurationHours: v })} />
            </div>
          )}
        </div>
      </section>

      {/* Wellness Checklist */}
      <section className="mb-5">
        <button
          onClick={() => setShowWellnessEditor(!showWellnessEditor)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm hover:border-green-300 dark:hover:border-green-600 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
              <Heart size={15} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-forest-700 dark:text-white">Wellness Checklist</div>
              <div className="text-xs text-forest-400 dark:text-blush-400">
                {wellnessItems.filter(i => i.enabled).length} active items
              </div>
            </div>
          </div>
          {showWellnessEditor ? <ChevronUp size={16} className="text-forest-400" /> : <ChevronDown size={16} className="text-forest-400" />}
        </button>

        {showWellnessEditor && (
          <div className="mt-2 bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 overflow-hidden">
            {(['morning', 'afternoon', 'evening'] as const).map(section => {
              const sectionItems = wellnessItems
                .filter(i => i.section === section)
                .sort((a, b) => a.order - b.order);
              return (
                <div key={section}>
                  <div className="px-3 py-1.5 flex items-center justify-between bg-blush-50 dark:bg-blush-850 border-b border-blush-100 dark:border-blush-700">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blush-400 dark:text-blush-500">
                      {section}
                    </span>
                    <button
                      onClick={() => handleAddWellnessItem(section)}
                      className="text-xs text-forest-600 dark:text-forest-400 flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {sectionItems.map(item => (
                    <div key={item.id} className="px-3 py-2 flex items-center gap-2 border-b border-blush-50 dark:border-blush-700/50">
                      {editingWellnessId === item.id ? (
                        <WellnessItemEditor
                          item={item}
                          onSave={(patch) => { handleUpdateWellnessItem(item.id, patch); setEditingWellnessId(null); }}
                          onCancel={() => setEditingWellnessId(null)}
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleWellnessItem(item.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                              item.enabled
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-blush-300 dark:border-blush-600'
                            }`}
                          >
                            {item.enabled && <Check size={12} />}
                          </button>
                          <span className={`text-sm flex-1 ${item.enabled ? 'text-forest-700 dark:text-white' : 'text-blush-400 dark:text-blush-500 line-through'}`}>
                            {item.label}
                          </span>
                          {item.conditions && Object.keys(item.conditions).length > 0 && (
                            <span className="text-[10px] text-blush-400 dark:text-blush-500 bg-blush-50 dark:bg-blush-700 px-1.5 py-0.5 rounded-full">
                              {item.conditions.onlyOnClassDays ? 'class days' :
                               item.conditions.onlyOnOffDays ? 'off days' :
                               item.conditions.requiresMedsTaken ? 'meds taken' : 'conditional'}
                            </span>
                          )}
                          <button onClick={() => setEditingWellnessId(item.id)} className="text-blush-400 hover:text-forest-600 dark:hover:text-white p-1">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteWellnessItem(item.id)} className="text-blush-400 hover:text-red-500 p-1">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="px-3 py-2 border-t border-blush-100 dark:border-blush-700">
              <button onClick={handleResetWellness} className="text-xs text-blush-400 dark:text-blush-500 hover:text-red-500">
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </section>

      {/* AI Assistant */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">AI Assistant</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3 shadow-sm space-y-3">
          {/* Morning check-in toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-forest-600 dark:text-forest-400" />
              <span className="text-sm font-medium text-forest-700 dark:text-white">Morning check-in</span>
            </div>
            <button
              onClick={() => handleAiConfigChange({ morningCheckInEnabled: !aiConfig.morningCheckInEnabled })}
              role="switch"
              aria-checked={aiConfig.morningCheckInEnabled}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors ${aiConfig.morningCheckInEnabled ? 'bg-forest-500' : 'bg-blush-300 dark:bg-blush-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${aiConfig.morningCheckInEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Afternoon check-in toggle + time */}
          <div className="flex items-center justify-between border-t border-blush-100 dark:border-blush-700 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-forest-700 dark:text-white pl-6">Afternoon check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={aiConfig.afternoonCheckInTime}
                onChange={e => handleAiConfigChange({ afternoonCheckInTime: e.target.value })}
                className="text-xs px-2 py-1 bg-blush-50 dark:bg-blush-700 border border-blush-200 dark:border-blush-600 rounded-lg text-forest-700 dark:text-white"
              >
                {['12:00', '13:00', '14:00', '15:00', '16:00'].map(t => (
                  <option key={t} value={t}>{t === '12:00' ? '12 PM' : t === '13:00' ? '1 PM' : t === '14:00' ? '2 PM' : t === '15:00' ? '3 PM' : '4 PM'}</option>
                ))}
              </select>
              <button
                onClick={() => handleAiConfigChange({ afternoonCheckInEnabled: !aiConfig.afternoonCheckInEnabled })}
                role="switch"
                aria-checked={aiConfig.afternoonCheckInEnabled}
                className={`w-10 h-6 rounded-full p-0.5 transition-colors ${aiConfig.afternoonCheckInEnabled ? 'bg-forest-500' : 'bg-blush-300 dark:bg-blush-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${aiConfig.afternoonCheckInEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Tone */}
          <div className="flex items-center gap-2 border-t border-blush-100 dark:border-blush-700 pt-3">
            <span className="text-sm font-medium text-forest-700 dark:text-white pl-6 flex-1">Tone</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['supportive', 'direct', 'minimal'] as const).map(tone => (
                <button
                  key={tone}
                  onClick={() => handleAiConfigChange({ tone })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    aiConfig.tone === tone
                      ? 'bg-forest-600 text-white'
                      : 'bg-forest-100 text-forest-600 dark:bg-blush-700 dark:text-blush-300'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-plan */}
          <div className="flex items-center justify-between border-t border-blush-100 dark:border-blush-700 pt-3">
            <span className="text-sm font-medium text-forest-700 dark:text-white pl-6">Auto day plan</span>
            <button
              onClick={() => handleAiConfigChange({ autoPlanEnabled: !aiConfig.autoPlanEnabled })}
              role="switch"
              aria-checked={aiConfig.autoPlanEnabled}
              className={`w-10 h-6 rounded-full p-0.5 transition-colors ${aiConfig.autoPlanEnabled ? 'bg-forest-500' : 'bg-blush-300 dark:bg-blush-600'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${aiConfig.autoPlanEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Sync */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Sync</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden">
          {/* Cloud Sync row */}
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-blush-100 dark:border-blush-700">
            <div className="flex items-center gap-2">
              <Cloud size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-forest-700 dark:text-white">Cloud Sync</span>
              <span className="text-xs text-forest-400 dark:text-blush-500">Auto</span>
            </div>
            <button
              onClick={handleCloudSync}
              disabled={cloudSyncing}
              className="text-xs font-medium text-forest-600 dark:text-forest-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 dark:bg-forest-900/30 hover:bg-forest-100 dark:hover:bg-forest-900/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={cloudSyncing ? 'animate-spin' : ''} />
              {cloudSyncing ? 'Syncing' : 'Sync'}
            </button>
          </div>
          {cloudStatus === 'success' && (
            <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1.5">Synced!</div>
          )}
          {cloudStatus === 'error' && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1.5">Sync failed — check connection</div>
          )}

          {/* Calendar row */}
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-blush-100 dark:border-blush-700">
            <div className="flex items-center gap-2">
              <Calendar size={14} className={data.calendarEvents?.length ? 'text-green-600 dark:text-green-400' : 'text-amber-500'} />
              <span className="text-sm font-medium text-forest-700 dark:text-white">Calendar</span>
              {data.calendarEvents && data.calendarEvents.length > 0 && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">{data.calendarEvents.length}</span>
              )}
            </div>
            <button
              onClick={handleSyncCalendar}
              disabled={isSyncing || calendarUrls.length === 0}
              className="text-xs font-medium text-forest-600 dark:text-forest-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 dark:bg-forest-900/30 hover:bg-forest-100 dark:hover:bg-forest-900/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing' : 'Sync'}
            </button>
          </div>

          {/* Calendar URLs */}
          <div className="px-3 py-2 space-y-1.5">
            {calendarUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="text-forest-500 dark:text-blush-400 truncate flex-1">{url.replace(/^https?:\/\//, '').slice(0, 40)}...</span>
                <button onClick={() => handleRemoveCalendar(url)} className="text-red-400 hover:text-red-600 flex-shrink-0">x</button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <input
                type="url"
                value={newCalendarUrl}
                onChange={(e) => setNewCalendarUrl(e.target.value)}
                placeholder="Add calendar URL..."
                aria-label="Calendar URL"
                className="flex-1 px-2 py-1.5 text-xs border border-blush-200 dark:border-blush-600 rounded-lg bg-blush-50 dark:bg-blush-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-500"
              />
              <Button size="sm" onClick={handleAddCalendar}>Add</Button>
            </div>
            {syncError && <div className="text-xs text-red-600">{syncError}</div>}
            {syncSuccess && <div className="text-xs text-green-600">Calendar synced!</div>}
          </div>
        </div>
      </section>

      {/* Studios */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Studios</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden divide-y divide-blush-100 dark:divide-blush-700">
          {data.studios.map(studio => (
            <div key={studio.id} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: studio.color }} />
                <span className="text-sm font-medium text-forest-700 dark:text-white flex-1">{studio.name}</span>
                <span className="text-xs text-forest-400 dark:text-blush-500">{studio.shortName}</span>
              </div>
              {editingStudio === studio.id ? (
                <div className="mt-1.5 flex gap-1.5 ml-5">
                  <input
                    type="text"
                    value={studioAddress}
                    onChange={(e) => setStudioAddress(e.target.value)}
                    placeholder="Studio address..."
                    aria-label="Studio address"
                    className="flex-1 px-2 py-1 text-xs border border-blush-200 dark:border-blush-600 rounded-lg bg-blush-50 dark:bg-blush-700 dark:text-white"
                  />
                  <button
                    onClick={() => { updateStudio(studio.id, { address: studioAddress }); setEditingStudio(null); }}
                    className="px-2 py-1 bg-forest-600 text-white rounded-lg text-xs"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingStudio(studio.id); setStudioAddress(studio.address); }}
                  className="ml-5 mt-0.5 text-xs text-forest-500 dark:text-forest-400 flex items-center gap-1 hover:text-forest-600"
                >
                  <MapPin size={11} />
                  {studio.address || 'Add address'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Data & Stats */}
      <section className="mb-5">
        <h2 className="text-xs font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-1.5 px-1">Data</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden">
          {/* Backup buttons */}
          <div className="flex gap-2 px-3 py-2.5 border-b border-blush-100 dark:border-blush-700">
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-forest-50 dark:bg-forest-900/30 text-forest-600 dark:text-forest-400 rounded-lg text-xs font-medium hover:bg-forest-100 dark:hover:bg-forest-900/50 transition-colors">
              <Download size={12} /> Export
            </button>
            <label className="flex-1">
              <input type="file" accept=".json" onChange={handleImport} className="hidden" aria-label="Import backup file" />
              <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blush-100 dark:bg-blush-700 text-forest-700 dark:text-white rounded-lg text-xs font-medium hover:bg-blush-200 dark:hover:bg-blush-600 cursor-pointer transition-colors">
                <Upload size={12} /> Import
              </div>
            </label>
          </div>
          {showImportSuccess && (
            <div className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-1.5">Imported!</div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-px bg-blush-100 dark:bg-blush-700">
            {[
              { label: 'Classes', value: data.classes.length },
              { label: 'Studios', value: data.studios.length },
              { label: 'Dances', value: data.competitionDances?.length || 0 },
              { label: 'Competitions', value: data.competitions.length },
              { label: 'Week Notes', value: data.weekNotes.length },
              { label: 'Events', value: data.calendarEvents?.length || 0 },
            ].map(stat => (
              <div key={stat.label} className="bg-white dark:bg-blush-800 px-2.5 py-2 text-center">
                <div className="text-base font-semibold text-forest-700 dark:text-white">{stat.value}</div>
                <div className="text-xs text-forest-400 dark:text-blush-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Version */}
      <div className="mt-4 text-center">
        <span className="text-xs text-forest-400 dark:text-blush-500 flex items-center justify-center gap-1">
          <Sparkles size={10} /> DIXXX v1.0
        </span>
      </div>
    </div>
  );
}

function TimingRow({
  label, value, suffix, min, max, onChange,
  secondValue, onSecondChange, secondMin, secondMax,
}: {
  label: string; value: number; suffix: string; min: number; max: number;
  onChange: (v: number) => void;
  secondValue?: number; onSecondChange?: (v: number) => void;
  secondMin?: number; secondMax?: number;
}) {
  const isRange = secondValue !== undefined && onSecondChange;
  return (
    <div className="flex items-center gap-2 pl-6">
      <span className="text-xs text-forest-600 dark:text-blush-300 w-16 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <button
          onClick={() => value > min && onChange(value - 0.5)}
          className="w-6 h-6 rounded-md bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 text-xs font-bold flex items-center justify-center"
        >-</button>
        <span className="text-sm font-medium text-forest-700 dark:text-white w-8 text-center">{value}{suffix}</span>
        <button
          onClick={() => value < max && onChange(value + 0.5)}
          className="w-6 h-6 rounded-md bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 text-xs font-bold flex items-center justify-center"
        >+</button>
      </div>
      {isRange && (
        <>
          <span className="text-xs text-blush-400">to</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => secondValue > (secondMin || min) && onSecondChange(secondValue - 0.5)}
              className="w-6 h-6 rounded-md bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 text-xs font-bold flex items-center justify-center"
            >-</button>
            <span className="text-sm font-medium text-forest-700 dark:text-white w-8 text-center">{secondValue}{suffix}</span>
            <button
              onClick={() => secondValue < (secondMax || max) && onSecondChange(secondValue + 0.5)}
              className="w-6 h-6 rounded-md bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300 text-xs font-bold flex items-center justify-center"
            >+</button>
          </div>
        </>
      )}
    </div>
  );
}

// Inline icon picker options
const WELLNESS_ICONS = [
  'Droplets', 'Coffee', 'Utensils', 'Sun', 'Moon', 'BookOpen', 'Brain',
  'Footprints', 'Smartphone', 'Sparkles', 'BedDouble', 'Pill', 'Zap', 'Bell', 'Circle',
] as const;

const SETTINGS_ICON_MAP: Record<string, LucideIcon> = {
  Droplets, Coffee, Utensils, Sun, Moon, BookOpen, Brain,
  Footprints, Smartphone, Sparkles, BedDouble, Pill, Zap, Bell, Circle,
};

function WellnessItemEditor({
  item, onSave, onCancel,
}: {
  item: WellnessItemConfig;
  onSave: (patch: Partial<WellnessItemConfig>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [icon, setIcon] = useState(item.icon);
  const [onlyOnClassDays, setOnlyOnClassDays] = useState(item.conditions?.onlyOnClassDays || false);
  const [onlyOnOffDays, setOnlyOnOffDays] = useState(item.conditions?.onlyOnOffDays || false);
  const [requiresMedsTaken, setRequiresMedsTaken] = useState(item.conditions?.requiresMedsTaken || false);

  const handleSave = () => {
    const conditions: WellnessItemConfig['conditions'] = {};
    if (onlyOnClassDays) conditions.onlyOnClassDays = true;
    if (onlyOnOffDays) conditions.onlyOnOffDays = true;
    if (requiresMedsTaken) conditions.requiresMedsTaken = true;
    onSave({
      label: label.trim() || 'Untitled',
      icon,
      conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
    });
  };

  return (
    <div className="w-full space-y-2">
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-blush-50 dark:bg-blush-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-500"
        autoFocus
      />
      {/* Icon picker */}
      <div className="flex flex-wrap gap-1">
        {WELLNESS_ICONS.map(name => {
          const IconComp = SETTINGS_ICON_MAP[name] || Circle;
          return (
            <button
              key={name}
              onClick={() => setIcon(name)}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                icon === name
                  ? 'bg-forest-600 text-white'
                  : 'bg-blush-100 dark:bg-blush-700 text-forest-600 dark:text-blush-300'
              }`}
              title={name}
            >
              <IconComp size={14} />
            </button>
          );
        })}
      </div>
      {/* Conditions */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: 'Class days', value: onlyOnClassDays, set: setOnlyOnClassDays },
          { label: 'Off days', value: onlyOnOffDays, set: setOnlyOnOffDays },
          { label: 'Meds taken', value: requiresMedsTaken, set: setRequiresMedsTaken },
        ]).map(cond => (
          <button
            key={cond.label}
            onClick={() => cond.set(!cond.value)}
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              cond.value
                ? 'bg-forest-100 dark:bg-forest-900/30 border-forest-300 dark:border-forest-700 text-forest-700 dark:text-forest-300'
                : 'border-blush-200 dark:border-blush-600 text-blush-400 dark:text-blush-500'
            }`}
          >
            {cond.label}
          </button>
        ))}
      </div>
      {/* Save/Cancel */}
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1 bg-forest-600 text-white rounded-lg text-xs font-medium">Save</button>
        <button onClick={onCancel} className="px-3 py-1 bg-blush-100 dark:bg-blush-700 text-forest-700 dark:text-white rounded-lg text-xs font-medium">Cancel</button>
      </div>
    </div>
  );
}
