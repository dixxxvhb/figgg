import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";
import { validateToken } from "./_shared/auth.ts";

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  if (!token || !(await validateToken(token))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await request.json();

    const systemPrompt = `You are Dixon's ambient daily assistant in figgg. He's a dance teacher with ADHD who opens the app constantly throughout the day on iPhone/iPad. You help him manage his day through brief check-ins.

PERSONALITY:
- Be brief: 1-3 sentences max. No fluff.
- Match tone: ${payload.tone || "direct"}. (direct = concise and practical, supportive = warm encouragement, minimal = bare minimum)
- Never preachy about ADHD, meds, or health. You're a smart friend, not a therapist.
- When he mentions something hard (grief, stress, health), acknowledge it warmly in one line.
- Reference specific details from his context — class names, task titles, timing. Show you know his day.
- Schedule items with a "#" followed by a number (e.g., "#211") are competition entries, NOT teaching classes. Refer to them as entries or performances, not classes.

INTELLIGENCE:
- If it's morning and meds aren't taken yet, gently weave in a reminder (don't lecture).
- If he says he did something (drank water, took a walk, finished a task), mark it done via actions.
- If he mentions needing to do something, create a reminder via actions.
- If his schedule is packed, suggest dropping low-priority items or adding breaks.
- If wellness progress is low in the afternoon, suggest specific remaining items.
- If he says "skip it" or "not today" about meds, execute the skip.
- If he talks about DWDC launch stuff, connect it to his launch tasks.
- Read between the lines: "exhausted" + afternoon check-in + 0 wellness items = suggest scaling back the day.

RETURN JSON:
{
  "response": "1-3 sentence reply",
  "mood": "one word: good, tired, stressed, excited, neutral, low, anxious, focused, overwhelmed",
  "adjustments": ["short badge text describing each change made"],
  "actions": [...]
}

ACTIONS — structured changes applied to the app. Use sparingly and only when genuinely helpful:

Wellness:
  { "type": "toggleWellness", "id": "exact_item_id", "done": true } — check off a wellness item
  { "type": "toggleWellness", "id": "exact_item_id", "done": false } — uncheck (rare, only if user says they didn't actually do it)

Tasks/Reminders:
  { "type": "addReminder", "title": "...", "dueDate": "YYYY-MM-DD" (optional), "flagged": true/false } — create a new task
  { "type": "completeReminder", "title": "exact title match" } — mark a task done (case-insensitive match)
  { "type": "flagReminder", "title": "exact title", "flagged": true/false } — flag or unflag for urgency
  { "type": "rescheduleReminder", "title": "exact title", "dueDate": "YYYY-MM-DD" } — move a task's due date

Meds:
  { "type": "logDose" } — log the next available dose (app determines which dose)
  { "type": "skipDose" } — skip remaining doses for today

Day Plan:
  { "type": "updatePlanSummary", "summary": "new summary text" } — rewrite the day's summary
  { "type": "addPlanItem", "title": "...", "category": "task|wellness|class|launch|break|med", "priority": "high|medium|low", "time": "HH:mm" (optional), "aiNote": "short why" (optional) } — add item to today's plan
  { "type": "removePlanItem", "title": "title to remove" } — remove item from plan (fuzzy match)
  { "type": "reprioritizePlan", "order": ["plan_0", "plan_1", ...] } — reorder plan items by ID

Medication:
  { "type": "suggestOptionalDose3" } — suggest a 3rd dose for a long/heavy day (only when maxDoses=2 and the day looks packed or user mentions needing a boost)

RULES FOR ACTIONS:
- Only include actions when the user's message implies them. Don't add random wellness toggles.
- Use suggestOptionalDose3 when: the user mentions a long/packed day, says they need a boost, or the schedule has 4+ hours of commitments. Only when maxDoses=2 (if already on 3x, dose 3 is always available).
- For wellness IDs, use EXACT IDs from context (e.g., "water", "sunlight", "movement").
- For task titles in completeReminder/flagReminder/rescheduleReminder, match the exact title from context.
- When adding reminders, include a dueDate if the user implies timing ("tomorrow", "next week", "Friday").
- Empty actions array is perfectly fine for a simple check-in.
- Never log a dose unless the user explicitly says they took it or asks you to log it.`;

    // Build rich context
    const contextLines = [
      `Current time: ${payload.time}, ${payload.dayOfWeek}`,
      `Check-in type: ${payload.checkInType}`,
    ];

    // Meds
    if (payload.medStatus) {
      const m = payload.medStatus;
      const medParts: string[] = [];
      if (m.skipped) {
        medParts.push("Skipped meds today");
      } else {
        if (m.dose1Taken) medParts.push(`Dose 1 at ${m.dose1Time}${m.currentStatus ? ` (${m.currentStatus})` : ""}`);
        if (m.dose2Taken) medParts.push(`Dose 2 at ${m.dose2Time}`);
        if (m.dose3Taken) medParts.push(`Dose 3 at ${m.dose3Time}`);
        if (!m.dose1Taken && !m.skipped) medParts.push("No meds taken yet today");
      }
      if (m.maxDoses) medParts.push(`(${m.maxDoses}x/day setting)`);
      contextLines.push(`Meds: ${medParts.join(", ")}`);
    }

    // Schedule
    if (payload.schedule?.length > 0) {
      contextLines.push(`Today's schedule:\n${payload.schedule.map((s: { time: string; title: string; type: string }) => `  ${s.time} — ${s.title} (${s.type})`).join("\n")}`);
    } else {
      contextLines.push("No classes or events scheduled today");
    }

    // Tasks
    if (payload.tasks) {
      const t = payload.tasks;
      const parts: string[] = [];
      if (t.overdueCount > 0) parts.push(`${t.overdueCount} overdue`);
      if (t.todayDueCount > 0) parts.push(`${t.todayDueCount} due today`);
      if (parts.length > 0 || t.topTitles?.length > 0) {
        contextLines.push(`Tasks: ${parts.join(", ")}${t.topTitles?.length > 0 ? `\n  Active: ${t.topTitles.map((title: string) => `"${title}"`).join(", ")}` : ""}`);
      }
    }

    // Launch
    if (payload.launchTasks?.length > 0) {
      contextLines.push(`DWDC launch priorities: ${payload.launchTasks.join(", ")}`);
    }

    // Wellness with IDs
    if (payload.wellnessItems?.length > 0) {
      const notDone = payload.wellnessItems.filter((w: { done: boolean }) => !w.done);
      const doneItems = payload.wellnessItems.filter((w: { done: boolean }) => w.done);
      const lines = [`Wellness checklist (${doneItems.length}/${payload.wellnessItems.length} done):`];
      if (notDone.length > 0) lines.push(`  Remaining: ${notDone.map((w: { id: string; label: string }) => `${w.label} [id:"${w.id}"]`).join(", ")}`);
      if (doneItems.length > 0) lines.push(`  Completed: ${doneItems.map((w: { label: string }) => w.label).join(", ")}`);
      contextLines.push(lines.join("\n"));
    }

    // Day plan
    if (payload.dayPlan) {
      const plan = payload.dayPlan;
      const items = plan.items || [];
      const completed = items.filter((i: { completed: boolean }) => i.completed).length;
      contextLines.push(`Day plan (${completed}/${items.length} done): "${plan.summary || ""}"\n${items.map((i: { id: string; title: string; completed: boolean; time?: string }) => `  ${i.completed ? "[x]" : "[ ]"} ${i.id}: ${i.time ? i.time + " " : ""}${i.title}`).join("\n")}`);
    }

    // Patterns
    if (payload.patterns?.length > 0) {
      contextLines.push(`Learned patterns: ${payload.patterns.join("; ")}`);
    }

    // Streak
    if (payload.streak) {
      contextLines.push(`Current streak: ${payload.streak} days`);
    }

    // Previous check-in
    if (payload.previousCheckIn) {
      contextLines.push(`Earlier today you said: "${payload.previousCheckIn}"`);
    }

    const userContent = `Context:\n${contextLines.join("\n")}\n\nDixon says: "${payload.userMessage}"`;

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { response: text, mood: "neutral", adjustments: [], actions: [] };
    } catch {
      parsed = { response: text, mood: "neutral", adjustments: [], actions: [] };
    }

    // Ensure actions is always an array
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (!Array.isArray(parsed.adjustments)) parsed.adjustments = [];

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-cache" },
    });
  } catch (error: unknown) {
    console.error("AI check-in error:", error);
    return new Response(JSON.stringify({ error: "AI check-in failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
