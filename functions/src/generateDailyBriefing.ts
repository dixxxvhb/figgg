import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { requireAuth } from "./utils/auth";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const db = admin.firestore();

// JARVIS principles for system prompt context
const JARVIS_CONTEXT = `Dixon has ADHD (medicated with stimulants). His brain runs on an interest-based nervous system.
Motivated by: interest, novelty, challenge, urgency. NOT by guilt or obligation.
Key patterns: time blindness, rejection sensitive dysphoria, late-diagnosed identity reconstruction.
Design principles: externalize everything, remove friction, interest over guilt, urgency without panic, structure without rigidity, quiet validation, focused containers, integrated identity.
Current state: grieving mother's death (March 14, 2026), leaving CAA after 9 years (June 1), launching DWDC.
Tone: direct, dark humor welcome, never clinical. He's not fragile, he's in pain. Push when needed.`;

interface EmailSummary {
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface BriefingData {
  date: string;
  classes: Array<{ name: string; startTime: string; endTime: string; day: string }>;
  calendarEvents: Array<{ title: string; date: string; startTime: string; endTime?: string }>;
  selfCare: Record<string, unknown> | undefined;
  dayPlan: Record<string, unknown> | undefined;
  launchPlan: Record<string, unknown> | undefined;
  reminders: Array<{ title: string; dueDate?: string; flagged: boolean; completed: boolean }>;
  emails: EmailSummary[];
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

    // Fetch last 24 hours of emails (unread + important)
    const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `after:${oneDayAgo} -category:promotions -category:social`,
      maxResults: 20,
    });

    const messageIds = res.data.messages || [];
    if (messageIds.length === 0) return [];

    // Fetch message details in parallel (batch of up to 20)
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

        // Extract sender name from "Name <email>" format
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

  // 2. Read Firestore data
  const userRoot = `users/${userId}`;

  const [classesSnap, eventsSnap, selfCareSnap, dayPlanSnap, launchPlanSnap] = await Promise.all([
    db.collection(`${userRoot}/classes`).get(),
    db.collection(`${userRoot}/calendarEvents`).get(),
    db.doc(`${userRoot}/singletons/selfCare`).get(),
    db.doc(`${userRoot}/singletons/dayPlan`).get(),
    db.doc(`${userRoot}/singletons/launchPlan`).get(),
  ]);

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

  // Filter calendar events to today
  const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;
  const todayEvents = allEvents
    .filter(e => e.date === todayStr)
    .map(e => ({
      title: e.title as string,
      date: e.date as string,
      startTime: (e.startTime as string) || "",
      endTime: e.endTime as string | undefined,
    }));

  // Upcoming 7 days events
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysStr = `${sevenDaysOut.getFullYear()}-${String(sevenDaysOut.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysOut.getDate()).padStart(2, "0")}`;
  const upcoming7Days = allEvents
    .filter(e => (e.date as string) > todayStr && (e.date as string) <= sevenDaysStr)
    .map(e => ({ date: e.date as string, title: e.title as string, calendarName: "" }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const selfCare = selfCareSnap.exists ? selfCareSnap.data() : undefined;
  const dayPlan = dayPlanSnap.exists ? dayPlanSnap.data() : undefined;
  const launchPlan = launchPlanSnap.exists ? launchPlanSnap.data() : undefined;

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
    launchPlan,
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

RETURN JSON with this exact shape:
{
  "summary": "The full briefing text above",
  "nudge": "The nudge as a standalone string (or null if nothing to nudge about)",
  "yesterdayYou": ["list", "of", "yesterday", "actions"],
  "wellness": {
    "medsStatus": { "onTrack": boolean, "missedRecently": boolean },
    "moodTrend": "improving" | "stable" | "declining" | null
  },
  "deadlines": [{ "description": "string", "dueDate": "YYYY-MM-DD", "daysLeft": number }],
  "email": {
    "needsResponse": [{ "from": "name", "subject": "...", "snippet": "...", "date": "...", "priority": "high" | "normal" }],
    "actionRequired": [{ "from": "name", "subject": "...", "snippet": "...", "actionType": "payment/signup/deadline/etc" }],
    "fyiCount": number,
    "marketingCount": number
  }
}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: "user", content: contextString }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
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
    };
  }

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

  // Calendar events
  if (data.calendarEvents.length > 0) {
    lines.push(`\nToday's events:`);
    for (const e of data.calendarEvents) {
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

  // Launch plan
  if (data.launchPlan) {
    const lp = data.launchPlan;
    const tasks = ((lp.tasks || []) as Array<Record<string, unknown>>)
      .filter(t => !t.completed && !t.skipped);
    if (tasks.length > 0) {
      const milestones = tasks.filter(t => t.milestone);
      lines.push(`\nLaunch plan: ${tasks.length} active tasks${milestones.length > 0 ? ` (${milestones.length} milestones)` : ""}`);
      const upcoming = tasks
        .filter(t => t.scheduledDate && (t.scheduledDate as string) <= data.date)
        .slice(0, 3);
      if (upcoming.length > 0) {
        lines.push(`  Due/overdue: ${upcoming.map(t => t.title).join(", ")}`);
      }
    }
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
