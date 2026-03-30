# Figgg — Architecture Guide

## Overview
Dance teaching assistant PWA for Dixon. Tracks classes, students, competitions, choreography, self-care (ADHD/meds), reminders, AI check-ins, day planning, and DWD launch plan. Single-user app with cross-device sync via Firebase.

## Stack
React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Firebase (Auth, Firestore, Storage, Cloud Functions, Hosting). **NO Zustand** — uses React Context + hooks. AI via Anthropic Claude (claude-sonnet-4-5-20250929) running in Firebase Cloud Functions.

## Quick Start
```bash
npm install                          # Main app dependencies
cd functions && npm install && cd .. # Cloud Functions dependencies
cp .env.example .env.local           # Then fill in Firebase values
npm run dev                          # Local dev server
npm run build                        # Verify: tsc + vite build
cd functions && npm run build        # Verify Cloud Functions compile
```

## Entry Point & Routing
- `src/main.tsx` > `src/App.tsx`
- Provider hierarchy: `AuthProvider` > `SyncProvider` > `BrowserRouter` > `AppDataProvider`
- 20 routes, most lazy-loaded via `React.lazy()`
- Layout: Header (top) + MobileNav (bottom 6-tab bar: Home, Schedule, Tasks, Wellness, AI, More)

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
| `/students` | Students | Yes |
| `/library` | Library | Yes |
| `/tasks` | Me (reminders tab) | Yes |
| `/me` | Me (self-care/meds) | Yes |
| `/launch` | LaunchPlan | Yes |
| `/ai` | AIChat | Yes |
| `/settings` | Settings | Yes |
| `*` | NotFound | No |

## State Management
- **AuthContext** (`contexts/AuthContext.tsx`) — Firebase Auth (email/password), `useAuth()` hook, LoginScreen
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
User action > useAppData().updateX() > setData() + firestoreSaveX(uid, doc)
  > useEffect saves to localStorage (offline cache)
  > Firestore write goes to /users/{userId}/{collection}/{docId}
  > Real-time listeners (onSnapshot) keep other tabs/devices in sync
```

## Firebase Architecture

### Firebase Project
- Project ID: `figgg-c2c8f`
- Hosting: Firebase Hosting (SPA mode, all routes rewrite to `/index.html`)
- Auth: Email/password
- Database: Firestore
- Files: Firebase Storage
- Serverless: Firebase Cloud Functions (Node 22)

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
      ├── therapist
      ├── meditation
      ├── grief
      └── profile (settings + lastModified)
```

### Firebase Cloud Functions (`functions/src/`)
All AI features run through Firebase Cloud Functions using Anthropic Claude (claude-sonnet-4-5-20250929):

| Function | Type | Purpose |
|----------|------|---------|
| `aiChat.ts` | Callable | Multi-mode AI: check-in, chat, briefing, day-plan, prep, capture, reflection |
| `expandNotes.ts` | Callable | Expand shorthand class notes into structured summaries |
| `generatePlan.ts` | Callable | Generate teaching prep notes from class notes + context |
| `detectReminders.ts` | Callable | Extract actionable reminders from notes |
| `organizeNotes.ts` | Callable | Reorganize notes by emoji-labeled categories |
| `calendarProxy.ts` | Callable | Proxy iCal URL fetching (CORS workaround, SSRF-protected) |

All functions require Firebase Auth. AI functions use `ANTHROPIC_API_KEY` secret.

### Security Rules
- `firestore.rules` — User-scoped: `/users/{userId}/{document=**}` requires `auth.uid == userId`
- `storage.rules` — User-scoped: `/users/{userId}/{allPaths=**}` requires `auth.uid == userId`

### Deployment (CI/CD)
GitHub Actions workflow: `.github/workflows/deploy-functions.yml`
Three jobs on push to `main`:
1. **deploy-hosting** — builds frontend + deploys to Firebase Hosting
2. **deploy-functions** — builds + deploys Cloud Functions (only if `functions/` changed)
3. **deploy-rules** — deploys Firestore rules, Storage rules, and indexes

All jobs use `w9jds/firebase-action@master` with `FIREBASE_SERVICE_ACCOUNT` secret.

## Key Files

### Services (`src/services/`)
| File | Purpose |
|------|---------|
| `firebase.ts` | Firebase SDK init (auth, db, storage, functions); graceful degradation if env vars missing |
| `firestore.ts` | All Firestore CRUD, real-time listeners, data migration |
| `firebaseStorage.ts` | Media upload/download to Firebase Storage, base64 migration |
| `ai.ts` | Client-side wrappers calling Firebase Cloud Functions |
| `aiContext.ts` | Builds lean AI context payloads (~800-1000 tokens) for Cloud Functions |
| `aiActions.ts` | Executes AI-suggested actions (toggleWellness, addReminder, setDayMode, etc.) |
| `calendar.ts` | iCal parsing via Firebase calendarProxy; recurring events (90-day window) |
| `storage.ts` | localStorage CRUD (offline cache); no cloud sync stubs — Firestore handles sync |
| `learningEngine.ts` | Daily snapshots + weekly summaries; tracks meds, wellness, class metrics |
| `location.ts` | Haversine distance between studios; travel time estimates |

