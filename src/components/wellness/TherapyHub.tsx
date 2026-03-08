import { useState, lazy, Suspense } from 'react';
import { haptic } from '../../utils/haptics';
import { TherapistTracker } from './TherapistTracker';
import { MeditationSpace } from './MeditationSpace';
import type { TherapistData, MeditationData, GriefData } from '../../types';

const TherapyJournal = lazy(() => import('./TherapyJournal').then(m => ({ default: m.TherapyJournal })));

type TherapyTab = 'sessions' | 'journal' | 'breathing';

const TABS: { key: TherapyTab; label: string }[] = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'journal', label: 'Journal' },
  { key: 'breathing', label: 'Breathing' },
];

interface TherapyHubProps {
  therapistData: TherapistData;
  onUpdateTherapist: (updates: Partial<TherapistData>) => void;
  meditationData: MeditationData;
  onUpdateMeditation: (updates: Partial<MeditationData>) => void;
  journalData: GriefData;
  onUpdateJournal: (updates: Partial<GriefData>) => void;
}

export function TherapyHub({
  therapistData,
  onUpdateTherapist,
  meditationData,
  onUpdateMeditation,
  journalData,
  onUpdateJournal,
}: TherapyHubProps) {
  const [activeTab, setActiveTab] = useState<TherapyTab>('sessions');

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); haptic('light'); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'bg-[var(--surface-inset)] text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'sessions' && (
        <TherapistTracker data={therapistData} onUpdate={onUpdateTherapist} />
      )}

      {activeTab === 'journal' && (
        <Suspense fallback={<div className="py-8 text-center text-[var(--text-tertiary)] text-sm">Loading...</div>}>
          <TherapyJournal data={journalData} onUpdate={onUpdateJournal} />
        </Suspense>
      )}

      {activeTab === 'breathing' && (
        <MeditationSpace data={meditationData} onUpdate={onUpdateMeditation} />
      )}
    </div>
  );
}
