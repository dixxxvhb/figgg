import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";
import { ClassInfo, LiveNote, buildPlanPrompt, stripMarkdown } from "./utils/planPrompt";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

export const generatePlan = onCall(
  { timeoutSeconds: 60, memory: "256MiB", secrets: [anthropicKey] },
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
      const prompt = buildPlanPrompt({
        classInfo,
        notes,
        previousPlans,
        progressionHints,
        repetitionFlags,
        attendanceNote,
        expandedSummary,
      });

      const client = new Anthropic({ apiKey });

      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      });

      let planContent = message.content[0].type === "text" ? message.content[0].text : "";

      planContent = stripMarkdown(planContent);

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
