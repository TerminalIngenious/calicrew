import { ChevronDown } from 'lucide-react';
import { getCardDisplayName } from '../lib/cards';
import type { Card, Season } from '../types';

/**
 * Les cartes d'un profil, rangées par saison.
 *
 * Tout était empilé dans une seule grille triée par rareté : à partir de deux
 * saisons, plus moyen de savoir de quelle collection venait quelle carte. Chaque
 * saison a donc son bandeau pleine largeur — son nom, son thème, son compte et,
 * en fond, les cartes qui l'ont marquée — qu'on déplie pour voir ce qu'on a.
 *
 * Une seule saison ouverte à la fois : deux grilles dépliées l'une sous l'autre
 * ramèneraient le problème qu'on cherche à régler.
 */

export interface SeasonShelfEntry {
  season: Season;
  /** Toute la saison, pour le compte affiché sur le bandeau. */
  cards: Card[];
  /** Les cartes possédées, déjà triées. */
  owned: Card[];
  /** Le fond du bandeau : les trois plus rares de la saison, possédées ou non. */
  marquantes: Card[];
}

interface Props {
  shelves: SeasonShelfEntry[];
  ownedCards: Record<string, number>;
  openSeasonId: string | null;
  onToggle: (seasonId: string) => void;
  onSelectCard: (card: Card) => void;
}

export default function SeasonShelf({
  shelves,
  ownedCards,
  openSeasonId,
  onToggle,
  onSelectCard,
}: Props) {
  return (
    <div className="season-shelf">
      {shelves.map(({ season, cards, owned, marquantes }) => {
        const open = openSeasonId === season.id;
        return (
          <div key={season.id} className={`season-slab-wrap ${open ? 'open' : ''}`}>
            <button
              className="season-slab"
              onClick={() => onToggle(season.id)}
              aria-expanded={open}
            >
              <div className="season-slab-bg" aria-hidden="true">
                {marquantes.map((c) => (
                  <img key={c.id} src={c.image} alt="" loading="lazy" />
                ))}
              </div>
              <div className="season-slab-face">
                <span className="season-slab-kicker">{season.name}</span>
                <span className="season-slab-title">{season.theme}</span>
                <span className="season-slab-count">{owned.length}/{cards.length} cartes</span>
              </div>
              <ChevronDown size={18} className="season-slab-chevron" />
            </button>

            {open && (
              owned.length === 0 ? (
                <p className="empty">Aucune carte de cette saison</p>
              ) : (
                <div className="card-grid card-grid-images season-slab-cards">
                  {owned.map((card) => (
                    <div
                      key={card.id}
                      className="collection-card-img owned"
                      onClick={() => onSelectCard(card)}
                    >
                      {card.image ? (
                        <img
                          src={card.image}
                          alt={getCardDisplayName(card)}
                          className="collection-card-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <div className="collection-card-emoji-fallback"><span>{card.emoji}</span></div>
                      )}
                      {ownedCards[card.id] > 1 && (
                        <span className="collection-card-count">x{ownedCards[card.id]}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
