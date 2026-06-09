import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Session } from '../types';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Trophy, Timer, Square, Play, Settings } from 'lucide-react';
import Loader from '../components/Loader';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number>(0);

  // Chrono session
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Chrono pause
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restDuration, setRestDuration] = useState(90); // par défaut 1:30
  const [showRestSettings, setShowRestSettings] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Confirmation terminer
  const [showFinish, setShowFinish] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [id]);

  // Chrono session en fond
  useEffect(() => {
    if (session && session.startedAt && !session.completed) {
      startTimeRef.current = session.startedAt;
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.startedAt, session?.completed]);

  async function loadSession() {
    if (!id) return;
    const snap = await getDoc(doc(db, 'sessions', id));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Session;
      setSession(data);
      if (data.completed) setFinished(true);
    }
  }

  // Chrono de pause
  function startRest() {
    setRestTime(restDuration);
    setRestRunning(true);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current);
          setRestRunning(false);
          // Vibration si supporté
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRest() {
    if (restRef.current) clearInterval(restRef.current);
    setRestRunning(false);
    setRestTime(0);
  }

  async function logSet(exerciseIndex: number, setIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const set = updated.exercises[exerciseIndex].sets[setIndex];
    if (set.completed) {
      set.completed = false;
      set.reps = 0;
    } else {
      set.reps = updated.exercises[exerciseIndex].targetReps;
      set.completed = true;
      // Lancer le chrono de pause automatiquement
      startRest();
    }

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
    });
  }

  async function adjustReps(exerciseIndex: number, setIndex: number, delta: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const set = updated.exercises[exerciseIndex].sets[setIndex];
    set.reps = Math.max(0, set.reps + delta);
    set.completed = set.reps > 0;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
    });
  }

  async function finishSession() {
    if (!session || !id) return;
    const duration = Math.floor((Date.now() - (session.startedAt || session.createdAt)) / 1000);
    await updateDoc(doc(db, 'sessions', id), {
      completed: true,
      duration,
    });
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    setShowFinish(false);
  }

  if (!session) return <div className="page loading"><Loader /></div>;

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const displayDuration = session.duration && session.duration > 0 ? session.duration : elapsed;

  if (finished) {
    const totalReps = session.exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.completed ? set.reps : 0), 0),
      0
    );
    return (
      <div className="page">
        <div className="finish-screen">
          <Trophy size={64} className="gold" />
          <h1>Bien joué !</h1>
          <p>Ta séance a bien été enregistrée</p>
          <div className="finish-stats">
            <div className="finish-stat">
              <span className="finish-stat-value">{formatTime(displayDuration)}</span>
              <span className="finish-stat-label">Durée</span>
            </div>
            <div className="finish-stat">
              <span className="finish-stat-value">{totalReps}</span>
              <span className="finish-stat-label">Reps</span>
            </div>
            <div className="finish-stat">
              <span className="finish-stat-value">{completedSets}</span>
              <span className="finish-stat-label">Séries</span>
            </div>
          </div>
          <button className="primary-btn" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Séance en cours</h1>
        <div className="session-timer">
          <Timer size={16} />
          <span>{formatTime(elapsed)}</span>
        </div>
      </header>

      {/* Chrono de pause */}
      <div className="rest-timer-section">
        <div className="rest-timer-row">
          {restRunning ? (
            <div className={`rest-timer-display ${restTime <= 5 ? 'ending' : ''}`}>
              <span className="rest-label">Pause</span>
              <span className="rest-countdown">{formatTime(restTime)}</span>
              <button className="rest-stop-btn" onClick={stopRest}>
                <Square size={14} /> Stop
              </button>
            </div>
          ) : (
            <button className="rest-start-btn" onClick={startRest}>
              <Play size={14} /> Pause {formatTime(restDuration)}
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowRestSettings(!showRestSettings)}>
            <Settings size={18} />
          </button>
        </div>
        {showRestSettings && (
          <div className="rest-settings">
            <span>Durée de pause :</span>
            <div className="rest-presets">
              {[30, 60, 90, 120, 180].map((d) => (
                <button
                  key={d}
                  className={`rest-preset ${restDuration === d ? 'active' : ''}`}
                  onClick={() => setRestDuration(d)}
                >
                  {formatTime(d)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">
          {completedSets}/{totalSets} séries
        </span>
      </div>

      <div className="live-exercises">
        {session.exercises.map((ex, exIdx) => {
          const exCompleted = ex.sets.filter((s) => s.completed).length;
          const exTotal = ex.sets.length;
          const remaining = exTotal - exCompleted;
          const isExpanded = expandedExercise === exIdx;

          return (
            <div key={exIdx} className="live-exercise-card">
              <div
                className="live-exercise-header"
                onClick={() => setExpandedExercise(isExpanded ? -1 : exIdx)}
              >
                <div>
                  <h3>{ex.exerciseName}</h3>
                  <span className="exercise-progress-text">
                    {exCompleted}/{exTotal} séries • {remaining > 0 ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Terminé ✓'}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && (
                <div className="sets-grid">
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className={`set-item ${set.completed ? 'completed' : ''}`}>
                      <div className="set-header">
                        <span className="set-label">Série {setIdx + 1}</span>
                        <span className="set-target">Obj: {ex.targetReps}</span>
                      </div>
                      <div className="set-controls">
                        <button className="reps-btn" onClick={() => adjustReps(exIdx, setIdx, -1)}>−</button>
                        <span className="reps-value">{set.reps}</span>
                        <button className="reps-btn" onClick={() => adjustReps(exIdx, setIdx, 1)}>+</button>
                      </div>
                      <button
                        className={`validate-btn ${set.completed ? 'done' : ''}`}
                        onClick={() => logSet(exIdx, setIdx)}
                      >
                        <Check size={16} />
                        {set.completed ? 'Fait' : 'Valider'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="finish-btn floating-btn" onClick={() => setShowFinish(true)}>
        Terminer la séance
      </button>

      {showFinish && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Terminer la séance ?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Durée : {formatTime(elapsed)} • {completedSets}/{totalSets} séries faites
            </p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowFinish(false)}>
                Continuer
              </button>
              <button className="primary-btn" style={{ flex: 1 }} onClick={finishSession}>
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
