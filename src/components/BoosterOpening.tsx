import { useState } from 'react';
import FaceIdCard from './FaceIdCard';
import { carteParId } from '../lib/faceid';
import { useScrollLock } from '../lib/useScrollLock';

type Phase = 'sachet' | 'dechire' | 'cartes' | 'recap';

/**
 * L'ouverture d'un booster.
 *
 * Rien ne se déclenche tout seul : le sachet attend qu'on le touche, puis
 * chaque carte attend le clic suivant. Une ouverture qui se déroule seule se
 * regarde ; une ouverture qu'on fait avancer soi-même se vit. C'est toute la
 * différence entre un coffre et un booster.
 *
 * Les trois cartes sont tirées et enregistrées avant d'arriver ici. Si
 * l'animation est interrompue — appel, onglet fermé, batterie — les cartes
 * sont déjà acquises. On ne joue pas le contenu d'un booster sur la capacité
 * d'un téléphone à ne pas s'éteindre.
 */
export default function BoosterOpening({
  ids,
  onFini,
}: {
  ids: string[];
  onFini: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('sachet');
  const [index, setIndex] = useState(0);
  useScrollLock(true);

  const cartes = ids.map(carteParId).filter((c) => c !== undefined);

  function avance() {
    if (phase === 'sachet') {
      setPhase('dechire');
      window.setTimeout(() => setPhase('cartes'), 700);
      return;
    }
    if (phase === 'dechire') return;
    if (phase === 'cartes') {
      if (index < cartes.length - 1) setIndex(index + 1);
      else setPhase('recap');
    }
  }

  return (
    <div className="fid-ouverture" onClick={avance}>
      {(phase === 'sachet' || phase === 'dechire') && (
        <div className={`fid-sachet-scene ${phase === 'dechire' ? 'dechire' : ''}`}>
          <Sachet />
          {phase === 'sachet' && <p className="fid-ouverture-aide">Touche le sachet pour l'ouvrir</p>}
        </div>
      )}

      {phase === 'cartes' && cartes[index] && (
        <div className="fid-reveal-scene">
          <FaceIdCard
            key={cartes[index].id}
            carte={cartes[index]}
            possedee
            revele
            taille="grande"
          />
          <p className="fid-ouverture-aide">
            {index + 1} / {cartes.length} — touche pour la suivante
          </p>
        </div>
      )}

      {phase === 'recap' && (
        <div className="fid-recap" onClick={(e) => e.stopPropagation()}>
          <h3>Booster ouvert</h3>
          <div className="fid-recap-cartes">
            {cartes.map((c, i) => (
              <FaceIdCard key={`${c.id}-${i}`} carte={c} possedee />
            ))}
          </div>
          <button className="primary-btn" onClick={onFini}>Terminé</button>
        </div>
      )}
    </div>
  );
}

/** Le sachet : une pochette foil, dentelée en haut, avec son visage cadré. */
function Sachet() {
  return (
    <div className="fid-sachet">
      <span className="fid-sachet-dents" />
      <div className="fid-sachet-corps">
        <svg className="fid-sachet-logo" viewBox="0 0 120 120" aria-hidden="true">
          <path d="M8 34V14a6 6 0 016-6h20M86 8h20a6 6 0 016 6v20M112 86v20a6 6 0 01-6 6H86M34 112H14a6 6 0 01-6-6V86" />
          <circle cx="60" cy="50" r="17" />
          <path d="M31 100c0-16 13-26 29-26s29 10 29 26" />
        </svg>
        <span className="fid-sachet-titre">FaceID</span>
        <span className="fid-sachet-sous">3 cartes</span>
      </div>
      <span className="fid-sachet-lueur" />
    </div>
  );
}
