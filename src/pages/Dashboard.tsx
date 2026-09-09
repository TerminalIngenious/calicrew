import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Bell, X, ChevronRight, Droplets, ClipboardList } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS } from '../lib/exercises';
import { getWeekStart } from '../lib/passes';
import Loader from '../components/Loader';

const UPDATES = [
  {
    id: 'update-2026-09-08',
    date: '8 septembre 2026',
    title: 'Quêtes intelligentes & améliorations',
    summary: 'Quêtes personnalisées, classement mensuel, suppression de séances et plus.',
    details: `Quêtes personnalisées : les quêtes de la semaine sont maintenant générées automatiquement en fonction de tes exercices de la semaine précédente. Plus tu progresses, plus les objectifs augmentent (+60%). Si tu n'as pas d'historique, des quêtes starter t'accueillent.\n\nClassement mensuel : le classement du groupe se réinitialise le 1er de chaque mois avec un timer de countdown.\n\nStats du dashboard alignées sur le reset des quêtes (lundi 10h).\n\nSuppression de séances : tu peux maintenant supprimer une séance depuis la page récap. Elle disparaît de tes stats, du classement et des quêtes.\n\nCartes cliquables partout : toutes les cartes (même non débloquées) sont cliquables dans la Collection et le Profil avec une vue détaillée.\n\nLesté / Poids : le toggle "Lesté" est remplacé par un stepper simple pour ajuster le poids directement.`,
  },
  {
    id: 'update-2026-09-06',
    date: '6 septembre 2026',
    title: 'Running & Échanges de cartes',
    summary: 'Nouvelle catégorie Running et système d\'échange entre membres.',
    details: `Nouvelle catégorie Running avec 6 exercices dédiés (Course, Sprint, Fractionné, Course en côte, Tempo run, Marche rapide). Un formulaire spécifique permet de saisir le temps, la distance, le dénivelé et calcule automatiquement l'allure en min/km.\n\nSystème d'échange de cartes entre membres d'un même groupe : propose une de tes cartes contre celle d'un autre joueur, il accepte ou refuse.\n\nNouvelles quêtes running qui s'ajoutent au pool existant. Les quêtes se régénèrent le lundi à 10h avec un timer visible dans le pass.\n\nCoffres spéciaux : coffre Rare garanti au niveau 15, coffre Épique garanti au niveau 30, avec des couleurs distinctes dans le pass.`,
  },
  {
    id: 'update-2026-09-05',
    date: '5 septembre 2026',
    title: 'Groupes & Profils',
    summary: 'Photos de profil personnalisables, explorer les groupes et splash de saison.',
    details: `Photo de profil personnalisable avec les personnages des cartes débloquées, visible dans le classement et la liste des membres du groupe.\n\nNouvelle fonctionnalité "Explorer les groupes" : une barre de recherche accessible en permanence pour voir tous les groupes et leurs membres.\n\nModal de prévisualisation quand tu cliques sur un membre du groupe avec ses stats et un bouton vers son profil complet.\n\nAnimation d'intro splash pour la Saison 1 : Casier Judiciaire à l'ouverture de l'app.\n\nRecherche de groupes améliorée avec gestion des accents.`,
  },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessions, loading } = useUserSessions();
  const [showUpdates, setShowUpdates] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);

  const lastSeenUpdate = localStorage.getItem('calicrew-last-seen-update');
  const hasUnread = lastSeenUpdate !== UPDATES[0]?.id;

  const today = new Date().toISOString().split('T')[0];
  const [creatineTaken, setCreatineTaken] = useState(() => localStorage.getItem('calicrew-creatine') === today);
  const [creatineStreak, setCreatineStreak] = useState(() => parseInt(localStorage.getItem('calicrew-creatine-streak') || '0'));

  function toggleCreatine() {
    if (creatineTaken) {
      localStorage.removeItem('calicrew-creatine');
      const newStreak = Math.max(0, creatineStreak - 1);
      localStorage.setItem('calicrew-creatine-streak', String(newStreak));
      setCreatineStreak(newStreak);
      setCreatineTaken(false);
    } else {
      const lastDate = localStorage.getItem('calicrew-creatine-last');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = lastDate === yesterdayStr ? creatineStreak + 1 : 1;
      localStorage.setItem('calicrew-creatine', today);
      localStorage.setItem('calicrew-creatine-last', today);
      localStorage.setItem('calicrew-creatine-streak', String(newStreak));
      setCreatineStreak(newStreak);
      setCreatineTaken(true);
    }
  }

  function openUpdates() {
    setShowUpdates(true);
    localStorage.setItem('calicrew-last-seen-update', UPDATES[0]?.id || '');
  }

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  const stats = useMemo(() => {
    const weekStart = getWeekStart();
    const weekSessions = sessions.filter((s) => s.createdAt >= weekStart && s.completed);
    const weekReps = weekSessions.reduce(
      (sum, s) =>
        sum +
        s.exercises.reduce(
          (eSum, ex) => eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
          0
        ),
      0
    );
    return { weekSessions: weekSessions.length, weekReps };
  }, [sessions]);

  function getSessionCategories(s: Session): string {
    const cats = [...new Set(s.exercises.map((e) => e.exerciseCategory || '').filter(Boolean))];
    if (cats.length === 0) {
      return `${s.exercises.length} exo${s.exercises.length > 1 ? 's' : ''}`;
    }
    return cats.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] || c).join(', ');
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Salut {user?.displayName}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="icon-btn notif-btn" onClick={openUpdates}>
            <Bell size={18} />
            {hasUnread && <span className="notif-dot" />}
          </button>
          <button className="icon-btn" onClick={() => signOut()}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : (
        <>
          <span className="stats-period">Cette semaine</span>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.weekSessions}</span>
              <span className="stat-label">Séances</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.weekReps}</span>
              <span className="stat-label">Reps</span>
            </div>
          </div>

          <div className={`creatine-card ${creatineTaken ? 'taken' : ''}`} onClick={toggleCreatine}>
            <div className="creatine-left">
              <Droplets size={18} />
              <div>
                <span className="creatine-title">Créatine</span>
                <span className="creatine-sub">{creatineTaken ? 'Prise aujourd\'hui' : 'Pas encore prise'}</span>
              </div>
            </div>
            <div className="creatine-right">
              {creatineStreak > 0 && <span className="creatine-streak">{creatineStreak}j</span>}
              <div className={`creatine-check ${creatineTaken ? 'active' : ''}`}>
                {creatineTaken && <Droplets size={14} />}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="primary-btn" style={{ flex: 1 }} onClick={() => navigate('/session/new')}>
              <Plus size={20} /> Nouvelle séance
            </button>
            <button className="secondary-btn" style={{ flex: 0 }} onClick={() => navigate('/programs')}>
              <ClipboardList size={20} />
            </button>
          </div>

          <section className="section">
            <h2>Dernières séances</h2>
            {recentSessions.length === 0 ? (
              <p className="empty">Aucune séance pour l'instant. Lance-toi !</p>
            ) : (
              <div className="session-list">
                {recentSessions.map((s) => (
                  <div key={s.id} className="session-card" onClick={() => navigate(`/session/${s.id}`)}>
                    <div className="session-card-top">
                      <span className="session-date">
                        {format(new Date(s.date), 'd MMM', { locale: fr })}
                          <span className="session-categories"> • {s.mode === 'amrap' ? 'Cindy AMRAP' : getSessionCategories(s)}</span>
                      </span>
                      <span className={`session-badge ${s.completed ? 'done' : 'partial'}`}>
                        {s.completed ? 'Terminée' : 'En cours'}
                      </span>
                    </div>
                    <div className="session-card-bottom">
                      {s.mode === 'amrap' ? (
                        <span>{s.amrapRounds || 0} rounds</span>
                      ) : (
                        <>
                          <span>
                            {s.exercises.reduce(
                              (sum, ex) => sum + ex.sets.filter((set) => set.completed).length,
                              0
                            )}{' '}
                            séries
                          </span>
                          <span>
                            {s.exercises.reduce(
                              (sum, ex) => sum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
                              0
                            )}{' '}
                            reps
                          </span>
                        </>
                      )}
                      {s.duration && s.duration > 0 && (
                        <span>
                          {Math.floor(s.duration / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showUpdates && (
        <div className="modal-overlay" onClick={() => setShowUpdates(false)}>
          <div className="updates-modal" onClick={(e) => e.stopPropagation()}>
            <div className="updates-modal-header">
              <h3>Nouveautés</h3>
              <button className="member-modal-close" onClick={() => setShowUpdates(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="updates-list">
              {UPDATES.map((update) => {
                const isExpanded = expandedUpdate === update.id;
                return (
                  <div key={update.id} className="update-card" onClick={() => setExpandedUpdate(isExpanded ? null : update.id)}>
                    <div className="update-card-header">
                      <div>
                        <span className="update-card-title">{update.title}</span>
                        <span className="update-card-date">{update.date}</span>
                      </div>
                      <ChevronRight size={16} className={`update-chevron ${isExpanded ? 'rotated-90' : ''}`} />
                    </div>
                    {!isExpanded && (
                      <p className="update-card-summary">{update.summary}</p>
                    )}
                    {isExpanded && (
                      <div className="update-card-details">
                        {update.details.split('\n\n').map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
