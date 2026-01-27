import { getStore } from "@netlify/blobs";
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

export default async (request: Request, _context: Context) => {
  // Check auth - support both header and query param (for sendBeacon)
  const authHeader = request.headers.get("Authorization");
  const url = new URL(request.url);
  const token = authHeader?.replace("Bearer ", "") || url.searchParams.get("token") || "";

  if (!token || !(await validateToken(token))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const store = getStore("app-data");
    const data = await store.get("main", { type: "json" });

    return new Response(JSON.stringify(data || null), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error reading data:", error);
    return new Response(JSON.stringify({ error: "Failed to read data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
