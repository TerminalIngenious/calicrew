import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet, getFamilies, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import type { UserProgress, Card } from '../types';
import { Layers, Info, X, ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
  const [ownedCards, setOwnedCards] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [groupBy, setGroupBy] = useState<'rarity' | 'family'>('rarity');

  const season = getCurrentSeason();
  const cards: Card[] = season ? getCardsBySet(season.id) : [];

  // La saison 1 n'a qu'une famille : inutile de proposer la bascule.
  const families = getFamilies(cards);

  const groups =
    groupBy === 'family'
      ? families.map((family) => ({
          key: family,
          label: family,
          color: undefined as string | undefined,
          cards: cards.filter((c) => c.category === family),
        }))
      : RARITY_ORDER.map((rarity) => ({
          key: rarity,
          label: RARITY_LABELS[rarity],
          color: RARITY_COLORS[rarity] as string | undefined,
          cards: cards.filter((c) => c.rarity === rarity),
        }));

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
        <button className="icon-btn" onClick={() => navigate('/profile')}>
          <ArrowLeft size={20} />
        </button>
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

      {families.length > 1 && (
        <div className="layout-switch collection-group-switch">
          <button
            className={`layout-switch-btn ${groupBy === 'rarity' ? 'active' : ''}`}
            onClick={() => setGroupBy('rarity')}
          >
            Par rareté
          </button>
          <button
            className={`layout-switch-btn ${groupBy === 'family' ? 'active' : ''}`}
            onClick={() => setGroupBy('family')}
          >
            Par famille
          </button>
        </div>
      )}

      {groups.map((group) => {
        const groupCards = group.cards;
        if (groupCards.length === 0) return null;
        const ownedInGroup = groupCards.filter((c) => (ownedCards[c.id] || 0) > 0).length;

        return (
          <section key={group.key} className="section collection-rarity-section">
            <h3 className="collection-rarity-header" style={{ color: group.color }}>
              {group.label} ({ownedInGroup}/{groupCards.length})
            </h3>
            <div className="card-grid card-grid-images">
              {groupCards.map((card) => {
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
