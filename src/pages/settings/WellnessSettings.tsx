import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Droplets, Coffee, Utensils, Footprints, Brain, Smartphone, BedDouble, Sun, BookOpen, Sparkles, Heart, Zap, Plus, Trash2 } from 'lucide-react';
import { useAppData } from '../../contexts/AppDataContext';
import { DEFAULT_MED_CONFIG, DEFAULT_WELLNESS_ITEMS, type WellnessItemConfig } from '../../types';

const ICON_MAP: Record<string, typeof Sun> = { Droplets, Coffee, Utensils, Footprints, Brain, Smartphone, BedDouble, Sun, BookOpen, Sparkles, Heart, Zap };

function TimingRow({ label, value, min, max, onChange, suffix = 'h' }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="type-body text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 0.5))} className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold">-</button>
        <span className="type-body font-semibold text-[var(--text-primary)] w-12 text-center">{value}{suffix}</span>
        <button onClick={() => onChange(Math.min(max, value + 0.5))} className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold">+</button>
      </div>
    </div>
  );
}

const SECTIONS = ['morning', 'afternoon', 'evening'] as const;
const SECTION_LABELS: Record<string, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

export function WellnessSettings() {
  const { data, updateSettings } = useAppData();
  const settings = data.settings || {};
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

  const medConfig = settings.medConfig || DEFAULT_MED_CONFIG;
  const wellnessItems = settings.wellnessItems || DEFAULT_WELLNESS_ITEMS;

  const updateMed = (patch: Partial<typeof medConfig>) => {
    updateSettings({ medConfig: { ...medConfig, ...patch } });
  };

  const updateWellnessItems = (items: WellnessItemConfig[]) => {
    updateSettings({ wellnessItems: items });
  };

  const toggleItem = (id: string) => {
    updateWellnessItems(
      wellnessItems.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const removeItem = (id: string) => {
    updateWellnessItems(wellnessItems.filter(item => item.id !== id));
  };

  const addItem = (section: typeof SECTIONS[number]) => {
    if (!newItemLabel.trim()) return;
    const sectionItems = wellnessItems.filter(i => i.section === section);
    const maxOrder = sectionItems.length > 0 ? Math.max(...sectionItems.map(i => i.order)) : -1;
    const newItem: WellnessItemConfig = {
      id: `custom_${Date.now()}`,
      label: newItemLabel.trim(),
      icon: 'Sparkles',
      section,
      enabled: true,
      order: maxOrder + 1,
    };
    updateWellnessItems([...wellnessItems, newItem]);
    setNewItemLabel('');
    setAddingTo(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/settings" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <ArrowLeft size={20} className="text-[var(--text-primary)]" />
          </Link>
          <h1 className="type-page-title text-[var(--text-primary)]">Wellness Settings</h1>
        </div>

        {/* Medication Section */}
        <section className="mb-8">
          <h2 className="type-section-title text-[var(--text-primary)] mb-4">Medication</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-4">
            {/* Med Type */}
            <div>
              <p className="type-label text-[var(--text-secondary)] mb-2">Med Type</p>
              <div className="flex gap-2">
                {(['IR', 'XR'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => updateMed({ medType: type })}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                      medConfig.medType === type
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Doses */}
            <div>
              <p className="type-label text-[var(--text-secondary)] mb-2">Daily Doses</p>
              <div className="flex gap-2">
                {([2, 3] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => updateMed({ maxDoses: n })}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                      medConfig.maxDoses === n
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Timing controls */}
            <div className="border-t border-[var(--border-primary)] pt-3">
              {medConfig.medType === 'IR' ? (
                <>
                  <TimingRow label="Peak hours" value={medConfig.irPeakHours} min={1} max={6} onChange={v => updateMed({ irPeakHours: v })} />
                  <TimingRow label="Duration hours" value={medConfig.irDurationHours} min={2} max={8} onChange={v => updateMed({ irDurationHours: v })} />
                  <div className="border-t border-[var(--border-primary)] pt-2 mt-2">
                    <p className="type-label text-[var(--text-secondary)] mb-1">Dose 2 Window</p>
                    <TimingRow label="Start after D1" value={medConfig.dose2WindowStart} min={2} max={12} onChange={v => updateMed({ dose2WindowStart: v })} />
                    <TimingRow label="End after D1" value={medConfig.dose2WindowEnd} min={3} max={14} onChange={v => updateMed({ dose2WindowEnd: v })} />
                  </div>
                  {medConfig.maxDoses === 3 && (
                    <div className="border-t border-[var(--border-primary)] pt-2 mt-2">
                      <p className="type-label text-[var(--text-secondary)] mb-1">Dose 3 Window</p>
                      <TimingRow label="Start after D2" value={medConfig.dose3WindowStart} min={2} max={12} onChange={v => updateMed({ dose3WindowStart: v })} />
                      <TimingRow label="End after D2" value={medConfig.dose3WindowEnd} min={3} max={14} onChange={v => updateMed({ dose3WindowEnd: v })} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <TimingRow label="Peak hours" value={medConfig.xrPeakHours} min={3} max={12} onChange={v => updateMed({ xrPeakHours: v })} />
                  <TimingRow label="Duration hours" value={medConfig.xrDurationHours} min={6} max={16} onChange={v => updateMed({ xrDurationHours: v })} />
                </>
              )}
            </div>
          </div>
        </section>

        {/* Wellness Checklist Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="type-section-title text-[var(--text-primary)]">Wellness Checklist</h2>
            <button
              onClick={() => updateWellnessItems([...DEFAULT_WELLNESS_ITEMS])}
              className="type-caption text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Reset to defaults
            </button>
          </div>

          {SECTIONS.map(section => {
            const sectionItems = wellnessItems
              .filter(i => i.section === section)
              .sort((a, b) => a.order - b.order);

            return (
              <div key={section} className="mb-4">
                <p className="type-label text-[var(--text-secondary)] mb-2">{SECTION_LABELS[section]}</p>
                <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden">
                  {sectionItems.map(item => {
                    const IconComp = ICON_MAP[item.icon] || Sparkles;
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-primary)] last:border-b-0">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            item.enabled
                              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                              : 'border-[var(--text-tertiary)] bg-transparent'
                          }`}
                        >
                          {item.enabled && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <IconComp size={16} className="text-[var(--text-tertiary)]" />
                        <span className={`type-body flex-1 ${item.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {item.label}
                        </span>
                        {item.id.startsWith('custom_') && (
                          <button onClick={() => removeItem(item.id)} className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add item row */}
                  {addingTo === section ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <input
                        type="text"
                        value={newItemLabel}
                        onChange={e => setNewItemLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addItem(section)}
                        placeholder="New item..."
                        autoFocus
                        className="flex-1 bg-transparent type-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                      />
                      <button onClick={() => addItem(section)} className="type-caption font-semibold text-[var(--accent-primary)]">Add</button>
                      <button onClick={() => { setAddingTo(null); setNewItemLabel(''); }} className="type-caption text-[var(--text-tertiary)]">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingTo(section); setNewItemLabel(''); }}
                      className="flex items-center gap-2 px-4 py-3 w-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <Plus size={16} />
                      <span className="type-caption">Add item</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
