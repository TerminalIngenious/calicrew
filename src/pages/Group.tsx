import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Group as GroupType, LeaderboardEntry, Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, TrendingUp, Users, Copy, Trophy, Medal, Search, Clock, Zap, Target } from 'lucide-react';
import Loader from '../components/Loader';

type SortMode = 'reps' | 'variety' | 'time';

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
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('reps');
  const [loading, setLoading] = useState(true);

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

  async function loadLeaderboard(group: GroupType) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Charger tous les profils et sessions en parallèle
    const [usersSnap, ...sessionSnaps] = await Promise.all([
      getDocs(collection(db, 'users')),
      ...group.memberIds.map((memberId) =>
        getDocs(query(collection(db, 'sessions'), where('userId', '==', memberId)))
      ),
    ]);

    // Map des profils
    const userMap = new Map<string, string>();
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid) userMap.set(data.uid, data.displayName || 'Inconnu');
    });

    const entries: LeaderboardEntry[] = group.memberIds.map((memberId, i) => {
      const sessions = sessionSnaps[i].docs
        .map((d) => d.data() as Session)
        .filter((s) => s.createdAt > weekAgo);

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
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await addDoc(collection(db, 'groups'), {
      name: groupName,
      code,
      createdBy: user!.uid,
      memberIds: [user!.uid],
      createdAt: Date.now(),
    });
    setShowCreate(false);
    setGroupName('');
    await loadGroups();
  }

  async function searchGroups() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Recherche par nom (case insensitive côté client)
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

  async function joinGroup(groupId: string) {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        memberIds: arrayUnion(user!.uid),
      });
      setShowJoin(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadGroups();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la jonction au groupe');
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Récompenses de la semaine
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

  const sortedLeaderboard = getSortedLeaderboard();
  const awards = getWeeklyAwards();

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
              {searchResults.map((g) => (
                <div key={g.id} className="search-result-item">
                  <div>
                    <span className="search-result-name">{g.name}</span>
                    <span className="search-result-members">
                      {g.memberIds.length} membre{g.memberIds.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="primary-btn small" onClick={() => joinGroup(g.id)}>
                    Rejoindre
                  </button>
                </div>
              ))}
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
            <div className="invite-code" onClick={() => copyCode(selectedGroup.code)}>
              <span>Code : {selectedGroup.code}</span>
              <Copy size={16} />
              {copied && <span className="copied-toast">Copié !</span>}
            </div>
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

          <section className="section">
            <div className="leaderboard-header">
              <h3>Classement de la semaine</h3>
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
                >
                  <div className="rank">{getRankIcon(i)}</div>
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

          {groups.length > 0 && (
            <div className="group-actions" style={{ marginTop: '1rem' }}>
              {!showCreate && (
                <button className="secondary-btn small" onClick={() => setShowCreate(true)}>
                  + Nouveau groupe
                </button>
              )}
              {!showJoin && (
                <button className="secondary-btn small" onClick={() => setShowJoin(true)}>
                  Rejoindre un autre
                </button>
              )}
            </div>
          )}
        </>
      )}

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/')}>
          <Dumbbell size={22} /> <span>Accueil</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/progress')}>
          <TrendingUp size={22} /> <span>Progression</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate('/group')}>
          <Users size={22} /> <span>Groupe</span>
        </button>
      </nav>
    </div>
  );
}
