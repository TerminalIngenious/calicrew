import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, isAuthorized } from '../_lib/push.js';
import { moisPrecedent } from '../_lib/recap.js';
import { recapsDuMois } from '../_lib/recapDonnees.js';
import { rendsRecap, sujetRecap } from '../_lib/recapMail.js';
import { envoieMail, fournisseur } from '../_lib/mail.js';

/**
 * Le récap du mois, envoyé par mail le 1er au matin.
 *
 * Le 1er et non le 31 au soir : un récap écrit avant la fin du mois raterait
 * la séance du 31, qui est précisément celle dont on est le plus fier.
 *
 * Un jalon par mois empêche le doublon si le cron repasse : recevoir deux
 * fois le même bilan donnerait l'impression d'un robot déréglé.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!fournisseur()) return res.status(200).json({ envoyes: 0, raison: 'pas de clé de messagerie' });

  const db = getDb();
  const mois = moisPrecedent();
  const jalon = db.collection('annonces').doc(`recap-${mois}`);

  const premier = await db.runTransaction(async (tx) => {
    const d = await tx.get(jalon);
    if (d.exists && req.query.force !== '1') return false;
    tx.set(jalon, { envoyeLe: Date.now(), mois }, { merge: true });
    return true;
  });
  if (!premier) return res.status(200).json({ envoyes: 0, raison: 'déjà envoyé' });

  const recaps = await recapsDuMois(db, mois);

  /* En série et non en parallèle : les fournisseurs d'e-mail limitent le
     débit, et vingt-cinq envois d'un coup finissent en erreurs 429. */
  let envoyes = 0;
  for (const { recap, dest } of recaps) {
    const ok = await envoieMail({
      a: dest.email,
      nom: dest.nom,
      sujet: sujetRecap(recap),
      html: rendsRecap(recap),
    });
    if (ok) envoyes += 1;
  }

  return res.status(200).json({ mois, destinataires: recaps.length, envoyes });
}
