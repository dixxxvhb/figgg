import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";
import { validateToken } from "./_shared/auth.ts";

type Mode = "check-in" | "chat" | "briefing" | "day-plan" | "prep" | "capture" | "reflection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContextString(payload: any, mode: Mode): string {
  const contextLines: string[] = [];

  // Time and check-in type (shared across modes)
  if (payload.context?.time || payload.time) {
    const time = payload.context?.time || payload.time;
    const day = payload.context?.dayOfWeek || payload.dayOfWeek;
    const checkInType = payload.context?.checkInType || payload.checkInType;
    contextLines.push(`Current time: ${time}${day ? `, ${day}` : ""}`);
    if (checkInType) contextLines.push(`Check-in type: ${checkInType}`);
  }

  const ctx = payload.context || payload;

  // Meds
  if (ctx.medStatus) {
    const m = ctx.medStatus;
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
  if (ctx.schedule?.length > 0) {
    if (mode === "day-plan") {
      contextLines.push(`Fixed schedule:\n${ctx.schedule.map((s: { time: string; title: string; type: string; classId?: string }) => `  ${s.time} — ${s.title} (${s.type})${s.classId ? ` [classId: "${s.classId}"]` : ""}`).join("\n")}`);
    } else {
      contextLines.push(`Today's schedule:\n${ctx.schedule.map((s: { time: string; title: string; type: string }) => `  ${s.time} — ${s.title} (${s.type})`).join("\n")}`);
    }
  } else {
    contextLines.push(mode === "day-plan" ? "No classes or events today — open schedule." : "No classes or events scheduled today");
  }

  // Tasks
  if (ctx.tasks) {
    const t = ctx.tasks;
    if (mode === "day-plan") {
      if (t.topTitles?.length > 0) {
        contextLines.push(`Tasks (${t.overdueCount} overdue, ${t.todayDueCount} due today):\n${t.topTitles.map((title: string) => `  - "${title}"`).join("\n")}`);
      }
    } else {
      const parts: string[] = [];
      if (t.overdueCount > 0) parts.push(`${t.overdueCount} overdue`);
      if (t.todayDueCount > 0) parts.push(`${t.todayDueCount} due today`);
      if (parts.length > 0 || t.topTitles?.length > 0) {
        contextLines.push(`Tasks: ${parts.join(", ")}${t.topTitles?.length > 0 ? `\n  Active: ${t.topTitles.map((title: string) => `"${title}"`).join(", ")}` : ""}`);
      }
    }
  }

  // Launch tasks
  if (ctx.launchTaskList?.length > 0) {
    contextLines.push(`DWDC launch tasks (use taskId for actions):\n${ctx.launchTaskList.map((t: { id: string; title: string; category: string; milestone: boolean }) => `  [${t.id}] ${t.milestone ? "\u2605 " : ""}${t.title} (${t.category})`).join("\n")}`);
  } else if (ctx.launchTasks?.length > 0) {
    if (mode === "day-plan") {
      contextLines.push(`DWDC launch priorities:\n${ctx.launchTasks.map((t: string) => `  - ${t}`).join("\n")}`);
    } else {
      contextLines.push(`DWDC launch priorities: ${ctx.launchTasks.join(", ")}`);
    }
  }

  // Today's classes with IDs (includes exception status if cancelled/subbed)
  if (ctx.todayClassList?.length > 0) {
    contextLines.push(`Today's classes (use classId for actions):\n${ctx.todayClassList.map((c: { id: string; name: string; startTime: string; exception?: string; subName?: string }) => {
      let line = `  [${c.id}] ${c.startTime} — ${c.name}`;
      if (c.exception === 'cancelled') line += ' [CANCELLED]';
      if (c.exception === 'subbed') line += ` [SUB: ${c.subName || 'unknown'}]`;
      return line;
    }).join("\n")}`);
  }

  // This week's full class list
  if (ctx.weekClassList?.length > 0) {
    contextLines.push(`All classes this week (use classId for notes):\n${ctx.weekClassList.map((c: { id: string; name: string; day: string; startTime: string }) => `  [${c.id}] ${c.day} ${c.startTime} — ${c.name}`).join("\n")}`);
  }

  // Competition dances
  if (ctx.competitionDanceList?.length > 0) {
    contextLines.push(`Competition dances (use danceId for rehearsal notes):\n${ctx.competitionDanceList.map((d: { id: string; registrationName: string; songTitle: string }) => `  [${d.id}] ${d.registrationName} — "${d.songTitle}"`).join("\n")}`);
  }

  // Wellness with IDs
  if (ctx.wellnessItems?.length > 0) {
    const notDone = ctx.wellnessItems.filter((w: { done: boolean }) => !w.done);
    const doneItems = ctx.wellnessItems.filter((w: { done: boolean }) => w.done);
    if (mode === "day-plan") {
      if (notDone.length > 0) {
        contextLines.push(`Wellness checklist (${doneItems.length}/${ctx.wellnessItems.length} done):\n${notDone.map((w: { id: string; label: string }) => `  - ${w.label} [sourceId: "${w.id}"]`).join("\n")}`);
      } else {
        contextLines.push(`Wellness: All ${ctx.wellnessItems.length} items completed!`);
      }
    } else {
      const lines = [`Wellness checklist (${doneItems.length}/${ctx.wellnessItems.length} done):`];
      if (notDone.length > 0) lines.push(`  Remaining: ${notDone.map((w: { id: string; label: string }) => `${w.label} [id:"${w.id}"]`).join(", ")}`);
      if (doneItems.length > 0) lines.push(`  Completed: ${doneItems.map((w: { label: string }) => w.label).join(", ")}`);
      contextLines.push(lines.join("\n"));
    }
  } else if (ctx.wellnessProgress && mode === "day-plan") {
    contextLines.push(`Wellness: ${ctx.wellnessProgress.done}/${ctx.wellnessProgress.total} done`);
  }

  // Day plan
  if (ctx.dayPlan) {
    const plan = ctx.dayPlan;
    const items = plan.items || [];
    const completed = items.filter((i: { completed: boolean }) => i.completed).length;
    contextLines.push(`Day plan (${completed}/${items.length} done): "${plan.summary || ""}"\n${items.map((i: { id: string; title: string; completed: boolean; time?: string }) => `  ${i.completed ? "[x]" : "[ ]"} ${i.id}: ${i.time ? i.time + " " : ""}${i.title}`).join("\n")}`);
  }

  // Day mode
  if (ctx.dayMode) {
    if (mode === "day-plan") {
      const modeDescriptions: Record<string, string> = {
        light: "LIGHT DAY \u2014 fewer items, focus on rest and recovery. Include calming wellness (breathing, gentle walk). Skip intensive tasks.",
        intense: "INTENSE DAY \u2014 heavy teaching/rehearsal. Include extra nutrition/fuel items. Front-load admin tasks before classes.",
        comp: "COMPETITION DAY \u2014 performance-focused. Strip non-essential tasks. Include warmup, fuel, mental prep. Suppress DWDC work. Entries are the priority.",
      };
      contextLines.push(`Day mode: ${ctx.dayMode}\n${modeDescriptions[ctx.dayMode] || ""}`);
    } else {
      contextLines.push(`Day mode: ${ctx.dayMode} (adapts wellness + plan)`);
    }
  }

  // Patterns
  if (ctx.patterns?.length > 0) {
    contextLines.push(`Learned patterns: ${ctx.patterns.join("; ")}`);
  }

  // Streak
  if (ctx.streak) {
    contextLines.push(`Current streak: ${ctx.streak} days`);
  }

  // Last week reflection
  if (ctx.lastReflection) {
    contextLines.push(`Last week's reflection: ${ctx.lastReflection}`);
  }

  // Previous check-in (check-in and chat modes)
  if (ctx.previousCheckIn) {
    contextLines.push(`Earlier today you said: "${ctx.previousCheckIn}"`);
  }

  // Day-plan specific: mood and message from check-in
  if (mode === "day-plan") {
    if (ctx.checkInMood) contextLines.push(`Today's mood: ${ctx.checkInMood}`);
    if (ctx.checkInMessage) contextLines.push(`Dixon said: "${ctx.checkInMessage}"`);
  }

  // Day-plan specific: completed items
  if (mode === "day-plan" && ctx.completedItems?.length > 0) {
    contextLines.push(`Already completed today (DO NOT regenerate these):\n${ctx.completedItems.map((i: { title: string; category: string }) => `  - [DONE] ${i.title} (${i.category})`).join("\n")}`);
  }

  // Disruption context — relevant for chat, check-in, briefing, day-plan
  if (["chat", "check-in", "briefing", "day-plan"].includes(mode) && ctx.disruption) {
    const d = ctx.disruption;
    contextLines.push(`Disruption active: ${d.type} since ${d.startDate}\n  Expected return: ${d.expectedReturn || "unknown"}\n  Classes handled: ${d.classesHandled ? "yes" : "no"}\n  Tasks deferred: ${d.tasksDeferred ? "yes" : "no"}`);
  }

  // Prep mode: class prep context
  if (mode === "prep" && ctx.classPrep) {
    const cp = ctx.classPrep;
    contextLines.push(`Class: ${cp.className}\nLast week notes: ${cp.lastWeekNotes?.join("; ") || "none"}\nThis week plan: ${cp.thisWeekPlan || "none set"}\nChoreography: ${cp.choreographyNotes?.join("; ") || "none"}\nStudent flags: ${cp.studentFlags?.join("; ") || "none"}`);
  }

  // Capture mode: class capture context
  if (mode === "capture" && ctx.classCapture) {
    const cc = ctx.classCapture;
    contextLines.push(`Class: ${cc.className}\nPlanned content: ${cc.plannedContent || "none"}\nRaw notes: ${cc.rawDump}`);
  }

  return contextLines.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSystemPrompt(mode: Mode, payload: any): string {
  const ctx = payload.context || payload;

  switch (mode) {
    case "check-in":
      return `You are Dixon's ambient daily assistant in figgg. He's a dance teacher with ADHD who opens the app constantly throughout the day on iPhone/iPad. You help him manage his day through brief check-ins.

PERSONALITY:
- Be brief: 1-3 sentences max. No fluff.
- Match tone: ${ctx.tone || payload.tone || "direct"}. (direct = concise and practical, supportive = warm encouragement, minimal = bare minimum)
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

${getActionsReference(false)}`;

    case "chat":
      return `You are Dixon's ambient daily assistant in figgg. He's a dance teacher with ADHD who opens the app constantly throughout the day on iPhone/iPad. You help him manage his day through conversation.

This is a conversation. Respond to the latest message considering the full history.

PERSONALITY:
- Be brief: 1-3 sentences max. No fluff.
- Match tone: ${ctx.tone || payload.tone || "direct"}. (direct = concise and practical, supportive = warm encouragement, minimal = bare minimum)
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

DISRUPTION AUTONOMY:
- For disruptions, proactively suggest cancelling classes, deferring tasks, and assigning subs. Don't wait to be asked — if Dixon says he's sick, lead with practical steps.

RETURN JSON:
{
  "response": "1-3 sentence reply",
  "mood": "one word: good, tired, stressed, excited, neutral, low, anxious, focused, overwhelmed",
  "adjustments": ["short badge text describing each change made"],
  "actions": [...]
}

${getActionsReference(true)}`;

    case "briefing":
      return `You are Dixon's morning briefing generator. Create a personalized 2-4 sentence briefing for his day.
Cover: key classes/events, medication status, urgent tasks, and anything notable.
Be warm but concise. Reference specific items by name.
If disruption is active, acknowledge it and focus on recovery/return planning.
RETURN JSON: { "briefing": "2-4 sentence briefing text" }`;

    case "day-plan":
      return `You are Dixon's day planner in figgg. He's a dance teacher with ADHD. Generate a smart, prioritized daily plan that fits his actual schedule and energy.

PLANNING PHILOSOPHY:
- Build around FIXED items first (classes, events, med windows).
- Place high-focus tasks during peak medication hours (1-3 hours after dose).
- Place low-focus tasks (email, errands) during ramp-up or taper periods.
- Weave wellness items into natural gaps — don't cluster them all at once.
- Include 1-2 short breaks if the day has 3+ hours of commitments.
- Launch tasks get dedicated time blocks, not just "whenever."
- If dayMode is set, adapt the plan accordingly:
  - "light": 5-7 items max, include calming wellness, skip intensive tasks
  - "intense": front-load admin before classes, include extra nutrition breaks
  - "comp": performance-only plan — warmup, fuel, entries. Suppress DWDC/admin work entirely.

RULES:
- Items marked [DONE] in the context are ALREADY COMPLETED. Do NOT include them in your plan — they will be merged in automatically.
- Classes marked [CANCELLED] in today's classes should NOT be included in the plan. Skip them entirely.
- When re-planning mid-day, focus only on what's LEFT to do. The completed items are preserved separately.
- 5-12 NEW items max. Quality over quantity.
- Classes/events MUST appear at their exact times — these are non-negotiable.
- Use "time" field for items with specific suggested times. Omit for flexible items.
- Wellness items MUST use the exact sourceId provided in brackets.
- aiNote should be personal and contextual (5-10 words), not generic motivation.
  Good: "Peak focus from meds — deep work"
  Good: "Before class energy dip"
  Bad: "Important task"
  Bad: "Stay hydrated"
- If mood is tired/stressed/low, create a LIGHTER plan: fewer items, more breaks, easier wellness.
- If mood is good/excited/focused, create an AMBITIOUS plan: include stretch goals.
- Summary should be 1 sentence, specific to THIS day, not generic advice.
  Good: "Heavy teaching day — front-load DWDC work before 10am class."
  Bad: "A productive day awaits!"

RETURN JSON:
{
  "items": [
    {
      "id": "plan_0",
      "time": "09:00",
      "title": "...",
      "category": "task" | "wellness" | "class" | "launch" | "break" | "med",
      "sourceId": "..." (REQUIRED for wellness and class items, optional for others),
      "completed": false,
      "priority": "high" | "medium" | "low",
      "aiNote": "..." (optional, personal context)
    }
  ],
  "summary": "1-sentence day overview"
}

CATEGORY GUIDANCE:
- "class": teaching classes (from schedule, type=class). These are Dixon's regular teaching gigs. MUST include sourceId matching the classId from the schedule.
- "med": dose reminders ("Take dose 1", "Dose 2 window opens")
- "wellness": checklist items — MUST include sourceId matching the wellness ID
- "task": reminders/tasks from the task list
- "launch": DWDC launch plan items
- "break": suggested rest periods ("15min break", "Walk outside")

COMPETITION ENTRIES:
- Schedule items with type=event and a "#" followed by a number in the title (e.g., "#211 — Dance Name") are competition entries, NOT teaching classes.
- Use category "task" for competition entries, not "class".
- Competition entries have fixed times — treat them like class items (non-negotiable timing) but label them correctly.`;

    case "prep":
      return `You are Dixon's class prep assistant. Synthesize the provided class context into a 2-3 sentence preparation summary.
Cover: what was worked on last time, what's planned today, any student flags, choreography status.
Be practical and specific. This is a quick glance before walking into the studio.
RETURN JSON: { "response": "2-3 sentence prep summary" }`;

    case "capture":
      return `You are Dixon's post-class note organizer. Take his raw brain dump about a class and structure it into categorized notes.
Categories: "worked-on" (what was covered), "needs-work" (areas needing improvement), "next-week" (plans for next session), "ideas" (creative or pedagogical ideas)
Keep his voice — don't formalize or sterilize his notes. Just organize them.
RETURN JSON: { "response": "brief acknowledgment", "structuredNotes": [{ "text": "...", "category": "worked-on|needs-work|next-week|ideas" }] }`;

    case "reflection":
      return `You are Dixon's end-of-week reflection facilitator. Review the week's data and have a brief reflective conversation.
Ask one thoughtful question about the week. When he responds, capture the reflection.
Reference specific events, wins, and challenges from the context.
Don't force positivity — if it was a tough week, acknowledge that.
RETURN JSON: { "response": "reflection prompt or response", "actions": [...] }
(Use addWeekReflection action when you have enough for a reflection:
  { "type": "addWeekReflection", "wentWell": "...", "challenges": "...", "nextWeekFocus": "...", "aiSummary": "1-sentence week summary" })`;

    default:
      return "";
  }
}

function getActionsReference(includeDisruption: boolean): string {
  let actions = `ACTIONS — structured changes applied to the app. Use sparingly and only when genuinely helpful:

Wellness:
  { "type": "toggleWellness", "id": "exact_item_id", "done": true }
  { "type": "batchToggleWellness", "ids": ["id1", "id2", ...], "done": true }

Tasks/Reminders:
  { "type": "addReminder", "title": "...", "dueDate": "YYYY-MM-DD" (optional), "flagged": true/false }
  { "type": "completeReminder", "title": "exact title match" }
  { "type": "flagReminder", "title": "exact title", "flagged": true/false }
  { "type": "rescheduleReminder", "title": "exact title", "dueDate": "YYYY-MM-DD" }

Meds:
  { "type": "logDose" }
  { "type": "skipDose" }

Day Plan:
  { "type": "updatePlanSummary", "summary": "new summary text" }
  { "type": "addPlanItem", "title": "...", "category": "task|wellness|class|launch|break|med", "priority": "high|medium|low", "time": "HH:mm" (optional), "aiNote": "short why" (optional) }
  { "type": "removePlanItem", "title": "title to remove" }
  { "type": "reschedulePlanItem", "title": "item title", "time": "HH:mm" }
  { "type": "reprioritizePlan", "order": ["plan_0", "plan_1", ...] }

Medication:
  { "type": "suggestOptionalDose3" }

Day Mode:
  { "type": "setDayMode", "dayMode": "light|intense|comp" }

Week Reflection:
  { "type": "addWeekReflection", "wentWell": "...", "challenges": "...", "nextWeekFocus": "...", "aiSummary": "1-sentence week summary" }

Class Exceptions:
  { "type": "markClassException", "scope": "all|specific", "classIds": [...], "exceptionType": "cancelled|subbed", "subName": "...", "reason": "sick|personal|holiday|other" }

Class Notes:
  { "type": "addClassNote", "classId": "...", "text": "...", "noteCategory": "worked-on|needs-work|next-week|ideas" }
  { "type": "setClassPlan", "classId": "...", "plan": "..." }
  { "type": "setNextWeekGoal", "classId": "...", "goal": "..." }

Launch Plan:
  { "type": "completeLaunchTask", "taskId": "..." }
  { "type": "skipLaunchTask", "taskId": "..." }
  { "type": "addLaunchNote", "taskId": "...", "note": "..." }

Rehearsal Notes:
  { "type": "addRehearsalNote", "danceId": "...", "notes": "...", "workOn": ["item1", "item2"] }`;

  if (includeDisruption) {
    actions += `

Disruption:
  { "type": "startDisruption", "disruptionType": "sick|personal|travel|mental_health|other", "reason": "...", "expectedReturn": "YYYY-MM-DD" }
  { "type": "endDisruption" }
  { "type": "markClassExceptionRange", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "exceptionType": "cancelled|subbed", "subName": "..." }
  { "type": "batchRescheduleTasks", "filter": "overdue|due-this-week|all-active", "newDate": "YYYY-MM-DD" }
  { "type": "assignSub", "classIds": [...], "dates": [...], "subName": "..." }`;
  }

  actions += `

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
- Use setDayMode when: user says it's a light/chill day -> "light"; packed teaching/rehearsal -> "intense"; competition day -> "comp". This adapts the wellness checklist and plan. Don't set "normal" — that's the default.
- If the context already shows a dayMode, don't re-set it unless the user explicitly wants to change it.
- CLASS EXCEPTIONS: When user says they're sick, calling out, or found/have a sub for today -> use markClassException. Use scope "all" unless they specify which classes. Resolve sub name exactly as said. Use reason: sick/personal/holiday/other as appropriate.
- CLASS NOTES: When user mentions a note, observation, or plan for a specific class -> use addClassNote or setClassPlan. Match the class name from weekClassList (fuzzy is ok, e.g., "Ballet 1" matches "Ballet 1 Beginner"). If ambiguous (multiple plausible matches), ask in your response instead of guessing.
- LAUNCH TASKS: When user says they finished, skipped, or wants to note something about a DWDC task -> use completeLaunchTask/skipLaunchTask/addLaunchNote. Match from launchTaskList.
- REHEARSAL NOTES: When user mentions rehearsal notes or working on a competition piece -> use addRehearsalNote. Match dance from competitionDanceList.
- FUZZY RESOLUTION: You must always include the actual ID (from the lookup lists) in actions, not the name. If you can't confidently match a name to an ID, ask for clarification instead.`;

  return actions;
}

function getMaxTokens(mode: Mode): number {
  switch (mode) {
    case "check-in":
    case "briefing":
    case "prep":
    case "capture":
      return 800;
    case "day-plan":
    case "chat":
    case "reflection":
      return 1200;
    default:
      return 800;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFallbackResponse(mode: Mode): any {
  switch (mode) {
    case "check-in":
    case "chat":
      return { response: "", mood: "neutral", adjustments: [], actions: [] };
    case "briefing":
      return { briefing: "Couldn't generate a briefing." };
    case "day-plan":
      return { items: [], summary: "Couldn't generate a plan." };
    case "prep":
      return { response: "Couldn't generate prep summary." };
    case "capture":
      return { response: "Couldn't process notes.", structuredNotes: [] };
    case "reflection":
      return { response: "Couldn't generate reflection.", actions: [] };
    default:
      return { response: "" };
  }
}

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
    const mode: Mode = payload.mode;

    if (!mode || !["check-in", "chat", "briefing", "day-plan", "prep", "capture", "reflection"].includes(mode)) {
      return new Response(JSON.stringify({ error: `Invalid mode: ${mode}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = getSystemPrompt(mode, payload);
    const contextString = buildContextString(payload, mode);

    // Build messages array
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (mode === "chat" && payload.messages?.length > 0) {
      // Multi-turn: include conversation history
      for (const msg of payload.messages) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
      // Add current message with context
      messages.push({
        role: "user",
        content: `Context:\n${contextString}\n\nDixon says: "${payload.userMessage}"`,
      });
    } else if (mode === "day-plan") {
      messages.push({
        role: "user",
        content: `Generate today's plan.\n\n${contextString}`,
      });
    } else {
      // Single-turn modes
      const userMessage = payload.userMessage || "";
      messages.push({
        role: "user",
        content: `Context:\n${contextString}\n\n${userMessage ? `Dixon says: "${userMessage}"` : ""}`,
      });
    }

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: getMaxTokens(mode),
      system: systemPrompt,
      messages,
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : getFallbackResponse(mode);
    } catch {
      parsed = getFallbackResponse(mode);
    }

    // Normalize arrays for modes that use them
    if (mode === "check-in" || mode === "chat") {
      if (!Array.isArray(parsed.actions)) parsed.actions = [];
      if (!Array.isArray(parsed.adjustments)) parsed.adjustments = [];
    }
    if (mode === "reflection") {
      if (!Array.isArray(parsed.actions)) parsed.actions = [];
    }
    if (mode === "capture") {
      if (!Array.isArray(parsed.structuredNotes)) parsed.structuredNotes = [];
    }
    if (mode === "day-plan") {
      if (!Array.isArray(parsed.items)) parsed.items = [];
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-cache" },
    });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: "AI chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
