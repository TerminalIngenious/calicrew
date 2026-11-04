import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionsProvider } from './contexts/SessionsContext';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { getCurrentSeason } from './lib/passes';
import { getCardsBySet, getFamilies } from './lib/cards';
import type { Season } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

/**
 * Les pages au-delà de l'accueil sont chargées à la demande.
 *
 * Tout partait dans un seul fichier de 1,3 Mo qu'il fallait télécharger avant
 * d'afficher quoi que ce soit — dont les graphiques de Progress, à eux seuls
 * un tiers du poids, pour un écran que la plupart des lancements n'ouvrent
 * jamais. Login et Dashboard restent dans le paquet principal : ce sont les
 * deux écrans par lesquels on arrive.
 */
const NewSession = lazy(() => import('./pages/NewSession'));
const LiveSession = lazy(() => import('./pages/LiveSession'));
const Progress = lazy(() => import('./pages/Progress'));
const Group = lazy(() => import('./pages/Group'));
const BattlePass = lazy(() => import('./pages/BattlePass'));
const Collection = lazy(() => import('./pages/Collection'));
const SeasonCards = lazy(() => import('./pages/SeasonCards'));
const Profile = lazy(() => import('./pages/Profile'));
const Programs = lazy(() => import('./pages/Programs'));
const Decouvrir = lazy(() => import('./pages/Decouvrir'));
import type { ReactNode } from 'react';
import Loader from './components/Loader';
import HalloweenDecor from './components/HalloweenDecor';
import PinkDecor from './components/PinkDecor';
import { getSeasonalTheme } from './lib/seasonalTheme';
import { estInstallee } from './lib/install';

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

/**
 * La racine du site.
 *
 * Un visiteur arrive sur la présentation, un membre sur son tableau de bord.
 * Deux exceptions : tant que la connexion n'est pas tranchée on n'affiche ni
 * l'un ni l'autre — faire clignoter la vitrine devant un membre connecté
 * serait pire que d'attendre —, et dans l'app déjà installée on va droit à la
 * connexion, puisque la vitrine n'aurait plus rien à y proposer.
 */
function Racine() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page loading"><Loader /></div>;
  if (user || estInstallee()) return <ProtectedRoute><Dashboard /></ProtectedRoute>;
  return <Decouvrir />;
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
      <Suspense fallback={<div className="page loading"><Loader /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* La vitrine est publique, et surtout servie par le même domaine que
              l'app : c'est ce qui permet à son bouton d'installer réellement
              CaliCrew. Depuis un autre domaine, le navigateur refuserait. */}
          <Route path="/decouvrir" element={<Decouvrir />} />
          <Route path="/telecharger" element={<Decouvrir />} />
          <Route path="/" element={<Racine />} />
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
      </Suspense>
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
