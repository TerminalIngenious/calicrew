import { useEffect, useState } from 'react';
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
import { ArrowLeft, Dumbbell, TrendingUp, Users, Copy, Trophy, Medal } from 'lucide-react';

export default function Group() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadGroups();
  }, [user]);

  async function loadGroups() {
    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user!.uid)
    );
    const snap = await getDocs(q);
    const g = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupType));
    setGroups(g);
    if (g.length > 0 && !selectedGroup) {
      setSelectedGroup(g[0]);
      loadLeaderboard(g[0]);
    }
  }

  async function loadLeaderboard(group: GroupType) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const entries: LeaderboardEntry[] = [];

    for (const memberId of group.memberIds) {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', memberId)
      );
      const snap = await getDocs(q);
      const sessions = snap.docs
        .map((d) => d.data() as Session)
        .filter((s) => s.createdAt > weekAgo);

      const userQ = query(collection(db, 'users'), where('uid', '==', memberId));
      const userSnap = await getDocs(userQ);
      const displayName = userSnap.docs[0]?.data()?.displayName || 'Inconnu';

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

      entries.push({
        uid: memberId,
        displayName,
        totalReps,
        totalSets,
        sessionsCount: sessions.length,
      });
    }

    entries.sort((a, b) => b.totalReps - a.totalReps);
    setLeaderboard(entries);
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
    loadGroups();
  }

  async function joinGroup() {
    if (!joinCode.trim()) return;
    try {
      const q = query(collection(db, 'groups'), where('code', '==', joinCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert('Code invalide');
        return;
      }
      const groupDoc = snap.docs[0];
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        memberIds: arrayUnion(user!.uid),
      });
      setShowJoin(false);
      setJoinCode('');
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

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Groupe</h1>
        <div />
      </header>

      {groups.length === 0 && !showCreate && !showJoin ? (
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
          <input
            type="text"
            placeholder="Code d'invitation"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={6}
          />
          <div className="modal-actions">
            <button className="secondary-btn" onClick={() => setShowJoin(false)}>
              Annuler
            </button>
            <button className="primary-btn" onClick={joinGroup}>
              Rejoindre
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
          </div>

          <section className="section">
            <h3>Classement de la semaine</h3>
            <div className="leaderboard">
              {leaderboard.map((entry, i) => (
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
                    <span className="reps-number">{entry.totalReps}</span>
                    <span className="reps-label">reps</span>
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
