import { useLayoutEffect, useRef, useState } from 'react';
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
 *
 * Elle a été brièvement partagée avec les niveaux de profil, puis
 * départagée : ceux-ci ne donnent quelque chose qu'un palier sur deux, et
 * la même mise en page y faisait une liste en dents de scie. Ils ont leur
 * propre piste, dans PisteProfil. Ici chaque palier donne un coffre, et
 * c'est ce qui permet à toutes les lignes de se ressembler.
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
  const paliers = levels.map((lvl) => ({
    niveau: lvl.level,
    coffre: (lvl.freeChest || 'commune') as CardRarity,
  }));
  const niveauActuel = currentLevel;
  const total = levels.length;
  const [info, setInfo] = useState<CardRarity | null>(null);

  /*
   * On arrive sur son palier, pas sur le premier.
   *
   * Cent paliers font quatorze mille pixels : le joueur de niveau soixante
   * ouvrait l'onglet sur le coffre du niveau 1, qu'il a gagné il y a deux
   * mois, et devait dérouler la moitié de la page pour voir le prochain.
   * Avant la peinture, pour qu'on ne voie pas la page sauter.
   */
  const prochainRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    prochainRef.current?.scrollIntoView({ block: 'center' });
    // Au montage seulement : après, la position est au joueur.
  }, []);

  return (
    /* La part du rail déjà parcourue, pour que le trait se lise comme une
       jauge et non comme une simple ligne de reliure. */
    <div
      className="bp-piste"
      style={{ ['--parcouru' as string]: `${Math.min(100, (niveauActuel / Math.max(1, total)) * 100)}%` }}
    >
      {paliers.map((p) => {
        const atteint = niveauActuel >= p.niveau;
        const prochain = niveauActuel === p.niveau - 1;
        const garanti = p.coffre !== 'commune';
        const label = getRarityLabel(p.coffre, seasonId);

        return (
          <div
            key={p.niveau}
            ref={prochain ? prochainRef : undefined}
            className={`bp-palier ${atteint ? 'atteint' : ''} ${prochain ? 'prochain' : ''}`}
          >
            <div className="bp-palier-niveau">
              <span className="bp-palier-kicker">Niveau</span>
              <span className="bp-palier-num">{p.niveau}</span>
              {atteint && <span className="bp-palier-coche"><Check size={13} /></span>}
            </div>

            <div className="bp-palier-coffre">
              <CoffrePass rarity={p.coffre} size={52} />
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
                  onClick={() => setInfo(p.coffre)}
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
