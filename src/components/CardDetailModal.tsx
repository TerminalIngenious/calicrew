import { RARITY_LABELS, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import type { Card } from '../types';
import { X } from 'lucide-react';

interface Props {
  card: Card;
  owned?: boolean;
  count?: number;
  onClose: () => void;
}

export default function CardDetailModal({ card, owned, count, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-detail-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="card-detail-glow" style={{ background: RARITY_COLORS[card.rarity] }} />
        {card.image ? (
          <img src={card.image} alt={getCardDisplayName(card)} className="card-detail-img" />
        ) : (
          <div className="card-detail-emoji">
            <span>{card.emoji}</span>
          </div>
        )}
        <div className="card-detail-info">
          <span className="card-detail-rarity" style={{ background: RARITY_COLORS[card.rarity] }}>
            {RARITY_LABELS[card.rarity]}
          </span>
          <h3 className="card-detail-name">{getCardDisplayName(card)}</h3>
          {card.subtitle && <span className="card-detail-subtitle">{card.subtitle}</span>}
          <span className="card-detail-cat">{card.category}</span>
          {owned === false && <span className="card-detail-locked">Non débloquée</span>}
          {count !== undefined && count > 1 && <span className="card-detail-count">x{count}</span>}
        </div>
      </div>
    </div>
  );
}
