import { WeekNotes, ClassWeekNotes } from '../types';

export interface PastSession {
  weekOf: string;
  eventId: string;
  notes: ClassWeekNotes;
}

/**
 * Scans all WeekNotes for ClassWeekNotes entries whose eventTitle
 * matches the given title (case-insensitive). Excludes the current
 * event by eventId. Returns matches sorted newest-first by weekOf.
 */
export function findMatchingPastSessions(
  allWeekNotes: WeekNotes[],
  eventTitle: string,
  currentEventId: string
): PastSession[] {
  const titleLower = eventTitle.toLowerCase().trim();
  const matches: PastSession[] = [];

  for (const week of allWeekNotes) {
    for (const [eventId, classNotes] of Object.entries(week.classNotes)) {
      if (
        eventId !== currentEventId &&
        classNotes.eventTitle &&
        classNotes.eventTitle.toLowerCase().trim() === titleLower
      ) {
        matches.push({
          weekOf: week.weekOf,
          eventId,
          notes: classNotes,
        });
      }
    }
  }

  // Sort newest first by weekOf date
  matches.sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime());

  return matches;
}

/**
 * Gets the carry-forward text from the most recent matching past session.
 * Priority: nextWeekGoal > plan > nothing.
 * Returns null if no suitable text found.
 */
export function getCarryForwardText(
  pastSessions: PastSession[]
): { text: string; sourceWeekOf: string; sourceField: 'nextWeekGoal' | 'plan' } | null {
  if (pastSessions.length === 0) return null;

  const mostRecent = pastSessions[0];

  if (mostRecent.notes.nextWeekGoal?.trim()) {
    return {
      text: mostRecent.notes.nextWeekGoal.trim(),
      sourceWeekOf: mostRecent.weekOf,
      sourceField: 'nextWeekGoal',
    };
  }

  if (mostRecent.notes.plan?.trim()) {
    return {
      text: mostRecent.notes.plan.trim(),
      sourceWeekOf: mostRecent.weekOf,
      sourceField: 'plan',
    };
  }

  return null;
}
