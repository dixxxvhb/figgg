import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw, Check, Cloud, LogIn, LogOut } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncStatus } from '../../contexts/SyncContext';
import { firebaseConfigured } from '../../services/firebase';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

const SYNC_INTERVALS = [5, 10, 15, 30] as const;

export function SyncSettings() {
  const { data, updateSettings } = useAppData();
  const { user, signIn, signOut } = useAuth();
  const { syncCalendars } = useSyncStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const syncMinutes = data.settings?.calendarSyncMinutes ?? 15;

  // --- Auth handlers ---

  const handleSignIn = async () => {
    if (!email || !password) return;
    setAuthSubmitting(true);
    setAuthError('');
    try {
      await signIn(email, password);
    } catch (e: any) {
      setAuthError(e?.message || 'Sign in failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      setAuthError(e?.message || 'Sign out failed');
    }
  };

  // --- Calendar handlers ---

  const addCalendarUrl = () => {
    const trimmed = newCalendarUrl.trim();
    if (!trimmed || calendarUrls.includes(trimmed)) return;
    const updated = [...calendarUrls, trimmed];
    setCalendarUrls(updated);
    setNewCalendarUrl('');
    updateSettings({ calendarUrl: updated[0] || '', calendarUrls: updated });
  };

  const removeCalendarUrl = (index: number) => {
    const updated = calendarUrls.filter((_, i) => i !== index);
    setCalendarUrls(updated);
    updateSettings({ calendarUrl: updated[0] || '', calendarUrls: updated });
  };

  const handleSync = async () => {
    if (calendarUrls.length === 0) {
      setSyncResult('Add a calendar URL first');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const results = await syncCalendars();
      setSyncResult(results.length > 0 ? results.join('\n') : 'Sync complete');
    } catch {
      setSyncResult('Sync failed');
    }
    setSyncing(false);
  };

  const handleSyncIntervalChange = (minutes: number) => {
    updateSettings({ calendarSyncMinutes: minutes });
    // Notify SyncContext to reconfigure the interval immediately
    window.dispatchEvent(new CustomEvent('calendar-sync-interval-changed'));
  };

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--surface-card-hover)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Sync Settings</h1>
        </div>

        {/* Account Section */}
        {firebaseConfigured && (
          <Card className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Account</h2>
            {user ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                <Button variant="secondary" icon={<LogOut className="w-4 h-4" />} onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
                <Button
                  variant="primary"
                  icon={<LogIn className="w-4 h-4" />}
                  loading={authSubmitting}
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
              </div>
            )}
            {authError && (
              <p className="mt-2 text-sm text-[var(--status-danger)]">{authError}</p>
            )}
          </Card>
        )}

        {/* Cloud Sync Status */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Cloud Sync</h2>
          {user ? (
            <div className="flex items-center gap-2 text-sm text-[var(--status-success)]">
              <Check className="w-4 h-4" />
              <span>Auto via Firestore</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Cloud className="w-4 h-4" />
              <span>Sign in to sync across devices</span>
            </div>
          )}
        </Card>

        {/* Calendar URLs */}
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Calendar URLs</h2>

          {calendarUrls.length > 0 && (
            <ul className="space-y-2 mb-3">
              {calendarUrls.map((url, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm truncate text-[var(--text-secondary)]">{url}</span>
                  <button
                    onClick={() => removeCalendarUrl(i)}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-card-hover)] text-[var(--status-danger)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste calendar URL (.ics)"
              value={newCalendarUrl}
              onChange={(e) => setNewCalendarUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCalendarUrl()}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-inset)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addCalendarUrl}>
              Add
            </Button>
          </div>

          <div className="mt-3">
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
              loading={syncing}
              onClick={handleSync}
            >
              Sync Now
            </Button>
            {syncResult && (
              <div className="mt-2 text-sm text-[var(--text-secondary)] whitespace-pre-line bg-[var(--surface-inset)] rounded-lg p-3">{syncResult}</div>
            )}
          </div>
        </Card>

        {/* Sync Interval */}
        <Card>
          <h2 className="text-lg font-semibold mb-3">Sync Interval</h2>
          <div className="flex gap-2">
            {SYNC_INTERVALS.map((mins) => (
              <button
                key={mins}
                onClick={() => handleSyncIntervalChange(mins)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  syncMinutes === mins
                    ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--surface-inset)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)]'
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
