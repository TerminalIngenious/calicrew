import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import type { UserProgress, Card } from '../types';
import { Layers, Info, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import CardDetailModal from '../components/CardDetailModal';

const DROP_RATES = [
  { rarity: 'commune' as const, pct: '50%' },
  { rarity: 'rare' as const, pct: '34%' },
  { rarity: 'epique' as const, pct: '12%' },
  { rarity: 'legendaire' as const, pct: '3%' },
  { rarity: 'historique' as const, pct: '1%' },
];

export default function Collection() {
  const { user } = useAuth();
  const [ownedCards, setOwnedCards] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const season = getCurrentSeason();
  const cards: Card[] = season ? getCardsBySet(season.id) : [];

  const load = useCallback(async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'userProgress', user.uid));
    if (snap.exists()) {
      const data = snap.data() as UserProgress;
      setOwnedCards(data.ownedCards || {});
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="page loading"><Loader /></div>;

  const ownedCount = cards.filter((c) => (ownedCards[c.id] || 0) > 0).length;

  return (
    <div className="page">
      <header className="page-header">
        <h1>{season ? season.theme : 'Collection'}</h1>
        <button className="info-btn" onClick={() => setShowInfo(true)}>
          <Info size={18} />
        </button>
      </header>

      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="drop-rates-modal" onClick={(e) => e.stopPropagation()}>
            <div className="drop-rates-header">
              <h3>Taux de drop</h3>
              <button className="drop-rates-close" onClick={() => setShowInfo(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="drop-rates-desc">Quand tu ouvres un coffre, voici les chances d'obtenir chaque rareté :</p>
            <div className="drop-rates-list">
              {DROP_RATES.map((rate) => (
                <div key={rate.rarity} className="drop-rate-row">
                  <span className="drop-rate-label" style={{ color: RARITY_COLORS[rate.rarity] }}>
                    {RARITY_LABELS[rate.rarity]}
                  </span>
                  <div className="drop-rate-bar-bg">
                    <div
                      className="drop-rate-bar-fill"
                      style={{ width: rate.pct, background: RARITY_COLORS[rate.rarity] }}
                    />
                  </div>
                  <span className="drop-rate-pct">{rate.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          owned={(ownedCards[selectedCard.id] || 0) > 0}
          count={ownedCards[selectedCard.id] || 0}
          onClose={() => setSelectedCard(null)}
        />
      )}

      <div className="collection-summary">
        <Layers size={20} />
        <span>{ownedCount} / {cards.length} cartes</span>
      </div>

      {RARITY_ORDER.map((rarity) => {
        const rarityCards = cards.filter((c) => c.rarity === rarity);
        if (rarityCards.length === 0) return null;
        const ownedInRarity = rarityCards.filter((c) => (ownedCards[c.id] || 0) > 0).length;

        return (
          <section key={rarity} className="section collection-rarity-section">
            <h3 className="collection-rarity-header" style={{ color: RARITY_COLORS[rarity] }}>
              {RARITY_LABELS[rarity]} ({ownedInRarity}/{rarityCards.length})
            </h3>
            <div className="card-grid card-grid-images">
              {rarityCards.map((card) => {
                const owned = (ownedCards[card.id] || 0) > 0;
                const count = ownedCards[card.id] || 0;
                return (
                  <div
                    key={card.id}
                    className={`collection-card-img ${owned ? 'owned' : 'locked'}`}
                    onClick={() => setSelectedCard(card)}
                  >
                    {card.image ? (
                      <img
                        src={card.image}
                        alt={getCardDisplayName(card)}
                        className="collection-card-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="collection-card-emoji-fallback">
                        <span>{card.emoji}</span>
                      </div>
                    )}
                    {!owned && <div className="collection-card-lock-overlay" />}
                    {count > 1 && <span className="collection-card-count">x{count}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <BottomNav />
    </div>
  );
}
