import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { getCurrentSeason } from '../lib/passes';
import { coffreDuNiveau, coutNiveau, niveauDepuisXp, PALIERS_BADGE } from '../lib/niveaux';
import PisteProfil from '../components/PisteProfil';
import type { PalierProfil } from '../components/PisteProfil';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

/** Paliers ajoutés à chaque « voir plus ». */
const PAS = 40;

/** Ce qu'on montre au-delà du niveau atteint, à l'ouverture. */
const AVANCE = 20;

/**
 * L'échelle des niveaux de profil.
 *
 * Elle n'a pas de fin, contrairement à celle du pass : on en affiche une
 * tranche et on déroule à la demande. Ouvrir une page qui prétend afficher
 * l'infini n'a pas de sens, et s'arrêter net au niveau atteint non plus —
 * on vient justement voir ce qui attend.
 */
export default function Niveaux() {
  const { user } = useAuth();
  const { progress, loading } = useUserProgress(user?.uid);
  const navigate = useNavigate();

  const niveau = niveauDepuisXp(progress?.xp || 0);
  const [jusqua, setJusqua] = useState(0);

  // Le plafond réel : le niveau atteint, une avance, et ce que le joueur a
  // déroulé en plus. Calculé ici plutôt que dans l'état pour que l'arrivée
  // de la progression ne laisse pas une échelle trop courte.
  const dernier = Math.max(niveau.niveau + AVANCE, PAS, jusqua);

  const badges = useMemo(() => new Set(PALIERS_BADGE), []);

  const paliers: PalierProfil[] = useMemo(() => {
    const liste: PalierProfil[] = [];
    for (let n = 2; n <= dernier; n++) {
      liste.push({
        niveau: n,
        coffre: coffreDuNiveau(n) || undefined,
        badge: badges.has(n),
        cout: coutNiveau(n),
      });
    }
    return liste;
  }, [dernier, badges]);

  if (loading) return <div className="page loading"><Loader /></div>;

  const avancement = niveau.pourSuivant > 0
    ? Math.min(100, (niveau.dansNiveau / niveau.pourSuivant) * 100)
    : 100;

  return (
    <div className="page niv-page">
      <header className="niv-entete">
        <div className="niv-entete-fond" />
        <div className="niv-entete-contenu">
          <div className="niv-haut">
            <button className="niv-retour" onClick={() => navigate(-1)} aria-label="Revenir">
              <ArrowLeft size={20} />
            </button>
            <span className="niv-kicker">Progression</span>
          </div>
          <h1 className="niv-titre">Niveaux</h1>
          <div className="niv-mesures">
            <span className="niv-chiffre">{niveau.niveau}</span>
            <span className="niv-unite">niveau</span>
            <span className="niv-reste">{niveau.dansNiveau} / {niveau.pourSuivant} XP</span>
          </div>
          <p className="niv-sous">
            L'XP monte à chaque séance, selon le temps, les séries, les reps et
            la charge. Elle ne redescend jamais.
          </p>
        </div>
        <div className="niv-barre">
          <div className="niv-barre-fill" style={{ width: `${avancement}%` }} />
        </div>
      </header>

      <PisteProfil
        paliers={paliers}
        niveauActuel={niveau.niveau}
        seasonId={getCurrentSeason()?.id || ''}
        pied={
          <button className="niv-plus" onClick={() => setJusqua(dernier + PAS)}>
            Voir les {PAS} niveaux suivants
          </button>
        }
      />

      <BottomNav />
    </div>
  );
}
