import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { PullToRefresh } from './components/common/PullToRefresh';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SaveStatus } from './components/common/SaveStatus';
import { PageSkeleton } from './components/common/PageSkeleton';
import { SyncProvider } from './contexts/SyncContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { loadData } from './services/storage';
import { applyTheme } from './styles/applyTheme';
import { restoreMoodLayer } from './styles/moodLayer';

// Lazy-loaded routes (not needed on initial load)
const ClassDetail = lazy(() => import('./pages/ClassDetail').then(m => ({ default: m.ClassDetail })));
const LiveNotes = lazy(() => import('./pages/LiveNotes').then(m => ({ default: m.LiveNotes })));
const CalendarEventDetail = lazy(() => import('./pages/CalendarEventDetail').then(m => ({ default: m.CalendarEventDetail })));
const EventNotes = lazy(() => import('./pages/EventNotes').then(m => ({ default: m.EventNotes })));
const WeekPlanner = lazy(() => import('./pages/WeekPlanner').then(m => ({ default: m.WeekPlanner })));
const Choreography = lazy(() => import('./pages/Choreography').then(m => ({ default: m.Choreography })));
const ChoreographyDetail = lazy(() => import('./pages/ChoreographyDetail').then(m => ({ default: m.ChoreographyDetail })));
const DanceDetail = lazy(() => import('./pages/DanceDetail').then(m => ({ default: m.DanceDetail })));
const FormationBuilder = lazy(() => import('./pages/FormationBuilder').then(m => ({ default: m.FormationBuilder })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Me = lazy(() => import('./pages/Me').then(m => ({ default: m.Me })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const LaunchPlan = lazy(() => import('./pages/LaunchPlan').then(m => ({ default: m.LaunchPlan })));
const AIChat = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));

function NotFound() {
  return (
    <div className="page-w px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Page not found</h1>
      <p className="text-[var(--text-secondary)] mb-4">This page doesn't exist.</p>
      <a href="/" className="text-[var(--accent-primary)] font-medium hover:underline">Back to home</a>
    </div>
  );
}

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

    // Apply color theme
    if (settings?.themeId) {
      applyTheme(settings.themeId, document.documentElement.classList.contains('dark'));
    }

    // Restore mood layer from session (persists across navigations, resets daily)
    restoreMoodLayer();
  }, []);

  // Cloud sync and calendar sync are now handled entirely by SyncProvider
  // No duplicate sync calls from App.tsx

  return (
    <ErrorBoundary>
      <SyncProvider>
        <BrowserRouter>
          <AppDataProvider>
            <div className="min-h-screen bg-[var(--surface-primary)] transition-colors">
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Header />
              <main id="main-content" className="h-[calc(100dvh-120px)] lg:h-[calc(100dvh-56px)]">
                <PullToRefresh>
                  <Suspense fallback={<PageSkeleton />}>
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/schedule" element={<Schedule />} />
                        <Route path="/class/:classId" element={<ClassDetail />} />
                        <Route path="/class/:classId/notes" element={<LiveNotes />} />
                        <Route path="/event/:eventId" element={<CalendarEventDetail />} />
                        <Route path="/event/:eventId/notes" element={<EventNotes />} />
                        <Route path="/plan" element={<WeekPlanner />} />
                        <Route path="/choreography" element={<Choreography />} />
                        <Route path="/choreography/:id" element={<ChoreographyDetail />} />
                        <Route path="/dance/:danceId" element={<DanceDetail />} />
                        <Route path="/formations" element={<FormationBuilder />} />
                        <Route path="/formations/:danceId" element={<FormationBuilder />} />
                        <Route path="/students" element={<Students />} />
                        <Route path="/library" element={<Library />} />
                        <Route path="/me" element={<Me />} />
                        <Route path="/launch" element={<LaunchPlan />} />
                        <Route path="/ai" element={<AIChat />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </ErrorBoundary>
                  </Suspense>
                </PullToRefresh>
              </main>
              <MobileNav />
              <SaveStatus />
            </div>
          </AppDataProvider>
        </BrowserRouter>
      </SyncProvider>
    </ErrorBoundary>
  );
}

export default App;
