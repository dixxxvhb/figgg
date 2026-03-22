
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/expandNotes.ts
import Anthropic from "@anthropic-ai/sdk";
async function validateToken(token) {
  const expectedPassword = Netlify.env.get("VITE_APP_PASSWORD") || "dance2024";
  const secret = Netlify.env.get("SESSION_SECRET") || "dance-app-secret-2024";
  const encoder = new TextEncoder();
  const data = encoder.encode(expectedPassword + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return token === expectedToken;
}
var expandNotes_default = async (request, _context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  if (!token || !await validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    const { className, date, notes } = body;
    if (!className || !notes || notes.length === 0) {
      return new Response(JSON.stringify({ error: "Missing className or notes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const covered = notes.filter((n) => n.category === "covered");
    const observations = notes.filter((n) => n.category === "observation");
    const reminders = notes.filter((n) => n.category === "reminder");
    const choreography = notes.filter((n) => n.category === "choreography");
    const general = notes.filter((n) => !n.category);
    const isBalletClass = className.toLowerCase().includes("ballet");
    const warmupLabel = isBalletClass ? "Barre" : "Warm-Up";
    const prompt = `You are a dance teacher's assistant. Notes are taken quickly during class \u2014 shorthand, not polished. Interpret them generously and expand into an organized summary.

CLASS: ${className}
DATE: ${date}

RAW NOTES:
${general.length > 0 ? `
GENERAL:
${general.map((n) => `- ${n.text}`).join("\n")}` : ""}
${covered.length > 0 ? `
WHAT WE COVERED:
${covered.map((n) => `- ${n.text}`).join("\n")}` : ""}
${observations.length > 0 ? `
STUDENT OBSERVATIONS:
${observations.map((n) => `- ${n.text}`).join("\n")}` : ""}
${reminders.length > 0 ? `
REMINDERS:
${reminders.map((n) => `- ${n.text}`).join("\n")}` : ""}
${choreography.length > 0 ? `
CHOREOGRAPHY:
${choreography.map((n) => `- ${n.text}`).join("\n")}` : ""}

Organize these notes into the standard class structure. Notes may not be in order \u2014 reorganize them:

1. **${warmupLabel}** - What we did to warm up
2. **Stretching** - Any stretching work
3. **Center Work** - Exercises done in center
4. **Across the Floor** - Traveling combinations
5. **Choreography/Combo** - Any choreography work (only if applicable)

Then add:
- **What Worked** - Things that went well (only if you can infer from the notes)
- **Student Notes** - Individual observations (only if student observations exist)
- **Next Week** - Reminders and action items for next class

Only include sections that have relevant content. Keep it concise and practical \u2014 a balance between casual notes-to-self and a structured summary. Use bullet points. No fluff.`;
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });
    const expanded = message.content[0].type === "text" ? message.content[0].text : "";
    return new Response(JSON.stringify({
      success: true,
      expanded,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      className,
      date
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error expanding notes:", error);
    return new Response(JSON.stringify({
      error: "Failed to expand notes",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  expandNotes_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvZXhwYW5kTm90ZXMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCBBbnRocm9waWMgZnJvbSBcIkBhbnRocm9waWMtYWkvc2RrXCI7XG5pbXBvcnQgdHlwZSB7IENvbnRleHQgfSBmcm9tIFwiQG5ldGxpZnkvZnVuY3Rpb25zXCI7XG5cbmludGVyZmFjZSBMaXZlTm90ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIGNhdGVnb3J5PzogXCJjb3ZlcmVkXCIgfCBcIm9ic2VydmF0aW9uXCIgfCBcInJlbWluZGVyXCIgfCBcImNob3Jlb2dyYXBoeVwiO1xufVxuXG5pbnRlcmZhY2UgUmVxdWVzdEJvZHkge1xuICBjbGFzc05hbWU6IHN0cmluZztcbiAgZGF0ZTogc3RyaW5nO1xuICBub3RlczogTGl2ZU5vdGVbXTtcbn1cblxuLy8gVmFsaWRhdGUgdGhlIHNlc3Npb24gdG9rZW4gc2VydmVyLXNpZGVcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBleHBlY3RlZFBhc3N3b3JkID0gTmV0bGlmeS5lbnYuZ2V0KFwiVklURV9BUFBfUEFTU1dPUkRcIikgfHwgXCJkYW5jZTIwMjRcIjtcbiAgY29uc3Qgc2VjcmV0ID0gTmV0bGlmeS5lbnYuZ2V0KFwiU0VTU0lPTl9TRUNSRVRcIikgfHwgXCJkYW5jZS1hcHAtc2VjcmV0LTIwMjRcIjtcbiAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICBjb25zdCBkYXRhID0gZW5jb2Rlci5lbmNvZGUoZXhwZWN0ZWRQYXNzd29yZCArIHNlY3JldCk7XG4gIGNvbnN0IGhhc2hCdWZmZXIgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcIlNIQS0yNTZcIiwgZGF0YSk7XG4gIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaEJ1ZmZlcikpO1xuICBjb25zdCBleHBlY3RlZFRva2VuID0gaGFzaEFycmF5Lm1hcChiID0+IGIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKTtcbiAgcmV0dXJuIHRva2VuID09PSBleHBlY3RlZFRva2VuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxdWVzdDogUmVxdWVzdCwgX2NvbnRleHQ6IENvbnRleHQpID0+IHtcbiAgaWYgKHJlcXVlc3QubWV0aG9kICE9PSBcIlBPU1RcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJNZXRob2Qgbm90IGFsbG93ZWRcIiB9KSwge1xuICAgICAgc3RhdHVzOiA0MDUsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cblxuICAvLyBBdXRoIGNoZWNrXG4gIGNvbnN0IGF1dGhIZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiQXV0aG9yaXphdGlvblwiKTtcbiAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyPy5yZXBsYWNlKFwiQmVhcmVyIFwiLCBcIlwiKSB8fCBcIlwiO1xuICBpZiAoIXRva2VuIHx8ICEoYXdhaXQgdmFsaWRhdGVUb2tlbih0b2tlbikpKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIlVuYXV0aG9yaXplZFwiIH0pLCB7XG4gICAgICBzdGF0dXM6IDQwMSxcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgYXBpS2V5ID0gTmV0bGlmeS5lbnYuZ2V0KFwiQU5USFJPUElDX0FQSV9LRVlcIik7XG4gICAgaWYgKCFhcGlLZXkpIHtcbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJBUEkga2V5IG5vdCBjb25maWd1cmVkXCIgfSksIHtcbiAgICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGJvZHk6IFJlcXVlc3RCb2R5ID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgY29uc3QgeyBjbGFzc05hbWUsIGRhdGUsIG5vdGVzIH0gPSBib2R5O1xuXG4gICAgaWYgKCFjbGFzc05hbWUgfHwgIW5vdGVzIHx8IG5vdGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIk1pc3NpbmcgY2xhc3NOYW1lIG9yIG5vdGVzXCIgfSksIHtcbiAgICAgICAgc3RhdHVzOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE9yZ2FuaXplIG5vdGVzIGJ5IGNhdGVnb3J5XG4gICAgY29uc3QgY292ZXJlZCA9IG5vdGVzLmZpbHRlcigobikgPT4gbi5jYXRlZ29yeSA9PT0gXCJjb3ZlcmVkXCIpO1xuICAgIGNvbnN0IG9ic2VydmF0aW9ucyA9IG5vdGVzLmZpbHRlcigobikgPT4gbi5jYXRlZ29yeSA9PT0gXCJvYnNlcnZhdGlvblwiKTtcbiAgICBjb25zdCByZW1pbmRlcnMgPSBub3Rlcy5maWx0ZXIoKG4pID0+IG4uY2F0ZWdvcnkgPT09IFwicmVtaW5kZXJcIik7XG4gICAgY29uc3QgY2hvcmVvZ3JhcGh5ID0gbm90ZXMuZmlsdGVyKChuKSA9PiBuLmNhdGVnb3J5ID09PSBcImNob3Jlb2dyYXBoeVwiKTtcbiAgICBjb25zdCBnZW5lcmFsID0gbm90ZXMuZmlsdGVyKChuKSA9PiAhbi5jYXRlZ29yeSk7XG5cbiAgICBjb25zdCBpc0JhbGxldENsYXNzID0gY2xhc3NOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJiYWxsZXRcIik7XG4gICAgY29uc3Qgd2FybXVwTGFiZWwgPSBpc0JhbGxldENsYXNzID8gXCJCYXJyZVwiIDogXCJXYXJtLVVwXCI7XG5cbiAgICBjb25zdCBwcm9tcHQgPSBgWW91IGFyZSBhIGRhbmNlIHRlYWNoZXIncyBhc3Npc3RhbnQuIE5vdGVzIGFyZSB0YWtlbiBxdWlja2x5IGR1cmluZyBjbGFzcyBcdTIwMTQgc2hvcnRoYW5kLCBub3QgcG9saXNoZWQuIEludGVycHJldCB0aGVtIGdlbmVyb3VzbHkgYW5kIGV4cGFuZCBpbnRvIGFuIG9yZ2FuaXplZCBzdW1tYXJ5LlxuXG5DTEFTUzogJHtjbGFzc05hbWV9XG5EQVRFOiAke2RhdGV9XG5cblJBVyBOT1RFUzpcbiR7Z2VuZXJhbC5sZW5ndGggPiAwID8gYFxcbkdFTkVSQUw6XFxuJHtnZW5lcmFsLm1hcCgobikgPT4gYC0gJHtuLnRleHR9YCkuam9pbihcIlxcblwiKX1gIDogXCJcIn1cbiR7Y292ZXJlZC5sZW5ndGggPiAwID8gYFxcbldIQVQgV0UgQ09WRVJFRDpcXG4ke2NvdmVyZWQubWFwKChuKSA9PiBgLSAke24udGV4dH1gKS5qb2luKFwiXFxuXCIpfWAgOiBcIlwifVxuJHtvYnNlcnZhdGlvbnMubGVuZ3RoID4gMCA/IGBcXG5TVFVERU5UIE9CU0VSVkFUSU9OUzpcXG4ke29ic2VydmF0aW9ucy5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG4ke3JlbWluZGVycy5sZW5ndGggPiAwID8gYFxcblJFTUlOREVSUzpcXG4ke3JlbWluZGVycy5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG4ke2Nob3Jlb2dyYXBoeS5sZW5ndGggPiAwID8gYFxcbkNIT1JFT0dSQVBIWTpcXG4ke2Nob3Jlb2dyYXBoeS5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG5cbk9yZ2FuaXplIHRoZXNlIG5vdGVzIGludG8gdGhlIHN0YW5kYXJkIGNsYXNzIHN0cnVjdHVyZS4gTm90ZXMgbWF5IG5vdCBiZSBpbiBvcmRlciBcdTIwMTQgcmVvcmdhbml6ZSB0aGVtOlxuXG4xLiAqKiR7d2FybXVwTGFiZWx9KiogLSBXaGF0IHdlIGRpZCB0byB3YXJtIHVwXG4yLiAqKlN0cmV0Y2hpbmcqKiAtIEFueSBzdHJldGNoaW5nIHdvcmtcbjMuICoqQ2VudGVyIFdvcmsqKiAtIEV4ZXJjaXNlcyBkb25lIGluIGNlbnRlclxuNC4gKipBY3Jvc3MgdGhlIEZsb29yKiogLSBUcmF2ZWxpbmcgY29tYmluYXRpb25zXG41LiAqKkNob3Jlb2dyYXBoeS9Db21ibyoqIC0gQW55IGNob3Jlb2dyYXBoeSB3b3JrIChvbmx5IGlmIGFwcGxpY2FibGUpXG5cblRoZW4gYWRkOlxuLSAqKldoYXQgV29ya2VkKiogLSBUaGluZ3MgdGhhdCB3ZW50IHdlbGwgKG9ubHkgaWYgeW91IGNhbiBpbmZlciBmcm9tIHRoZSBub3Rlcylcbi0gKipTdHVkZW50IE5vdGVzKiogLSBJbmRpdmlkdWFsIG9ic2VydmF0aW9ucyAob25seSBpZiBzdHVkZW50IG9ic2VydmF0aW9ucyBleGlzdClcbi0gKipOZXh0IFdlZWsqKiAtIFJlbWluZGVycyBhbmQgYWN0aW9uIGl0ZW1zIGZvciBuZXh0IGNsYXNzXG5cbk9ubHkgaW5jbHVkZSBzZWN0aW9ucyB0aGF0IGhhdmUgcmVsZXZhbnQgY29udGVudC4gS2VlcCBpdCBjb25jaXNlIGFuZCBwcmFjdGljYWwgXHUyMDE0IGEgYmFsYW5jZSBiZXR3ZWVuIGNhc3VhbCBub3Rlcy10by1zZWxmIGFuZCBhIHN0cnVjdHVyZWQgc3VtbWFyeS4gVXNlIGJ1bGxldCBwb2ludHMuIE5vIGZsdWZmLmA7XG5cbiAgICBjb25zdCBjbGllbnQgPSBuZXcgQW50aHJvcGljKHsgYXBpS2V5IH0pO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5tZXNzYWdlcy5jcmVhdGUoe1xuICAgICAgbW9kZWw6IFwiY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMVwiLFxuICAgICAgbWF4X3Rva2VuczogMTAyNCxcbiAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudDogcHJvbXB0IH1dLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZXhwYW5kZWQgPSBtZXNzYWdlLmNvbnRlbnRbMF0udHlwZSA9PT0gXCJ0ZXh0XCIgPyBtZXNzYWdlLmNvbnRlbnRbMF0udGV4dCA6IFwiXCI7XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBleHBhbmRlZCxcbiAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBjbGFzc05hbWUsXG4gICAgICBkYXRlLFxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZXhwYW5kaW5nIG5vdGVzOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBlcnJvcjogXCJGYWlsZWQgdG8gZXhwYW5kIG5vdGVzXCIsXG4gICAgICBkZXRhaWxzOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5rbm93biBlcnJvclwiLFxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfVxufTtc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
