import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { PullToRefresh } from './components/common/PullToRefresh';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SaveStatus } from './components/common/SaveStatus';
import { PageSkeleton } from './components/common/PageSkeleton';
import { SyncProvider } from './contexts/SyncContext';
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import { AuthProvider } from './contexts/AuthContext';
import { loadData } from './services/storage';
import { applyTheme, applyAccentOverride, clearAccentOverride, applyFontFamily } from './styles/applyTheme';
import { restoreMoodLayer } from './styles/moodLayer';
import { applyAppIcon } from './styles/appIcons';

/**
 * SettingsWatcher — lives inside AppDataProvider, reactively applies visual
 * settings when they change from ANY source (local toggle, Firestore sync
 * from another device, AI action, etc.). Skips the initial render since
 * App's startup useEffect handles that.
 */
function SettingsWatcher() {
  const { data } = useAppData();
  const settings = data.settings;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip initial render — App's startup useEffect handles that
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Re-apply all visual settings
    const root = document.documentElement;

    // Font size
    switch (settings?.fontSize) {
      case 'large': root.style.fontSize = '18px'; break;
      case 'extra-large': root.style.fontSize = '20px'; break;
      default: root.style.fontSize = '16px';
    }

    // Dark mode
    if (settings?.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Theme
    applyTheme(settings?.themeId || 'stone', root.classList.contains('dark'));

    // Accent color (after theme so it wins)
    if (settings?.customAccentColor) {
      applyAccentOverride(settings.customAccentColor);
    } else {
      clearAccentOverride();
    }

    // Font family
    applyFontFamily(settings?.fontFamily || 'editorial');

    // App icon
    applyAppIcon(settings?.appIconId || 'ink-gold');
  }, [
    settings?.fontSize, settings?.darkMode, settings?.themeId,
    settings?.customAccentColor, settings?.fontFamily, settings?.appIconId,
  ]);

  return null;
}

// Lazy-loaded routes (not needed on initial load)
const ClassDetail = lazy(() => import('./pages/ClassDetail').then(m => ({ default: m.ClassDetail })));
const LiveNotes = lazy(() => import('./pages/LiveNotes').then(m => ({ default: m.LiveNotes })));
const CalendarEventDetail = lazy(() => import('./pages/CalendarEventDetail').then(m => ({ default: m.CalendarEventDetail })));
const EventNotes = lazy(() => import('./pages/EventNotes').then(m => ({ default: m.EventNotes })));
const WeekPlanner = lazy(() => import('./pages/WeekPlanner').then(m => ({ default: m.WeekPlanner })));
const WeekReview = lazy(() => import('./pages/WeekReview').then(m => ({ default: m.WeekReview })));
const Choreography = lazy(() => import('./pages/Choreography').then(m => ({ default: m.Choreography })));
const ChoreographyDetail = lazy(() => import('./pages/ChoreographyDetail').then(m => ({ default: m.ChoreographyDetail })));
const DanceDetail = lazy(() => import('./pages/DanceDetail').then(m => ({ default: m.DanceDetail })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const Me = lazy(() => import('./pages/Me').then(m => ({ default: m.Me })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const Settings = lazy(() => import('./pages/settings/SettingsHub').then(m => ({ default: m.SettingsHub })));
const DisplaySettings = lazy(() => import('./pages/settings/DisplaySettings').then(m => ({ default: m.DisplaySettings })));
const DashboardSettings = lazy(() => import('./pages/settings/DashboardSettings').then(m => ({ default: m.DashboardSettings })));
const WellnessSettings = lazy(() => import('./pages/settings/WellnessSettings').then(m => ({ default: m.WellnessSettings })));
const AISettings = lazy(() => import('./pages/settings/AISettings').then(m => ({ default: m.AISettings })));
const SyncSettings = lazy(() => import('./pages/settings/SyncSettings').then(m => ({ default: m.SyncSettings })));
const DataSettings = lazy(() => import('./pages/settings/DataSettings').then(m => ({ default: m.DataSettings })));
const AdvancedSettings = lazy(() => import('./pages/settings/AdvancedSettings').then(m => ({ default: m.AdvancedSettings })));
const LaunchPlan = lazy(() => import('./pages/LaunchPlan').then(m => ({ default: m.LaunchPlan })));
const AIChat = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));

function NotFound() {
  return (
    <div className="page-w px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Page not found</h1>
      <p className="text-[var(--text-secondary)] mb-4">This page doesn't exist.</p>
      <Link to="/" className="text-[var(--accent-primary)] font-medium hover:underline">Back to home</Link>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/class/:classId" element={<ClassDetail />} />
        <Route path="/class/:classId/notes" element={<LiveNotes />} />
        <Route path="/event/:eventId" element={<CalendarEventDetail />} />
        <Route path="/event/:eventId/notes" element={<EventNotes />} />
        <Route path="/plan" element={<WeekPlanner />} />
        <Route path="/week-review" element={<WeekReview />} />
        <Route path="/choreography" element={<Choreography />} />
        <Route path="/choreography/:id" element={<ChoreographyDetail />} />
        <Route path="/dance/:danceId" element={<DanceDetail />} />
        <Route path="/students" element={<Students />} />
        <Route path="/library" element={<Library />} />
        <Route path="/tasks" element={<Me initialTab="reminders" />} />
        <Route path="/me" element={<Me />} />
        <Route path="/launch" element={<LaunchPlan />} />
        <Route path="/ai" element={<AIChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/display" element={<DisplaySettings />} />
        <Route path="/settings/dashboard" element={<DashboardSettings />} />
        <Route path="/settings/wellness" element={<WellnessSettings />} />
        <Route path="/settings/ai" element={<AISettings />} />
        <Route path="/settings/sync" element={<SyncSettings />} />
        <Route path="/settings/data" element={<DataSettings />} />
        <Route path="/settings/advanced" element={<AdvancedSettings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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

    // Apply custom accent color override (after theme, so it wins)
    if (settings?.customAccentColor) {
      applyAccentOverride(settings.customAccentColor);
    }

    // Apply font family
    if (settings?.fontFamily) {
      applyFontFamily(settings.fontFamily);
    }

    // Apply selected app icon (favicon + manifest)
    if (settings?.appIconId) {
      applyAppIcon(settings.appIconId);
    }

    // Restore mood layer from session (persists across navigations, resets daily)
    restoreMoodLayer();

    // Global error tracking — catches errors outside React's tree
    // (e.g. async callbacks, third-party scripts, service worker issues)
    const handleError = (e: ErrorEvent) => {
      console.error('[figgg:global]', {
        message: e.message,
        stack: e.error?.stack?.slice(0, 500),
        url: window.location.href,
        ts: new Date().toISOString(),
      });
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason);
      console.error('[figgg:unhandled]', {
        message: msg,
        stack: e.reason?.stack?.slice(0, 500),
        url: window.location.href,
        ts: new Date().toISOString(),
      });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Cloud sync and calendar sync are now handled entirely by SyncProvider
  // No duplicate sync calls from App.tsx

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SyncProvider>
          <BrowserRouter>
            <AppDataProvider>
            <SettingsWatcher />
            <div className="min-h-screen bg-[var(--surface-primary)] transition-colors">
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Header />
              <main id="main-content" className="h-[calc(100dvh-120px)] lg:h-[calc(100dvh-56px)]">
                <PullToRefresh>
                  <Suspense fallback={<PageSkeleton />}>
                    <ErrorBoundary>
                      <AnimatedRoutes />
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
