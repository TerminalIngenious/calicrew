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
 * et le `noReward` existait déjà pour ça. Sauf pour les comptes listés dans
 * DEFI_AVEC_COFFRE, exception assumée.
 */

import { addDoc, collection, deleteDoc, deleteField, doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_EXERCISES } from './exercises';
import { dayKey } from './creatine';
import type { ExerciseLog, UserProgress } from '../types';

export type DefiDuJour = NonNullable<UserProgress['defiDuJour']>;

/**
 * Les comptes dont le défi rapporte quand même un coffre.
 *
 * Une exception décidée, pas un oubli : Coco est la seule à qui le défi
 * surprise donne la récompense d'une séance entière. Par identifiant et non
 * par pseudo, qui se change.
 */
const DEFI_AVEC_COFFRE = ['KD3vHcXqaNWWl2w9b7tauBy3PI43'];

export function donneCoffre(uid: string): boolean {
  return DEFI_AVEC_COFFRE.includes(uid);
}

/**
 * Le défi encore ouvert, ou rien.
 *
 * Trois heures de fenêtre, puis il disparaît — fait ou non. C'est ce qui
 * sépare un défi surprise d'une tâche de la journée : on le fait tout de
 * suite ou on ne le fait pas.
 *
 * Les défis déposés avant cette règle n'ont pas de date de péremption ; on
 * leur applique l'ancienne, la journée entière, plutôt que de les faire
 * disparaître sous le nez de quelqu'un au premier chargement.
 */
export function defiActif(
  progress: UserProgress | null,
  maintenant = Date.now(),
  aujourdhui = dayKey(),
): DefiDuJour | null {
  const defi = progress?.defiDuJour;
  if (!defi) return null;
  if (defi.expire) return maintenant < defi.expire ? defi : null;
  return defi.jour === aujourdhui ? defi : null;
}

/** Ce qu'il reste, en millisecondes. Zéro quand il n'y a pas de fenêtre. */
export function resteMs(defi: DefiDuJour, maintenant = Date.now()): number {
  return defi.expire ? Math.max(0, defi.expire - maintenant) : 0;
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
      // Le drapeau dit la vérité sur cette séance-là : pour les comptes qui
      // touchent quand même un coffre, elle n'est pas sans récompense.
      noReward: !donneCoffre(uid),
    });
    seanceId = ref.id;
  }

  /* En transaction parce que le coffre s'ajoute à une liste qu'on vient de
     lire : un coffre gagné ailleurs entre-temps serait effacé par le renvoi
     d'une liste périmée. */
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'userProgress', uid);
    const snap = await tx.get(ref);
    const data = snap.data() as UserProgress | undefined;

    const maj: Record<string, unknown> = { 'defiDuJour.fait': true };
    if (seanceId) maj['defiDuJour.seanceId'] = seanceId;
    if (donneCoffre(uid)) {
      maj.chestsToOpen = [...(data?.chestsToOpen || []), { rarity: 'commune', pool: 'current' }];
      maj['defiDuJour.coffre'] = true;
    }
    tx.update(ref, maj);
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
  /* Le coffre repart avec la séance. Sinon cocher puis décocher en boucle
     serait une machine à coffres. On n'en retire qu'un, et seulement celui
     qu'on avait donné. */
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'userProgress', uid);
    const snap = await tx.get(ref);
    const data = snap.data() as UserProgress | undefined;

    const maj: Record<string, unknown> = {
      'defiDuJour.fait': false,
      'defiDuJour.seanceId': deleteField(),
    };
    if (defi.coffre) {
      const liste = [...(data?.chestsToOpen || [])];
      const i = liste.findIndex((c) => c.rarity === 'commune' && c.pool === 'current');
      if (i >= 0) liste.splice(i, 1);
      maj.chestsToOpen = liste;
      maj['defiDuJour.coffre'] = false;
    }
    tx.update(ref, maj);
  });
}
