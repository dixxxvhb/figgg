import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { QuickAddButton } from './components/common/QuickAddButton';
import { PullToRefresh } from './components/common/PullToRefresh';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SaveStatus } from './components/common/SaveStatus';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { SyncProvider } from './contexts/SyncContext';
import { loadData } from './services/storage';

// Lazy-loaded routes (not needed on initial load)
const ClassDetail = lazy(() => import('./pages/ClassDetail').then(m => ({ default: m.ClassDetail })));
const LiveNotes = lazy(() => import('./pages/LiveNotes').then(m => ({ default: m.LiveNotes })));
const CalendarEventDetail = lazy(() => import('./pages/CalendarEventDetail').then(m => ({ default: m.CalendarEventDetail })));
const EventNotes = lazy(() => import('./pages/EventNotes').then(m => ({ default: m.EventNotes })));
const WeekPlanner = lazy(() => import('./pages/WeekPlanner').then(m => ({ default: m.WeekPlanner })));
const CompetitionHub = lazy(() => import('./pages/CompetitionHub').then(m => ({ default: m.CompetitionHub })));
const DanceDetail = lazy(() => import('./pages/DanceDetail').then(m => ({ default: m.DanceDetail })));
const FormationBuilder = lazy(() => import('./pages/FormationBuilder').then(m => ({ default: m.FormationBuilder })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const SelfCare = lazy(() => import('./pages/SelfCare').then(m => ({ default: m.SelfCare })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

function App() {
  // Apply display settings on app load
  useEffect(() => {
    const data = loadData();
    const settings = data?.settings;

    // Apply font size
    const root = document.documentElement;
    switch (settings?.fontSize) {
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'extra-large':
        root.style.fontSize = '20px';
        break;
      default:
        root.style.fontSize = '16px';
    }

    // Apply dark mode
    if (settings?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Cloud sync and calendar sync are now handled entirely by SyncProvider
  // No duplicate sync calls from App.tsx

  return (
    <ErrorBoundary>
      <SyncProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-blush-50 dark:bg-blush-900 transition-colors">
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <Header />
            <main id="main-content" className="h-[calc(100dvh-120px)] lg:h-[calc(100dvh-56px)] overflow-hidden">
              <PullToRefresh>
                <Suspense fallback={<LoadingSpinner />}>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/class/:classId" element={<ClassDetail />} />
                      <Route path="/class/:classId/notes" element={<LiveNotes />} />
                      <Route path="/event/:eventId" element={<CalendarEventDetail />} />
                      <Route path="/event/:eventId/notes" element={<EventNotes />} />
                      <Route path="/plan" element={<WeekPlanner />} />
                      <Route path="/competitions" element={<CompetitionHub />} />
                      <Route path="/dance/:danceId" element={<DanceDetail />} />
                      <Route path="/formations" element={<FormationBuilder />} />
                      <Route path="/formations/:danceId" element={<FormationBuilder />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/me" element={<SelfCare />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </PullToRefresh>
            </main>
            <MobileNav />
            <QuickAddButton />
            <SaveStatus />
          </div>
        </BrowserRouter>
      </SyncProvider>
    </ErrorBoundary>
  );
}

export default App;
