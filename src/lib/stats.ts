import type { ExerciseLog, Session, SetUnit, WeightType } from '../types';

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

/**
 * Charge effective d'une série : celle propre à la série si elle a été ajustée
 * en cours de séance, sinon celle définie pour l'exercice.
 */
export function setWeight(ex: ExerciseLog, set: { weight?: number }): number {
  if (set.weight !== undefined) return set.weight;
  return ex.weighted ? ex.weight || 0 : 0;
}

/** Séries complétées, indépendamment de l'unité. */
export function sessionSets(session: Pick<Session, 'exercises'>): number {
  return (session.exercises || []).reduce(
    (sum, ex) => sum + (ex.sets || []).filter((set) => set.completed).length,
    0
  );
}

// ── Records personnels (PR) ──

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  category: string;
  unit: SetUnit;
  /** Meilleure série : reps ou secondes selon l'unité. */
  bestSet: number;
  /** Charge portée sur cette meilleure série. */
  bestSetWeight?: number;
  /** Charge la plus lourde jamais utilisée sur cet exercice. */
  maxWeight?: number;
  maxWeightType?: WeightType;
  /** Running et vélo. */
  bestDistance?: number;
  /** Running, vélo et sport co : plus longue sortie. */
  bestDuration?: number;
  /** Date du record principal, au format ISO court. */
  date: string;
}

function isDistanceBased(category: string): boolean {
  return category === 'running' || category === 'velo';
}

/**
 * Meilleure performance par exercice.
 *
 * Les séances AMRAP sont exclues : elles cumulent tous les rounds dans une
 * seule série, ce qui produirait un faux record (un Cindy de 20 rounds
 * apparaîtrait comme 100 tractions d'affilée).
 */
export function computePersonalRecords(sessions: Session[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>();

  for (const session of sessions) {
    if (!session.completed || session.mode === 'amrap') continue;

    for (const ex of session.exercises || []) {
      const id = ex.exerciseId;
      if (!id) continue;

      const pr = map.get(id) || {
        exerciseId: id,
        exerciseName: ex.exerciseName,
        category: ex.exerciseCategory || '',
        unit: getUnit(ex),
        bestSet: 0,
        date: session.date,
      };

      if (isDistanceBased(ex.exerciseCategory) || ex.exerciseCategory === 'sportco') {
        const distance = ex.runDistance || 0;
        const duration = ex.runDuration || 0;
        if (distance > (pr.bestDistance || 0)) {
          pr.bestDistance = distance;
          pr.date = session.date;
        }
        if (duration > (pr.bestDuration || 0)) {
          pr.bestDuration = duration;
          if (!pr.bestDistance) pr.date = session.date;
        }
      } else {
        // La charge peut varier d'une série à l'autre : on raisonne série par série.
        for (const set of ex.sets || []) {
          if (!set.completed) continue;
          const weight = setWeight(ex, set);

          if (set.reps > pr.bestSet) {
            pr.bestSet = set.reps;
            pr.bestSetWeight = weight > 0 ? weight : undefined;
            pr.unit = getUnit(ex);
            pr.date = session.date;
          }
          if (weight > (pr.maxWeight || 0)) {
            pr.maxWeight = weight;
            pr.maxWeightType = ex.weightType;
          }
        }
      }

      map.set(id, pr);
    }
  }

  return [...map.values()].filter(
    (pr) => pr.bestSet > 0 || (pr.bestDistance || 0) > 0 || (pr.bestDuration || 0) > 0
  );
}
