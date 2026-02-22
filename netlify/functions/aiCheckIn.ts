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
- WEEKLY REFLECTION: On Friday afternoon or Sunday, ask a brief reflective question: "What went well this week?" or "Anything you want to do differently next week?" If he answers, capture it with addWeekReflection. Extract key themes into wentWell, challenges, nextWeekFocus. Write a 1-sentence aiSummary. Don't force it — if he just wants a normal check-in, that's fine.
- If the schedule has competition entries (titles with "#" + number), set dayMode to "comp" if not already set. Comp days = focus on performance, suppress busywork.
- If schedule is heavy (4+ hours of classes), consider setting dayMode to "intense" for extra fuel items.

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
  { "type": "batchToggleWellness", "ids": ["id1", "id2", ...], "done": true } — check off multiple wellness items at once (use when user mentions doing several things)

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
  { "type": "reschedulePlanItem", "title": "item title", "time": "HH:mm" } — move a plan item to a new time
  { "type": "reprioritizePlan", "order": ["plan_0", "plan_1", ...] } — reorder plan items by ID

Medication:
  { "type": "suggestOptionalDose3" } — suggest a 3rd dose for a long/heavy day (only when maxDoses=2 and the day looks packed or user mentions needing a boost)

Day Mode:
  { "type": "setDayMode", "dayMode": "light" } — light day: fewer commitments, focus on rest/recovery
  { "type": "setDayMode", "dayMode": "intense" } — heavy teaching/rehearsal day, needs extra fuel
  { "type": "setDayMode", "dayMode": "comp" } — competition day: performance-focused, strip non-essentials

Week Reflection:
  { "type": "addWeekReflection", "wentWell": "...", "challenges": "...", "nextWeekFocus": "...", "aiSummary": "1-sentence week summary" } — capture weekly reflection

Class Exceptions (use todayClassList from context for IDs):
  { "type": "markClassException", "scope": "all", "exceptionType": "cancelled", "reason": "sick" } — cancel all today's classes
  { "type": "markClassException", "scope": "all", "exceptionType": "subbed", "subName": "Jasmine" } — mark all today's classes as covered by a sub
  { "type": "markClassException", "scope": "specific", "classIds": ["class-id-1", "class-id-2"], "exceptionType": "subbed", "subName": "Jasmine" } — mark specific classes only
  Valid reasons: "sick", "personal", "holiday", "other"

Class Notes (use weekClassList from context to resolve class name → ID):
  { "type": "addClassNote", "classId": "...", "text": "...", "noteCategory": "needs-work" } — add a live note to a class this week
  { "type": "setClassPlan", "classId": "...", "plan": "..." } — set the weekly plan for a class
  { "type": "setNextWeekGoal", "classId": "...", "goal": "..." } — set the next-week goal for a class
  Valid noteCategories: "worked-on", "needs-work", "next-week", "ideas"

Launch Plan (use launchTaskList from context for IDs):
  { "type": "completeLaunchTask", "taskId": "..." } — mark a DWDC launch task complete
  { "type": "skipLaunchTask", "taskId": "..." } — skip a DWDC launch task
  { "type": "addLaunchNote", "taskId": "...", "note": "..." } — add a note to a launch task

Rehearsal Notes (use competitionDanceList from context for IDs):
  { "type": "addRehearsalNote", "danceId": "...", "notes": "...", "workOn": ["item1", "item2"] } — add rehearsal note to a competition dance

