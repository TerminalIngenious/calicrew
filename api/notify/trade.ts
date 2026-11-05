import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo } from '../_lib/push.js';
import { uidDuJeton } from '../_lib/auth.js';
import { lisAbonnements, veutGroupe, lisNoms } from '../_lib/groupe.js';
import { ECHANGE_REPONSE, auHasard } from '../_lib/messages.js';

/**
 * Appelée quand quelqu'un répond à une annonce d'échange.
 *
 * L'appelant ne donne que l'identifiant de l'annonce : le destinataire est
 * lu dedans, côté serveur. Sans ça, n'importe qui pourrait se faire envoyer
 * une notification au nom de n'importe qui.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const listingId = (req.body as { listingId?: string } | undefined)?.listingId;
  if (!listingId) return res.status(400).json({ error: 'listingId manquant' });

  configureWebPush();
  const db = getDb();

  const snap = await db.collection('tradeListings').doc(listingId).get();
  if (!snap.exists) return res.status(404).json({ error: 'Annonce introuvable' });

  const annonce = snap.data() as { ownerUid?: string; status?: string };
  // Rien à dire à quelqu'un qui répond à sa propre annonce, ni sur une
  // annonce déjà conclue.
  if (!annonce.ownerUid || annonce.ownerUid === uid) return res.status(200).json({ envoye: false });
  if (annonce.status && annonce.status !== 'open') return res.status(200).json({ envoye: false });

  const sub = (await lisAbonnements(db)).find((a) => a.uid === annonce.ownerUid);
  if (!sub || !veutGroupe(sub)) return res.status(200).json({ envoye: false });

  const noms = await lisNoms(db);
  const envoye = await sendTo(sub, {
    title: 'Échange',
    body: auHasard(ECHANGE_REPONSE)(noms.get(uid) || 'Quelqu\'un'),
    tag: `trade-${listingId}`,
    url: '/group',
  });

  return res.status(200).json({ envoye });
}
