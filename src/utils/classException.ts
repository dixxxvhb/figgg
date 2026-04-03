/**
 * Shared cross-reference logic for finding class exceptions.
 *
 * Calendar events and internal classes use different ID schemes.
 * This utility resolves exceptions across both by:
 * 1. Direct ID lookup in weekNotes.classNotes[id]
 * 2. Cross-reference: calendar event → matching internal class by name+time+day
 * 3. Orphaned classNotes entries: parse class ID format for studio hint + time hint
 */

import type { Class, DayOfWeek, WeekNotes } from '../types';
import { timeToMinutes } from './time';

export interface ClassException {
  type: 'cancelled' | 'subbed' | 'time-change';
  subName?: string;
  reason?: 'sick' | 'personal' | 'holiday' | 'other';
  timeOverride?: { startTime: string; endTime?: string };
}

const DAY_NAMES: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Get DayOfWeek from an ISO date string like "2026-04-03" */
export function dateToDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

/**
 * Find the exception for a given class or calendar event.
 *
 * @param id - The class ID or calendar event ID
 * @param weekNotes - Current week's notes (may be undefined)
 * @param classes - All internal classes
 * @param eventTitle - Optional: the calendar event title (for cross-reference)
 * @param eventStartTime - Optional: the event start time (for cross-reference)
 * @param eventDay - Optional: day of week (for cross-reference — prevents matching same-name classes on different days)
 */
export function getClassException(
  id: string,
  weekNotes: WeekNotes | undefined,
  classes: Class[],
  eventTitle?: string,
  eventStartTime?: string,
  eventDay?: DayOfWeek,
): ClassException | undefined {
  if (!weekNotes) return undefined;

  // 1. Direct ID lookup
  const direct = weekNotes.classNotes[id]?.exception;
  if (direct) return direct;

  // If no event title, we can't cross-reference
  if (!eventTitle) return undefined;

  const normTitle = eventTitle.toLowerCase();
  const eventMinutes = eventStartTime ? timeToMinutes(eventStartTime) : -1;

  // 2. Cross-reference: find internal class with exception that matches by name+time+day
  for (const cls of classes) {
    const exc = weekNotes.classNotes[cls.id]?.exception;
    if (!exc) continue;
    const sameName = cls.name.toLowerCase() === normTitle;
    const sameTime = eventMinutes >= 0 && Math.abs(timeToMinutes(cls.startTime) - eventMinutes) <= 10;
    const sameDay = !eventDay || cls.day === eventDay;
    if (sameName && sameTime && sameDay) return exc;
  }

  // 3. Orphaned classNotes entries (IDs not in classes array)
  for (const [, cn] of Object.entries(weekNotes.classNotes)) {
    if (!cn.exception || !cn.classId) continue;
    const idParts = cn.classId.toLowerCase().split('-');
    const studioHint = idParts.find(p => p.length > 2 && normTitle.includes(p));
    const timeHint = idParts.find(p => /^\d{4}$/.test(p));
    if (studioHint && timeHint && eventMinutes >= 0) {
      const hintMinutes = parseInt(timeHint.slice(0, 2)) * 60 + parseInt(timeHint.slice(2));
      if (Math.abs(hintMinutes - eventMinutes) <= 10) return cn.exception;
    }
  }

  return undefined;
}

/**
 * Find the internal class ID that matches a calendar event (for setting exceptions on calendar events).
 * Returns the matching internal class ID, or the event's own ID as fallback.
 *
 * @param eventDay - Day of week to filter by (prevents matching same-name classes on different days)
 */
export function resolveExceptionTargetId(
  eventId: string,
  eventTitle: string,
  eventStartTime: string | undefined,
  classes: Class[],
  eventDay?: DayOfWeek,
): string {
  const normTitle = eventTitle.toLowerCase();
  const eventMinutes = eventStartTime ? timeToMinutes(eventStartTime) : -1;

  for (const cls of classes) {
    const sameName = cls.name.toLowerCase() === normTitle;
    const sameTime = eventMinutes >= 0 && Math.abs(timeToMinutes(cls.startTime) - eventMinutes) <= 10;
    const sameDay = !eventDay || cls.day === eventDay;
    if (sameName && sameTime && sameDay) return cls.id;
  }

  // No match — use event's own ID
  return eventId;
}
