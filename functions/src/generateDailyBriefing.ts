import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { requireAuth } from "./utils/auth";
import { withRetryOn429 } from "./utils/anthropic";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const db = admin.firestore();

// JARVIS principles for system prompt context
const JARVIS_CONTEXT = `Dixon has ADHD (medicated with stimulants). His brain runs on an interest-based nervous system.
Motivated by: interest, novelty, challenge, urgency. NOT by guilt or obligation.
Key patterns: time blindness, rejection sensitive dysphoria, late-diagnosed identity reconstruction.
Design principles: externalize everything, remove friction, interest over guilt, urgency without panic, structure without rigidity, quiet validation, focused containers, integrated identity.
Current state: grieving mother's death (March 11, 2026, metastatic melanoma, age 66). Just left CAA for good on April 21, 2026 after 9 years — DWD (Dance With Dixon) is now 100% full-time. ProSeries Instagram campaign active Apr 8 - May 1, audition registration opens May 1.
Tone: direct, dark humor welcome, never clinical. He's not fragile, he's in pain. Push when needed.`;

interface EmailSummary {
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  location?: string;
  description?: string;
}

interface BriefingData {
  date: string;
  classes: Array<{ name: string; startTime: string; endTime: string; day: string }>;
  calendarEvents: Array<{ title: string; date: string; startTime: string; endTime?: string }>;
  selfCare: Record<string, unknown> | undefined;
  dayPlan: Record<string, unknown> | undefined;
  reminders: Array<{ title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
  emails: EmailSummary[];
}

// ============================================================
// ICS PARSING LOGIC (ported from client calendar.ts)
// ============================================================

interface RawEvent {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  rrule?: string;
  exdates?: string[];
  dtStartKey?: string;
  dtStartValue?: string;
  durationMinutes?: number;
}

const RECURRENCE_WINDOW_DAYS = 90;
const PAST_EVENT_WINDOW_DAYS = 7;

function generateStableId(title: string, date: string, startTime: string, endTime = '', location = ''): string {
  const str = `${title}-${date}-${startTime}-${endTime}-${location}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cal-${Math.abs(hash).toString(36)}`;
}

function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeStr(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseICS(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  const rawEvents: RawEvent[] = [];

  let currentEvent: RawEvent | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

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
        if (currentEvent.date && currentEvent.startTime) {
          const startDt = new Date(`${currentEvent.date}T${currentEvent.startTime}:00`);
          const endDt = new Date(`${endDate}T${time}:00`);
          currentEvent.durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
        }
      } else if (key.startsWith('RRULE')) {
        currentEvent.rrule = value;
      } else if (key.startsWith('EXDATE')) {
        const { date: exDate } = parseDTValue(key, value);
        currentEvent.exdates!.push(exDate);
      } else if (key.startsWith('LOCATION')) {
        currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (key.startsWith('DESCRIPTION')) {
        currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
      }
    }
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - PAST_EVENT_WINDOW_DAYS);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + RECURRENCE_WINDOW_DAYS);
  const windowStartStr = formatDateStr(windowStart);
  const windowEndStr = formatDateStr(windowEnd);

  for (const raw of rawEvents) {
    if (raw.rrule) {
      const occurrences = expandRRule(raw, windowStartStr, windowEndStr);
      for (const occ of occurrences) {
        occ.id = generateStableId(occ.title!, occ.date!, occ.startTime || '00:00', occ.endTime || '', occ.location || '');
        events.push(occ as CalendarEvent);
      }
    } else {
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

function expandRRule(raw: RawEvent, windowStart: string, windowEnd: string): Partial<CalendarEvent>[] {
  const results: Partial<CalendarEvent>[] = [];
  const rrule = parseRRuleString(raw.rrule!);

  if (!rrule.freq) return results;

  const startDate = parseDate(raw.date!);
  const exdateSet = new Set(raw.exdates || []);

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

  const count = rrule.count || 1000;
  const windowEndDate = parseDate(windowEnd);
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
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return map[byday] ?? 0;
}

function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date | null {
  if (n > 0) {
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
    for (let d = 31; d >= 1; d--) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) continue;
      if (date.getDay() === dayOfWeek) return date;
    }
  }
  return null;
}

