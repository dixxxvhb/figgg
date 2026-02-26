import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// AI callable functions
export { aiChat } from "./aiChat";
export { expandNotes } from "./expandNotes";
export { generatePlan } from "./generatePlan";
export { organizeNotes } from "./organizeNotes";
export { detectReminders } from "./detectReminders";

// HTTP functions
export { calendarProxy } from "./calendarProxy";
