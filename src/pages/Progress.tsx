import { useState, useMemo } from 'react';
import { useUserSessions } from '../contexts/SessionsContext';
import BottomNav from '../components/BottomNav';
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
import PersonalRecords from '../components/PersonalRecords';
import { Trophy, Zap, Clock, Dumbbell } from 'lucide-react';
import { exerciseReps, exerciseTotal, getUnit, unitLabel, totalReps, sessionSets } from '../lib/stats';

export default function Progress() {
  const { sessions, loading } = useUserSessions();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.createdAt - b.createdAt),
    [sessions]
  );

  // Totaux all-time, rapatriés depuis le profil : ils relèvent du suivi, pas
  // de l'identité, et n'avaient rien à faire à côté de l'avatar.
  const completed = useMemo(() => sessions.filter((s) => s.completed), [sessions]);
  const allTimeReps = useMemo(() => totalReps(completed), [completed]);
  const allTimeDuration = useMemo(
    () => completed.reduce((sum, s) => sum + (s.duration || 0), 0),
    [completed]
  );
  const allTimeSets = useMemo(
    () => completed.reduce((sum, s) => sum + sessionSets(s), 0),
    [completed]
  );

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
    return `${m} min`;
  }

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
      // Sur « tous les exercices » on ne somme que les reps : mélanger des
      // secondes de gainage à des répétitions ne voudrait rien dire.
      const volume = exercises.reduce(
        (sum, ex) => sum + (selectedExercise === 'all' ? exerciseReps(ex) : exerciseTotal(ex)),
        0
      );
      return {
        date: format(new Date(s.date), 'd MMM', { locale: fr }),
        volume,
      };
    });
  }, [sortedSessions, selectedExercise]);

  // Unité de l'exercice affiché : on regarde la dernière séance qui le contient.
  const selectedUnit = useMemo(() => {
    if (selectedExercise === 'all') return 'reps';
    for (let i = sortedSessions.length - 1; i >= 0; i--) {
      const ex = sortedSessions[i].exercises.find((e) => e.exerciseName === selectedExercise);
      if (ex) return getUnit(ex);
    }
    return 'reps';
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
          <section className="section">
            <h3>Total <span className="stats-period-inline">all-time</span></h3>
            <div className="profile-stats">
              <div className="profile-stat">
                <Trophy size={18} className="gold" />
                <div>
                  <span className="profile-stat-value">{completed.length}</span>
                  <span className="profile-stat-label">Séances</span>
                </div>
              </div>
              <div className="profile-stat">
                <Zap size={18} style={{ color: 'var(--accent)' }} />
                <div>
                  <span className="profile-stat-value">{allTimeReps}</span>
                  <span className="profile-stat-label">Reps</span>
                </div>
              </div>
              <div className="profile-stat">
                <Clock size={18} style={{ color: 'var(--accent-green)' }} />
                <div>
                  <span className="profile-stat-value">{formatDuration(allTimeDuration)}</span>
                  <span className="profile-stat-label">Temps</span>
                </div>
              </div>
              <div className="profile-stat">
                <Dumbbell size={18} style={{ color: 'var(--accent-light)' }} />
                <div>
                  <span className="profile-stat-value">{allTimeSets}</span>
                  <span className="profile-stat-label">Séries</span>
                </div>
              </div>
            </div>
          </section>

          <PersonalRecords sessions={sessions} />

          <h3 className="progress-charts-title">Graphiques</h3>

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
                <h3>Volume total ({unitLabel(selectedUnit)})</h3>
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
                  <h3>Max {unitLabel(selectedUnit)} par séance</h3>
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

      <BottomNav />
    </div>
  );
}
