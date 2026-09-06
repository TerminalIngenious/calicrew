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
  doc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import type { Group as GroupType, LeaderboardEntry, Session, UserProgress } from '../types';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Medal, Search, Clock, Zap, Target, UserPlus, UserCheck, UserX, ChevronDown, Crown, ArrowRight, LogOut, X, Dumbbell } from 'lucide-react';
import BottomNav from '../components/BottomNav';
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
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupType[]>([]);
  const [searching, setSearching] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('reps');
  const [loading, setLoading] = useState(true);
  const [pendingNames, setPendingNames] = useState<Map<string, string>>(new Map());
  const [showMembers, setShowMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LeaderboardEntry | null>(null);

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

    const entries: LeaderboardEntry[] = group.memberIds.map((memberId, i) => {
      const sessionSnap = rest[i * 2] as Awaited<ReturnType<typeof getDocs>>;
      const progressSnap = rest[i * 2 + 1] as Awaited<ReturnType<typeof getDoc>>;
      const sessions = sessionSnap.docs.map((d) => d.data() as Session);
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

  async function searchGroups() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const allGroupsSnap = await getDocs(collection(db, 'groups'));
      const results = allGroupsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as GroupType))
        .filter((g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !g.memberIds.includes(user!.uid)
        );
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
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

  function getWeeklyAwards() {
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

  function getRequestStatus(group: GroupType): 'none' | 'pending' | 'member' {
    if (group.memberIds.includes(user!.uid)) return 'member';
    if (group.pendingIds?.includes(user!.uid)) return 'pending';
    return 'none';
  }

  const sortedLeaderboard = getSortedLeaderboard();
  const awards = getWeeklyAwards();
  const isCreator = selectedGroup?.createdBy === user?.uid;
  const pendingCount = selectedGroup?.pendingIds?.length || 0;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Groupe</h1>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : groups.length === 0 && !showCreate && !showJoin ? (
        <div className="empty-group">
          <Users size={48} />
          <p>Rejoins ou crée un groupe pour te mesurer à tes potes !</p>
          <div className="group-actions">
            <button className="primary-btn" onClick={() => setShowCreate(true)}>
              Créer un groupe
            </button>
            <button className="secondary-btn" onClick={() => setShowJoin(true)}>
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

      {showJoin && (
        <div className="modal-card">
          <h3>Rejoindre un groupe</h3>
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGroups()}
            />
            <button className="search-go" onClick={searchGroups} disabled={searching}>
              {searching ? '...' : 'Chercher'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((g) => {
                const status = getRequestStatus(g);
                return (
                  <div key={g.id} className="search-result-item">
                    <div>
                      <span className="search-result-name">{g.name}</span>
                      <span className="search-result-members">
                        {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {status === 'none' ? (
                      <button className="primary-btn small" onClick={() => requestJoin(g.id)}>
                        <UserPlus size={14} /> Demander
                      </button>
                    ) : status === 'pending' ? (
                      <span className="pending-badge">En attente</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="empty" style={{ padding: '1rem 0' }}>Aucun groupe trouvé</p>
          )}
          <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
            <button className="secondary-btn" onClick={() => { setShowJoin(false); setSearchResults([]); setSearchQuery(''); }}>
              Annuler
            </button>
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
              <h3>Classement</h3>
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

          <div className="group-actions" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button className="leave-btn" onClick={leaveGroup}>
              <LogOut size={14} /> Quitter le groupe
            </button>
          </div>
        </>
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

      <BottomNav />
    </div>
  );
}
