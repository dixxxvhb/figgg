import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  CheckSquare, Brain, Wind, BookHeart, Heart, type LucideIcon,
} from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';
import { haptic } from '../utils/haptics';
import type { MedConfig } from '../types';
import { DEFAULT_MED_CONFIG } from '../types';

// Wellness section components
import { MedsTracker } from '../components/wellness/MedsTracker';
import { SmartChecklist } from '../components/wellness/SmartChecklist';
import { TherapistTracker } from '../components/wellness/TherapistTracker';
import { MeditationSpace } from '../components/wellness/MeditationSpace';
import { GriefToolkit } from '../components/wellness/GriefToolkit';
import { FixItemWidget } from '../components/Dashboard/FixItemWidget';

const TherapyJournal = lazy(() => import('../components/wellness/TherapyJournal').then(m => ({ default: m.TherapyJournal })));

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function isTodayTimestamp(timestamp: number | null | undefined): boolean {
  if (!timestamp) return false;
  const saved = new Date(timestamp);
  const today = new Date();
  return saved.getFullYear() === today.getFullYear() &&
    saved.getMonth() === today.getMonth() &&
    saved.getDate() === today.getDate();
}

type WellnessSubTab = 'checkin' | 'therapy' | 'journal' | 'breathing' | 'grief';

const WELLNESS_SUB_TABS: { key: WellnessSubTab; label: string; icon: LucideIcon }[] = [
  { key: 'checkin', label: 'Check-in', icon: CheckSquare },
  { key: 'therapy', label: 'Therapy', icon: Brain },
  { key: 'journal', label: 'Journal', icon: BookHeart },
  { key: 'breathing', label: 'Breathing', icon: Wind },
  { key: 'grief', label: 'Grief', icon: Heart },
];

const WELLNESS_MODES = [
  { id: 'okay' as const, label: "I'm okay", color: 'bg-[var(--status-success)]', textColor: 'text-[var(--status-success)]' },
  { id: 'rough' as const, label: 'Rough day', color: 'bg-[var(--status-warning)]', textColor: 'text-[var(--status-warning)]' },
  { id: 'survival' as const, label: 'Survival', color: 'bg-[var(--status-danger)]', textColor: 'text-[var(--status-danger)]' },
] as const;

function QuickModeSwitcher({ selfCare, onUpdateSelfCare }: { selfCare: import('../types').SelfCareData | undefined; onUpdateSelfCare: (updates: Partial<import('../types').SelfCareData>) => void }) {
  const todayKey = getTodayKey();
  const currentMode = selfCare?.wellnessModeDate === todayKey ? (selfCare?.wellnessMode || 'okay') : 'okay';

  const handleSetMode = (mode: 'okay' | 'rough' | 'survival') => {
    haptic('light');
    onUpdateSelfCare({ wellnessMode: mode, wellnessModeDate: todayKey });
  };

  return (
    <div className="flex items-center gap-1.5 px-1">
      {WELLNESS_MODES.map(m => {
        const active = currentMode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => handleSetMode(m.id)}
            className={`flex-1 py-2 px-2 rounded-[var(--radius-md)] text-xs font-semibold transition-all duration-200 ${
              active
                ? `${m.color} text-white shadow-sm`
                : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function Me() {
  const { data, updateSelfCare, updateTherapist, updateMeditation, updateGrief, addFixItem, deleteFixItem } = useAppData();
  const [wellnessSubTab, setWellnessSubTab] = useState<WellnessSubTab>('checkin');

  // Curtain Call: Grief tab gets a warmer ambient body tint (wired in curtainCall.css).
  // Cleared on unmount so the tint doesn't bleed into other pages.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    if (wellnessSubTab === 'grief') {
      document.body.dataset.wellnessSub = 'grief';
    } else {
      delete document.body.dataset.wellnessSub;
    }
    return () => {
      if (document.body) delete document.body.dataset.wellnessSub;
    };
  }, [wellnessSubTab]);

  const medConfig: MedConfig = data.settings?.medConfig || DEFAULT_MED_CONFIG;
  const [currentTime] = useState(new Date());

  // Dose status for SmartChecklist
  const dose1Taken = isTodayTimestamp(data.selfCare?.dose1Time);

  // Therapist data with defaults
  const therapistData = useMemo(() => data.therapist || {
    prepNotes: [],
    sessions: [],
    lastModified: new Date().toISOString(),
  }, [data.therapist]);

  // Meditation data with defaults
  const meditationData = useMemo(() => data.meditation || {
    sessions: [],
    preferences: { defaultRounds: { box: 4, fourSevenEight: 4, slow: 6 } },
    lastModified: new Date().toISOString(),
  }, [data.meditation]);

  // Grief data with defaults
  const griefData = useMemo(() => ({
    letters: [],
    emotionalCheckins: [],
    lastPermissionSlipIndex: -1,
    lastModified: new Date().toISOString(),
    ...data.grief,
  }), [data.grief]);

  return (
    <div className="pb-24 bg-[var(--surface-primary)]">
      <div className="page-container xl:max-w-5xl">
        {/* Header */}
        <div className="mb-4">
          <h1 className="type-h1 text-[var(--text-primary)]">Wellness</h1>
          <p className="type-caption text-[var(--text-secondary)]">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-4">
          {/* Meds — always visible at top */}
          <MedsTracker
            selfCare={data.selfCare}
            medConfig={medConfig}
            classes={data.classes || []}
            studios={data.studios || []}
            onUpdateSelfCare={updateSelfCare}
            learningData={data.learningData}
          />

          {/* Wellness Sub-Tab Bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {WELLNESS_SUB_TABS.map(tab => {
              const isActive = wellnessSubTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setWellnessSubTab(tab.key); haptic('light'); }}
                  className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-full)] text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-sm'
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <Icon size={13} aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-Tab Content */}
          {wellnessSubTab === 'checkin' && (
            <div className="space-y-3">
              <QuickModeSwitcher
                selfCare={data.selfCare}
                onUpdateSelfCare={updateSelfCare}
              />
              <SmartChecklist
                selfCare={data.selfCare}
                aiCheckIns={data.aiCheckIns}
                dose1Taken={dose1Taken}
                onUpdateSelfCare={updateSelfCare}
                therapist={therapistData}
                grief={griefData}
                meditation={meditationData}
                classes={data.classes}
              />
            </div>
          )}

          {wellnessSubTab === 'therapy' && (
            <TherapistTracker data={therapistData} onUpdate={updateTherapist} journalEntries={griefData.letters} calendarEvents={data.calendarEvents} />
          )}

          {wellnessSubTab === 'journal' && (
            <Suspense fallback={<div className="py-8 text-center text-[var(--text-tertiary)] text-sm">Loading...</div>}>
              <TherapyJournal data={griefData} onUpdate={updateGrief} />
            </Suspense>
          )}

          {wellnessSubTab === 'breathing' && (
            <MeditationSpace data={meditationData} onUpdate={updateMeditation} />
          )}

          {wellnessSubTab === 'grief' && (
            <GriefToolkit data={griefData} onUpdate={updateGrief} />
          )}

          {/* App Fix Logger — bottom of wellness section */}
          <FixItemWidget
            fixItems={data.fixItems || []}
            onAdd={addFixItem}
            onDelete={deleteFixItem}
          />
        </div>

      </div>
    </div>
  );
}
