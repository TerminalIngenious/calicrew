import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Session } from '../types';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number>(0);

  useEffect(() => {
    loadSession();
  }, [id]);

  async function loadSession() {
    if (!id) return;
    const snap = await getDoc(doc(db, 'sessions', id));
    if (snap.exists()) {
      setSession({ id: snap.id, ...snap.data() } as Session);
    }
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
    }

    const allDone = updated.exercises.every((ex) => ex.sets.every((s) => s.completed));
    updated.completed = allDone;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
      completed: updated.completed,
    });
  }

  async function adjustReps(exerciseIndex: number, setIndex: number, delta: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const set = updated.exercises[exerciseIndex].sets[setIndex];
    set.reps = Math.max(0, set.reps + delta);
    set.completed = set.reps > 0;

    const allDone = updated.exercises.every((ex) => ex.sets.every((s) => s.completed));
    updated.completed = allDone;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
      completed: updated.completed,
    });
  }

  if (!session) return <div className="page loading">Chargement...</div>;

  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Séance en cours</h1>
        <div />
      </header>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">
          {completedSets}/{totalSets} séries
        </span>
      </div>

      {session.completed && (
        <div className="completion-banner">
          <Trophy size={24} />
          <span>Séance terminée ! Bravo 🔥</span>
        </div>
      )}

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
                        <button
                          className="reps-btn"
                          onClick={() => adjustReps(exIdx, setIdx, -1)}
                        >
                          −
                        </button>
                        <span className="reps-value">{set.reps}</span>
                        <button
                          className="reps-btn"
                          onClick={() => adjustReps(exIdx, setIdx, 1)}
                        >
                          +
                        </button>
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
    </div>
  );
}
