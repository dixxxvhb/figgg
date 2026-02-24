import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";

// Validate the session token server-side
async function validateToken(token: string): Promise<boolean> {
  const expectedPassword = Netlify.env.get("VITE_APP_PASSWORD") || "dance2024";
  const secret = Netlify.env.get("SESSION_SECRET") || "dance-app-secret-2024";
  const encoder = new TextEncoder();
  const data = encoder.encode(expectedPassword + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return token === expectedToken;
}

interface NoteInput {
  text: string;
  category?: string; // 'covered' | 'observation' | 'reminder' | 'choreography'
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

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { notes: NoteInput[]; className: string; classLevel?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { notes, className, classLevel } = body;

  if (!notes || notes.length === 0) {
    return new Response(JSON.stringify({ error: "No notes provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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
📌 TO DO:
🔥 WARM-UP:
⭐ CENTER:
➡️ ACROSS THE FLOOR:
🎵 COMBO/CHOREO:
👀 STUDENT NOTES:

Rules:
- REMINDER notes → 📌 TO DO
- OBSERVATION notes → 👀 STUDENT NOTES
- CHOREOGRAPHY notes → 🎵 COMBO/CHOREO
- COVERED notes → infer the right section from context
- Use bullet points with "  • " prefix under each header
- Keep each bullet concise — this is a quick reference for class
- Don't add intros, explanations, or sign-offs — just the plan
- Suggest logical next progressions where appropriate (e.g. if they drilled a step, suggest adding it to the combo next week)`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const planText = message.content
      .filter(block => block.type === "text")
      .map(block => (block as { type: "text"; text: string }).text)
      .join("");

    return new Response(JSON.stringify({ plan: planText.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Claude API error:", error);
    return new Response(JSON.stringify({ error: "AI organization failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