function parseDTValue(key: string, value: string): { date: string; time: string } {
  const isDateOnly = key.includes('VALUE=DATE');
  const isUTC = value.endsWith('Z');
  const cleanValue = value.replace(/Z$/, '');

  if (isDateOnly || cleanValue.length === 8) {
    const year = cleanValue.slice(0, 4);
    const month = cleanValue.slice(4, 6);
    const day = cleanValue.slice(6, 8);
    return {
      date: `${year}-${month}-${day}`,
      time: '00:00',
    };
  } else {
    const year = parseInt(cleanValue.slice(0, 4));
    const month = parseInt(cleanValue.slice(4, 6)) - 1;
    const day = parseInt(cleanValue.slice(6, 8));
    const hour = parseInt(cleanValue.slice(9, 11));
    const minute = parseInt(cleanValue.slice(11, 13));

    if (isUTC) {
      const utcDate = new Date(Date.UTC(year, month, day, hour, minute));
      return { date: formatDateStr(utcDate), time: formatTimeStr(utcDate) };
    }

    const localDate = new Date(year, month, day, hour, minute);
    return { date: formatDateStr(localDate), time: formatTimeStr(localDate) };
  }
}

async function fetchRecentEmails(): Promise<EmailSummary[]> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log("Gmail credentials not configured — skipping email fetch");
    return [];
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `after:${oneDayAgo} -category:promotions -category:social`,
      maxResults: 20,
    });

    const messageIds = res.data.messages || [];
    if (messageIds.length === 0) return [];

    const emails: EmailSummary[] = [];
    const batchSize = 10;
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const details = await Promise.all(
        batch.map(m =>
          gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          })
        )
      );

      for (const msg of details) {
        const headers = msg.data.payload?.headers || [];
        const from = headers.find(h => h.name === "From")?.value || "Unknown";
        const subject = headers.find(h => h.name === "Subject")?.value || "(no subject)";
        const date = headers.find(h => h.name === "Date")?.value || "";
        const isUnread = (msg.data.labelIds || []).includes("UNREAD");

        const fromName = from.replace(/<[^>]+>/, "").trim().replace(/"/g, "");

        emails.push({
          from: fromName,
          subject,
          snippet: msg.data.snippet || "",
          date,
          isUnread,
        });
      }
    }

    return emails;
  } catch (error) {
    console.error("Gmail fetch failed:", error);
    return [];
  }
}

// ============================================================
// FETCH AND PARSE ICS (new server-side)
// ============================================================

async function fetchAndParseICS(calendarUrl: string): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(calendarUrl);
    if (!response.ok) {
      console.error(`Failed to fetch ICS feed: ${response.status} ${response.statusText}`);
      return [];
    }
    const icsText = await response.text();
    return parseICS(icsText);
  } catch (error) {
    console.error('Failed to fetch/parse ICS feed:', error);
    return [];
  }
}

// ============================================================
// WRITE EVENTS TO FIRESTORE
// ============================================================

