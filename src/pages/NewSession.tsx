import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS } from '../lib/exercises';
import type { Exercise, ExerciseLog } from '../types';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react';

export default function NewSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'config'>('select');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<
    { exercise: Exercise; targetSets: number; targetTotal: number }[]
  >([]);

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

  const categories = [...new Set(DEFAULT_EXERCISES.map((e) => e.category))] as Exercise['category'][];

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

        {categories.map((cat) => (
          <section key={cat} className="section">
            <h3 className="category-title">{CATEGORY_LABELS[cat]}</h3>
            <div className="exercise-grid">
              {DEFAULT_EXERCISES.filter((e) => e.category === cat).map((ex) => (
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
