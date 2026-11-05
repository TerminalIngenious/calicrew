import { useNavigate } from 'react-router-dom';
import { ScanFace } from 'lucide-react';
import { evenementEnCours, lisFaceId, nbPossedees, TOTAL_CARTES } from '../lib/faceid';
import type { FaceIdProgress } from '../types';
import '../pages/FaceId.css';

/**
 * L'entrée de l'event, dans la page du pass.
 *
 * Elle n'a rien à voir avec le reste de la page, et c'est le but : l'event
 * n'est pas un palier du pass, c'est autre chose posé par-dessus. D'où la
 * dalle verte en relief, qui respire doucement et s'écrase sous le doigt
 * avant de rebondir — le ressort vient du dépassement de la courbe
 * d'animation au-delà de 1, qui fait repasser la dalle au-dessus de sa
 * position avant qu'elle ne se pose.
 */
export default function FaceIdButton({ faceid }: { faceid?: FaceIdProgress }) {
  const navigate = useNavigate();
  if (!evenementEnCours()) return null;

  const fid = lisFaceId(faceid);
  const possedees = nbPossedees(fid);

  return (
    <button className="fid-entree" onClick={() => navigate('/faceid')}>
      <ScanFace size={26} />
      <div className="fid-entree-texte">
        <span className="fid-entree-kicker">Événement</span>
        <span className="fid-entree-titre">FaceID</span>
        <span className="fid-entree-sous">
          {possedees} / {TOTAL_CARTES} visages identifiés
        </span>
      </div>
      {fid.boosters > 0 && (
        <span className="fid-entree-pastille">
          {fid.boosters} booster{fid.boosters > 1 ? 's' : ''}
        </span>
      )}
    </button>
  );
}
