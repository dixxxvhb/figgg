import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { buildPlanPrompt, stripMarkdown, type LiveNote, type ClassInfo } from "./utils/planPrompt";
import { withRetryOn429, withTimeout } from "./utils/anthropic";

const PER_CLASS_TIMEOUT_MS = 30_000;

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");
const db = admin.firestore();

/**
 * Returns the Monday of the week containing the given date, as 'YYYY-MM-DD'.
 */
function getWeekOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 0 = Sunday → go back 6, day 1 = Monday → go back 0, etc.)
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

/**
 * Returns the Monday of the next week given a weekOf string.
 */
function getNextWeekOf(weekOf: string): string {
  const d = new Date(weekOf + "T00:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

/**
 * Returns true if the class ended less than 30 minutes ago or is still in session.
 * Guards against generating plans for classes that just ended (e.g., 9:30pm class
 * while sweep runs at 10pm).
 */
function isRecentlyActive(endTime: string, now: Date): boolean {
  // endTime is like "20:00" or "8:00 PM" — parse it
  const today = now.toISOString().split("T")[0];
  let endDate: Date;

  // Handle 24h format (e.g., "20:00")
  if (/^\d{1,2}:\d{2}$/.test(endTime)) {
    endDate = new Date(`${today}T${endTime.padStart(5, "0")}:00`);
  } else {
    // Handle 12h format (e.g., "8:00 PM")
    endDate = new Date(`${today} ${endTime}`);
  }

  if (isNaN(endDate.getTime())) return false;

  const diffMs = now.getTime() - endDate.getTime();
  // Still in session (negative diff) or ended < 30 min ago
  return diffMs < 30 * 60 * 1000;
}

/**
 * Builds a simple fallback plan from raw notes when AI generation fails.
 */
function buildFallbackPlan(notes: LiveNote[]): string {
  const lines: string[] = [];
  const nextWeek = notes.filter((n) => n.category === "next-week" || n.category === "reminder");
  const needsWork = notes.filter((n) => n.category === "needs-work" || n.category === "observation");
  const general = notes.filter((n) => !n.category);

  if (nextWeek.length > 0) {
    lines.push("PRIORITY");
    nextWeek.forEach((n) => lines.push(`- ${n.text}`));
    lines.push("");
  }
  if (needsWork.length > 0) {
    lines.push("NEEDS WORK");
    needsWork.forEach((n) => lines.push(`- ${n.text}`));
    lines.push("");
  }
  if (general.length > 0) {
    lines.push("NOTES");
    general.forEach((n) => lines.push(`- ${n.text}`));
    lines.push("");
  }

  return lines.join("\n").trim() || "Review notes from this week.";
}

export const nightlySweep = onSchedule(
  {
    schedule: "every day 22:00",
    timeZone: "America/New_York",
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: [anthropicKey],
  },
  async () => {
    console.log("nightlySweep: starting nightly sweep");

    const now = new Date();
    const currentWeekOf = getWeekOf(now);
    const nextWeekOf = getNextWeekOf(currentWeekOf);

    console.log(`nightlySweep: currentWeek=${currentWeekOf}, nextWeek=${nextWeekOf}`);

    // List all users
    const usersSnap = await db.collection("users").listDocuments();
    console.log(`nightlySweep: found ${usersSnap.length} users`);

    for (const userRef of usersSnap) {
      const uid = userRef.id;
      console.log(`nightlySweep: processing user ${uid}`);

      try {
        // Get current week's notes
        const currentWeekDoc = await db
          .doc(`users/${uid}/weekNotes/${currentWeekOf}`)
          .get();

        if (!currentWeekDoc.exists) {
          console.log(`nightlySweep: no weekNotes for ${currentWeekOf}, skipping user ${uid}`);
          continue;
        }

        const currentWeekData = currentWeekDoc.data() as Record<string, unknown>;
        const classNotes = (currentWeekData?.classNotes ?? {}) as Record<
          string,
          { liveNotes?: LiveNote[]; plan?: string; eventTitle?: string }
        >;

        // Get next week's doc (may not exist yet)
        const nextWeekDoc = await db
          .doc(`users/${uid}/weekNotes/${nextWeekOf}`)
          .get();
        const nextWeekData = nextWeekDoc.exists
          ? (nextWeekDoc.data() as Record<string, unknown>)
          : null;
        const nextWeekClassNotes = (nextWeekData?.classNotes ?? {}) as Record<
          string,
          { plan?: string }
        >;

        // Find orphaned classes: have liveNotes but no plan in next week
        const orphanedClassIds: string[] = [];
        for (const [classId, notes] of Object.entries(classNotes)) {
          const hasNotes = notes?.liveNotes && notes.liveNotes.length > 0;
          const nextWeekEntry = nextWeekClassNotes[classId];
          const hasPlan = nextWeekEntry?.plan && nextWeekEntry.plan.trim().length > 0;

          if (hasNotes && !hasPlan) {
            orphanedClassIds.push(classId);
          }
        }

        if (orphanedClassIds.length === 0) {
          console.log(`nightlySweep: no orphaned classes for user ${uid}`);
          continue;
        }

        console.log(
          `nightlySweep: found ${orphanedClassIds.length} orphaned classes for user ${uid}: ${orphanedClassIds.join(", ")}`
        );

        // Get previous week's notes for continuity
        const prevWeekOf = getWeekOf(new Date(currentWeekOf + "T00:00:00"));
        // Actually we need the week BEFORE currentWeekOf
        const prevWeekDate = new Date(currentWeekOf + "T00:00:00");
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        const prevWeekOfStr = prevWeekDate.toISOString().split("T")[0];

        const prevWeekDoc = await db
          .doc(`users/${uid}/weekNotes/${prevWeekOfStr}`)
          .get();
        const prevWeekData = prevWeekDoc.exists
          ? (prevWeekDoc.data() as Record<string, unknown>)
          : null;
        const prevWeekClassNotes = (prevWeekData?.classNotes ?? {}) as Record<
          string,
          { plan?: string }
        >;

        const anthropic = new Anthropic({ apiKey: anthropicKey.value() });
        const updates: Record<string, unknown> = {};

        for (const classId of orphanedClassIds) {
          const entry = classNotes[classId];
          const liveNotes = entry.liveNotes ?? [];

          // Fetch class info
          let classInfo: ClassInfo | null = null;
          try {
            const collection = classId.startsWith("cal-") ? "calendarEvents" : "classes";
            const classDoc = await db.doc(`users/${uid}/${collection}/${classId}`).get();

            if (classDoc.exists) {
              const data = classDoc.data() as Record<string, unknown>;
              classInfo = {
                id: classId,
                name: (data.name as string) || (data.title as string) || "Class",
                day: (data.day as string) || "",
                startTime: (data.startTime as string) || "",
                endTime: (data.endTime as string) || "",
                level: data.level as string | undefined,
                recitalSong: data.recitalSong as string | undefined,
                isRecitalSong: data.isRecitalSong as boolean | undefined,
                choreographyNotes: data.choreographyNotes as string | undefined,
              };
            }
          } catch (err) {
            console.log(`nightlySweep: could not fetch class doc for ${classId}: ${err}`);
          }

          // Fallback if class doc not found
          if (!classInfo) {
            classInfo = {
              id: classId,
              name: entry.eventTitle || "Class",
              day: "",
              startTime: "",
              endTime: "",
            };
          }

          // Skip if class is recently active
          if (classInfo.endTime && isRecentlyActive(classInfo.endTime, now)) {
            console.log(`nightlySweep: skipping ${classId} — recently active`);
            continue;
          }

          // Look for previous plan
          const previousPlans: string[] = [];
          const prevPlan = prevWeekClassNotes[classId]?.plan;
          if (prevPlan && prevPlan.trim()) {
            previousPlans.push(prevPlan);
          }

          // Generate plan via Claude
          let plan: string;
          try {
            const prompt = buildPlanPrompt({
              classInfo,
              notes: liveNotes,
              previousPlans,
            });

            const response = await withRetryOn429(() =>
              withTimeout(
                anthropic.messages.create({
                  model: "claude-sonnet-4-6",
                  max_tokens: 800,
                  messages: [{ role: "user", content: prompt }],
                }),
                PER_CLASS_TIMEOUT_MS,
                "per-class timeout",
              )
            );

            const textBlock = response.content.find((b) => b.type === "text");
            plan = textBlock ? stripMarkdown(textBlock.text) : buildFallbackPlan(liveNotes);
            console.log(`nightlySweep: generated AI plan for ${classId}`);
          } catch (aiErr) {
            console.log(`nightlySweep: AI failed for ${classId}, using fallback: ${aiErr}`);
            plan = buildFallbackPlan(liveNotes);
          }

          // Use dot notation for the update
          updates[`classNotes.${classId}.plan`] = plan;
        }

        // Write all plans to next week's doc
        if (Object.keys(updates).length > 0) {
          const nextWeekRef = db.doc(`users/${uid}/weekNotes/${nextWeekOf}`);

          if (nextWeekDoc.exists) {
            await nextWeekRef.update(updates);
          } else {
            // Create the doc with id and weekOf fields, plus the plans
            // Build the classNotes object from dot notation
            const classNotesObj: Record<string, { plan: string }> = {};
            for (const [key, value] of Object.entries(updates)) {
              // key is like "classNotes.cal-4nd8z2.plan"
              const parts = key.split(".");
              if (parts.length === 3 && parts[0] === "classNotes") {
                const cid = parts[1];
                classNotesObj[cid] = { plan: value as string };
              }
            }
            await nextWeekRef.set({
              id: nextWeekOf,
              weekOf: nextWeekOf,
              classNotes: classNotesObj,
            });
          }

          console.log(
            `nightlySweep: wrote ${Object.keys(updates).length} plans for user ${uid} to week ${nextWeekOf}`
          );
        }
      } catch (err) {
        console.error(`nightlySweep: error processing user ${uid}:`, err);
      }
    }

    console.log("nightlySweep: sweep complete");
  }
);
