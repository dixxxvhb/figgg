import type { Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { password } = await request.json();
    const expectedPassword = Netlify.env.get("VITE_APP_PASSWORD") || "dance2024";

    if (password !== expectedPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate a session token: hash of password + server secret
    const secret = Netlify.env.get("SESSION_SECRET") || "dance-app-secret-2024";
    const encoder = new TextEncoder();
    const data = encoder.encode(password + secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const token = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Login failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