RULES FOR ACTIONS:
- Only include actions when the user's message implies them. Don't add random wellness toggles.
- Use suggestOptionalDose3 when: the user mentions a long/packed day, says they need a boost, or the schedule has 4+ hours of commitments. Only when maxDoses=2 (if already on 3x, dose 3 is always available).
- For wellness IDs, use EXACT IDs from context (e.g., "water", "sunlight", "movement").
- For task titles in completeReminder/flagReminder/rescheduleReminder, match the exact title from context.
- When adding reminders, include a dueDate if the user implies timing ("tomorrow", "next week", "Friday").
- Empty actions array is perfectly fine for a simple check-in.
- Never log a dose unless the user explicitly says they took it or asks you to log it.
- Use reschedulePlanItem when user says things like "push X to after class", "move X to 3pm". Match the title from the day plan items in context.
- Use batchToggleWellness when user lists multiple completed activities ("drank water, ate, went for a walk") — more efficient than multiple toggleWellness actions.
- Use setDayMode when: user says it's a light/chill day → "light"; packed teaching/rehearsal → "intense"; competition day → "comp". This adapts the wellness checklist and plan. Don't set "normal" — that's the default.
- If the context already shows a dayMode, don't re-set it unless the user explicitly wants to change it.
- CLASS EXCEPTIONS: When user says they're sick, calling out, or found/have a sub for today → use markClassException. Use scope "all" unless they specify which classes. Resolve sub name exactly as said. Use reason: sick/personal/holiday/other as appropriate.
- CLASS NOTES: When user mentions a note, observation, or plan for a specific class → use addClassNote or setClassPlan. Match the class name from weekClassList (fuzzy is ok, e.g., "Ballet 1" matches "Ballet 1 Beginner"). If ambiguous (multiple plausible matches), ask in your response instead of guessing.
- LAUNCH TASKS: When user says they finished, skipped, or wants to note something about a DWDC task → use completeLaunchTask/skipLaunchTask/addLaunchNote. Match from launchTaskList.
- REHEARSAL NOTES: When user mentions rehearsal notes or working on a competition piece → use addRehearsalNote. Match dance from competitionDanceList.
- FUZZY RESOLUTION: You must always include the actual ID (from the lookup lists) in actions, not the name. If you can't confidently match a name to an ID, ask for clarification instead.`;

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
    if (payload.launchTaskList?.length > 0) {
      contextLines.push(`DWDC launch tasks (use taskId for actions):\n${payload.launchTaskList.map((t: { id: string; title: string; category: string; milestone: boolean }) => `  [${t.id}] ${t.milestone ? '★ ' : ''}${t.title} (${t.category})`).join("\n")}`);
    } else if (payload.launchTasks?.length > 0) {
      contextLines.push(`DWDC launch priorities: ${payload.launchTasks.join(", ")}`);
    }

    // Today's classes with IDs (for class exception + note actions)
    if (payload.todayClassList?.length > 0) {
      contextLines.push(`Today's classes (use classId for actions):\n${payload.todayClassList.map((c: { id: string; name: string; startTime: string }) => `  [${c.id}] ${c.startTime} — ${c.name}`).join("\n")}`);
    }

    // This week's full class list (for class note actions targeting any day)
    if (payload.weekClassList?.length > 0) {
      contextLines.push(`All classes this week (use classId for notes):\n${payload.weekClassList.map((c: { id: string; name: string; day: string; startTime: string }) => `  [${c.id}] ${c.day} ${c.startTime} — ${c.name}`).join("\n")}`);
    }

    // Competition dances (for rehearsal note actions)
    if (payload.competitionDanceList?.length > 0) {
      contextLines.push(`Competition dances (use danceId for rehearsal notes):\n${payload.competitionDanceList.map((d: { id: string; registrationName: string; songTitle: string }) => `  [${d.id}] ${d.registrationName} — "${d.songTitle}"`).join("\n")}`);
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

    // Day mode
    if (payload.dayMode) {
      contextLines.push(`Day mode: ${payload.dayMode} (adapts wellness + plan)`);
    }

    // Patterns
    if (payload.patterns?.length > 0) {
      contextLines.push(`Learned patterns: ${payload.patterns.join("; ")}`);
    }

    // Streak
    if (payload.streak) {
      contextLines.push(`Current streak: ${payload.streak} days`);
    }

    // Last week reflection
    if (payload.lastReflection) {
      contextLines.push(`Last week's reflection: ${payload.lastReflection}`);
    }

    // Previous check-in
    if (payload.previousCheckIn) {
      contextLines.push(`Earlier today you said: "${payload.previousCheckIn}"`);
    }

    const userContent = `Context:\n${contextLines.join("\n")}\n\nDixon says: "${payload.userMessage}"`;

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
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
