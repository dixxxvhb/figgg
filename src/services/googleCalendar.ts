import { httpsCallable } from 'firebase/functions';
import { requireFunctions } from './firebase';

interface CalendarEventInput {
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
}

interface CalendarEventResult {
  googleCalendarEventId: string;
  htmlLink: string;
}

interface GoogleCalendarEvent {
  googleCalendarEventId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  isAllDay: boolean;
}

export async function createGoogleCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  const fn = httpsCallable<CalendarEventInput, CalendarEventResult>(requireFunctions(), 'createGoogleCalendarEvent');
  const result = await fn(input);
  return result.data;
}

export async function updateGoogleCalendarEvent(
  googleCalendarEventId: string,
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const fn = httpsCallable<CalendarEventInput & { googleCalendarEventId: string }, CalendarEventResult>(
    requireFunctions(),
    'updateGoogleCalendarEvent'
  );
  const result = await fn({ ...input, googleCalendarEventId });
  return result.data;
}

export async function deleteGoogleCalendarEvent(googleCalendarEventId: string): Promise<void> {
  const fn = httpsCallable<{ googleCalendarEventId: string }, { success: boolean }>(
    requireFunctions(),
    'deleteGoogleCalendarEvent'
  );
  await fn({ googleCalendarEventId });
}

export async function fetchGoogleCalendarEvents(
  daysAhead = 90,
  daysBehind = 7
): Promise<GoogleCalendarEvent[]> {
  const fn = httpsCallable<{ daysAhead: number; daysBehind: number }, { events: GoogleCalendarEvent[] }>(
    requireFunctions(),
    'fetchGoogleCalendarEvents'
  );
  const result = await fn({ daysAhead, daysBehind });
  return result.data.events;
}
