/**
 * Le défi surprise du jour, côté app.
 *
 * Le cron le dépose dans la progression au moment où il envoie la
 * notification ; ici on le lit, on l'affiche, et on l'enregistre en séance
 * si la personne dit l'avoir fait.
 *
 * Cette séance est une vraie séance : elle compte dans les reps, remplit les
 * quêtes et apparaît dans l'historique. Elle ne donne simplement pas de
 * coffre — dix pompes dans un couloir ne valent pas une séance d'une heure,
 * et le `noReward` existait déjà pour ça.
 */

import { addDoc, collection, deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_EXERCISES } from './exercises';
import { dayKey } from './creatine';
import type { ExerciseLog, UserProgress } from '../types';

export type DefiDuJour = NonNullable<UserProgress['defiDuJour']>;

/** Le défi à proposer aujourd'hui, ou rien si celui qu'on a date d'hier. */
export function defiActif(progress: UserProgress | null, aujourdhui = dayKey()): DefiDuJour | null {
  const defi = progress?.defiDuJour;
  return defi && defi.jour === aujourdhui ? defi : null;
}

/** Un défi sans exercice ne se mesure pas : il se coche, et c'est tout. */
export function mesurable(defi: DefiDuJour): boolean {
  return (defi.exercices || []).length > 0;
}

/**
 * Les exercices du défi, au format d'une séance.
 *
 * Le nom et la catégorie viennent de la bibliothèque locale : le serveur n'a
 * envoyé que des identifiants, et c'est bien ainsi — il n'a pas à connaître
 * les libellés affichés.
 */
export function enSeance(defi: DefiDuJour): ExerciseLog[] {
  const logs: ExerciseLog[] = [];
  for (const e of defi.exercices || []) {
    const connu = DEFAULT_EXERCISES.find((x) => x.id === e.exerciseId);
    if (!connu) continue;
    logs.push({
      exerciseId: connu.id,
      exerciseName: connu.name,
      exerciseCategory: connu.category,
      targetSets: 1,
      targetReps: e.reps,
      sets: [{ reps: e.reps, completed: true }],
      ...(e.unit ? { unit: e.unit } : {}),
    });
  }
  return logs;
}

/**
 * Valide le défi du jour.
 *
 * La séance part avant la coche : si l'écriture échoue, le défi reste à
 * faire, ce qui est réparable. L'inverse aurait perdu la séance en silence.
 */
export async function valide(uid: string, defi: DefiDuJour): Promise<void> {
  const exercises = enSeance(defi);
  let seanceId: string | undefined;

  if (exercises.length > 0) {
    const maintenant = Date.now();
    const ref = await addDoc(collection(db, 'sessions'), {
      userId: uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: true,
      createdAt: maintenant,
      startedAt: maintenant - defi.duree * 1000,
      // Une durée déclarée, pas mesurée : le défi se fait loin du téléphone.
      duration: defi.duree,
      noReward: true,
    });
    seanceId = ref.id;
  }

  await updateDoc(doc(db, 'userProgress', uid), {
    'defiDuJour.fait': true,
    ...(seanceId ? { 'defiDuJour.seanceId': seanceId } : {}),
  });
}

/**
 * Annule la validation, et reprend la séance qu'elle avait créée.
 *
 * Laisser la séance derrière aurait gonflé les reps et les quêtes de quelqu'un
 * qui vient justement de dire qu'il n'avait pas fait le défi. On ne supprime
 * que la séance née de ce bouton, jamais une autre.
 */
export async function annule(uid: string, defi: DefiDuJour): Promise<void> {
  if (defi.seanceId) {
    await deleteDoc(doc(db, 'sessions', defi.seanceId));
  }
  await updateDoc(doc(db, 'userProgress', uid), {
    'defiDuJour.fait': false,
    'defiDuJour.seanceId': deleteField(),
  });
}
