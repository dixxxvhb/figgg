import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./utils/auth";
import {
  type Mode,
  buildContextString,
  getSystemPrompt,
  getMaxTokens,
  getFallbackResponse,
} from "./utils/prompts";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

const VALID_MODES: Mode[] = ["check-in", "chat", "briefing", "day-plan", "prep", "capture", "reflection", "generate-plan", "generate-briefing", "expand-notes", "detect-reminders", "organize-notes"];

function extractBalancedJsonBlock(text: string, openChar: '{' | '['): string | null {
  const closeChar = openChar === '{' ? '}' : ']';
  const start = text.indexOf(openChar);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
}

function parseJsonLike<T>(text: string, openChar: '{' | '['): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text;
  const block = extractBalancedJsonBlock(candidate, openChar);
  if (!block) return null;
  try {
    return JSON.parse(block) as T;
  } catch {
    return null;
  }
}

export const aiChat = onCall(
  { timeoutSeconds: 60, memory: "256MiB", secrets: [anthropicKey] },
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
      } else if (mode === "generate-plan" || mode === "expand-notes" || mode === "organize-notes") {
        // Class-tool modes: context + class data, expect text output
        messages.push({
          role: "user",
          content: `${contextString}\n\nProcess the class notes above and generate the requested output.`,
        });
      } else if (mode === "generate-briefing") {
        // Briefing mode: context + class data with flag markers, expect structured JSON
        messages.push({
          role: "user",
          content: `${contextString}\n\nWrite the 3-part briefing for next week's class. Return ONLY the JSON object specified in your instructions.`,
        });
      } else if (mode === "detect-reminders") {
        // Reminder detection: context + notes, expect JSON output
        messages.push({
          role: "user",
          content: `${contextString}\n\nAnalyze the class notes above and identify actionable reminders. Return ONLY a JSON array.`,
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
      const parsed = parseJsonLike<Record<string, unknown>>(text, '{') || getFallbackResponse(mode);

      // Normalize arrays for modes that use them
      if (mode === "check-in" || mode === "chat") {
        if (!Array.isArray(parsed.actions)) parsed.actions = [];
        if (!Array.isArray(parsed.adjustments)) parsed.adjustments = [];
      }
      // Normalize briefingUpdate — only keep non-empty strings from chat mode
      if (mode === "chat") {
        if (typeof parsed.briefingUpdate !== "string" || !parsed.briefingUpdate.trim()) {
          delete parsed.briefingUpdate;
        }
      } else {
        delete parsed.briefingUpdate;
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

      // Class-tool modes: return structured responses
      if (mode === "generate-plan") {
        // Plain text response — strip markdown artifacts
        const planText = text
          .replace(/^#{1,6}\s*/gm, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/^---+$/gm, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        return { success: true, plan: planText, generatedAt: new Date().toISOString() };
      }
      if (mode === "expand-notes") {
        return { success: true, expanded: text.trim(), generatedAt: new Date().toISOString() };
      }
      if (mode === "generate-briefing") {
        // Parse structured briefing JSON; validate shape, clamp forToday to 5 items.
        const parsedBriefing = parseJsonLike<Record<string, unknown>>(text, '{');
        if (
          !parsedBriefing ||
          typeof parsedBriefing.recap !== "string" ||
          typeof parsedBriefing.assessment !== "string" ||
          !Array.isArray(parsedBriefing.forToday)
        ) {
          console.error("Failed to parse generate-briefing response:", text.substring(0, 300));
          // Return empty-shape briefing; client's buildFallbackBriefing will fire on throw.
          throw new HttpsError("internal", "AI returned malformed briefing payload");
        }
        const forToday = parsedBriefing.forToday
          .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
          .slice(0, 5);
        return {
          briefing: {
            recap: parsedBriefing.recap,
            assessment: parsedBriefing.assessment,
            forToday,
            generatedAt: new Date().toISOString(),
          },
        };
      }
      if (mode === "detect-reminders") {
        // Parse JSON array from response
        let reminders: Array<{ noteId: string; title: string }> = [];
        const arr = parseJsonLike<unknown[]>(text, '[');
        if (Array.isArray(arr)) {
          reminders = arr.filter(
            (r: unknown): r is { noteId: string; title: string } =>
              !!r &&
              typeof r === "object" &&
              typeof (r as Record<string, unknown>).noteId === "string" &&
              typeof (r as Record<string, unknown>).title === "string"
          );
        } else {
          console.error("Failed to parse detect-reminders response:", text.substring(0, 200));
        }
        return { reminders };
      }
      if (mode === "organize-notes") {
        return { success: true, plan: text.trim() };
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
