import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo, getDayKey, getDayNumber, decaleJour, type Subscription } from '../push.js';
import { CREATINE_MESSAGES, messageDuJour } from '../messages.js';

/**
 * Le quota de gels, tel que le client le fait respecter dans `lib/creatine.ts`.
 * Recopié et non importé : `api/` est compilé en CommonJS et ne peut pas tirer
 * un module qui dépend de React.
 */
const GELS_PAR_MOIS = 3;

/** Combien de gels restent pour le mois d'un jour donné. */
function gelsRestants(gels: string[], jour: string): number {
  const mois = jour.slice(0, 7);
  return GELS_PAR_MOIS - gels.filter((g) => g.slice(0, 7) === mois).length;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  configureWebPush();
  const db = getDb();

  const snap = await db.collection('pushSubscriptions').where('creatine', '==', true).get();
  if (snap.empty) return res.status(200).json({ targeted: 0, sent: 0, skipped: 0, gels: 0 });

  const today = getDayKey();
  const hier = decaleJour(today, -1);
  const avantHier = decaleJour(today, -2);

  const progressDocs = await db.getAll(
    ...snap.docs.map((d) => db.collection('userProgress').doc(d.id))
  );

  const taken = new Set<string>();
  /** Ceux qui ont un oubli d'hier encore rattrapable, et combien il leur reste. */
  const aRattraper = new Map<string, number>();

  for (const p of progressDocs) {
    const data = p.data() || {};
    const jours = (data.creatineDays as string[] | undefined) || [];
    const gels = (data.creatineGels as string[] | undefined) || [];
    const tenu = (j: string) => jours.includes(j) || gels.includes(j);

    if (jours.includes(today)) taken.add(p.id);

    // On ne prévient que d'un trou isolé : hier manque, mais la veille était
    // tenue. Sans cette condition, quelqu'un qui a simplement arrêté la
    // créatine recevrait le rappel tous les matins jusqu'à la fin du mois.
    const reste = gelsRestants(gels, hier);
    if (!tenu(hier) && tenu(avantHier) && reste > 0) aRattraper.set(p.id, reste);
  }

  // Le rappel de gel passe avant le rappel du soir pour ceux qui ont les deux :
  // il est plus urgent, et son texte rappelle déjà la prise du jour.
  const pending = snap.docs.filter((d) => !taken.has(d.id) && !aRattraper.has(d.id));

  const results = await Promise.all([
    ...pending.map((d) =>
      sendTo(d.data() as Subscription, {
        title: 'CaliCrew',
        body: messageDuJour(CREATINE_MESSAGES, getDayNumber()),
        tag: 'creatine',
        url: '/',
      })
    ),
    ...snap.docs
      .filter((d) => aRattraper.has(d.id))
      .map((d) => {
        const reste = aRattraper.get(d.id) as number;
        return sendTo(d.data() as Subscription, {
          title: '🧊 Ton streak tient à un gel',
          body: `Hier n'est pas coché. Il te reste ${reste} gel${reste > 1 ? 's' : ''} ce mois-ci — pose-en un avant qu'il soit trop tard, et prends celle d'aujourd'hui.`,
          tag: 'creatine-gel',
          url: '/',
        });
      }),
  ]);

  const sent = results.filter(Boolean).length;
  return res.status(200).json({
    targeted: pending.length + aRattraper.size,
    sent,
    skipped: taken.size,
    gels: aRattraper.size,
  });
}
