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

// Blocked hostname patterns to prevent SSRF
const BLOCKED_HOSTS = [
  "localhost", "127.", "0.0.0.0", "10.", "192.168.",
  "172.16.", "172.17.", "172.18.", "172.19.", "172.20.",
  "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
  "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
  "169.254.", "[::1]", "metadata.google", "metadata.aws",
];

export default async (request: Request, _context: Context) => {
  // Check auth
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";

  if (!token || !(await validateToken(token))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the calendar URL from query params
  const url = new URL(request.url);
  const calendarUrl = url.searchParams.get("url");

  if (!calendarUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Normalize webcal:// to https://
    const normalizedUrl = calendarUrl.replace(/^webcal:\/\//, "https://");

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return new Response(JSON.stringify({ error: "Only HTTPS URLs are allowed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Block private/internal network addresses
    const hostname = parsedUrl.hostname.toLowerCase();
    if (BLOCKED_HOSTS.some(p => hostname.startsWith(p) || hostname === p)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        "Accept": "text/calendar, text/plain, */*",
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar fetch failed: HTTP ${response.status}`);
    }

    const icsText = await response.text();

    return new Response(icsText, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Calendar proxy error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch calendar" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
