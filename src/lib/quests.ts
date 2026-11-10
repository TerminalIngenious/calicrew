import type { Quest, Session } from '../types';
import { totalReps, exerciseReps, exerciseSeconds } from './stats';

/**
 * Où en est une quête, sur un lot de séances donné.
 *
 * Vivait dans BattlePass.tsx. L'event FaceID a ses propres quêtes, du même
 * type, et sa propre page : plutôt que d'en recopier le barème, les deux
 * écrans lisent la même fonction. Une règle de comptage qui existe en deux
 * exemplaires finit toujours par diverger.
 *
 * `kmMarches` est la distance déduite du podomètre sur la même période. Elle
 * n'entre que dans les quêtes de distance : les pas d'une journée ne sont ni
 * une séance ni du temps d'entraînement, et compter un trajet jusqu'au
 * travail comme une sortie de course n'aurait aucun sens.
 */
export function questValue(quest: Quest, scope: Session[], kmMarches = 0): number {
  switch (quest.type) {
    case 'sessions':
      return scope.length;
    case 'reps':
      return totalReps(scope);
    case 'duration':
      return scope.reduce((sum, s) => sum + (s.duration || 0), 0);
    case 'exercises':
      return new Set(scope.flatMap((s) => (s.exercises || []).map((e) => e.exerciseId))).size;
    case 'sets':
      return scope.reduce(
        (sum, s) => sum + (s.exercises || []).reduce(
          (eSum, ex) => eSum + (ex.sets || []).filter((set) => set.completed).length, 0
        ), 0
      );
    case 'amrap':
      return scope.filter((s) => s.mode === 'amrap').length;
    case 'running_sessions':
      return scope.filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running')).length;
    case 'running_duration':
      return scope
        .filter((s) => (s.exercises || []).some((e) => e.exerciseCategory === 'running'))
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    case 'running_distance':
      // En kilomètres, et sur toute la catégorie running : courir, marcher
      // vite ou marcher comptent pareil pour une distance. Les pas notés
      // s'y ajoutent, convertis en distance — ces quêtes sont écrites
      // « parcours X km à pied » et sont les seules qu'un marcheur peut
      // aller chercher.
      return scope.reduce(
        (sum, s) => sum + (s.exercises || [])
          .filter((ex) => ex.exerciseCategory === 'running')
          .reduce((eSum, ex) => eSum + (ex.runDistance || 0), 0),
        kmMarches
      );
    case 'exercise_reps':
      return scope.reduce(
        (sum, s) => sum + (s.exercises || [])
          .filter((ex) => ex.exerciseId === quest.exerciseId)
          .reduce((eSum, ex) => eSum + exerciseReps(ex), 0),
        0
      );
    case 'exercise_duration':
      // Couvre le running (runDuration) et les isométriques comptés en secondes.
      return scope.reduce(
        (sum, s) => sum + (s.exercises || [])
          .filter((ex) => ex.exerciseId === quest.exerciseId)
          .reduce((eSum, ex) => eSum + (ex.runDuration || 0) + exerciseSeconds(ex), 0),
        0
      );
  }
}