### Hooks (`src/hooks/`)
| File | Purpose |
|------|---------|
| `useAppData.ts` | Central state hook — all CRUD methods, Firestore sync |
| `useCurrentClass.ts` | Which class is happening now/next (updates every 30s) |
| `useSelfCareStatus.ts` | ADHD medication timing: IR/XR dose windows, peak/tapering/expired |
| `useCheckInStatus.ts` | Whether morning/afternoon AI check-in is due |
| `useClassTiming.ts` | Upcoming class (within 60 min) and just-ended class (within 30 min) |
| `useNudges.ts` | Priority nudges (overdue, meds, competition, launch, wellness) with dismiss/snooze |
| `useTeachingStats.ts` | Weekly stats: completed classes, notes, students, attendance rate |

### Types (`src/types/`)
| File | Purpose |
|------|---------|
| `index.ts` | All types: Studio, Class, LiveNote, MediaItem, WeekNotes, Student, Competition, CalendarEvent, SelfCareData, DayPlan, LaunchPlanData, AICheckIn, AIConfig, MedConfig, LearningData, AppData shape, AppSettings |
| `choreography.ts` | Choreography domain: Section, Progression, Formation, PracticeNote |

### Components (`src/components/`)
**Common** (`common/`): Header, Button, Card, Checkbox, Breadcrumb, ConfirmDialog, DropdownMenu, EmptyState, ErrorBoundary, NoteInput, PageSkeleton, PlanDisplay, PullToRefresh, SaveStatus

**Dashboard** (`Dashboard/`): TodaysAgenda, MorningBriefing, AICheckInWidget, DayPlanWidget, NudgeCards, PrepCard, PostClassCapture, RemindersWidget, ScratchpadWidget, WeekStats, WeekMomentumBar, StreakCard, EventCountdown, FixItemWidget, WeeklyInsight, QuickNoteCapture
  - Note: Dashboard is context-aware (morning/prep/class/post/evening/default) — only 4-5 cards show at a time
  - Deleted: SortableWidget, DailyBriefingWidget, EndOfDaySummary, LaunchPlanWidget
  - Relocated to other pages: WeekStats/MomentumBar/StreakCard/EventCountdown → Schedule, WeeklyInsight → WeekReview, FixItemWidget → Me

**Wellness** (`wellness/`): CollapsibleSection, MeditationSpace, MedsTracker, SmartChecklist, TherapistTracker, TherapyJournal (grief letters, emotional check-ins, permission slips)

**Other**: `events/PreviousSessionsPanel.tsx`, `MoodTrends.tsx`

### Config & Other
| File | Purpose |
|------|---------|
| `styles/themes.ts` | Color themes (stone, ocean, plum, midnight, clay, dusk, pride, dwd, neon) |
| `functions/src/utils/prompts.ts` | All AI system prompts and context builders |
| `firebase.json` | Hosting (SPA rewrite, cache headers), functions, rules config |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Storage security rules |
| `firestore.indexes.json` | Custom Firestore indexes |
| `vite.config.ts` | Vite build config with React + Tailwind plugins |
| `tailwind.config.js` | Tailwind config; dark mode via class; fonts: Inter, Fraunces |

## AppData Shape (root keys)
`studios, classes, weekNotes, exercises, terminology, projects, competitions, competitionDances, calendarEvents, settings, students, attendance, selfCare, choreographies, launchPlan, aiCheckIns, dayPlan, learningData, therapist, meditation, grief, lastModified`

## Environment Variables

### Client (Vite — `.env.local`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=figgg-c2c8f
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_CALENDAR_URLS=              # comma-separated iCal URLs with auth tokens
```

### Cloud Functions
```
ANTHROPIC_API_KEY=   # Set via: firebase functions:secrets:set ANTHROPIC_API_KEY
```

### GitHub Actions (Repository Secrets)
```
FIREBASE_SERVICE_ACCOUNT    # JSON key from Firebase Console > Service Accounts
VITE_FIREBASE_*             # All 7 client env vars above
```

## NPM Scripts
| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` — **use this to verify changes** |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build locally |

## PWA Service Worker (`public/sw.js`)
- Cache name: `dance-notes-v6`
- Navigation: **network-first** (fresh Vite bundle hashes after deploys)
- Firebase/Firestore requests: **pass-through** (SDK handles its own IndexedDB cache)
- Static assets: **stale-while-revalidate** (content-hashed filenames)

## Static Seed Data (`src/data/`)
`classes.ts, studios.ts, students.ts, competitions.ts, competitionDances.ts, terminology.ts, projects.ts, progressions.ts, launchPlan.ts`

These files are **first-run seed data only**. Once the app has stored data (localStorage cache or Firestore), the seed data is never used again. All data is fully editable in-app and persists via Firestore — no hardcoded overrides.

## Gotchas
- No test suite — verify with `npm run build` (TypeScript + Vite)
- Cloud Functions: `cd functions && npm install && npm run build` — separate Node 22 project
- selfCare sync: do NOT use per-field merge — whole-object last-write-wins only
- App works offline/local-only if Firebase env vars are missing (graceful degradation)
- Settings page has "Migrate Data" button to move localStorage data to Firestore
- Settings "Cloud Sync" row is a read-only Firestore status indicator (not a button)
- All data (classes, competitions, students, studios) is fully dynamic from Firestore — `src/data/` files are first-run seed only, never overwrite stored data
- `loadData()` in `storage.ts` uses stored data as source of truth; only falls back to defaults if no data is stored yet
- The `dwd.netlify.app` URLs in `src/data/launchPlan.ts` are for a separate DWD website, not this app
