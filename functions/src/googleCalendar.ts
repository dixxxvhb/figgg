import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google, calendar_v3 } from "googleapis";
import { requireAuth } from "./utils/auth";

// Reuse the same OAuth client as Gmail (same credentials, refresh token has calendar.events scope)
function getCalendarClient(): calendar_v3.Calendar {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new HttpsError("failed-precondition", "Google Calendar credentials not configured");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

interface CalendarEventInput {
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime?: string;   // HH:mm
  location?: string;
  description?: string;
}

interface UpdateCalendarEventInput extends CalendarEventInput {
  googleCalendarEventId: string;
}

// Create a Google Calendar event
export const createGoogleCalendarEvent = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { title, date, startTime, endTime, location, description } = request.data as CalendarEventInput;

    if (!title || !date || !startTime) {
      throw new HttpsError("invalid-argument", "title, date, and startTime are required");
    }

    try {
      const calendar = getCalendarClient();

      // Build start/end DateTime strings in America/New_York
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = endTime
        ? `${date}T${endTime}:00`
        : `${date}T${addHour(startTime)}:00`; // Default 1 hour duration

      const event: calendar_v3.Schema$Event = {
        summary: title,
        start: { dateTime: startDateTime, timeZone: "America/New_York" },
        end: { dateTime: endDateTime, timeZone: "America/New_York" },
        ...(location && { location }),
        ...(description && { description }),
      };

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      return {
        googleCalendarEventId: res.data.id,
        htmlLink: res.data.htmlLink,
      };
    } catch (error) {
      console.error("Failed to create Google Calendar event:", error);
      throw new HttpsError("internal", "Failed to create calendar event");
    }
  }
);

// Update an existing Google Calendar event
export const updateGoogleCalendarEvent = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { googleCalendarEventId, title, date, startTime, endTime, location, description } =
      request.data as UpdateCalendarEventInput;

    if (!googleCalendarEventId) {
      throw new HttpsError("invalid-argument", "googleCalendarEventId is required");
    }

    try {
      const calendar = getCalendarClient();

      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = endTime
        ? `${date}T${endTime}:00`
        : `${date}T${addHour(startTime)}:00`;

      const event: calendar_v3.Schema$Event = {
        summary: title,
        start: { dateTime: startDateTime, timeZone: "America/New_York" },
        end: { dateTime: endDateTime, timeZone: "America/New_York" },
        ...(location && { location }),
        ...(description && { description }),
      };

      const res = await calendar.events.update({
        calendarId: "primary",
        eventId: googleCalendarEventId,
        requestBody: event,
      });

      return {
        googleCalendarEventId: res.data.id,
        htmlLink: res.data.htmlLink,
      };
    } catch (error) {
      console.error("Failed to update Google Calendar event:", error);
      throw new HttpsError("internal", "Failed to update calendar event");
    }
  }
);

// Delete a Google Calendar event
export const deleteGoogleCalendarEvent = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { googleCalendarEventId } = request.data as { googleCalendarEventId: string };

    if (!googleCalendarEventId) {
      throw new HttpsError("invalid-argument", "googleCalendarEventId is required");
    }

    try {
      const calendar = getCalendarClient();

      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleCalendarEventId,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error);
      throw new HttpsError("internal", "Failed to delete calendar event");
    }
  }
);

// Fetch upcoming events from Google Calendar (for sync)
export const fetchGoogleCalendarEvents = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { daysAhead = 90, daysBehind = 7 } = (request.data || {}) as {
      daysAhead?: number;
      daysBehind?: number;
    };

    try {
      const calendar = getCalendarClient();

      const now = new Date();
      const timeMin = new Date(now);
      timeMin.setDate(timeMin.getDate() - daysBehind);
      const timeMax = new Date(now);
      timeMax.setDate(timeMax.getDate() + daysAhead);

      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,  // Expand recurring events
        orderBy: "startTime",
        maxResults: 250,
      });

      const events = (res.data.items || []).map((e) => ({
        googleCalendarEventId: e.id,
        title: e.summary || "",
        date: e.start?.date || (e.start?.dateTime ? e.start.dateTime.slice(0, 10) : ""),
        startTime: extractTime(e.start?.dateTime),
        endTime: extractTime(e.end?.dateTime),
        location: e.location || "",
        description: e.description || "",
        isAllDay: !!e.start?.date,
      }));

      return { events };
    } catch (error) {
      console.error("Failed to fetch Google Calendar events:", error);
      throw new HttpsError("internal", "Failed to fetch calendar events");
    }
  }
);

// Helper: add 1 hour to HH:mm string
function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Helper: extract HH:mm from ISO datetime string
function extractTime(dateTime?: string | null): string {
  if (!dateTime) return "";
  // dateTime format: 2026-03-20T14:00:00-04:00
  const match = dateTime.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}
