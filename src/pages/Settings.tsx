import React, { useState } from 'react';
import { MapPin, Download, Upload, LogOut, Trash2, Check } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { exportData, importData, logout } from '../services/storage';
import { Button } from '../components/common/Button';

export function Settings() {
  const { data, refreshData } = useAppData();
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [editingStudio, setEditingStudio] = useState<string | null>(null);
  const [studioAddress, setStudioAddress] = useState('');

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

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

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
        </div>
      </section>
    </div>
  );
}
