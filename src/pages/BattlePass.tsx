import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCurrentSeason, getSeasonTimeLeft, getLevelFromXp, XP_PER_QUEST, getWeekStart } from '../lib/passes';
import { RARITY_LABELS, RARITY_COLORS, rollCard, getCardsBySet, getBaseCards, getCardDisplayName } from '../lib/cards';
import type { UserProgress, Card } from '../types';
import { Swords, Lock, Gift, Check, Package, Star, Clock } from 'lucide-react';
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
  const [tab, setTab] = useState<'quetes' | 'pass'>('quetes');

  const season = getCurrentSeason();

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

  const weekStart = getWeekStart();
  const weekSessions = sessions.filter((s) => s.createdAt >= weekStart && s.completed);

  function getQuestValue(questId: string): number {
    const quest = season?.quests.find((q) => q.id === questId);
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
    }
  }

  function isQuestClaimed(questId: string): boolean {
    return (progress.questsClaimed[questId] || 0) >= weekStart;
  }

  async function claimQuest(questId: string) {
    if (!user || !season) return;
    const quest = season.quests.find((q) => q.id === questId);
    if (!quest) return;
    if (quest.premiumOnly && !progress.isPremium) return;
    if (getQuestValue(questId) < quest.target) return;
    if (isQuestClaimed(questId)) return;

    const newXp = progress.passXp + XP_PER_QUEST;
    const oldLevel = getLevelFromXp(progress.passXp, season.passLevels);
    const newLevelInfo = getLevelFromXp(newXp, season.passLevels);

    const newChests = [...progress.chestsToOpen];
    for (let lvl = oldLevel.level; lvl < newLevelInfo.level; lvl++) {
      const passLevel = season.passLevels[lvl];
      if (passLevel?.freeChest) {
        newChests.push({ rarity: passLevel.freeChest, pool: 'current' });
      }
      if (progress.isPremium && passLevel?.premiumChest) {
        newChests.push({ rarity: passLevel.premiumChest, pool: 'current' });
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

    const chest = progress.chestsToOpen[0];
    const pool = chest.pool === 'current'
      ? [...getBaseCards(), ...getCardsBySet(season.id)]
      : getBaseCards();

    const card = rollCard(pool, progress.ownedCards, progress.isPremium);

    await new Promise((r) => setTimeout(r, 800));

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

  const timeLeft = getSeasonTimeLeft(season);
  const levelInfo = getLevelFromXp(progress.passXp, season.passLevels);
  const progressPct = levelInfo.xpForNext > 0 ? (levelInfo.currentLevelXp / levelInfo.xpForNext) * 100 : 100;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Battle Pass</h1>
      </header>

      <div className="bp-season-banner">
        <div className="bp-season-top">
          <div>
            <h2>{season.name}</h2>
            <span className="bp-season-theme">{season.theme}</span>
          </div>
          <div className="bp-timer">
            <Clock size={14} />
            <span>{timeLeft.days}j {timeLeft.hours}h</span>
          </div>
        </div>
        {progress.isPremium && <span className="bp-premium-badge"><Star size={12} /> Premium</span>}
      </div>

      <div className="bp-tabs">
        <button className={`bp-tab ${tab === 'quetes' ? 'active' : ''}`} onClick={() => setTab('quetes')}>
          <Swords size={16} /> Quêtes
        </button>
        <button className={`bp-tab ${tab === 'pass' ? 'active' : ''}`} onClick={() => setTab('pass')}>
          <Gift size={16} /> Pass
        </button>
      </div>

      {tab === 'quetes' && (
        <>
          {progress.chestsToOpen.length > 0 && (
            <section className="section bp-chests-section">
              <h3><Package size={18} /> Coffres à ouvrir ({progress.chestsToOpen.length})</h3>
              <div className="bp-chest-list">
                {progress.chestsToOpen.map((chest, i) => (
                  <button
                    key={i}
                    className="bp-chest"
                    style={{ borderColor: RARITY_COLORS[chest.rarity] }}
                    onClick={i === 0 ? openChest : undefined}
                    disabled={i !== 0 || chestOpening}
                  >
                    <Package size={24} style={{ color: RARITY_COLORS[chest.rarity] }} />
                    <span style={{ color: RARITY_COLORS[chest.rarity] }}>{RARITY_LABELS[chest.rarity]}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {openedCard && (
            <div className="modal-overlay" onClick={() => setOpenedCard(null)}>
              <div className="card-reveal" onClick={(e) => e.stopPropagation()}>
                <div className="card-reveal-inner" style={{ borderColor: RARITY_COLORS[openedCard.rarity] }}>
                  <span className="card-reveal-emoji">{openedCard.emoji}</span>
                  <h3 className="card-reveal-name">{getCardDisplayName(openedCard)}</h3>
                  <span className="card-reveal-rarity" style={{ color: RARITY_COLORS[openedCard.rarity] }}>
                    {RARITY_LABELS[openedCard.rarity]}
                  </span>
                  <span className="card-reveal-cat">{openedCard.category}</span>
                </div>
                <button className="primary-btn" onClick={() => setOpenedCard(null)} style={{ marginTop: '1rem' }}>
                  Fermer
                </button>
              </div>
            </div>
          )}

          <section className="section">
            <h3><Swords size={18} /> Quêtes de la semaine</h3>
            <div className="quest-list">
              {season.quests.map((quest) => {
                const current = getQuestValue(quest.id);
                const done = current >= quest.target;
                const claimed = isQuestClaimed(quest.id);
                const locked = quest.premiumOnly && !progress.isPremium;
                const pct = Math.min(100, (current / quest.target) * 100);

                return (
                  <div key={quest.id} className={`quest-item ${claimed ? 'claimed' : ''} ${locked ? 'locked' : ''}`}>
                    <div className="quest-info">
                      <div className="quest-header">
                        <span className="quest-label">{quest.label}</span>
                        {quest.premiumOnly && <Star size={12} className="quest-premium-icon" />}
                      </div>
                      <span className="quest-desc">{quest.description}</span>
                      <div className="quest-bar">
                        <div className="quest-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="quest-progress-text">
                        {quest.type === 'duration'
                          ? `${Math.floor(current / 60)} / ${Math.floor(quest.target / 60)} min`
                          : `${current} / ${quest.target}`}
                      </span>
                    </div>
                    <div className="quest-action">
                      {locked ? (
                        <Lock size={16} />
                      ) : claimed ? (
                        <Check size={16} className="quest-check" />
                      ) : done ? (
                        <button className="quest-claim-btn" onClick={() => claimQuest(quest.id)}>
                          <Gift size={14} /> +{XP_PER_QUEST}
                        </button>
                      ) : (
                        <span className="quest-xp">+{XP_PER_QUEST}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {tab === 'pass' && (
        <>
          <div className="bp-level-card">
            <div className="bp-level-top">
              <span className="bp-level-badge">Niveau {levelInfo.level}</span>
              <span className="bp-xp-text">{levelInfo.currentLevelXp} / {levelInfo.xpForNext} XP</span>
            </div>
            <div className="bp-xp-bar">
              <div className="bp-xp-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <section className="section">
            <h3>Récompenses</h3>
            <div className="bp-track">
              {season.passLevels.map((lvl) => {
                const reached = levelInfo.level >= lvl.level;
                return (
                  <div key={lvl.level} className={`bp-track-item ${reached ? 'reached' : ''}`}>
                    <span className="bp-track-level">{lvl.level}</span>
                    <div className="bp-track-rewards">
                      {lvl.freeChest && (
                        <div className="bp-track-reward free" style={{ borderColor: RARITY_COLORS[lvl.freeChest] }}>
                          <Package size={14} style={{ color: RARITY_COLORS[lvl.freeChest] }} />
                          <span className="bp-track-reward-label">{RARITY_LABELS[lvl.freeChest]}</span>
                        </div>
                      )}
                      {lvl.premiumChest && (
                        <div className="bp-track-reward premium" style={{ borderColor: RARITY_COLORS[lvl.premiumChest] }}>
                          <Star size={10} />
                          <Package size={14} style={{ color: RARITY_COLORS[lvl.premiumChest] }} />
                        </div>
                      )}
                      {!lvl.freeChest && !lvl.premiumChest && <span className="bp-track-empty">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
}
