import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Users, Dumbbell, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, totalReps: 0, thisWeek: 0 });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    const sessionsRef = collection(db, 'sessions');
    const q = query(sessionsRef, where('userId', '==', user!.uid));
    const snap = await getDocs(q);
    const allSessions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
    allSessions.sort((a, b) => b.createdAt - a.createdAt);
    setRecentSessions(allSessions.slice(0, 5));

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = allSessions.filter((s) => s.createdAt > weekAgo).length;
    const totalReps = allSessions.reduce(
      (sum, s) =>
        sum +
        s.exercises.reduce(
          (eSum, ex) => eSum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
          0
        ),
      0
    );

    setStats({ totalSessions: allSessions.length, totalReps, thisWeek });
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Salut {user?.displayName} 💪</h1>
        </div>
        <button className="icon-btn" onClick={() => signOut()}>
          <LogOut size={20} />
        </button>
      </header>

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
                    {format(new Date(s.date), 'EEEE d MMMM', { locale: fr })}
                  </span>
                  <span className={`session-badge ${s.completed ? 'done' : 'partial'}`}>
                    {s.completed ? 'Terminée' : 'En cours'}
                  </span>
                </div>
                <div className="session-card-bottom">
                  <span>{s.exercises.length} exercice{s.exercises.length > 1 ? 's' : ''}</span>
                  <span>
                    {s.exercises.reduce(
                      (sum, ex) =>
                        sum + ex.sets.filter((set) => set.completed).length,
                      0
                    )}{' '}
                    séries faites
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
