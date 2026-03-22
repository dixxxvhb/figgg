import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Check } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { exportData, importData, loadData } from '../../services/storage';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export function DataSettings() {
  const { data, refreshData } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `figgg-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      try {
        const success = importData(content);
        if (success) {
          refreshData();
          setShowImportSuccess(true);
          setTimeout(() => setShowImportSuccess(false), 3000);
        } else {
          setImportError('Invalid data format');
        }
      } catch {
        setImportError('Failed to parse file');
      }
    };
    reader.readAsText(file);

    // Reset so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stats = [
    { label: 'Classes', count: (data.classes || []).length },
    { label: 'Studios', count: (data.studios || []).length },
    { label: 'Dances', count: (data.competitionDances || []).length },
    { label: 'Competitions', count: (data.competitions || []).length },
    { label: 'Week Notes', count: Object.keys(data.weekNotes || {}).length },
    { label: 'Events', count: (data.calendarEvents || []).length },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-card-hover)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Data Management</h1>
        </div>

        {/* Export */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Export</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Download a full backup of your data as a JSON file.
          </p>
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export Data
          </Button>
        </Card>

        {/* Import */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Import</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Restore from a previously exported JSON backup. This replaces all current data.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="secondary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Data
          </Button>
          {showImportSuccess && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[var(--status-success)]">
              <Check className="w-4 h-4" />
              <span>Import successful</span>
            </div>
          )}
          {importError && (
            <p className="mt-2 text-sm text-[var(--status-danger)]">{importError}</p>
          )}
        </Card>

        {/* Stats Grid */}
        <Card>
          <h2 className="text-lg font-semibold mb-3">Data Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="px-3 py-2 rounded-lg bg-[var(--surface-inset)]"
              >
                <p className="text-xs text-[var(--text-tertiary)]">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.count}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
