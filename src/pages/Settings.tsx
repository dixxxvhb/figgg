import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Download, Upload, Check, Calendar, Sparkles, RefreshCw, AlertCircle, Cloud, BookOpen, Trophy, ClipboardList, Sun, Moon, Type, Users, Grid3X3, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { exportData, importData, updateCalendarEvents, updateSettings, syncFromCloud, pushToCloud } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { Button } from '../components/common/Button';

export function Settings() {
  const { data, refreshData, updateStudio } = useAppData();
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

  // Apply font size to document
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    } catch {
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
        } catch {
          // Individual URL failure — continue with others
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
    } catch {
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
    link.download = `dwd-collective-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="page-w px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blush-200 dark:hover:bg-blush-700 transition-colors"
        >
          <ArrowLeft size={20} className="text-forest-600 dark:text-white" />
        </Link>
        <h1 className="text-2xl font-bold text-forest-700 dark:text-white">More</h1>
      </div>

      {/* Navigation Links */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-blush-500 dark:text-blush-400 uppercase tracking-wider mb-2 px-1">Teaching Tools</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 shadow-sm overflow-hidden">
          <Link
            to="/students"
            className="flex items-center justify-between p-4 border-b border-blush-100 dark:border-blush-700 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-forest-100 dark:bg-forest-900/50 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-forest-600 dark:text-forest-400" />
              </div>
              <div>
                <div className="font-medium text-forest-700 dark:text-white">Students</div>
                <div className="text-sm text-forest-400 dark:text-blush-400">{(data.students || []).length} enrolled</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-400" />
          </Link>

          <Link
            to="/formations"
            className="flex items-center justify-between p-4 border-b border-blush-100 dark:border-blush-700 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center">
                <Grid3X3 size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="font-medium text-forest-700 dark:text-white">Formations</div>
                <div className="text-sm text-forest-400 dark:text-blush-400">Stage layouts</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-400" />
          </Link>

          <Link
            to="/library"
            className="flex items-center justify-between p-4 hover:bg-blush-50 dark:hover:bg-blush-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-forest-700 dark:text-white">Library</div>
                <div className="text-sm text-forest-400 dark:text-blush-400">Glossary & exercises</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-forest-400" />
          </Link>
        </div>
      </section>

      {/* Display Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4 dark:text-white">Display</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm space-y-4">
          {/* Font Size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type size={18} className="text-forest-600 dark:text-forest-400" />
              <span className="font-medium text-forest-700 dark:text-white">Text Size</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleFontSizeChange('normal')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  fontSize === 'normal'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 text-forest-600 dark:bg-blush-700 dark:text-blush-300'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => handleFontSizeChange('large')}
                className={`px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                  fontSize === 'large'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 text-forest-600 dark:bg-blush-700 dark:text-blush-300'
                }`}
              >
                Large
              </button>
              <button
                onClick={() => handleFontSizeChange('extra-large')}
                className={`px-3 py-2 rounded-lg text-lg font-medium transition-colors ${
                  fontSize === 'extra-large'
                    ? 'bg-forest-600 text-white'
                    : 'bg-forest-100 text-forest-600 dark:bg-blush-700 dark:text-blush-300'
                }`}
              >
                Extra Large
              </button>
            </div>
          </div>

          {/* Dark Mode */}
          <div className="pt-2 border-t border-gray-100 dark:border-blush-700">
            <button
              onClick={handleDarkModeToggle}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-forest-50 dark:hover:bg-blush-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {darkMode ? (
                  <Moon size={20} className="text-blush-500" />
                ) : (
                  <Sun size={20} className="text-amber-500" />
                )}
                <span className="font-medium text-forest-700 dark:text-white">
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                darkMode ? 'bg-blush-500' : 'bg-blush-300 dark:bg-blush-600'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Cloud Sync */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 dark:text-white mb-4">Cloud Sync</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={18} className="text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-forest-700 dark:text-white">Auto-Sync Enabled</span>
          </div>
          <p className="text-sm text-forest-400 dark:text-blush-400 mb-3">
            Your data syncs automatically across all your devices (iPhone, iPad, computer).
          </p>

          <Button
            onClick={handleCloudSync}
            disabled={cloudSyncing}
            className="w-full"
          >
            <RefreshCw size={16} className={`mr-2 ${cloudSyncing ? 'animate-spin' : ''}`} />
            {cloudSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          {cloudStatus === 'success' && (
            <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg mt-3">
              Cloud sync complete!
            </div>
          )}

          {cloudStatus === 'error' && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">
              Sync failed. Check your connection and try again.
            </div>
          )}

          <p className="text-xs text-forest-400 dark:text-blush-500 mt-3">
            Data syncs automatically when you make changes. Use "Sync Now" to force a refresh.
          </p>
        </div>
      </section>

      {/* Calendar Sync */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 dark:text-white mb-4">Calendar</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm">
          {data.calendarEvents && data.calendarEvents.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-green-600 dark:text-green-400" />
                <span className="font-medium text-forest-700 dark:text-white">Calendar Connected</span>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  {data.calendarEvents.length} events
                </span>
              </div>
              <p className="text-sm text-forest-400 dark:text-blush-400 mb-3">
                Your weekend schedule is synced. Tap Sync to refresh.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} className="text-amber-500" />
                <span className="font-medium text-forest-700 dark:text-white">No Calendar Connected</span>
              </div>
              <p className="text-sm text-forest-400 dark:text-blush-400 mb-3">
                Enter your Band or iCal URL to sync weekend events.
              </p>
            </>
          )}

          {/* Saved calendar URLs */}
          {calendarUrls.length > 0 && (
            <div className="space-y-2 mb-3">
              {calendarUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-blush-50 dark:bg-blush-700 rounded-lg px-3 py-2">
                  <Calendar size={14} className="text-forest-500 dark:text-forest-400 flex-shrink-0" />
                  <span className="text-xs text-forest-600 dark:text-blush-300 truncate flex-1">{url.replace(/^https?:\/\//, '').slice(0, 40)}...</span>
                  <button onClick={() => handleRemoveCalendar(url)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={newCalendarUrl}
                onChange={(e) => setNewCalendarUrl(e.target.value)}
                placeholder="Paste calendar URL (ICS format)..."
                aria-label="Calendar URL"
                className="flex-1 px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-blush-50 dark:bg-blush-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-forest-500"
              />
              <Button size="sm" onClick={handleAddCalendar}>Add</Button>
            </div>

            <Button
              onClick={handleSyncCalendar}
              disabled={isSyncing}
              className="w-full"
            >
              <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync All Calendars'}
            </Button>

            {syncError && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                {syncError}
              </div>
            )}

            {syncSuccess && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                Calendar synced successfully!
              </div>
            )}
          </div>

          <p className="text-xs text-forest-400 dark:text-blush-500 mt-3">
            Add multiple calendar URLs. They auto-sync every 15 minutes and when the app opens.
          </p>
        </div>
      </section>

      {/* Studios */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 dark:text-white mb-4">Studios</h2>
        <div className="space-y-3">
          {data.studios.map(studio => (
            <div
              key={studio.id}
              className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5"
                  style={{ backgroundColor: studio.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-forest-700 dark:text-white">{studio.name}</div>
                  <div className="text-sm text-forest-400 dark:text-blush-400">{studio.shortName}</div>

                  {editingStudio === studio.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={studioAddress}
                        onChange={(e) => setStudioAddress(e.target.value)}
                        placeholder="Enter studio address..."
                        aria-label="Studio address"
                        className="flex-1 px-3 py-2 text-sm border border-blush-200 dark:border-blush-600 rounded-lg bg-blush-50 dark:bg-blush-700 dark:text-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStudio(studio.id, { address: studioAddress });
                          setEditingStudio(null);
                        }}
                      >
                        <Check size={16} />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingStudio(studio.id);
                        setStudioAddress(studio.address);
                      }}
                      className="mt-2 text-sm text-forest-500 dark:text-forest-400 flex items-center gap-1 hover:text-forest-600"
                    >
                      <MapPin size={14} />
                      {studio.address || 'Add address for location detection'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-forest-400 dark:text-blush-500 mt-2">
          Add studio addresses to enable location-based class detection
        </p>
      </section>

      {/* Data Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 dark:text-white mb-4">Data</h2>
        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-start" onClick={handleExport}>
            <Download size={18} className="mr-3" />
            Export Backup
          </Button>

          <label className="block">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              aria-label="Import backup file"
            />
            <div className="flex items-center gap-3 px-4 py-2 bg-blush-100 dark:bg-blush-700 text-forest-700 dark:text-white hover:bg-blush-200 dark:hover:bg-blush-600 rounded-lg cursor-pointer transition-colors border border-blush-200 dark:border-blush-600">
              <Upload size={18} />
              Import Backup
            </div>
          </label>

          {showImportSuccess && (
            <div className="bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-forest-200 px-4 py-2 rounded-lg text-sm">
              Data imported successfully!
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold text-forest-700 dark:text-white mb-4">Stats</h2>
        <div className="bg-white dark:bg-blush-800 rounded-xl p-4 space-y-2 text-sm border border-blush-200 dark:border-blush-700 shadow-sm">
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Total Classes</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.classes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Studios</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.studios.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Competition Dances</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.competitionDances?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Competitions</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.competitions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Week Notes</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.weekNotes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400 dark:text-blush-400">Calendar Events</span>
            <span className="font-medium text-forest-700 dark:text-white">{data.calendarEvents?.length || 0}</span>
          </div>
        </div>
      </section>

      {/* App Version */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-forest-400 dark:text-blush-500">
          <Sparkles size={12} />
          DWD Collective v1.0
        </div>
      </div>
    </div>
  );
}
