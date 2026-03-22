
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/generatePlan.ts
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
var generatePlan_default = async (request, _context) => {
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
    const { classInfo, notes, previousPlans, expandedSummary } = body;
    if (!classInfo || !notes) {
      return new Response(JSON.stringify({ error: "Missing classInfo or notes" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const parseTime = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const duration = parseTime(classInfo.endTime) - parseTime(classInfo.startTime);
    const covered = notes.filter((n) => n.category === "covered");
    const observations = notes.filter((n) => n.category === "observation");
    const reminders = notes.filter((n) => n.category === "reminder");
    const choreography = notes.filter((n) => n.category === "choreography");
    const isBalletClass = classInfo.name.toLowerCase().includes("ballet");
    const warmupLabel = isBalletClass ? "Barre" : "Warm-Up";
    const general = notes.filter((n) => !n.category);
    const prompt = `You are a dance teacher's assistant helping plan next week's class. Notes are taken quickly during class \u2014 shorthand, not polished. Interpret them generously.

CLASS: ${classInfo.name}
DAY: ${classInfo.day}

LAST WEEK'S NOTES:
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
REMINDERS FOR NEXT CLASS:
${reminders.map((n) => `- ${n.text}`).join("\n")}` : ""}
${choreography.length > 0 ? `
CHOREOGRAPHY NOTES:
${choreography.map((n) => `- ${n.text}`).join("\n")}` : ""}
${expandedSummary ? `
AI SUMMARY OF LAST CLASS:
${expandedSummary}` : ""}
${previousPlans?.length ? `
PREVIOUS PLANS FOR CONTEXT:
${previousPlans.slice(-2).join("\n---\n")}` : ""}

Create a lesson plan for NEXT WEEK using this structure (always in this order):

1. **${warmupLabel}**
2. **Stretching**
3. **Center Work**
4. **Across the Floor**
5. **Choreography/Combo** (only if applicable)
6. **Key Reminders**

RULES:
- For each section, clearly mark what is REVIEW (from last week, needs reinforcement) vs NEW/PROGRESS (introducing or advancing)
- Reminders from last week's notes must be visibly incorporated, not buried
- Do NOT include time estimates
- Use bullet points, keep it scannable
- Tone: practical notes-to-self with enough structure to follow at a glance. Not a formal document, not raw shorthand \u2014 somewhere in between.
- Only include sections that have relevant content
- Be specific to the notes provided \u2014 don't invent exercises that weren't mentioned or implied`;
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });
    const planContent = message.content[0].type === "text" ? message.content[0].text : "";
    return new Response(JSON.stringify({
      success: true,
      plan: planContent,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      classId: classInfo.id,
      className: classInfo.name
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return new Response(JSON.stringify({
      error: "Failed to generate plan",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  generatePlan_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvZ2VuZXJhdGVQbGFuLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgQW50aHJvcGljIGZyb20gXCJAYW50aHJvcGljLWFpL3Nka1wiO1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSBcIkBuZXRsaWZ5L2Z1bmN0aW9uc1wiO1xuXG5pbnRlcmZhY2UgTGl2ZU5vdGUge1xuICBpZDogc3RyaW5nO1xuICB0aW1lc3RhbXA6IHN0cmluZztcbiAgdGV4dDogc3RyaW5nO1xuICBjYXRlZ29yeT86IFwiY292ZXJlZFwiIHwgXCJvYnNlcnZhdGlvblwiIHwgXCJyZW1pbmRlclwiIHwgXCJjaG9yZW9ncmFwaHlcIjtcbn1cblxuaW50ZXJmYWNlIENsYXNzSW5mbyB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZGF5OiBzdHJpbmc7XG4gIHN0YXJ0VGltZTogc3RyaW5nO1xuICBlbmRUaW1lOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBSZXF1ZXN0Qm9keSB7XG4gIGNsYXNzSW5mbzogQ2xhc3NJbmZvO1xuICBub3RlczogTGl2ZU5vdGVbXTtcbiAgcHJldmlvdXNQbGFucz86IHN0cmluZ1tdO1xuICBleHBhbmRlZFN1bW1hcnk/OiBzdHJpbmc7XG59XG5cbi8vIFZhbGlkYXRlIHRoZSBzZXNzaW9uIHRva2VuIHNlcnZlci1zaWRlXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZVRva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZXhwZWN0ZWRQYXNzd29yZCA9IE5ldGxpZnkuZW52LmdldChcIlZJVEVfQVBQX1BBU1NXT1JEXCIpIHx8IFwiZGFuY2UyMDI0XCI7XG4gIGNvbnN0IHNlY3JldCA9IE5ldGxpZnkuZW52LmdldChcIlNFU1NJT05fU0VDUkVUXCIpIHx8IFwiZGFuY2UtYXBwLXNlY3JldC0yMDI0XCI7XG4gIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgY29uc3QgZGF0YSA9IGVuY29kZXIuZW5jb2RlKGV4cGVjdGVkUGFzc3dvcmQgKyBzZWNyZXQpO1xuICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGRhdGEpO1xuICBjb25zdCBoYXNoQXJyYXkgPSBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2hCdWZmZXIpKTtcbiAgY29uc3QgZXhwZWN0ZWRUb2tlbiA9IGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gIHJldHVybiB0b2tlbiA9PT0gZXhwZWN0ZWRUb2tlbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgKHJlcXVlc3Q6IFJlcXVlc3QsIF9jb250ZXh0OiBDb250ZXh0KSA9PiB7XG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIgfSksIHtcbiAgICAgIHN0YXR1czogNDA1LFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQXV0aCBjaGVja1xuICBjb25zdCBhdXRoSGVhZGVyID0gcmVxdWVzdC5oZWFkZXJzLmdldChcIkF1dGhvcml6YXRpb25cIik7XG4gIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlcj8ucmVwbGFjZShcIkJlYXJlciBcIiwgXCJcIikgfHwgXCJcIjtcbiAgaWYgKCF0b2tlbiB8fCAhKGF3YWl0IHZhbGlkYXRlVG9rZW4odG9rZW4pKSkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9KSwge1xuICAgICAgc3RhdHVzOiA0MDEsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGFwaUtleSA9IE5ldGxpZnkuZW52LmdldChcIkFOVEhST1BJQ19BUElfS0VZXCIpO1xuICAgIGlmICghYXBpS2V5KSB7XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiQVBJIGtleSBub3QgY29uZmlndXJlZFwiIH0pLCB7XG4gICAgICAgIHN0YXR1czogNTAwLFxuICAgICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBib2R5OiBSZXF1ZXN0Qm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIGNvbnN0IHsgY2xhc3NJbmZvLCBub3RlcywgcHJldmlvdXNQbGFucywgZXhwYW5kZWRTdW1tYXJ5IH0gPSBib2R5O1xuXG4gICAgaWYgKCFjbGFzc0luZm8gfHwgIW5vdGVzKSB7XG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiTWlzc2luZyBjbGFzc0luZm8gb3Igbm90ZXNcIiB9KSwge1xuICAgICAgICBzdGF0dXM6IDQwMCxcbiAgICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ2FsY3VsYXRlIGR1cmF0aW9uIGZyb20gdGltZSBzdHJpbmdzXG4gICAgY29uc3QgcGFyc2VUaW1lID0gKHQ6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgW2gsIG1dID0gdC5zcGxpdCgnOicpLm1hcChOdW1iZXIpO1xuICAgICAgcmV0dXJuIGggKiA2MCArIG07XG4gICAgfTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IHBhcnNlVGltZShjbGFzc0luZm8uZW5kVGltZSkgLSBwYXJzZVRpbWUoY2xhc3NJbmZvLnN0YXJ0VGltZSk7XG5cbiAgICAvLyBPcmdhbml6ZSBub3RlcyBieSBjYXRlZ29yeVxuICAgIGNvbnN0IGNvdmVyZWQgPSBub3Rlcy5maWx0ZXIoKG4pID0+IG4uY2F0ZWdvcnkgPT09IFwiY292ZXJlZFwiKTtcbiAgICBjb25zdCBvYnNlcnZhdGlvbnMgPSBub3Rlcy5maWx0ZXIoKG4pID0+IG4uY2F0ZWdvcnkgPT09IFwib2JzZXJ2YXRpb25cIik7XG4gICAgY29uc3QgcmVtaW5kZXJzID0gbm90ZXMuZmlsdGVyKChuKSA9PiBuLmNhdGVnb3J5ID09PSBcInJlbWluZGVyXCIpO1xuICAgIGNvbnN0IGNob3Jlb2dyYXBoeSA9IG5vdGVzLmZpbHRlcigobikgPT4gbi5jYXRlZ29yeSA9PT0gXCJjaG9yZW9ncmFwaHlcIik7XG5cbiAgICBjb25zdCBpc0JhbGxldENsYXNzID0gY2xhc3NJbmZvLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJhbGxldFwiKTtcbiAgICBjb25zdCB3YXJtdXBMYWJlbCA9IGlzQmFsbGV0Q2xhc3MgPyBcIkJhcnJlXCIgOiBcIldhcm0tVXBcIjtcbiAgICBjb25zdCBnZW5lcmFsID0gbm90ZXMuZmlsdGVyKChuKSA9PiAhbi5jYXRlZ29yeSk7XG5cbiAgICBjb25zdCBwcm9tcHQgPSBgWW91IGFyZSBhIGRhbmNlIHRlYWNoZXIncyBhc3Npc3RhbnQgaGVscGluZyBwbGFuIG5leHQgd2VlaydzIGNsYXNzLiBOb3RlcyBhcmUgdGFrZW4gcXVpY2tseSBkdXJpbmcgY2xhc3MgXHUyMDE0IHNob3J0aGFuZCwgbm90IHBvbGlzaGVkLiBJbnRlcnByZXQgdGhlbSBnZW5lcm91c2x5LlxuXG5DTEFTUzogJHtjbGFzc0luZm8ubmFtZX1cbkRBWTogJHtjbGFzc0luZm8uZGF5fVxuXG5MQVNUIFdFRUsnUyBOT1RFUzpcbiR7Z2VuZXJhbC5sZW5ndGggPiAwID8gYFxcbkdFTkVSQUw6XFxuJHtnZW5lcmFsLm1hcCgobikgPT4gYC0gJHtuLnRleHR9YCkuam9pbihcIlxcblwiKX1gIDogXCJcIn1cbiR7Y292ZXJlZC5sZW5ndGggPiAwID8gYFxcbldIQVQgV0UgQ09WRVJFRDpcXG4ke2NvdmVyZWQubWFwKChuKSA9PiBgLSAke24udGV4dH1gKS5qb2luKFwiXFxuXCIpfWAgOiBcIlwifVxuJHtvYnNlcnZhdGlvbnMubGVuZ3RoID4gMCA/IGBcXG5TVFVERU5UIE9CU0VSVkFUSU9OUzpcXG4ke29ic2VydmF0aW9ucy5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG4ke3JlbWluZGVycy5sZW5ndGggPiAwID8gYFxcblJFTUlOREVSUyBGT1IgTkVYVCBDTEFTUzpcXG4ke3JlbWluZGVycy5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG4ke2Nob3Jlb2dyYXBoeS5sZW5ndGggPiAwID8gYFxcbkNIT1JFT0dSQVBIWSBOT1RFUzpcXG4ke2Nob3Jlb2dyYXBoeS5tYXAoKG4pID0+IGAtICR7bi50ZXh0fWApLmpvaW4oXCJcXG5cIil9YCA6IFwiXCJ9XG4ke2V4cGFuZGVkU3VtbWFyeSA/IGBcXG5BSSBTVU1NQVJZIE9GIExBU1QgQ0xBU1M6XFxuJHtleHBhbmRlZFN1bW1hcnl9YCA6IFwiXCJ9XG4ke3ByZXZpb3VzUGxhbnM/Lmxlbmd0aCA/IGBcXG5QUkVWSU9VUyBQTEFOUyBGT1IgQ09OVEVYVDpcXG4ke3ByZXZpb3VzUGxhbnMuc2xpY2UoLTIpLmpvaW4oXCJcXG4tLS1cXG5cIil9YCA6IFwiXCJ9XG5cbkNyZWF0ZSBhIGxlc3NvbiBwbGFuIGZvciBORVhUIFdFRUsgdXNpbmcgdGhpcyBzdHJ1Y3R1cmUgKGFsd2F5cyBpbiB0aGlzIG9yZGVyKTpcblxuMS4gKioke3dhcm11cExhYmVsfSoqXG4yLiAqKlN0cmV0Y2hpbmcqKlxuMy4gKipDZW50ZXIgV29yayoqXG40LiAqKkFjcm9zcyB0aGUgRmxvb3IqKlxuNS4gKipDaG9yZW9ncmFwaHkvQ29tYm8qKiAob25seSBpZiBhcHBsaWNhYmxlKVxuNi4gKipLZXkgUmVtaW5kZXJzKipcblxuUlVMRVM6XG4tIEZvciBlYWNoIHNlY3Rpb24sIGNsZWFybHkgbWFyayB3aGF0IGlzIFJFVklFVyAoZnJvbSBsYXN0IHdlZWssIG5lZWRzIHJlaW5mb3JjZW1lbnQpIHZzIE5FVy9QUk9HUkVTUyAoaW50cm9kdWNpbmcgb3IgYWR2YW5jaW5nKVxuLSBSZW1pbmRlcnMgZnJvbSBsYXN0IHdlZWsncyBub3RlcyBtdXN0IGJlIHZpc2libHkgaW5jb3Jwb3JhdGVkLCBub3QgYnVyaWVkXG4tIERvIE5PVCBpbmNsdWRlIHRpbWUgZXN0aW1hdGVzXG4tIFVzZSBidWxsZXQgcG9pbnRzLCBrZWVwIGl0IHNjYW5uYWJsZVxuLSBUb25lOiBwcmFjdGljYWwgbm90ZXMtdG8tc2VsZiB3aXRoIGVub3VnaCBzdHJ1Y3R1cmUgdG8gZm9sbG93IGF0IGEgZ2xhbmNlLiBOb3QgYSBmb3JtYWwgZG9jdW1lbnQsIG5vdCByYXcgc2hvcnRoYW5kIFx1MjAxNCBzb21ld2hlcmUgaW4gYmV0d2Vlbi5cbi0gT25seSBpbmNsdWRlIHNlY3Rpb25zIHRoYXQgaGF2ZSByZWxldmFudCBjb250ZW50XG4tIEJlIHNwZWNpZmljIHRvIHRoZSBub3RlcyBwcm92aWRlZCBcdTIwMTQgZG9uJ3QgaW52ZW50IGV4ZXJjaXNlcyB0aGF0IHdlcmVuJ3QgbWVudGlvbmVkIG9yIGltcGxpZWRgO1xuXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IEFudGhyb3BpYyh7IGFwaUtleSB9KTtcblxuICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQubWVzc2FnZXMuY3JlYXRlKHtcbiAgICAgIG1vZGVsOiBcImNsYXVkZS1zb25uZXQtNC0yMDI1MDUxNFwiLFxuICAgICAgbWF4X3Rva2VuczogMTAyNCxcbiAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudDogcHJvbXB0IH1dLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcGxhbkNvbnRlbnQgPSBtZXNzYWdlLmNvbnRlbnRbMF0udHlwZSA9PT0gXCJ0ZXh0XCIgPyBtZXNzYWdlLmNvbnRlbnRbMF0udGV4dCA6IFwiXCI7XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBwbGFuOiBwbGFuQ29udGVudCxcbiAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBjbGFzc0lkOiBjbGFzc0luZm8uaWQsXG4gICAgICBjbGFzc05hbWU6IGNsYXNzSW5mby5uYW1lLFxuICAgIH0pLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZ2VuZXJhdGluZyBwbGFuOlwiLCBlcnJvcik7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICBlcnJvcjogXCJGYWlsZWQgdG8gZ2VuZXJhdGUgcGxhblwiLFxuICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gZXJyb3JcIixcbiAgICB9KSwge1xuICAgICAgc3RhdHVzOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBQUEsT0FBTyxlQUFlO0FBMEJ0QixlQUFlLGNBQWMsT0FBaUM7QUFDNUQsUUFBTSxtQkFBbUIsUUFBUSxJQUFJLElBQUksbUJBQW1CLEtBQUs7QUFDakUsUUFBTSxTQUFTLFFBQVEsSUFBSSxJQUFJLGdCQUFnQixLQUFL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
