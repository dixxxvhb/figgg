import { onCall, HttpsError } from "firebase-functions/v2/https";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";

interface LiveNote {
  id: string;
  timestamp: string;
  text: string;
  category?: string;
}

export const detectReminders = onCall(
  { timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { className, notes } = request.data as {
      className: string;
      notes: LiveNote[];
    };

    if (!className || !notes || notes.length === 0) {
      return { reminders: [] };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
      const notesList = notes.map((n) => `- [${n.id}] ${n.text}`).join("\n");

      const prompt = `You are helping a dance teacher identify action items from their class notes for "${className}".

Given these notes, identify which ones are ACTIONABLE TO-DOs that the teacher needs to complete OUTSIDE of class before next week.

NOTES:
${notesList}

ACTIONABLE (these ARE reminders — things to DO before next class):
- Bring equipment/props/supplies to class
- Email/text/call a parent, student, or studio
- Download, find, or cut music
- Buy or order something
- Print materials
- Schedule or book something (rehearsal space, guest teacher)
- Prepare specific materials or handouts
- Look up or research something
- Fix or replace equipment

NOT ACTIONABLE (these are teaching/choreography notes, NOT reminders):
- Work on a skill or technique next week
- Review or clean up choreography
- Run a combination again
- Add or change something in class content
- Observations about student progress
- Ideas for future classes
- Notes about what went well or needs more time

Return ONLY a JSON array of objects for notes that ARE actionable reminders. If no notes are actionable, return an empty array.
Format: [{"noteId": "the-note-id", "title": "cleaned up reminder text"}]

The "title" should be a clean, actionable version of the note (e.g., "need to get new aux cord" becomes "Get new aux cord").
Return ONLY the JSON array. No explanation, no markdown.`;

      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "[]";

      // Parse the JSON response, with fallback to empty array
      let reminders: Array<{ noteId: string; title: string }> = [];
      try {
        const parsed = JSON.parse(responseText.trim());
        if (Array.isArray(parsed)) {
          reminders = parsed.filter(
            (r: unknown) =>
              r &&
              typeof r === "object" &&
              "noteId" in (r as Record<string, unknown>) &&
              "title" in (r as Record<string, unknown>),
          );
        }
      } catch {
        console.error("Failed to parse AI response:", responseText);
      }

      return { reminders };
    } catch (error) {
      console.error("Error detecting reminders:", error);
      // Return 200 with empty — don't fail the whole flow
      return { reminders: [] };
    }
  }
);
