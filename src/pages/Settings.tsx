import React, { useState } from 'react';
import { MapPin, Download, Upload, LogOut, Check, Calendar, RefreshCw, Info } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { exportData, importData, logout, updateSettings, updateCalendarEvents } from '../services/storage';
import { fetchCalendarEvents, getAppleCalendarInstructions } from '../services/calendar';
import { Button } from '../components/common/Button';

export function Settings() {
  const { data, refreshData } = useAppData();
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [editingStudio, setEditingStudio] = useState<string | null>(null);
  const [studioAddress, setStudioAddress] = useState('');
  const [calendarUrl, setCalendarUrl] = useState(data.settings?.calendarUrl || '');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [calendarSuccess, setCalendarSuccess] = useState('');
  const [showCalendarHelp, setShowCalendarHelp] = useState(false);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dance-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  const handleSaveCalendarUrl = async () => {
    setCalendarError('');
    setCalendarSuccess('');

    if (!calendarUrl.trim()) {
      updateSettings({ calendarUrl: '' });
      updateCalendarEvents([]);
      refreshData();
      setCalendarSuccess('Calendar disconnected');
      return;
    }

    setCalendarLoading(true);
    try {
      const events = await fetchCalendarEvents(calendarUrl);
      updateSettings({ calendarUrl });
      updateCalendarEvents(events);
      refreshData();
      setCalendarSuccess(`Connected! Found ${events.length} events`);
    } catch (error) {
      setCalendarError('Failed to fetch calendar. Check the URL and try again.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleRefreshCalendar = async () => {
    if (!data.settings?.calendarUrl) return;

    setCalendarLoading(true);
    setCalendarError('');
    try {
      const events = await fetchCalendarEvents(data.settings.calendarUrl);
      updateCalendarEvents(events);
      refreshData();
      setCalendarSuccess(`Refreshed! ${events.length} events`);
    } catch (error) {
      setCalendarError('Failed to refresh calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Calendar Integration */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <button
            onClick={() => setShowCalendarHelp(!showCalendarHelp)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Info size={18} />
          </button>
        </div>

        {showCalendarHelp && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm text-blue-800">
            <p className="font-medium mb-2">How to connect your calendar:</p>
            <p className="whitespace-pre-line text-xs">{getAppleCalendarInstructions()}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-violet-600" />
            <span className="font-medium">Weekend Schedule Sync</span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Connect a calendar to automatically import your Saturday & Sunday competition schedule.
          </p>

          <div className="space-y-3">
            <input
              type="url"
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="Paste calendar URL (ICS feed)..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleSaveCalendarUrl}
                disabled={calendarLoading}
                className="flex-1"
              >
                {calendarLoading ? 'Connecting...' : 'Save'}
              </Button>
              {data.settings?.calendarUrl && (
                <Button
                  variant="secondary"
                  onClick={handleRefreshCalendar}
                  disabled={calendarLoading}
                >
                  <RefreshCw size={16} className={calendarLoading ? 'animate-spin' : ''} />
                </Button>
              )}
            </div>

            {calendarError && (
              <p className="text-sm text-red-600">{calendarError}</p>
            )}
            {calendarSuccess && (
              <p className="text-sm text-green-600">{calendarSuccess}</p>
            )}

            {data.calendarEvents && data.calendarEvents.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {data.calendarEvents.length} events synced from calendar
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Studios */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Studios</h2>
        <div className="space-y-3">
          {data.studios.map(studio => (
            <div
              key={studio.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5"
                  style={{ backgroundColor: studio.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{studio.name}</div>
                  <div className="text-sm text-gray-500">{studio.shortName}</div>

                  {editingStudio === studio.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={studioAddress}
                        onChange={(e) => setStudioAddress(e.target.value)}
                        placeholder="Enter studio address..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          // In a real app, you'd geocode this address
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
                      className="mt-2 text-sm text-violet-600 flex items-center gap-1"
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
        <p className="text-xs text-gray-500 mt-2">
          Add studio addresses to enable location-based class detection
        </p>
      </section>

      {/* Data Management */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data</h2>
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
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
              <Upload size={18} />
              Import Backup
            </div>
          </label>

          {showImportSuccess && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
              Data imported successfully!
            </div>
          )}
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
          <LogOut size={18} className="mr-3" />
          Log Out
        </Button>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total Classes</span>
            <span className="font-medium">{data.classes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Studios</span>
            <span className="font-medium">{data.studios.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Projects</span>
            <span className="font-medium">{data.projects.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Week Notes</span>
            <span className="font-medium">{data.weekNotes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Calendar Events</span>
            <span className="font-medium">{data.calendarEvents?.length || 0}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
