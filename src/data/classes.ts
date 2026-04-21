import { Class } from '../types';

// Classes now come exclusively from Dixon's Apple Calendar (iCal feed).
// Kept as an empty seed so first-run doesn't inject stale CAA/AWH data —
// all live class/event data lives in `data.calendarEvents`.
export const initialClasses: Class[] = [];

export function getClassesByDay(classes: Class[], day: string): Class[] {
  return classes
    .filter(c => c.day === day.toLowerCase())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
