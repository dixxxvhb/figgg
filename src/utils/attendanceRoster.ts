import type { CalendarEvent, Class, CompetitionDance, DayOfWeek, Student } from '../types';
import { detectLinkedDances } from './danceLinker';

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getEventDay(date: string): DayOfWeek | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[parsed.getDay()] || null;
}

function getDanceRosterStudentIds(linkedDanceIds: string[], competitionDances: CompetitionDance[]): string[] {
  const studentIds = new Set<string>();
  competitionDances
    .filter(dance => linkedDanceIds.includes(dance.id))
    .forEach(dance => {
      (dance.dancerIds || []).forEach(id => studentIds.add(id));
    });
  return Array.from(studentIds);
}

export function getClassRosterStudentIds(
  cls: Class,
  students: Student[],
  competitionDances: CompetitionDance[]
): string[] {
  const linkedDanceIds = cls.competitionDanceId
    ? [cls.competitionDanceId]
    : detectLinkedDances({
        id: cls.id,
        title: cls.name,
        date: '',
        startTime: cls.startTime,
        endTime: cls.endTime,
      }, competitionDances);

  const danceRosterIds = getDanceRosterStudentIds(linkedDanceIds, competitionDances);
  if (danceRosterIds.length > 0) return danceRosterIds;

  return students
    .filter(student => student.classIds?.includes(cls.id))
    .map(student => student.id);
}

export function getEventRosterStudentIds(
  event: CalendarEvent,
  {
    students,
    classes,
    competitionDances,
  }: {
    students: Student[];
    classes: Class[];
    competitionDances: CompetitionDance[];
  }
): string[] {
  const linkedDanceIds = event.linkedDanceIds?.length
    ? event.linkedDanceIds
    : detectLinkedDances(event, competitionDances);

  const danceRosterIds = getDanceRosterStudentIds(linkedDanceIds, competitionDances);
  if (danceRosterIds.length > 0) return danceRosterIds;

  const eventDay = getEventDay(event.date);
  const matchingClass = eventDay
    ? classes.find(cls => normalize(cls.name) === normalize(event.title) && cls.day === eventDay)
    : undefined;

  if (!matchingClass) return [];

  return students
    .filter(student => student.classIds?.includes(matchingClass.id))
    .map(student => student.id);
}
