import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Bell, X, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS } from '../lib/exercises';
import { getWeekStart } from '../lib/passes';
import Loader from '../components/Loader';

const UPDATES = [
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

          <button className="primary-btn" onClick={() => navigate('/session/new')}>
            <Plus size={20} /> Nouvelle séance
          </button>

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
