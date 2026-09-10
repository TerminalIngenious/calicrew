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
import type { Group as GroupType, LeaderboardEntry, Session, UserProgress, TradeOffer, Card } from '../types';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Medal, Search, Clock, Zap, Target, UserPlus, UserCheck, UserX, ChevronDown, Crown, ArrowRight, LogOut, X, Dumbbell, ArrowLeftRight, Check, MessageCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import GroupChat from '../components/GroupChat';
import Loader from '../components/Loader';

type SortMode = 'reps' | 'variety' | 'time';

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
  const { user } = useAuth();
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
  const [showMembers, setShowMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LeaderboardEntry | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<Map<string, string[]>>(new Map());
  const [showChat, setShowChat] = useState(false);

  // Trade states
  const [showTrades, setShowTrades] = useState(false);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [tradeStep, setTradeStep] = useState<'member' | 'myCard' | 'theirCard' | 'confirm'>('member');
  const [tradeTargetUid, setTradeTargetUid] = useState('');
  const [tradeTargetName, setTradeTargetName] = useState('');
  const [tradeOfferedCard, setTradeOfferedCard] = useState<string>('');
  const [tradeRequestedCard, setTradeRequestedCard] = useState<string>('');
  const [myOwnedCards, setMyOwnedCards] = useState<Record<string, number>>({});
  const [targetOwnedCards, setTargetOwnedCards] = useState<Record<string, number>>({});

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

      const totalReps = sessions.reduce(
        (sum, s) =>
          sum +
          s.exercises.reduce(
            (eSum, ex) =>
              eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
            0
          ),
        0
      );
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

  async function loadTrades() {
    if (!selectedGroup || !user) return;
    const tradesSnap = await getDocs(query(collection(db, 'trades'), where('groupId', '==', selectedGroup.id)));
    const all = tradesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as TradeOffer))
      .filter((t) => t.status === 'pending' && (t.fromUid === user.uid || t.toUid === user.uid));
    setTrades(all);
  }

  async function startNewTrade() {
    if (!user) return;
    const progressSnap = await getDoc(doc(db, 'userProgress', user.uid));
    setMyOwnedCards(progressSnap.exists() ? (progressSnap.data() as UserProgress).ownedCards || {} : {});
    setTradeStep('member');
    setTradeTargetUid('');
    setTradeOfferedCard('');
    setTradeRequestedCard('');
    setTargetOwnedCards({});
    setShowNewTrade(true);
  }

  async function selectTradeTarget(uid: string, name: string) {
    setTradeTargetUid(uid);
    setTradeTargetName(name);
    const progressSnap = await getDoc(doc(db, 'userProgress', uid));
    setTargetOwnedCards(progressSnap.exists() ? (progressSnap.data() as UserProgress).ownedCards || {} : {});
    setTradeStep('myCard');
  }

  async function sendTradeOffer() {
    if (!user || !selectedGroup || !tradeOfferedCard || !tradeRequestedCard) return;
    await addDoc(collection(db, 'trades'), {
      fromUid: user.uid,
      toUid: tradeTargetUid,
      offeredCardId: tradeOfferedCard,
      requestedCardId: tradeRequestedCard,
      groupId: selectedGroup.id,
      status: 'pending',
      createdAt: Date.now(),
    });
    setShowNewTrade(false);
    await loadTrades();
  }

  async function acceptTrade(trade: TradeOffer) {
    if (!user) return;
    const fromProgressSnap = await getDoc(doc(db, 'userProgress', trade.fromUid));
    const toProgressSnap = await getDoc(doc(db, 'userProgress', trade.toUid));
    if (!fromProgressSnap.exists() || !toProgressSnap.exists()) return;

    const fromCards = { ...(fromProgressSnap.data() as UserProgress).ownedCards };
    const toCards = { ...(toProgressSnap.data() as UserProgress).ownedCards };

    if ((fromCards[trade.offeredCardId] || 0) < 1 || (toCards[trade.requestedCardId] || 0) < 1) {
      alert('Une des cartes n\'est plus disponible.');
      return;
    }

    fromCards[trade.offeredCardId] = (fromCards[trade.offeredCardId] || 0) - 1;
    fromCards[trade.requestedCardId] = (fromCards[trade.requestedCardId] || 0) + 1;
    toCards[trade.requestedCardId] = (toCards[trade.requestedCardId] || 0) - 1;
    toCards[trade.offeredCardId] = (toCards[trade.offeredCardId] || 0) + 1;

    await updateDoc(doc(db, 'userProgress', trade.fromUid), { ownedCards: fromCards });
    await updateDoc(doc(db, 'userProgress', trade.toUid), { ownedCards: toCards });
    await updateDoc(doc(db, 'trades', trade.id), { status: 'accepted' });
    await loadTrades();
  }

  async function rejectTrade(trade: TradeOffer) {
    await updateDoc(doc(db, 'trades', trade.id), { status: 'rejected' });
    await loadTrades();
  }

  async function cancelTrade(trade: TradeOffer) {
    await deleteDoc(doc(db, 'trades', trade.id));
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

  return (
    <div className="page">
      <header className="page-header">
        <h1>Groupe</h1>
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

          <section className="section members-section">
            <button className="members-toggle" onClick={() => setShowMembers(!showMembers)}>
              <h3><Users size={16} /> Membres ({selectedGroup.memberIds.length})</h3>
              <ChevronDown size={16} className={showMembers ? 'rotated' : ''} />
            </button>
            {showMembers && (
              <div className="members-list">
                {leaderboard.map((entry) => (
                  <div key={entry.uid} className="member-item" onClick={() => setSelectedMember(entry)} style={{ cursor: 'pointer' }}>
                    <MemberAvatar entry={entry} />
                    <div className="member-info-row">
                      <span className="member-name-label">
                        {entry.displayName}
                        {entry.uid === user!.uid ? ' (toi)' : ''}
                      </span>
                      {entry.uid === selectedGroup.createdBy && (
                        <span className="chef-badge"><Crown size={12} /> Chef</span>
                      )}
                    </div>
                    {isCreator && entry.uid !== user!.uid && (
                      <button className="transfer-btn" onClick={() => transferChef(entry.uid)}>
                        <Crown size={14} /> <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <button className="members-toggle" onClick={() => { setShowTrades(!showTrades); if (!showTrades) loadTrades(); }}>
              <h3><ArrowLeftRight size={16} /> Échanges</h3>
              <ChevronDown size={16} className={showTrades ? 'rotated' : ''} />
            </button>
            {showTrades && (
              <div className="trades-section">
                <button className="primary-btn small" style={{ marginBottom: '0.75rem' }} onClick={startNewTrade}>
                  Proposer un échange
                </button>

                {trades.filter((t) => t.toUid === user!.uid).length > 0 && (
                  <div className="trades-list">
                    <span className="trades-list-label">Offres reçues</span>
                    {trades.filter((t) => t.toUid === user!.uid).map((trade) => {
                      const offeredCard = getCardById(trade.offeredCardId);
                      const requestedCard = getCardById(trade.requestedCardId);
                      const fromName = leaderboard.find((e) => e.uid === trade.fromUid)?.displayName || 'Inconnu';
                      return (
                        <div key={trade.id} className="trade-card">
                          <div className="trade-card-header">
                            <span className="trade-from">{fromName} propose</span>
                          </div>
                          <div className="trade-cards-row">
                            <div className="trade-card-item" style={{ borderColor: offeredCard ? RARITY_COLORS[offeredCard.rarity] : 'var(--border)' }}>
                              {offeredCard?.image && <img src={offeredCard.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{offeredCard ? getCardDisplayName(offeredCard) : '?'}</span>
                            </div>
                            <ArrowLeftRight size={16} className="trade-arrow" />
                            <div className="trade-card-item" style={{ borderColor: requestedCard ? RARITY_COLORS[requestedCard.rarity] : 'var(--border)' }}>
                              {requestedCard?.image && <img src={requestedCard.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{requestedCard ? getCardDisplayName(requestedCard) : '?'}</span>
                            </div>
                          </div>
                          <div className="trade-actions">
                            <button className="accept-btn" onClick={() => acceptTrade(trade)}>
                              <Check size={14} /> Accepter
                            </button>
                            <button className="reject-btn" onClick={() => rejectTrade(trade)}>
                              <X size={14} /> Refuser
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {trades.filter((t) => t.fromUid === user!.uid).length > 0 && (
                  <div className="trades-list">
                    <span className="trades-list-label">Offres envoyées</span>
                    {trades.filter((t) => t.fromUid === user!.uid).map((trade) => {
                      const offeredCard = getCardById(trade.offeredCardId);
                      const requestedCard = getCardById(trade.requestedCardId);
                      const toName = leaderboard.find((e) => e.uid === trade.toUid)?.displayName || 'Inconnu';
                      return (
                        <div key={trade.id} className="trade-card">
                          <div className="trade-card-header">
                            <span className="trade-from">À {toName}</span>
                            <span className="pending-badge">En attente</span>
                          </div>
                          <div className="trade-cards-row">
                            <div className="trade-card-item" style={{ borderColor: offeredCard ? RARITY_COLORS[offeredCard.rarity] : 'var(--border)' }}>
                              {offeredCard?.image && <img src={offeredCard.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{offeredCard ? getCardDisplayName(offeredCard) : '?'}</span>
                            </div>
                            <ArrowLeftRight size={16} className="trade-arrow" />
                            <div className="trade-card-item" style={{ borderColor: requestedCard ? RARITY_COLORS[requestedCard.rarity] : 'var(--border)' }}>
                              {requestedCard?.image && <img src={requestedCard.image} alt="" className="trade-card-img" />}
                              <span className="trade-card-name">{requestedCard ? getCardDisplayName(requestedCard) : '?'}</span>
                            </div>
                          </div>
                          <button className="secondary-btn small" onClick={() => cancelTrade(trade)}>
                            Annuler
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {trades.length === 0 && (
                  <p className="empty" style={{ fontSize: '0.85rem' }}>Aucun échange en cours</p>
                )}
              </div>
            )}
          </section>

          <div className="group-actions" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button className="leave-btn" onClick={leaveGroup}>
              <LogOut size={14} /> Quitter le groupe
            </button>
          </div>
        </>
      )}

      {showNewTrade && (
        <div className="modal-overlay" onClick={() => setShowNewTrade(false)}>
          <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explore-modal-header">
              <h3>
                {tradeStep === 'member' && 'Choisir un membre'}
                {tradeStep === 'myCard' && 'Ta carte à offrir'}
                {tradeStep === 'theirCard' && `Carte de ${tradeTargetName}`}
                {tradeStep === 'confirm' && 'Confirmer l\'échange'}
              </h3>
              <button className="member-modal-close" onClick={() => setShowNewTrade(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="explore-results" style={{ padding: '1rem 1.25rem 1.5rem' }}>
              {tradeStep === 'member' && leaderboard
                .filter((e) => e.uid !== user!.uid)
                .map((entry) => (
                  <div key={entry.uid} className="trade-member-item" onClick={() => selectTradeTarget(entry.uid, entry.displayName)}>
                    <MemberAvatar entry={entry} />
                    <span>{entry.displayName}</span>
                    <ArrowRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  </div>
                ))
              }

              {tradeStep === 'myCard' && (
                <>
                  <button className="trade-back-btn" onClick={() => setTradeStep('member')}>
                    ← Retour
                  </button>
                  <div className="trade-card-grid">
                    {getOwnedCardList(myOwnedCards).map(({ card, count }) => (
                      <div
                        key={card.id}
                        className={`trade-card-pick ${tradeOfferedCard === card.id ? 'selected' : ''}`}
                        style={{ borderColor: RARITY_COLORS[card.rarity] }}
                        onClick={() => { setTradeOfferedCard(card.id); setTradeStep('theirCard'); }}
                      >
                        {card.image && <img src={card.image} alt="" className="trade-card-pick-img" />}
                        <span className="trade-card-pick-name">{card.name}</span>
                        {count > 1 && <span className="trade-card-pick-count">×{count}</span>}
                      </div>
                    ))}
                    {getOwnedCardList(myOwnedCards).length === 0 && (
                      <p className="empty">Tu n'as aucune carte</p>
                    )}
                  </div>
                </>
              )}

              {tradeStep === 'theirCard' && (
                <>
                  <button className="trade-back-btn" onClick={() => setTradeStep('myCard')}>
                    ← Retour
                  </button>
                  <div className="trade-card-grid">
                    {getOwnedCardList(targetOwnedCards).map(({ card, count }) => (
                      <div
                        key={card.id}
                        className={`trade-card-pick ${tradeRequestedCard === card.id ? 'selected' : ''}`}
                        style={{ borderColor: RARITY_COLORS[card.rarity] }}
                        onClick={() => { setTradeRequestedCard(card.id); setTradeStep('confirm'); }}
                      >
                        {card.image && <img src={card.image} alt="" className="trade-card-pick-img" />}
                        <span className="trade-card-pick-name">{card.name}</span>
                        {count > 1 && <span className="trade-card-pick-count">×{count}</span>}
                      </div>
                    ))}
                    {getOwnedCardList(targetOwnedCards).length === 0 && (
                      <p className="empty">Ce membre n'a aucune carte</p>
                    )}
                  </div>
                </>
              )}

              {tradeStep === 'confirm' && (() => {
                const offered = getCardById(tradeOfferedCard);
                const requested = getCardById(tradeRequestedCard);
                return (
                  <div className="trade-confirm">
                    <button className="trade-back-btn" onClick={() => setTradeStep('theirCard')}>
                      ← Retour
                    </button>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      Tu proposes à <strong>{tradeTargetName}</strong> :
                    </p>
                    <div className="trade-cards-row" style={{ justifyContent: 'center' }}>
                      <div className="trade-card-item" style={{ borderColor: offered ? RARITY_COLORS[offered.rarity] : 'var(--border)' }}>
                        {offered?.image && <img src={offered.image} alt="" className="trade-card-img" />}
                        <span className="trade-card-name">{offered ? getCardDisplayName(offered) : '?'}</span>
                      </div>
                      <ArrowLeftRight size={18} className="trade-arrow" />
                      <div className="trade-card-item" style={{ borderColor: requested ? RARITY_COLORS[requested.rarity] : 'var(--border)' }}>
                        {requested?.image && <img src={requested.image} alt="" className="trade-card-img" />}
                        <span className="trade-card-name">{requested ? getCardDisplayName(requested) : '?'}</span>
                      </div>
                    </div>
                    <button className="primary-btn" style={{ marginTop: '1.25rem' }} onClick={sendTradeOffer}>
                      Envoyer l'offre
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
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
