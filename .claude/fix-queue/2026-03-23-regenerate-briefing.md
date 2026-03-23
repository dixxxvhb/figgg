# Add a way to regenerate or update the daily briefing
Source: Figgg Fix Queue — 2026-03-23
Type: IDEA
Priority: medium

## What's Wrong / What's Needed
Currently there's no way to manually regenerate or refresh the daily briefing once it's been created. Dixon wants the ability to trigger a new briefing — either a full regenerate or an update/refresh that incorporates new data since the original was created. This is important because data may change throughout the day (new notes, schedule changes, etc.) and the briefing becomes stale.

## Where To Look
- Briefing UI: search for "briefing" or "dayPlan" in `src/pages/` and `src/components/`
- Briefing generation trigger: wherever `generatePlan` Cloud Function is called from the client
- Day plan singleton: Firestore `singletons/dayPlan`
- `src/hooks/useAppData.ts` — any existing generatePlan or briefing methods

## Implementation Plan
1. Find the briefing display component
2. Add a "Regenerate" or "Refresh" button (use a Lucide icon like `RefreshCw` or `RotateCcw`)
3. Wire the button to call the same `generatePlan` Cloud Function that creates the initial briefing
4. Show a loading state while regenerating (spinner or skeleton)
5. On success, update the dayPlan state/Firestore with the new briefing content
6. Consider: should it fully replace the old briefing or append an "Updated at [time]" section? Start with full replace for simplicity.
7. Optionally add a subtle "Last generated: [time]" label so Dixon knows how fresh it is

## Constraints
- Follow useAppData() Context + hooks pattern
- Tailwind CSS only, no separate CSS files
- No emojis in UI — use Lucide icons
- npm run build must pass clean
- Match Ink & Gold design system
- Mobile-first (iPhone primary)
- Do NOT restructure working code

## Test Plan
- Open the app and view the daily briefing
- Tap the regenerate button
- Verify loading state appears
- Verify new briefing content loads and replaces the old one
- Check that "last generated" timestamp updates
- Verify it works on mobile (button is tappable, not too small)
