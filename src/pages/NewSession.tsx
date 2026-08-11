import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS } from '../lib/exercises';
import type { Exercise, ExerciseLog } from '../types';
import { ArrowLeft, Plus, Minus, Check, X, Zap, Timer } from 'lucide-react';

export default function NewSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'config'>('select');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<
    { exercise: Exercise; targetSets: number; targetTotal: number }[]
  >([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState<Exercise['category']>('push');
  const [showAmrap, setShowAmrap] = useState(false);
  const [amrapMinutes, setAmrapMinutes] = useState(20);

  useEffect(() => {
    if (user) loadCustomExercises();
  }, [user]);

  async function loadCustomExercises() {
    if (!user) return;
    const q = query(collection(db, 'customExercises'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    setCustomExercises(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
  }

  async function addCustomExercise() {
    if (!newExName.trim() || !user) return;
    const docRef = await addDoc(collection(db, 'customExercises'), {
      name: newExName.trim(),
      category: newExCategory,
      isCustom: true,
      userId: user.uid,
    });
    const newEx: Exercise = {
      id: docRef.id,
      name: newExName.trim(),
      category: newExCategory,
      isCustom: true,
    };
    setCustomExercises((prev) => [...prev, newEx]);
    setNewExName('');
    setShowAddExercise(false);
  }

  async function startAmrap() {
    if (!user) return;
    const now = Date.now();
    const exercises: ExerciseLog[] = [
      { exerciseId: 'pull-ups', exerciseName: 'Tractions', exerciseCategory: 'pull', targetSets: 1, targetReps: 5, sets: [{ reps: 0, completed: false }] },
      { exerciseId: 'push-ups', exerciseName: 'Pompes', exerciseCategory: 'push', targetSets: 1, targetReps: 10, sets: [{ reps: 0, completed: false }] },
      { exerciseId: 'squats', exerciseName: 'Squats', exerciseCategory: 'legs', targetSets: 1, targetReps: 15, sets: [{ reps: 0, completed: false }] },
    ];

    const docRef = await addDoc(collection(db, 'sessions'), {
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: false,
      createdAt: now,
      startedAt: now,
      duration: 0,
      mode: 'amrap',
      amrapDuration: amrapMinutes * 60,
      amrapRounds: 0,
    });

    navigate(`/session/${docRef.id}`);
  }

  function getAllExercises(): Exercise[] {
    return [...DEFAULT_EXERCISES, ...customExercises];
  }

  function toggleExercise(ex: Exercise) {
    setSelectedExercises((prev) =>
      prev.find((e) => e.id === ex.id) ? prev.filter((e) => e.id !== ex.id) : [...prev, ex]
    );
  }

  function goToConfig() {
    setExerciseConfigs(
      selectedExercises.map((ex) => ({ exercise: ex, targetSets: 4, targetTotal: 40 }))
    );
    setStep('config');
  }

  function updateConfig(index: number, field: 'targetSets' | 'targetTotal', delta: number) {
    setExerciseConfigs((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const newVal = Math.max(1, c[field] + delta);
        return { ...c, [field]: newVal };
      })
    );
  }

  async function startSession() {
    const now = Date.now();
    const exercises: ExerciseLog[] = exerciseConfigs.map((c) => {
      const repsPerSet = Math.ceil(c.targetTotal / c.targetSets);
      return {
        exerciseId: c.exercise.id,
        exerciseName: c.exercise.name,
        exerciseCategory: c.exercise.category,
        targetSets: c.targetSets,
        targetReps: repsPerSet,
        sets: Array.from({ length: c.targetSets }, () => ({ reps: 0, completed: false })),
      };
    });

    const docRef = await addDoc(collection(db, 'sessions'), {
      userId: user!.uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: false,
      createdAt: now,
      startedAt: now,
      duration: 0,
    });

    navigate(`/session/${docRef.id}`);
  }

  const allExercises = getAllExercises();
  const categories = [...new Set(allExercises.map((e) => e.category))] as Exercise['category'][];

  if (step === 'select') {
    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <h1>Choisis tes exercices</h1>
          <div />
        </header>

        <section className="section">
          <div className="cindy-card" onClick={() => setShowAmrap(true)}>
            <div className="cindy-card-left">
              <Zap size={22} className="cindy-icon" />
              <div>
                <h3>Cindy (AMRAP)</h3>
                <span className="cindy-desc">5 tractions • 10 pompes • 15 squats</span>
              </div>
            </div>
            <span className="cindy-badge">WOD</span>
          </div>
        </section>

        {showAmrap && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-card-header">
                <h3>Cindy — AMRAP</h3>
                <button className="icon-btn" onClick={() => setShowAmrap(false)}>
                  <X size={18} />
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Max de rounds en temps limité :<br />5 tractions + 10 pompes + 15 squats
              </p>
              <div className="amrap-time-picker">
                <button className="time-picker-arrow" onClick={() => setAmrapMinutes((m) => Math.max(1, m - 1))}>
                  <Minus size={18} />
                </button>
                <div className="amrap-time-display">
                  <Timer size={18} />
                  <span>{amrapMinutes} min</span>
                </div>
                <button className="time-picker-arrow" onClick={() => setAmrapMinutes((m) => Math.min(60, m + 1))}>
                  <Plus size={18} />
                </button>
              </div>
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="secondary-btn" onClick={() => setShowAmrap(false)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={startAmrap}>
                  Lancer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="section-divider">
          <span>ou choisis tes exercices</span>
        </div>

        {categories.map((cat) => (
          <section key={cat} className="section">
            <h3 className="category-title">{CATEGORY_LABELS[cat]}</h3>
            <div className="exercise-grid">
              {allExercises.filter((e) => e.category === cat).map((ex) => (
                <button
                  key={ex.id}
                  className={`exercise-chip ${selectedExercises.find((e) => e.id === ex.id) ? 'selected' : ''}`}
                  onClick={() => toggleExercise(ex)}
                >
                  {ex.name}
                  {selectedExercises.find((e) => e.id === ex.id) && <Check size={14} />}
                </button>
              ))}
            </div>
          </section>
        ))}

        <button className="add-exercise-btn" onClick={() => setShowAddExercise(true)}>
          <Plus size={16} /> Ajouter un exercice
        </button>

        {showAddExercise && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-card-header">
                <h3>Nouvel exercice</h3>
                <button className="icon-btn" onClick={() => setShowAddExercise(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="add-exercise-form">
                <input
                  type="text"
                  placeholder="Nom de l'exercice"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  autoFocus
                />
                <div className="category-picker">
                  {(Object.entries(CATEGORY_LABELS) as [Exercise['category'], string][]).map(([key, label]) => (
                    <button
                      key={key}
                      className={`category-chip ${newExCategory === key ? 'active' : ''}`}
                      onClick={() => setNewExCategory(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowAddExercise(false)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={addCustomExercise} disabled={!newExName.trim()}>
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedExercises.length > 0 && (
          <button className="primary-btn floating-btn" onClick={goToConfig}>
            Configurer ({selectedExercises.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => setStep('select')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Objectifs</h1>
        <div />
      </header>

      <div className="config-list">
        {exerciseConfigs.map((config, i) => {
          const repsPerSet = Math.ceil(config.targetTotal / config.targetSets);
          return (
            <div key={config.exercise.id} className="config-card">
              <h3>{config.exercise.name}</h3>
              <div className="config-row">
                <span>Objectif total</span>
                <div className="stepper">
                  <button onClick={() => updateConfig(i, 'targetTotal', -5)}>
                    <Minus size={16} />
                  </button>
                  <span>{config.targetTotal}</span>
                  <button onClick={() => updateConfig(i, 'targetTotal', 5)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="config-row">
                <span>Séries</span>
                <div className="stepper">
                  <button onClick={() => updateConfig(i, 'targetSets', -1)}>
                    <Minus size={16} />
                  </button>
                  <span>{config.targetSets}</span>
                  <button onClick={() => updateConfig(i, 'targetSets', 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="config-result">
                → {repsPerSet} reps / série
              </div>
            </div>
          );
        })}
      </div>

      <button className="primary-btn floating-btn" onClick={startSession}>
        Lancer la séance
      </button>
    </div>
  );
}
