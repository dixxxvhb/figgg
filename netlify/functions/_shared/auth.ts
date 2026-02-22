// Shared auth validation for all serverless functions
export async function validateToken(token: string): Promise<boolean> {
  const expectedPassword = Netlify.env.get("VITE_APP_PASSWORD") || "dance2024";
  const secret = Netlify.env.get("SESSION_SECRET") || "dance-app-secret-2024";
  const encoder = new TextEncoder();
  const data = encoder.encode(expectedPassword + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedToken = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return token === expectedToken;
}
