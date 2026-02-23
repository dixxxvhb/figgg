# Figgg AI Layer — Design Document

**Date:** 2026-02-23
**Status:** Approved
**Summary:** Transform Figgg's AI from isolated tools into an integrated intelligence layer that can see Dixon's full context, have real conversations, manage disruptions, and proactively help run his day.

---

## Current State

Figgg has three AI-powered features:
- **AI Check-In** (`aiCheckIn.ts`) — single-turn conversational widget on the dashboard. Sends today's context (schedule, meds, tasks, wellness, launch plan, competition dances). Returns a response + structured actions the app executes. Already has a rich action vocabulary: class exceptions, wellness toggles, task management, day plan adjustments, launch task management, rehearsal notes, day mode, week reflections.
- **Day Plan Generator** (`generateDayPlan.ts`) — generates a prioritized daily plan based on schedule, meds, mood, tasks, and day mode.
- **Other AI functions** — `expandNotes.ts` (shorthand → full class notes), `generatePlan.ts` (teaching plans), `detectReminders.ts` (extract reminders from notes).

### Limitations
1. AI only accessible from dashboard check-in widget (single location)
2. Single-turn only — no back-and-forth conversation
3. Only sees today's data — can't reason about the week
4. No concept of multi-day disruptions (illness, travel, emergencies)
5. No proactive observations — only responds when spoken to
6. No class prep assistance or post-class capture flow

---

## Design: 8 Features

### Feature 1: `/ai` Chat Page

A dedicated route with a multi-turn conversational interface.

**UX:**
- Full page at `/ai`, accessible from the main nav (replaces or supplements an existing nav item)
- Chat-style interface: message input at bottom, conversation scrolls up
- Each AI response shows the text reply + action badges (same as current check-in)
- Conversation history lives in component state — resets when you leave or start new conversation
- The existing dashboard check-in widget remains for quick daily touchpoints. It can suggest "Want to talk this through?" with a link to `/ai` when it detects complexity.

**Context payload:** Rolling 2-week snapshot sent with each message:
- All classes for the next 14 days (with IDs, times, studios)
- All calendar events for the next 14 days
- All active tasks (with due dates, flags, overdue status)
- Current wellness state and streak
- Medication status
- Full launch plan (active/overdue items)
- Competition dances and upcoming competition dates
- Disruption state (if active)
- Previous messages in this conversation (for multi-turn)

**Autonomy model:** Act on obvious stuff immediately (cancel classes, set day mode, clear plans). Ask about edge cases ("Should I keep Thursday's class for Jasmine to sub?" / "Push DWDC tasks or leave deadlines?"). Show a summary of actions taken + questions pending.

**Model selection:** Sonnet for the chat page (deeper reasoning needed for multi-step conversations). Haiku for check-in widget and briefings (quick, structured).

### Feature 2: Disruption Mode

A persistent state that reshapes the entire app's behavior when Dixon is out for multiple days.

**Data model — new top-level key in AppData:**
```typescript
disruption: {
  active: boolean;
  type: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
  reason?: string;           // "Mom — cancer", "flu", etc.
  startDate: string;         // ISO date
  expectedReturn?: string;   // ISO date, null if unknown
  classesHandled: boolean;   // whether classes have been cancelled/subbed
  tasksDeferred: boolean;    // whether tasks have been pushed
  subAssignments?: Array<{   // which subs are covering which days
    classId: string;
    date: string;
    subName: string;
  }>;
}
```

**Behavior while disrupted:**
- Dashboard shifts to a minimal view: meds reminder, disruption status ("Day 3 away"), link to `/ai`
- Morning briefing is gentle: "Nothing needs your attention. Take care of yourself."
- Day plans are either empty or minimal (meds only)
- Overdue task counts are suppressed or muted — no red badges screaming
- Check-in prompt is softer: "How are you holding up?" instead of "What's on your mind?"
- Wellness streak doesn't break (or shows a "paused" state rather than resetting)

