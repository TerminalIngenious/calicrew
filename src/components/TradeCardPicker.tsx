import { X } from 'lucide-react';
import { getCardDisplayName, RARITY_COLORS } from '../lib/cards';
import type { Card, TradeListing } from '../types';

/**
 * Sélection d'une carte, pour publier une annonce ou pour proposer sur celle
 * de quelqu'un d'autre. Un clic valide directement : il n'y a qu'un choix à
 * faire, un état « sélectionné » puis un bouton de confirmation n'ajouterait
 * qu'une étape.
 */
export default function TradeCardPicker({
  listing,
  cards,
  wantedCard,
  busy,
  error,
  onPick,
  onClose,
}: {
  /** Absent = on publie sa propre annonce. */
  listing: TradeListing | null;
  cards: { card: Card; count: number }[];
  wantedCard?: Card;
  busy: boolean;
  error: string | null;
  onPick: (cardId: string) => void;
  onClose: () => void;
}) {
  const isPublish = listing === null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="explore-modal-header">
          <h3>{isPublish ? "Quelle carte mets-tu à l'échange ?" : 'Quelle carte proposes-tu ?'}</h3>
          <button className="member-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="explore-modal-body">
          {listing && wantedCard && (
            <p className="trade-hint">
              {listing.ownerName} met <strong>{getCardDisplayName(wantedCard)}</strong> à l'échange.
            </p>
          )}
          {error && <p className="pr-form-error">{error}</p>}

          {cards.length === 0 ? (
            <p className="empty" style={{ fontSize: '0.85rem' }}>
              Tu n'as aucune carte à proposer.
            </p>
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
