import { CalendarEvent } from '../types';

// Generate a stable ID based on event content so IDs persist across syncs
function generateStableId(title: string, date: string, startTime: string, endTime = '', location = ''): string {
  // Include endTime and location to avoid collisions between identically-named events on the same day
  const str = `${title}-${date}-${startTime}-${endTime}-${location}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `cal-${Math.abs(hash).toString(36)}`;
}

// How far ahead to expand recurring events (90 days)
const RECURRENCE_WINDOW_DAYS = 90;
// How far back to keep events (7 days)
const PAST_EVENT_WINDOW_DAYS = 7;

// Parse ICS (iCalendar) format
export async function fetchCalendarEvents(icsUrl: string): Promise<CalendarEvent[]> {
  try {
    // Use our own Netlify Function as a CORS proxy instead of third-party services
    const token = localStorage.getItem('dance-teaching-app-token') || '';
    const proxyUrl = `/.netlify/functions/calendarProxy?url=${encodeURIComponent(icsUrl)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar proxy returned ${response.status}`);
    }

    const icsText = await response.text();
    return parseICS(icsText);
  } catch (error) {
    console.error('Failed to fetch calendar:', error);
    return [];
  }
}

interface RawEvent {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  rrule?: string;
  exdates?: string[]; // Excluded dates for recurring events
  dtStartKey?: string; // Original DTSTART key (for timezone info)
  dtStartValue?: string; // Original DTSTART value
  durationMinutes?: number; // Duration in minutes (derived from start/end)
}

function parseICS(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  const rawEvents: RawEvent[] = [];

  let currentEvent: RawEvent | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle line continuations (lines starting with space/tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[++i].slice(1);
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = { exdates: [] };
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        rawEvents.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      if (key.startsWith('SUMMARY')) {
        currentEvent.title = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
      } else if (key.startsWith('DTSTART')) {
        currentEvent.dtStartKey = key;
        currentEvent.dtStartValue = value;
        const { date, time } = parseDTValue(key, value);
        currentEvent.date = date;
        currentEvent.startTime = time;
      } else if (key.startsWith('DTEND')) {
        const { date: endDate, time } = parseDTValue(key, value);
        currentEvent.endTime = time;
        // Calculate duration from start/end for recurring event expansion
        if (currentEvent.date && currentEvent.startTime) {
          const startDt = new Date(`${currentEvent.date}T${currentEvent.startTime}:00`);
          const endDt = new Date(`${endDate}T${time}:00`);
          currentEvent.durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        }
      } else if (key.startsWith('RRULE')) {
        currentEvent.rrule = value;
      } else if (key.startsWith('EXDATE')) {
        // Parse excluded dates (canceled occurrences)
        const { date: exDate } = parseDTValue(key, value);
        currentEvent.exdates!.push(exDate);
      } else if (key.startsWith('LOCATION')) {
        currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (key.startsWith('DESCRIPTION')) {
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      }
    }
  }

  // Time window for filtering
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - PAST_EVENT_WINDOW_DAYS);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + RECURRENCE_WINDOW_DAYS);
  const windowStartStr = formatDateStr(windowStart);
  const windowEndStr = formatDateStr(windowEnd);

  // Process each raw event
  for (const raw of rawEvents) {
    if (raw.rrule) {
      // Expand recurring event into individual occurrences
      const occurrences = expandRRule(raw, windowStartStr, windowEndStr);
      for (const occ of occurrences) {
        occ.id = generateStableId(occ.title!, occ.date!, occ.startTime || '00:00', occ.endTime || '', occ.location || '');
        events.push(occ as CalendarEvent);
      }
    } else {
      // Single event — only include if within window
      if (raw.date! >= windowStartStr && raw.date! <= windowEndStr) {
        const event: CalendarEvent = {
          id: generateStableId(raw.title!, raw.date!, raw.startTime || '00:00', raw.endTime || '', raw.location || ''),
          title: raw.title!,
          date: raw.date!,
          startTime: raw.startTime || '00:00',
          endTime: raw.endTime || '',
          location: raw.location,
          description: raw.description,
        };
        events.push(event);
      }
    }
  }

  return events;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Expand a recurring event (RRULE) into individual occurrences within the window
function expandRRule(raw: RawEvent, windowStart: string, windowEnd: string): Partial<CalendarEvent>[] {
  const results: Partial<CalendarEvent>[] = [];
  const rrule = parseRRuleString(raw.rrule!);

  if (!rrule.freq) return results;

  const startDate = parseDate(raw.date!);
  const exdateSet = new Set(raw.exdates || []);

  // Parse UNTIL date if present
  let untilDate: Date | null = null;
  if (rrule.until) {
    const untilClean = rrule.until.replace(/Z$/, '');
    const isUTC = rrule.until.endsWith('Z');
    if (untilClean.length >= 8) {
      const y = parseInt(untilClean.slice(0, 4));
      const m = parseInt(untilClean.slice(4, 6)) - 1;
      const d = parseInt(untilClean.slice(6, 8));
      if (isUTC && untilClean.length >= 15) {
        const h = parseInt(untilClean.slice(9, 11));
        const min = parseInt(untilClean.slice(11, 13));
        untilDate = new Date(Date.UTC(y, m, d, h, min, 59));
      } else {
        untilDate = new Date(y, m, d, 23, 59, 59);
      }
    }
  }

  const count = rrule.count || 1000; // Safety limit
  const windowEndDate = parseDate(windowEnd);
  const windowStartDate = parseDate(windowStart);
  let occurrences = 0;

  if (rrule.freq === 'DAILY') {
    const interval = rrule.interval || 1;
    const current = new Date(startDate);
    while (current <= windowEndDate && occurrences < count) {
      if (untilDate && current > untilDate) break;
      const dateStr = formatDateStr(current);
      if (dateStr >= windowStart && !exdateSet.has(dateStr)) {
        results.push(makeOccurrence(raw, dateStr));
        occurrences++;
      }
      current.setDate(current.getDate() + interval);
    }
  } else if (rrule.freq === 'WEEKLY') {
    const interval = rrule.interval || 1;
    const current = new Date(startDate);
    while (current <= windowEndDate && occurrences < count) {
      if (untilDate && current > untilDate) break;
      const dateStr = formatDateStr(current);
      if (dateStr >= windowStart && !exdateSet.has(dateStr)) {
        results.push(makeOccurrence(raw, dateStr));
        occurrences++;
      }
      current.setDate(current.getDate() + 7 * interval);
    }
  } else if (rrule.freq === 'MONTHLY') {
    // Handle BYDAY+BYSETPOS (e.g., first Thursday of month)
    if (rrule.byday && rrule.bysetpos !== undefined) {
      const targetDayNum = dayNameToNum(rrule.byday);
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const interval = rrule.interval || 1;

      while (current <= windowEndDate && occurrences < count) {
        if (untilDate && current > untilDate) break;
        const matchDate = getNthWeekdayOfMonth(current.getFullYear(), current.getMonth(), targetDayNum, rrule.bysetpos);
        if (matchDate) {
          const dateStr = formatDateStr(matchDate);
          if (dateStr >= windowStart && dateStr <= windowEnd && !exdateSet.has(dateStr)) {
            results.push(makeOccurrence(raw, dateStr));
            occurrences++;
          }
        }
        current.setMonth(current.getMonth() + interval);
      }
    } else {
      // Simple monthly on same day of month
      const interval = rrule.interval || 1;
      const current = new Date(startDate);
      while (current <= windowEndDate && occurrences < count) {
        if (untilDate && current > untilDate) break;
        const dateStr = formatDateStr(current);
        if (dateStr >= windowStart && !exdateSet.has(dateStr)) {
          results.push(makeOccurrence(raw, dateStr));
          occurrences++;
        }
        current.setMonth(current.getMonth() + interval);
      }
    }
  } else if (rrule.freq === 'YEARLY') {
    const interval = rrule.interval || 1;
    const current = new Date(startDate);
    while (current <= windowEndDate && occurrences < count) {
      if (untilDate && current > untilDate) break;
      const dateStr = formatDateStr(current);
      if (dateStr >= windowStart && !exdateSet.has(dateStr)) {
        results.push(makeOccurrence(raw, dateStr));
        occurrences++;
      }
      current.setFullYear(current.getFullYear() + interval);
    }
  }

  return results;
}

function makeOccurrence(raw: RawEvent, dateStr: string): Partial<CalendarEvent> {
  return {
    title: raw.title,
    date: dateStr,
    startTime: raw.startTime || '00:00',
    endTime: raw.endTime || '',
    location: raw.location,
    description: raw.description,
  };
}

interface ParsedRRule {
  freq?: string;
  interval?: number;
  until?: string;
  count?: number;
  byday?: string;
  bysetpos?: number;
  bymonth?: number;
}

function parseRRuleString(rrule: string): ParsedRRule {
  const result: ParsedRRule = {};
  const parts = rrule.split(';');
  for (const part of parts) {
    const [k, v] = part.split('=');
    switch (k) {
      case 'FREQ': result.freq = v; break;
      case 'INTERVAL': result.interval = parseInt(v); break;
      case 'UNTIL': result.until = v; break;
      case 'COUNT': result.count = parseInt(v); break;
      case 'BYDAY': result.byday = v; break;
      case 'BYSETPOS': result.bysetpos = parseInt(v); break;
      case 'BYMONTH': result.bymonth = parseInt(v); break;
    }
  }
  return result;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayNameToNum(byday: string): number {
  // BYDAY values: SU=0, MO=1, TU=2, WE=3, TH=4, FR=5, SA=6
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return map[byday] ?? 0;
}

function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date | null {
  if (n > 0) {
    // Nth occurrence (1st, 2nd, etc.)
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) break;
      if (date.getDay() === dayOfWeek) {
        count++;
        if (count === n) return date;
      }
    }
  } else if (n === -1) {
    // Last occurrence
    for (let d = 31; d >= 1; d--) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) continue;
      if (date.getDay() === dayOfWeek) return date;
    }
  }
  return null;
}

function parseDTValue(key: string, value: string): { date: string; time: string } {
  // Handle different date formats
  // DTSTART:20240122T173000Z       (UTC)
  // DTSTART;VALUE=DATE:20240122    (date only)
  // DTSTART;TZID=America/New_York:20240122T173000  (local time)

  const isDateOnly = key.includes('VALUE=DATE');
  const isUTC = value.endsWith('Z');

  // Remove any timezone suffix
  const cleanValue = value.replace(/Z$/, '');

  if (isDateOnly || cleanValue.length === 8) {
    // Date only: YYYYMMDD
    const year = cleanValue.slice(0, 4);
    const month = cleanValue.slice(4, 6);
    const day = cleanValue.slice(6, 8);
    return {
      date: `${year}-${month}-${day}`,
      time: '00:00',
    };
  } else {
    // Date and time: YYYYMMDDTHHMMSS
    const year = parseInt(cleanValue.slice(0, 4));
    const month = parseInt(cleanValue.slice(4, 6)) - 1; // JS months 0-indexed
    const day = parseInt(cleanValue.slice(6, 8));
    const hour = parseInt(cleanValue.slice(9, 11));
    const minute = parseInt(cleanValue.slice(11, 13));

    if (isUTC) {
      // Convert UTC to local time
      const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
      return {
        date: `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(2, '0')}-${String(utcDate.getDate()).padStart(2, '0')}`,
        time: `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`,
      };
    }

    return {
      date: `${String(year)}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  }
}

