import { onCall, HttpsError } from "firebase-functions/v2/https";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";

interface LiveNote {
  id: string;
  timestamp: string;
  text: string;
  category?: "worked-on" | "needs-work" | "next-week" | "ideas"
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

export const expandNotes = onCall(
  { timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { className, date, notes } = request.data as {
      className: string;
      date: string;
      notes: LiveNote[];
    };

    if (!className || !notes || notes.length === 0) {
      throw new HttpsError("invalid-argument", "Missing className or notes");
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
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

      return {
        success: true,
        expanded,
        generatedAt: new Date().toISOString(),
        className,
        date,
      };
    } catch (error) {
      console.error("Error expanding notes:", error);
      throw new HttpsError("internal", "Failed to expand notes");
    }
  }
);
