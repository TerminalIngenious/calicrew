import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CARTES, TOTAL_CARTES, enCours, lis } from '../lib/avent';
import type { CarteAvent } from '../lib/avent';
import { useUserProgress } from '../lib/useUserProgress';
import AventCardArt from '../components/cardArt/AventCardArt';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import './Avent.css';

/**
 * Les cartes de l'avent, pour un joueur.
 *
 * Jumelle de celle de FaceID, et pour la même raison : depuis un profil on
 * vient voir une collection, pas un calendrier. Les vingt-cinq cases, les
 * missions et les boosters restent sur la page de l'event, où l'on va pour
 * jouer. Ici il n'y a que ce qui a été ramené — et comme chaque calendrier
 * est tiré à part, c'est justement là qu'on découvre ce que les autres ont
 * eu à votre place.
 */
export default function AventCartes() {
  const { uid } = useParams<{ uid?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cestMoi = !uid || uid === user?.uid;
  const cible = uid || user?.uid;

  const [apercu, setApercu] = useState<CarteAvent | null>(null);

  /* Même fond que la page de l'event, et pour la même raison : posé sur la
     page il couvrirait le décor de Noël, qui est derrière elle. */
  useEffect(() => {
    document.documentElement.dataset.page = 'avent';
    return () => { delete document.documentElement.dataset.page; };
  }, []);

  const { progress, loading } = useUserProgress(cible);
  const av = lis(progress?.avent);

  // L'ordre du vivier, pas celui des ouvertures : la collection se lit comme
  // le fichier, et deux profils se comparent ligne à ligne.
  const possedees = CARTES.filter((c) => (av.cartes[c.slug] || 0) > 0);

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page avt-page">
      <div className="page-head-row">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="season-page-title">
          <span className="season-slab-kicker">Événement</span>
          <h1>Branlette Hivernale</h1>
        </div>
      </div>

      <div className="season-page-bar">
        <span className="season-page-count">{possedees.length}/{TOTAL_CARTES} cartes</span>
        {cestMoi && enCours() && (
          <button className="section-head-link" onClick={() => navigate('/avent')}>
            Calendrier <ChevronRight size={14} />
          </button>
        )}
      </div>

      {possedees.length === 0 ? (
        <p className="empty">Aucune carte de l'événement</p>
      ) : (
        <div className="avt-cartes-grille">
          {possedees.map((c) => (
            <button key={c.slug} className="avt-carte-case" onClick={() => setApercu(c)}>
              <AventCardArt carte={c} />
              {(av.cartes[c.slug] || 0) > 1 && (
                <span className="avt-carte-doublon">×{av.cartes[c.slug]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {apercu && (
        <div className="avt-apercu" onClick={() => setApercu(null)}>
          <div className="avt-apercu-carte" onClick={(e) => e.stopPropagation()}>
            <button className="avt-apercu-fermer" onClick={() => setApercu(null)} aria-label="Fermer">
              <X size={18} />
            </button>
            <AventCardArt carte={apercu} retournable />
            {(av.cartes[apercu.slug] || 0) > 1 && (
              <span className="avt-apercu-doublons">
                ×{av.cartes[apercu.slug]} dans {cestMoi ? 'ta' : 'sa'} collection
              </span>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
