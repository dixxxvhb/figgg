import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { QuickAddButton } from './components/common/QuickAddButton';
import { PullToRefresh } from './components/common/PullToRefresh';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { ClassDetail } from './pages/ClassDetail';
import { LiveNotes } from './pages/LiveNotes';
import { CalendarEventDetail } from './pages/CalendarEventDetail';
import { EventNotes } from './pages/EventNotes';
import { WeekPlanner } from './pages/WeekPlanner';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { CompetitionDances } from './pages/CompetitionDances';
import { DanceDetail } from './pages/DanceDetail';
import { FormationBuilder } from './pages/FormationBuilder';
import { Students } from './pages/Students';
import { CompetitionChecklist } from './pages/CompetitionChecklist';
import { CompetitionSchedule } from './pages/CompetitionSchedule';
import { CompetitionHub } from './pages/CompetitionHub';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SaveStatus } from './components/common/SaveStatus';
import { SyncProvider } from './contexts/SyncContext';
import { isAuthenticated, updateCalendarEvents, syncFromCloud } from './services/storage';
import { fetchCalendarEvents } from './services/calendar';

// Hardcoded calendar URL - always syncs on app load
const CALENDAR_URL = 'https://api.band.us/ical?token=aAAxADU0MWQxZTdiZjdhYWQwMDBiMWY3ZTNjNWFhYmY3YzViNTE5YTRjYmU';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  // Sync from cloud and calendar on app load
  useEffect(() => {
    if (authenticated) {
      // First sync from cloud to get latest data
      syncFromCloud().then(() => {
        // Then sync calendar
        fetchCalendarEvents(CALENDAR_URL).then(events => {
          if (events.length > 0) {
            updateCalendarEvents(events);
          }
        }).catch(() => {
          // Calendar sync failed silently - not critical
        });
      });
    }
  }, [authenticated]);

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <ErrorBoundary>
      <SyncProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-blush-100">
            <Header />
            <main className="h-[calc(100vh-120px)] overflow-hidden">
              <PullToRefresh>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/class/:classId" element={<ClassDetail />} />
                  <Route path="/class/:classId/notes" element={<LiveNotes />} />
                  <Route path="/event/:eventId" element={<CalendarEventDetail />} />
                  <Route path="/event/:eventId/notes" element={<EventNotes />} />
                  <Route path="/plan" element={<WeekPlanner />} />
                  <Route path="/competitions" element={<CompetitionHub />} />
                  <Route path="/dances" element={<CompetitionDances />} />
                  <Route path="/dance/:danceId" element={<DanceDetail />} />
                  <Route path="/competition/:competitionId/checklist" element={<CompetitionChecklist />} />
                  <Route path="/competition/:competitionId/schedule" element={<CompetitionSchedule />} />
                  <Route path="/formations" element={<FormationBuilder />} />
                  <Route path="/formations/:danceId" element={<FormationBuilder />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
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
