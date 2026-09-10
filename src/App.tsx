import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionsProvider } from './contexts/SessionsContext';
import { useState, useEffect } from 'react';
import { getCurrentSeason } from './lib/passes';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import LiveSession from './pages/LiveSession';
import Progress from './pages/Progress';
import Group from './pages/Group';
import BattlePass from './pages/BattlePass';
import Collection from './pages/Collection';
import Profile from './pages/Profile';
import Programs from './pages/Programs';
import type { ReactNode } from 'react';
import Loader from './components/Loader';

const MAINTENANCE = true;
const ADMIN_UIDS = ['bhH01VzturU9rgVVopKbFe5edoO2'];

function MaintenanceScreen() {
  return (
    <div className="maintenance-screen">
      <img src="/cards/s1-trump-wall.png" alt="" className="maintenance-img" />
      <h1>On construit le mur</h1>
      <p>L'app revient plus forte que tes tractions. Patience.</p>
    </div>
  );
}

function SeasonSplash({ onDone }: { onDone: () => void }) {
  const season = getCurrentSeason();
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 3000);
    const t3 = setTimeout(onDone, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  if (!season) { onDone(); return null; }

  return (
    <div className={`season-splash ${phase}`} onClick={onDone}>
      <div className="season-splash-content">
        <div className="season-splash-label">{season.name}</div>
        <div className="season-splash-theme">{season.theme}</div>
        <div className="season-splash-line" />
        <div className="season-splash-sub">CaliCrew</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page loading"><Loader /></div>;
  if (!user) return <Navigate to="/login" />;
  if (MAINTENANCE && !ADMIN_UIDS.includes(user.uid)) return <MaintenanceScreen />;
  return <>{children}</>;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(() => !!localStorage.getItem('calicrew-splash-seen'));

  useEffect(() => {
    if (!loading && user && !splashDone) {
      setShowSplash(true);
    }
  }, [loading, user, splashDone]);

  function handleSplashDone() {
    setShowSplash(false);
    setSplashDone(true);
    localStorage.setItem('calicrew-splash-seen', 'pass-1');
  }

  return (
    <>
      {showSplash && <SeasonSplash onDone={handleSplashDone} />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/session/new" element={<ProtectedRoute><NewSession /></ProtectedRoute>} />
        <Route path="/session/:id" element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/group" element={<ProtectedRoute><Group /></ProtectedRoute>} />
        <Route path="/battlepass" element={<ProtectedRoute><BattlePass /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
        <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:uid" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionsProvider>
          <AppContent />
        </SessionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
