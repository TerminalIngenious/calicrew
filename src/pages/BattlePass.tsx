import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCurrentSeason, getSeasonTimeLeft, getLevelFromXp, getWeekStart, getDayStart, getDailyQuest, getPermanentQuests, generateQuestPool, generateWeeklyQuests, SPORT_LABELS } from '../lib/passes';
import { RARITY_LABELS, RARITY_COLORS, rollCard, getCardsBySet, getCardDisplayName } from '../lib/cards';
import { totalReps, exerciseReps, exerciseSeconds } from '../lib/stats';
import type { UserProgress, Card, Quest, SportType, WeeklyQuestSelection } from '../types';
import { Swords, Check, Package, Clock, Trophy, Flame, Dumbbell, PersonStanding, Timer } from 'lucide-react';
import BottomNav from '../components/BottomNav';
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
  const [chestPhase, setChestPhase] = useState<'idle' | 'shake' | 'burst' | 'reveal'>('idle');
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
  const canSelect = isMonday && needsSelection;
  const selectionStep = !selection || selection.weekStart !== weekStart
    ? (selectedSports.length === 0 || questPool.length === 0 ? 'sports' : 'quests')
    : selection.locked ? 'done' : 'quests';

  const permanentQuests = useMemo(() => getPermanentQuests(), []);

  const prevWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
  const prevWeekSessions = useMemo(
    () => sessions.filter((s) => s.createdAt >= prevWeekStart && s.createdAt < weekStart && s.completed),
    [sessions, prevWeekStart, weekStart]
  );
  const legacyQuests = useMemo(() => generateWeeklyQuests(prevWeekSessions), [prevWeekSessions]);

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
    const ref = doc(db, 'userProgress', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProgress(snap.data() as UserProgress);
    } else {
      const init = { ...DEFAULT_PROGRESS, currentSeasonId: season?.id || '' };
      await setDoc(ref, init);
      setProgress(init);
    }
    setLoading(false);
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
    switch (quest.type) {
      case 'sessions':
        return scope.length;
      case 'reps':
        return totalReps(scope);
      case 'duration':
        return scope.reduce((sum, s) => sum + (s.duration || 0), 0);
      case 'exercises':
        return new Set(scope.flatMap((s) => (s.exercises || []).map((e) => e.exerciseId))).size;
      case 'sets':
        return scope.reduce(
          (sum, s) => sum + (s.exercises || []).reduce(
            (eSum, ex) => eSum + (ex.sets || []).filter((set) => set.completed).length, 0
          ), 0
        );
      case 'amrap':
        return scope.filter((s) => s.mode === 'amrap').length;
      case 'running_sessions':
        return scope.filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running')).length;
      case 'running_duration':
        return scope
          .filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running'))
          .reduce((sum, s) => sum + (s.duration || 0), 0);
      case 'exercise_reps':
        return scope.reduce(
          (sum, s) => sum + (s.exercises || [])
            .filter((ex) => ex.exerciseId === quest.exerciseId)
            .reduce((eSum, ex) => eSum + exerciseReps(ex), 0),
          0
        );
      case 'exercise_duration':
        // Couvre le running (runDuration) et les isométriques comptés en secondes.
        return scope.reduce(
          (sum, s) => sum + (s.exercises || [])
            .filter((ex) => ex.exerciseId === quest.exerciseId)
            .reduce((eSum, ex) => eSum + (ex.runDuration || 0) + exerciseSeconds(ex), 0),
          0
        );
    }
  }

  function isQuestClaimed(questId: string): boolean {
    return (progress.questsClaimed[questId] || 0) >= weekStart;
  }

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
    setChestOpening(true);
    setChestPhase('shake');

    const chest = progress.chestsToOpen[0];
    const pool = getCardsBySet(chest.pool === 'current' ? season.id : chest.pool);
    const card = rollCard(pool, progress.ownedCards, chest.rarity === 'commune' ? undefined : chest.rarity);

    await new Promise((r) => setTimeout(r, 1200));
    setChestPhase('burst');
    await new Promise((r) => setTimeout(r, 600));

    const newChests = progress.chestsToOpen.slice(1);
    if (card) {
      const newOwned = { ...progress.ownedCards };
      newOwned[card.id] = (newOwned[card.id] || 0) + 1;
      const updated: UserProgress = { ...progress, chestsToOpen: newChests, ownedCards: newOwned };
      setProgress(updated);
      await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
      setChestPhase('reveal');
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

      <div className="bp-tabs">
        <button className={`bp-tab ${tab === 'quetes' ? 'active' : ''}`} onClick={() => setTab('quetes')}>
          <Swords size={15} />
          <span>Quêtes</span>
          {(hasValidSelection || usingLegacy) && <span className="bp-tab-badge">{totalQuestsDone}/{totalQuestsAvailable}</span>}
        </button>
        <button className={`bp-tab ${tab === 'pass' ? 'active' : ''}`} onClick={() => setTab('pass')}>
          <Trophy size={15} />
          <span>Pass</span>
          <span className="bp-tab-badge">{levelInfo.level}/30</span>
        </button>
      </div>

      {chestOpening && (
        <div className="modal-overlay chest-opening-overlay">
          <div className={`chest-opening-box ${chestPhase}`}>
            <div className="chest-particles">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="chest-particle" style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>
            <div className="chest-icon-wrap">
              <Package size={64} />
            </div>
            {chestPhase === 'shake' && <p className="chest-opening-text">Ouverture...</p>}
          </div>
        </div>
      )}

      {openedCard && (
        <div className="modal-overlay" onClick={() => setOpenedCard(null)}>
          <div className="bp-card-reveal" onClick={(e) => e.stopPropagation()}>
            <div className="bp-card-reveal-glow" style={{ background: RARITY_COLORS[openedCard.rarity] }} />
            {openedCard.image ? (
              <img src={openedCard.image} alt={getCardDisplayName(openedCard)} className="collection-detail-img" />
            ) : (
              <div className="bp-card-reveal-inner" style={{ borderColor: RARITY_COLORS[openedCard.rarity] }}>
                <span className="bp-card-reveal-rarity-tag" style={{ background: RARITY_COLORS[openedCard.rarity] }}>
                  {RARITY_LABELS[openedCard.rarity]}
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
                  const chestColor = chest.rarity === 'epique' ? RARITY_COLORS.epique
                    : chest.rarity === 'rare' ? RARITY_COLORS.rare
                    : 'var(--accent)';
                  const chestLabel = chest.rarity === 'epique' ? 'Épique'
                    : chest.rarity === 'rare' ? 'Rare'
                    : 'Ouvrir';
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

          <div className="bp-section-title-row">
            <h3 className="bp-section-title">
              <Swords size={16} /> Quêtes de la semaine
            </h3>
            <span className="bp-quest-timer"><Clock size={13} /> {getQuestTimeLeft()}</span>
          </div>
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

            const lvlChestColor = lvl.freeChest === 'epique' ? RARITY_COLORS.epique
              : lvl.freeChest === 'rare' ? RARITY_COLORS.rare
              : undefined;
            const lvlChestLabel = lvl.freeChest === 'epique' ? 'Coffre Épique'
              : lvl.freeChest === 'rare' ? 'Coffre Rare'
              : 'Coffre';

            return (
              <div key={lvl.level} className={`bp-track-row ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}>
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
