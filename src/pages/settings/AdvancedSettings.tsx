import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Database, Image, FileText } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseConfigured } from '../../services/firebase';
import { migrateDataToFirestore } from '../../services/firestore';
import { loadData } from '../../services/storage';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

const IMAGE_QUALITY_OPTIONS = [
  { label: 'Low', value: 0.5 },
  { label: 'Medium', value: 0.7 },
  { label: 'High', value: 0.9 },
] as const;

export function AdvancedSettings() {
  const { data, refreshData, updateSettings } = useAppData();
  const { user } = useAuth();

  const imageQuality = data.settings?.imageQuality ?? 0.7;

  // Migration state
  const [migrationState, setMigrationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Recovery state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryJson, setRecoveryJson] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'error' | 'invalid'>('idle');
  const [recoveryStats, setRecoveryStats] = useState<{ merged: number; skipped: number } | null>(null);

  const handleImageQualityChange = (quality: number) => {
    updateSettings({ imageQuality: quality });
    refreshData();
  };

  const handleMigration = async () => {
    if (!user) return;
    setMigrationState('loading');
    setMigrationError(null);
    try {
      const currentData = loadData();
      await migrateDataToFirestore(currentData, user.uid);
      setMigrationState('success');
    } catch (e: any) {
      setMigrationState('error');
      setMigrationError(e?.message || 'Migration failed');
    }
  };

  const handleRecovery = () => {
    setRecoveryStatus('idle');
    setRecoveryStats(null);

    let parsed: any;
    try {
      parsed = JSON.parse(recoveryJson);
    } catch {
      setRecoveryStatus('invalid');
      return;
    }

    const incoming = parsed.weekNotes;
    if (!incoming || typeof incoming !== 'object') {
      setRecoveryStatus('invalid');
      return;
    }

    const currentData = loadData();
    const existingNotes = currentData.weekNotes || [];
    const existingKeys = new Set(
      Array.isArray(existingNotes)
        ? existingNotes.map((n: any) => n.weekId || n.id)
        : Object.keys(existingNotes)
    );

    let merged = 0;
    let skipped = 0;

    const incomingEntries = Array.isArray(incoming)
      ? incoming
      : Object.values(incoming);

    for (const note of incomingEntries) {
      const key = (note as any).weekId || (note as any).id;
      if (key && existingKeys.has(key)) {
        skipped++;
      } else {
        if (Array.isArray(currentData.weekNotes)) {
          currentData.weekNotes.push(note);
        }
        merged++;
      }
    }

    if (merged > 0) {
      // Save via localStorage directly
      localStorage.setItem('figgg-data', JSON.stringify(currentData));
      refreshData();
    }

    setRecoveryStats({ merged, skipped });
    setRecoveryStatus('success');
  };

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-card-hover)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Advanced</h1>
        </div>

        {/* Image Compression Quality */}
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-5 h-5 text-[var(--text-secondary)]" />
            <h2 className="text-lg font-semibold">Image Compression Quality</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Higher quality = larger file sizes
          </p>
          <div className="flex gap-2">
            {IMAGE_QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleImageQualityChange(opt.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  imageQuality === opt.value
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Firebase Migration */}
        {firebaseConfigured && user && (
          <Card className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold">Firebase Migration</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Push all local data to Firestore. Use this if you started offline and want to sync everything up.
            </p>
            <Button
              variant={migrationState === 'success' ? 'success' : migrationState === 'error' ? 'danger' : 'primary'}
              loading={migrationState === 'loading'}
              onClick={handleMigration}
              disabled={migrationState === 'loading'}
            >
              {migrationState === 'idle' && 'Migrate to Firestore'}
              {migrationState === 'loading' && 'Migrating...'}
              {migrationState === 'success' && 'Migration Complete'}
              {migrationState === 'error' && 'Migration Failed'}
            </Button>
            {migrationError && (
              <p className="mt-2 text-sm text-[var(--status-danger)]">{migrationError}</p>
            )}
          </Card>
        )}

        {/* Recover Old Notes */}
        <Card className="mb-4">
          <button
            onClick={() => setShowRecovery(!showRecovery)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
              <h2 className="text-lg font-semibold">Recover Old Notes</h2>
            </div>
            {showRecovery ? (
              <ChevronUp className="w-5 h-5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
            )}
          </button>

          {showRecovery && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Paste old localStorage JSON to recover week notes. Non-duplicate entries will be merged.
              </p>
              <textarea
                value={recoveryJson}
                onChange={(e) => setRecoveryJson(e.target.value)}
                placeholder='Paste JSON here (must contain "weekNotes")'
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-mono"
              />
              <Button variant="secondary" onClick={handleRecovery} disabled={!recoveryJson.trim()}>
                Recover
              </Button>
              {recoveryStatus === 'invalid' && (
                <p className="text-sm text-[var(--status-danger)]">Invalid JSON or missing weekNotes</p>
              )}
              {recoveryStatus === 'success' && recoveryStats && (
                <p className="text-sm text-[var(--status-success)]">
                  Merged {recoveryStats.merged} notes, skipped {recoveryStats.skipped} duplicates
                </p>
              )}
              {recoveryStatus === 'error' && (
                <p className="text-sm text-[var(--status-danger)]">Recovery failed</p>
              )}
            </div>
          )}
        </Card>

        {/* App Version */}
        <p className="text-center text-sm text-[var(--text-tertiary)] mt-8">
          Figgg v3.0
        </p>
      </div>
    </div>
  );
}
