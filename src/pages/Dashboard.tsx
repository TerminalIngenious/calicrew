import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Users, Dumbbell, LogOut, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS } from '../lib/exercises';
import Loader from '../components/Loader';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessions, loading, refresh } = useUserSessions();
  const [refreshing, setRefreshing] = useState(false);

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = sessions.filter((s) => s.createdAt > weekAgo).length;
    const totalReps = sessions.reduce(
      (sum, s) =>
        sum +
        s.exercises.reduce(
          (eSum, ex) => eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
          0
        ),
      0
    );
    return { totalSessions: sessions.length, totalReps, thisWeek };
  }, [sessions]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

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
          <button className={`icon-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh}>
            <RefreshCw size={18} />
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
              <span className="stat-value">{stats.totalSessions}</span>
              <span className="stat-label">Séances</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalReps}</span>
              <span className="stat-label">Reps totales</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.thisWeek}</span>
              <span className="stat-label">Cette semaine</span>
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
                        <span className="session-categories"> • {getSessionCategories(s)}</span>
                      </span>
                      <span className={`session-badge ${s.completed ? 'done' : 'partial'}`}>
                        {s.completed ? 'Terminée' : 'En cours'}
                      </span>
                    </div>
                    <div className="session-card-bottom">
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

      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => navigate('/')}>
          <Dumbbell size={22} /> <span>Accueil</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/progress')}>
          <TrendingUp size={22} /> <span>Progression</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/group')}>
          <Users size={22} /> <span>Groupe</span>
        </button>
      </nav>
    </div>
  );
}
