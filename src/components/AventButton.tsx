import { useNavigate } from 'react-router-dom';
import { CASES, enCours, jourOuvert, lis } from '../lib/avent';
import type { AventProgress } from '../types';
import '../pages/Avent.css';

/**
 * L'entrée de l'event, dans la page du pass.
 *
 * Même rôle que le bouton de FaceID, et même parti pris : l'event n'est pas
 * un palier du pass, c'est autre chose posé par-dessus. D'où une dalle qui ne
 * ressemble à rien d'autre sur la page, et un sapin à la place de l'icône.
 */
function Sapin() {
  return (
    <svg className="avt-sapin" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 2 22 15H12z" fill="#2f9e5a" />
      <path d="M17 11 24 26H10z" fill="#38b368" />
      <path d="M17 21 27 38H7z" fill="#2f9e5a" />
      <rect x="14.5" y="38" width="5" height="5" rx="1.4" fill="#5a3a22" />
      {/* La neige sur le bord bas de chaque étage, là où elle tiendrait. */}
      <path d="M12 15h10l-1.6 2h-6.8zM10 26h14l-1.6 2h-10.8zM7 38h20l-1.6 2h-16.8z"
            fill="rgba(255,255,255,0.85)" />
      <circle cx="17" cy="1.8" r="1.9" fill="#ffd60a" />
      <circle cx="13" cy="23" r="1.3" fill="#e8403a" />
      <circle cx="21" cy="31" r="1.3" fill="#64d2ff" />
      <circle cx="15" cy="34" r="1.3" fill="#ffd60a" />
    </svg>
  );
}

export default function AventButton({ avent }: { avent?: AventProgress }) {
  const navigate = useNavigate();
  if (!enCours()) return null;

  const av = lis(avent);
  const jour = jourOuvert();
  // Les cases des jours passés restent ouvrables : la pastille compte tout
  // ce qui attend, pas seulement celle d'aujourd'hui.
  const enAttente = Math.max(0, jour - av.portes.length);

  return (
    <button className="avt-entree" onClick={() => navigate('/avent')}>
      <Sapin />
      <div className="avt-entree-texte">
        <span className="avt-entree-kicker">Événement</span>
        <span className="avt-entree-titre">Branlette Hivernale</span>
        <span className="avt-entree-sous">
          {av.portes.length} / {CASES} cases ouvertes
        </span>
      </div>
      {enAttente > 0 && (
        <span className="avt-entree-pastille">
          {enAttente} case{enAttente > 1 ? 's' : ''}
        </span>
      )}
    </button>
  );
}
