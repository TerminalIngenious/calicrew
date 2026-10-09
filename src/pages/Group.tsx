import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet, getCardById, getCardDisplayName, RARITY_COLORS } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import { totalReps as sumReps } from '../lib/stats';
import { makeBadgeId, badgeTitle } from '../lib/badges';
import {
  BID_REFUSAL_MESSAGES, SWAP_REFUSAL_MESSAGES, checkBid, myBid,
  pendingActionCount, sortListings, swapCards, withBid, withoutBid,
} from '../lib/trades';
import RankBadgeIcon from '../components/RankBadgeIcon';
import TradeCardPicker from '../components/TradeCardPicker';
import type { Group as GroupType, LeaderboardEntry, Session, UserProgress, TradeListing, Card, CardRarity, RankBadge, RankCategory } from '../types';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Medal, Search, Clock, Zap, Target, UserPlus, UserCheck, UserX, ChevronDown, Crown, LogOut, X, Dumbbell, ArrowLeftRight, Check, MessageCircle, Package } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SeasonalBadge from '../components/SeasonalBadge';
import GroupChat from '../components/GroupChat';
import Loader from '../components/Loader';

type SortMode = 'reps' | 'variety' | 'time';

interface MonthlyRanking {
  category: RankCategory;
  categoryLabel: string;
  top3: { uid: string; displayName: string; value: string; rank: number; chestRarity: CardRarity }[];
}

function getLastMonthKey(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
}

const RANK_CHEST: CardRarity[] = ['epique', 'epique', 'epique'];

const season = getCurrentSeason();
const cardMap = new Map(
  (season ? getCardsBySet(season.id) : []).map((c) => [c.id, c])
);

function MemberAvatar({ entry }: { entry: LeaderboardEntry }) {
  const card = entry.avatarCardId ? cardMap.get(entry.avatarCardId) : undefined;
  if (card?.image) {
    return (
      <div className="leaderboard-avatar has-image">
        <img src={card.image} alt="" className="profile-avatar-img" />
      </div>
    );
  }
  return (
    <div className="leaderboard-avatar">
      {(entry.displayName || '?')[0].toUpperCase()}
    </div>
  );
}

