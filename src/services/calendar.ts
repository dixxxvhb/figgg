import { CalendarEvent } from '../types';

// Generate a stable ID based on event content so IDs persist across syncs
function generateStableId(title: string, date: string, startTime: string): string {
  const str = `${title}-${date}-${startTime}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `cal-${Math.abs(hash).toString(36)}`;
}

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

function parseICS(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsText.split(/\r?\n/);

  let currentEvent: Partial<CalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle line continuations (lines starting with space/tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[++i].slice(1);
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.title && currentEvent.date) {
        // Generate stable ID based on content so it persists across syncs
        currentEvent.id = generateStableId(
          currentEvent.title,
          currentEvent.date,
          currentEvent.startTime || '00:00'
        );
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');

      if (key.startsWith('SUMMARY')) {
        // Unescape ICS format characters
        currentEvent.title = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (key.startsWith('DTSTART')) {
        const { date, time } = parseDTValue(key, value);
        currentEvent.date = date;
        currentEvent.startTime = time;
      } else if (key.startsWith('DTEND')) {
        const { time } = parseDTValue(key, value);
        currentEvent.endTime = time;
      } else if (key.startsWith('LOCATION')) {
        currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (key.startsWith('DESCRIPTION')) {
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      }
    }
  }

  return events;
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

// Filter events for a specific date
export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = date.toISOString().split('T')[0];
  return events.filter(e => e.date === dateStr);
}

// Check if a date is a weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Generate Apple Calendar subscription URL instructions
export function getAppleCalendarInstructions(): string {
  return `To connect your Apple Calendar:

1. Open Calendar app on your Mac
2. Go to Calendar > Preferences > Accounts
3. Click the "+" to add an account
4. Choose "Other CalDAV Account"
5. Or, you can share a specific calendar:
   - Right-click on a calendar in the sidebar
   - Choose "Share Calendar"
   - Enable "Public Calendar"
   - Copy the URL and paste it in Settings

Alternatively, sync your Apple Calendar to Google Calendar for easier integration.`;
}
