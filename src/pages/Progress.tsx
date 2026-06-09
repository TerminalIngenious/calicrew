import { useState, useMemo } from 'react';
import { useUserSessions } from '../contexts/SessionsContext';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, TrendingUp, Users } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Loader from '../components/Loader';

export default function Progress() {
  const navigate = useNavigate();
  const { sessions, loading } = useUserSessions();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.createdAt - b.createdAt),
    [sessions]
  );

  const exerciseNames = useMemo(
    () => [...new Set(sortedSessions.flatMap((s) => s.exercises.map((e) => e.exerciseName)))],
    [sortedSessions]
  );

  const volumeData = useMemo(() => {
    return sortedSessions.map((s) => {
      const exercises =
        selectedExercise === 'all'
          ? s.exercises
          : s.exercises.filter((e) => e.exerciseName === selectedExercise);
      const volume = exercises.reduce(
        (sum, ex) =>
          sum + ex.sets.reduce((sSum, set) => sSum + (set.completed ? set.reps : 0), 0),
        0
      );
      return {
        date: format(new Date(s.date), 'd MMM', { locale: fr }),
        volume,
      };
    });
  }, [sortedSessions, selectedExercise]);

  const maxRepsData = useMemo(() => {
    if (selectedExercise === 'all') return [];
    return sortedSessions
      .filter((s) => s.exercises.some((e) => e.exerciseName === selectedExercise))
      .map((s) => {
        const ex = s.exercises.find((e) => e.exerciseName === selectedExercise)!;
        const maxReps = Math.max(...ex.sets.map((set) => (set.completed ? set.reps : 0)));
        return {
          date: format(new Date(s.date), 'd MMM', { locale: fr }),
          maxReps,
        };
      });
  }, [sortedSessions, selectedExercise]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Progression</h1>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : (
        <>
          <div className="filter-bar">
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
            >
              <option value="all">Tous les exercices</option>
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {sortedSessions.length === 0 ? (
            <p className="empty">Fais quelques séances pour voir ta progression ici !</p>
          ) : (
            <>
              <section className="section">
                <h3>Volume total (reps)</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="#ff6b35"
                        strokeWidth={2}
                        dot={{ fill: '#ff6b35', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {selectedExercise !== 'all' && maxRepsData.length > 0 && (
                <section className="section">
                  <h3>Max reps par séance</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={maxRepsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={12} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="maxReps"
                          stroke="#4ecdc4"
                          strokeWidth={2}
                          dot={{ fill: '#4ecdc4', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => navigate('/')}>
          <Dumbbell size={22} /> <span>Accueil</span>
        </button>
        <button className="nav-btn active" onClick={() => navigate('/progress')}>
          <TrendingUp size={22} /> <span>Progression</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/group')}>
          <Users size={22} /> <span>Groupe</span>
        </button>
      </nav>
    </div>
  );
}
