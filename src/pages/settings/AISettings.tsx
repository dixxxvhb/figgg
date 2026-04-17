import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { useAppData } from '../../contexts/AppDataContext';
import { DEFAULT_AI_CONFIG } from '../../types';

const AFTERNOON_TIMES = Array.from({ length: 9 }, (_, i) => {
  const hour = i + 12; // 12pm to 8pm
  const label = hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
  const value = `${hour}:00`;
  return { label, value };
});

const TONE_OPTIONS: { value: 'supportive' | 'direct' | 'minimal'; label: string }[] = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'direct', label: 'Direct' },
  { value: 'minimal', label: 'Minimal' },
];

export function AISettings() {
  const { data, updateSettings } = useAppData();
  const settings = data.settings || {};
  const aiConfig = settings.aiConfig || DEFAULT_AI_CONFIG;

  const updateAI = (patch: Partial<typeof aiConfig>) => {
    updateSettings({ aiConfig: { ...aiConfig, ...patch } });
  };

  return (
    <div className="page-container pb-24">
      <Breadcrumb items={[{ label: 'Settings', to: '/settings' }, { label: 'AI Assistant' }]} />
      <div className="flex items-center gap-3 mb-6">
        <Link to="/settings" className="p-1 -ml-1 rounded-lg hover:bg-[var(--bg-secondary)]">
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </Link>
        <h1 className="type-display text-[var(--text-primary)]">AI & Behavior</h1>
      </div>

      {/* Check-ins */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Check-ins</h2>
        <div className="space-y-3">
          {/* Morning check-in */}
          <button
            onClick={() => updateAI({ morningCheckInEnabled: !aiConfig.morningCheckInEnabled })}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)]"
          >
            <span className="text-[var(--text-primary)] font-medium">Morning check-in</span>
            <div className={`w-11 h-6 rounded-full transition-colors ${aiConfig.morningCheckInEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${aiConfig.morningCheckInEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {/* Afternoon check-in */}
          <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)]">
            <button
              onClick={() => updateAI({ afternoonCheckInEnabled: !aiConfig.afternoonCheckInEnabled })}
              className="w-full flex items-center justify-between"
            >
              <span className="text-[var(--text-primary)] font-medium">Afternoon check-in</span>
              <div className={`w-11 h-6 rounded-full transition-colors ${aiConfig.afternoonCheckInEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${aiConfig.afternoonCheckInEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </button>
            {aiConfig.afternoonCheckInEnabled && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <label className="text-xs text-[var(--text-tertiary)] mb-1.5 block">Time</label>
                <select
                  value={aiConfig.afternoonCheckInTime}
                  onChange={e => updateAI({ afternoonCheckInTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface-inset)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm"
                >
                  {AFTERNOON_TIMES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tone */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Tone</h2>
        <div className="flex gap-2">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateAI({ tone: opt.value })}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                aiConfig.tone === opt.value
                  ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
                  : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Auto Day Plan */}
      <section className="mb-6">
        <h2 className="type-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 px-1">Planning</h2>
        <button
          onClick={() => updateAI({ autoPlanEnabled: !aiConfig.autoPlanEnabled })}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)]"
        >
          <div>
            <span className="text-[var(--text-primary)] font-medium block">Auto day plan</span>
            <span className="text-xs text-[var(--text-tertiary)]">Generate plan on morning check-in</span>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${aiConfig.autoPlanEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${aiConfig.autoPlanEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </section>

    </div>
  );
}
