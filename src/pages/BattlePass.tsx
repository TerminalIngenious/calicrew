import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCurrentSeason, getSeasonTimeLeft, getLevelFromXp, getWeekStart, generateWeeklyQuests } from '../lib/passes';
import { RARITY_LABELS, RARITY_COLORS, rollCard, getCardsBySet, getCardDisplayName } from '../lib/cards';
import type { UserProgress, Card } from '../types';
import { Swords, Check, Package, Clock, Trophy, Flame } from 'lucide-react';
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

export default function BattlePass() {
  const { user } = useAuth();
  const { sessions } = useUserSessions();
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [openedCard, setOpenedCard] = useState<Card | null>(null);
  const [chestOpening, setChestOpening] = useState(false);
  const [chestPhase, setChestPhase] = useState<'idle' | 'shake' | 'burst' | 'reveal'>('idle');
  const [tab, setTab] = useState<'quetes' | 'pass'>('quetes');

  const season = getCurrentSeason();

  const weekStart = getWeekStart();
  const prevWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
  const prevWeekSessions = useMemo(
    () => sessions.filter((s) => s.createdAt >= prevWeekStart && s.createdAt < weekStart && s.completed),
    [sessions, prevWeekStart, weekStart]
  );
  const weeklyQuests = useMemo(() => generateWeeklyQuests(prevWeekSessions), [prevWeekSessions]);
  const weekSessions = useMemo(
    () => sessions.filter((s) => s.createdAt >= weekStart && s.completed),
    [sessions, weekStart]
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

  function getQuestValue(questId: string): number {
    const quest = weeklyQuests.find((q) => q.id === questId);
    if (!quest) return 0;
    switch (quest.type) {
      case 'sessions':
        return weekSessions.length;
      case 'reps':
        return weekSessions.reduce(
          (sum, s) => sum + (s.exercises || []).reduce(
            (eSum, ex) => eSum + (ex.sets || []).reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0), 0
          ), 0
        );
      case 'duration':
        return weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      case 'exercises':
        return new Set(weekSessions.flatMap((s) => (s.exercises || []).map((e) => e.exerciseId))).size;
      case 'sets':
        return weekSessions.reduce(
          (sum, s) => sum + (s.exercises || []).reduce(
            (eSum, ex) => eSum + (ex.sets || []).filter((set) => set.completed).length, 0
          ), 0
        );
      case 'amrap':
        return weekSessions.filter((s) => s.mode === 'amrap').length;
      case 'running_sessions':
        return weekSessions.filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running')).length;
      case 'running_duration':
        return weekSessions
          .filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running'))
          .reduce((sum, s) => sum + (s.duration || 0), 0);
      case 'exercise_reps': {
        const normalBest = Math.max(0, ...weekSessions.filter((s) => s.mode !== 'amrap').map(
          (s) => (s.exercises || [])
            .filter((ex) => ex.exerciseId === quest.exerciseId)
            .reduce((eSum, ex) => eSum + (ex.sets || []).reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0), 0)
        ));
        const amrapBest = Math.max(0, ...weekSessions.filter((s) => s.mode === 'amrap').map(
          (s) => {
            const rounds = s.amrapRounds || 0;
            const match = (s.exercises || []).find((ex) => ex.exerciseId === quest.exerciseId);
            return match ? rounds * match.targetReps : 0;
          }
        ));
        return Math.max(normalBest, amrapBest);
      }
      case 'exercise_duration':
        return Math.max(0, ...weekSessions.filter((s) => s.mode !== 'amrap').map(
          (s) => (s.exercises || [])
            .filter((ex) => ex.exerciseId === quest.exerciseId)
            .reduce((eSum, ex) => eSum + (ex.runDuration || 0), 0)
        ));
    }
  }

  function isQuestClaimed(questId: string): boolean {
    return (progress.questsClaimed[questId] || 0) >= weekStart;
  }

  async function claimQuest(questId: string) {
    if (!user || !season) return;
    const quest = weeklyQuests.find((q) => q.id === questId);
    if (!quest) return;
    if (getQuestValue(questId) < quest.target) return;
    if (isQuestClaimed(questId)) return;

    const newXp = progress.passXp + quest.xp;
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
    const weekStart = getWeekStart();
    const nextReset = weekStart + 7 * 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, nextReset - Date.now());
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  }

  const timeLeft = getSeasonTimeLeft(season);
  const levelInfo = getLevelFromXp(progress.passXp, season.passLevels);
  const progressPct = levelInfo.xpForNext > 0 ? (levelInfo.currentLevelXp / levelInfo.xpForNext) * 100 : 100;
  const totalQuestsDone = weeklyQuests.filter((q) => isQuestClaimed(q.id)).length;
  const totalQuestsAvailable = weeklyQuests.length;

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
          <span className="bp-tab-badge">{totalQuestsDone}/{totalQuestsAvailable}</span>
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

      {tab === 'quetes' && (
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
            {weeklyQuests.map((quest) => {
              const current = getQuestValue(quest.id);
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
