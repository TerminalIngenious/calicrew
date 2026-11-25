import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCardsBySet, getFamilies, isSetComplete, RARITY_ORDER, getRarityLabel, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import { getCurrentSeason, SEASONS } from '../lib/passes';
import { SET_INTERGALACTIQUE, joursRestants, fenetreOuverte } from '../lib/intergalactique';
import { CARTES as CARTES_AVENT, TOTAL_CARTES as TOTAL_AVENT, lis as lisAvent } from '../lib/avent';
import type { CarteAvent } from '../lib/avent';
import { CARTES as CARTES_FACEID, TOTAL_CARTES as TOTAL_FACEID, lisFaceId } from '../lib/faceid';
import type { CarteFaceId } from '../lib/faceid';
import AventCardArt from '../components/cardArt/AventCardArt';
import FaceIdCard from '../components/FaceIdCard';
import FaceIdCardArt from '../components/cardArt/FaceIdCardArt';
import '../pages/Avent.css';
import '../pages/FaceId.css';
import { useUserProgress } from '../lib/useUserProgress';
import type { Card } from '../types';
import { Info, X, ArrowLeft, Repeat } from 'lucide-react';
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
  /** La carte d'event qu'on regarde en grand. */
  const [apercuAvent, setApercuAvent] = useState<CarteAvent | null>(null);
  const [apercuFaceId, setApercuFaceId] = useState<CarteFaceId | null>(null);

  /*
   * Les deux events rejoignent les saisons dans la même bascule.
   *
   * Leurs cartes vivaient sur deux pages à part, avec chacune sa mise en
   * page pour la même chose : « mes cartes ». Elles n'y apparaissent que si
   * on en a — un onglet vide n'apprend rien, et ces events ne reviendront
   * pas tous les ans.
   */
  const av = lisAvent(progress?.avent);
  const fid = lisFaceId(progress?.faceid);
  const cartesAvent = CARTES_AVENT.filter((c) => (av.cartes[c.slug] || 0) > 0);
  const cartesFaceId = CARTES_FACEID.filter((c) => (fid.cartes[c.id] || 0) > 0);

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
  const faux = (id: string, name: string) =>
    ({ id, name, theme: '', startDate: 0, endDate: 0, passLevels: [], quests: [] });

  const viewableSeasons = [
    ...saisons,
    faux(SET_INTERGALACTIQUE, 'Intergalactique'),
    ...(cartesAvent.length > 0 ? [faux('avent', 'Avent')] : []),
    ...(cartesFaceId.length > 0 ? [faux('faceid', 'FaceID')] : []),
  ];

  const [viewedId, setViewedId] = useState<string | null>(null);
  const activeId = viewedId && viewableSeasons.some((s) => s.id === viewedId)
    ? viewedId
    : season?.id || '';
  const viewedSeason = viewableSeasons.find((s) => s.id === activeId);

  const estEvent = activeId === 'avent' || activeId === 'faceid';
  const cards: Card[] = activeId && !estEvent ? getCardsBySet(activeId) : [];

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

  /* Le compte du bandeau suit le filtre : « 19 / 50 » sur une saison,
     « 12 / 45 » sur l'avent. Il annonçait toujours celui des saisons. */
  const ownedCount = activeId === 'avent'
    ? cartesAvent.length
    : activeId === 'faceid'
      ? cartesFaceId.length
      : cards.filter((c) => (ownedCards[c.id] || 0) > 0).length;
  const totalCount = activeId === 'avent'
    ? TOTAL_AVENT
    : activeId === 'faceid'
      ? TOTAL_FACEID
      : cards.length;

  return (
    <div className="page col-page">
      {/* Le bandeau porte l'avancement. C'est ce qu'on vient voir en ouvrant
          la collection : combien il en manque. La mention tenait dans une
          carte posée sous le titre, du même poids que le reste. */}
      <header className="col-entete">
        <div className="col-entete-fond" />
        <div className="col-entete-contenu">
          <div className="col-haut">
            <button className="col-retour" onClick={() => navigate('/profile')} aria-label="Revenir au profil">
              <ArrowLeft size={20} />
            </button>
            <span className="col-kicker">Collection</span>
            <button className="col-info" onClick={() => setShowInfo(true)} aria-label="Taux de drop">
              <Info size={17} />
            </button>
          </div>
          {/* L'onglet intergalactique n'a pas de thème : on retombe sur son
              nom plutôt que d'afficher un titre vide. */}
          <h1 className="col-titre">
            {activeId === 'avent'
              ? 'Branlette Hivernale'
              : viewedSeason?.theme || viewedSeason?.name || 'Collection'}
          </h1>
          <div className="col-mesures">
            <span className="col-compte">
              {ownedCount}<em>/{totalCount}</em>
            </span>
            <span className="col-legende">cartes trouvées</span>
          </div>
        </div>
        <div className="col-barre">
          <div
            className="col-barre-fill"
            style={{ width: `${totalCount ? (ownedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
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
              {/* « terminée » ne vaut que pour une vraie saison passée :
                  l'intergalactique et les deux events ne sont pas des
                  saisons et n'ont rien à terminer. */}
              {s.id !== season?.id
                && s.id !== SET_INTERGALACTIQUE
                && s.id !== 'avent'
                && s.id !== 'faceid'
                && <em> · terminée</em>}
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
      ) : activeId === 'avent' ? (
        <p className="collection-archive-hint">
          Chaque calendrier est tiré à part : les cartes qui te manquent sont
          chez quelqu'un d'autre.
        </p>
      ) : activeId === 'faceid' ? (
        <p className="collection-archive-hint">
          Deux portraits par personne. Elles ne sortent que des boosters de
          l'événement.
        </p>
      ) : viewedSeason && viewedSeason.id !== season?.id && (
        /* Réservé aux vraies saisons passées. Sur un onglet d'event, cette
           phrase s'affichait amputée de son début — le thème est vide — et
           parlait de coffres du pass, qui n'y donnent pas ces cartes. */
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

      {/* Les deux events gardent leur propre rendu : une carte de l'avent se
          retourne et porte son nœud, une carte FaceID a ses crochets de
          visée. Les ramener au format vignette des saisons aurait été les
          abîmer pour l'unique raison de partager une grille. */}
      {activeId === 'avent' && (
        <div className="avt-cartes-grille">
          {cartesAvent.map((c) => (
            <button key={c.slug} className="avt-carte-case" onClick={() => setApercuAvent(c)}>
              <AventCardArt carte={c} />
              {(av.cartes[c.slug] || 0) > 1 && (
                <span className="avt-carte-doublon">×{av.cartes[c.slug]}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeId === 'faceid' && (
        <div className="fid-cartes-grille">
          {cartesFaceId.map((c) => (
            <FaceIdCard key={c.id} carte={c} possedee onClick={() => setApercuFaceId(c)} />
          ))}
        </div>
      )}

      {apercuAvent && (
        <div className="avt-apercu" onClick={() => setApercuAvent(null)}>
          <div className="avt-apercu-carte" onClick={(e) => e.stopPropagation()}>
            <button className="avt-apercu-fermer" onClick={() => setApercuAvent(null)} aria-label="Fermer">
              <X size={18} />
            </button>
            <AventCardArt carte={apercuAvent} retournable />
            {(av.cartes[apercuAvent.slug] || 0) > 1 && (
              <span className="avt-apercu-doublons">×{av.cartes[apercuAvent.slug]} dans ta collection</span>
            )}
          </div>
        </div>
      )}

      {apercuFaceId && (
        <div className="fid-apercu" onClick={() => setApercuFaceId(null)}>
          <div className="fid-apercu-carte" onClick={(e) => e.stopPropagation()}>
            <button className="fid-apercu-fermer" onClick={() => setApercuFaceId(null)} aria-label="Fermer">
              <X size={18} />
            </button>
            <FaceIdCardArt carte={apercuFaceId} />
            {(fid.cartes[apercuFaceId.id] || 0) > 1 && (
              <span className="fid-apercu-doublons">×{fid.cartes[apercuFaceId.id]} dans ton fichier</span>
            )}
          </div>
        </div>
      )}

      {groups.map((group) => {
        const groupCards = group.cards;
        if (groupCards.length === 0) return null;
        const ownedInGroup = groupCards.filter((c) => (ownedCards[c.id] || 0) > 0).length;

        return (
          <section key={group.key} className="section collection-rarity-section">
            {/* Le compte passe à droite, en gris : il dit où on en est, il
                ne fait pas partie du nom de la rareté. */}
            <h3 className="collection-rarity-header" style={{ color: group.color }}>
              <span>{group.label}</span>
              <em>{ownedInGroup}/{groupCards.length}</em>
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
