import { useLayoutEffect, useRef, useState } from 'react';
import { Check, Info, Medal, X } from 'lucide-react';
import { getRarityLabel } from '../lib/cards';
import CoffrePass from './CoffrePass';
import type { CardRarity } from '../types';

/**
 * Une échelle de paliers : celle du pass, celle des niveaux de profil.
 *
 * Elle était la piste du pass, et elle en supposait les règles — cent
 * paliers, un coffre sur chacun. Les niveaux de profil n'ont ni l'un ni
 * l'autre : ils sont sans fin, et la plupart ne donnent rien. Plutôt que de
 * dessiner une deuxième échelle qui aurait ressemblé à 90 % à la première —
 * le genre de détail qui fait bricolé — c'est celle-ci qui s'est ouverte.
 *
 * Elle ne sait plus ce qu'est une saison ni un pass : on lui donne des
 * paliers déjà décrits, elle les met en rang.
 */

export interface Palier {
  niveau: number;
  /** Le coffre du palier, s'il y en a un. */
  coffre?: CardRarity;
  /** Le palier donne-t-il un badge ? */
  badge?: boolean;
  /** Ce qu'il faut pour l'atteindre, quand il n'y a rien à gagner. */
  note?: string;
}

export default function PisteNiveaux({
  paliers,
  niveauActuel,
  total,
  seasonId,
  pied,
}: {
  paliers: Palier[];
  /** Le dernier niveau atteint. Le palier juste au-dessus est le prochain. */
  niveauActuel: number;
  /** Sert à remplir le rail. Pour une échelle sans fin, le dernier affiché. */
  total: number;
  /** Pour nommer les raretés, qui changent de nom selon la saison. */
  seasonId: string;
  /** Ce qu'on met sous le dernier palier — un bouton « voir plus », par exemple. */
  pied?: React.ReactNode;
}) {
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
        const garanti = !!p.coffre && p.coffre !== 'commune';
        const label = p.coffre ? getRarityLabel(p.coffre, seasonId) : '';

        return (
          <div
            key={p.niveau}
            ref={prochain ? prochainRef : undefined}
            className={`bp-palier ${atteint ? 'atteint' : ''} ${prochain ? 'prochain' : ''} ${!p.coffre && !p.badge ? 'bp-palier-nu' : ''}`}
          >
            <div className="bp-palier-niveau">
              <span className="bp-palier-kicker">Niveau</span>
              <span className="bp-palier-num">{p.niveau}</span>
              {atteint && <span className="bp-palier-coche"><Check size={13} /></span>}
            </div>

            <div className="bp-palier-coffre">
              {p.coffre ? (
                <CoffrePass rarity={p.coffre} size={52} />
              ) : p.badge ? (
                <Medal size={34} className="bp-palier-medaille" />
              ) : null}
              {/* Un palier peut donner les deux : les paliers ronds — 10, 25,
                  50 — portent un badge en plus de leur coffre. La première
                  version choisissait l'un ou l'autre, et les badges
                  n'apparaissaient donc jamais, puisque ces paliers-là ont
                  toujours un coffre. */}
              {p.coffre && p.badge && (
                <span className="bp-palier-pin" aria-hidden="true">
                  <Medal size={13} />
                </span>
              )}
            </div>

            <div className="bp-palier-texte">
              <span className="bp-palier-titre">
                {p.coffre
                  ? garanti ? `Coffre ${label.toLowerCase()}` : 'Coffre'
                  : p.badge
                    ? 'Badge'
                    : p.note || ''}
                {/* Pas de « + badge » écrit ici : la médaille dorée épinglée
                    sur le coffre le dit déjà, et le texte passait sur deux
                    lignes en venant percuter la pastille « prochain ». */}
              </span>
              {/* Le « i » n'est là que sur les coffres garantis : sur un
                  coffre blanc, il n'y aurait rien à expliquer. */}
              {garanti && p.coffre && (
                <button
                  className="bp-palier-info"
                  aria-label={`Ce que garantit un coffre ${label.toLowerCase()}`}
                  onClick={() => setInfo(p.coffre!)}
                >
                  <Info size={14} />
                </button>
              )}
              {/* Le coût, en second rang, quand le palier donne déjà quelque
                  chose : savoir ce qu'on gagne passe avant savoir ce qu'il
                  faut pour l'avoir. */}
              {p.note && (p.coffre || p.badge) && (
                <span className="bp-palier-note">{p.note}</span>
              )}
            </div>
            {prochain && <span className="bp-palier-prochain">Prochain</span>}
          </div>
        );
      })}

      {pied}

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
