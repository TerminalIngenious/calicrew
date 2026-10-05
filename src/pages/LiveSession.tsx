import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session, SetUnit, Exercise, ExerciseLog } from '../types';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Timer, Square, Play, Settings, Calendar, Trash2, Pencil, Plus, Minus, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS, DEFAULT_EXERCISES } from '../lib/exercises';
import { amrapTitle, circuitLabel, materializeAmrapSets, repsPerRound, roundTotals } from '../lib/amrap';
import { sportCoXp } from '../lib/passes';
import { sessionReps, getUnit, unitLabel, isTimeBased, setWeight } from '../lib/stats';

/** Pas d'incrément : 5 s pour un isométrique, 1 rep sinon. */
function setStep(ex: { unit?: SetUnit }): number {
  return isTimeBased(ex) ? 5 : 1;
}
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
  const { user } = useAuth();
  const { refresh } = useUserSessions();
  const [session, setSession] = useState<Session | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number>(0);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);

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

  // AMRAP
  const [amrapRounds, setAmrapRounds] = useState(0);
  const [amrapTimeUp, setAmrapTimeUp] = useState(false);

  // Confirmation terminer
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [pickedExercise, setPickedExercise] = useState<Exercise | null>(null);
  const [newExSets, setNewExSets] = useState(4);
  const [newExTarget, setNewExTarget] = useState(10);
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
    if (session && session.amrapRounds !== undefined) setAmrapRounds(session.amrapRounds);
    if (session && session.startedAt && !session.completed) {
      startTimeRef.current = session.startedAt;
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
      timerRef.current = setInterval(() => {
        const now = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(now);
        if (session.mode === 'amrap' && session.amrapDuration && now >= session.amrapDuration && !amrapTimeUp) {
          setAmrapTimeUp(true);
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        }
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

  /** La charge peut évoluer d'une série à l'autre (montée en pyramide, dégressif). */
  async function adjustSetWeight(exerciseIndex: number, setIndex: number, delta: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    const set = ex.sets[setIndex];
    set.weight = Math.max(0, Math.round((setWeight(ex, set) + delta) * 2) / 2);

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  /** Ajoute une série, en reprenant la charge de la dernière. */
  async function addSet(exerciseIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    const last = ex.sets[ex.sets.length - 1];

    ex.sets = [...ex.sets, { reps: 0, completed: false, ...(last ? { weight: setWeight(ex, last) } : {}) }];
    ex.targetSets = ex.sets.length;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  /**
   * Retire la dernière série. Refusée si elle est validée : on ne supprime
   * jamais une performance déjà enregistrée sans que ce soit explicite.
   */
  async function removeSet(exerciseIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    if (ex.sets.length <= 1 || ex.sets[ex.sets.length - 1].completed) return;

    ex.sets = ex.sets.slice(0, -1);
    ex.targetSets = ex.sets.length;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  async function openAddExercise() {
    setPickedExercise(null);
    setShowAddExercise(true);
    if (!user || customExercises.length > 0) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'customExercises'), where('userId', '==', user.uid))
      );
      setCustomExercises(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
    } catch {
      setCustomExercises([]);
    }
  }

  function pickExercise(ex: Exercise) {
    setPickedExercise(ex);
    setNewExSets(4);
    setNewExTarget(ex.defaultUnit === 'seconds' ? 30 : 10);
  }

  /** Ajoute un exercice oublié au moment de préparer la séance. */
  async function addExerciseToSession(exercise: Exercise, sets: number, target: number) {
    if (!session || !id) return;
    const log: ExerciseLog = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseCategory: exercise.category,
      targetSets: sets,
      targetReps: target,
      sets: Array.from({ length: sets }, () => ({ reps: 0, completed: false })),
    };
    if (exercise.defaultUnit === 'seconds') log.unit = 'seconds';

    const exercises = [...session.exercises, log];
    setSession({ ...session, exercises });
    setExpandedExercise(exercises.length - 1);
    setShowAddExercise(false);
    await updateDoc(doc(db, 'sessions', id), { exercises });
  }

  /** Retire un exercice ajouté par erreur. */
  async function removeExerciseFromSession(exerciseIndex: number) {
    if (!session || !id) return;
    const exercises = session.exercises.filter((_, i) => i !== exerciseIndex);
    setSession({ ...session, exercises });
    setExpandedExercise(-1);
    await updateDoc(doc(db, 'sessions', id), { exercises });
  }

  async function addAmrapRound() {
    if (!session || !id) return;
    const newRounds = amrapRounds + 1;
    setAmrapRounds(newRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds: newRounds });
  }

  async function removeAmrapRound() {
    if (!session || !id || amrapRounds <= 0) return;
    const newRounds = amrapRounds - 1;
    setAmrapRounds(newRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds: newRounds });
  }

  function editReps(exIdx: number, setIdx: number, value: number) {
    if (!session) return;
    const updated = { ...session, exercises: session.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => {
        if (si !== setIdx) return s;
        return { reps: value, completed: value > 0 };
      })};
    })};
    setSession(updated);
  }

  async function saveEdits() {
    if (!session || !id) return;
    await updateDoc(doc(db, 'sessions', id), { exercises: session.exercises });
    await refresh();
    setEditing(false);
  }

  async function saveAmrapEdit() {
    if (!session || !id) return;
    const exercises = materializeAmrapSets(session.exercises, amrapRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds, exercises });
    setSession({ ...session, amrapRounds, exercises });
    await refresh();
    setEditing(false);
  }

  async function deleteSession() {
    if (!id) return;
    await deleteDoc(doc(db, 'sessions', id));
    await refresh();
    navigate('/');
  }

  async function finishSession() {
    if (!session || !id) return;
    const duration = Math.floor((Date.now() - (session.startedAt || session.createdAt)) / 1000);
    const isAmrapSession = session.mode === 'amrap';
    // Un AMRAP ne logue rien pendant l'effort : on matérialise ici les tours
    // en séries, sinon ses reps ne compteraient ni dans les classements ni
    // dans les quêtes.
    const exercises = isAmrapSession
      ? materializeAmrapSets(session.exercises, amrapRounds)
      : session.exercises;
    const updateData: Record<string, unknown> = { completed: true, duration, exercises };
    if (isAmrapSession) updateData.amrapRounds = amrapRounds;
    setSession({ ...session, exercises });
    await updateDoc(doc(db, 'sessions', id), updateData);

    try {
      await updateDoc(doc(db, 'userProgress', session.userId), {
        chestsToOpen: arrayUnion({ rarity: 'commune', pool: 'current' }),
      });
    } catch {
      // userProgress might not exist yet
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    setShowFinish(false);
  }

  if (!session) return <div className="page loading"><Loader /></div>;

  // Running, vélo et sport co ont besoin du formulaire distance/temps : on ne
  // peut pas les ajouter à une séance en séries/reps déjà lancée.
  const inSession = new Set(session.exercises.map((e) => e.exerciseId));
  const addableExercises = [...DEFAULT_EXERCISES, ...customExercises].filter(
    (e) =>
      e.category !== 'running' &&
      e.category !== 'velo' &&
      e.category !== 'sportco' &&
      !inSession.has(e.id)
  );
  const addableCategories = [...new Set(addableExercises.map((e) => e.category))];

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const displayDuration = session.duration && session.duration > 0 ? session.duration : elapsed;

  if (finished) {
    const totalReps = sessionReps(session);
    const categories = [...new Set(session.exercises.map((e) => e.exerciseCategory || '').filter(Boolean))];
    const categoryLabel = categories.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] || c).join(', ');
    const isAmrap = session.mode === 'amrap';
    const displayRounds = editing ? amrapRounds : (session.amrapRounds || amrapRounds);

    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Récap {isAmrap ? amrapTitle(session.amrapName) : 'séance'}</h1>
          <button className="icon-btn" onClick={() => editing ? (isAmrap ? saveAmrapEdit() : saveEdits()) : setEditing(true)}>
            {editing ? <Check size={20} /> : <Pencil size={18} />}
          </button>
        </header>

        <div className="recap-header-card">
          <div className="recap-date-row">
            <Calendar size={16} />
            <span>{format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
          </div>
          {isAmrap ? (
            <span className="recap-categories">AMRAP — {session.amrapDuration ? Math.floor(session.amrapDuration / 60) : 20} min</span>
          ) : (
            categoryLabel && <span className="recap-categories">{categoryLabel}</span>
          )}
          <div className="recap-stats-row">
            <div className="recap-mini-stat">
              <Timer size={14} />
              <span>{formatTime(displayDuration)}</span>
            </div>
            {isAmrap ? (
              <div className="recap-mini-stat">
                <span className="recap-mini-value">{displayRounds}</span>
                <span>rounds</span>
              </div>
            ) : (
              <>
                <div className="recap-mini-stat">
                  <span className="recap-mini-value">{totalReps}</span>
                  <span>reps</span>
                </div>
                <div className="recap-mini-stat">
                  <span className="recap-mini-value">{completedSets}/{totalSets}</span>
                  <span>séries</span>
                </div>
              </>
            )}
          </div>
          {!isAmrap && (
            <div className="recap-progress-bar">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {isAmrap ? (
          <div className="recap-exercise-card">
            <div className="recap-exercise-header">
              <div>
                <h3>Par round</h3>
                <span className="recap-exercise-sub">{circuitLabel(session.exercises)}</span>
              </div>
            </div>
            {editing ? (
              <div className="amrap-edit-rounds" style={{ marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rounds</span>
                <div className="stepper">
                  <button onClick={() => setAmrapRounds((r) => Math.max(0, r - 1))}><Minus size={16} /></button>
                  <span>{amrapRounds}</span>
                  <button onClick={() => setAmrapRounds((r) => r + 1)}><Plus size={16} /></button>
                </div>
              </div>
            ) : null}
            <div className="recap-stats-row" style={{ marginTop: '0.75rem' }}>
              <div className="recap-mini-stat">
                <span className="recap-mini-value">{displayRounds * repsPerRound(session.exercises)}</span>
                <span>reps totales</span>
              </div>
              {roundTotals(session.exercises, displayRounds).map((t, i) => (
                <div key={i} className="recap-mini-stat">
                  <span className="recap-mini-value">{t.total}</span>
                  <span>{t.unit === 'sec' ? `s de ${t.name}` : t.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="recap-exercises">
            {session.exercises.map((ex, exIdx) => {
              if (ex.exerciseCategory === 'sportco') {
                return (
                  <div key={exIdx} className="recap-exercise-card">
                    <div className="recap-exercise-header">
                      <div>
                        <h3>{ex.exerciseName}</h3>
                      </div>
                      <span className="recap-exercise-badge done">Complété</span>
                    </div>
                    <div className="recap-stats-row" style={{ marginTop: '0.75rem' }}>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDuration ? Math.floor(ex.runDuration / 60) : 0}</span>
                        <span>min</span>
                      </div>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">+{sportCoXp(ex.runDuration || 0)}</span>
                        <span>XP</span>
                      </div>
                    </div>
                  </div>
                );
              }
              if (ex.exerciseCategory === 'running' || ex.exerciseCategory === 'velo') {
                const isVelo = ex.exerciseCategory === 'velo';
                const paceMin = ex.runDistance && ex.runDistance > 0 && ex.runDuration
                  ? ex.runDuration / 60 / ex.runDistance : 0;
                const paceM = Math.floor(paceMin);
                const paceS = Math.round((paceMin - paceM) * 60);
                const speed = ex.runDuration && ex.runDuration > 0
                  ? (ex.runDistance || 0) / (ex.runDuration / 3600) : 0;
                return (
                  <div key={exIdx} className="recap-exercise-card">
                    <div className="recap-exercise-header">
                      <div>
                        <h3>{ex.exerciseName}</h3>
                      </div>
                      <span className="recap-exercise-badge done">Complété</span>
                    </div>
                    <div className="recap-stats-row" style={{ marginTop: '0.75rem' }}>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDuration ? Math.floor(ex.runDuration / 60) : 0}</span>
                        <span>min</span>
                      </div>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDistance || 0}</span>
                        <span>km</span>
                      </div>
                      {isVelo ? (
                        speed > 0 && (
                          <div className="recap-mini-stat">
                            <span className="recap-mini-value">{speed.toFixed(1)}</span>
                            <span>km/h</span>
                          </div>
                        )
                      ) : (
                        paceMin > 0 && (
                          <div className="recap-mini-stat">
                            <span className="recap-mini-value">{paceM}:{String(paceS).padStart(2, '0')}</span>
                            <span>min/km</span>
                          </div>
                        )
                      )}
                      {(ex.runElevation || 0) > 0 && (
                        <div className="recap-mini-stat">
                          <span className="recap-mini-value">{ex.runElevation}</span>
                          <span>m D+</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const exCompletedSets = ex.sets.filter((s) => s.completed).length;
              const exTotalReps = ex.sets.reduce((s, set) => s + (set.completed ? set.reps : 0), 0);
              const allDone = exCompletedSets === ex.sets.length;

              return (
                <div key={exIdx} className="recap-exercise-card">
                  <div className="recap-exercise-header">
                    <div>
                      <h3>{ex.exerciseName}</h3>
                      <span className="recap-exercise-sub">
                        Objectif : {ex.targetReps} reps × {ex.sets.length} séries{ex.weighted && ex.weight ? ` • ${ex.weight} kg${ex.weightType === 'halteres' ? ' (haltères)' : ex.weightType === 'barre' ? ' (barre)' : ''}` : ''}
                      </span>
                    </div>
                    <span className={`recap-exercise-badge ${allDone ? 'done' : 'partial'}`}>
                      {allDone ? 'Complet' : `${exCompletedSets}/${ex.sets.length}`}
                    </span>
                  </div>
                  <div className="recap-sets-grid">
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className={`recap-set ${set.completed ? 'completed' : 'missed'} ${editing ? 'editing' : ''}`}>
                        <span className="recap-set-label">S{setIdx + 1}</span>
                        {editing ? (
                          <input
                            type="number"
                            className="recap-set-input"
                            value={set.reps}
                            onChange={(e) => editReps(exIdx, setIdx, Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        ) : (
                          <span className="recap-set-reps">{set.completed ? set.reps : '—'}</span>
                        )}
                        {!editing && set.completed && set.reps >= ex.targetReps && (
                          <Check size={12} className="recap-set-check" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="recap-exercise-total">
                    Total : {exTotalReps} {unitLabel(getUnit(ex))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="recap-actions">
          <button className="primary-btn" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
          <button className="delete-session-btn" onClick={() => setShowDelete(true)}>
            <Trash2 size={16} /> Supprimer la séance
          </button>
        </div>

        {showDelete && (
          <div className="modal-overlay" onClick={() => setShowDelete(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Supprimer cette séance ?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Elle sera retirée de tes stats, du classement et des quêtes.
              </p>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowDelete(false)}>
                  Annuler
                </button>
                <button className="primary-btn" style={{ flex: 1, background: '#ef4444' }} onClick={deleteSession}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode AMRAP live
  if (session.mode === 'amrap') {
    const amrapTotal = session.amrapDuration || 1200;
    const remaining = Math.max(0, amrapTotal - elapsed);
    const amrapProgress = ((amrapTotal - remaining) / amrapTotal) * 100;

    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>{amrapTitle(session.amrapName)}</h1>
          <div className="session-timer">
            <Timer size={16} />
            <span>{formatTime(elapsed)}</span>
          </div>
        </header>

        <div className={`amrap-countdown ${remaining <= 10 ? 'ending' : ''}`}>
          <span className="amrap-countdown-label">{remaining > 0 ? 'Temps restant' : 'Temps écoulé !'}</span>
          <span className="amrap-countdown-value">{formatTime(remaining)}</span>
          <div className="recap-progress-bar" style={{ marginTop: '0.75rem' }}>
            <div className="progress-bar" style={{ width: `${amrapProgress}%` }} />
          </div>
        </div>

        <div className="amrap-round-section">
          <div className="amrap-round-count-row">
            <span className="amrap-round-count">{amrapRounds}</span>
            <span className="amrap-round-count-label">round{amrapRounds > 1 ? 's' : ''}</span>
          </div>
          <button className="amrap-validate-btn" onClick={addAmrapRound}>
            <Check size={24} /> Round complété !
          </button>
          {amrapRounds > 0 && (
            <button className="amrap-undo-btn" onClick={removeAmrapRound}>
              Annuler le dernier
            </button>
          )}
          <span className="amrap-round-detail">
            {amrapRounds * repsPerRound(session.exercises)} reps
            {amrapRounds > 0 && ` — ${roundTotals(session.exercises, amrapRounds)
              .map((t) => `${t.total} ${t.unit === 'sec' ? 's de ' : ''}${t.name}`)
              .join(' + ')}`}
          </span>
        </div>

        <div className="amrap-exercises-reminder">
          <h3>1 round =</h3>
          {session.exercises.map((ex, i) => (
            <div key={`${ex.exerciseId}-${i}`} className="amrap-exercise-row">
              <span className="amrap-ex-reps">
                {ex.unit === 'seconds' ? `${ex.targetReps} s` : `${ex.targetReps}×`}
              </span>
              <span>{ex.exerciseName}</span>
            </div>
          ))}
        </div>

        <button className="finish-btn floating-btn" onClick={() => setShowFinish(true)}>
          Terminer
        </button>

        {showFinish && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Terminer {amrapTitle(session.amrapName)} ?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {amrapRounds} round{amrapRounds > 1 ? 's' : ''} en {formatTime(elapsed)}
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
            <div className="rest-time-picker">
              <div className="time-picker-col">
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.min(599, d + 60))}>
                  <ChevronUp size={20} />
                </button>
                <span className="time-picker-value">{String(Math.floor(restDuration / 60)).padStart(2, '0')}</span>
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.max(5, d - 60))}>
                  <ChevronDown size={20} />
                </button>
                <span className="time-picker-label">min</span>
              </div>
              <span className="time-picker-sep">:</span>
              <div className="time-picker-col">
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.min(599, d + 5))}>
                  <ChevronUp size={20} />
                </button>
                <span className="time-picker-value">{String(restDuration % 60).padStart(2, '0')}</span>
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.max(5, d - 5))}>
                  <ChevronDown size={20} />
                </button>
                <span className="time-picker-label">sec</span>
              </div>
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
                  <h3>{ex.exerciseName}{ex.weighted && ex.weight ? ` (${ex.weight} kg${ex.weightType === 'halteres' ? ' haltères' : ex.weightType === 'barre' ? ' barre' : ''})` : ''}</h3>
                  <span className="exercise-progress-text">
                    {exCompleted}/{exTotal} séries • {remaining > 0 ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Terminé ✓'}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && exCompleted === 0 && session.exercises.length > 1 && (
                <button
                  className="remove-exercise-btn"
                  onClick={() => removeExerciseFromSession(exIdx)}
                >
                  <Trash2 size={13} /> Retirer cet exercice
                </button>
              )}

              {isExpanded && (
                <div className="sets-grid">
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className={`set-item ${set.completed ? 'completed' : ''}`}>
                      <div className="set-header">
                        <span className="set-label">Série {setIdx + 1}</span>
                        <span className="set-target">
                          Obj: {ex.targetReps}{isTimeBased(ex) ? ' s' : ''}
                        </span>
                      </div>
                      <div className="set-controls">
                        <button className="reps-btn" onClick={() => adjustReps(exIdx, setIdx, -setStep(ex))}>−</button>
                        <span className="reps-value">{set.reps}{isTimeBased(ex) ? ' s' : ''}</span>
                        <button className="reps-btn" onClick={() => adjustReps(exIdx, setIdx, setStep(ex))}>+</button>
                      </div>
                      <div className="set-weight">
                        <button className="set-weight-btn" onClick={() => adjustSetWeight(exIdx, setIdx, -0.5)}>−</button>
                        <span className="set-weight-value">
                          {setWeight(ex, set) > 0 ? `${setWeight(ex, set)} kg` : '—'}
                        </span>
                        <button className="set-weight-btn" onClick={() => adjustSetWeight(exIdx, setIdx, 0.5)}>+</button>
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

              {isExpanded && (() => {
                const lastDone = ex.sets[ex.sets.length - 1]?.completed;
                return (
                  <div className="set-count-row">
                    <span className="set-count-label">Séries</span>
                    <div className="stepper">
                      <button
                        onClick={() => removeSet(exIdx)}
                        disabled={ex.sets.length <= 1 || lastDone}
                        title={lastDone ? 'Dévalide la dernière série pour la retirer' : undefined}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{ex.sets.length}</span>
                      <button onClick={() => addSet(exIdx)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <button className="add-exercise-live-btn" onClick={openAddExercise}>
        <Plus size={16} /> Ajouter un exercice
      </button>

      {showAddExercise && (
        <div className="modal-overlay" onClick={() => setShowAddExercise(false)}>
          <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explore-modal-header">
              <h3>{pickedExercise ? pickedExercise.name : 'Ajouter un exercice'}</h3>
              <button className="member-modal-close" onClick={() => setShowAddExercise(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="explore-results" style={{ padding: '0.5rem 1.25rem 1.5rem' }}>
              {pickedExercise ? (
                <>
                  <button className="trade-back-btn" onClick={() => setPickedExercise(null)}>
                    ← Retour
                  </button>
                  <div className="config-row">
                    <span>Séries</span>
                    <div className="stepper">
                      <button onClick={() => setNewExSets((n) => Math.max(1, n - 1))}><Minus size={16} /></button>
                      <span>{newExSets}</span>
                      <button onClick={() => setNewExSets((n) => n + 1)}><Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="config-row">
                    <span>{pickedExercise.defaultUnit === 'seconds' ? 'Secondes / série' : 'Reps / série'}</span>
                    <div className="stepper">
                      <button onClick={() => setNewExTarget((n) => Math.max(1, n - (pickedExercise.defaultUnit === 'seconds' ? 5 : 1)))}><Minus size={16} /></button>
                      <span>{newExTarget}{pickedExercise.defaultUnit === 'seconds' ? ' s' : ''}</span>
                      <button onClick={() => setNewExTarget((n) => n + (pickedExercise.defaultUnit === 'seconds' ? 5 : 1))}><Plus size={16} /></button>
                    </div>
                  </div>
                  <button
                    className="primary-btn"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => addExerciseToSession(pickedExercise, newExSets, newExTarget)}
                  >
                    Ajouter à la séance
                  </button>
                </>
              ) : (
                addableCategories.map((cat) => (
                  <div key={cat} className="category-section">
                    <h3 className="category-title">{CATEGORY_LABELS[cat]}</h3>
                    <div className="exercise-grid">
                      {addableExercises
                        .filter((e) => e.category === cat)
                        .map((ex) => (
                          <button
                            key={ex.id}
                            className="exercise-chip"
                            onClick={() => pickExercise(ex)}
                          >
                            {ex.name}
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
