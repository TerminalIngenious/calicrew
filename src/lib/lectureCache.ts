import { getDocFromCache, getDocsFromCache } from 'firebase/firestore';
import type { DocumentReference, DocumentSnapshot, Query, QuerySnapshot } from 'firebase/firestore';

/**
 * La passe cache.
 *
 * Firestore garde sur l'appareil tout ce qu'il a déjà lu, mais `getDoc` et
 * `getDocs` vont quand même interroger le serveur avant de rendre la main.
 * D'où des pages qui tournaient sur leur écran de chargement alors que la
 * donnée était là, à côté : sur un réseau qui répond à moitié, l'attente est
 * sans fin et rien n'indique quand elle s'arrêtera.
 *
 * Le remède tient en deux temps : on peint d'abord ce que l'appareil sait
 * déjà, puis on relit le serveur et on corrige. La page s'ouvre
 * instantanément dès la deuxième visite, et se met à jour toute seule une
 * seconde plus tard.
 *
 * Une passe cache ne doit jamais écrire ni décider : elle travaille par
 * définition sur une version qui peut être périmée.
 */
export async function passeCache(travail: () => Promise<void>): Promise<boolean> {
  try {
    await travail();
    return true;
  } catch {
    // Document absent du cache, premier lancement, stockage vidé : tant pis,
    // la passe serveur fera le travail.
    return false;
  }
}

/** Un document s'il est déjà sur l'appareil. Lève s'il n'y est pas. */
export async function docEnCache(ref: DocumentReference): Promise<DocumentSnapshot> {
  const snap = await getDocFromCache(ref);
  if (!snap.exists()) throw new Error('absent du cache');
  return snap;
}

/**
 * Le résultat d'une requête s'il est déjà sur l'appareil.
 *
 * Un résultat vide lève plutôt que de rendre une liste vide : rien en cache et
 * rien à afficher se ressemblent trop, et peindre le second afficherait
 * « aucun programme » pendant une seconde à quelqu'un qui en a douze.
 */
export async function docsEnCache(q: Query): Promise<QuerySnapshot> {
  const snap = await getDocsFromCache(q);
  if (snap.empty) throw new Error('rien en cache');
  return snap;
}
