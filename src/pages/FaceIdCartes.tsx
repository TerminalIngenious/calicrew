import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CARTES, TOTAL_CARTES, evenementEnCours, lisFaceId } from '../lib/faceid';
import type { CarteFaceId } from '../lib/faceid';
import { useUserProgress } from '../lib/useUserProgress';
import FaceIdCard from '../components/FaceIdCard';
import FaceIdCardArt from '../components/cardArt/FaceIdCardArt';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import './FaceId.css';

/**
 * Les cartes de l'event, pour un joueur.
 *
 * Le bandeau du profil menait à la page de l'event : missions, boosters,
 * fichier entier avec ses cases vides. Or depuis un profil on vient voir une
 * collection, exactement comme pour une saison — d'où cette page, qui ne
 * montre que ce qui a été ramené et rien d'autre. La page de l'event reste
 * accessible par le pass, là où on va pour jouer.
 */
export default function FaceIdCartes() {
  const { uid } = useParams<{ uid?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cestMoi = !uid || uid === user?.uid;
  const cible = uid || user?.uid;

  const [apercu, setApercu] = useState<CarteFaceId | null>(null);
  const { progress, loading } = useUserProgress(cible);
  const fid = lisFaceId(progress?.faceid);

  // L'ordre du fichier, pas celui des ouvertures : les deux faces d'une même
  // personne restent côte à côte.
  const possedees = CARTES.filter((c) => (fid.cartes[c.id] || 0) > 0);

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <div className="page-head-row">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="season-page-title">
          <span className="season-slab-kicker">Événement</span>
          <h1>FaceID</h1>
        </div>
      </div>

      <div className="season-page-bar">
        <span className="season-page-count">{possedees.length}/{TOTAL_CARTES} cartes</span>
        {cestMoi && evenementEnCours() && (
          <button className="section-head-link" onClick={() => navigate('/faceid')}>
            Événement <ChevronRight size={14} />
          </button>
        )}
      </div>

      {possedees.length === 0 ? (
        <p className="empty">Aucune carte de l'événement</p>
      ) : (
        <div className="fid-cartes-grille">
          {possedees.map((c) => (
            <FaceIdCard
              key={c.id}
              carte={c}
              possedee
              onClick={() => setApercu(c)}
            />
          ))}
        </div>
      )}

      {apercu && (
        <div className="fid-apercu" onClick={() => setApercu(null)}>
          <div className="fid-apercu-carte" onClick={(e) => e.stopPropagation()}>
            <button className="fid-apercu-fermer" onClick={() => setApercu(null)} aria-label="Fermer">
              <X size={18} />
            </button>
            <FaceIdCardArt carte={apercu} />
            {(fid.cartes[apercu.id] || 0) > 1 && (
              <span className="fid-apercu-doublons">
                ×{fid.cartes[apercu.id]} dans {cestMoi ? 'ton' : 'son'} fichier
              </span>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
