import type { CalendarEvent, CompetitionDance } from '../types';
import { detectLinkedDances } from './danceLinker';

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getSortKey(date: string, time?: string): string {
  return `${date}T${time || '23:59'}`;
}

function resolveLinkedDanceIds(event: CalendarEvent, competitionDances: CompetitionDance[]): string[] {
  if (event.linkedDanceIds?.length) return event.linkedDanceIds;
  return detectLinkedDances(event, competitionDances);
}

export function findNextRehearsalEvent({
  calendarEvents,
  competitionDances,
  afterDate,
  afterTime,
  currentEventId,
  currentTitle,
  linkedDanceIds = [],
}: {
  calendarEvents: CalendarEvent[];
  competitionDances: CompetitionDance[];
  afterDate: string;
  afterTime?: string;
  currentEventId?: string;
  currentTitle?: string;
  linkedDanceIds?: string[];
}): CalendarEvent | undefined {
  const afterKey = getSortKey(afterDate, afterTime);
  const normalizedTitle = normalize(currentTitle);

  return calendarEvents
    .filter(event => event.id !== currentEventId)
    .filter(event => getSortKey(event.date, event.startTime) > afterKey)
    .filter(event => {
      const eventLinkedDanceIds = resolveLinkedDanceIds(event, competitionDances);
      if (linkedDanceIds.length > 0 && eventLinkedDanceIds.some(id => linkedDanceIds.includes(id))) {
        return true;
      }
      return normalizedTitle.length > 0 && normalize(event.title) === normalizedTitle;
    })
    .sort((a, b) => getSortKey(a.date, a.startTime).localeCompare(getSortKey(b.date, b.startTime)))[0];
}

export function findNextRehearsalForDance({
  danceId,
  calendarEvents,
  competitionDances,
  afterDate,
}: {
  danceId: string;
  calendarEvents: CalendarEvent[];
  competitionDances: CompetitionDance[];
  afterDate: string;
}): CalendarEvent | undefined {
  return calendarEvents
    .filter(event => getSortKey(event.date, event.startTime) > getSortKey(afterDate))
    .filter(event => resolveLinkedDanceIds(event, competitionDances).includes(danceId))
    .sort((a, b) => getSortKey(a.date, a.startTime).localeCompare(getSortKey(b.date, b.startTime)))[0];
}
