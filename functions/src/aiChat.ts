import { onCall, HttpsError } from "firebase-functions/v2/https";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";
import {
  type Mode,
  buildContextString,
  getSystemPrompt,
  getMaxTokens,
  getFallbackResponse,
} from "./utils/prompts";

const VALID_MODES: Mode[] = ["check-in", "chat", "briefing", "day-plan", "prep", "capture", "reflection"];

export const aiChat = onCall(
  { timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const payload = request.data;
    const mode: Mode = payload.mode;

    if (!mode || !VALID_MODES.includes(mode)) {
      throw new HttpsError("invalid-argument", `Invalid mode: ${mode}`);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new HttpsError("internal", "API key not configured");
    }

    try {
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

      return parsed;
    } catch (error: unknown) {
      console.error("AI chat error:", error);

      // Surface specific error details for better client-side messaging
      if (error instanceof Error) {
        const msg = error.message || "";
        const anyErr = error as unknown as Record<string, unknown>;
        const status = (anyErr.status as number) || 0;

        if (status === 401 || msg.includes("authentication") || msg.includes("api_key")) {
          throw new HttpsError("permission-denied", "AI API key is invalid or expired");
        }
        if (status === 429 || msg.includes("rate_limit") || msg.includes("rate limit")) {
          throw new HttpsError("resource-exhausted", "AI rate limit reached — try again in a moment");
        }
        if (status === 529 || msg.includes("overloaded")) {
          throw new HttpsError("unavailable", "AI service is temporarily overloaded — try again shortly");
        }
        if (msg.includes("Could not resolve") || msg.includes("ENOTFOUND") || msg.includes("network")) {
          throw new HttpsError("unavailable", "Cannot reach AI service — check network connection");
        }
      }

      throw new HttpsError("internal", "AI chat failed — please try again");
    }
  }
);
