import type { AppData, CalendarEvent, Class, CompetitionDance, DayOfWeek, Studio, Student } from '../types';
import { detectLinkedDances } from './danceLinker';
import { timeToMinutes, toDateStr } from './time';
import { dateToDayOfWeek } from './classException';

export type CalendarEventKind = 'class' | 'rehearsal' | 'work' | 'event';

export interface CalendarEventClassification {
  kind: CalendarEventKind;
  isWork: boolean;
  isClassLike: boolean;
  badgeLabel: 'Class' | 'Rehearsal' | 'Work' | 'Event';
  actionLabel: 'Continue Class' | 'Continue Rehearsal' | 'Continue Work Notes' | 'Continue Notes';
}

interface ClassifyCalendarEventOptions {
  classes?: Class[];
  allEvents?: CalendarEvent[];
  competitionDances?: CompetitionDance[];
  students?: Student[];
}

const NON_WORK_PATTERNS = /flight|therapy|doctor|dentist|appointment|meeting|lunch|dinner|travel|pickup|drop.?off|birthday|party|vacation|hair|nails|grocery|groceries|errand/i;
const WORK_PATTERNS = /rehearsal|production|solo|duet|trio|small\s*group|large\s*group|lyrical|jazz|ballet|tap|contemporary|hip\s*hop|acro|musical\s*thea(?:t|tr)e|thea(?:t|tr)er\s*dance|private|lesson|class|technique|choreography|combo|audition|competition|recital/i;
const REHEARSAL_PATTERNS = /rehearsal|dress\s*rehearsal|run\s*through|runthrough/i;

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function inferLinkedDanceIdsForClass(cls: Class, competitionDances: CompetitionDance[]): string[] {
  if (cls.competitionDanceId) return [cls.competitionDanceId];
  if (competitionDances.length === 0) return [];
  return detectLinkedDances({
    id: cls.id,
    title: cls.name,
    date: '',
    startTime: cls.startTime,
    endTime: cls.endTime,
  }, competitionDances);
}

function getEventDay(date: string): DayOfWeek | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[parsed.getDay()] || null;
}

