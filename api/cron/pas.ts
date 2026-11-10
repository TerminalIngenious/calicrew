import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayKey, getDayNumber } from '../_lib/push.js';
import { lisAbonnements } from '../_lib/groupe.js';
import { PAS_MESSAGES, messageDuJour } from '../_lib/messages.js';

/**
 * Le rappel des pas, tous les soirs à 21h.
 *
 * Il part à tous les abonnés et non à une famille de préférences : les
 * réglages de l'app ne proposent plus qu'un interrupteur, « notifications
 * oui ou non », et les familles ne servent qu'au serveur pour les
 * abonnements d'avant. Un rappel de plus n'a pas besoin de sa propre case.
 *
 * Seuls ceux qui n'ont pas encore noté leurs pas du jour le reçoivent :
 * rappeler quelque chose de déjà fait est le meilleur moyen de faire couper
 * les notifications.
 *
 * Le cron est calé sur 20h UTC, ce qui fait 21h à Paris de fin octobre à fin
 * mars. Au passage à l'heure d'été il faudra le descendre à 19h UTC, sinon
 * le rappel arrivera à 22h.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const abonnes = await lisAbonnements(db);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0, skipped: 0 });

  const jour = getDayKey();
  const progressions = await db.getAll(
    ...abonnes.map((a) => db.collection('userProgress').doc(a.uid))
  );
  const notes = new Set(
    progressions
      .filter((p) => {
        const pas = (p.data()?.pasJours as Record<string, number> | undefined)?.[jour];
        return typeof pas === 'number' && pas > 0;
      })
      .map((p) => p.id)
  );

  const restants = abonnes.filter((a) => !notes.has(a.uid));

  const results = await Promise.all(
    restants.map((a) =>
      sendTo(a, {
        title: 'CaliCrew',
        body: messageDuJour(PAS_MESSAGES, getDayNumber()),
        tag: 'pas',
        url: '/',
      })
    )
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ jour, targeted: restants.length, sent, skipped: notes.size });
}
