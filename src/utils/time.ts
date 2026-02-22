import { format, startOfWeek } from 'date-fns';
import { Class, DayOfWeek } from '../types';

const DAYS_MAP: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

export function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function formatTimeDisplay(timeStr: string): string {
  const { hours, minutes } = parseTime(timeStr);
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getClassStatus(cls: Class, currentDay: DayOfWeek, currentMinutes: number): 'before' | 'during' | 'after' | 'other-day' {
  if (cls.day !== currentDay) {
    return 'other-day';
  }

  const startMinutes = timeToMinutes(cls.startTime);
  const endMinutes = timeToMinutes(cls.endTime);

  if (currentMinutes < startMinutes) {
    return 'before';
  } else if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return 'during';
  } else {
    return 'after';
  }
}

export function getMinutesUntilClass(cls: Class, currentMinutes: number): number {
  const startMinutes = timeToMinutes(cls.startTime);
  return startMinutes - currentMinutes;
}

export function getMinutesRemaining(cls: Class, currentMinutes: number): number {
  const endMinutes = timeToMinutes(cls.endTime);
  return endMinutes - currentMinutes;
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function formatWeekOf(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

