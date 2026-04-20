import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// AI callable functions
export { aiChat } from "./aiChat";
// generatePlan kept as standalone for WeekPlanner which doesn't pass aiContext.
// expandNotes, organizeNotes, detectReminders removed Apr 2026 — superseded by
// aiChat modes; client always passes context and routes through the dispatcher.
export { generatePlan } from "./generatePlan";

// HTTP functions
export { calendarProxy } from "./calendarProxy";

// Google Calendar CRUD
export {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
} from "./googleCalendar";

// Scheduled functions
export { generateDailyBriefing, triggerDailyBriefing } from "./generateDailyBriefing";
export { nightlySweep } from "./nightlySweep";
