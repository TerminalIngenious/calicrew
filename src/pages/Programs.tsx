import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS } from '../lib/exercises';
import type { Program, ProgramExercise, Exercise, WeightType } from '../types';
import { Plus, Minus, Trash2, ArrowLeft, X, Globe, Lock } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

export default function Programs() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedExercises, setSelectedExercises] = useState<ProgramExercise[]>([]);
  const [showExPicker, setShowExPicker] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [progSnap, exoSnap] = await Promise.all([
        getDocs(query(collection(db, 'programs'), where('createdBy', '==', user.uid))),
        getDocs(query(collection(db, 'customExercises'), where('userId', '==', user.uid))),
      ]);
      setPrograms(progSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
      setCustomExercises(exoSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
    } catch {
      setPrograms([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function addExercise(ex: Exercise) {
    if (selectedExercises.find((e) => e.exerciseId === ex.id)) return;
    setSelectedExercises((prev) => [...prev, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      exerciseCategory: ex.category,
      targetSets: 4,
      targetReps: 10,
    }]);
    setShowExPicker(false);
  }

  function removeExercise(idx: number) {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateExercise(idx: number, field: 'targetSets' | 'targetReps' | 'weight', delta: number) {
    setSelectedExercises((prev) => prev.map((ex, i) => {
      if (i !== idx) return ex;
      if (field === 'weight') {
        const newWeight = Math.max(0, (ex.weight || 0) + delta);
        return { ...ex, weight: newWeight, weighted: newWeight > 0 };
      }
      return { ...ex, [field]: Math.max(1, ex[field] + delta) };
    }));
  }

  function setWeightType(idx: number, type: WeightType) {
    setSelectedExercises((prev) => prev.map((ex, i) => i === idx ? { ...ex, weightType: type } : ex));
  }

  async function saveProgram() {
    if (!user || !name.trim() || selectedExercises.length === 0) return;
    await addDoc(collection(db, 'programs'), {
      name: name.trim(),
      description: description.trim(),
      createdBy: user.uid,
      creatorName: user.displayName || '',
      exercises: selectedExercises,
      isPublic,
      createdAt: Date.now(),
    });
    setName('');
    setDescription('');
    setSelectedExercises([]);
    setIsPublic(true);
    setCreating(false);
    load();
  }

  async function deleteProgram(id: string) {
    await deleteDoc(doc(db, 'programs', id));
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <div className="page loading"><Loader /></div>;

  if (creating) {
    const allExercises = [...DEFAULT_EXERCISES, ...customExercises].filter((e) => e.category !== 'running');
    const categories = [...new Set(allExercises.map((e) => e.category))] as Exercise['category'][];

    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={() => setCreating(false)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Nouveau programme</h1>
        </header>

        <div className="program-form">
          <input
            className="input"
            placeholder="Nom du programme"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="program-visibility" onClick={() => setIsPublic(!isPublic)}>
            {isPublic ? <Globe size={16} /> : <Lock size={16} />}
            <span>{isPublic ? 'Public — visible par tous' : 'Privé — visible que par toi'}</span>
          </div>

          <h3 className="program-section-title">Exercices ({selectedExercises.length})</h3>

          {selectedExercises.map((ex, idx) => (
            <div key={idx} className="program-ex-card">
              <div className="program-ex-header">
                <span className="program-ex-name">{ex.exerciseName}</span>
                <button className="icon-btn" onClick={() => removeExercise(idx)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="config-row">
                <span>Séries</span>
                <div className="stepper">
                  <button onClick={() => updateExercise(idx, 'targetSets', -1)}><Minus size={14} /></button>
                  <span>{ex.targetSets}</span>
                  <button onClick={() => updateExercise(idx, 'targetSets', 1)}><Plus size={14} /></button>
                </div>
              </div>
              <div className="config-row">
                <span>Reps</span>
                <div className="stepper">
                  <button onClick={() => updateExercise(idx, 'targetReps', -1)}><Minus size={14} /></button>
                  <span>{ex.targetReps}</span>
                  <button onClick={() => updateExercise(idx, 'targetReps', 1)}><Plus size={14} /></button>
                </div>
              </div>
              <div className="config-row">
                <span>Poids</span>
                <div className="stepper">
                  <button onClick={() => updateExercise(idx, 'weight', -0.5)}><Minus size={14} /></button>
                  <span>{(ex.weight || 0) > 0 ? `${ex.weight} kg` : '—'}</span>
                  <button onClick={() => updateExercise(idx, 'weight', 0.5)}><Plus size={14} /></button>
                </div>
              </div>
              {(ex.weight || 0) > 0 && (
                <div className="config-row">
                  <span>Type</span>
                  <div className="weight-type-picker">
                    {([['body', 'Lesté'], ['halteres', 'Haltères'], ['barre', 'Barre']] as [WeightType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        className={`weight-type-btn ${(ex.weightType || 'body') === type ? 'active' : ''}`}
                        onClick={() => setWeightType(idx, type)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button className="secondary-btn" onClick={() => setShowExPicker(true)}>
            <Plus size={16} /> Ajouter un exercice
          </button>

          <button
            className="primary-btn"
            style={{ marginTop: '1rem' }}
            onClick={saveProgram}
            disabled={!name.trim() || selectedExercises.length === 0}
          >
            Enregistrer
          </button>
        </div>

        {showExPicker && (
          <div className="modal-overlay" onClick={() => setShowExPicker(false)}>
            <div className="modal-card exercise-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Ajouter un exercice</h3>
                <button className="icon-btn" onClick={() => setShowExPicker(false)}>
                  <X size={18} />
                </button>
              </div>
              {categories.map((cat) => (
                <div key={cat}>
                  <h4 className="picker-cat-label">{(CATEGORY_LABELS as Record<string, string>)[cat]}</h4>
                  {allExercises.filter((e) => e.category === cat).map((ex) => (
                    <button
                      key={ex.id}
                      className="picker-ex-btn"
                      onClick={() => addExercise(ex)}
                      disabled={!!selectedExercises.find((s) => s.exerciseId === ex.id)}
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mes programmes</h1>
      </header>

      {programs.length === 0 ? (
        <div className="programs-empty">
          <p className="empty">Aucun programme. Crée ton premier !</p>
          <button className="primary-btn" onClick={() => setCreating(true)}>
            <Plus size={20} /> Nouveau programme
          </button>
        </div>
      ) : (
        <div className="programs-list">
          {programs.map((prog) => (
            <div key={prog.id} className="program-card">
              <div className="program-card-header">
                <div>
                  <h3>{prog.name}</h3>
                  {prog.description && <span className="program-card-desc">{prog.description}</span>}
                </div>
                <button className="icon-btn" onClick={() => deleteProgram(prog.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="program-card-exercises">
                {prog.exercises.map((ex, i) => (
                  <span key={i} className="program-card-ex">
                    {ex.exerciseName} {ex.targetSets}×{ex.targetReps}{ex.weighted ? ` ${ex.weight}kg` : ''}
                  </span>
                ))}
              </div>
              <div className="program-card-footer">
                {prog.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                <span>{prog.exercises.length} exercices</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {programs.length > 0 && (
        <button className="primary-btn floating-btn" onClick={() => setCreating(true)}>
          <Plus size={20} /> Nouveau programme
        </button>
      )}

      <BottomNav />
    </div>
  );
}
