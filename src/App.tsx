import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionsProvider } from './contexts/SessionsContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentSeason } from './lib/passes';
import { getCardsBySet, getFamilies } from './lib/cards';
import type { Season } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import LiveSession from './pages/LiveSession';
import Progress from './pages/Progress';
import Group from './pages/Group';
import BattlePass from './pages/BattlePass';
import Collection from './pages/Collection';
import SeasonCards from './pages/SeasonCards';
import Profile from './pages/Profile';
import Programs from './pages/Programs';
import type { ReactNode } from 'react';
import Loader from './components/Loader';
import HalloweenDecor from './components/HalloweenDecor';
import PinkDecor from './components/PinkDecor';
import { getSeasonalTheme } from './lib/seasonalTheme';

const MAINTENANCE = false;
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

/**
 * Intro de saison.
 *
 * Elle se joue une fois par saison : la clé enregistrée porte l'id de la
 * saison, sinon l'intro de la saison 2 ne partirait jamais pour ceux qui ont
 * déjà vu celle de la saison 1.
 *
 * La séquence est découpée en temps plutôt qu'en une seule transition : on
 * pose le décor, on annonce la saison, son nom, puis les familles défilent
 * comme les destinations d'un panneau de bus. Un appui passe tout.
 */
/**
 * Intro de saison.
 *
 * Elle se joue une fois par saison : la clé enregistrée porte l'id de la
 * saison, sinon l'intro de la saison 2 ne partirait jamais pour ceux qui ont
 * déjà vu celle de la saison 1.
 *
 * Toute la chorégraphie tient dans des `animation-delay` déclenchés en une
 * fois. Un découpage en étapes successives relancerait les animations à
 * chaque changement de classe — le titre se re-floutait à mi-parcours.
 */
function SeasonSplash({ season, onDone }: { season: Season; onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  const families = useMemo(() => getFamilies(getCardsBySet(season.id)), [season.id]);
  // Une seule famille, c'est la saison 1 : le défilé n'aurait rien à montrer.
  const showFamilies = families.length > 1;

  useEffect(() => {
    const total = showFamilies ? 6200 : 4200;
    const t1 = window.setTimeout(() => setExiting(true), total);
    const t2 = window.setTimeout(onDone, total + 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone, showFamilies]);

  return (
    <div className={`season-splash playing ${exiting ? 'exit' : ''}`} onClick={onDone}>
      <div className="season-splash-road" />

      <div className="season-splash-content">
        <div className="season-splash-label">{season.name}</div>
        <div className="season-splash-theme">{season.theme}</div>
        <div className="season-splash-line" />

        {showFamilies && (
          <div className="season-splash-families" aria-hidden="true">
            {families.map((family, i) => (
              <span
                key={family}
                className="season-splash-family"
                style={{ animationDelay: `${2.2 + i * 0.18}s` }}
              >
                {family}
              </span>
            ))}
          </div>
        )}

        <div className={`season-splash-sub ${showFamilies ? 'late' : ''}`}>CaliCrew</div>
      </div>

      <button className="season-splash-skip" onClick={onDone}>Passer</button>
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
  const currentSeason = getCurrentSeason();
  // La clé porte l'id de la saison : chaque nouvelle saison rejoue son intro.
  const [splashDone, setSplashDone] = useState(
    () => localStorage.getItem('calicrew-splash-seen') === currentSeason?.id
  );

  useEffect(() => {
    if (!loading && user && currentSeason && !splashDone) {
      setShowSplash(true);
    }
  }, [loading, user, splashDone, currentSeason]);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
    setSplashDone(true);
    if (currentSeason) localStorage.setItem('calicrew-splash-seen', currentSeason.id);
  }, [currentSeason]);

  const season = getSeasonalTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (season) root.dataset.season = season;
    else delete root.dataset.season;
  }, [season]);

  return (
    <>
      {showSplash && currentSeason && (
        <SeasonSplash season={currentSeason} onDone={handleSplashDone} />
      )}
      {season === 'halloween' && <HalloweenDecor />}
      {season === 'pink' && <PinkDecor />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/session/new" element={<ProtectedRoute><NewSession /></ProtectedRoute>} />
        <Route path="/session/:id" element={<ProtectedRoute><LiveSession /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/group" element={<ProtectedRoute><Group /></ProtectedRoute>} />
        <Route path="/battlepass" element={<ProtectedRoute><BattlePass /></ProtectedRoute>} />
        <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
        <Route path="/season/:setId" element={<ProtectedRoute><SeasonCards /></ProtectedRoute>} />
        <Route path="/season/:setId/:uid" element={<ProtectedRoute><SeasonCards /></ProtectedRoute>} />
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
