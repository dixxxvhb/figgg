# Schedule isn't showing in the daily briefing
Source: Figgg Fix Queue — 2026-03-23
Type: BUG
Priority: high

## What's Wrong / What's Needed
The daily briefing is not displaying the user's schedule. Dixon notes it may not be "enhanced yet" — meaning the briefing generation (via the `generatePlan` Cloud Function or local briefing logic) may not be pulling in class/calendar data. Additionally, Dixon wants the briefing to be aware of when the computer isn't open and Cowork hasn't run — essentially a "staleness" or "last active" indicator so the briefing can note gaps in activity.

Two sub-issues:
1. **Schedule not appearing in briefing** — the briefing content doesn't include today's classes/events.
2. **Detect inactivity** — can the briefing tell Dixon when the computer hasn't been open / Cowork hasn't run recently?

## Where To Look
- Briefing generation: `functions/src/` — likely `generatePlan` Cloud Function
- Day plan data: Firestore singleton `dayPlan`
- Calendar events: `src/services/firestore.ts` (calendarEvents collection)
- Class schedule: `src/hooks/useAppData.ts` — where classes are loaded
- Calendar sync: `src/contexts/SyncContext.tsx`
- UI rendering of briefing: search for dayPlan or briefing in `src/pages/` or `src/components/`

## Implementation Plan
1. Investigate the `generatePlan` Cloud Function prompt — check if it receives class schedule and calendar event data as context
2. If not, modify the callable to pass today's classes (filtered by day of week) and calendar events into the AI prompt
3. For the inactivity detection: consider storing a `lastActiveAt` timestamp in Firestore (e.g., on the profile singleton) that gets updated when the app loads. The briefing generator can then reference this to note gaps.
4. Update the briefing UI component if needed to render schedule items

## Constraints
- Follow useAppData() Context + hooks pattern
- Tailwind CSS only, no separate CSS files
- No emojis in UI — use Lucide icons
- npm run build must pass clean
- Match Ink & Gold design system
- Mobile-first (iPhone primary)
- Do NOT restructure working code

## Test Plan
- Open the app and trigger a new daily briefing generation
- Verify today's classes appear in the briefing output
- Check that calendar events are mentioned
- For inactivity: set a `lastActiveAt` to a past date and regenerate — confirm the briefing mentions the gap
