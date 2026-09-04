import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ALL_CARDS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, getCardDisplayName } from '../lib/cards';
import type { UserProgress, Session } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Zap, Dumbbell } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { uid } = useParams<{ uid: string }>();
  const { sessions: ownSessions } = useUserSessions();

  const isOwnProfile = !uid || uid === user?.uid;
  const targetUid = uid || user?.uid;

  const [displayName, setDisplayName] = useState('');
  const [ownedCards, setOwnedCards] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUid) return;

    if (isOwnProfile) {
      setDisplayName(user?.displayName || '');
      setSessions(ownSessions);
    } else {
      const userSnap = await getDoc(doc(db, 'users', targetUid));
      if (userSnap.exists()) {
        setDisplayName(userSnap.data().displayName || 'Inconnu');
      } else {
        const usersSnap = await getDocs(collection(db, 'users'));
        const found = usersSnap.docs.find((d) => d.data().uid === targetUid);
        setDisplayName(found?.data().displayName || 'Inconnu');
      }
      const sessSnap = await getDocs(query(collection(db, 'sessions'), where('userId', '==', targetUid)));
      setSessions(sessSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
    }

    const progressSnap = await getDoc(doc(db, 'userProgress', targetUid));
    if (progressSnap.exists()) {
      const data = progressSnap.data() as UserProgress;
      setOwnedCards(data.ownedCards || {});
    }

    setLoading(false);
  }, [targetUid, isOwnProfile, user, ownSessions]);

  useEffect(() => {
    load();
  }, [load]);

  const completedSessions = sessions.filter((s) => s.completed);
  const totalReps = completedSessions.reduce(
    (sum, s) => sum + s.exercises.reduce(
      (eSum, ex) => eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0), 0
    ), 0
  );
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalSets = completedSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0), 0
  );

  const bestAmrap = completedSessions
    .filter((s) => s.mode === 'amrap')
    .sort((a, b) => (b.amrapRounds || 0) - (a.amrapRounds || 0))[0];

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m} min`;
  }

  const ownedCardIds = Object.keys(ownedCards).filter((id) => ownedCards[id] > 0);
  const uniqueCards = ALL_CARDS.filter((c) => ownedCardIds.includes(c.id));

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <header className="page-header">
        {!isOwnProfile && (
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1>{isOwnProfile ? 'Mon profil' : 'Profil'}</h1>
        <div />
      </header>

      <div className="profile-header-card">
        <div className="profile-avatar">
          {(displayName || '?')[0].toUpperCase()}
        </div>
        <h2 className="profile-name">{displayName}</h2>
        <span className="profile-cards-count">{uniqueCards.length}/{ALL_CARDS.length} cartes</span>
      </div>

      <section className="section">
        <h3>Records</h3>
        <div className="profile-stats">
          <div className="profile-stat">
            <Trophy size={18} className="gold" />
            <div>
              <span className="profile-stat-value">{completedSessions.length}</span>
              <span className="profile-stat-label">Séances</span>
            </div>
          </div>
          <div className="profile-stat">
            <Zap size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <span className="profile-stat-value">{totalReps}</span>
              <span className="profile-stat-label">Reps totales</span>
            </div>
          </div>
          <div className="profile-stat">
            <Clock size={18} style={{ color: 'var(--accent-green)' }} />
            <div>
              <span className="profile-stat-value">{formatDuration(totalDuration)}</span>
              <span className="profile-stat-label">Temps total</span>
            </div>
          </div>
          <div className="profile-stat">
            <Dumbbell size={18} style={{ color: 'var(--accent-light)' }} />
            <div>
              <span className="profile-stat-value">{totalSets}</span>
              <span className="profile-stat-label">Séries</span>
            </div>
          </div>
        </div>
        {bestAmrap && (
          <div className="profile-record-amrap">
            Record AMRAP : <strong>{bestAmrap.amrapRounds} rounds</strong> en {Math.floor((bestAmrap.amrapDuration || 0) / 60)} min
          </div>
        )}
      </section>

      <section className="section">
        <h3>Cartes ({uniqueCards.length})</h3>
        {uniqueCards.length === 0 ? (
          <p className="empty">Aucune carte pour le moment</p>
        ) : (
          <div className="card-grid">
            {RARITY_ORDER.flatMap((rarity) =>
              uniqueCards
                .filter((c) => c.rarity === rarity)
                .map((card) => (
                  <div
                    key={card.id}
                    className="collection-card owned"
                    style={{ '--card-color': RARITY_COLORS[card.rarity] } as React.CSSProperties}
                  >
                    <span className="collection-card-emoji">{card.emoji}</span>
                    <span className="collection-card-name">{getCardDisplayName(card)}</span>
                    <span className="collection-card-rarity" style={{ color: RARITY_COLORS[card.rarity] }}>
                      {RARITY_LABELS[card.rarity]}
                    </span>
                    {ownedCards[card.id] > 1 && (
                      <span className="collection-card-count">x{ownedCards[card.id]}</span>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
