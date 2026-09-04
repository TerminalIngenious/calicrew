import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ALL_CARDS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS } from '../lib/cards';
import type { UserProgress } from '../types';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

export default function Collection() {
  const { user } = useAuth();
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'userProgress', user.uid));
    if (snap.exists()) {
      const data = snap.data() as UserProgress;
      setOwnedIds(data.ownedCardIds || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const totalOwned = ownedIds.length;
  const totalCards = ALL_CARDS.length;

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Collection</h1>
        <span className="collection-count">{totalOwned}/{totalCards}</span>
      </header>

      {RARITY_ORDER.map((rarity) => {
        const cards = ALL_CARDS.filter((c) => c.rarity === rarity);
        const ownedCount = cards.filter((c) => ownedIds.includes(c.id)).length;
        return (
          <section key={rarity} className="section">
            <div className="collection-rarity-header">
              <h3 style={{ color: RARITY_COLORS[rarity] }}>{RARITY_LABELS[rarity]}</h3>
              <span className="collection-rarity-count">{ownedCount}/{cards.length}</span>
            </div>
            <div className="card-grid">
              {cards.map((card) => {
                const owned = ownedIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    className={`collection-card ${owned ? 'owned' : 'locked'}`}
                    style={{ '--card-color': RARITY_COLORS[card.rarity] } as React.CSSProperties}
                  >
                    <span className="collection-card-emoji">{owned ? card.emoji : '?'}</span>
                    <span className="collection-card-name">{owned ? card.name : '???'}</span>
                    <span className="collection-card-rarity" style={{ color: RARITY_COLORS[card.rarity] }}>
                      {card.category}
                    </span>
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
