import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import BottomNav from '../components/BottomNav';
import SeasonalBadge from '../components/SeasonalBadge';
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
import { exerciseReps, exerciseTotal, getUnit, unitLabel, totalReps, sessionSets } from '../lib/stats';

/*
 * La couleur de la courbe.
 *
 * Recharts prend une couleur, pas une variable CSS, donc elle est lue sur la
 * page au lieu d'être recopiée : une valeur écrite ici en dur finissait
 * toujours par survivre à un changement de palette et à se retrouver seule
 * d'une autre couleur que le reste.
 */
function couleurAccent(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff9f0a';
}

export default function Progress() {
  const { user } = useAuth();
  const { sessions, loading } = useUserSessions();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');
  // Lue une fois au montage : la palette ne change pas en cours de route, et
  // getComputedStyle pendant le rendu rendrait le composant impur.
  const [COULEUR_COURBE] = useState(couleurAccent);

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
    <div className="page progres">
      {/* Les totaux de toujours vivent dans le bandeau, comme les chiffres
          de la semaine sur l'accueil : dans quatre cartes à icône, ils
          pesaient autant que les graphiques, qui sont pourtant ce qu'on
          vient voir. */}
      <header className="pro-entete">
        <div className="pro-entete-fond" />
        <div className="pro-entete-contenu">
          <div className="pro-titre-ligne">
            <h1>Progression</h1>
            <SeasonalBadge />
          </div>

          {!loading && (
            <div className="pro-totaux">
              <div className="pro-total">
                <span className="pro-nombre">{completed.length}</span>
                <span className="pro-mot">séances</span>
              </div>
              <div className="pro-total">
                <span className="pro-nombre">{allTimeReps}</span>
                <span className="pro-mot">reps</span>
              </div>
              <div className="pro-total">
                <span className="pro-nombre">{formatDuration(allTimeDuration)}</span>
                <span className="pro-mot">temps</span>
              </div>
              <div className="pro-total">
                <span className="pro-nombre">{allTimeSets}</span>
                <span className="pro-mot">séries</span>
              </div>
            </div>
          )}
          <span className="pro-depuis">depuis le début</span>
        </div>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : (
        <div className="progress-body">

          <div className="progress-pr">
            <PersonalRecords uid={user?.uid} editable />
          </div>

          <div className="progress-charts">
            <div className="progress-charts-head">
              <h3 className="progress-charts-title">Graphiques</h3>

              {/* Le choix de l'exercice se pose à côté du titre : en pleine
                  largeur sous lui, il se lisait comme un bouton d'action
                  alors que c'est un réglage de ce qui suit. */}
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
            </div>

            {sortedSessions.length === 0 ? (
              <p className="empty">Fais quelques séances pour voir ta progression ici !</p>
            ) : (
              <>
                <section className="pro-graphe">
                  <h3>Volume total ({unitLabel(selectedUnit)})</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
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
                          stroke={COULEUR_COURBE}
                          strokeWidth={2}
                          dot={{ fill: COULEUR_COURBE, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {selectedExercise !== 'all' && maxRepsData.length > 0 && (
                  <section className="pro-graphe">
                    <h3>Max {unitLabel(selectedUnit)} par séance</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
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
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