**Re-entry (when Dixon says he's back):**
- AI generates a catch-up briefing: here's the big picture, not a wall of overdue items
- Triage-first approach: "Here are the 2-3 things that are actually urgent. The rest can wait. Want me to build a gentle catch-up plan for this week?"
- Balance between "let's get back on track" and "don't overwhelm on day one"
- Disruption record clears from active state but could be logged for history

**Activation:** Triggered through `/ai` chat or check-in. AI detects disruption language ("I need to cancel my week", "I'm sick", "flying out tomorrow for a family emergency") and proposes entering disruption mode.

### Feature 3: Expanded Action Vocabulary

Additions to the shared action set (used by both check-in and chat):

```typescript
// Multi-day class exceptions
{ type: "markClassExceptionRange",
  startDate: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD",
  exceptionType: "cancelled" | "subbed",
  reason?: string,
  subName?: string }

// Batch task rescheduling
{ type: "batchRescheduleTasks",
  filter: "overdue" | "due-this-week" | "all-active",
  newDate: "YYYY-MM-DD" }

// Disruption management
{ type: "startDisruption",
  disruptionType: "sick" | "personal" | "travel" | "mental_health" | "other",
  reason?: string,
  expectedReturn?: "YYYY-MM-DD" }
{ type: "endDisruption" }

// Sub management
{ type: "assignSub",
  classIds: string[],
  dates: string[],
  subName: string }

// Week-level operations
{ type: "clearWeekPlan",
  startDate: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD" }

// Catch-up plan generation
{ type: "generateCatchUpPlan" }
```

These supplement (not replace) the existing action set. All actions work from both check-in and chat.

### Feature 4: Proactive Nudges

Client-side rules engine that surfaces observations without requiring an AI call.

**Implementation:**
- Runs on app load and after sync
- Simple conditional checks against AppData
- Generates nudge objects displayed as subtle cards on the dashboard
- Tapping a nudge opens `/ai` with the nudge pre-loaded as context

**Rule examples:**
| Rule | Condition | Nudge text |
|------|-----------|------------|
| Overdue pile-up | overdue tasks > 5 | "X tasks overdue. Want to triage?" |
| Meds gap | days since last med log > 2 | "Haven't logged meds in X days." |
| Competition prep | competition within 14 days + dances missing notes | "Competition in X days, Y dances have no notes." |
| Disruption duration | disruption active > 5 days | "Day X away. Ready to come back when you are." |
| Launch stall | no launch tasks completed in 7+ days | "Launch plan hasn't moved in a week." |
| Sub pattern | previously used sub for similar situation | "Jasmine covered last time — want me to set that up?" |
| Wellness drop | 3+ consecutive days below 50% wellness | "Wellness has been low this week." |

**Design principle:** Never naggy. Dismissable. Snoozable. Max 2-3 nudges visible at once (prioritized by urgency).

### Feature 5: AI-Powered Morning Briefing

Replace the static `MorningBriefing` component with an AI-generated briefing.

**Implementation:**
- One AI call (Haiku) on dashboard load when it's morning (or first load of the day)
- Sends 2-week context + disruption state
- Returns a briefing string + optional suggested actions
- Cached for the session (revisiting dashboard doesn't re-call)

**Briefing adapts to mode:**
- **Normal:** "4 classes today starting at 10am. 2 overdue DWDC tasks. Dose 1 window at 8:30."
- **Disrupted (away):** "Day 3 with mom. Nothing needs you today. Meds reminder if you packed them."
- **Re-entry:** "Welcome back. 7 tasks piled up, 2 are urgent. Want a catch-up plan?"
- **Competition day:** "3 entries today starting at 1pm. Warmup at 11:30. Everything else stripped."
- **Light day:** "Open schedule. Good day to knock out some DWDC tasks or just rest."

### Feature 6: "Prep Me" Before Classes

AI-powered class preparation cards that surface before each class.

**Trigger:** Based on schedule times. If a class starts within 45-60 minutes and the user opens the app, show a prep card on the dashboard or as a nudge.

**Content (assembled client-side, AI optional):**
- Class name, time, studio, student count
- Last week's notes for this class (what worked, what needs work)
- This week's plan (if set)
- Choreography notes for any pieces being worked on
- Any flagged students (attendance issues, notes)
- Song/music info

**Two tiers:**
1. **Quick prep (client-side, no AI call):** Pull the raw data and display it in a structured card. Fast, free, always available.
2. **Smart prep (AI call, optional):** Send the data to Haiku and get a 2-3 sentence synthesis: "Jazz 2 at Arts with Heart. Last week turns were rough — Alyssa and Marcus especially. You planned to revisit spotting drills. The routine for 'Levitating' needs the ending cleaned up."

### Feature 7: Post-Class Quick Capture

Prompted note capture after each class ends.

**Trigger:** Based on schedule times. If a class ended within the last 30 minutes and no notes have been logged for it this week, show a capture prompt.

**UX:**
- Appears as a card on the dashboard or as a push notification (if PWA notifications are enabled)
- Simple text input: "How'd Jazz 2 go?"
- User can type a few words or a paragraph of stream-of-consciousness
- AI structures the input into: what worked, what needs work, ideas for next week, specific student observations
- Saves as class notes via the existing `addClassNote` action type

**AI processing:**
- Send the raw dump + class context (what was planned, what was worked on last week)
- AI returns structured notes that get saved to the class
- Uses Haiku (short, structured task)

### Feature 8: Week-End Reflection

AI reviews the entire week and facilitates a meaningful reflection.

**Trigger:** Friday afternoon or Sunday (configurable). Surfaced as a nudge or within the `/ai` chat.

**What the AI reviews:**
- Classes taught vs. cancelled vs. subbed
- Wellness completion rates per day
- Meds adherence
- Tasks completed vs. added vs. overdue
- Launch plan progress
- Any disruptions that happened
- Competition prep progress

**Output:**
- 3-5 sentence week summary
- Pattern observations ("Third week wellness drops on Thursdays")
- One reflective question ("The parent packet has been sitting for 2 weeks — is it blocked or slipping?")
- If Dixon answers, AI captures the reflection via the existing `addWeekReflection` action

**Tone:** Honest but not judgmental. A smart friend reviewing the tape with you.

---

## Architecture

### Unified AI Endpoint: `aiChat.ts`

One Netlify function replaces `aiCheckIn.ts` and handles all AI interactions:

```typescript
// Request shape
{
  mode: 'check-in' | 'chat' | 'briefing' | 'day-plan' | 'prep' | 'capture' | 'reflection',
  messages?: Array<{ role: 'user' | 'assistant', content: string }>,  // for multi-turn
  userMessage: string,
  context: {
    time: string,
    dayOfWeek: string,
    // ... full 2-week context
    disruption?: DisruptionState,
    conversationMode?: string,  // what triggered this call
  }
}

// Response shape
{
  response: string,
  mood?: string,
  adjustments?: string[],
  actions?: Action[],
  // Mode-specific fields
  briefing?: string,          // for briefing mode
  dayPlan?: DayPlan,          // for day-plan mode
  structuredNotes?: ClassNote, // for capture mode
  reflection?: WeekReflection, // for reflection mode
}
```

The system prompt adapts based on `mode` but the action vocabulary is shared.

### Model Selection
| Mode | Model | Rationale |
|------|-------|-----------|
| check-in | Haiku | Quick, structured, cost-efficient |
| chat | Sonnet | Multi-step reasoning, nuanced |
| briefing | Haiku | Short generation, structured |
| day-plan | Haiku | Structured JSON output |
| prep | Haiku | Short synthesis |
| capture | Haiku | Structured extraction |
| reflection | Sonnet | Pattern analysis, thoughtful |

### Data Flow
```
User interaction → Component sends to aiChat function
  → Function builds system prompt for mode
  → Function assembles 2-week context from payload
  → Calls Anthropic API (Haiku or Sonnet)
  → Parses structured JSON response
  → Returns to client
  → Client executes actions via useAppData() mutations
  → Client displays response + action badges
```

### New AppData Keys
```typescript
// Added to AppData root
disruption?: {
  active: boolean;
  type: 'sick' | 'personal' | 'travel' | 'mental_health' | 'other';
  reason?: string;
  startDate: string;
  expectedReturn?: string;
  classesHandled: boolean;
  tasksDeferred: boolean;
  subAssignments?: SubAssignment[];
};

// Added to existing types
subRoster?: Array<{
  name: string;
  classesSubbed: string[];  // class IDs they've covered before
  studios: string[];         // studios they know
  lastUsed?: string;         // ISO date
}>;
```

### Client-Side Components

**New:**
- `/ai` page component with chat interface
- `NudgeCard` component for proactive observations
- `PrepCard` component for pre-class prep
- `PostClassCapture` component for after-class note capture
- `useNudges()` hook — rules engine that generates nudges from AppData
- `useClassTiming()` hook — tracks which class is upcoming/just ended

**Modified:**
- `MorningBriefing` — now AI-powered
- `AICheckInWidget` — can suggest "talk this through" link to `/ai`
- Dashboard layout — accommodates nudges, prep cards, capture prompts
- Navigation — add `/ai` route and nav item
- `useAppData()` — new mutations for disruption state and sub roster

---

## Migration Path

The existing `aiCheckIn.ts` function is well-built. The new `aiChat.ts` function absorbs its full system prompt and action vocabulary, extending rather than replacing. The check-in widget continues to call the same endpoint with `mode: 'check-in'`.

`generateDayPlan.ts` can either be absorbed into `aiChat.ts` (mode: 'day-plan') or remain separate — the day plan widget already works well. Recommend absorbing for consistency but not blocking on it.

`expandNotes.ts`, `generatePlan.ts`, `detectReminders.ts` remain as-is — they serve different purposes and don't need to be part of the unified endpoint.

---

## Cost Estimate

Rough per-day estimate assuming active use:
- 1 morning briefing (Haiku): ~2K tokens in, ~200 out
- 2-3 check-ins (Haiku): ~2K tokens each in, ~300 out
- 1-2 chat conversations (Sonnet): ~4K tokens in, ~500 out
- 1 day plan (Haiku): ~2K tokens in, ~500 out
- 2-3 prep cards (Haiku): ~1K tokens each
- 2-3 post-class captures (Haiku): ~1K tokens each

Total: roughly 20-30K tokens/day. At Anthropic API pricing, well under $1/day even with heavy use.
