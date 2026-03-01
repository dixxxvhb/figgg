# Figgg — Architecture Guide

## Overview
Dance teaching assistant PWA for Dixon. Tracks classes, students, competitions, choreography, self-care (ADHD/meds), reminders, and DWDC launch plan. Single-user app with cross-device sync via Firebase.

## Stack
React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Firebase (Auth, Firestore, Storage, Cloud Functions). **NO Zustand** — uses React Context + hooks.

## Entry Point & Routing
- `src/main.tsx` → `src/App.tsx`
- Provider hierarchy: `AuthProvider` > `SyncProvider` > `BrowserRouter` > `AppDataProvider`
- 18 routes, most lazy-loaded via `React.lazy()`
- Layout: Header (top) + MobileNav (bottom 5-tab bar) + QuickAddButton (FAB)

### Routes
| Path | Page | Lazy |
|------|------|------|
| `/` | Dashboard | No |
| `/schedule` | Schedule | No |
| `/class/:classId` | ClassDetail | Yes |
| `/class/:classId/notes` | LiveNotes | Yes |
| `/event/:eventId` | CalendarEventDetail | Yes |
| `/event/:eventId/notes` | EventNotes | Yes |
| `/plan` | WeekPlanner | Yes |
| `/choreography` | Choreography | Yes |
| `/choreography/:id` | ChoreographyDetail | Yes |
| `/dance/:danceId` | DanceDetail | Yes |
| `/formations(/danceId)` | FormationBuilder | Yes |
| `/students` | Students | Yes |
| `/library` | Library | Yes |
| `/me` | Me (self-care/meds) | Yes |
| `/launch` | LaunchPlan | Yes |
| `/settings` | Settings | Yes |

## State Management
- **AuthContext** (`contexts/AuthContext.tsx`) — Firebase Auth (email/password), `useAuth()` hook
- **AppDataContext** (`contexts/AppDataContext.tsx`) — thin wrapper providing useAppData to tree
- **useAppData()** (`hooks/useAppData.ts`) — THE central hook. All data CRUD.
  - Returns: `{ data, updateClass, addClass, deleteClass, getWeekNotes, saveWeekNotes, updateSelfCare, updateLaunchPlan, addStudent, updateStudent, ... }`
  - On mount: loads from Firestore via `loadAllData(user.uid)`, falls back to localStorage
  - Real-time listeners for selfCare, dayPlan, launchPlan via Firestore `onSnapshot`
  - Writes go to both localStorage (cache) and Firestore (persistence)
- **SyncContext** (`contexts/SyncContext.tsx`) — calendar sync only (data sync handled by Firestore)
  - Calendar sync: on mount, every 15 min
  - Online/offline status tracking

## Data Flow
```
User action → useAppData().updateX() → setData() + firestoreSaveX(uid, doc)
  → useEffect saves to localStorage (offline cache)
  → Firestore write goes to /users/{userId}/{collection}/{docId}
  → Real-time listeners (onSnapshot) keep other tabs/devices in sync
```

## Firebase Architecture

### Firestore Structure
```
/users/{userId}/
  ├── studios/{id}
  ├── classes/{id}
  ├── students/{id}
  ├── weekNotes/{weekOf}
  ├── terminology/{id}
  ├── competitions/{id}
  ├── competitionDances/{id}
  ├── choreographies/{id}
  ├── calendarEvents/{id}
  ├── aiCheckIns/{id}
  └── singletons/
      ├── selfCare
      ├── dayPlan
      ├── launchPlan
      ├── learningData
      └── profile (settings + lastModified)
```

### Firebase Cloud Functions (`functions/src/`)
All AI features run through Firebase Cloud Functions using Anthropic Claude:
- `aiChat.ts` — Multi-mode AI: check-in, chat, briefing, day-plan, prep, capture, reflection
- `expandNotes.ts` — Expand shorthand class notes into structured summaries
- `generatePlan.ts` — Generate teaching prep notes from class notes
- `detectReminders.ts` — Extract actionable reminders from notes
- `organizeNotes.ts` — Reorganize notes by category with emoji headers
- `calendarProxy.ts` — Proxy iCal URLs (CORS workaround)

All functions require Firebase Auth. AI functions use `ANTHROPIC_API_KEY` env var.

### Security Rules
- `firestore.rules` — User-scoped: `/users/{userId}/{document=**}` requires `auth.uid == userId`
- `storage.rules` — User-scoped: `/users/{userId}/{allPaths=**}` requires `auth.uid == userId`

## Key Files
| File | Purpose |
|------|---------|
| `services/firebase.ts` | Firebase SDK init (auth, db, storage, functions) |
| `services/firestore.ts` | All Firestore CRUD, real-time listeners, migration |
| `services/firebaseStorage.ts` | Media upload/download, base64→Storage migration |
| `services/ai.ts` | Client-side wrappers calling Firebase Cloud Functions |
| `services/aiContext.ts` | Builds context payloads for AI functions |
| `services/calendar.ts` | iCal fetch + parse via Firebase calendarProxy |
| `services/storage.ts` | localStorage CRUD (offline cache) |
| `services/cloudStorage.ts` | Legacy stubs (no-ops, kept for compatibility) |
| `hooks/useAppData.ts` | Central state hook — all CRUD methods |
| `hooks/useCurrentClass.ts` | Which class is happening now/next |
| `hooks/useSelfCareStatus.ts` | ADHD medication timing status |
| `types/index.ts` | All types including AppData root shape |
| `types/choreography.ts` | Choreography domain types |
| `styles/themes.ts` | Color themes (forest, ocean, plum, sunset, midnight, rose) |
| `functions/src/utils/prompts.ts` | All AI system prompts and context builders |

## AppData Shape (root keys)
`studios, classes, weekNotes, exercises, terminology, projects, competitions, competitionDances, calendarEvents, settings, students, attendance, selfCare, choreographies, launchPlan, aiCheckIns, lastModified`

## Environment Variables

### Client (Vite — `.env.local`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Cloud Functions
```
ANTHROPIC_API_KEY=   # Set via: firebase functions:secrets:set ANTHROPIC_API_KEY
```

## PWA Service Worker (`public/sw.js`)
- Cache name: `dance-notes-v3`
- Navigation: **network-first** (ensures fresh Vite bundle hashes)
- API calls: **network-only** (never cached, localStorage is offline fallback)
- Static assets: stale-while-revalidate (content-hashed filenames)

## Static Seed Data (`src/data/`)
`classes.ts, studios.ts, students.ts, competitions.ts, competitionDances.ts, terminology.ts, projects.ts, progressions.ts, launchPlan.ts`

## Common Components (`src/components/common/`)
Header, Button, Card, ConfirmDialog, BottomSheet, DropdownMenu, ErrorBoundary, LoadingSpinner, PullToRefresh, QuickAddButton, SaveStatus

## Dashboard Sub-components (`src/components/Dashboard/`)
TodaysAgenda, MorningBriefing, RemindersWidget, WeekStats, WeeklyInsight, StreakCard, LaunchPlanWidget, EventCountdown

## Gotchas
- Firebase project ID: `figgg-c2c8f`
- Run `npm install` before build if fresh clone (tsc not found without it)
- Cloud Functions: `cd functions && npm install && npm run build` separately
- selfCare sync: do NOT use per-field merge — whole-object last-write-wins only
- App works in local-only mode if Firebase env vars are missing (graceful degradation)
- No tests — rely on `npm run build` for verification
- Data migration: Settings page has "Migrate Data" button to move localStorage → Firestore
