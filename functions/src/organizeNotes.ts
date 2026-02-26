import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

interface NoteInput {
  text: string;
  category?: string;
}

export const organizeNotes = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { notes, className, classLevel } = request.data as {
      notes: NoteInput[];
      className: string;
      classLevel?: string;
    };

    if (!notes || notes.length === 0) {
      throw new HttpsError("invalid-argument", "No notes provided");
    }

    const apiKey = anthropicKey.value();
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
      // Format notes for the prompt
      const formattedNotes = notes.map(n => {
        const tag = n.category
          ? `[${n.category.toUpperCase()}] `
          : "";
        return `${tag}${n.text}`;
      }).join("\n");

      const classContext = classLevel
        ? `${className} (${classLevel} level)`
        : className;

      const prompt = `You are a practical assistant for a dance teacher. Based on the notes from today's ${classContext} class, write a concise plan for next week.

TODAY'S NOTES:
${formattedNotes}

Write a next-week class plan using only these section headers (skip any that don't apply):
\u{1F4CC} TO DO:
\u{1F525} WARM-UP:
\u2B50 CENTER:
\u27A1\uFE0F ACROSS THE FLOOR:
\u{1F3B5} COMBO/CHOREO:
\u{1F440} STUDENT NOTES:

Rules:
- REMINDER notes \u2192 \u{1F4CC} TO DO
- OBSERVATION notes \u2192 \u{1F440} STUDENT NOTES
- CHOREOGRAPHY notes \u2192 \u{1F3B5} COMBO/CHOREO
- COVERED notes \u2192 infer the right section from context
- Use bullet points with "  \u2022 " prefix under each header
- Keep each bullet concise \u2014 this is a quick reference for class
- Don't add intros, explanations, or sign-offs \u2014 just the plan
- Suggest logical next progressions where appropriate (e.g. if they drilled a step, suggest adding it to the combo next week)`;

      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });

      const planText = message.content
        .filter(block => block.type === "text")
        .map(block => (block as { type: "text"; text: string }).text)
        .join("");

      return { plan: planText.trim() };
    } catch (error) {
      console.error("Claude API error:", error);
      throw new HttpsError("internal", "AI organization failed");
    }
  }
);
