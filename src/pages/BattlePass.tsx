import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCurrentSeason, getSeasonTimeLeft, getLevelFromXp, getWeekStart, getDayStart, getDailyQuest, getPermanentQuests, generateQuestPool, questsParDefaut, SPORT_LABELS, needsSeasonReset, startNewSeason, getPreviousSeason, getArchiveQuest } from '../lib/passes';
import { getCardArt } from '../lib/cardsS2Art';
import CardFront from '../components/cardArt/CardFront';
import { getRarityLabel, RARITY_COLORS, rollCard, getCardsBySet, getCardDisplayName, getMissingCards, isSetComplete } from '../lib/cards';
import { questValue } from '../lib/quests';
import FaceIdButton from '../components/FaceIdButton';
import { primeAudio, playCardExplosion } from '../lib/sound';
import type { UserProgress, Card, Quest, SportType, WeeklyQuestSelection, CardRarity } from '../types';
import { Swords, Check, Package, Clock, Trophy, Flame, Dumbbell, PersonStanding, Timer, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SeasonalBadge from '../components/SeasonalBadge';
import Loader from '../components/Loader';

const DEFAULT_PROGRESS: UserProgress = {
  passXp: 0,
  isPremium: false,
  ownedCards: {},
  questsClaimed: {},
  chestsToOpen: [],
  achievementsClaimed: [],
  currentSeasonId: '',
};

const SPORT_ICONS: Record<SportType, typeof Dumbbell> = {
  calisthenics: PersonStanding,
  musculation: Dumbbell,
  running: Timer,
};

export default function BattlePass() {
  const { user } = useAuth();
  const { sessions } = useUserSessions();
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [openedCard, setOpenedCard] = useState<Card | null>(null);
  const [chestOpening, setChestOpening] = useState(false);
  const [chestPhase, setChestPhase] = useState<'idle' | 'spin' | 'burst'>('idle');
  /** Rareté de la carte tirée : colore la rotation avant même la révélation. */
  const [spinRarity, setSpinRarity] = useState<CardRarity>('commune');
  const [tab, setTab] = useState<'quetes' | 'pass'>('quetes');

  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);
  const [questPool, setQuestPool] = useState<Quest[]>([]);
  const [pickedQuestIds, setPickedQuestIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const season = getCurrentSeason();
  const weekStart = getWeekStart();
  const dayStart = getDayStart();
  const dailyQuest = useMemo(() => getDailyQuest(), []);

  const selection = progress.weeklyQuestSelection;
  const isMonday = Date.now() - weekStart < 24 * 60 * 60 * 1000;
  const hasValidSelection = selection?.weekStart === weekStart && selection.locked;
  const needsSelection = !hasValidSelection;
  /*
   * Le choix des quêtes n'était possible que le lundi.
   *
   * Qui le ratait restait sur des quêtes de secours toute la semaine, sans
   * aucun moyen de revenir dessus — et c'est arrivé à plusieurs. On peut
   * maintenant choisir n'importe quel jour. Le lundi, l'écran s'ouvre tout
   * seul, parce que c'est le rendez-vous ; les autres jours il faut le
   * demander, pour ne pas barrer la route de quelqu'un qui vient simplement
   * voir où il en est.
   */
  const [veutChoisir, setVeutChoisir] = useState(false);
  const canSelect = needsSelection && (isMonday || veutChoisir);
  const selectionStep = !selection || selection.weekStart !== weekStart
    ? (selectedSports.length === 0 || questPool.length === 0 ? 'sports' : 'quests')
    : selection.locked ? 'done' : 'quests';

  const permanentQuests = useMemo(() => getPermanentQuests(), []);

  // Les quêtes imposées à qui n'a pas fait son choix : mêmes que celles du
  // sélecteur, en même quantité, simplement non choisies.
  const legacyQuests = useMemo(() => questsParDefaut(), []);

  const activeQuests = useMemo(() => {
    if (hasValidSelection) {
      return [...permanentQuests, ...selection!.chosenQuests];
    }
    return legacyQuests;
  }, [hasValidSelection, selection, permanentQuests, legacyQuests]);

  const usingLegacy = !hasValidSelection && !canSelect;

  const weekSessions = useMemo(
    () => sessions.filter((s) => s.createdAt >= weekStart && s.completed),
    [sessions, weekStart]
  );

  const daySessions = useMemo(
    () => sessions.filter((s) => s.createdAt >= dayStart && s.completed),
    [sessions, dayStart]
  );

  const loadProgress = useCallback(async () => {
    if (!user) return;
    // Lecture serveur assumée, pas de cache : cette page décide s'il faut
    // repartir pour une nouvelle saison et l'écrit dans la foulée. Agir sur
    // une version périmée remettrait le pass à zéro à tort.
    //
    // Le `finally` est ce qui manquait : sans lui, la moindre erreur laissait
    // l'écran de chargement tourner sans fin.
    try {
      const ref = doc(db, 'userProgress', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        /*
         * Les valeurs par défaut d'abord, le document par-dessus.
         *
         * Un document de progression n'est pas toujours né ici : la créatine,
         * les records, l'event et le cron d'ambiance l'écrivent en `merge` et
         * peuvent donc le créer avec un seul champ. Pris tel quel, il arrivait
         * dans cette page sans `questsClaimed` ni `chestsToOpen`, et le rendu
         * s'arrêtait net sur un écran blanc — la page ne s'ouvrait plus du
         * tout pour la personne concernée.
         */
        const stored = { ...DEFAULT_PROGRESS, ...(snap.data() as Partial<UserProgress>) };
        // Nouvelle saison : le pass repart de zéro, la collection reste.
        if (season && needsSeasonReset(stored, season.id)) {
          const fresh = startNewSeason(stored, season.id);
          await updateDoc(ref, {
            passXp: fresh.passXp,
            currentSeasonId: fresh.currentSeasonId,
            chestsToOpen: fresh.chestsToOpen,
          });
          setProgress(fresh);
        } else {
          setProgress(stored);
        }
      } else {
        const init = { ...DEFAULT_PROGRESS, currentSeasonId: season?.id || '' };
        await setDoc(ref, init);
        setProgress(init);
      }
    } catch (err) {
      console.error('Pass indisponible :', err);
    } finally {
      setLoading(false);
    }
  }, [user, season]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  function toggleSport(sport: SportType) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  function confirmSports() {
    if (selectedSports.length === 0) return;
    const pool = generateQuestPool(selectedSports);
    setQuestPool(pool);
    setPickedQuestIds(new Set());
  }

  function toggleQuest(id: string) {
    setPickedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 10) {
        next.add(id);
      }
      return next;
    });
  }

  async function lockQuests() {
    if (!user || pickedQuestIds.size !== 10) return;
    setSaving(true);
    const chosenQuests = questPool.filter((q) => pickedQuestIds.has(q.id));
    const sel: WeeklyQuestSelection = {
      weekStart,
      sports: selectedSports,
      chosenQuests,
      locked: true,
    };
    const updated: UserProgress = { ...progress, weeklyQuestSelection: sel };
    setProgress(updated);
    await updateDoc(doc(db, 'userProgress', user.uid), { weeklyQuestSelection: sel });
    setSaving(false);
    setConfirmModal(false);
  }

  function getQuestValue(quest: Quest, scope = weekSessions): number {
    return questValue(quest, scope);
  }

  function isQuestClaimed(questId: string): boolean {
    return (progress.questsClaimed[questId] || 0) >= weekStart;
  }

  // Quête d'archive : hors pass, visible tant qu'il manque des cartes à la
  // collection de la saison précédente.
  const previousSeason = season ? getPreviousSeason(season.id) : undefined;
  const archiveMissing = previousSeason
    ? getMissingCards(previousSeason.id, progress.ownedCards).length
    : 0;
  const archiveQuest =
    previousSeason && !isSetComplete(previousSeason.id, progress.ownedCards)
      ? getArchiveQuest(previousSeason)
      : null;

  const dailyValue = getQuestValue(dailyQuest, daySessions);
  const dailyDone = dailyValue >= dailyQuest.target;
  const dailyClaimed = (progress.questsClaimed[dailyQuest.id] || 0) >= dayStart;

  async function grantXp(questId: string, xp: number) {
    if (!user || !season) return;
    const newXp = progress.passXp + xp;
    const oldLevel = getLevelFromXp(progress.passXp, season.passLevels);
    const newLevelInfo = getLevelFromXp(newXp, season.passLevels);

    const newChests = [...progress.chestsToOpen];
    for (let lvl = oldLevel.level; lvl < newLevelInfo.level; lvl++) {
      const passLevel = season.passLevels[lvl];
      if (passLevel?.freeChest) {
        newChests.push({ rarity: passLevel.freeChest, pool: 'current' });
      }
    }

    const updated: UserProgress = {
      ...progress,
      passXp: newXp,
      questsClaimed: { ...progress.questsClaimed, [questId]: Date.now() },
      chestsToOpen: newChests,
      currentSeasonId: season.id,
    };

    setProgress(updated);
    await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
  }

  /**
   * La quête d'archive ne passe pas par grantXp : elle ne donne aucun XP de
   * pass, seulement un coffre épinglé sur la saison précédente.
   */
  async function claimArchiveQuest() {
    if (!user || !archiveQuest || !previousSeason) return;
    const updated: UserProgress = {
      ...progress,
      // Faux positif de react-hooks/purity : claimArchiveQuest n'est appelée
      // que depuis un onClick, jamais pendant le rendu.
      // eslint-disable-next-line react-hooks/purity
      questsClaimed: { ...progress.questsClaimed, [archiveQuest.id]: Date.now() },
      chestsToOpen: [...progress.chestsToOpen, { rarity: 'commune' as const, pool: previousSeason.id }],
    };
    setProgress(updated);
    await updateDoc(doc(db, 'userProgress', user.uid), {
      questsClaimed: updated.questsClaimed,
      chestsToOpen: updated.chestsToOpen,
    });
  }

  async function claimDailyQuest() {
    if (!dailyDone || dailyClaimed) return;
    await grantXp(dailyQuest.id, dailyQuest.xp);
  }

  async function claimQuest(questId: string) {
    if (!user || !season) return;
    const quest = activeQuests.find((q) => q.id === questId);
    if (!quest) return;
    if (getQuestValue(quest) < quest.target) return;
    if (isQuestClaimed(questId)) return;
    await grantXp(questId, quest.xp);
  }

  async function openChest() {
    if (progress.chestsToOpen.length === 0 || !user || !season) return;
    const chest = progress.chestsToOpen[0];
    // Un coffre épinglé sur une saison retirée du code donnerait un set vide :
    // on retombe alors sur la saison en cours plutôt que de ne rien tirer.
    const pinned = chest.pool === 'current' ? season.id : chest.pool;
    const pool = getCardsBySet(pinned).length > 0 ? getCardsBySet(pinned) : getCardsBySet(season.id);
    // Un coffre d'archive n'a d'intérêt que s'il complète : il évite les
    // doublons tant qu'il reste des cartes à trouver dans ce set.
    const isArchive = chest.pool !== 'current' && chest.pool !== season.id;
    const card = rollCard(
      pool,
      progress.ownedCards,
      chest.rarity === 'commune' ? undefined : chest.rarity,
      isArchive
    );

    // La carte est tirée avant l'animation : sa rareté peut dépasser celle
    // garantie par le coffre, et c'est bien elle qui doit colorer la rotation.
    const rarity = card?.rarity ?? chest.rarity;
    setSpinRarity(rarity);
    // Débloque l'audio pendant le geste utilisateur : le son ne part qu'après
    // la rotation, trop tard pour que les navigateurs l'autorisent encore.
    primeAudio();
    setChestOpening(true);
    setChestPhase('spin');

    await new Promise((r) => setTimeout(r, 1700));
    setChestPhase('burst');
    playCardExplosion(rarity);
    await new Promise((r) => setTimeout(r, 620));

    const newChests = progress.chestsToOpen.slice(1);
    if (card) {
      const newOwned = { ...progress.ownedCards };
      newOwned[card.id] = (newOwned[card.id] || 0) + 1;
      const updated: UserProgress = { ...progress, chestsToOpen: newChests, ownedCards: newOwned };
      setProgress(updated);
      await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
      setOpenedCard(card);
    } else {
      const updated: UserProgress = { ...progress, chestsToOpen: newChests };
      setProgress(updated);
      await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
    }
    setChestOpening(false);
    setChestPhase('idle');
  }

  if (loading) return <div className="page loading"><Loader /></div>;

  if (!season) {
    return (
      <div className="page">
        <header className="page-header"><h1>Battle Pass</h1></header>
        <div className="coming-soon">
          <Swords size={56} />
          <h2>Aucune saison en cours</h2>
          <p>La prochaine saison arrive bientôt...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  function getQuestTimeLeft(): string {
    const nextReset = weekStart + 7 * 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, nextReset - Date.now());
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  }

  function getDailyTimeLeft(): string {
    const nextReset = dayStart + 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, nextReset - Date.now());
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h${String(mins).padStart(2, '0')}`;
    return `${mins} min`;
  }

  const timeLeft = getSeasonTimeLeft(season);
  const levelInfo = getLevelFromXp(progress.passXp, season.passLevels);
  const progressPct = levelInfo.xpForNext > 0 ? (levelInfo.currentLevelXp / levelInfo.xpForNext) * 100 : 100;
  const totalQuestsDone = activeQuests.filter((q) => isQuestClaimed(q.id)).length;
  const totalQuestsAvailable = activeQuests.length;

  return (
    <div className="page bp-page">
      <div className="bp-hero">
        <div className="bp-hero-bg" />
        <div className="bp-hero-content">
          <div className="bp-hero-left">
            <span className="bp-hero-season">{season.name}</span>
            <h1 className="bp-hero-title">{season.theme}</h1>
            <SeasonalBadge />
          </div>
          <div className="bp-hero-timer">
            <Clock size={14} />
            <div>
              <span className="bp-hero-days">{timeLeft.days}</span>
              <span className="bp-hero-days-label">jours</span>
            </div>
          </div>
        </div>
        <div className="bp-hero-xp">
          <div className="bp-hero-xp-top">
            <span className="bp-hero-level">
              <Flame size={14} /> Niv. {levelInfo.level}
            </span>
            <span className="bp-hero-xp-text">{levelInfo.currentLevelXp}/{levelInfo.xpForNext} XP</span>
          </div>
          <div className="bp-hero-xp-bar">
            <div className="bp-hero-xp-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* L'event est posé par-dessus le pass, pas dedans : au-dessus des
          onglets, dans une forme qui n'appartient qu'à lui. */}
      <FaceIdButton faceid={progress.faceid} />

      <div className="bp-tabs">
        <button className={`bp-tab ${tab === 'quetes' ? 'active' : ''}`} onClick={() => setTab('quetes')}>
          <Swords size={15} />
          <span>Quêtes</span>
          {(hasValidSelection || usingLegacy) && <span className="bp-tab-badge">{totalQuestsDone}/{totalQuestsAvailable}</span>}
        </button>
        <button className={`bp-tab ${tab === 'pass' ? 'active' : ''}`} onClick={() => setTab('pass')}>
          <Trophy size={15} />
          <span>Pass</span>
          <span className="bp-tab-badge">{levelInfo.level}/{season.passLevels.length}</span>
        </button>
      </div>

      {chestOpening && (
        <div className="modal-overlay chest-opening-overlay">
          <div
            className={`chest-opening-box ${chestPhase}`}
            style={{ '--rarity': RARITY_COLORS[spinRarity] } as React.CSSProperties}
          >
            <div className="chest-halo" />
            <div className="chest-shockwave" />
            <div className="chest-flash" />

            <div className="chest-particles">
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} className="chest-particle" style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>

            <div className="chest-spin-card">
              <div className="chest-spin-face">
                <Package size={46} />
              </div>
            </div>

            {chestPhase === 'spin' && <p className="chest-opening-text">Ouverture...</p>}
          </div>
        </div>
      )}

      {openedCard && (
        <div className="modal-overlay" onClick={() => setOpenedCard(null)}>
          <div className="bp-card-reveal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-card-reveal-glow" style={{ background: RARITY_COLORS[openedCard.rarity] }} />
            {getCardArt(openedCard.id) ? (
              // La carte qu'on vient de tirer se dessine en direct, comme dans
              // la collection : c'est le moment où on la regarde le plus.
              <div className="bp-card-reveal-live">
                <CardFront card={openedCard} art={getCardArt(openedCard.id)!} />
              </div>
            ) : openedCard.image ? (
              <img src={openedCard.image} alt={getCardDisplayName(openedCard)} className="collection-detail-img" />
            ) : (
              <div className="bp-card-reveal-inner" style={{ borderColor: RARITY_COLORS[openedCard.rarity] }}>
                <span className="bp-card-reveal-rarity-tag" style={{ background: RARITY_COLORS[openedCard.rarity] }}>
                  {getRarityLabel(openedCard.rarity, openedCard.set)}
                </span>
                <span className="bp-card-reveal-emoji">{openedCard.emoji}</span>
                <h3 className="bp-card-reveal-name">{getCardDisplayName(openedCard)}</h3>
                <span className="bp-card-reveal-cat">{openedCard.category}</span>
              </div>
            )}
            <button className="bp-card-reveal-close" onClick={() => setOpenedCard(null)}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="quest-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer tes quêtes</h3>
            <p>Tu ne pourras plus modifier tes quêtes cette semaine. Continuer ?</p>
            <div className="quest-confirm-actions">
              <button className="quest-confirm-cancel" onClick={() => setConfirmModal(false)}>Annuler</button>
              <button className="quest-confirm-ok" onClick={lockQuests} disabled={saving}>
                {saving ? 'Validation...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'quetes' && canSelect && selectionStep === 'sports' && (
        <div className="quest-selection">
          <div className="quest-selection-header">
            <Swords size={24} />
            <h2>Nouvelle semaine</h2>
            <p>Quels sports tu fais cette semaine ?</p>
          </div>
          <div className="sport-chips">
            {(Object.keys(SPORT_LABELS) as SportType[]).map((sport) => {
              const Icon = SPORT_ICONS[sport];
              const active = selectedSports.includes(sport);
              return (
                <button
                  key={sport}
                  className={`sport-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleSport(sport)}
                >
                  <Icon size={20} />
                  <span>{SPORT_LABELS[sport]}</span>
                </button>
              );
            })}
          </div>
          <button
            className="quest-next-btn"
            disabled={selectedSports.length === 0}
            onClick={confirmSports}
          >
            Voir les quêtes
          </button>
        </div>
      )}

      {tab === 'quetes' && canSelect && selectionStep === 'quests' && (
        <div className="quest-selection">
          <div className="quest-selection-header">
            <h2>Choisis tes quêtes</h2>
            <p>Sélectionne 10 quêtes pour la semaine</p>
            <span className="quest-pick-counter">{pickedQuestIds.size}/10</span>
          </div>

          <div className="quest-perm-section">
            <h4 className="quest-perm-title">Quêtes permanentes</h4>
            {permanentQuests.map((q) => (
              <div key={q.id} className="bp-quest quest-perm">
                <div className="bp-quest-accent" style={{ background: 'var(--accent-green)' }} />
                <div className="bp-quest-body">
                  <div className="bp-quest-top">
                    <span className="bp-quest-label">{q.label}</span>
                    <span className="bp-quest-xp-tag">+{q.xp}</span>
                  </div>
                  <span className="bp-quest-desc">{q.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="quest-pool-section">
            <h4 className="quest-pool-title">Quêtes au choix</h4>
            {questPool.map((q) => {
              const picked = pickedQuestIds.has(q.id);
              return (
                <button
                  key={q.id}
                  className={`bp-quest quest-pickable ${picked ? 'quest-picked' : ''}`}
                  onClick={() => toggleQuest(q.id)}
                >
                  <div className="bp-quest-accent" style={{ background: picked ? 'var(--accent)' : 'var(--bg-card)' }} />
                  <div className="bp-quest-body">
                    <div className="bp-quest-top">
                      <span className="bp-quest-label">{q.label}</span>
                      <span className="bp-quest-xp-tag">+{q.xp}</span>
                    </div>
                    <span className="bp-quest-desc">{q.description}</span>
                  </div>
                  <div className={`quest-check ${picked ? 'checked' : ''}`}>
                    {picked && <Check size={14} />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="quest-pick-footer">
            <button
              className="quest-back-btn"
              onClick={() => { setQuestPool([]); setSelectedSports([]); }}
            >
              Retour
            </button>
            <button
              className="quest-next-btn"
              disabled={pickedQuestIds.size !== 10}
              onClick={() => setConfirmModal(true)}
            >
              Valider ({pickedQuestIds.size}/10)
            </button>
          </div>
        </div>
      )}

      {tab === 'quetes' && (
        <div className="bp-daily">
          <div className="bp-section-title-row">
            <h3 className="bp-section-title">
              <Flame size={16} /> Défi du jour
            </h3>
            <span className="bp-quest-timer"><Clock size={13} /> {getDailyTimeLeft()}</span>
          </div>
          <div className={`bp-quest bp-daily-quest ${dailyClaimed ? 'bp-quest-claimed' : ''} ${dailyDone && !dailyClaimed ? 'bp-quest-ready' : ''}`}>
            <div className="bp-quest-accent" style={{ background: dailyClaimed ? 'var(--accent-green)' : 'var(--accent)' }} />
            <div className="bp-quest-body">
              <div className="bp-quest-top">
                <span className="bp-quest-label">{dailyQuest.label}</span>
                <div className="bp-quest-reward">
                  {dailyClaimed ? (
                    <span className="bp-quest-done-badge"><Check size={12} /></span>
                  ) : dailyDone ? (
                    <button className="bp-quest-claim" onClick={claimDailyQuest}>
                      +{dailyQuest.xp} XP
                    </button>
                  ) : (
                    <span className="bp-quest-xp-tag">+{dailyQuest.xp}</span>
                  )}
                </div>
              </div>
              <span className="bp-quest-desc">{dailyQuest.description}</span>
              <div className="bp-quest-progress">
                <div className="bp-quest-bar">
                  <div
                    className="bp-quest-bar-fill"
                    style={{
                      width: `${Math.min(100, (dailyValue / dailyQuest.target) * 100)}%`,
                      background: dailyClaimed ? 'var(--accent-green)' : 'var(--accent)',
                    }}
                  />
                </div>
                <span className="bp-quest-count">
                  {dailyQuest.type === 'duration'
                    ? `${Math.floor(dailyValue / 60)}/${Math.floor(dailyQuest.target / 60)} min`
                    : `${dailyValue}/${dailyQuest.target}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'quetes' && (hasValidSelection || usingLegacy) && (
        <>
          {progress.chestsToOpen.length > 0 && (
            <div className="bp-chests">
              <h3 className="bp-section-title">
                <Package size={16} /> Coffres ({progress.chestsToOpen.length})
              </h3>
              <div className="bp-chest-row">
                {progress.chestsToOpen.map((chest, i) => {
                  const special = chest.rarity !== 'commune';
                  const chestColor = special ? RARITY_COLORS[chest.rarity] : 'var(--accent)';
                  const chestLabel = special ? getRarityLabel(chest.rarity, season.id) : 'Ouvrir';
                  return (
                    <button
                      key={i}
                      className={`bp-chest ${i === 0 ? 'bp-chest-active' : ''}`}
                      onClick={i === 0 ? openChest : undefined}
                      disabled={i !== 0 || chestOpening}
                    >
                      <div className="bp-chest-glow" style={{ background: chestColor }} />
                      <Package size={22} style={{ color: chestColor }} />
                      <span className="bp-chest-label" style={{ color: chestColor }}>{chestLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {archiveQuest && previousSeason && (() => {
            const current = getQuestValue(archiveQuest);
            const done = current >= archiveQuest.target;
            const claimed = isQuestClaimed(archiveQuest.id);
            const pct = Math.min(100, (current / archiveQuest.target) * 100);

            return (
              <div className="bp-archive">
                <div className="bp-section-title-row">
                  <h3 className="bp-section-title">
                    <Package size={16} /> Collection {previousSeason.name}
                  </h3>
                  <span className="bp-quest-timer">{archiveMissing} manquante{archiveMissing > 1 ? 's' : ''}</span>
                </div>
                <p className="bp-archive-hint">
                  Cette collection ne tombe plus dans les coffres du pass. Une quête
                  bonus par semaine donne un coffre {previousSeason.name}, qui vise
                  en priorité une carte qui te manque.
                </p>
                <div className={`bp-quest ${claimed ? 'bp-quest-claimed' : ''} ${done && !claimed ? 'bp-quest-ready' : ''}`}>
                  <div className="bp-quest-accent" style={{ background: 'var(--accent-green)' }} />
                  <div className="bp-quest-body">
                    <div className="bp-quest-top">
                      <div className="bp-quest-title-row">
                        <span className="bp-quest-label">{archiveQuest.description}</span>
                      </div>
                      <div className="bp-quest-reward">
                        {claimed ? (
                          <span className="bp-quest-done-badge"><Check size={12} /></span>
                        ) : done ? (
                          <button className="bp-quest-claim" onClick={claimArchiveQuest}>
                            Coffre
                          </button>
                        ) : (
                          <span className="bp-quest-xp">Coffre</span>
                        )}
                      </div>
                    </div>
                    <div className="bp-quest-bar">
                      <div className="bp-quest-fill" style={{ width: `${pct}%`, background: 'var(--accent-green)' }} />
                    </div>
                    <span className="bp-quest-progress">{current}/{archiveQuest.target}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bp-section-title-row">
            <h3 className="bp-section-title">
              <Swords size={16} /> Quêtes de la semaine
            </h3>
            <span className="bp-quest-timer"><Clock size={13} /> {getQuestTimeLeft()}</span>
          </div>

          {/* Ce sont les quêtes de secours : celui qui n'a pas fait son choix
              du lundi doit pouvoir le faire, même mercredi. */}
          {usingLegacy && (
            <button className="bp-choisir" onClick={() => setVeutChoisir(true)}>
              <Swords size={15} />
              <div className="bp-choisir-texte">
                <span className="bp-choisir-titre">Tu n'as pas choisi tes quêtes</span>
                <span className="bp-choisir-sous">
                  Voici celles par défaut. Choisis les tiennes, c'est encore possible.
                </span>
              </div>
              <ChevronRight size={16} />
            </button>
          )}
          <div className="bp-quest-list">
            {activeQuests.map((quest) => {
              const current = getQuestValue(quest);
              const done = current >= quest.target;
              const claimed = isQuestClaimed(quest.id);
              const pct = Math.min(100, (current / quest.target) * 100);

              return (
                <div key={quest.id} className={`bp-quest ${claimed ? 'bp-quest-claimed' : ''} ${done && !claimed ? 'bp-quest-ready' : ''}`}>
                  <div className="bp-quest-accent" style={{ background: claimed ? 'var(--accent-green)' : done ? 'var(--accent)' : 'var(--accent)' }} />
                  <div className="bp-quest-body">
                    <div className="bp-quest-top">
                      <div className="bp-quest-title-row">
                        <span className="bp-quest-label">{quest.label}</span>
                      </div>
                      <div className="bp-quest-reward">
                        {claimed ? (
                          <span className="bp-quest-done-badge"><Check size={12} /></span>
                        ) : done ? (
                          <button className="bp-quest-claim" onClick={() => claimQuest(quest.id)}>
                            +{quest.xp} XP
                          </button>
                        ) : (
                          <span className="bp-quest-xp-tag">+{quest.xp}</span>
                        )}
                      </div>
                    </div>
                    <span className="bp-quest-desc">{quest.description}</span>
                    <div className="bp-quest-progress">
                      <div className="bp-quest-bar">
                        <div className="bp-quest-bar-fill" style={{ width: `${pct}%`, background: claimed ? 'var(--accent-green)' : done ? 'var(--accent)' : 'var(--accent)' }} />
                      </div>
                      <span className="bp-quest-count">
                        {quest.type === 'duration' || quest.type === 'running_duration' || quest.type === 'exercise_duration'
                          ? `${Math.floor(current / 60)}/${Math.floor(quest.target / 60)} min`
                          : quest.type === 'running_distance'
                            // Une distance se compte en virgule, pas en entier :
                            // arrondie, 9,8 km se serait affiché « 10/10 km »
                            // sans que la quête soit finie.
                            ? `${current.toFixed(1).replace('.', ',')}/${quest.target} km`
                            : `${current}/${quest.target}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'pass' && (
        <div className="bp-track-table">
          <div className="bp-track-header">
            <div className="bp-track-col-lvl">Niv.</div>
            <div className="bp-track-col-reward">Récompense</div>
          </div>
          {season.passLevels.map((lvl) => {
            const reached = levelInfo.level >= lvl.level;
            const isCurrent = levelInfo.level === lvl.level - 1;

            const special = lvl.freeChest && lvl.freeChest !== 'commune';
            const lvlChestColor = special ? RARITY_COLORS[lvl.freeChest!] : undefined;
            const lvlChestLabel = special
              ? `Coffre ${getRarityLabel(lvl.freeChest!, season.id)}`
              : 'Coffre';

            return (
              <div
                key={lvl.level}
                className={`bp-track-row ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''} ${special ? 'special' : ''}`}
              >
                <div className="bp-track-col-lvl">
                  <span className="bp-track-lvl-num">{reached ? <Check size={12} /> : lvl.level}</span>
                </div>
                <div className="bp-track-col-reward">
                  <div className="bp-track-chest" style={lvlChestColor ? { color: lvlChestColor } : undefined}>
                    <Package size={14} />
                    <span>{lvlChestLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
