import { useMemo } from 'react';
import type { AICheckIn, AIConfig } from '../types';
import { DEFAULT_AI_CONFIG } from '../types';

interface CheckInStatus {
  isDue: boolean;
  type: 'morning' | 'afternoon' | null;
  greeting: string;
}

export function useCheckInStatus(
  aiCheckIns: AICheckIn[] | undefined,
  aiConfig: AIConfig | undefined,
  currentMinute?: number, // from Dashboard — triggers re-eval on clock tick
): CheckInStatus {
  return useMemo(() => {
    const config = aiConfig || DEFAULT_AI_CONFIG;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hour = now.getHours();

    const todayCheckIns = (aiCheckIns || []).filter(c => c.date === todayStr);
    const hasMorning = todayCheckIns.some(c => c.type === 'morning');
    const hasAfternoon = todayCheckIns.some(c => c.type === 'afternoon');

    // Morning check-in: before noon, no morning check-in yet
    if (config.morningCheckInEnabled && !hasMorning && hour < 12) {
      const greetings = [
        'Morning, Dixon. How are you feeling today?',
        'Good morning. What\'s the vibe today?',
        'Morning check-in. How\'s the day looking?',
      ];
      return {
        isDue: true,
        type: 'morning',
        greeting: greetings[now.getDate() % greetings.length],
      };
    }

    // Afternoon check-in: after configured time, no afternoon check-in yet
    const [afterHour] = (config.afternoonCheckInTime || '13:00').split(':').map(Number);
    if (config.afternoonCheckInEnabled && !hasAfternoon && hour >= afterHour && hour < 22) {
      const greetings = [
        'How\'s the day going? Anything to adjust?',
        'Afternoon check. How are things?',
        'Quick check-in. Need to shift anything?',
      ];
      return {
        isDue: true,
        type: 'afternoon',
        greeting: greetings[now.getDate() % greetings.length],
      };
    }

    return { isDue: false, type: null, greeting: '' };
  }, [aiCheckIns, aiConfig, currentMinute]);
}
