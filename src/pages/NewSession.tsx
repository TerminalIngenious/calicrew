import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS } from '../lib/exercises';
import type { Exercise, ExerciseLog, WeightType, Program } from '../types';
import { ArrowLeft, Plus, Minus, Check, X, Zap, Timer, Weight, Mountain, Route, Gauge, ClipboardList, Pencil, Trash2 } from 'lucide-react';

export default function NewSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'config'>('select');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<
    { exercise: Exercise; targetSets: number; targetTotal: number; weighted: boolean; weight: number; weightType: WeightType }[]
  >([]);
  const [runningConfigs, setRunningConfigs] = useState<
    { exercise: Exercise; duration: number; distance: number; elevation: number }[]
  >([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState<Exercise['category']>('push');
  const [newExWeighted, setNewExWeighted] = useState(false);
  const [addingExo, setAddingExo] = useState(false);
  const [editingExo, setEditingExo] = useState<Exercise | null>(null);
  const [editExoName, setEditExoName] = useState('');
  const [editExoCategory, setEditExoCategory] = useState<Exercise['category']>('push');
  const [editExoWeighted, setEditExoWeighted] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAmrap, setShowAmrap] = useState(false);
  const [amrapMinutes, setAmrapMinutes] = useState(20);
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (user) {
      loadCustomExercises();
      loadPrograms();
    }
  }, [user]);

  async function loadPrograms() {
    if (!user) return;
    try {
      const snap = await getDocs(query(collection(db, 'programs'), where('createdBy', '==', user.uid)));
      setMyPrograms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
    } catch {
      setMyPrograms([]);
    }
  }

  async function startFromProgram(prog: Program) {
    if (!user) return;
    const now = Date.now();
    const exercises: ExerciseLog[] = prog.exercises.map((ex) => {
      const log: ExerciseLog = {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseCategory: ex.exerciseCategory,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        sets: Array.from({ length: ex.targetSets }, () => ({ reps: 0, completed: false })),
      };
      if (ex.weighted && ex.weight) {
        log.weighted = true;
        log.weight = ex.weight;
        log.weightType = ex.weightType;
      }
      return log;
    });
    const docRef = await addDoc(collection(db, 'sessions'), {
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: false,
      createdAt: now,
      startedAt: now,
      duration: 0,
    });
    navigate(`/session/${docRef.id}`);
  }

  async function loadCustomExercises() {
    if (!user) return;
    const q = query(collection(db, 'customExercises'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    setCustomExercises(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
  }

  async function addCustomExercise() {
    if (!newExName.trim() || !user || addingExo) return;
    setAddingExo(true);
    try {
      const docRef = await addDoc(collection(db, 'customExercises'), {
        name: newExName.trim(),
        category: newExCategory,
        isCustom: true,
        canBeWeighted: newExWeighted,
        userId: user.uid,
      });
      const newEx: Exercise = {
        id: docRef.id,
        name: newExName.trim(),
        category: newExCategory,
        isCustom: true,
        canBeWeighted: newExWeighted,
      };
      setCustomExercises((prev) => [...prev, newEx]);
      setNewExName('');
      setNewExWeighted(false);
      setShowAddExercise(false);
    } catch (err) {
      console.error('Erreur ajout exercice:', err);
      alert('Erreur lors de l\'ajout. Vérifie les règles Firestore.');
    }
    setAddingExo(false);
  }

  function openEditExo(ex: Exercise) {
    setEditingExo(ex);
    setEditExoName(ex.name);
    setEditExoCategory(ex.category);
    setEditExoWeighted(ex.canBeWeighted || false);
  }

  async function saveEditExo() {
    if (!editingExo || !editExoName.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'customExercises', editingExo.id), {
        name: editExoName.trim(),
        category: editExoCategory,
        canBeWeighted: editExoWeighted,
      });
      setCustomExercises((prev) =>
        prev.map((e) => e.id === editingExo.id
          ? { ...e, name: editExoName.trim(), category: editExoCategory, canBeWeighted: editExoWeighted }
          : e
        )
      );
      setEditingExo(null);
    } catch (err) {
      console.error('Erreur modification exercice:', err);
    }
    setSavingEdit(false);
  }

  async function deleteCustomExo(ex: Exercise) {
    if (!confirm(`Supprimer "${ex.name}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'customExercises', ex.id));
      setCustomExercises((prev) => prev.filter((e) => e.id !== ex.id));
      setSelectedExercises((prev) => prev.filter((e) => e.id !== ex.id));
    } catch (err) {
      console.error('Erreur suppression exercice:', err);
    }
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
    const normal = selectedExercises.filter((ex) => ex.category !== 'running');
    const running = selectedExercises.filter((ex) => ex.category === 'running');
    setExerciseConfigs(
      normal.map((ex) => ({ exercise: ex, targetSets: 4, targetTotal: 40, weighted: false, weight: 0, weightType: 'body' as WeightType }))
    );
    setRunningConfigs(
      running.map((ex) => ({ exercise: ex, duration: 30, distance: 5, elevation: 0 }))
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
    const normalExercises: ExerciseLog[] = exerciseConfigs.map((c) => {
      const repsPerSet = Math.ceil(c.targetTotal / c.targetSets);
      const log: ExerciseLog = {
        exerciseId: c.exercise.id,
        exerciseName: c.exercise.name,
        exerciseCategory: c.exercise.category,
        targetSets: c.targetSets,
        targetReps: repsPerSet,
        sets: Array.from({ length: c.targetSets }, () => ({ reps: 0, completed: false })),
      };
      if (c.weighted) {
        log.weighted = true;
        log.weight = c.weight;
        log.weightType = c.weightType;
      }
      return log;
    });

    const runningExercises: ExerciseLog[] = runningConfigs.map((c) => ({
      exerciseId: c.exercise.id,
      exerciseName: c.exercise.name,
      exerciseCategory: 'running',
      targetSets: 1,
      targetReps: 1,
      sets: [{ reps: 1, completed: true }],
      runDuration: c.duration * 60,
      runDistance: c.distance,
      runElevation: c.elevation || 0,
    }));

    const exercises = [...normalExercises, ...runningExercises];
    const isRunningOnly = exerciseConfigs.length === 0;
    const totalRunDuration = runningConfigs.reduce((sum, c) => sum + c.duration * 60, 0);

    if (isRunningOnly) {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user!.uid,
        date: new Date().toISOString().split('T')[0],
        exercises,
        completed: true,
        createdAt: now,
        startedAt: now,
        duration: totalRunDuration,
      });
      navigate(`/session/${docRef.id}`);
    } else {
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

        {myPrograms.length > 0 && (
          <section className="section">
            <h3 className="category-title"><ClipboardList size={16} style={{ marginRight: 6 }} />Programmes</h3>
            <div className="programs-quick-list">
              {myPrograms.map((prog) => (
                <button key={prog.id} className="program-quick-card" onClick={() => startFromProgram(prog)}>
                  <span className="program-quick-name">{prog.name}</span>
                  <span className="program-quick-info">{prog.exercises.length} exos</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="section-divider">
          <span>ou choisis tes exercices</span>
        </div>

        {categories.map((cat) => (
          <section key={cat} className="section">
            <h3 className="category-title">{CATEGORY_LABELS[cat]}</h3>
            <div className="exercise-grid">
              {allExercises.filter((e) => e.category === cat).map((ex) => (
                <div key={ex.id} className="exercise-chip-wrap">
                  <button
                    className={`exercise-chip ${selectedExercises.find((e) => e.id === ex.id) ? 'selected' : ''}`}
                    onClick={() => toggleExercise(ex)}
                  >
                    {ex.name}
                    {selectedExercises.find((e) => e.id === ex.id) && <Check size={14} />}
                  </button>
                  {ex.isCustom && (
                    <div className="custom-exo-actions">
                      <button className="custom-exo-btn" onClick={() => openEditExo(ex)}><Pencil size={12} /></button>
                      <button className="custom-exo-btn delete" onClick={() => deleteCustomExo(ex)}><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
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
                <div className="weighted-toggle" style={{ marginTop: '0.75rem' }} onClick={() => setNewExWeighted(!newExWeighted)}>
                  <Weight size={16} />
                  <span>Peut être lesté</span>
                  <div className={`toggle ${newExWeighted ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowAddExercise(false)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={addCustomExercise} disabled={!newExName.trim() || addingExo}>
                  {addingExo ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingExo && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-card-header">
                <h3>Modifier l'exercice</h3>
                <button className="icon-btn" onClick={() => setEditingExo(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="add-exercise-form">
                <input
                  type="text"
                  placeholder="Nom de l'exercice"
                  value={editExoName}
                  onChange={(e) => setEditExoName(e.target.value)}
                  autoFocus
                />
                <div className="category-picker">
                  {(Object.entries(CATEGORY_LABELS) as [Exercise['category'], string][]).map(([key, label]) => (
                    <button
                      key={key}
                      className={`category-chip ${editExoCategory === key ? 'active' : ''}`}
                      onClick={() => setEditExoCategory(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="weighted-toggle" style={{ marginTop: '0.75rem' }} onClick={() => setEditExoWeighted(!editExoWeighted)}>
                  <Weight size={16} />
                  <span>Peut être lesté</span>
                  <div className={`toggle ${editExoWeighted ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setEditingExo(null)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={saveEditExo} disabled={!editExoName.trim() || savingEdit}>
                  {savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
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

  const isRunningOnly = exerciseConfigs.length === 0 && runningConfigs.length > 0;

  function formatPace(durationMin: number, distanceKm: number): string {
    if (distanceKm <= 0) return '—';
    const paceMin = durationMin / distanceKm;
    const m = Math.floor(paceMin);
    const s = Math.round((paceMin - m) * 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => setStep('select')}>
          <ArrowLeft size={20} />
        </button>
        <h1>{isRunningOnly ? 'Log running' : 'Objectifs'}</h1>
        <div />
      </header>

      <div className="config-list">
        {runningConfigs.map((config, i) => (
          <div key={config.exercise.id} className="config-card running-config">
            <h3>{config.exercise.name}</h3>
            <div className="running-form">
              <div className="running-field">
                <div className="running-field-label">
                  <Timer size={16} />
                  <span>Temps</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="running-input"
                    value={config.duration || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, duration: Math.max(0, parseFloat(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">min</span>
                </div>
              </div>
              <div className="running-field">
                <div className="running-field-label">
                  <Route size={16} />
                  <span>Distance</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    className="running-input"
                    value={config.distance || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, distance: Math.max(0, parseFloat(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">km</span>
                </div>
              </div>
              <div className="running-field">
                <div className="running-field-label">
                  <Mountain size={16} />
                  <span>Dénivelé</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="running-input"
                    value={config.elevation || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, elevation: Math.max(0, parseInt(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">m</span>
                </div>
              </div>
              <div className="running-pace">
                <Gauge size={16} />
                <span>Allure : {formatPace(config.duration, config.distance)} min/km</span>
              </div>
            </div>
          </div>
        ))}

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
              <div className="config-row">
                <span>Poids</span>
                <div className="stepper">
                  <button onClick={() => {
                    setExerciseConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, weight: Math.max(0, c.weight - 0.5), weighted: Math.max(0, c.weight - 0.5) > 0 } : c)
                    );
                  }}>
                    <Minus size={16} />
                  </button>
                  <span>{config.weight > 0 ? `${config.weight} kg` : '—'}</span>
                  <button onClick={() => {
                    setExerciseConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, weight: c.weight + 0.5, weighted: true } : c)
                    );
                  }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              {config.weight > 0 && (
                <div className="config-row">
                  <span>Type</span>
                  <div className="weight-type-picker">
                    {([['body', 'Lesté'], ['halteres', 'Haltères'], ['barre', 'Barre']] as [WeightType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        className={`weight-type-btn ${config.weightType === type ? 'active' : ''}`}
                        onClick={() => setExerciseConfigs((prev) =>
                          prev.map((c, idx) => idx === i ? { ...c, weightType: type } : c)
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="config-result">
                → {repsPerSet} reps / série{config.weight > 0 ? ` • ${config.weight} kg ${config.weightType === 'halteres' ? '(haltères)' : config.weightType === 'barre' ? '(barre)' : '(lesté)'}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      <button className="primary-btn floating-btn" onClick={startSession}>
        {isRunningOnly ? 'Enregistrer' : 'Lancer la séance'}
      </button>
    </div>
  );
}
