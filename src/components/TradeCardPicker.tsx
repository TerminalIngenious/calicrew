import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { RARITY_COLORS } from '../lib/cards';
import type { Card } from '../types';

/**
 * Sélection d'une carte. Un clic valide directement : il n'y a qu'un choix à
 * faire, un état « sélectionné » suivi d'un bouton de confirmation
 * n'ajouterait qu'une étape.
 *
 * La liste proposée dépend de l'appelant — sa collection, celle de quelqu'un
 * d'autre, ou les cartes qui lui manquent — donc le composant ne décide rien :
 * il affiche ce qu'on lui donne.
 */
export default function TradeCardPicker({
  title,
  hint,
  emptyLabel,
  cards,
  busy,
  error,
  onPick,
  onClose,
}: {
  title: string;
  hint?: ReactNode;
  emptyLabel: string;
  cards: { card: Card; count: number }[];
  busy: boolean;
  error: string | null;
  onPick: (cardId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="explore-modal-header">
          <h3>{title}</h3>
          <button className="member-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="explore-modal-body">
          {hint && <p className="trade-hint">{hint}</p>}
          {error && <p className="pr-form-error">{error}</p>}

          {cards.length === 0 ? (
            <p className="empty" style={{ fontSize: '0.85rem' }}>{emptyLabel}</p>
          ) : (
            <div className="trade-card-grid">
              {cards.map(({ card, count }) => (
                <button
                  key={card.id}
                  className="trade-card-pick"
                  style={{ borderColor: RARITY_COLORS[card.rarity] }}
                  disabled={busy}
                  onClick={() => onPick(card.id)}
                >
                  {card.image && <img src={card.image} alt="" className="trade-card-pick-img" />}
                  <span className="trade-card-pick-name">{card.name}</span>
                  {count > 1 && <span className="trade-card-pick-count">×{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
