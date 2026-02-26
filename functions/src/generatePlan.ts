import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

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

interface ClassInfo {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  level?: string;
  recitalSong?: string;
  isRecitalSong?: boolean;
  choreographyNotes?: string;
}

export const generatePlan = onCall(
  { secrets: [anthropicKey], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { classInfo, notes, previousPlans, progressionHints, repetitionFlags, attendanceNote, expandedSummary } = request.data as {
      classInfo: ClassInfo;
      notes: LiveNote[];
      previousPlans?: string[];
      progressionHints?: string[];
      repetitionFlags?: string[];
      attendanceNote?: string;
      expandedSummary?: string;
    };

    if (!classInfo || !notes) {
      throw new HttpsError("invalid-argument", "Missing classInfo or notes");
    }

    const apiKey = anthropicKey.value();
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
      // Organize notes by category
      const needsWork = notes.filter((n) => normalizeCategory(n.category) === "needs-work");
      const nextWeek = notes.filter((n) => normalizeCategory(n.category) === "next-week");
      const workedOn = notes.filter((n) => normalizeCategory(n.category) === "worked-on");
      const ideas = notes.filter((n) => normalizeCategory(n.category) === "ideas");
      const general = notes.filter((n) => !n.category);

      const isBalletClass = classInfo.name.toLowerCase().includes("ballet");
      const hasRecitalPiece = classInfo.recitalSong && classInfo.recitalSong.trim() !== '';
      const levelLabel = classInfo.level
        ? classInfo.level.charAt(0).toUpperCase() + classInfo.level.slice(1)
        : (classInfo.name.toLowerCase().includes("advanced") ? "Advanced"
          : classInfo.name.toLowerCase().includes("intermediate") ? "Intermediate"
          : classInfo.name.toLowerCase().includes("beginner") ? "Beginner" : "");

      // Build the context block
      let context = `CLASS: ${classInfo.name} (${classInfo.day})`;
      if (levelLabel) context += `\nLEVEL: ${levelLabel}`;
      if (hasRecitalPiece) {
        const pieceType = classInfo.isRecitalSong ? "Recital piece" : "Class combo";
        context += `\nCURRENT PIECE: ${pieceType} — "${classInfo.recitalSong}"`;
      }
      if (classInfo.choreographyNotes) {
        context += `\nCHOREO STATUS: ${classInfo.choreographyNotes}`;
      }
      if (attendanceNote) context += `\nATTENDANCE: ${attendanceNote}`;

      // Build the notes block
      let notesBlock = '';
      if (nextWeek.length > 0) {
        notesBlock += `FLAGGED FOR NEXT WEEK:\n${nextWeek.map((n) => `- ${n.text}`).join("\n")}\n\n`;
      }
      if (needsWork.length > 0) {
        notesBlock += `NEEDS WORK:\n${needsWork.map((n) => `- ${n.text}`).join("\n")}\n\n`;
      }
      if (workedOn.length > 0) {
        notesBlock += `WORKED ON:\n${workedOn.map((n) => `- ${n.text}`).join("\n")}\n\n`;
      }
      if (general.length > 0) {
        notesBlock += `GENERAL:\n${general.map((n) => `- ${n.text}`).join("\n")}\n\n`;
      }
      if (ideas.length > 0) {
        notesBlock += `IDEAS:\n${ideas.map((n) => `- ${n.text}`).join("\n")}\n\n`;
      }

      // Extra context from client-side engine
      let extraContext = '';
      if (expandedSummary && expandedSummary.trim()) {
        extraContext += `ORGANIZED CLASS SUMMARY (teacher-reviewed):\n${expandedSummary.trim()}\n\n`;
      }
      if (progressionHints && progressionHints.length > 0) {
        extraContext += `SUGGESTED PROGRESSIONS (from last week's work):\n${progressionHints.map(h => `- ${h}`).join("\n")}\n\n`;
      }
      if (repetitionFlags && repetitionFlags.length > 0) {
        extraContext += `PATTERNS NOTICED:\n${repetitionFlags.map(f => `- ${f}`).join("\n")}\n\n`;
      }
      if (previousPlans && previousPlans.length > 0) {
        extraContext += `PREVIOUS PLAN (for continuity):\n${previousPlans[0].substring(0, 500)}\n\n`;
      }

      const prompt = `You're a dance teacher writing your own quick prep notes for next week's class. You'll glance at these on your phone walking into the studio. Not a lesson plan — your personal cheat sheet.

${context}

THIS WEEK'S NOTES:
${notesBlock}${extraContext}WRITE YOUR PREP NOTES FOR NEXT WEEK. Follow these rules EXACTLY:

FORMAT:
- PLAIN TEXT ONLY. NEVER use: # ## ### ** * \` --- or any markdown syntax. If you output even one # character, the whole plan is ruined.
- Short bullet points with a dash (-)
- Group with simple ALL-CAPS labels on their own line ONLY when needed: PRIORITY, ${isBalletClass ? "BARRE" : "WARMUP"}, CENTER, ACROSS THE FLOOR, CHOREO${hasRecitalPiece ? `, PIECE ("${classInfo.recitalSong}")` : ""}
- Skip any section with nothing to say. Don't force structure.

EXAMPLE OF CORRECT FORMAT:
PRIORITY
- Run chassé combo again, they lost the timing
- Review port de bras from adagio

CENTER
- New tendu combination — add relevé

EXAMPLE OF WRONG FORMAT (NEVER DO THIS):
## Priority
**Run chassé combo** again
- ### Center section

CONTENT PRIORITIES:
1. PRIORITY section FIRST — anything flagged for next week or needing more work. This is what you must not forget.
2. For each section of class you have notes on, write what to DO — not what you did. "Run chassé combo again" not "did chassé combo."
3. If a progression hint makes sense for this ${levelLabel || "class"} level, include it naturally (e.g., "progress jazz splits to traveling version"). Ignore any that feel too advanced or forced.
4. If a pattern was flagged (e.g., "3 weeks on X"), mention it as a nudge: "3 weeks on leaps — vary it or level up?"${hasRecitalPiece ? `\n5. Always include a PIECE section for "${classInfo.recitalSong}" — what to work on, what section to clean, whether to run it full-out.` : ""}

TONE:
- You ARE the teacher. Write like you're scribbling on a Post-it.
- Specific. No generic advice. Every bullet should trace back to something from this week's notes.
- Terse. "Clean landing on switch leaps" not "Focus on improving the quality of landings when performing switch leaps."
- 8-12 bullets total. Ruthlessly cut anything that isn't actionable.
- No preamble, no sign-off, no encouragement, no "Great class!" fluff.`;

      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      let planContent = message.content[0].type === "text" ? message.content[0].text : "";

      // Strip any markdown artifacts
      planContent = planContent
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^---+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        success: true,
        plan: planContent,
        generatedAt: new Date().toISOString(),
        classId: classInfo.id,
        className: classInfo.name,
      };
    } catch (error) {
      console.error("Error generating plan:", error);
      throw new HttpsError("internal", "Failed to generate plan");
    }
  }
);
