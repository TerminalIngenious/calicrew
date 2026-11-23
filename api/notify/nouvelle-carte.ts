import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo } from '../_lib/push.js';
import { uidDuJeton } from '../_lib/auth.js';
import { lisAbonnements, veutGroupe } from '../_lib/groupe.js';

/**
 * L'annonce de la nouvelle carte, à la réouverture.
 *
 * Elle part une fois, à la main, au moment où la maintenance est levée :
 * un cron daté se serait trompé d'une heure ou d'un jour, et c'est
 * exactement l'annonce qu'on ne veut pas rater.
 *
 * Elle ne nomme ni la carte ni sa rareté : elle doit donner envie d'ouvrir
 * un coffre, pas raconter ce qu'il y a dedans. Ceux qui lancent l'app
 * découvriront d'eux-mêmes — l'arrivée les attend.
 */
const JALON = 'nouvelle-carte-intergalactique';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ erreur: 'Non connecté' });

  const admins = (process.env.ADMIN_UIDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!admins.includes(uid)) return res.status(403).json({ erreur: 'Accès refusé' });

  const db = getDb();
  const ref = db.collection('annonces').doc(JALON);

  /*
   * Le jalon est posé avant l'envoi, dans une transaction.
   *
   * Une annonce à tout le groupe ne se rattrape pas : mieux vaut en rater
   * une que la faire partir deux fois parce qu'on a tapé deux fois sur le
   * bouton. `--force` existe pour le cas où le premier envoi a échoué.
   */
  const force = req.query.force === '1';
  const premier = await db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (d.exists && !force) return false;
    tx.set(ref, { envoyeLe: Date.now(), par: uid }, { merge: true });
    return true;
  });
  if (!premier) return res.status(200).json({ annonce: false, raison: 'déjà envoyée' });

  configureWebPush();
  const abonnes = await lisAbonnements(db);

  const envois = abonnes
    .filter((a) => veutGroupe(a))
    .map((a) => sendTo(a, {
      title: '\u{1FA90} Une nouvelle carte est apparue',
      body: 'Plus rare que tout ce que tu as déjà vu. Elle peut tomber de n’importe quel coffre, pendant cent jours. Ouvre l’app.',
      tag: 'nouvelle-carte',
      url: '/battlepass',
    }));

  const envoyes = (await Promise.all(envois)).filter(Boolean).length;
  return res.status(200).json({ annonce: true, abonnes: abonnes.length, envoyes });
}
