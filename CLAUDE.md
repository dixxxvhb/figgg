# Figgg — Architecture Guide

## Overview
Dance teaching assistant PWA for Dixon. Tracks classes, students, competitions, choreography, self-care (ADHD/meds), reminders, and DWDC launch plan. Single-user app with cross-device sync.

## Stack
React 19, TypeScript, Vite, Tailwind CSS, React Router v7. **NO Zustand** — uses React Context + hooks.

## Entry Point & Routing
- `src/main.tsx` → `src/App.tsx`
- Provider hierarchy: `SyncProvider` > `BrowserRouter` > `AppDataProvider`
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
- **AppDataContext** (`contexts/AppDataContext.tsx`) — thin wrapper providing useAppData to tree
- **useAppData()** (`hooks/useAppData.ts`, ~345 lines) — THE central hook. All data CRUD.
  - Returns: `{ data, updateClass, addClass, deleteClass, getWeekNotes, saveWeekNotes, updateSelfCare, updateLaunchPlan, addStudent, updateStudent, ... }`
  - Loads from localStorage on init, auto-saves on data change
  - Listens for `cloud-sync-complete` and `calendar-sync-complete` events to reload
  - selfCare and launchPlan use `immediateCloudSave` (skip debounce)
- **SyncContext** (`contexts/SyncContext.tsx`, ~206 lines) — cloud sync orchestration
  - Data sync: on mount, every 5 min, on visibilitychange
  - Calendar sync: on mount, every 15 min
  - Dispatches `cloud-sync-complete` event after merge

## Data Flow
```
User action → useAppData().updateX() → setData()
  → useEffect saves to localStorage via saveData()
  → saveData() triggers debouncedCloudSave() (500ms)
  → cloudStorage.ts POSTs to /.netlify/functions/saveData
  → Netlify Blob store (single JSON document)
```

## Key Files
| File | Lines | Purpose |
|------|-------|---------|
| `services/storage.ts` | 754 | localStorage CRUD, syncFromCloud merge, saveData |
| `services/cloudStorage.ts` | 212 | Netlify Functions API (fetch/save/debounce/flush) |
| `services/calendar.ts` | 406 | iCal fetch + parse via calendarProxy Netlify Function |
| `hooks/useAppData.ts` | 345 | Central state hook — all CRUD methods |
| `hooks/useCurrentClass.ts` | — | Which class is happening now/next |
| `hooks/useSelfCareStatus.ts` | — | ADHD medication timing status |
| `types/index.ts` | 505 | All types including AppData root shape |
| `types/choreography.ts` | 123 | Choreography domain types |
| `styles/themes.ts` | — | Color themes (forest, ocean, plum, sunset, midnight, rose) |

## AppData Shape (root keys)
`studios, classes, weekNotes, exercises, terminology, projects, competitions, competitionDances, calendarEvents, settings, students, attendance, selfCare, choreographies, launchPlan, lastModified`

## Cloud Sync Merge Strategy
- **weekNotes**: Always merged (combined by weekOf key, per-class notes merged)
- **selfCare**: Last-write-wins by `selfCareModified` timestamp (entire object, NOT per-field)
- **launchPlan**: Last-write-wins by `lastModified` timestamp
- **Everything else**: Local wins if recently saved (15s grace period)

## Netlify Functions (`netlify/functions/`)
- `getData.ts` — GET full AppData from Netlify Blobs
- `saveData.ts` — POST full AppData to Netlify Blobs
- `login.ts` — POST password → SHA-256 auth token
- `calendarProxy.ts` — GET, proxies iCal URLs (CORS workaround)
- `expandNotes.ts` — AI: expand shorthand class notes
- `generatePlan.ts` — AI: generate teaching plans
- `detectReminders.ts` — AI: detect reminder-like items in notes

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
- Source is at `/Users/dixxx/figgg/`, NOT `~/Documents/Claude Projects/Code/figgg/`
- Run `npm install` before build if fresh clone (tsc not found without it)
- selfCare sync: do NOT use per-field merge — whole-object last-write-wins only
- `beforeunload` flushes pending saves via keepalive fetch (no merge, just push)
- No env vars needed for local dev (cloud sync fails gracefully)
- No tests — rely on `npm run build` for verification
