import { useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import { getRarityLabel } from '../lib/cards';
import CoffrePass from './CoffrePass';
import type { CardRarity, PassLevel } from '../types';

/**
 * La piste des cent niveaux du pass.
 *
 * C'était un tableau à deux colonnes, une ligne de quarante pixels par
 * niveau et la même petite boîte grise partout : on y lisait son niveau,
 * pas ce qu'on allait gagner. Chaque palier a maintenant sa carte, avec
 * son coffre dessiné à la couleur de ce qu'il garantit.
 */
export default function PassTrack({
  levels,
  currentLevel,
  seasonId,
}: {
  levels: PassLevel[];
  /** Le dernier niveau atteint. Le palier juste au-dessus est le prochain. */
  currentLevel: number;
  seasonId: string;
}) {
  const [info, setInfo] = useState<CardRarity | null>(null);

  return (
    <div className="bp-piste">
      {levels.map((lvl) => {
        const atteint = currentLevel >= lvl.level;
        const prochain = currentLevel === lvl.level - 1;
        const rarete = lvl.freeChest || 'commune';
        const garanti = rarete !== 'commune';
        const label = getRarityLabel(rarete, seasonId);

        return (
          <div
            key={lvl.level}
            className={`bp-palier ${atteint ? 'atteint' : ''} ${prochain ? 'prochain' : ''}`}
          >
            <div className="bp-palier-niveau">
              <span className="bp-palier-kicker">Niveau</span>
              <span className="bp-palier-num">{lvl.level}</span>
              {atteint && <span className="bp-palier-coche"><Check size={13} /></span>}
            </div>

            <div className="bp-palier-coffre">
              <CoffrePass rarity={rarete} size={88} />
            </div>

            <div className="bp-palier-texte">
              <span className="bp-palier-titre">
                {garanti ? `Coffre ${label.toLowerCase()}` : 'Coffre'}
              </span>
              {/* Le « i » n'est là que sur les coffres garantis : sur un
                  coffre blanc, il n'y aurait rien à expliquer. */}
              {garanti && (
                <button
                  className="bp-palier-info"
                  aria-label={`Ce que garantit un coffre ${label.toLowerCase()}`}
                  onClick={() => setInfo(rarete)}
                >
                  <Info size={14} />
                </button>
              )}
            </div>
            {prochain && <span className="bp-palier-prochain">Prochain</span>}
          </div>
        );
      })}

      {info && (
        <div className="modal-overlay" onClick={() => setInfo(null)}>
          <div className="bp-info-card" onClick={(e) => e.stopPropagation()}>
            <button className="member-modal-close" onClick={() => setInfo(null)}>
              <X size={18} />
            </button>
            <CoffrePass rarity={info} size={104} />
            <h3>Coffre {getRarityLabel(info, seasonId).toLowerCase()}</h3>
            <p>
              Il contient <strong>au minimum une carte {getRarityLabel(info, seasonId).toLowerCase()}</strong>.
              Tu peux y trouver mieux, jamais moins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
