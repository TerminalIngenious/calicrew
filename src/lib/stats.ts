import type { ExerciseLog, Session, SetUnit } from '../types';

/**
 * Les séries en secondes stockent leur valeur dans `SetLog.reps`, comme les
 * répétitions. Tout comptage de reps doit donc passer par ces helpers, sinon un
 * gainage de 60 s compte comme 60 répétitions dans les stats et les classements.
 */

export function getUnit(ex: Pick<ExerciseLog, 'unit'>): SetUnit {
  return ex.unit === 'seconds' ? 'seconds' : 'reps';
}

export function isTimeBased(ex: Pick<ExerciseLog, 'unit'>): boolean {
  return getUnit(ex) === 'seconds';
}

/** Libellé court de l'unité, pour l'affichage. */
export function unitLabel(unit: SetUnit): string {
  return unit === 'seconds' ? 'sec' : 'reps';
}

/** Total d'une série d'exercice, toutes unités confondues. */
export function exerciseTotal(ex: ExerciseLog): number {
  return (ex.sets || []).reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0);
}

/** Répétitions d'un exercice — 0 s'il est chronométré. */
export function exerciseReps(ex: ExerciseLog): number {
  return isTimeBased(ex) ? 0 : exerciseTotal(ex);
}

/** Secondes tenues sur un exercice isométrique — 0 s'il est en répétitions. */
export function exerciseSeconds(ex: ExerciseLog): number {
  return isTimeBased(ex) ? exerciseTotal(ex) : 0;
}

export function sessionReps(session: Pick<Session, 'exercises'>): number {
  return (session.exercises || []).reduce((sum, ex) => sum + exerciseReps(ex), 0);
}

export function sessionSeconds(session: Pick<Session, 'exercises'>): number {
  return (session.exercises || []).reduce((sum, ex) => sum + exerciseSeconds(ex), 0);
}

export function totalReps(sessions: Pick<Session, 'exercises'>[]): number {
  return sessions.reduce((sum, s) => sum + sessionReps(s), 0);
}

export function totalSeconds(sessions: Pick<Session, 'exercises'>[]): number {
  return sessions.reduce((sum, s) => sum + sessionSeconds(s), 0);
}

/** Séries complétées, indépendamment de l'unité. */
export function sessionSets(session: Pick<Session, 'exercises'>): number {
  return (session.exercises || []).reduce(
    (sum, ex) => sum + (ex.sets || []).filter((set) => set.completed).length,
    0
  );
}
