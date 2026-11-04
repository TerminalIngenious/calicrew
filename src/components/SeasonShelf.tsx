import { ChevronRight, Lock } from 'lucide-react';
import type { Card, Season } from '../types';

/**
 * Les saisons d'un profil, une affiche chacune.
 *
 * Les cartes étaient empilées dans une seule grille triée par rareté : à partir
 * de deux saisons, plus moyen de savoir de quelle collection venait quelle
 * carte. Chaque saison a donc son bandeau pleine largeur — son nom, son thème,
 * son compte et, en fond, les cartes qui l'ont marquée.
 *
 * Le bandeau mène à la page de la saison plutôt que de déplier sa grille sur
 * place : à cinquante cartes, le profil devenait un mur à faire défiler avant
 * d'atteindre le reste.
 */

export interface SeasonShelfEntry {
  season: Season;
  /** Toute la saison, pour le compte affiché sur le bandeau. */
  cards: Card[];
  /** Les cartes possédées, pour le compte affiché sur le bandeau. */
  owned: Card[];
  /** Le fond du bandeau : les trois plus rares de la saison, possédées ou non. */
  marquantes: Card[];
  /**
   * Saison pas encore ouverte : on l'annonce, sans rien dévoiler.
   *
   * Le bandeau reste noir et vide, avec la date d'ouverture à la place du
   * compte. Même le dos des cartes en disait trop : le ticket de bus livrait le
   * décor de la saison et ses neuf lignes.
   */
  locked?: boolean;
  /** « 29 novembre » : la date d'ouverture, déjà formatée. */
  startLabel?: string;
}

interface Props {
  shelves: SeasonShelfEntry[];
  onOpen: (seasonId: string) => void;
}

export default function SeasonShelf({ shelves, onOpen }: Props) {
  return (
    <div className="season-shelf">
      {shelves.map(({ season, cards, owned, marquantes, locked, startLabel }) => (
        <div key={season.id} className={`season-slab-wrap ${locked ? 'locked' : ''}`}>
          <button
            className="season-slab"
            onClick={() => !locked && onOpen(season.id)}
            aria-disabled={locked || undefined}
          >
            {!locked && (
              <div className="season-slab-bg" aria-hidden="true">
                {marquantes.map((c) => <img key={c.id} src={c.image} alt="" loading="lazy" />)}
              </div>
            )}
            <div className="season-slab-face">
              <span className="season-slab-kicker">{season.name}</span>
              <span className="season-slab-title">{season.theme}</span>
              <span className="season-slab-count">
                {locked ? `Bientôt · ${startLabel}` : `${owned.length}/${cards.length} cartes`}
              </span>
            </div>
            {locked
              ? <Lock size={16} className="season-slab-chevron" />
              : <ChevronRight size={18} className="season-slab-chevron" />}
          </button>
        </div>
      ))}
    </div>
  );
}
