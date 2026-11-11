import { useEffect, useState, useCallback } from 'react';
import { useAuth, MAX_DISPLAY_NAME } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { doc, getDoc, getDocs, collection, query, where, limit, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { passeCache, docsEnCache } from '../lib/lectureCache';
import { getCardsBySet, RARITY_ORDER, getCardDisplayName, getCardById } from '../lib/cards';
import { SEASONS, lastStartedSeasonIndex } from '../lib/passes';
import { useUserProgress } from '../lib/useUserProgress';
import { totalReps as sumReps } from '../lib/stats';
import type { Session, Card, Program } from '../types';
import { sortBadges } from '../lib/badges';
import { bestAmrapsByCircuit } from '../lib/amrap';
import BadgeSlab from '../components/BadgeSlab';
import PersonalRecords from '../components/PersonalRecords';
import SeasonalBadge from '../components/SeasonalBadge';
import NotificationSettings from '../components/NotificationSettings';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Zap, Dumbbell, X, ClipboardList, Download, Pencil, TrendingUp, ChevronRight, LogOut, Settings } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import SeasonShelf from '../components/SeasonShelf';
import FaceIdShelf from '../components/FaceIdShelf';
import type { SeasonShelfEntry } from '../components/SeasonShelf';

/** « 29 novembre » — la date d'ouverture annoncée sur un bandeau verrouillé. */
const DATE_OUVERTURE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

