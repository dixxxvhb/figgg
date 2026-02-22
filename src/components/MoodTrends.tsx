import { useMemo, useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { AICheckIn, DailySnapshot } from '../types';

interface MoodTrendsProps {
  checkIns: AICheckIn[];
  snapshots: DailySnapshot[];
}

const MOOD_MAP: Record<string, { emoji: string; value: number; color: string }> = {
  great:    { emoji: '', value: 5, color: '#22c55e' },
  good:     { emoji: '', value: 4, color: '#84cc16' },
  okay:     { emoji: '', value: 3, color: '#eab308' },
  low:      { emoji: '', value: 2, color: '#f97316' },
  rough:    { emoji: '', value: 1, color: '#ef4444' },
  stressed: { emoji: '', value: 2, color: '#f97316' },
  tired:    { emoji: '', value: 2, color: '#f97316' },
  anxious:  { emoji: '', value: 2, color: '#f97316' },
  energized:{ emoji: '', value: 4, color: '#84cc16' },
  calm:     { emoji: '', value: 4, color: '#84cc16' },
  focused:  { emoji: '', value: 4, color: '#84cc16' },
};

function moodToValue(mood: string | undefined): number | null {
  if (!mood) return null;
  const key = mood.toLowerCase().trim();
  return MOOD_MAP[key]?.value ?? null;
}

function moodToColor(mood: string | undefined): string {
  if (!mood) return '#d1d5db';
  const key = mood.toLowerCase().trim();
  return MOOD_MAP[key]?.color ?? '#d1d5db';
}

export function MoodTrends({ checkIns, snapshots }: MoodTrendsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const last14Days = useMemo(() => {
    const days: { date: string; label: string; mood: string | undefined; value: number | null }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Find mood from check-ins (prefer latest of the day)
      const dayCheckIns = checkIns
        .filter(c => c.date === dateStr && c.mood)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const mood = dayCheckIns[0]?.mood || snapshots.find(s => s.date === dateStr)?.mood;

      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        mood,
        value: moodToValue(mood),
      });
    }
    return days;
  }, [checkIns, snapshots]);

  const daysWithMood = last14Days.filter(d => d.value !== null);
  if (daysWithMood.length < 2) return null; // Need at least 2 data points

  const avgMood = daysWithMood.reduce((sum, d) => sum + (d.value || 0), 0) / daysWithMood.length;
  const avgLabel = avgMood >= 4 ? 'Good' : avgMood >= 3 ? 'Okay' : 'Low';
  const maxVal = 5;
  const barHeight = 48;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <TrendingUp size={14} className="text-forest-500" />
        <span className="text-xs font-semibold text-blush-400 dark:text-blush-500 uppercase tracking-wide flex-1">
          Mood · 2 Weeks
        </span>
        <span className="text-xs text-blush-400 dark:text-blush-500">{avgLabel} avg</span>
        {isExpanded ? <ChevronUp size={14} className="text-blush-400" /> : <ChevronDown size={14} className="text-blush-400" />}
      </button>

      {isExpanded && (
        <div className="bg-white dark:bg-blush-800 rounded-xl border border-blush-200 dark:border-blush-700 p-3">
          {/* Bar chart */}
          <div className="flex items-end gap-1" style={{ height: barHeight + 16 }}>
            {last14Days.map((day, i) => {
              const val = day.value;
              const h = val ? (val / maxVal) * barHeight : 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: h,
                      backgroundColor: val ? moodToColor(day.mood) : '#e5e7eb',
                      opacity: val ? 1 : 0.3,
                    }}
                  />
                  <span className="text-[9px] text-blush-400 dark:text-blush-500">{day.label}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[9px] text-blush-400">2 weeks ago</span>
            <span className="text-[9px] text-blush-400">Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
