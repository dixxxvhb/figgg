
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/saveData.ts
import { getStore } from "@netlify/blobs";
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
var saveData_default = async (request, _context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authHeader = request.headers.get("Authorization");
  const url = new URL(request.url);
  const token = authHeader?.replace("Bearer ", "") || url.searchParams.get("token") || "";
  if (!token || !await validateToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const data = await request.json();
    const store = getStore({ name: "app-data", consistency: "strong" });
    await store.setJSON("main", data);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error saving data:", error);
    return new Response(JSON.stringify({ error: "Failed to save data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  saveData_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvc2F2ZURhdGEudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGdldFN0b3JlIH0gZnJvbSBcIkBuZXRsaWZ5L2Jsb2JzXCI7XG5pbXBvcnQgdHlwZSB7IENvbnRleHQgfSBmcm9tIFwiQG5ldGxpZnkvZnVuY3Rpb25zXCI7XG5cbi8vIFZhbGlkYXRlIHRoZSBzZXNzaW9uIHRva2VuIHNlcnZlci1zaWRlXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZVRva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZXhwZWN0ZWRQYXNzd29yZCA9IE5ldGxpZnkuZW52LmdldChcIlZJVEVfQVBQX1BBU1NXT1JEXCIpIHx8IFwiZGFuY2UyMDI0XCI7XG4gIGNvbnN0IHNlY3JldCA9IE5ldGxpZnkuZW52LmdldChcIlNFU1NJT05fU0VDUkVUXCIpIHx8IFwiZGFuY2UtYXBwLXNlY3JldC0yMDI0XCI7XG4gIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgY29uc3QgZGF0YSA9IGVuY29kZXIuZW5jb2RlKGV4cGVjdGVkUGFzc3dvcmQgKyBzZWNyZXQpO1xuICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMjU2XCIsIGRhdGEpO1xuICBjb25zdCBoYXNoQXJyYXkgPSBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2hCdWZmZXIpKTtcbiAgY29uc3QgZXhwZWN0ZWRUb2tlbiA9IGhhc2hBcnJheS5tYXAoYiA9PiBiLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gIHJldHVybiB0b2tlbiA9PT0gZXhwZWN0ZWRUb2tlbjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgKHJlcXVlc3Q6IFJlcXVlc3QsIF9jb250ZXh0OiBDb250ZXh0KSA9PiB7XG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiTWV0aG9kIG5vdCBhbGxvd2VkXCIgfSksIHtcbiAgICAgIHN0YXR1czogNDA1LFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gQ2hlY2sgYXV0aCAtIHN1cHBvcnQgYm90aCBoZWFkZXIgYW5kIHF1ZXJ5IHBhcmFtIChmb3Igc2VuZEJlYWNvbiB3aGljaCBjYW4ndCBzZXQgaGVhZGVycylcbiAgY29uc3QgYXV0aEhlYWRlciA9IHJlcXVlc3QuaGVhZGVycy5nZXQoXCJBdXRob3JpemF0aW9uXCIpO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcXVlc3QudXJsKTtcbiAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyPy5yZXBsYWNlKFwiQmVhcmVyIFwiLCBcIlwiKSB8fCB1cmwuc2VhcmNoUGFyYW1zLmdldChcInRva2VuXCIpIHx8IFwiXCI7XG5cbiAgaWYgKCF0b2tlbiB8fCAhKGF3YWl0IHZhbGlkYXRlVG9rZW4odG9rZW4pKSkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9KSwge1xuICAgICAgc3RhdHVzOiA0MDEsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcbiAgICBjb25zdCBzdG9yZSA9IGdldFN0b3JlKHsgbmFtZTogXCJhcHAtZGF0YVwiLCBjb25zaXN0ZW5jeTogXCJzdHJvbmdcIiB9KTtcblxuICAgIGF3YWl0IHN0b3JlLnNldEpTT04oXCJtYWluXCIsIGRhdGEpO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSksIHtcbiAgICAgIHN0YXR1czogMjAwLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzYXZpbmcgZGF0YTpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJGYWlsZWQgdG8gc2F2ZSBkYXRhXCIgfSksIHtcbiAgICAgIHN0YXR1czogNTAwLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBLFNBQVMsZ0JBQWdCO0FBSXpCLGVBQWUsY0FBYyxPQUFpQztBQUM1RCxRQUFNLG1CQUFtQixRQUFRLElBQUksSUFBSSxtQkFBbUIsS0FBSztBQUNqRSxRQUFNLFNBQVMsUUFBUSxJQUFJLElBQUksZ0JBQWdCLEtBQUs7QUFDcEQsUUFBTSxVQUFVLElBQUksWUFBWTtBQUNoQyxRQUFNLE9BQU8sUUFBUSxPQUFPLG1CQUFtQixNQUFNO0FBQ3JELFFBQU0sYUFBYSxNQUFNLE9BQU8sT0FBTyxPQUFPLFdBQVcsSUFBSTtBQUM3RCxRQUFNLFlBQVksTUFBTSxLQUFLLElBQUksV0FBVyxVQUFVLENBQUM7QUFDdkQsUUFBTSxnQkFBZ0IsVUFBVSxJQUFJLE9BQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxTQUFTLEdBQUcsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFO0FBQ2pGLFNBQU8sVUFBVTtBQUNuQjtBQUVBLElBQU8sbUJBQVEsT0FBTyxTQUFrQixhQUFzQjtBQUM1RCxNQUFJLFFBQVEsV0FBVyxRQUFRO0FBQzdCLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8scUJBQXFCLENBQUMsR0FBRztBQUFBLE1BQ25FLFFBQVE7QUFBQSxNQUNSLFNBQVMsRUFBRSxnQkFBZ0IsbUJBQW1CO0FBQUEsSUFDaEQsQ0FBQztBQUFBLEVBQ0g7QUFHQSxRQUFNLGFBQWEsUUFBUSxRQUFRLElBQUksZUFBZTtBQUN0RCxRQUFNLE1BQU0sSUFBSSxJQUFJLFFBQVEsR0FBRztBQUMvQixRQUFNLFFBQVEsWUFBWSxRQUFRLFdBQVcsRUFBRSxLQUFLLElBQUksYUFBYSxJQUFJLE9BQU8sS0FBSztBQUVyRixNQUFJLENBQUMsU0FBUyxDQUFFLE1BQU0sY0FBYyxLQUFLLEdBQUk7QUFDM0MsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsT0FBTyxlQUFlLENBQUMsR0FBRztBQUFBLE1BQzdELFFBQVE7QUFBQSxNQUNSLFNBQVMsRUFBRSxnQkFBZ0IsbUJBQW1CO0FBQUEsSUFDaEQsQ0FBQztBQUFBLEVBQ0g7QUFFQSxNQUFJO0FBQ0YsVUFBTSxPQUFPLE1BQU0sUUFBUSxLQUFLO0FBQ2hDLFVBQU0sUUFBUSxTQUFTLEVBQUUsTUFBTSxZQUFZLGFBQWEsU0FBUyxDQUFDO0FBRWxFLFVBQU0sTUFBTSxRQUFRLFFBQVEsSUFBSTtBQUVoQyxXQUFPLElBQUksU0FBUyxLQUFLLFVBQVUsRUFBRSxTQUFTLEtBQUssQ0FBQyxHQUFHO0FBQUEsTUFDckQsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRCxDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sc0JBQXNCLEtBQUs7QUFDekMsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsT0FBTyxzQkFBc0IsQ0FBQyxHQUFHO0FBQUEsTUFDcEUsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRCxDQUFDO0FBQUEsRUFDSDtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=
