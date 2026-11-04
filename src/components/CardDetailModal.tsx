import { getRarityLabel, RARITY_COLORS, getCardDisplayName, getCardBack } from '../lib/cards';
import type { Card } from '../types';
import { X } from 'lucide-react';
import { useScrollLock } from '../lib/useScrollLock';
import { getCardArt } from '../lib/cardsS2Art';
import Card3D from './Card3D';
import CardFront from './cardArt/CardFront';
import CardBack from './cardArt/CardBack';

interface Props {
  card: Card;
  owned?: boolean;
  count?: number;
  onClose: () => void;
}

export default function CardDetailModal({ card, owned, count, onClose }: Props) {
  useScrollLock(true);
  // Une carte dont on a les données complètes se dessine en direct — girouette
  // qui défile, pluie, et net à tout zoom. Sinon on retombe sur l'image, puis
  // sur l'emoji : c'est le cas de toute la saison 1 et de Femtogo.
  const art = getCardArt(card.id);
  const back = art ? <CardBack /> : getCardBack(card.set);
  const front = art ? <CardFront card={card} art={art} /> : card.image;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="card-detail-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="card-detail-glow" style={{ background: RARITY_COLORS[card.rarity] }} />
        {front && back ? (
          <div className="card-detail-3d">
            <Card3D front={front} back={back} rarity={card.rarity} alt={getCardDisplayName(card)} />
            <span className="card-detail-3d-hint">Glisse pour tourner la carte</span>
          </div>
        ) : card.image ? (
          <img src={card.image} alt={getCardDisplayName(card)} className="card-detail-img" />
        ) : (
          <div className="card-detail-emoji">
            <span>{card.emoji}</span>
          </div>
        )}
        <div className="card-detail-info">
          <span className="card-detail-rarity" style={{ background: RARITY_COLORS[card.rarity] }}>
            {getRarityLabel(card.rarity, card.set)}
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
