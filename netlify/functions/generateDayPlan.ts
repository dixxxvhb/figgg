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

    const systemPrompt = `You are Dixon's day planner in figgg. He's a dance teacher with ADHD. Generate a smart, prioritized daily plan that fits his actual schedule and energy.

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
      "sourceId": "..." (REQUIRED for wellness, optional for others),
      "completed": false,
      "priority": "high" | "medium" | "low",
      "aiNote": "..." (optional, personal context)
    }
  ],
  "summary": "1-sentence day overview"
}

CATEGORY GUIDANCE:
- "class": teaching classes (from schedule, type=class). These are Dixon's regular teaching gigs.
- "med": dose reminders ("Take dose 1", "Dose 2 window opens")
- "wellness": checklist items — MUST include sourceId matching the wellness ID
- "task": reminders/tasks from the task list
- "launch": DWDC launch plan items
- "break": suggested rest periods ("15min break", "Walk outside")

COMPETITION ENTRIES:
- Schedule items with type=event and a "#" followed by a number in the title (e.g., "#211 — Dance Name") are competition entries, NOT teaching classes.
- Use category "task" for competition entries, not "class".
- Competition entries have fixed times — treat them like class items (non-negotiable timing) but label them correctly.`;

    const contextLines = [];

    // Schedule
    if (payload.schedule?.length > 0) {
      contextLines.push(`Fixed schedule:\n${payload.schedule.map((s: { time: string; title: string; type: string }) => `  ${s.time} — ${s.title} (${s.type})`).join("\n")}`);
    } else {
      contextLines.push("No classes or events today — open schedule.");
    }

    // Meds
    if (payload.medStatus) {
      const m = payload.medStatus;
      if (m.skipped) {
        contextLines.push("Meds: Skipped today (no medication windows to plan around)");
      } else {
        const parts: string[] = [];
        if (m.dose1Taken) parts.push(`Dose 1 taken at ${m.dose1Time}${m.currentStatus ? ` — currently ${m.currentStatus}` : ""}`);
        else parts.push("Dose 1 not yet taken");
        if (m.dose2Taken) parts.push(`Dose 2 taken at ${m.dose2Time}`);
        if (m.dose3Taken) parts.push(`Dose 3 taken at ${m.dose3Time}`);
        if (m.maxDoses) parts.push(`(${m.maxDoses}x/day setting)`);
        contextLines.push(`Meds: ${parts.join(", ")}`);
      }
    }

    // Tasks
    if (payload.tasks?.topTitles?.length > 0) {
      contextLines.push(`Tasks (${payload.tasks.overdueCount} overdue, ${payload.tasks.todayDueCount} due today):\n${payload.tasks.topTitles.map((t: string) => `  - "${t}"`).join("\n")}`);
    }

    // Launch
    if (payload.launchTasks?.length > 0) {
      contextLines.push(`DWDC launch priorities:\n${payload.launchTasks.map((t: string) => `  - ${t}`).join("\n")}`);
    }

    // Wellness with IDs
    if (payload.wellnessItems?.length > 0) {
      const notDone = payload.wellnessItems.filter((w: { done: boolean }) => !w.done);
      const doneCount = payload.wellnessItems.length - notDone.length;
      if (notDone.length > 0) {
        contextLines.push(`Wellness checklist (${doneCount}/${payload.wellnessItems.length} done):\n${notDone.map((w: { id: string; label: string }) => `  - ${w.label} [sourceId: "${w.id}"]`).join("\n")}`);
      } else {
        contextLines.push(`Wellness: All ${payload.wellnessItems.length} items completed!`);
      }
    } else if (payload.wellnessProgress) {
      contextLines.push(`Wellness: ${payload.wellnessProgress.done}/${payload.wellnessProgress.total} done`);
    }

    // Patterns
    if (payload.patterns?.length > 0) {
      contextLines.push(`Learned patterns: ${payload.patterns.join("; ")}`);
    }

    // Day mode
    if (payload.dayMode) {
      const modeDescriptions: Record<string, string> = {
        light: "LIGHT DAY — fewer items, focus on rest and recovery. Include calming wellness (breathing, gentle walk). Skip intensive tasks.",
        intense: "INTENSE DAY — heavy teaching/rehearsal. Include extra nutrition/fuel items. Front-load admin tasks before classes.",
        comp: "COMPETITION DAY — performance-focused. Strip non-essential tasks. Include warmup, fuel, mental prep. Suppress DWDC work. Entries are the priority.",
      };
      contextLines.push(`Day mode: ${payload.dayMode}\n${modeDescriptions[payload.dayMode] || ""}`);
    }

    // Mood and message from check-in
    if (payload.checkInMood) {
      contextLines.push(`Today's mood: ${payload.checkInMood}`);
    }
    if (payload.checkInMessage) {
      contextLines.push(`Dixon said: "${payload.checkInMessage}"`);
    }

    // Streak
    if (payload.streak) {
      contextLines.push(`Current streak: ${payload.streak} days`);
    }

    // Completed items — tell AI what's already done so it doesn't regenerate them
    if (payload.completedItems?.length > 0) {
      contextLines.push(`Already completed today (DO NOT regenerate these):\n${payload.completedItems.map((i: { title: string; category: string }) => `  - [DONE] ${i.title} (${i.category})`).join("\n")}`);
    }

    const userContent = `Generate today's plan.\n\n${contextLines.join("\n\n")}`;

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [], summary: "Couldn't generate a plan." };
    } catch {
      parsed = { items: [], summary: "Couldn't generate a plan." };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-cache" },
    });
  } catch (error: unknown) {
    console.error("Day plan generation error:", error);
    return new Response(JSON.stringify({ error: "Day plan generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