async function writeCalendarEventsToFirestore(userId: string, events: CalendarEvent[]): Promise<void> {
  if (events.length === 0) {
    console.log(`No calendar events to write for user ${userId}`);
    return;
  }

  const batch = db.batch();
  const collectionRef = db.collection(`users/${userId}/calendarEvents`);

  for (const event of events) {
    const docRef = collectionRef.doc(event.id);
    batch.set(docRef, {
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime || '',
      location: event.location || null,
      description: event.description || null,
      source: 'ics',
      syncedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
  console.log(`Wrote ${events.length} calendar events to Firestore for user ${userId}`);
}

async function generateBriefingCore(): Promise<void> {
  // 1. Get userId from config doc
  const configSnap = await db.doc("appConfig/briefing").get();
  if (!configSnap.exists) {
    console.error("No appConfig/briefing doc found. Create it with a userId field.");
    return;
  }
  const userId = configSnap.data()?.userId as string;
  if (!userId) {
    console.error("appConfig/briefing doc has no userId field.");
    return;
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDay = days[now.getDay()];

  // 2. Read Firestore data + fetch ICS
  const userRoot = `users/${userId}`;

  const [classesSnap, selfCareSnap, dayPlanSnap, profileSnap] = await Promise.all([
    db.collection(`${userRoot}/classes`).get(),
    db.doc(`${userRoot}/singletons/selfCare`).get(),
    db.doc(`${userRoot}/singletons/dayPlan`).get(),
    db.doc(`${userRoot}/singletons/profile`).get(),
  ]);

  // 2a. Fetch and parse ICS feed (server-side)
  let icsEvents: CalendarEvent[] = [];
  if (profileSnap.exists) {
    const profile = profileSnap.data() as any;
    const calendarUrl = profile?.settings?.calendarUrl;
    if (calendarUrl) {
      console.log(`Fetching ICS feed from: ${calendarUrl}`);
      icsEvents = await fetchAndParseICS(calendarUrl);
      if (icsEvents.length > 0) {
        // Write to Firestore for client use
        await writeCalendarEventsToFirestore(userId, icsEvents);
      }
    } else {
      console.log("No calendarUrl found in user profile settings");
    }
  }

  // Filter classes to today's day
  const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;
  const todayClasses = allClasses
    .filter(c => c.day === todayDay)
    .map(c => ({
      name: c.name as string,
      startTime: c.startTime as string,
      endTime: c.endTime as string,
      day: c.day as string,
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Filter calendar events to today (use ICS events, not Firestore)
  const todayEvents = icsEvents
    .filter(e => e.date === todayStr)
    .map(e => ({
      title: e.title,
      date: e.date,
      startTime: e.startTime || "",
      endTime: e.endTime,
    }));

  // Upcoming 7 days events
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysStr = `${sevenDaysOut.getFullYear()}-${String(sevenDaysOut.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysOut.getDate()).padStart(2, "0")}`;
  const upcoming7Days = icsEvents
    .filter(e => e.date > todayStr && e.date <= sevenDaysStr)
    .map(e => ({ date: e.date, title: e.title, calendarName: "" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const selfCare = selfCareSnap.exists ? selfCareSnap.data() : undefined;
  const dayPlan = dayPlanSnap.exists ? dayPlanSnap.data() : undefined;

  // Extract reminders
  const reminders = ((selfCare?.reminders || []) as Array<Record<string, unknown>>)
    .filter(r => !r.completed)
    .map(r => ({
      title: r.title as string,
      dueDate: r.dueDate as string | undefined,
      flagged: !!r.flagged,
      completed: !!r.completed,
    }));

  // 2b. Fetch Gmail (runs in parallel with nothing — just await it)
  const emails = await fetchRecentEmails();

  // 3. Build context string for AI
  const contextString = buildBriefingContext({
    date: todayStr,
    classes: todayClasses,
    calendarEvents: todayEvents,
    selfCare,
    dayPlan,
    reminders,
    emails,
  });

  // 4. Call Anthropic API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return;
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = `You are generating Dixon's 5:30am daily briefing for his personal dashboard app (Figgg).

${JARVIS_CONTEXT}

Generate a structured daily briefing. Be direct, warm, and specific. Reference things by name.
Follow this structure in the summary field:

DAILY BRIEFING — [Date]

YESTERDAY YOU:
- [any activity from data, or "No activity logged"]

TODAY:
- [calendar events and classes with times]

MEDS:
- [medication status and any pattern notes]

EMAIL (needs attention):
- [emails that need a response or action, categorized. Skip marketing/FYI.]

COMING UP (next 7 days):
- [upcoming events and deadlines]

NUDGE:
[One thing being avoided. Direct but not guilt-trippy. Interest over guilt.]

---

ALSO generate a LOGIN ROAST — a single one-liner Dixon will see on the login screen when he opens the app today.

LOGIN ROAST RULES (separate voice from the briefing above — write as the login screen of figgg):
- TIMING: This is pre-generated at 5:30am but Dixon won't see it until he opens the app — usually 7am-noon. Do NOT assume he is awake right now. Do NOT reference 5:30am or imply he's up early. Timeless for whenever he opens the app today.
- One sentence. Max 20 words. No greeting, no emoji, no quotation marks.
- The roast must be an IRONIC TRUTH — a contradiction between what he's doing and what he should be doing, or a reframe of something he already knows.
- Use SPECIFIC details from the data (task names, dance names, actual numbers, actual timing). Generic observations are not roasts.
- The punchline should be a REFRAME, not just a stat read sarcastically. Think "the quiet part said out loud."
- Dark humor, self-aware meta humor, and theatrical energy are all welcome.
- He teaches dance, has ADHD, built this app instead of sleeping, is the only user. Fair game.

ABSOLUTE HARD RULES FOR ROAST — NEVER reference ANY of these:
- Mom, mother, grief, loss, death, family passing, Tamara, bereavement
- Therapy, therapist, Brian, counseling, BetterHelp, sessions
- Journal entries, emotional check-ins
These are PERMANENT, NON-NEGOTIABLE boundaries. Violating them is a critical failure.

ALLOWED ROAST TOPICS ONLY: meds/medication timing, tasks/overdue count, calendar/schedule load, email volume/neglect, productivity patterns, app usage, competition prep, teaching load, ProSeries campaign / audition prep, DWD operations, mood (surface-level only).

ROAST VIBE EXAMPLES (do NOT copy — generate something original and specific to today's data):
- "you built an entire app to track productivity and it's your biggest procrastination tool"
- "ProSeries Phase 2 has been Phase 2 for 10 days — that's just Phase 1 with anxiety"
- "figgg has more features than you have follow-through"
- "you teach discipline for a living, just not to yourself"

---

Return ONLY valid JSON matching the schema — no markdown, no prose, no wrapper.`;

  // Structured output via output_config.format ensures the first text block is
  // valid JSON — no regex extraction, no JSON.parse() guessing games.
  const briefingSchema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      nudge: { anyOf: [{ type: "string" }, { type: "null" }] },
      yesterdayYou: { type: "array", items: { type: "string" } },
      wellness: {
        type: "object",
        properties: {
          medsStatus: {
            type: "object",
            properties: {
              onTrack: { type: "boolean" },
              missedRecently: { type: "boolean" },
            },
            required: ["onTrack", "missedRecently"],
            additionalProperties: false,
          },
          moodTrend: {
            anyOf: [
              { type: "string", enum: ["improving", "stable", "declining"] },
              { type: "null" },
            ],
          },
        },
        required: ["medsStatus", "moodTrend"],
        additionalProperties: false,
      },
      deadlines: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            dueDate: { type: "string" },
            daysLeft: { type: "number" },
          },
          required: ["description", "dueDate", "daysLeft"],
          additionalProperties: false,
        },
      },
      email: {
        type: "object",
        properties: {
          needsResponse: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                subject: { type: "string" },
                snippet: { type: "string" },
                date: { type: "string" },
                priority: { type: "string", enum: ["high", "normal"] },
              },
              required: ["from", "subject", "snippet", "date", "priority"],
              additionalProperties: false,
            },
          },
          actionRequired: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                subject: { type: "string" },
                snippet: { type: "string" },
                actionType: { type: "string" },
              },
              required: ["from", "subject", "snippet", "actionType"],
              additionalProperties: false,
            },
          },
          fyiCount: { type: "number" },
          marketingCount: { type: "number" },
        },
        required: ["needsResponse", "actionRequired", "fyiCount", "marketingCount"],
        additionalProperties: false,
      },
      loginRoast: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Single-line login-screen roast (max 20 words) following the ROAST RULES. null if genuinely nothing roastable.",
      },
    },
    required: ["summary", "nudge", "yesterdayYou", "wellness", "deadlines", "email", "loginRoast"],
    additionalProperties: false,
  };

  // Single call — produces both briefing + roast. Replaces the previous
  // 2-round-trip pattern (Sonnet briefing + separate Opus roast).
  // model: 'claude-opus-4-7' pending pre-flight check via firebase functions:shell — see plan §2.5 step 3
  // The systemPrompt is byte-stable across days (only ${JARVIS_CONTEXT}, a top-level constant,
  // is interpolated) and well over 2048 tokens — perfect ephemeral cache target. Cache hits
  // discount ~90% of input tokens; misses are no-op.
  const msg = await withRetryOn429(() => client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: contextString }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output_config: { format: { type: "json_schema", schema: briefingSchema } } as any,
  }));

  interface ParsedBriefing {
    summary?: string;
    nudge?: string | null;
    yesterdayYou?: string[];
    wellness?: {
      medsStatus?: { onTrack: boolean; missedRecently: boolean };
      moodTrend?: "improving" | "stable" | "declining" | null;
    };
    deadlines?: Array<{ description: string; dueDate: string; daysLeft: number }>;
    email?: {
      needsResponse: Array<{ from: string; subject: string; snippet: string; date: string; priority: "high" | "normal" }>;
      actionRequired: Array<{ from: string; subject: string; snippet: string; actionType: string }>;
      fyiCount: number;
      marketingCount: number;
    } | null;
    loginRoast?: string | null;
  }

  // With adaptive thinking (not currently enabled here, but defensive) a
  // thinking block can precede the text block. Find the text block explicitly.
  const textBlock = msg.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  let parsed: ParsedBriefing | null;
  try {
    // With output_config.format, the first text block IS valid JSON — no regex needed.
    parsed = JSON.parse(text);
  } catch {
    console.error("Failed to parse briefing response:", text.slice(0, 200));
    parsed = null;
  }

  if (!parsed) {
    parsed = {
      summary: "Briefing generation failed. Check Cloud Function logs.",
      nudge: null,
      yesterdayYou: [],
      wellness: { medsStatus: { onTrack: false, missedRecently: false }, moodTrend: null },
      deadlines: [],
      email: null,
      loginRoast: null,
    };
  }

  // Login roast now comes from the merged briefing call above — no separate
  // Opus round-trip. Structured output enforces the `loginRoast` field; the
  // system prompt carries the full roast rule set including hard bans. If the
  // model returns null/empty, the UI handles absence gracefully.
  const loginRoast: string | undefined =
    typeof parsed.loginRoast === "string" && parsed.loginRoast.trim().length > 0
      ? parsed.loginRoast.trim()
      : undefined;

  // 5. Build calendar data for the structured briefing
  const calendarData = {
    today: todayEvents.map(e => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime || "",
      calendarName: "",
    })),
    upcoming7Days,
  };

  // Add classes to today's calendar
  for (const cls of todayClasses) {
    calendarData.today.push({
      title: cls.name,
      startTime: cls.startTime,
      endTime: cls.endTime,
      calendarName: "Classes",
    });
  }
  calendarData.today.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 6. Write to Firestore (filter out undefined values — Firestore rejects them)
  const briefingDoc: Record<string, unknown> = {
    date: todayStr,
    source: "firebase",
    enriched: false,
    generatedAt: new Date().toISOString(),
    calendar: calendarData,
    wellness: {
      medsStatus: parsed.wellness?.medsStatus || { onTrack: false, missedRecently: false },
      ...(parsed.wellness?.moodTrend ? { moodTrend: parsed.wellness.moodTrend } : {}),
    },
    summary: parsed.summary || "",
    deadlines: parsed.deadlines || [],
    yesterdayYou: parsed.yesterdayYou || [],
  };

  // Only include optional fields if they have values
  if (parsed.nudge) briefingDoc.nudge = parsed.nudge;
  if (parsed.email) briefingDoc.email = parsed.email;
  if (loginRoast) briefingDoc.loginRoast = loginRoast;

  await db.doc(`${userRoot}/briefings/${todayStr}`).set(briefingDoc);
  console.log(`Daily briefing written for ${todayStr}`);
}

