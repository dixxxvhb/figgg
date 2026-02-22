import { WeekNotes, ClassWeekNotes } from '../types';

/**
 * Normalizes event titles for fuzzy matching across weeks.
 * - Lowercases
 * - Strips trailing parentheticals: "Hip Hop (Saturday)" → "hip hop"
 * - Strips trailing day-of-week suffixes: "Rehearsal - Saturday" → "rehearsal"
 * - Expands common abbreviations: "w" → "with", "beg" → "beginner", etc.
 * - Strips punctuation (slashes, hyphens used as separators)
 * - Collapses internal whitespace: "Ballet  Basics" → "ballet basics"
 */
export function normalizeTitle(title: string): string {
  let t = title
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')                        // strip trailing (...)
    .replace(/\s*[-–—]\s*(mon|tue|wed|thu|fri|sat|sun)\w*\s*$/i, '') // strip "- Saturday" etc.
    .replace(/[/\-–—]/g, ' ')                               // slashes & dashes → spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Expand common abbreviations (word-boundary safe)
  const abbreviations: Record<string, string> = {
    'w': 'with',
    'beg': 'beginner',
    'int': 'intermediate',
    'adv': 'advanced',
    'rehrs': 'rehearsal',
    'reh': 'rehearsal',
  };

  t = t.split(' ').map(word => abbreviations[word] || word).join(' ');

  return t;
}

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
  const titleNorm = normalizeTitle(eventTitle);
  const matches: PastSession[] = [];

  for (const week of allWeekNotes) {
    for (const [eventId, classNotes] of Object.entries(week.classNotes)) {
      if (
        eventId !== currentEventId &&
        classNotes.eventTitle &&
        normalizeTitle(classNotes.eventTitle) === titleNorm
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
