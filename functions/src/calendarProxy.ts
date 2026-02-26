import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Blocked hostname patterns to prevent SSRF
const BLOCKED_HOSTS = [
  "localhost", "127.", "0.0.0.0", "10.", "192.168.",
  "172.16.", "172.17.", "172.18.", "172.19.", "172.20.",
  "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
  "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
  "169.254.", "[::1]", "metadata.google", "metadata.aws",
];

export const calendarProxy = onRequest(
  { timeoutSeconds: 30, memory: "256MiB", cors: true },
  async (req, res) => {
    // Verify Firebase Auth token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.replace("Bearer ", "");
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // Get the calendar URL from query params
    const calendarUrl = req.query.url as string;
    if (!calendarUrl) {
      res.status(400).json({ error: "Missing url parameter" });
      return;
    }

    try {
      // Normalize webcal:// to https://
      const normalizedUrl = calendarUrl.replace(/^webcal:\/\//, "https://");

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(normalizedUrl);
      } catch {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }

      // Only allow HTTPS
      if (parsedUrl.protocol !== "https:") {
        res.status(400).json({ error: "Only HTTPS URLs are allowed" });
        return;
      }

      // Block private/internal network addresses
      const hostname = parsedUrl.hostname.toLowerCase();
      if (BLOCKED_HOSTS.some(p => hostname.startsWith(p) || hostname === p)) {
        res.status(403).json({ error: "URL not allowed" });
        return;
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

      res.set("Content-Type", "text/calendar");
      res.set("Cache-Control", "private, no-cache");
      res.status(200).send(icsText);
    } catch (error) {
      console.error("Calendar proxy error:", error);
      res.status(502).json({ error: "Failed to fetch calendar" });
    }
  }
);