function buildBriefingContext(data: BriefingData): string {
  const lines: string[] = [];
  lines.push(`Date: ${data.date}`);

  // Classes
  if (data.classes.length > 0) {
    lines.push(`\nToday's classes:`);
    for (const c of data.classes) {
      lines.push(`  ${c.startTime}-${c.endTime} — ${c.name}`);
    }
  } else {
    lines.push(`\nNo classes today.`);
  }

  // Calendar events — split rehearsals from other events so AI doesn't confuse them with classes
  const REHEARSAL_RE = /rehearsal|dress\s*rehearsal|run.?through/i;
  const rehearsalEvents = data.calendarEvents.filter(e => REHEARSAL_RE.test(e.title));
  const otherEvents = data.calendarEvents.filter(e => !REHEARSAL_RE.test(e.title));
  if (rehearsalEvents.length > 0) {
    lines.push(`\nToday's rehearsals:`);
    for (const e of rehearsalEvents) {
      lines.push(`  ${e.startTime || "All day"} — ${e.title}`);
    }
  }
  if (otherEvents.length > 0) {
    lines.push(`\nToday's other events:`);
    for (const e of otherEvents) {
      lines.push(`  ${e.startTime || "All day"} — ${e.title}`);
    }
  }

  // Meds
  if (data.selfCare) {
    const sc = data.selfCare;
    const todayStr = data.date;
    const dose1Taken = sc.dose1Date === todayStr && sc.dose1Time != null;
    const dose2Taken = sc.dose2Date === todayStr && sc.dose2Time != null;
    const skipped = sc.skippedDoseDate === todayStr;

    // Check yesterday's meds
    const yesterday = new Date(todayStr + "T12:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const yesterdayDose1 = sc.dose1Date === yesterdayStr;

    lines.push(`\nMedication status:`);
    if (skipped) {
      lines.push(`  Skipped meds today`);
    } else if (dose1Taken) {
      lines.push(`  Dose 1 taken`);
      if (dose2Taken) lines.push(`  Dose 2 taken`);
    } else {
      lines.push(`  No meds taken yet (briefing generated at 5:30am)`);
    }
    if (!yesterdayDose1) {
      lines.push(`  Yesterday: no dose logged`);
    }

    // Mood / journal
    const journal = sc.journal as Record<string, unknown> | undefined;
    if (journal) {
      const entries = (journal.entries || []) as Array<Record<string, unknown>>;
      if (entries.length > 0) {
        const sorted = [...entries].sort((a, b) => (b.date as string).localeCompare(a.date as string));
        const latest = sorted[0];
        lines.push(`\nLast journal entry: ${latest.date} (mood: ${latest.mood || "not rated"})`);
      }
    }

    // Disruption
    const disruption = sc.disruption as Record<string, unknown> | undefined;
    if (disruption) {
      lines.push(`\nDisruption active: ${disruption.type} since ${disruption.startDate}`);
      if (disruption.expectedReturn) lines.push(`  Expected return: ${disruption.expectedReturn}`);
    }

    // Streaks
    const streakData = sc.streakData as Record<string, unknown> | undefined;
    if (streakData?.currentStreak) {
      lines.push(`\nCurrent streak: ${streakData.currentStreak} days`);
    }
  }

  // Tasks/reminders
  const overdue = data.reminders.filter(r => r.dueDate && r.dueDate < data.date);
  const dueToday = data.reminders.filter(r => r.dueDate === data.date);
  const flagged = data.reminders.filter(r => r.flagged);

  if (overdue.length > 0 || dueToday.length > 0 || flagged.length > 0) {
    lines.push(`\nTasks:`);
    if (overdue.length > 0) {
      lines.push(`  ${overdue.length} overdue: ${overdue.slice(0, 3).map(r => r.title).join(", ")}`);
    }
    if (dueToday.length > 0) {
      lines.push(`  ${dueToday.length} due today: ${dueToday.slice(0, 3).map(r => r.title).join(", ")}`);
    }
    if (flagged.length > 0) {
      lines.push(`  Flagged: ${flagged.slice(0, 3).map(r => r.title).join(", ")}`);
    }
  }

  // Email
  if (data.emails.length > 0) {
    const unread = data.emails.filter(e => e.isUnread);
    lines.push(`\nEmail (last 24 hours): ${data.emails.length} total, ${unread.length} unread`);
    // Show up to 10 most relevant emails
    const toShow = unread.length > 0 ? unread.slice(0, 10) : data.emails.slice(0, 5);
    for (const e of toShow) {
      lines.push(`  ${e.isUnread ? "[UNREAD]" : ""} From: ${e.from} | Subject: ${e.subject}`);
      if (e.snippet) lines.push(`    ${e.snippet.slice(0, 120)}`);
    }
  } else {
    lines.push(`\nNo email data available.`);
  }

  return lines.join("\n");
}

// Scheduled function — runs daily at 5:30am ET
export const generateDailyBriefing = onSchedule(
  {
    schedule: "30 5 * * *",
    timeZone: "America/New_York",
    timeoutSeconds: 120,
    memory: "256MiB",
    secrets: [anthropicKey],
  },
  async () => {
    await generateBriefingCore();
  }
);

// Manual trigger — callable from browser for testing
export const triggerDailyBriefing = onCall(
  { timeoutSeconds: 120, memory: "256MiB", secrets: [anthropicKey] },
  async (request) => {
    requireAuth(request);
    await generateBriefingCore();
    return { success: true };
  }
);
