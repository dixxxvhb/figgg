import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";
import { validateToken } from "./_shared/auth.ts";

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check auth - support both header and query param (for sendBeacon which can't set headers)
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
    const data = await request.json();
    const store = getStore({ name: "app-data", consistency: "strong" });

    await store.setJSON("main", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving data:", error);
    return new Response(JSON.stringify({ error: "Failed to save data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
