import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo, getDayKey, getDayNumber, type Subscription } from '../_lib/push.js';
import { uidDuJeton } from '../_lib/auth.js';
import { DEFIS_SURPRISE, defiDuJour } from '../_lib/messages.js';

/**
 * Un défi surprise envoyé à soi seul, pour essayer la chaîne complète.
 *
 * Le vrai défi part une fois par jour, à une heure tirée au sort, et à tout
 * le groupe : impossible d'en vérifier le rendu sans réveiller huit
 * personnes. Celui-ci fait exactement la même chose — dépôt dans la
 * progression, puis notification — mais pour le seul compte qui l'appelle.
 *
 * Réservé aux administrateurs, et sans jalon : il est fait pour être rejoué.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ erreur: 'Non connecté' });

  const admins = (process.env.ADMIN_UIDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!admins.includes(uid)) return res.status(403).json({ erreur: 'Accès refusé' });

  /* Le défi du jour s'il se mesure, sinon le premier qui se mesure : un essai
     qui ne crée aucune séance ne prouverait pas grand-chose. */
  const demande = typeof req.query.id === 'string' ? req.query.id : null;
  const defi =
    (demande && DEFIS_SURPRISE.find((d) => d.id === demande)) ||
    [defiDuJour(getDayNumber()), ...DEFIS_SURPRISE].find((d) => (d.exercices || []).length > 0) ||
    DEFIS_SURPRISE[0];

  const db = getDb();
  await db.collection('userProgress').doc(uid).set(
    {
      defiDuJour: {
        jour: getDayKey(),
        id: defi.id,
        texte: defi.texte,
        exercices: defi.exercices || [],
        duree: defi.duree || 0,
        fait: false,
      },
    },
    { merge: true }
  );

  configureWebPush();
  const abo = await db.collection('pushSubscriptions').doc(uid).get();
  let envoye = false;
  if (abo.exists) {
    envoye = await sendTo(abo.data() as Subscription, {
      title: 'Défi surprise',
      body: defi.texte,
      tag: 'hasard',
      url: '/',
    });
  }

  return res.status(200).json({ defi: defi.id, envoye });
}
