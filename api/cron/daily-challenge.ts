import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getDb, configureWebPush, isAuthorized, sendTo,
  getDayStart, getDayNumber, type Subscription,
} from '../_lib/push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const dayStart = getDayStart();
  const dailyId = `d${getDayNumber()}-daily`;

  const snap = await db.collection('pushSubscriptions').where('dailyChallenge', '==', true).get();
  if (snap.empty) return res.status(200).json({ targeted: 0, sent: 0, skipped: 0 });

  // On ne notifie que ceux qui n'ont pas encore validé le défi du jour.
  const progressDocs = await db.getAll(
    ...snap.docs.map((d) => db.collection('userProgress').doc(d.id))
  );
  const claimed = new Set(
    progressDocs
      .filter((p) => (p.data()?.questsClaimed?.[dailyId] || 0) >= dayStart)
      .map((p) => p.id)
  );

  const pending = snap.docs.filter((d) => !claimed.has(d.id));

  const results = await Promise.all(
    pending.map((d) =>
      sendTo(d.data() as Subscription, {
        title: 'Défi du jour',
        body: "T'as pas encore fait ton défi du jour ! Il te reste la soirée.",
        tag: 'daily-challenge',
        url: '/battlepass',
      })
    )
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: pending.length, sent, skipped: claimed.size });
}
