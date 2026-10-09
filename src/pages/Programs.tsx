import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS } from '../lib/exercises';
import type { Program, ProgramExercise, Exercise, WeightType, SetUnit } from '../types';
import { AMRAP_MAX_MINUTES, AMRAP_MIN_MINUTES } from '../lib/amrap';
import { Plus, Minus, Trash2, ArrowLeft, X, Globe, Lock, Pencil, Timer, Zap } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';

export default function Programs() {
  const { user, displayName: myName } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  /** null = liste. Sinon on édite un programme existant, ou on en crée un. */
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; program: Program } | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulaire, partagé par la création et la modification
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [kind, setKind] = useState<'standard' | 'amrap'>('standard');
  const [amrapMinutes, setAmrapMinutes] = useState(20);
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
    const unit: SetUnit = ex.defaultUnit === 'seconds' ? 'seconds' : 'reps';
    setSelectedExercises((prev) => [...prev, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      exerciseCategory: ex.category,
      targetSets: 4,
      targetReps: unit === 'seconds' ? 30 : 10,
      unit,
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

  function resetForm() {
    setName('');
    setDescription('');
    setSelectedExercises([]);
    setIsPublic(true);
    setKind('standard');
    setAmrapMinutes(20);
  }

  function startCreate() {
    resetForm();
    setEditor({ mode: 'create' });
  }

  /** Recharge le programme dans le formulaire, qui est le même qu'à la création. */
  function startEdit(program: Program) {
    setName(program.name);
    setDescription(program.description || '');
    setIsPublic(program.isPublic);
    setKind(program.kind === 'amrap' ? 'amrap' : 'standard');
    setAmrapMinutes(program.amrapMinutes || 20);
    // Copie : on ne veut pas muter la liste tant que rien n'est enregistré.
    setSelectedExercises(program.exercises.map((ex) => ({ ...ex })));
    setEditor({ mode: 'edit', program });
  }

  function closeEditor() {
    setEditor(null);
    resetForm();
  }

  async function saveProgram() {
    if (!user || !editor || saving) return;
    if (!name.trim() || selectedExercises.length === 0) return;

    setSaving(true);
    try {
      if (editor.mode === 'edit') {
        // createdAt et creatorName restent ceux de l'origine : modifier un
        // programme ne le fait pas remonter comme s'il venait d'être créé.
        await updateDoc(doc(db, 'programs', editor.program.id), {
          name: name.trim(),
          description: description.trim(),
          exercises: selectedExercises,
          isPublic,
          kind,
          amrapMinutes,
        });
      } else {
        await addDoc(collection(db, 'programs'), {
          name: name.trim(),
          description: description.trim(),
          createdBy: user.uid,
          creatorName: myName,
          exercises: selectedExercises,
          isPublic,
          kind,
          amrapMinutes,
          createdAt: Date.now(),
        });
      }
      closeEditor();
      await load();
    } catch (err) {
      console.error('Enregistrement du programme impossible:', err);
    }
    setSaving(false);
  }

  async function deleteProgram(program: Program) {
    // La suppression est définitive, et le crayon est juste à côté.
    if (!confirm(`Supprimer "${program.name}" ?`)) return;
    await deleteDoc(doc(db, 'programs', program.id));
    setPrograms((prev) => prev.filter((p) => p.id !== program.id));
  }

  if (loading) return <div className="page loading"><Loader /></div>;

  if (editor) {
    const isEdit = editor.mode === 'edit';
    const allExercises = [...DEFAULT_EXERCISES, ...customExercises].filter(
      (e) => e.category !== 'running' && e.category !== 'velo' && e.category !== 'sportco'
    );
    const categories = [...new Set(allExercises.map((e) => e.category))] as Exercise['category'][];

    return (
      <div className="page">
        <header className="page-header">
          <button className="icon-btn" onClick={closeEditor} aria-label="Retour">
            <ArrowLeft size={20} />
          </button>
          <h1>{isEdit ? 'Modifier le programme' : 'Nouveau programme'}</h1>
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

          <div className="layout-switch program-kind">
            <button
              className={`layout-switch-btn ${kind === 'standard' ? 'active' : ''}`}
              onClick={() => setKind('standard')}
            >
              Séries & reps
            </button>
            <button
              className={`layout-switch-btn ${kind === 'amrap' ? 'active' : ''}`}
              onClick={() => setKind('amrap')}
            >
              <Zap size={14} /> AMRAP
            </button>
          </div>

          {kind === 'amrap' && (
            <>
              <p className="program-kind-hint">
                Un tour du circuit, répété autant de fois que possible dans le temps imparti.
              </p>
              <div className="amrap-time-picker">
                <button
                  className="time-picker-arrow"
                  aria-label="Moins une minute"
                  onClick={() => setAmrapMinutes((m) => Math.max(AMRAP_MIN_MINUTES, m - 1))}
                >
                  <Minus size={18} />
                </button>
                <div className="amrap-time-display">
                  <Timer size={18} />
                  <span>{amrapMinutes} min</span>
                </div>
                <button
                  className="time-picker-arrow"
                  aria-label="Plus une minute"
                  onClick={() => setAmrapMinutes((m) => Math.min(AMRAP_MAX_MINUTES, m + 1))}
                >
                  <Plus size={18} />
                </button>
              </div>
            </>
          )}

          <h3 className="program-section-title">
            {kind === 'amrap' ? '1 tour =' : 'Exercices'} ({selectedExercises.length})
          </h3>

          {selectedExercises.map((ex, idx) => (
            <div key={idx} className="program-ex-card">
              <div className="program-ex-header">
                <span className="program-ex-name">{ex.exerciseName}</span>
                <button className="icon-btn" onClick={() => removeExercise(idx)}>
                  <Trash2 size={14} />
                </button>
              </div>
              {kind === 'standard' && (
                <div className="config-row">
                  <span>Séries</span>
                  <div className="stepper">
                    <button onClick={() => updateExercise(idx, 'targetSets', -1)}><Minus size={14} /></button>
                    <span>{ex.targetSets}</span>
                    <button onClick={() => updateExercise(idx, 'targetSets', 1)}><Plus size={14} /></button>
                  </div>
                </div>
              )}
              <div className="config-row">
                <span>Unité</span>
                <div className="unit-picker">
                  {([['reps', 'Reps'], ['seconds', 'Secondes']] as [SetUnit, string][]).map(([u, label]) => (
                    <button
                      key={u}
                      className={`unit-btn ${(ex.unit || 'reps') === u ? 'active' : ''}`}
                      onClick={() => setSelectedExercises((prev) => prev.map((e, i) =>
                        i === idx ? { ...e, unit: u, targetReps: u === 'seconds' ? 30 : 10 } : e
                      ))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-row">
                <span>
                  {kind === 'amrap'
                    ? ex.unit === 'seconds' ? 'Secondes / tour' : 'Reps / tour'
                    : ex.unit === 'seconds' ? 'Secondes / série' : 'Reps'}
                </span>
                <div className="stepper">
                  <button onClick={() => updateExercise(idx, 'targetReps', ex.unit === 'seconds' ? -5 : -1)}><Minus size={14} /></button>
                  <span>{ex.targetReps}{ex.unit === 'seconds' ? ' s' : ''}</span>
                  <button onClick={() => updateExercise(idx, 'targetReps', ex.unit === 'seconds' ? 5 : 1)}><Plus size={14} /></button>
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
            disabled={saving || !name.trim() || selectedExercises.length === 0}
          >
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer'}
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
        <button className="icon-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Mes programmes</h1>
        <div />
      </header>

      {programs.length === 0 ? (
        <div className="programs-empty">
          <p className="empty">Aucun programme. Crée ton premier !</p>
          <button className="primary-btn" onClick={startCreate}>
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
                <div className="program-card-actions">
                  <button
                    className="icon-btn"
                    aria-label={`Modifier ${prog.name}`}
                    onClick={() => startEdit(prog)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Supprimer ${prog.name}`}
                    onClick={() => deleteProgram(prog)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="program-card-exercises">
                {prog.exercises.map((ex, i) => (
                  <span key={i} className="program-card-ex">
                    {ex.exerciseName} {ex.targetSets}×{ex.targetReps}{ex.unit === 'seconds' ? 's' : ''}{ex.weighted ? ` ${ex.weight}kg` : ''}
                  </span>
                ))}
              </div>
              <div className="program-card-footer">
                {prog.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                <span>{prog.exercises.length} exercices</span>
                {prog.kind === 'amrap' && (
                  <span className="program-amrap-tag">
                    <Zap size={11} /> AMRAP {prog.amrapMinutes || 20} min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {programs.length > 0 && (
        <button className="primary-btn floating-btn" onClick={startCreate}>
          <Plus size={20} /> Nouveau programme
        </button>
      )}

      <BottomNav />
    </div>
  );
}
