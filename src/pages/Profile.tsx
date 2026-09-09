import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCardsBySet, RARITY_ORDER, getCardDisplayName } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import type { UserProgress, Session, Card, Program } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Zap, Dumbbell, X, ClipboardList, Download } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import CardDetailModal from '../components/CardDetailModal';

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
  const [avatarCardId, setAvatarCardId] = useState<string | undefined>();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);

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
      setAvatarCardId(data.avatarCardId);
    }

    const progQuery = isOwnProfile
      ? query(collection(db, 'programs'), where('createdBy', '==', targetUid))
      : query(collection(db, 'programs'), where('createdBy', '==', targetUid), where('isPublic', '==', true));
    const progSnap = await getDocs(progQuery);
    setPrograms(progSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));

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

  const season = getCurrentSeason();
  const allCards = season ? getCardsBySet(season.id) : [];
  const ownedCardIds = Object.keys(ownedCards).filter((id) => ownedCards[id] > 0);
  const uniqueCards = allCards.filter((c) => ownedCardIds.includes(c.id));

  const avatarCard = avatarCardId ? allCards.find((c) => c.id === avatarCardId) : undefined;

  async function selectAvatar(card: Card | null) {
    if (!targetUid) return;
    const newId = card?.id || null;
    await updateDoc(doc(db, 'userProgress', targetUid), { avatarCardId: newId });
    setAvatarCardId(newId ?? undefined);
    setShowAvatarPicker(false);
  }

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
        <div
          className={`profile-avatar ${avatarCard?.image ? 'has-image' : ''} ${isOwnProfile ? 'editable' : ''}`}
          onClick={isOwnProfile ? () => setShowAvatarPicker(true) : undefined}
        >
          {avatarCard?.image ? (
            <img src={avatarCard.image} alt={getCardDisplayName(avatarCard)} className="profile-avatar-img" />
          ) : (
            (displayName || '?')[0].toUpperCase()
          )}
          {isOwnProfile && <span className="profile-avatar-edit">Modifier</span>}
        </div>
        <h2 className="profile-name">{displayName}</h2>
        <span className="profile-cards-count">{uniqueCards.length}/{allCards.length} cartes</span>
      </div>

      {showAvatarPicker && (
        <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="avatar-picker" onClick={(e) => e.stopPropagation()}>
            <div className="avatar-picker-header">
              <h3>Choisir un avatar</h3>
              <button className="icon-btn" onClick={() => setShowAvatarPicker(false)}>
                <X size={20} />
              </button>
            </div>
            {uniqueCards.length === 0 ? (
              <p className="empty">Débloque des cartes pour les utiliser comme avatar !</p>
            ) : (
              <div className="avatar-picker-grid">
                <div
                  className={`avatar-picker-item ${!avatarCardId ? 'selected' : ''}`}
                  onClick={() => selectAvatar(null)}
                >
                  <div className="avatar-picker-default">
                    {(displayName || '?')[0].toUpperCase()}
                  </div>
                </div>
                {RARITY_ORDER.flatMap((rarity) =>
                  uniqueCards
                    .filter((c) => c.rarity === rarity)
                    .map((card) => (
                      <div
                        key={card.id}
                        className={`avatar-picker-item ${avatarCardId === card.id ? 'selected' : ''}`}
                        onClick={() => selectAvatar(card)}
                      >
                        {card.image ? (
                          <img src={card.image} alt={getCardDisplayName(card)} loading="lazy" />
                        ) : (
                          <span className="avatar-picker-emoji">{card.emoji}</span>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="section">
        <h3>Records <span className="stats-period-inline">all-time</span></h3>
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

      {programs.length > 0 && (
        <section className="section">
          <h3><ClipboardList size={16} style={{ marginRight: 6 }} />Programmes ({programs.length})</h3>
          <div className="programs-list" style={{ paddingBottom: 0 }}>
            {programs.map((prog) => (
              <div key={prog.id} className="program-card">
                <div className="program-card-header">
                  <div>
                    <h3>{prog.name}</h3>
                    {prog.description && <span className="program-card-desc">{prog.description}</span>}
                  </div>
                  {!isOwnProfile && (
                    <button className="icon-btn" title="Importer" onClick={async () => {
                      if (!user) return;
                      await addDoc(collection(db, 'programs'), {
                        name: prog.name,
                        description: prog.description || '',
                        createdBy: user.uid,
                        creatorName: user.displayName || '',
                        exercises: prog.exercises,
                        isPublic: false,
                        createdAt: Date.now(),
                      });
                      alert('Programme importé !');
                    }}>
                      <Download size={14} />
                    </button>
                  )}
                </div>
                <div className="program-card-exercises">
                  {prog.exercises.map((ex, i) => (
                    <span key={i} className="program-card-ex">
                      {ex.exerciseName} {ex.targetSets}×{ex.targetReps}{ex.weighted ? ` ${ex.weight}kg` : ''}
                    </span>
                  ))}
                </div>
                <div className="program-card-footer">
                  <span>{prog.exercises.length} exercices</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h3>Cartes ({uniqueCards.length})</h3>
        {uniqueCards.length === 0 ? (
          <p className="empty">Aucune carte pour le moment</p>
        ) : (
          <div className="card-grid card-grid-images">
            {RARITY_ORDER.flatMap((rarity) =>
              uniqueCards
                .filter((c) => c.rarity === rarity)
                .map((card) => (
                  <div
                    key={card.id}
                    className="collection-card-img owned"
                    onClick={() => setSelectedCard(card)}
                  >
                    {card.image ? (
                      <img src={card.image} alt={getCardDisplayName(card)} className="collection-card-thumb" loading="lazy" />
                    ) : (
                      <div className="collection-card-emoji-fallback"><span>{card.emoji}</span></div>
                    )}
                    {ownedCards[card.id] > 1 && (
                      <span className="collection-card-count">x{ownedCards[card.id]}</span>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </section>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          owned
          count={ownedCards[selectedCard.id] || 0}
          onClose={() => setSelectedCard(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
