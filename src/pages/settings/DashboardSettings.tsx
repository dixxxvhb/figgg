import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';

const WIDGET_DEFS = [
  { id: 'daily-briefing', label: 'Daily Briefing' },
  { id: 'morning-briefing', label: 'Quick Stats' },
  { id: 'nudges', label: 'Nudge Cards' },
  { id: 'meds-quick', label: 'Medication Tracker' },
  { id: 'scratchpad', label: 'Scratchpad' },
  { id: 'todays-agenda', label: "Today's Schedule" },
  { id: 'reminders', label: 'Tasks & Reminders' },
  { id: 'week-momentum', label: 'Week Momentum' },
  { id: 'week-stats', label: 'Week Stats' },
  { id: 'streak', label: 'Streak' },
  { id: 'weekly-insight', label: 'Weekly Insight' },
  { id: 'launch-plan', label: 'Launch Plan' },
  { id: 'fix-items', label: 'Fix Items' },
];

const SENSITIVITY_OPTIONS = [
  { value: 'aggressive' as const, label: 'Aggressive', desc: 'More frequent nudges, lower thresholds' },
  { value: 'balanced' as const, label: 'Balanced', desc: 'Standard nudge frequency' },
  { value: 'quiet' as const, label: 'Quiet', desc: 'Minimal nudges, higher thresholds' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`w-12 h-7 rounded-full transition-colors relative ${on ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}`}>
      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function DashboardSettings() {
  const { data, updateSettings } = useAppData();
  const settings = data.settings || {};

  const hidden = settings.hiddenWidgets || [];
  const nudgesEnabled = settings.nudgesEnabled !== false;
  const sensitivity = settings.nudgeSensitivity || 'balanced';
  const snoozeDuration = settings.nudgeSnoozeDurationHours || 24;
  const maxVisible = settings.nudgeMaxVisible || 3;

  const toggleWidget = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id];
    updateSettings({ hiddenWidgets: next });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <ArrowLeft size={20} className="text-[var(--text-primary)]" />
          </Link>
          <h1 className="type-page-title text-[var(--text-primary)]">Dashboard Settings</h1>
        </div>

        {/* Widget Visibility */}
        <section className="mb-8">
          <h2 className="type-section-title text-[var(--text-primary)] mb-4">Widget Visibility</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
            {WIDGET_DEFS.map(widget => {
              const isVisible = !hidden.includes(widget.id);
              return (
                <div key={widget.id} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] last:border-b-0">
                  <span className="type-body text-[var(--text-primary)]">{widget.label}</span>
                  <Toggle on={isVisible} onChange={() => toggleWidget(widget.id)} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Nudge Settings */}
        <section className="mb-8">
          <h2 className="type-section-title text-[var(--text-primary)] mb-4">Nudge Settings</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-5">

            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <span className="type-body text-[var(--text-primary)]">Nudges enabled</span>
              <Toggle on={nudgesEnabled} onChange={v => updateSettings({ nudgesEnabled: v })} />
            </div>

            {nudgesEnabled && (
              <>
                {/* Sensitivity */}
                <div>
                  <p className="type-label text-[var(--text-secondary)] mb-2">Sensitivity</p>
                  <div className="flex gap-2 mb-2">
                    {SENSITIVITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => updateSettings({ nudgeSensitivity: opt.value })}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          sensitivity === opt.value
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="type-caption text-[var(--text-tertiary)]">
                    {SENSITIVITY_OPTIONS.find(o => o.value === sensitivity)?.desc}
                  </p>
                </div>

                {/* Snooze Duration */}
                <div>
                  <p className="type-label text-[var(--text-secondary)] mb-2">Snooze Duration</p>
                  <div className="flex gap-2">
                    {[12, 24, 48].map(hours => (
                      <button
                        key={hours}
                        onClick={() => updateSettings({ nudgeSnoozeDurationHours: hours })}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          snoozeDuration === hours
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Nudges Shown */}
                <div>
                  <p className="type-label text-[var(--text-secondary)] mb-2">Max Nudges Shown</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => updateSettings({ nudgeMaxVisible: n })}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          maxVisible === n
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
