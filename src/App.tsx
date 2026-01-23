import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { QuickAddButton } from './components/common/QuickAddButton';
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
import { isAuthenticated } from './services/storage';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-blush-100">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/class/:classId" element={<ClassDetail />} />
            <Route path="/class/:classId/notes" element={<LiveNotes />} />
            <Route path="/event/:eventId" element={<CalendarEventDetail />} />
            <Route path="/event/:eventId/notes" element={<EventNotes />} />
            <Route path="/plan" element={<WeekPlanner />} />
            <Route path="/dances" element={<CompetitionDances />} />
            <Route path="/dance/:danceId" element={<DanceDetail />} />
            <Route path="/formations" element={<FormationBuilder />} />
            <Route path="/formations/:danceId" element={<FormationBuilder />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <MobileNav />
        <QuickAddButton />
      </div>
    </BrowserRouter>
  );
}

export default App;
