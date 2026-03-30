# Figgg — Project CLAUDE.md

## Quick Start
```bash
npm install          # First time / after pulling
npm run dev          # Local dev at localhost:5173
npm run build        # Must pass before deploy
```

## Stack
- React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4
- Firebase: Auth, Firestore, Storage, Cloud Functions
- State: `useAppData()` hook (Context + hooks pattern)
- PWA: service worker (`public/sw.js`, cache v4)

## Architecture

### Data Flow (3 layers)
1. **localStorage** — initial load + offline fallback (`services/storage.ts`)
2. **Firestore** — cloud persistence with real-time listeners (`services/firestore.ts`)
3. **Firebase Storage** — media files, auto-migrated from base64 (`services/firebaseStorage.ts`)

### Auth
- Firebase Auth (email/password), opt-in from Settings page
- App works fully offline without sign-in
- `AuthContext.tsx` wraps app, listens to `onAuthStateChanged()`

### Firestore Structure
```
/users/{userId}/
  singletons/   → profile, selfCare, dayPlan, launchPlan, learningData
  studios/       → Studio docs
  classes/       → Class docs
  students/      → Student docs (photos in Storage)
  weekNotes/     → keyed by weekOf date string
  terminology/   → TerminologyEntry docs
  competitions/  → Competition docs
  competitionDances/ → CompetitionDance docs (media/music in Storage)
  choreographies/    → Choreography docs
  calendarEvents/    → CalendarEvent docs
  aiCheckIns/        → AICheckIn docs
```

### Real-Time Sync
ALL collections and singletons have `onSnapshot` listeners when authenticated.
The `snapshotUpdateRef` pattern in `useAppData.ts` prevents save loops:
snapshot fires → state updates → useEffect skips saveData because ref is true.

### Key Files
| File | Purpose |
|------|---------|
| `src/hooks/useAppData.ts` | Master data hook — all CRUD + Firestore sync |
| `src/hooks/useDashboardContext.ts` | Context-aware Dashboard — returns morning/pre-class/during-class/post-class/evening/default |
| `src/services/firestore.ts` | Firestore CRUD + real-time listeners |
| `src/services/firebase.ts` | Firebase init (auth, db, storage, functions) |
| `src/services/firebaseStorage.ts` | Media upload + base64 migration |
| `src/services/storage.ts` | localStorage read/write |
| `src/contexts/AuthContext.tsx` | Firebase Auth provider + LoginScreen |
| `src/contexts/SyncContext.tsx` | Calendar sync + offline detection |
| `src/components/common/NoteInput.tsx` | Shared note-taking UI (tags, input, note display) used by LiveNotes + EventNotes |
| `src/components/common/Breadcrumb.tsx` | Breadcrumb nav for Settings sub-pages |
| `src/components/common/Checkbox.tsx` | Shared checkbox with consistent styling |
| `src/styles/themes.ts` | 8 themes (stone/ocean/plum/midnight/clay/dusk/pride/neon) |
| `src/styles/moodLayer.ts` | Mood layer system |
| `src/index.css` | Ink & Gold palette + semantic tokens |

### Dashboard Architecture (Mar 28 2026 rewrite)
Dashboard is context-aware — shows 4-5 cards based on time-of-day and teaching state.
- `useDashboardContext` hook combines useClassTiming + useCheckInStatus + useSelfCareStatus + useCurrentClass
- Returns `DashboardContextType`: morning | pre-class | during-class | post-class | evening | default
- NO widget ordering, NO drag-drop, NO DashboardSettings widget toggles
- Widgets relocated: WeekStats/MomentumBar/StreakCard/EventCountdown → Schedule page, WeeklyInsight → WeekReview, FixItemWidget → Me wellness tab
- Deleted components: SortableWidget, DailyBriefingWidget, EndOfDaySummary, LaunchPlanWidget, useDashboardMode

### Cloud Functions (`functions/src/`)
| Function | Type | Purpose |
|----------|------|---------|
| aiChat | Callable | Claude API chat |
| expandNotes | Callable | AI note expansion |
| generatePlan | Callable | Week plan generation |
| organizeNotes | Callable | Note organization |
| detectReminders | Callable | Reminder extraction |
| calendarProxy | HTTP | iCal CORS proxy |

## Design System — "Ink & Gold"
- Default theme: `stone` (burnished gold + warm cream + deep ink)
- Typography: Fraunces (display/headings), Inter (body)
- All themes have light + dark variants
- Font size settings: Normal (15px), Large (17px), Extra-large (19px)

## Class Sources — Critical Architecture Rule

Classes come from TWO sources that MUST be treated identically everywhere:
1. **Internal definitions** (`data.classes`) — Figgg-native class records (name, day, time, studio). IDs: `class-*`.
2. **iCal calendar events** (`data.calendarEvents`) — synced from Google Calendar. IDs: `cal-*`. Use `classifyCalendarEvent()` from `src/utils/calendarEventType.ts` — if `isClassLike === true`, treat it as a class.

**Any feature that counts, displays, filters, or acts on classes must handle BOTH sources.**
- When counting: dedup by matching title+day to avoid double-counting overlapping entries.
- When marking exceptions (cancel/sub): mark both internal class IDs AND calendar event IDs.
- When displaying: show cancelled/subbed badges on calendar event cards, not just internal class cards.

## Deploy
```bash
npm run build                # Must pass before deploy
git push                     # Triggers GitHub Actions → Firebase Hosting + Functions + Rules
```
**Always ask Dixon before deploying.**

## Environment
Firebase config in `.env.local`:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Firebase project: `figgg-c2c8f`