export default function Group() {
  const { user, displayName: myName } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupType[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('reps');
  const [loading, setLoading] = useState(true);
  const [pendingNames, setPendingNames] = useState<Map<string, string>>(new Map());
  const [selectedMember, setSelectedMember] = useState<LeaderboardEntry | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<Map<string, string[]>>(new Map());
  const [showChat, setShowChat] = useState(false);

  // Monthly rewards
  const [showRewards, setShowRewards] = useState(false);
  const [monthlyRankings, setMonthlyRankings] = useState<MonthlyRanking[]>([]);
  const [myRewards, setMyRewards] = useState<CardRarity[]>([]);
  const [myBadges, setMyBadges] = useState<RankBadge[]>([]);
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [rewardsClaimed, setRewardsClaimed] = useState(false);

  // Échanges par annonce
  const [groupTab, setGroupTab] = useState<'classement' | 'echanges'>('classement');
  const [listings, setListings] = useState<TradeListing[]>([]);
  const [myOwnedCards, setMyOwnedCards] = useState<Record<string, number>>({});
  /** Sélecteur de carte : soit pour publier une annonce, soit pour proposer. */
  const [cardPicker, setCardPicker] = useState<{ mode: 'publish' } | { mode: 'bid'; listing: TradeListing } | null>(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'groups'),
        where('memberIds', 'array-contains', user.uid)
      );
      const snap = await getDocs(q);
      const g = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupType));
      setGroups(g);
      if (g.length > 0) {
        const current = selectedGroup ? g.find((gr) => gr.id === selectedGroup.id) || g[0] : g[0];
        setSelectedGroup(current);
        await loadLeaderboard(current);
        await loadTrades(current);
        await checkMonthlyRewards(current);
        if (current.pendingIds?.length > 0 && current.createdBy === user.uid) {
          await loadPendingNames(current.pendingIds);
        }
      }
    } catch (err) {
      console.error('Erreur chargement groupes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function loadPendingNames(pendingIds: string[]) {
    const usersSnap = await getDocs(collection(db, 'users'));
    const names = new Map<string, string>();
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid && pendingIds.includes(data.uid)) {
        names.set(data.uid, data.displayName || 'Inconnu');
      }
    });
    setPendingNames(names);
  }

  async function loadLeaderboard(group: GroupType) {
    const [usersSnap, ...rest] = await Promise.all([
      getDocs(collection(db, 'users')),
      ...group.memberIds.flatMap((memberId) => [
        getDocs(query(collection(db, 'sessions'), where('userId', '==', memberId))),
        getDoc(doc(db, 'userProgress', memberId)),
      ]),
    ]);

    const userMap = new Map<string, string>();
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid) userMap.set(data.uid, data.displayName || 'Inconnu');
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    const entries: LeaderboardEntry[] = group.memberIds.map((memberId, i) => {
      const sessionSnap = rest[i * 2] as Awaited<ReturnType<typeof getDocs>>;
      const progressSnap = rest[i * 2 + 1] as Awaited<ReturnType<typeof getDoc>>;
      const allSessions = sessionSnap.docs.map((d) => d.data() as Session);
      const sessions = allSessions.filter((s) => s.createdAt >= monthStartMs);
      const progress = progressSnap.exists() ? (progressSnap.data() as UserProgress) : null;

      const totalReps = sumReps(sessions);
      const totalSets = sessions.reduce(
        (sum, s) =>
          sum + s.exercises.reduce((eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0),
        0
      );
      const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const exerciseIds = new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)));

      return {
        uid: memberId,
        displayName: userMap.get(memberId) || 'Inconnu',
        totalReps,
        totalSets,
        sessionsCount: sessions.length,
        totalDuration,
        exerciseVariety: exerciseIds.size,
        avatarCardId: progress?.avatarCardId,
      };
    });

    setLeaderboard(entries);
  }

  async function checkMonthlyRewards(group: GroupType) {
    if (!user) return;
    const progressSnap = await getDoc(doc(db, 'userProgress', user.uid));
    const progress = progressSnap.exists() ? (progressSnap.data() as UserProgress) : null;

    const lastMonthKey = getLastMonthKey();
    if (progress?.monthlyRewardsClaimed === lastMonthKey) return;
    if (lastMonthKey.endsWith('-08')) {
      if (progress) {
        await updateDoc(doc(db, 'userProgress', user.uid), { monthlyRewardsClaimed: lastMonthKey });
      }
      return;
    }

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();

    const [usersSnap, ...rest] = await Promise.all([
      getDocs(collection(db, 'users')),
      ...group.memberIds.flatMap((memberId) => [
        getDocs(query(collection(db, 'sessions'), where('userId', '==', memberId))),
      ]),
    ]);

    const userMap = new Map<string, string>();
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid) userMap.set(data.uid, data.displayName || 'Inconnu');
    });

    const entries: { uid: string; displayName: string; totalReps: number; exerciseVariety: number; totalDuration: number }[] =
      group.memberIds.map((memberId, i) => {
        const sessionSnap = rest[i] as Awaited<ReturnType<typeof getDocs>>;
        const sessions = sessionSnap.docs
          .map((d) => d.data() as Session)
          .filter((s) => s.createdAt >= lastMonthStart && s.createdAt < currentMonthStart && s.completed);

        const totalReps = sumReps(sessions);
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const exerciseVariety = new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId))).size;

        return { uid: memberId, displayName: userMap.get(memberId) || 'Inconnu', totalReps, exerciseVariety, totalDuration };
      });

    const hasActivity = entries.some((e) => e.totalReps > 0 || e.totalDuration > 0);
    if (!hasActivity) {
      if (progress) {
        await updateDoc(doc(db, 'userProgress', user.uid), { monthlyRewardsClaimed: lastMonthKey });
      }
      return;
    }

    const rankings: MonthlyRanking[] = [];
    const rewards: CardRarity[] = [];
    const badges: RankBadge[] = [];
    const ownedBadgeIds = new Set((progress?.badges || []).map((b) => b.id));

    function addRanking(
      category: RankCategory,
      categoryLabel: string,
      sorted: typeof entries,
      format: (e: (typeof entries)[number]) => string
    ) {
      if (sorted.length === 0) return;
      const top3 = sorted.slice(0, 3).map((e, i) => ({
        uid: e.uid, displayName: e.displayName, value: format(e), rank: i, chestRarity: RANK_CHEST[i],
      }));
      rankings.push({ category, categoryLabel, top3 });

      for (const t of top3) {
        if (t.uid !== user!.uid) continue;
        rewards.push(t.chestRarity);
        const id = makeBadgeId(lastMonthKey, category, t.rank);
        if (ownedBadgeIds.has(id)) continue;
        badges.push({
          id,
          category,
          rank: t.rank,
          monthKey: lastMonthKey,
          seasonId: season?.id || '',
          seasonName: season?.name || 'Hors saison',
          groupName: group.name,
          earnedAt: Date.now(),
        });
      }
    }

    const fmtDur = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
    };

    addRanking('reps', 'Reps',
      [...entries].filter((e) => e.totalReps > 0).sort((a, b) => b.totalReps - a.totalReps),
      (e) => `${e.totalReps} reps`);

    addRanking('variety', 'Variété',
      [...entries].filter((e) => e.exerciseVariety > 0).sort((a, b) => b.exerciseVariety - a.exerciseVariety),
      (e) => `${e.exerciseVariety} exos`);

    addRanking('time', 'Temps',
      [...entries].filter((e) => e.totalDuration > 0).sort((a, b) => b.totalDuration - a.totalDuration),
      (e) => fmtDur(e.totalDuration));

    if (rankings.length > 0) {
      setMonthlyRankings(rankings);
      setMyRewards(rewards);
      setMyBadges(badges);
      setShowRewards(true);
    } else if (progress) {
      await updateDoc(doc(db, 'userProgress', user.uid), { monthlyRewardsClaimed: lastMonthKey });
    }
  }

  async function claimMonthlyRewards() {
    if (!user || claimingRewards) return;
    setClaimingRewards(true);

    const lastMonthKey = getLastMonthKey();
    const newChests = myRewards.map((rarity) => ({ rarity, pool: 'current' as const }));

    const progressRef = doc(db, 'userProgress', user.uid);
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      const current = snap.data() as UserProgress;
      // Relecture des badges déjà en base : le document a pu changer depuis
      // l'ouverture de la modale, et un badge ne doit jamais être dupliqué.
      const existing = current.badges || [];
      const existingIds = new Set(existing.map((b) => b.id));
      const toAdd = myBadges.filter((b) => !existingIds.has(b.id));

      await updateDoc(progressRef, {
        chestsToOpen: [...(current.chestsToOpen || []), ...newChests],
        badges: [...existing, ...toAdd],
        monthlyRewardsClaimed: lastMonthKey,
      });
    }

    setRewardsClaimed(true);
    setClaimingRewards(false);
  }

  function closeRewardsModal() {
    if (myRewards.length === 0 || rewardsClaimed) {
      setShowRewards(false);
      if (!rewardsClaimed && user) {
        updateDoc(doc(db, 'userProgress', user.uid), { monthlyRewardsClaimed: getLastMonthKey() });
      }
    }
  }

  function getSortedLeaderboard(): LeaderboardEntry[] {
    const sorted = [...leaderboard];
    switch (sortMode) {
      case 'reps':
        sorted.sort((a, b) => b.totalReps - a.totalReps);
        break;
      case 'variety':
        sorted.sort((a, b) => b.exerciseVariety - a.exerciseVariety);
        break;
      case 'time':
        sorted.sort((a, b) => b.totalDuration - a.totalDuration);
        break;
    }
    return sorted;
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    if (groups.length > 0) {
      alert('Tu es déjà dans un groupe. Quitte-le avant d\'en créer un autre.');
      return;
    }
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'groups'), {
        name: groupName,
        code,
        createdBy: user!.uid,
        memberIds: [user!.uid],
        pendingIds: [],
        createdAt: Date.now(),
      });
      setShowCreate(false);
      setGroupName('');
      await loadGroups();
    } catch (err) {
      console.error('Erreur création groupe:', err);
      alert('Erreur lors de la création du groupe. Vérifie les règles Firestore.');
    }
  }

  function normalize(str: string): string {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  async function loadAllGroups() {
    setSearching(true);
    try {
      const allGroupsSnap = await getDocs(collection(db, 'groups'));
      const all = allGroupsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupType));
      setSearchResults(all);
      setSearchLoaded(true);
    } catch (err) {
      console.error('Erreur chargement groupes:', err);
    } finally {
      setSearching(false);
    }
  }

  function getFilteredResults() {
    if (!searchQuery.trim()) return searchResults;
    const q = normalize(searchQuery);
    return searchResults.filter((g) => normalize(g.name).includes(q));
  }

  async function loadGroupMembers(groupId: string, memberIds: string[]) {
    if (expandedMembers.has(groupId)) return;
    const usersSnap = await getDocs(collection(db, 'users'));
    const names: string[] = [];
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid && memberIds.includes(data.uid)) {
        names.push(data.displayName || 'Inconnu');
      }
    });
    setExpandedMembers((prev) => new Map(prev).set(groupId, names));
  }

  function openExplore() {
    setShowExplore(true);
    if (!searchLoaded) loadAllGroups();
  }

  async function requestJoin(groupId: string) {
    if (groups.length > 0) {
      alert('Tu es déjà dans un groupe. Quitte-le avant d\'en rejoindre un autre.');
      return;
    }
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        pendingIds: arrayUnion(user!.uid),
      });
      setSearchResults((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, pendingIds: [...(g.pendingIds || []), user!.uid] } : g
        )
      );
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la demande');
    }
  }

  async function acceptMember(uid: string) {
    if (!selectedGroup) return;
    try {
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        memberIds: arrayUnion(uid),
        pendingIds: arrayRemove(uid),
      });
      await loadGroups();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'acceptation');
    }
  }

  async function rejectMember(uid: string) {
    if (!selectedGroup) return;
    try {
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        pendingIds: arrayRemove(uid),
      });
      await loadGroups();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du refus');
    }
  }

  async function transferChef(newChefUid: string) {
    if (!selectedGroup) return;
    const name = leaderboard.find((e) => e.uid === newChefUid)?.displayName || 'ce membre';
    if (!confirm(`Transférer le rôle de chef à ${name} ?`)) return;
    try {
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        createdBy: newChefUid,
      });
      await loadGroups();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du transfert');
    }
  }

  async function leaveGroup() {
    if (!selectedGroup) return;
    if (isCreator && selectedGroup.memberIds.length > 1) {
      alert('Tu es le chef du groupe. Transfère le rôle à un autre membre avant de quitter.');
      return;
    }
    if (!confirm('Quitter ce groupe ?')) return;
    try {
      if (isCreator && selectedGroup.memberIds.length === 1) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'groups', selectedGroup.id));
      } else {
        await updateDoc(doc(db, 'groups', selectedGroup.id), {
          memberIds: arrayRemove(user!.uid),
        });
      }
      setSelectedGroup(null);
      setLeaderboard([]);
      await loadGroups();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sortie du groupe');
    }
  }

  function getRankIcon(index: number) {
    if (index === 0) return <Trophy size={20} className="gold" />;
    if (index === 1) return <Medal size={20} className="silver" />;
    if (index === 2) return <Medal size={20} className="bronze" />;
    return <span className="rank-number">{index + 1}</span>;
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m} min`;
  }

  function getSortDisplayValue(entry: LeaderboardEntry): string {
    switch (sortMode) {
      case 'reps': return String(entry.totalReps);
      case 'variety': return String(entry.exerciseVariety);
      case 'time': return formatDuration(entry.totalDuration);
    }
  }

  function getSortUnit(_entry: LeaderboardEntry): string {
    switch (sortMode) {
      case 'reps': return 'reps';
      case 'variety': return 'exos';
      case 'time': return '';
    }
  }

  function getMonthResetLabel(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const diff = nextMonth.getTime() - now.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}j ${hours}h`;
    return `${hours}h`;
  }

  const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const currentMonthName = MONTH_NAMES[new Date().getMonth()];

  function getMonthlyAwards() {
    if (leaderboard.length === 0) return [];
    const awards: { label: string; icon: React.ReactNode; winner: string }[] = [];

    const byReps = [...leaderboard].sort((a, b) => b.totalReps - a.totalReps);
    if (byReps[0]?.totalReps > 0) {
      awards.push({ label: 'Plus de reps', icon: <Zap size={14} />, winner: byReps[0].displayName });
    }

    const byVariety = [...leaderboard].sort((a, b) => b.exerciseVariety - a.exerciseVariety);
    if (byVariety[0]?.exerciseVariety > 0) {
      awards.push({ label: 'Plus varié', icon: <Target size={14} />, winner: byVariety[0].displayName });
    }

    const byTime = [...leaderboard].sort((a, b) => b.totalDuration - a.totalDuration);
    if (byTime[0]?.totalDuration > 0) {
      awards.push({ label: 'Plus de temps', icon: <Clock size={14} />, winner: byTime[0].displayName });
    }

    return awards;
  }

  // Le groupe est passé explicitement au chargement initial : l'état n'est pas
  // encore posé à ce moment-là.
  async function loadTrades(group: GroupType | null = selectedGroup) {
    if (!group || !user) return;
    const snap = await getDocs(query(collection(db, 'tradeListings'), where('groupId', '==', group.id)));
    const open = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as TradeListing))
      .filter((l) => l.status === 'open');
    setListings(sortListings(open));
    await refreshMyCards();
  }

  async function refreshMyCards() {
    if (!user) return;
    const snap = await getDoc(doc(db, 'userProgress', user.uid));
    setMyOwnedCards(snap.exists() ? (snap.data() as UserProgress).ownedCards || {} : {});
  }

  async function openPublishPicker() {
    setTradeError(null);
    await refreshMyCards();
    setCardPicker({ mode: 'publish' });
  }

  async function openBidPicker(listing: TradeListing) {
    setTradeError(null);
    await refreshMyCards();
    setCardPicker({ mode: 'bid', listing });
  }

  /** Publie une carte à l'échange, visible par tout le groupe. */
  async function publishListing(cardId: string) {
    if (!user || !selectedGroup || tradeBusy) return;
    setTradeBusy(true);
    try {
      await addDoc(collection(db, 'tradeListings'), {
        groupId: selectedGroup.id,
        ownerUid: user.uid,
        ownerName: myName,
        cardId,
        bids: [],
        status: 'open',
        createdAt: Date.now(),
      });
      setCardPicker(null);
      await loadTrades();
    } catch (err) {
      console.error('Publication impossible:', err);
      setTradeError("Publication impossible. Vérifie ta connexion.");
    }
    setTradeBusy(false);
  }

  /** Propose une carte sur l'annonce de quelqu'un d'autre. */
  async function placeBid(listing: TradeListing, cardId: string) {
    if (!user || tradeBusy) return;
    const refusal = checkBid(listing, user.uid, cardId, myOwnedCards);
    if (refusal) {
      setTradeError(BID_REFUSAL_MESSAGES[refusal]);
      return;
    }

    setTradeBusy(true);
    try {
      const bids = withBid(listing.bids || [], {
        uid: user.uid,
        displayName: myName,
        cardId,
        createdAt: Date.now(),
      });
      await updateDoc(doc(db, 'tradeListings', listing.id), { bids });
      setCardPicker(null);
      await loadTrades();
    } catch (err) {
      console.error('Proposition impossible:', err);
      setTradeError("Proposition impossible. Vérifie ta connexion.");
    }
    setTradeBusy(false);
  }

  async function withdrawBid(listing: TradeListing) {
    if (!user || tradeBusy) return;
    setTradeBusy(true);
    try {
      await updateDoc(doc(db, 'tradeListings', listing.id), {
        bids: withoutBid(listing.bids || [], user.uid),
      });
      await loadTrades();
    } catch (err) {
      console.error('Retrait impossible:', err);
    }
    setTradeBusy(false);
  }

  /**
   * L'auteur conclut avec la personne de son choix.
   *
   * Les deux inventaires sont relus ici : entre la proposition et ce clic, une
   * carte a pu partir dans un autre échange.
   */
  async function acceptBid(listing: TradeListing, bidUid: string) {
    if (!user || tradeBusy) return;
    const bid = (listing.bids || []).find((b) => b.uid === bidUid);
    if (!bid) return;

    setTradeBusy(true);
    try {
      const [ownerSnap, bidderSnap] = await Promise.all([
        getDoc(doc(db, 'userProgress', listing.ownerUid)),
        getDoc(doc(db, 'userProgress', bid.uid)),
      ]);
      if (!ownerSnap.exists() || !bidderSnap.exists()) {
        setTradeError('Inventaire introuvable.');
        setTradeBusy(false);
        return;
      }

      const swap = swapCards(
        (ownerSnap.data() as UserProgress).ownedCards || {},
        (bidderSnap.data() as UserProgress).ownedCards || {},
        listing.cardId,
        bid.cardId
      );
      if (!swap.ok) {
        setTradeError(SWAP_REFUSAL_MESSAGES[swap.reason]);
        await loadTrades();
        setTradeBusy(false);
        return;
      }

      await updateDoc(doc(db, 'userProgress', listing.ownerUid), { ownedCards: swap.result.ownerCards });
      await updateDoc(doc(db, 'userProgress', bid.uid), { ownedCards: swap.result.bidderCards });
      await updateDoc(doc(db, 'tradeListings', listing.id), {
        status: 'completed',
        acceptedUid: bid.uid,
        acceptedCardId: bid.cardId,
        // Faux positif de react-hooks/purity : acceptBid n'est appelée que
        // depuis un onClick, jamais pendant le rendu. L'analyse du plugin
        // remonte jusqu'ici à travers la flèche inline du .map().
        // eslint-disable-next-line react-hooks/purity
        completedAt: Date.now(),
      });
      await loadTrades();
    } catch (err) {
      console.error('Échange impossible:', err);
      setTradeError("Échange impossible. Vérifie ta connexion.");
    }
    setTradeBusy(false);
  }

  /** Refuse une proposition sans fermer l'annonce. */
  async function declineBid(listing: TradeListing, bidUid: string) {
    if (tradeBusy) return;
    setTradeBusy(true);
    try {
      await updateDoc(doc(db, 'tradeListings', listing.id), {
        bids: withoutBid(listing.bids || [], bidUid),
      });
      await loadTrades();
    } catch (err) {
      console.error('Refus impossible:', err);
    }
    setTradeBusy(false);
  }

  async function cancelListing(listing: TradeListing) {
    if (!confirm('Retirer ton annonce ?')) return;
    await deleteDoc(doc(db, 'tradeListings', listing.id));
    await loadTrades();
  }

  function getOwnedCardList(ownedCards: Record<string, number>): { card: Card; count: number }[] {
    return Object.entries(ownedCards)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ card: getCardById(id), count }))
      .filter((e): e is { card: Card; count: number } => e.card !== undefined);
  }

  function getRequestStatus(group: GroupType): 'none' | 'pending' | 'member' {
    if (group.memberIds.includes(user!.uid)) return 'member';
    if (group.pendingIds?.includes(user!.uid)) return 'pending';
    return 'none';
  }

  const sortedLeaderboard = getSortedLeaderboard();
  const awards = getMonthlyAwards();
  const isCreator = selectedGroup?.createdBy === user?.uid;
  const pendingCount = selectedGroup?.pendingIds?.length || 0;
  // Pastille sur l'onglet Échanges : seules les propositions reçues sur mes
  // annonces demandent une décision de ma part.
  const incomingTrades = pendingActionCount(listings, user?.uid || '');
  const myListings = listings.filter((l) => l.ownerUid === user?.uid);
  const otherListings = listings.filter((l) => l.ownerUid !== user?.uid);
  // On ne propose pas la carte déjà mise à l'échange : le troc serait nul.
  const pickerChoices = getOwnedCardList(myOwnedCards).filter(
    (e) => !cardPicker || cardPicker.mode === 'publish' || e.card.id !== cardPicker.listing.cardId
  );

  function pickCard(cardId: string) {
    if (!cardPicker) return;
    if (cardPicker.mode === 'publish') publishListing(cardId);
    else placeBid(cardPicker.listing, cardId);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Groupe</h1>
        <SeasonalBadge compact />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {selectedGroup && (
            <button className="icon-btn" onClick={() => setShowChat(true)}>
              <MessageCircle size={20} />
            </button>
          )}
          <button className="explore-btn" onClick={openExplore}>
            <Search size={16} /> Explorer
          </button>
        </div>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : groups.length === 0 && !showCreate ? (
        <div className="empty-group">
          <Users size={48} />
          <p>Rejoins ou crée un groupe pour te mesurer à tes potes !</p>
          <div className="group-actions">
            <button className="primary-btn" onClick={() => setShowCreate(true)}>
              Créer un groupe
            </button>
            <button className="secondary-btn" onClick={openExplore}>
              Rejoindre
            </button>
          </div>
        </div>
      ) : null}

      {showCreate && (
        <div className="modal-card">
          <h3>Créer un groupe</h3>
          <input
            type="text"
            placeholder="Nom du groupe"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <div className="modal-actions">
            <button className="secondary-btn" onClick={() => setShowCreate(false)}>
              Annuler
            </button>
            <button className="primary-btn" onClick={createGroup}>
              Créer
            </button>
          </div>
        </div>
      )}

      {showExplore && (
        <div className="modal-overlay" onClick={() => { setShowExplore(false); setSearchQuery(''); }}>
          <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explore-modal-header">
              <h3>Explorer les groupes</h3>
              <button className="member-modal-close" onClick={() => { setShowExplore(false); setSearchQuery(''); }}>
                <X size={18} />
              </button>
            </div>
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Rechercher un groupe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            {searching ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>Chargement...</div>
            ) : (
              <div className="explore-results">
                {getFilteredResults().length === 0 ? (
                  <p className="empty" style={{ padding: '1.5rem 0' }}>Aucun groupe trouvé</p>
                ) : (
                  getFilteredResults().map((g) => {
                    const status = getRequestStatus(g);
                    const isExpanded = expandedGroupId === g.id;
                    const memberNames = expandedMembers.get(g.id);
                    return (
                      <div key={g.id} className="explore-group-card">
                        <div
                          className="explore-group-header"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedGroupId(null);
                            } else {
                              setExpandedGroupId(g.id);
                              loadGroupMembers(g.id, g.memberIds);
                            }
                          }}
                        >
                          <div className="explore-group-info">
                            <span className="explore-group-name">{g.name}</span>
                            <span className="explore-group-count">
                              <Users size={12} /> {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="explore-group-actions">
                            {status === 'member' ? (
                              <span className="member-badge-tag">Membre</span>
                            ) : status === 'pending' ? (
                              <span className="pending-badge">En attente</span>
                            ) : (
                              <button className="primary-btn small" onClick={(e) => { e.stopPropagation(); requestJoin(g.id); }}>
                                <UserPlus size={14} /> Demander
                              </button>
                            )}
                            <ChevronDown size={16} className={isExpanded ? 'rotated' : ''} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="explore-group-members">
                            {memberNames ? (
                              memberNames.length > 0 ? (
                                memberNames.map((name, i) => (
                                  <div key={i} className="explore-member-item">
                                    <div className="explore-member-avatar">{name[0].toUpperCase()}</div>
                                    <span>{name}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="empty" style={{ fontSize: '0.8rem' }}>Aucun membre</p>
                              )
                            ) : (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chargement...</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedGroup && (
        <>
          <div className="group-info">
            <h2>{selectedGroup.name}</h2>
            <span className="member-count">
              {selectedGroup.memberIds.length} membre{selectedGroup.memberIds.length > 1 ? 's' : ''}
            </span>

            {awards.length > 0 && (
              <div className="awards-section-inline">
                {awards.map((award, i) => (
                  <div key={i} className="award-badge">
                    {award.icon}
                    <div>
                      <span className="award-label">{award.label}</span>
                      <span className="award-winner">{award.winner}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isCreator && pendingCount > 0 && (
            <section className="section pending-section">
              <h3>
                <UserPlus size={18} />
                Demandes en attente ({pendingCount})
              </h3>
              <div className="pending-list">
                {(selectedGroup.pendingIds || []).map((uid) => (
                  <div key={uid} className="pending-item">
                    <span className="pending-name">{pendingNames.get(uid) || 'Chargement...'}</span>
                    <div className="pending-actions">
                      <button className="accept-btn" onClick={() => acceptMember(uid)}>
                        <UserCheck size={16} />
                      </button>
                      <button className="reject-btn" onClick={() => rejectMember(uid)}>
                        <UserX size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="bp-tabs group-tabs">
            <button
              className={`bp-tab ${groupTab === 'classement' ? 'active' : ''}`}
              onClick={() => setGroupTab('classement')}
            >
              <Trophy size={15} />
              <span>Classement</span>
            </button>
            <button
              className={`bp-tab ${groupTab === 'echanges' ? 'active' : ''}`}
              onClick={() => { setGroupTab('echanges'); loadTrades(); }}
            >
              <ArrowLeftRight size={15} />
              <span>Échanges</span>
              {incomingTrades > 0 && <span className="bp-tab-badge">{incomingTrades}</span>}
            </button>
          </div>

          {groupTab === 'classement' && (
            <section className="section">
            <div className="leaderboard-header">
              <div className="bp-section-title-row">
                <h3>Classement — {currentMonthName}</h3>
                <span className="bp-quest-timer">Reset dans {getMonthResetLabel()}</span>
              </div>
              <div className="sort-tabs">
                <button
                  className={`sort-tab ${sortMode === 'reps' ? 'active' : ''}`}
                  onClick={() => setSortMode('reps')}
                >
                  Reps
                </button>
                <button
                  className={`sort-tab ${sortMode === 'variety' ? 'active' : ''}`}
                  onClick={() => setSortMode('variety')}
                >
                  Variété
                </button>
                <button
                  className={`sort-tab ${sortMode === 'time' ? 'active' : ''}`}
                  onClick={() => setSortMode('time')}
                >
                  Temps
                </button>
              </div>
            </div>
            <div className="leaderboard">
              {sortedLeaderboard.map((entry, i) => (
                <div
                  key={entry.uid}
                  className={`leaderboard-row ${entry.uid === user!.uid ? 'me' : ''}`}
                  onClick={() => setSelectedMember(entry)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="rank">{getRankIcon(i)}</div>
                  <MemberAvatar entry={entry} />
                  <div className="leaderboard-info">
                    <span className="leaderboard-name">
                      {entry.displayName}
                      {entry.uid === user!.uid ? ' (toi)' : ''}
                      {entry.uid === selectedGroup.createdBy && (
                        <Crown size={12} className="leaderboard-crown" />
                      )}
                    </span>
                    <span className="leaderboard-stats">
                      {entry.sessionsCount} séance{entry.sessionsCount > 1 ? 's' : ''} •{' '}
                      {entry.totalSets} séries
                    </span>
                  </div>
                  <div className="leaderboard-reps">
                    <span className="reps-number">{getSortDisplayValue(entry)}</span>
                    {getSortUnit(entry) && <span className="reps-label">{getSortUnit(entry)}</span>}
                  </div>
                </div>
              ))}
            </div>
            </section>
          )}

          {groupTab === 'echanges' && (
            <section className="section">
              <div className="trades-section">
                <button className="primary-btn small trade-publish-btn" onClick={openPublishPicker}>
                  <ArrowLeftRight size={16} /> Mettre une carte à l'échange
                </button>
                <p className="trade-hint">
                  Ta carte est proposée à tout le groupe. Chacun propose la sienne,
                  et tu choisis avec qui échanger.
                </p>

                {tradeError && <p className="pr-form-error">{tradeError}</p>}

                {myListings.length > 0 && (
                  <div className="trades-list">
                    <span className="trades-list-label">Mes annonces</span>
                    {myListings.map((listing) => {
                      const card = getCardById(listing.cardId);
                      const bids = listing.bids || [];
                      return (
                        <div key={listing.id} className="trade-listing">
                          <div className="trade-listing-head">
                            <div
                              className="trade-card-item"
                              style={{ borderColor: card ? RARITY_COLORS[card.rarity] : 'var(--border)' }}
                            >
                              {card?.image && <img src={card.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{card ? getCardDisplayName(card) : '?'}</span>
                            </div>
                            <div className="trade-listing-meta">
                              <span className="trade-listing-count">
                                {bids.length === 0
                                  ? 'Aucune proposition'
                                  : `${bids.length} proposition${bids.length > 1 ? 's' : ''}`}
                              </span>
                              <button className="secondary-btn small" onClick={() => cancelListing(listing)}>
                                Retirer
                              </button>
                            </div>
                          </div>

                          {bids.length > 0 && (
                            <div className="trade-bids">
                              {bids.map((bid) => {
                                const bidCard = getCardById(bid.cardId);
                                return (
                                  <div key={bid.uid} className="trade-bid">
                                    <div
                                      className="trade-card-item small"
                                      style={{ borderColor: bidCard ? RARITY_COLORS[bidCard.rarity] : 'var(--border)' }}
                                    >
                                      {bidCard?.image && <img src={bidCard.image} alt="" className="trade-card-img" />}
                                      <span className="trade-card-name">
                                        {bidCard ? getCardDisplayName(bidCard) : '?'}
                                      </span>
                                    </div>
                                    <div className="trade-bid-info">
                                      <span className="trade-bid-name">{bid.displayName}</span>
                                      <div className="trade-actions">
                                        <button
                                          className="accept-btn"
                                          disabled={tradeBusy}
                                          onClick={() => acceptBid(listing, bid.uid)}
                                        >
                                          <Check size={14} /> Échanger
                                        </button>
                                        <button
                                          className="reject-btn"
                                          disabled={tradeBusy}
                                          onClick={() => declineBid(listing, bid.uid)}
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {otherListings.length > 0 && (
                  <div className="trades-list">
                    <span className="trades-list-label">Annonces du groupe</span>
                    {otherListings.map((listing) => {
                      const card = getCardById(listing.cardId);
                      const mine = myBid(listing, user!.uid);
                      const mineCard = mine ? getCardById(mine.cardId) : undefined;
                      return (
                        <div key={listing.id} className="trade-listing">
                          <div className="trade-listing-head">
                            <div
                              className="trade-card-item"
                              style={{ borderColor: card ? RARITY_COLORS[card.rarity] : 'var(--border)' }}
                            >
                              {card?.image && <img src={card.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{card ? getCardDisplayName(card) : '?'}</span>
                            </div>
                            <div className="trade-listing-meta">
                              <span className="trade-bid-name">{listing.ownerName}</span>
                              <span className="trade-listing-count">
                                {(listing.bids || []).length} proposition
                                {(listing.bids || []).length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {mine ? (
                            <div className="trade-my-bid">
                              <span className="trade-my-bid-label">
                                Tu proposes {mineCard ? getCardDisplayName(mineCard) : '?'}
                              </span>
                              <div className="trade-actions">
                                <button
                                  className="secondary-btn small"
                                  disabled={tradeBusy}
                                  onClick={() => openBidPicker(listing)}
                                >
                                  Changer
                                </button>
                                <button
                                  className="reject-btn"
                                  disabled={tradeBusy}
                                  onClick={() => withdrawBid(listing)}
                                >
                                  Retirer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="secondary-btn small trade-bid-btn"
                              disabled={tradeBusy}
                              onClick={() => openBidPicker(listing)}
                            >
                              Proposer une carte
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {listings.length === 0 && (
                  <p className="empty" style={{ fontSize: '0.85rem' }}>Aucune annonce en cours</p>
                )}
              </div>
            </section>
          )}

          <div className="group-actions" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button className="leave-btn" onClick={leaveGroup}>
              <LogOut size={14} /> Quitter le groupe
            </button>
          </div>
        </>
      )}

      {cardPicker && (
        <TradeCardPicker
          listing={cardPicker.mode === 'publish' ? null : cardPicker.listing}
          wantedCard={cardPicker.mode === 'publish' ? undefined : getCardById(cardPicker.listing.cardId)}
          cards={pickerChoices}
          busy={tradeBusy}
          error={tradeError}
          onPick={pickCard}
          onClose={() => setCardPicker(null)}
        />
      )}

      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="member-modal" onClick={(e) => e.stopPropagation()}>
            <button className="member-modal-close" onClick={() => setSelectedMember(null)}>
              <X size={18} />
            </button>
            <div className="member-modal-header">
              <div className="member-modal-avatar">
                <MemberAvatar entry={selectedMember} />
              </div>
              <h3>{selectedMember.displayName}</h3>
            </div>
            <div className="member-modal-stats">
              <div className="member-modal-stat">
                <Trophy size={16} className="gold" />
                <div>
                  <span className="member-modal-stat-value">{selectedMember.sessionsCount}</span>
                  <span className="member-modal-stat-label">Séances</span>
                </div>
              </div>
              <div className="member-modal-stat">
                <Zap size={16} style={{ color: 'var(--accent)' }} />
                <div>
                  <span className="member-modal-stat-value">{selectedMember.totalReps}</span>
                  <span className="member-modal-stat-label">Reps</span>
                </div>
              </div>
              <div className="member-modal-stat">
                <Clock size={16} style={{ color: 'var(--accent-green)' }} />
                <div>
                  <span className="member-modal-stat-value">{Math.floor(selectedMember.totalDuration / 60)}min</span>
                  <span className="member-modal-stat-label">Temps</span>
                </div>
              </div>
              <div className="member-modal-stat">
                <Dumbbell size={16} style={{ color: 'var(--accent-light)' }} />
                <div>
                  <span className="member-modal-stat-value">{selectedMember.totalSets}</span>
                  <span className="member-modal-stat-label">Séries</span>
                </div>
              </div>
            </div>
            <button
              className="member-modal-view-btn"
              onClick={() => { setSelectedMember(null); navigate(`/profile/${selectedMember.uid}`); }}
            >
              Voir le profil complet
            </button>
            {isCreator && selectedMember.uid !== user!.uid && (
              <button
                className="member-modal-chef-btn"
                onClick={() => { const uid = selectedMember.uid; setSelectedMember(null); transferChef(uid); }}
              >
                <Crown size={14} /> Transférer le rôle de chef
              </button>
            )}
          </div>
        </div>
      )}

      {showRewards && (
        <div className="modal-overlay" onClick={closeRewardsModal}>
          <div className="rewards-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rewards-modal-header">
              <Trophy size={24} className="gold" />
              <h2>Résultats du mois</h2>
              <p className="rewards-month-label">
                {(() => {
                  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                  const now = new Date();
                  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                  return MONTHS[lastMonth];
                })()}
              </p>
            </div>

            {monthlyRankings.map((ranking) => (
              <div key={ranking.category} className="rewards-ranking">
                <h4 className="rewards-ranking-title">{ranking.categoryLabel}</h4>
                {ranking.top3.map((entry) => (
                  <div key={entry.uid} className={`rewards-rank-row ${entry.uid === user?.uid ? 'rewards-rank-me' : ''}`}>
                    <div className="rewards-rank-pos">
                      {entry.rank === 0 ? <Trophy size={16} className="gold" /> :
                       entry.rank === 1 ? <Medal size={16} className="silver" /> :
                       <Medal size={16} className="bronze" />}
                    </div>
                    <span className="rewards-rank-name">{entry.displayName}</span>
                    <span className="rewards-rank-value">{entry.value}</span>
                    <span className="rewards-rank-chest" style={{ color: RARITY_COLORS[entry.chestRarity] }}>
                      <Package size={14} />
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {myRewards.length > 0 && !rewardsClaimed && (
              <div className="rewards-claim-section">
                <p className="rewards-claim-text">
                  Tu as gagné {myRewards.length} coffre{myRewards.length > 1 ? 's' : ''} !
                </p>
                <div className="rewards-chest-preview">
                  {myRewards.map((rarity, i) => (
                    <div key={i} className="rewards-chest-item" style={{ color: RARITY_COLORS[rarity] }}>
                      <Package size={22} />
                      <span>{rarity === 'legendaire' ? 'Légendaire' : rarity === 'epique' ? 'Épique' : 'Rare'}</span>
                    </div>
                  ))}
                </div>
                {myBadges.length > 0 && (
                  <>
                    <p className="rewards-claim-text">
                      Et {myBadges.length} badge{myBadges.length > 1 ? 's' : ''} pour ton profil
                    </p>
                    <div className="rewards-badges">
                      {myBadges.map((badge) => (
                        <div key={badge.id} className="rewards-badge-item">
                          <RankBadgeIcon badge={badge} size={64} />
                          <span>{badgeTitle(badge)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button className="primary-btn" onClick={claimMonthlyRewards} disabled={claimingRewards}>
                  {claimingRewards ? 'Récupération...' : 'Récupérer'}
                </button>
              </div>
            )}

            {rewardsClaimed && (
              <div className="rewards-claimed-msg">
                <Check size={20} />
                <span>Coffres ajoutés ! Ouvre-les dans le Battle Pass.</span>
              </div>
            )}

            {(myRewards.length === 0 || rewardsClaimed) && (
              <button className="secondary-btn rewards-close-btn" onClick={closeRewardsModal}>
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {showChat && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowChat(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>Chat — {selectedGroup.name}</h3>
              <button className="member-modal-close" onClick={() => setShowChat(false)}>
                <X size={18} />
              </button>
            </div>
            <GroupChat groupId={selectedGroup.id} />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