/** Returns true if the event title looks like one or more student names (e.g. "Ava", "Evie and Adelyn") */
function isTitleStudentNames(title: string, students: Student[]): boolean {
  if (students.length === 0) return false;
  // Build a flat set of lowercase first names and full names
  const nameSet = new Set<string>();
  for (const s of students) {
    const parts = s.name.trim().split(/\s+/);
    nameSet.add(s.name.toLowerCase());
    if (parts.length > 0) nameSet.add(parts[0].toLowerCase()); // first name only
    if (s.nickname) nameSet.add(s.nickname.toLowerCase());
  }
  // Split title on " and ", " & ", commas, slash
  const segments = title.split(/\s+(?:and|&)\s+|,\s*|\//).map(s => s.trim()).filter(Boolean);
  // Require at least 1 segment and all segments are short (≤3 words, looks like a name)
  if (segments.length === 0) return false;
  return segments.every(seg => {
    const words = seg.split(/\s+/);
    if (words.length > 3) return false; // too long to be a name
    return nameSet.has(seg.toLowerCase());
  });
}

export function classifyCalendarEvent(
  event: CalendarEvent,
  { classes = [], allEvents = [], competitionDances = [], students = [] }: ClassifyCalendarEventOptions = {}
): CalendarEventClassification {
  const title = normalize(event.title);
  const description = normalize(event.description);
  const location = normalize(event.location);
  const searchText = [title, description, location].filter(Boolean).join(' ');

  const inferredLinkedDanceIds = (event.linkedDanceIds?.length || 0) > 0
    ? event.linkedDanceIds || []
    : (competitionDances.length > 0 ? detectLinkedDances(event, competitionDances) : []);
  const hasLinkedDances = inferredLinkedDanceIds.length > 0;
  const eventDay = getEventDay(event.date);

  const matchingClass = eventDay
    ? classes.find(cls => normalize(cls.name) === title && cls.day === eventDay)
    : undefined;

  const sameTitleCount = allEvents.filter(e => normalize(e.title) === title).length;
  const isRecurringTitle = sameTitleCount >= 2;
  const isExplicitlyNonWork = !hasLinkedDances && NON_WORK_PATTERNS.test(searchText);
  const hasWorkKeywords = WORK_PATTERNS.test(searchText);
  const hasRehearsalKeywords = REHEARSAL_PATTERNS.test(searchText);

  if (hasLinkedDances) {
    return {
      kind: 'rehearsal',
      isWork: true,
      isClassLike: false,
      badgeLabel: 'Rehearsal',
      actionLabel: 'Continue Rehearsal',
    };
  }

  if (!isExplicitlyNonWork && hasRehearsalKeywords) {
    return {
      kind: 'rehearsal',
      isWork: true,
      isClassLike: false,
      badgeLabel: 'Rehearsal',
      actionLabel: 'Continue Rehearsal',
    };
  }

  // Title looks like student name(s) — e.g. "Ava", "Evie and Adelyn" → solo/duet rehearsal
  if (!isExplicitlyNonWork && isTitleStudentNames(title, students)) {
    return {
      kind: 'rehearsal',
      isWork: true,
      isClassLike: false,
      badgeLabel: 'Rehearsal',
      actionLabel: 'Continue Rehearsal',
    };
  }

  if (!isExplicitlyNonWork && matchingClass) {
    return {
      kind: 'class',
      isWork: true,
      isClassLike: true,
      badgeLabel: 'Class',
      actionLabel: 'Continue Class',
    };
  }

  if (!isExplicitlyNonWork && isRecurringTitle && hasWorkKeywords) {
    return {
      kind: 'class',
      isWork: true,
      isClassLike: true,
      badgeLabel: 'Class',
      actionLabel: 'Continue Class',
    };
  }

  if (!isExplicitlyNonWork && hasWorkKeywords) {
    return {
      kind: 'work',
      isWork: true,
      isClassLike: false,
      badgeLabel: 'Work',
      actionLabel: 'Continue Work Notes',
    };
  }

  return {
    kind: 'event',
    isWork: false,
    isClassLike: false,
    badgeLabel: 'Event',
    actionLabel: 'Continue Notes',
  };
}

export function shouldPreferCalendarEventOverClass(
  cls: Class,
  calendarEvents: CalendarEvent[],
  {
    classes = [],
    allEvents = [],
    competitionDances = [],
    students = [],
    studios = [],
  }: ClassifyCalendarEventOptions & { studios?: Studio[] } = {}
): boolean {
  const hasKnownStudio = studios.some(studio => studio.id === cls.studioId);
  const inferredLinkedDances = inferLinkedDanceIdsForClass(cls, competitionDances);
  const matchingEvent = calendarEvents.find(event => {
    const sameName = normalize(event.title) === normalize(cls.name);
    const sameTime = Math.abs(timeToMinutes(event.startTime || '00:00') - timeToMinutes(cls.startTime)) <= 10;
    const sameDay = !event.date || cls.day === dateToDayOfWeek(event.date);
    return sameName && sameTime && sameDay;
  });

  if (!matchingEvent) return false;

  const matchingEventType = classifyCalendarEvent(matchingEvent, {
    classes,
    allEvents,
    competitionDances,
    students,
  });

  return (!hasKnownStudio && matchingEventType.isWork) || (inferredLinkedDances.length > 0 && matchingEventType.isWork);
}

/**
 * Class-like event derived from a calendar event, normalized to a Class-shaped
 * structure. After the Apr 21, 2026 migration, calendar events are the single
 * source of truth for classes — this is the canonical shape for callers that
 * used to read `data.classes` directly.
 */
export interface ClassLikeEvent {
  id: string;            // 'cal-…' — the calendar event's id
  name: string;          // event.title
  startTime: string;     // 'HH:MM'
  endTime: string;
  date: string;          // 'YYYY-MM-DD'
  day: DayOfWeek;        // derived from date
  studioId?: string;     // best-effort lookup; undefined if no match
  source: 'calendar';
  raw: CalendarEvent;
}

/**
 * Adapter — convert a calendar-derived class-like event into a `Class`-shaped
 * object so downstream consumers (`buildClassContext`, `useHeroPriority`,
 * `Hero`, `useCurrentClass`) keep working with familiar fields. Post Apr 21,
 * 2026, the source of truth is `data.calendarEvents` — there is no real
 * `Class` record to look up, so we synthesize one with the canonical event id
 * (`cal-…`).
 */
export function classLikeEventToClass(ev: ClassLikeEvent): Class {
  return {
    id: ev.id,
    name: ev.name,
    day: ev.day,
    startTime: ev.startTime,
    endTime: ev.endTime,
    studioId: ev.studioId || '',
    musicLinks: [],
  };
}

/**
 * Returns class-like events from `data.calendarEvents`, normalized to a
 * Class-shaped `ClassLikeEvent`. This is the canonical helper for reading
 * "classes" anywhere in the app post-migration. Callers should prefer this
 * over `getClassesByDay(data.classes, ...)`.
 *
 * Filter composition: filters compose with **AND** — passing
 * `{ day: 'monday', date: '2026-04-22' }` only returns events that match BOTH.
 *
 * `endTime` falls back to `startTime` when missing on the source event, so
 * callers must NOT depend on `endTime > startTime` being strictly true.
 *
 * Behavior:
 * - Filters out events whose IDs are in `data.settings.hiddenCalendarEventIds`
 * - Drops all-day / untimed events (matches `useDashboardContext.ts` semantics)
 * - Runs `classifyCalendarEvent()` and keeps only `isClassLike` results
 * - Resolves `studioId` by case-insensitive match on studio shortName, then name
 * - Optional filters: `date` (exact), `day` (DayOfWeek), `week` (today + next 6 days)
 * - Sorts ascending by date then startTime
 * - Dedupes by composite `${title}+${date}+${startTime}` (recurring feeds occasionally split)
 */
export function getClassesFromCalendar(
  data: AppData,
  options?: { day?: DayOfWeek; date?: string; week?: boolean }
): ClassLikeEvent[] {
  const events = data.calendarEvents ?? [];
  const hiddenIds = new Set(data.settings?.hiddenCalendarEventIds ?? []);
  const studios = data.studios ?? [];

  const ctx = {
    classes: data.classes || [],
    allEvents: data.calendarEvents || [],
    competitionDances: data.competitionDances || [],
    students: data.students || [],
  };

  // Pre-compute optional date-window bounds for week filter
  let weekStart: string | undefined;
  let weekEnd: string | undefined;
  if (options?.week) {
    const start = new Date();
    weekStart = toDateStr(start);
    const end = new Date();
    end.setDate(end.getDate() + 6);
    weekEnd = toDateStr(end);
  }

  const seen = new Set<string>();
  const out: ClassLikeEvent[] = [];

  for (const event of events) {
    if (hiddenIds.has(event.id)) continue;
    if (!event.startTime || event.startTime === '00:00') continue;

    const classification = classifyCalendarEvent(event, ctx);
    if (!classification.isClassLike) continue;

    // Date / day / week filters
    if (options?.date && event.date !== options.date) continue;

    const day = dateToDayOfWeek(event.date);
    if (options?.day && day !== options.day) continue;

    if (weekStart && weekEnd) {
      if (event.date < weekStart || event.date > weekEnd) continue;
    }

    // Resolve studioId by location → shortName then name (case-insensitive)
    let studioId: string | undefined;
    if (event.location) {
      const loc = event.location.trim().toLowerCase();
      const byShort = studios.find(s => s.shortName?.toLowerCase() === loc);
      const byName = byShort ? undefined : studios.find(s => s.name?.toLowerCase() === loc);
      studioId = byShort?.id || byName?.id;
    }

    // Dedupe by composite key — calendar feeds occasionally split events
    const key = `${event.title}+${event.date}+${event.startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: event.id,
      name: event.title,
      startTime: event.startTime,
      endTime: event.endTime || event.startTime,
      date: event.date,
      day,
      studioId,
      source: 'calendar',
      raw: event,
    });
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return out;
}
