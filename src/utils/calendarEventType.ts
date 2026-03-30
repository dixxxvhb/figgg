import type { CalendarEvent, Class, CompetitionDance, DayOfWeek, Studio, Student } from '../types';
import { detectLinkedDances } from './danceLinker';
import { timeToMinutes } from './time';

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
    return sameName || sameTime;
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
