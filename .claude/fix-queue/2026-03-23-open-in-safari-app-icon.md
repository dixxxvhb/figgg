# "Open in Safari" button isn't working to change app icon
Source: Figgg Fix Queue — 2026-03-23
Type: BUG
Priority: high

## What's Wrong / What's Needed
There's an "Open in Safari" button (likely in Settings) intended to let the user change the PWA app icon. This button isn't functioning — either the link/action is broken, the URL is wrong, or the mechanism for triggering a Safari open from within the PWA isn't working correctly.

On iOS, changing a PWA icon typically requires removing and re-adding to Home Screen, or the app may have a flow that opens Safari to a page with a different `<link rel="apple-touch-icon">` manifest. The button needs to actually open Safari with the correct URL.

## Where To Look
- Settings page: search for "Safari" or "app icon" or "open in" in `src/pages/` and `src/components/`
- PWA manifest: `public/manifest.json` or `manifest.webmanifest`
- Service worker: `public/sw.js`
- Index HTML: check `<link rel="apple-touch-icon">` in `index.html`
- Any icon-related assets in `public/`

## Implementation Plan
1. Find the "Open in Safari" button component and its click handler
2. Check what URL/action it's trying to trigger — on iOS PWAs, `window.open(url, '_blank')` or `window.location.href = url` may behave differently
3. For iOS PWAs, the correct approach is typically `window.open(url, '_system')` or using a direct `<a href="..." target="_blank">` link, since `window.open` can be blocked
4. Verify the target URL is correct and accessible
5. Test the fix on iOS Safari (PWA mode)

## Constraints
- Follow useAppData() Context + hooks pattern
- Tailwind CSS only, no separate CSS files
- No emojis in UI — use Lucide icons
- npm run build must pass clean
- Match Ink & Gold design system
- Mobile-first (iPhone primary)
- Do NOT restructure working code

## Test Plan
- Open figgg as PWA on iPhone
- Navigate to Settings
- Tap "Open in Safari" button
- Verify Safari opens with the correct page/URL
- Confirm the icon change flow works end-to-end
