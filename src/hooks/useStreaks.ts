import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';

export interface StreakData {
  medsOnTime: number;   // consecutive days with at least 1 dose logged
  moodLogged: number;   // consecutive days with a mood entry
  wellnessTouch: number; // consecutive days with any wellness activity
}

// Computes ADHD-friendly streaks. Never red, never punitive. If broken, returns 0.
export function useStreaks(): StreakData {
  const { data } = useAppData();

  return useMemo(() => {
    const snapshots = (data.learningData?.dailySnapshots || []).slice(-60);
    if (snapshots.length === 0) {
      return { medsOnTime: 0, moodLogged: 0, wellnessTouch: 0 };
    }

    // Snapshots are stored oldest → newest. Walk backward from today.
    const sortedDesc = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));

    const todayStr = new Date().toISOString().slice(0, 10);
    const medsOnTime = countConsecutive(sortedDesc, todayStr, (s) => !!(s.dose1Time || s.dose2Time || s.dose3Time));
    const moodLogged = countConsecutive(sortedDesc, todayStr, (s) => !!s.mood);
    const wellnessTouch = countConsecutive(sortedDesc, todayStr, (s) => (s.wellnessCompleted?.length || 0) > 0);

    return { medsOnTime, moodLogged, wellnessTouch };
  }, [data.learningData]);
}

function countConsecutive<T extends { date: string }>(
  sortedDesc: T[],
  todayStr: string,
  predicate: (snap: T) => boolean
): number {
  let cursor = todayStr;
  let count = 0;
  // Allow today to be missing (streak continues from yesterday)
  let passedToday = false;
  for (const snap of sortedDesc) {
    if (snap.date > cursor) continue;
    if (snap.date === cursor) {
      if (predicate(snap)) {
        count += 1;
        cursor = decrementDate(cursor);
        passedToday = true;
      } else {
        // today's entry exists but no activity — break unless today
        if (!passedToday && cursor === todayStr) {
          cursor = decrementDate(cursor);
          continue;
        }
        break;
      }
    } else {
      // gap day — streak breaks
      break;
    }
  }
  return count;
}

function decrementDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
