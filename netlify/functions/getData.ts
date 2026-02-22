import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { validateToken } from "./_shared/auth.ts";

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
    const store = getStore({ name: "app-data", consistency: "strong" });
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
