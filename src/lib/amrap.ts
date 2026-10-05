/**
 * AMRAP : « as many rounds as possible ». Le joueur définit un circuit et une
 * durée, puis enchaîne les tours jusqu'à la fin du temps.
 *
 * Le circuit est stocké dans les `exercises` de la séance, où `targetReps`
 * porte la valeur d'un seul tour. C'est le même schéma qu'une séance normale :
 * à la fin, les tours réalisés sont matérialisés en séries, pour que les reps
 * comptent comme partout ailleurs dans l'app.
 */

import type { ExerciseLog, Session, SetUnit } from '../types';
import { DEFAULT_EXERCISES } from './exercises';
import { getUnit, unitLabel } from './stats';

/** Un WOD de référence, proposé en raccourci dans le constructeur. */
export interface AmrapPreset {
  id: string;
  name: string;
  minutes: number;
  items: { exerciseId: string; value: number; unit?: SetUnit }[];
}

export const AMRAP_PRESETS: AmrapPreset[] = [
  {
    id: 'cindy',
    name: 'Cindy',
    minutes: 20,
    items: [
      { exerciseId: 'pull-ups', value: 5 },
      { exerciseId: 'push-ups', value: 10 },
      { exerciseId: 'squats', value: 15 },
    ],
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    minutes: 30,
    items: [
      { exerciseId: 'pull-ups', value: 5 },
      { exerciseId: 'push-ups', value: 10 },
      { exerciseId: 'squats', value: 15 },
    ],
  },
  {
    id: 'mary',
    name: 'Mary',
    minutes: 20,
    items: [
      { exerciseId: 'handstand-push-ups', value: 5 },
      { exerciseId: 'pistol-squats', value: 10 },
      { exerciseId: 'pull-ups', value: 15 },
    ],
  },
];

export const AMRAP_MIN_MINUTES = 1;
export const AMRAP_MAX_MINUTES = 60;
/** Au-delà, le circuit n'est plus mémorisable entre deux tours. */
export const AMRAP_MAX_ITEMS = 8;

/**
 * Construit les exercices d'une séance AMRAP. Les séries sont vides au départ :
 * elles seront remplies à la fin, une par tour réalisé.
 */
export function buildAmrapExercises(
  items: { exerciseId: string; value: number; unit?: SetUnit }[]
): ExerciseLog[] {
  return items.flatMap((item) => {
    const ex = DEFAULT_EXERCISES.find((e) => e.id === item.exerciseId);
    if (!ex) return [];
    const log: ExerciseLog = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      exerciseCategory: ex.category,
      targetSets: 1,
      targetReps: item.value,
      sets: [],
    };
    if (item.unit === 'seconds') log.unit = 'seconds';
    return [log];
  });
}

/**
 * Transforme les tours réalisés en séries : 12 tours de 5 tractions donnent
 * 12 séries de 5. Sans ça les reps d'un AMRAP ne comptent nulle part — ni dans
 * les classements, ni dans les quêtes.
 */
export function materializeAmrapSets(exercises: ExerciseLog[], rounds: number): ExerciseLog[] {
  const safe = Math.max(0, Math.floor(rounds));
  return exercises.map((ex) => ({
    ...ex,
    targetSets: Math.max(1, safe),
    sets: Array.from({ length: safe }, () => ({ reps: ex.targetReps, completed: true })),
  }));
}

/** « 5 tractions + 10 pompes + 15 squats » */
export function circuitLabel(exercises: ExerciseLog[]): string {
  return exercises
    .map((ex) => {
      const unit = getUnit(ex);
      return unit === 'seconds'
        ? `${ex.targetReps} s de ${ex.exerciseName.toLowerCase()}`
        : `${ex.targetReps} ${ex.exerciseName.toLowerCase()}`;
    })
    .join(' + ');
}

/** Total d'un tour, pour afficher le volume cumulé. */
export function repsPerRound(exercises: ExerciseLog[]): number {
  return exercises
    .filter((ex) => getUnit(ex) === 'reps')
    .reduce((sum, ex) => sum + ex.targetReps, 0);
}

/** Détail par exercice après N tours, pour le récap. */
export function roundTotals(
  exercises: ExerciseLog[],
  rounds: number
): { name: string; total: number; unit: string }[] {
  return exercises.map((ex) => ({
    name: ex.exerciseName.toLowerCase(),
    total: ex.targetReps * Math.max(0, rounds),
    unit: unitLabel(getUnit(ex)),
  }));
}

export function amrapTitle(name?: string): string {
  return name?.trim() || 'AMRAP';
}

export interface AmrapBest {
  key: string;
  title: string;
  circuit: string;
  minutes: number;
  rounds: number;
}

/**
 * Meilleur résultat par circuit.
 *
 * Un nombre de tours ne se compare qu'à circuit et durée identiques : depuis
 * qu'on peut composer son AMRAP, « le plus de tours » tout court récompense
 * surtout le circuit le plus facile. On regroupe donc par nom, circuit et
 * durée, et on ne compare qu'à l'intérieur d'un groupe.
 */
export function bestAmrapsByCircuit(sessions: Session[], limit = 3): AmrapBest[] {
  const best = new Map<string, AmrapBest>();

  for (const s of sessions) {
    if (s.mode !== 'amrap' || !s.completed) continue;
    const title = amrapTitle(s.amrapName);
    const circuit = circuitLabel(s.exercises || []);
    const minutes = Math.round((s.amrapDuration || 0) / 60);
    const key = `${title}|${circuit}|${minutes}`;
    const rounds = s.amrapRounds || 0;

    const current = best.get(key);
    if (!current || rounds > current.rounds) {
      best.set(key, { key, title, circuit, minutes, rounds });
    }
  }

  return [...best.values()]
    .filter((b) => b.rounds > 0)
    .sort((a, b) => b.rounds - a.rounds)
    .slice(0, limit);
}
