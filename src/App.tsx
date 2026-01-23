import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header, MobileNav } from './components/common/Header';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { ClassDetail } from './pages/ClassDetail';
import { LiveNotes } from './pages/LiveNotes';
import { WeekPlanner } from './pages/WeekPlanner';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { isAuthenticated } from './services/storage';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/class/:classId" element={<ClassDetail />} />
            <Route path="/class/:classId/notes" element={<LiveNotes />} />
            <Route path="/plan" element={<WeekPlanner />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
