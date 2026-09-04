import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { QUESTS, BATTLE_PASS_LEVELS, XP_PER_QUEST, getLevelFromXp, getWeekStart } from '../lib/battlepass';
import { RARITY_LABELS, RARITY_COLORS, rollCardFromChest } from '../lib/cards';
import type { UserProgress, CardRarity, Card } from '../types';
import { Swords, Lock, Gift, Check, Package, Star } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

const DEFAULT_PROGRESS: UserProgress = {
  passLevel: 0,
  passXp: 0,
  isPremium: false,
  ownedCardIds: [],
  questProgress: {},
  questsClaimedAt: 0,
  chestsToOpen: [],
};

export default function BattlePass() {
  const { user } = useAuth();
  const { sessions } = useUserSessions();
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [openedCard, setOpenedCard] = useState<Card | null>(null);
  const [chestOpening, setChestOpening] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!user) return;
    const ref = doc(db, 'userProgress', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProgress(snap.data() as UserProgress);
    } else {
      await setDoc(ref, DEFAULT_PROGRESS);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const weekStart = getWeekStart();
  const weekSessions = sessions.filter((s) => s.createdAt >= weekStart && s.completed);

  function getQuestProgress(questId: string): number {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) return 0;

    switch (quest.type) {
      case 'sessions':
        return weekSessions.length;
      case 'reps':
        return weekSessions.reduce(
          (sum, s) => sum + s.exercises.reduce(
            (eSum, ex) => eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0), 0
          ), 0
        );
      case 'duration':
        return weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      case 'exercises':
        return new Set(weekSessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))).size;
      case 'sets':
        return weekSessions.reduce(
          (sum, s) => sum + s.exercises.reduce(
            (eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0
          ), 0
        );
      case 'amrap':
        return weekSessions.filter((s) => s.mode === 'amrap').length;
    }
  }

  function isQuestClaimed(questId: string): boolean {
    return (progress.questProgress[questId] || 0) >= weekStart;
  }

  async function claimQuest(questId: string) {
    if (!user) return;
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) return;
    if (quest.premiumOnly && !progress.isPremium) return;

    const current = getQuestProgress(questId);
    if (current < quest.target) return;
    if (isQuestClaimed(questId)) return;

    const newXp = progress.passXp + XP_PER_QUEST;
    const oldLevel = getLevelFromXp(progress.passXp);
    const newLevelInfo = getLevelFromXp(newXp);

    const newChests: CardRarity[] = [...progress.chestsToOpen];
    for (let lvl = oldLevel.level; lvl < newLevelInfo.level; lvl++) {
      const passLevel = BATTLE_PASS_LEVELS[lvl];
      if (passLevel?.freeReward?.type === 'chest') {
        newChests.push(passLevel.freeReward.rarity);
      }
      if (progress.isPremium && passLevel?.premiumReward?.type === 'chest') {
        newChests.push(passLevel.premiumReward.rarity);
      }
    }

    const updated: UserProgress = {
      ...progress,
      passXp: newXp,
      questProgress: { ...progress.questProgress, [questId]: Date.now() },
      chestsToOpen: newChests,
    };

    setProgress(updated);
    await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
  }

  async function openChest() {
    if (progress.chestsToOpen.length === 0 || !user) return;
    setChestOpening(true);

    const chestRarity = progress.chestsToOpen[0];
    const card = rollCardFromChest(chestRarity, progress.ownedCardIds);

    await new Promise((r) => setTimeout(r, 800));

    if (card) {
      const updated: UserProgress = {
        ...progress,
        chestsToOpen: progress.chestsToOpen.slice(1),
        ownedCardIds: [...progress.ownedCardIds, card.id],
      };
      setProgress(updated);
      await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
      setOpenedCard(card);
    } else {
      const updated: UserProgress = {
        ...progress,
        chestsToOpen: progress.chestsToOpen.slice(1),
      };
      setProgress(updated);
      await updateDoc(doc(db, 'userProgress', user.uid), { ...updated });
    }
    setChestOpening(false);
  }

  const levelInfo = getLevelFromXp(progress.passXp);
  const progressPercent = levelInfo.xpForNext > 0 ? (levelInfo.currentLevelXp / levelInfo.xpForNext) * 100 : 100;

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Battle Pass</h1>
      </header>

      <div className="bp-level-card">
        <div className="bp-level-top">
          <span className="bp-level-badge">Niv. {levelInfo.level}</span>
          {progress.isPremium && <span className="bp-premium-badge"><Star size={12} /> Premium</span>}
        </div>
        <div className="bp-xp-bar">
          <div className="bp-xp-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="bp-xp-text">
          {levelInfo.currentLevelXp} / {levelInfo.xpForNext} XP
        </span>
      </div>

      {progress.chestsToOpen.length > 0 && (
        <section className="section bp-chests-section">
          <h3><Package size={18} /> Coffres à ouvrir ({progress.chestsToOpen.length})</h3>
          <div className="bp-chest-list">
            {progress.chestsToOpen.map((rarity, i) => (
              <button
                key={i}
                className="bp-chest"
                style={{ borderColor: RARITY_COLORS[rarity] }}
                onClick={i === 0 ? openChest : undefined}
                disabled={i !== 0 || chestOpening}
              >
                <Package size={24} style={{ color: RARITY_COLORS[rarity] }} />
                <span style={{ color: RARITY_COLORS[rarity] }}>{RARITY_LABELS[rarity]}</span>
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
              <h3 className="card-reveal-name">{openedCard.name}</h3>
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
          {QUESTS.map((quest) => {
            const current = getQuestProgress(quest.id);
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

      <section className="section">
        <h3>Récompenses</h3>
        <div className="bp-track">
          {BATTLE_PASS_LEVELS.map((lvl) => {
            const reached = levelInfo.level >= lvl.level;
            return (
              <div key={lvl.level} className={`bp-track-item ${reached ? 'reached' : ''}`}>
                <span className="bp-track-level">{lvl.level}</span>
                <div className="bp-track-rewards">
                  {lvl.freeReward && (
                    <div className="bp-track-reward free" style={{ borderColor: lvl.freeReward.type === 'chest' ? RARITY_COLORS[lvl.freeReward.rarity] : undefined }}>
                      <Package size={14} style={{ color: lvl.freeReward.type === 'chest' ? RARITY_COLORS[lvl.freeReward.rarity] : undefined }} />
                    </div>
                  )}
                  {lvl.premiumReward && (
                    <div className="bp-track-reward premium" style={{ borderColor: lvl.premiumReward.type === 'chest' ? RARITY_COLORS[lvl.premiumReward.rarity] : undefined }}>
                      <Star size={10} />
                      <Package size={14} style={{ color: lvl.premiumReward.type === 'chest' ? RARITY_COLORS[lvl.premiumReward.rarity] : undefined }} />
                    </div>
                  )}
                  {!lvl.freeReward && !lvl.premiumReward && <span className="bp-track-empty">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
