import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";
import { validateToken } from "./_shared/auth.ts";

interface LiveNote {
  id: string;
  timestamp: string;
  text: string;
  category?: "worked-on" | "needs-work" | "next-week" | "ideas"
    // Legacy values
    | "covered" | "observation" | "reminder" | "choreography";
}

function normalizeCategory(cat?: string): string | undefined {
  switch (cat) {
    case 'covered': return 'worked-on';
    case 'observation': return 'needs-work';
    case 'reminder': return 'next-week';
    case 'choreography': return 'ideas';
    default: return cat;
  }
}

interface RequestBody {
  className: string;
  date: string;
  notes: LiveNote[];
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Auth check
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

    const body: RequestBody = await request.json();
    const { className, date, notes } = body;

    if (!className || !notes || notes.length === 0) {
      return new Response(JSON.stringify({ error: "Missing className or notes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Organize notes by category (normalize legacy values)
    const workedOn = notes.filter((n) => normalizeCategory(n.category) === "worked-on");
    const needsWork = notes.filter((n) => normalizeCategory(n.category) === "needs-work");
    const nextWeek = notes.filter((n) => normalizeCategory(n.category) === "next-week");
    const ideas = notes.filter((n) => normalizeCategory(n.category) === "ideas");
    const general = notes.filter((n) => !n.category);

    const isBalletClass = className.toLowerCase().includes("ballet");
    const warmupLabel = isBalletClass ? "Barre" : "Warm-Up";

    const prompt = `You're a dance teacher reading back your own quick class notes. Clean them up into a tight summary you can scan in 10 seconds.

CLASS: ${className}
DATE: ${date}

NOTES:
${general.length > 0 ? `${general.map((n) => `- ${n.text}`).join("\n")}\n` : ""}${workedOn.length > 0 ? `WORKED ON:\n${workedOn.map((n) => `- ${n.text}`).join("\n")}\n` : ""}${needsWork.length > 0 ? `NEEDS WORK:\n${needsWork.map((n) => `- ${n.text}`).join("\n")}\n` : ""}${nextWeek.length > 0 ? `NEXT WEEK:\n${nextWeek.map((n) => `- ${n.text}`).join("\n")}\n` : ""}${ideas.length > 0 ? `IDEAS:\n${ideas.map((n) => `- ${n.text}`).join("\n")}\n` : ""}

Expand shorthand into clear but brief phrases. Group by: ${warmupLabel}, Center, Across the Floor, Choreo (only if present), Needs Work, Next Week. Skip any section with nothing to say.

RULES:
- PLAIN TEXT ONLY. No markdown (no # * ** \` ---).
- Use ALL-CAPS labels on their own line (e.g. CENTER, NEEDS WORK).
- One bullet per thought. Terse. Specific.
- Don't add advice, context, or anything not in the notes.
- If a note is already clear, keep it as-is. Don't over-explain.
- Max 12 bullets total.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const expanded = message.content[0].type === "text" ? message.content[0].text : "";

    return new Response(JSON.stringify({
      success: true,
      expanded,
      generatedAt: new Date().toISOString(),
      className,
      date,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error expanding notes:", error);
    return new Response(JSON.stringify({
      error: "Failed to expand notes",
      details: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
