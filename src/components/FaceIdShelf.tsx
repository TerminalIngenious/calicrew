import { ScanFace, ChevronRight } from 'lucide-react';
import { CARTES, evenementEnCours, lisFaceId, nbPossedees, TOTAL_CARTES } from '../lib/faceid';
import type { FaceIdProgress } from '../types';
import '../pages/FaceId.css';

/**
 * La collection de l'event dans le profil.
 *
 * Elle reste après le 30 novembre, contrairement au bouton de la page du
 * pass : un event terminé n'a plus de missions, mais ce qu'on en a ramené
 * est justement ce qu'on vient montrer. Le bandeau disparaît en revanche
 * tant que personne n'a ouvert un seul booster — une collection vide d'un
 * event qui n'a pas commencé n'a rien à dire.
 */
export default function FaceIdShelf({
  faceid,
  onOpen,
}: {
  faceid?: FaceIdProgress;
  /** Ouvre la collection de l'event — celle du joueur dont c'est le profil. */
  onOpen?: () => void;
}) {
  const fid = lisFaceId(faceid);
  const possedees = nbPossedees(fid);
  if (possedees === 0 && !evenementEnCours()) return null;

  // Trois cartes obtenues, par ordre du fichier : une affiche, pas un
  // inventaire — le fichier complet est à un clic. Avant la première, trois
  // emplacements vides, pour que le bandeau garde sa forme le jour de
  // l'ouverture plutôt que de laisser le texte au bord.
  const apercu = CARTES.filter((c) => (fid.cartes[c.id] || 0) > 0).slice(0, 3);
  const vides = 3 - apercu.length;

  return (
    <section className="section">
      <button className="fid-shelf" onClick={onOpen} disabled={!onOpen}>
        <div className="fid-shelf-vignettes" aria-hidden="true">
          {apercu.map((c) => (
            <img key={c.id} src={c.image} alt="" className="fid-shelf-vignette" />
          ))}
          {Array.from({ length: vides }, (_, i) => (
            <span key={`vide-${i}`} className="fid-shelf-vignette vide" />
          ))}
        </div>
        <div className="fid-shelf-texte">
          <span className="fid-shelf-kicker"><ScanFace size={13} /> Événement</span>
          <span className="fid-shelf-titre">FaceID</span>
          <span className="fid-shelf-compte">{possedees} / {TOTAL_CARTES} visages identifiés</span>
          <div className="fid-shelf-jauge">
            <span style={{ width: `${(possedees / TOTAL_CARTES) * 100}%` }} />
          </div>
        </div>
        {onOpen && <ChevronRight size={18} className="fid-shelf-fleche" />}
      </button>
    </section>
  );
}
