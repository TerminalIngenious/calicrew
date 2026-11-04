import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getCardsBySet, RARITY_ORDER, getCardDisplayName } from '../lib/cards';
import { SEASONS, lastStartedSeasonIndex } from '../lib/passes';
import type { Card, UserProgress } from '../types';
import CardDetailModal from '../components/CardDetailModal';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

/**
 * Les cartes d'une saison, pour un joueur.
 *
 * Elles s'ouvraient en dépliant le bandeau du profil, ce qui finissait par
 * faire une page à rallonge dès qu'on avait rempli une collection. Chaque
 * saison a donc sa page.
 */

/**
 * Peut-on encore gagner des cartes de cette saison ?
 *
 * Les quêtes et les coffres donnent des cartes de la saison en cours et de la
 * précédente — on laisse le temps de finir une collection commencée. Au-delà,
 * la collection n'est plus alimentée : le lien n'aurait plus rien à proposer.
 */
function canStillEarn(setId: string): boolean {
  const current = lastStartedSeasonIndex();
  const index = SEASONS.findIndex((s) => s.id === setId);
  return index >= 0 && index >= current - 1;
}

export default function SeasonCards() {
  const { setId, uid } = useParams<{ setId: string; uid?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwnProfile = !uid || uid === user?.uid;
  const targetUid = uid || user?.uid;

  const [ownedCards, setOwnedCards] = useState<Record<string, number>>({});
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUid) return;
    // `obsolete` couvre le cas où l'on quitte la page, ou où l'on change de
    // joueur, avant que la lecture ne revienne : sans lui on écrirait le
    // résultat d'une requête qui ne concerne plus l'écran affiché.
    let obsolete = false;
    (async () => {
      const snap = await getDoc(doc(db, 'userProgress', targetUid));
      if (obsolete) return;
      if (snap.exists()) setOwnedCards((snap.data() as UserProgress).ownedCards || {});
      setLoading(false);
    })();
    return () => { obsolete = true; };
  }, [targetUid]);

  const season = SEASONS.find((s) => s.id === setId);
  const cards = season ? getCardsBySet(season.id) : [];
  const owned = RARITY_ORDER.flatMap((r) =>
    cards.filter((c) => c.rarity === r && (ownedCards[c.id] || 0) > 0)
  );

  if (loading) return <div className="page loading"><Loader /></div>;

  if (!season) {
    return (
      <div className="page">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <p className="empty">Saison introuvable</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head-row">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="season-page-title">
          <span className="season-slab-kicker">{season.name}</span>
          <h1>{season.theme}</h1>
        </div>
      </div>

      <div className="season-page-bar">
        <span className="season-page-count">{owned.length}/{cards.length} cartes</span>
        {isOwnProfile && canStillEarn(season.id) && (
          <button className="section-head-link" onClick={() => navigate('/collection')}>
            Collection <ChevronRight size={14} />
          </button>
        )}
      </div>

      {owned.length === 0 ? (
        <p className="empty">Aucune carte de cette saison</p>
      ) : (
        <div className="card-grid card-grid-images">
          {owned.map((card) => (
            <div
              key={card.id}
              className="collection-card-img owned"
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
                <div className="collection-card-emoji-fallback"><span>{card.emoji}</span></div>
              )}
              {ownedCards[card.id] > 1 && (
                <span className="collection-card-count">x{ownedCards[card.id]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          owned
          count={ownedCards[selectedCard.id] || 0}
          onClose={() => setSelectedCard(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
