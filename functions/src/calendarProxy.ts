import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuth } from "./utils/auth";

// Blocked hostname patterns to prevent SSRF
const BLOCKED_HOSTS = [
  "localhost", "127.", "0.0.0.0", "10.", "192.168.",
  "172.16.", "172.17.", "172.18.", "172.19.", "172.20.",
  "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
  "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
  "169.254.", "[::1]", "metadata.google", "metadata.aws",
];

export const calendarProxy = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireAuth(request);

    const { url: calendarUrl } = request.data as { url: string };
    if (!calendarUrl) {
      throw new HttpsError("invalid-argument", "Missing url parameter");
    }

    try {
      // Normalize webcal:// to https://
      const normalizedUrl = calendarUrl.replace(/^webcal:\/\//, "https://");

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(normalizedUrl);
      } catch {
        throw new HttpsError("invalid-argument", "Invalid URL");
      }

      // Only allow HTTPS
      if (parsedUrl.protocol !== "https:") {
        throw new HttpsError("invalid-argument", "Only HTTPS URLs are allowed");
      }

      // Block private/internal network addresses
      const hostname = parsedUrl.hostname.toLowerCase();
      if (BLOCKED_HOSTS.some(p => hostname.startsWith(p) || hostname === p)) {
        throw new HttpsError("permission-denied", "URL not allowed");
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
      return { icsText };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Calendar proxy error:", error);
      throw new HttpsError("unavailable", "Failed to fetch calendar");
    }
  }
);