export default function Profile() {
  const { user, displayName: myName, updateDisplayName, signOut } = useAuth();
  const navigate = useNavigate();
  const { uid } = useParams<{ uid: string }>();
  const { sessions: ownSessions } = useUserSessions();

  const isOwnProfile = !uid || uid === user?.uid;
  const targetUid = uid || user?.uid;

  // Cartes, avatar et badges viennent du même document, servi par le cache
  // avant le serveur : la page s'affiche sans attendre le réseau.
  const { progress, loading: progressLoading } = useUserProgress(targetUid);
  const ownedCards = progress?.ownedCards || {};
  const avatarCardId = progress?.avatarCardId;

  const [displayName, setDisplayName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const badges = sortBadges(progress?.badges || []);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function startEditName() {
    setNameDraft(myName);
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    if (savingName) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Le pseudo ne peut pas être vide');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      setDisplayName(trimmed);
      setEditingName(false);
    } catch (err) {
      setNameError((err as Error).message || 'Erreur lors du changement de pseudo');
    }
    setSavingName(false);
  }

  const load = useCallback(async () => {
    if (!targetUid) return;

    // Chaque bloc porte son propre filet : une panne sur les programmes ne doit
    // pas emporter le nom et les séances, et surtout aucune ne doit laisser
    // l'écran de chargement tourner dans le vide.
    try {
      if (isOwnProfile) {
        setDisplayName(myName);
        setSessions(ownSessions);
      } else {
        const userSnap = await getDoc(doc(db, 'users', targetUid));
        if (userSnap.exists()) {
          setDisplayName(userSnap.data().displayName || 'Inconnu');
        } else {
          // Quelques comptes ont un document dont l'identifiant n'est pas leur
          // uid. On les retrouve par une requête ciblée : parcourir toute la
          // collection téléchargeait chaque utilisateur de l'app pour en lire un.
          const found = await getDocs(
            query(collection(db, 'users'), where('uid', '==', targetUid), limit(1))
          );
          setDisplayName(found.docs[0]?.data().displayName || 'Inconnu');
        }
        const sessSnap = await getDocs(query(collection(db, 'sessions'), where('userId', '==', targetUid)));
        setSessions(sessSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
      }
    } catch (err) {
      console.error('Profil indisponible :', err);
    }

    // Sur son propre profil, le nom et les séances viennent déjà du contexte :
    // la page n'a aucune raison d'attendre la requête des programmes, qui ne
    // remplit qu'un encart tout en bas.
    if (isOwnProfile) setLoading(false);

    const progQuery = isOwnProfile
      ? query(collection(db, 'programs'), where('createdBy', '==', targetUid))
      : query(collection(db, 'programs'), where('createdBy', '==', targetUid), where('isPublic', '==', true));

    await passeCache(async () => {
      const snap = await docsEnCache(progQuery);
      setPrograms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
      setLoading(false);
    });

    try {
      const progSnap = await getDocs(progQuery);
      setPrograms(progSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
    } catch {
      setPrograms([]);
    }

    setLoading(false);
  }, [targetUid, isOwnProfile, myName, ownSessions]);

  useEffect(() => {
    load();
  }, [load]);

  const completedSessions = sessions.filter((s) => s.completed);
  const totalReps = sumReps(completedSessions);
  const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalSets = completedSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0), 0
  );

  const amrapBests = bestAmrapsByCircuit(completedSessions);

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m} min`;
  }

  /**
   * Les saisons déjà ouvertes, la plus récente en premier.
   *
   * On compte celles qui ont commencé plutôt que de chercher la saison en
   * cours : entre deux saisons, ou une fois la dernière terminée, il n'y a pas
   * de saison en cours — et la collection disparaîtrait du profil alors qu'elle
   * est justement ce qu'on vient y voir.
   */
  const currentIndex = lastStartedSeasonIndex();
  const openedSeasons = SEASONS.filter((_, i) => i <= currentIndex).reverse();

  /**
   * La saison suivante, annoncée mais verrouillée.
   *
   * Une seule : on tease ce qui arrive, pas tout le calendrier. Son bandeau
   * reste noir — le thème et la date suffisent à donner envie, et tout visuel,
   * même un dos de carte, en dirait déjà trop.
   */
  const nextSeason = SEASONS[currentIndex + 1];

  /**
   * Les cartes, saison par saison.
   *
   * Tout était empilé dans une seule grille : à partir de deux saisons, on ne
   * distinguait plus de quelle collection venait quelle carte. Chaque saison a
   * donc son bandeau, qu'on déplie pour voir ce qu'on a.
   */
  const seasonShelves: SeasonShelfEntry[] = openedSeasons.map((s) => {
    const cards = getCardsBySet(s.id);
    const owned = RARITY_ORDER.flatMap((r) => cards.filter((c) => c.rarity === r && (ownedCards[c.id] || 0) > 0));
    // Le fond du bandeau : les cartes les plus rares de la saison, celles qui
    // l'ont marquée. Possédées ou non — c'est une affiche, pas un inventaire.
    const marquantes = RARITY_ORDER.flatMap((r) => cards.filter((c) => c.rarity === r && c.image)).slice(0, 3);
    return { season: s, cards, owned, marquantes };
  });

  if (nextSeason) {
    seasonShelves.unshift({
      season: nextSeason,
      cards: [],
      owned: [],
      marquantes: [],
      locked: true,
      startLabel: DATE_OUVERTURE.format(nextSeason.startDate),
    });
  }

  // Toutes les cartes possédées, toutes saisons confondues : sert à l'avatar.
  const uniqueCards = seasonShelves.flatMap((sh) => sh.owned);

  // L'avatar se cherche dans toutes les saisons, pas seulement celle en cours :
  // sinon il disparaîtrait de lui-même au changement de saison.
  const avatarCard = avatarCardId ? getCardById(avatarCardId) : undefined;

  async function selectAvatar(card: Card | null) {
    if (!targetUid) return;
    const newId = card?.id || null;
    await updateDoc(doc(db, 'userProgress', targetUid), { avatarCardId: newId });
    setShowAvatarPicker(false);
  }

  if (loading || progressLoading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <header className="page-header">
        {!isOwnProfile && (
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
        )}
        <h1>{isOwnProfile ? 'Mon profil' : 'Profil'}</h1>
        <SeasonalBadge compact />
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
        {editingName ? (
          <div className="profile-name-edit">
            <input
              type="text"
              className="profile-name-input"
              value={nameDraft}
              maxLength={MAX_DISPLAY_NAME}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <div className="profile-name-actions">
              <button className="secondary-btn small" onClick={() => setEditingName(false)}>
                Annuler
              </button>
              <button className="primary-btn small" onClick={saveName} disabled={savingName}>
                {savingName ? '...' : 'Enregistrer'}
              </button>
            </div>
            {nameError && <span className="profile-name-error">{nameError}</span>}
          </div>
        ) : (
          <h2 className="profile-name">
            {displayName}
            {isOwnProfile && (
              <button className="profile-name-edit-btn" onClick={startEditName} aria-label="Modifier le pseudo">
                <Pencil size={14} />
              </button>
            )}
          </h2>
        )}
        <span className="profile-cards-count">{uniqueCards.length} cartes</span>
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

      {isOwnProfile && (
        <button className="profile-link-card" onClick={() => navigate('/progress')}>
          <TrendingUp size={18} />
          <div>
            <span className="profile-link-title">Ma progression</span>
            <span className="profile-link-sub">Totaux, records par exercice et graphiques</span>
          </div>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Sur son propre profil, ces blocs vivent dans l'onglet Progrès. On les
          garde ici pour les autres joueurs, qui n'y ont pas accès autrement. */}
      {!isOwnProfile && (
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
        {amrapBests.map((best) => (
          <div key={best.key} className="profile-record-amrap">
            {best.title} — <strong>{best.rounds} round{best.rounds > 1 ? 's' : ''}</strong> en {best.minutes} min
            {best.circuit && <span className="profile-record-amrap-circuit">{best.circuit}</span>}
          </div>
        ))}
      </section>
      )}

      {!isOwnProfile && <PersonalRecords uid={targetUid} />}

      {badges.length > 0 && (
        <section className="section">
          <BadgeSlab
            badges={badges}
            onOpen={() => navigate(isOwnProfile ? '/badges' : `/badges/${targetUid}`)}
          />
        </section>
      )}

      {/* Les deux bandeaux ont la même forme : collés l'un à l'autre, ils se
          lisaient comme une seule liste. Le trait dit que ce sont deux
          choses différentes. */}
      {badges.length > 0 && <hr className="profile-trait" />}

      {/* L'event a son propre bandeau, au-dessus des saisons : ses cartes ne
          sont pas des cartes de saison, et pendant trois semaines c'est la
          collection qu'on vient regarder en premier. */}
      <FaceIdShelf
        faceid={progress?.faceid}
        onOpen={isOwnProfile ? () => navigate('/faceid') : undefined}
      />

      <section className="section">
        <SeasonShelf
          shelves={seasonShelves}
          onOpen={(id) => navigate(isOwnProfile ? `/season/${id}` : `/season/${id}/${targetUid}`)}
        />
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

      {/* Réglages et déconnexion rapatriés depuis l'en-tête de l'Accueil :
          ce sont des actions de compte, leur place est ici. */}
      {isOwnProfile && user && (
        <section className="section">
          <h3><Settings size={16} style={{ marginRight: 6 }} />Compte</h3>
          <div className="settings-list">
            <NotificationSettings uid={user.uid} />
            <button className="settings-row settings-row-danger" onClick={() => signOut()}>
              <LogOut size={17} />
              <div className="settings-row-info">
                <span className="settings-row-label">Se déconnecter</span>
              </div>
            </button>
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
