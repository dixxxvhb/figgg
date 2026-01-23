import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Download, Upload, LogOut, Check, Calendar, Sparkles, RefreshCw, AlertCircle, Cloud, BookOpen, Trophy, ClipboardList } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { exportData, importData, logout, updateCalendarEvents, updateSettings, syncFromCloud, pushToCloud } from '../services/storage';
import { fetchCalendarEvents } from '../services/calendar';
import { Button } from '../components/common/Button';

export function Settings() {
  const { data, refreshData, updateStudio } = useAppData();
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [editingStudio, setEditingStudio] = useState<string | null>(null);
  const [studioAddress, setStudioAddress] = useState('');
  const [calendarUrl, setCalendarUrl] = useState(data.settings?.calendarUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const handleSyncCalendar = async () => {
    if (!calendarUrl.trim()) {
      setSyncError('Please enter a calendar URL');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const events = await fetchCalendarEvents(calendarUrl.trim());
      if (events.length === 0) {
        setSyncError('No events found. Check the URL is correct.');
      } else {
        updateCalendarEvents(events);
        updateSettings({ calendarUrl: calendarUrl.trim() });
        refreshData();
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (error) {
      setSyncError('Failed to fetch calendar. Check the URL and try again.');
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

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-forest-700 mb-6">Settings</h1>

      {/* Quick Links */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Quick Links</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/library"
            className="flex flex-col items-center gap-2 bg-white rounded-xl border border-blush-200 p-4 shadow-sm hover:border-forest-300 transition-colors"
          >
            <BookOpen size={24} className="text-forest-600" />
            <div className="text-center">
              <div className="font-medium text-forest-700 text-sm">Glossary</div>
            </div>
          </Link>
          <Link
            to="/library?tab=competitions"
            className="flex flex-col items-center gap-2 bg-white rounded-xl border border-blush-200 p-4 shadow-sm hover:border-forest-300 transition-colors"
          >
            <Trophy size={24} className="text-forest-600" />
            <div className="text-center">
              <div className="font-medium text-forest-700 text-sm">Comps</div>
            </div>
          </Link>
          <Link
            to="/dances"
            className="flex flex-col items-center gap-2 bg-white rounded-xl border border-blush-200 p-4 shadow-sm hover:border-forest-300 transition-colors"
          >
            <ClipboardList size={24} className="text-forest-600" />
            <div className="text-center">
              <div className="font-medium text-forest-700 text-sm">Checklists</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Cloud Sync */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Cloud Sync</h2>
        <div className="bg-white rounded-xl border border-blush-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={18} className="text-blue-600" />
            <span className="font-medium text-forest-700">Auto-Sync Enabled</span>
          </div>
          <p className="text-sm text-forest-400 mb-3">
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

          <p className="text-xs text-forest-400 mt-3">
            Data syncs automatically when you make changes. Use "Sync Now" to force a refresh.
          </p>
        </div>
      </section>

      {/* Calendar Sync */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Calendar</h2>
        <div className="bg-white rounded-xl border border-blush-200 p-4 shadow-sm">
          {data.calendarEvents && data.calendarEvents.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-green-600" />
                <span className="font-medium text-forest-700">Calendar Connected</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {data.calendarEvents.length} events
                </span>
              </div>
              <p className="text-sm text-forest-400 mb-3">
                Your weekend schedule is synced. Tap Sync to refresh.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={18} className="text-amber-500" />
                <span className="font-medium text-forest-700">No Calendar Connected</span>
              </div>
              <p className="text-sm text-forest-400 mb-3">
                Enter your Band or iCal URL to sync weekend events.
              </p>
            </>
          )}

          <div className="space-y-3">
            <input
              type="url"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="Paste calendar URL (ICS format)..."
              className="w-full px-3 py-2 text-sm border border-blush-200 rounded-lg bg-blush-50 focus:outline-none focus:ring-2 focus:ring-forest-500"
            />

            <Button
              onClick={handleSyncCalendar}
              disabled={isSyncing}
              className="w-full"
            >
              <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>

            {syncError && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {syncError}
              </div>
            )}

            {syncSuccess && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                Calendar synced successfully!
              </div>
            )}
          </div>

          <p className="text-xs text-forest-400 mt-3">
            Use your Band calendar ICS export URL or any iCal feed URL.
          </p>
        </div>
      </section>

      {/* Studios */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Studios</h2>
        <div className="space-y-3">
          {data.studios.map(studio => (
            <div
              key={studio.id}
              className="bg-white rounded-xl border border-blush-200 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5"
                  style={{ backgroundColor: studio.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-forest-700">{studio.name}</div>
                  <div className="text-sm text-forest-400">{studio.shortName}</div>

                  {editingStudio === studio.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={studioAddress}
                        onChange={(e) => setStudioAddress(e.target.value)}
                        placeholder="Enter studio address..."
                        className="flex-1 px-3 py-2 text-sm border border-blush-200 rounded-lg bg-blush-50"
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
                      className="mt-2 text-sm text-forest-500 flex items-center gap-1 hover:text-forest-600"
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
        <p className="text-xs text-forest-400 mt-2">
          Add studio addresses to enable location-based class detection
        </p>
      </section>

      {/* Data Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Data</h2>
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
            />
            <div className="flex items-center gap-3 px-4 py-2 bg-blush-100 text-forest-700 hover:bg-blush-200 rounded-lg cursor-pointer transition-colors border border-blush-200">
              <Upload size={18} />
              Import Backup
            </div>
          </label>

          {showImportSuccess && (
            <div className="bg-forest-100 text-forest-700 px-4 py-2 rounded-lg text-sm">
              Data imported successfully!
            </div>
          )}
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Account</h2>
        <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut size={18} className="mr-3" />
          Log Out
        </Button>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold text-forest-700 mb-4">Stats</h2>
        <div className="bg-white rounded-xl p-4 space-y-2 text-sm border border-blush-200 shadow-sm">
          <div className="flex justify-between">
            <span className="text-forest-400">Total Classes</span>
            <span className="font-medium text-forest-700">{data.classes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400">Studios</span>
            <span className="font-medium text-forest-700">{data.studios.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400">Competition Dances</span>
            <span className="font-medium text-forest-700">{data.competitionDances?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400">Competitions</span>
            <span className="font-medium text-forest-700">{data.competitions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400">Week Notes</span>
            <span className="font-medium text-forest-700">{data.weekNotes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-400">Calendar Events</span>
            <span className="font-medium text-forest-700">{data.calendarEvents?.length || 0}</span>
          </div>
        </div>
      </section>

      {/* App Version */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-forest-400">
          <Sparkles size={12} />
          DWD Collective v1.0
        </div>
      </div>
    </div>
  );
}
