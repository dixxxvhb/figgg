import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import type { SelfCareData, LearningData } from '../../types';

interface StreakCardProps {
  selfCare?: SelfCareData;
  learningData?: LearningData;
  notesThisWeek: number;
  totalClassesThisWeek: number;
}

function computeMedStreak(selfCare?: SelfCareData, learningData?: LearningData): { current: number; longest: number } {
  // Build a set of dates when meds were taken (dose1 or dose2 recorded)
  const medDates = new Set<string>();

  // Add dates from daily snapshots (historical)
  if (learningData?.dailySnapshots) {
    for (const snap of learningData.dailySnapshots) {
      if (snap.dose1Time || snap.dose2Time || snap.dose3Time) {
        medDates.add(snap.date);
      }
    }
  }

  // Add today if a dose was taken today
  if (selfCare) {
    if (selfCare.dose1Date && selfCare.dose1Time != null) medDates.add(selfCare.dose1Date);
    if (selfCare.dose2Date && selfCare.dose2Time != null) medDates.add(selfCare.dose2Date);
    if (selfCare.dose3Date && selfCare.dose3Time != null) medDates.add(selfCare.dose3Date);
  }

  // Also include from streakData.weeklyHistory if it exists
  if (selfCare?.streakData?.weeklyHistory) {
    for (const [date, count] of Object.entries(selfCare.streakData.weeklyHistory)) {
      if (count > 0) medDates.add(date);
    }
  }

  if (medDates.size === 0) return { current: 0, longest: 0 };

  // Sort dates descending
  const sorted = Array.from(medDates).sort().reverse();

  // Compute current streak (consecutive days from today backwards)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  // Start from today or yesterday
  let current = 0;
  let checkDate = medDates.has(todayStr) ? new Date(today) : medDates.has(yesterdayStr) ? new Date(yesterday) : null;

  if (checkDate) {
    while (true) {
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (medDates.has(key)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Compute longest streak from all dates
  let longest = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run, current);

  return { current, longest };
}

export function StreakCard({ selfCare, learningData, notesThisWeek, totalClassesThisWeek }: StreakCardProps) {
  const { current: currentStreak, longest: longestStreak } = useMemo(
    () => computeMedStreak(selfCare, learningData),
    [selfCare, learningData]
  );

  const notesCoverage = totalClassesThisWeek > 0
    ? Math.round((notesThisWeek / totalClassesThisWeek) * 100)
    : 0;

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)]">
        {/* Meds Streak */}
        <div className="p-4 text-center">
          <Flame size={18} className="mx-auto text-orange-500 mb-2" />
          <div className="type-stat text-[var(--text-primary)] leading-none">
            {currentStreak}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-1.5">
            Day Streak
          </div>
          {longestStreak > currentStreak && (
            <div className="type-caption text-[var(--text-tertiary)] mt-0.5">
              Best: {longestStreak}
            </div>
          )}
        </div>

        {/* Notes Coverage */}
        <div className="p-4 text-center">
          <div className="w-5 h-5 mx-auto rounded-full bg-[var(--accent-muted)] flex items-center justify-center mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
          </div>
          <div className="type-stat text-[var(--text-primary)] leading-none">
            {totalClassesThisWeek > 0 ? `${notesCoverage}%` : '\u2014'}
          </div>
          <div className="type-label text-[var(--text-tertiary)] mt-1.5">
            {totalClassesThisWeek > 0 ? 'Notes Done' : 'No Classes'}
          </div>
          {totalClassesThisWeek > 0 && (
            <div className="type-caption text-[var(--text-tertiary)] mt-0.5">
              {notesThisWeek} of {totalClassesThisWeek}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
