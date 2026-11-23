import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCardsBySet, getFamilies, isSetComplete, RARITY_ORDER, getRarityLabel, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import { getCurrentSeason, SEASONS } from '../lib/passes';
import { SET_INTERGALACTIQUE, joursRestants, fenetreOuverte } from '../lib/intergalactique';
import { useUserProgress } from '../lib/useUserProgress';
import type { Card } from '../types';
import { Layers, Info, X, ArrowLeft, Repeat } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import CardDetailModal from '../components/CardDetailModal';
import EchangeDoublons from '../components/EchangeDoublons';
import { doublons, xpDuLot } from '../lib/echangeXp';

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
  const { progress, loading } = useUserProgress(user?.uid);
  const ownedCards = progress?.ownedCards || {};
  const [showInfo, setShowInfo] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showEchange, setShowEchange] = useState(false);

  /* Les doublons se comptent sur toute la collection, pas sur la saison
     affichée : une carte de la saison 1 en double se rend aussi bien. */
  const lotDoublons = doublons(progress?.ownedCards);

  const [groupBy, setGroupBy] = useState<'rarity' | 'family'>('rarity');

  const season = getCurrentSeason();

  /**
   * Saisons consultables : celle en cours, plus les passées dont la collection
   * n'est pas finie. Une collection complète disparaît — il n'y a plus rien à
   * y chercher, et la garder encombrerait l'écran saison après saison.
   */
  // Le rang dans SEASONS suffit à écarter les saisons à venir : pas besoin de
  // lire l'horloge pendant le rendu, ce qui ne serait pas une fonction pure.
  const currentIndex = SEASONS.findIndex((s) => s.id === season?.id);
  const saisons = SEASONS.filter(
    (s, i) => i === currentIndex || (i < currentIndex && !isSetComplete(s.id, ownedCards))
  );

  /*
   * La carte intergalactique a son propre onglet, hors des saisons.
   *
   * Elle n'appartient à aucune : la ranger dans la saison en cours aurait
   * rendu sa collection impossible à terminer. L'onglet reste là une fois
   * la carte trouvée — c'est une vitrine, pas une liste de courses.
   */
  const viewableSeasons = [
    ...saisons,
    { id: SET_INTERGALACTIQUE, name: 'Intergalactique', theme: '', startDate: 0, endDate: 0, passLevels: [], quests: [] },
  ];

  const [viewedId, setViewedId] = useState<string | null>(null);
  const activeId = viewedId && viewableSeasons.some((s) => s.id === viewedId)
    ? viewedId
    : season?.id || '';
  const viewedSeason = viewableSeasons.find((s) => s.id === activeId);

  const cards: Card[] = activeId ? getCardsBySet(activeId) : [];

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
          label: getRarityLabel(rarity, activeId),
          color: RARITY_COLORS[rarity] as string | undefined,
          cards: cards.filter((c) => c.rarity === rarity),
        }));



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
                    {getRarityLabel(rate.rarity, activeId)}
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

      {showEchange && user && progress && (
        <EchangeDoublons uid={user.uid} progress={progress} onClose={() => setShowEchange(false)} />
      )}

      <div className="collection-summary">
        <Layers size={20} />
        <span>{ownedCount} / {cards.length} cartes</span>
      </div>

      {/* Le bouton n'existe que s'il y a quelque chose à échanger : une porte
          vers une pièce vide ne sert qu'à décevoir. */}
      {lotDoublons.length > 0 && (
        <button className="collection-echange" onClick={() => setShowEchange(true)}>
          <Repeat size={16} />
          <span>Échanger mes doublons</span>
          <strong>+{xpDuLot(lotDoublons)} XP</strong>
        </button>
      )}

      {viewableSeasons.length > 1 && (
        <div className="layout-switch collection-season-switch">
          {viewableSeasons.map((s) => (
            <button
              key={s.id}
              className={`layout-switch-btn ${activeId === s.id ? 'active' : ''}`}
              onClick={() => setViewedId(s.id)}
            >
              {s.name}
              {s.id !== season?.id && s.id !== SET_INTERGALACTIQUE && <em> · terminée</em>}
            </button>
          ))}
        </div>
      )}

      {activeId === SET_INTERGALACTIQUE ? (
        <p className="collection-archive-hint">
          {!fenetreOuverte()
            ? 'La fenêtre est fermée. Cette carte ne tombe plus.'
            : joursRestants() === 0
              ? 'Dernier jour. Une chance sur deux cents à chaque coffre.'
              : `Une chance sur deux cents à chaque coffre, jusqu'au 3 mars. Encore ${joursRestants()} jour${joursRestants() > 1 ? 's' : ''}. Une seule par personne.`}
        </p>
      ) : viewedSeason && viewedSeason.id !== season?.id && (
        <p className="collection-archive-hint">
          {viewedSeason.theme} ne tombe plus dans les coffres du pass. La quête
          bonus hebdomadaire du Pass donne un coffre de cette saison tant qu'il
          te manque des cartes.
        </p>
      )}

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
