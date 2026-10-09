import { Check } from 'lucide-react';
import { isTimeBased, setWeight } from '../lib/stats';
import type { ExerciseLog, SetLog } from '../types';

/**
 * Une série, avec ses contrôles. Partagée par les deux façons de dérouler une
 * séance — exercice par exercice, ou en circuit — pour que les deux vues ne
 * puissent pas diverger.
 */
export default function SetCard({
  exercise,
  set,
  label,
  sublabel,
  onAdjustReps,
  onAdjustWeight,
  onValidate,
}: {
  exercise: ExerciseLog;
  set: SetLog;
  label: string;
  /** Second niveau de titre : le nom de l'exercice en vue circuit. */
  sublabel?: string;
  onAdjustReps: (delta: number) => void;
  onAdjustWeight: (delta: number) => void;
  onValidate: () => void;
}) {
  const timed = isTimeBased(exercise);
  const step = timed ? 5 : 1;
  const unit = timed ? ' s' : '';

  return (
    <div className={`set-item ${set.completed ? 'completed' : ''}`}>
      <div className="set-header">
        <span className="set-label">
          {label}
          {sublabel && <em className="set-sublabel">{sublabel}</em>}
        </span>
        <span className="set-target">Obj: {exercise.targetReps}{unit}</span>
      </div>
      <div className="set-controls">
        <button className="reps-btn" onClick={() => onAdjustReps(-step)}>−</button>
        <span className="reps-value">{set.reps}{unit}</span>
        <button className="reps-btn" onClick={() => onAdjustReps(step)}>+</button>
      </div>
      <div className="set-weight">
        <button className="set-weight-btn" onClick={() => onAdjustWeight(-0.5)}>−</button>
        <span className="set-weight-value">
          {setWeight(exercise, set) > 0 ? `${setWeight(exercise, set)} kg` : '—'}
        </span>
        <button className="set-weight-btn" onClick={() => onAdjustWeight(0.5)}>+</button>
      </div>
      <button className={`validate-btn ${set.completed ? 'done' : ''}`} onClick={onValidate}>
        <Check size={16} />
        {set.completed ? 'Fait' : 'Valider'}
      </button>
    </div>
  );
}
