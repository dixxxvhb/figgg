
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/getData.ts
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
var getData_default = async (request, _context) => {
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
    const store = getStore({ name: "app-data", consistency: "strong" });
    const data = await store.get("main", { type: "json" });
    return new Response(JSON.stringify(data || null), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error reading data:", error);
    return new Response(JSON.stringify({ error: "Failed to read data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
export {
  getData_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvZ2V0RGF0YS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgZ2V0U3RvcmUgfSBmcm9tIFwiQG5ldGxpZnkvYmxvYnNcIjtcbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gXCJAbmV0bGlmeS9mdW5jdGlvbnNcIjtcblxuLy8gVmFsaWRhdGUgdGhlIHNlc3Npb24gdG9rZW4gc2VydmVyLXNpZGVcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBleHBlY3RlZFBhc3N3b3JkID0gTmV0bGlmeS5lbnYuZ2V0KFwiVklURV9BUFBfUEFTU1dPUkRcIikgfHwgXCJkYW5jZTIwMjRcIjtcbiAgY29uc3Qgc2VjcmV0ID0gTmV0bGlmeS5lbnYuZ2V0KFwiU0VTU0lPTl9TRUNSRVRcIikgfHwgXCJkYW5jZS1hcHAtc2VjcmV0LTIwMjRcIjtcbiAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICBjb25zdCBkYXRhID0gZW5jb2Rlci5lbmNvZGUoZXhwZWN0ZWRQYXNzd29yZCArIHNlY3JldCk7XG4gIGNvbnN0IGhhc2hCdWZmZXIgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmRpZ2VzdChcIlNIQS0yNTZcIiwgZGF0YSk7XG4gIGNvbnN0IGhhc2hBcnJheSA9IEFycmF5LmZyb20obmV3IFVpbnQ4QXJyYXkoaGFzaEJ1ZmZlcikpO1xuICBjb25zdCBleHBlY3RlZFRva2VuID0gaGFzaEFycmF5Lm1hcChiID0+IGIudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKTtcbiAgcmV0dXJuIHRva2VuID09PSBleHBlY3RlZFRva2VuO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxdWVzdDogUmVxdWVzdCwgX2NvbnRleHQ6IENvbnRleHQpID0+IHtcbiAgLy8gQ2hlY2sgYXV0aCAtIHN1cHBvcnQgYm90aCBoZWFkZXIgYW5kIHF1ZXJ5IHBhcmFtIChmb3Igc2VuZEJlYWNvbilcbiAgY29uc3QgYXV0aEhlYWRlciA9IHJlcXVlc3QuaGVhZGVycy5nZXQoXCJBdXRob3JpemF0aW9uXCIpO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcXVlc3QudXJsKTtcbiAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyPy5yZXBsYWNlKFwiQmVhcmVyIFwiLCBcIlwiKSB8fCB1cmwuc2VhcmNoUGFyYW1zLmdldChcInRva2VuXCIpIHx8IFwiXCI7XG5cbiAgaWYgKCF0b2tlbiB8fCAhKGF3YWl0IHZhbGlkYXRlVG9rZW4odG9rZW4pKSkge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJVbmF1dGhvcml6ZWRcIiB9KSwge1xuICAgICAgc3RhdHVzOiA0MDEsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHN0b3JlID0gZ2V0U3RvcmUoeyBuYW1lOiBcImFwcC1kYXRhXCIsIGNvbnNpc3RlbmN5OiBcInN0cm9uZ1wiIH0pO1xuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBzdG9yZS5nZXQoXCJtYWluXCIsIHsgdHlwZTogXCJqc29uXCIgfSk7XG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KGRhdGEgfHwgbnVsbCksIHtcbiAgICAgIHN0YXR1czogMjAwLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciByZWFkaW5nIGRhdGE6XCIsIGVycm9yKTtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiRmFpbGVkIHRvIHJlYWQgZGF0YVwiIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICB9KTtcbiAgfVxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxTQUFTLGdCQUFnQjtBQUl6QixlQUFlLGNBQWMsT0FBaUM7QUFDNUQsUUFBTSxtQkFBbUIsUUFBUSxJQUFJLElBQUksbUJBQW1CLEtBQUs7QUFDakUsUUFBTSxTQUFTLFFBQVEsSUFBSSxJQUFJLGdCQUFnQixLQUFLO0FBQ3BELFFBQU0sVUFBVSxJQUFJLFlBQVk7QUFDaEMsUUFBTSxPQUFPLFFBQVEsT0FBTyxtQkFBbUIsTUFBTTtBQUNyRCxRQUFNLGFBQWEsTUFBTSxPQUFPLE9BQU8sT0FBTyxXQUFXLElBQUk7QUFDN0QsUUFBTSxZQUFZLE1BQU0sS0FBSyxJQUFJLFdBQVcsVUFBVSxDQUFDO0FBQ3ZELFFBQU0sZ0JBQWdCLFVBQVUsSUFBSSxPQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRTtBQUNqRixTQUFPLFVBQVU7QUFDbkI7QUFFQSxJQUFPLGtCQUFRLE9BQU8sU0FBa0IsYUFBc0I7QUFFNUQsUUFBTSxhQUFhLFFBQVEsUUFBUSxJQUFJLGVBQWU7QUFDdEQsUUFBTSxNQUFNLElBQUksSUFBSSxRQUFRLEdBQUc7QUFDL0IsUUFBTSxRQUFRLFlBQVksUUFBUSxXQUFXLEVBQUUsS0FBSyxJQUFJLGFBQWEsSUFBSSxPQUFPLEtBQUs7QUFFckYsTUFBSSxDQUFDLFNBQVMsQ0FBRSxNQUFNLGNBQWMsS0FBSyxHQUFJO0FBQzNDLFdBQU8sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLE9BQU8sZUFBZSxDQUFDLEdBQUc7QUFBQSxNQUM3RCxRQUFRO0FBQUEsTUFDUixTQUFTLEVBQUUsZ0JBQWdCLG1CQUFtQjtBQUFBLElBQ2hELENBQUM7QUFBQSxFQUNIO0FBRUEsTUFBSTtBQUNGLFVBQU0sUUFBUSxTQUFTLEVBQUUsTUFBTSxZQUFZLGFBQWEsU0FBUyxDQUFDO0FBQ2xFLFVBQU0sT0FBTyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFFckQsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLFFBQVEsSUFBSSxHQUFHO0FBQUEsTUFDaEQsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRCxDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxZQUFRLE1BQU0sdUJBQXVCLEtBQUs7QUFDMUMsV0FBTyxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsT0FBTyxzQkFBc0IsQ0FBQyxHQUFHO0FBQUEsTUFDcEUsUUFBUTtBQUFBLE1BQ1IsU0FBUyxFQUFFLGdCQUFnQixtQkFBbUI7QUFBQSxJQUNoRCxDQUFDO0FBQUEsRUFDSDtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=
