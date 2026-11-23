/**
 * Ce qu'il faut lire dans Firestore pour bâtir les récaps du mois.
 *
 * Isolé du calcul et du rendu : la lecture est la seule partie qu'on ne peut
 * pas rejouer hors ligne, autant qu'elle tienne en un seul endroit.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { calculeRecaps, type EntreeRecap, type Recap, type SeanceBrute } from './recap.js';

export interface Destinataire {
  uid: string;
  nom: string;
  email: string;
}

export async function recapsDuMois(
  db: Firestore,
  mois: string
): Promise<{ recap: Recap; dest: Destinataire }[]> {
  const [usersSnap, sessionsSnap, progressSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('sessions').get(),
    db.collection('userProgress').get(),
  ]);

  const parJoueur = new Map<string, SeanceBrute[]>();
  for (const d of sessionsSnap.docs) {
    const s = d.data() as SeanceBrute;
    const uid = s.userId;
    if (!uid) continue;
    parJoueur.set(uid, [...(parJoueur.get(uid) || []), s]);
  }

  const progressDe = new Map<string, Record<string, unknown>>();
  for (const d of progressSnap.docs) progressDe.set(d.id, d.data());

  const dests = new Map<string, Destinataire>();
  const entrees: EntreeRecap[] = [];
  for (const d of usersSnap.docs) {
    const u = d.data() as { uid?: string; displayName?: string; email?: string };
    const uid = u.uid || d.id;
    const nom = (u.displayName || '').trim() || 'Toi';
    entrees.push({ uid, nom, seances: parJoueur.get(uid) || [], progress: progressDe.get(uid) || {} });
    if (u.email) dests.set(uid, { uid, nom, email: u.email });
  }

  /* On n'écrit qu'à ceux qui ont déjà fait au moins une séance, un jour.
     Un bilan « tu n'as rien fait » à quelqu'un qui n'a jamais rien fait du
     tout n'est pas une relance, c'est du courrier indésirable. Un mois
     blanc après des mois pleins, lui, mérite d'être signalé. */
  const aDejaJoue = new Set(
    [...parJoueur.entries()]
      .filter(([, seances]) => seances.some((s) => s.completed))
      .map(([uid]) => uid)
  );

  return calculeRecaps(entrees, mois)
    .filter((r) => dests.has(r.uid) && aDejaJoue.has(r.uid))
    .map((r) => ({ recap: r, dest: dests.get(r.uid) as Destinataire }));
}
