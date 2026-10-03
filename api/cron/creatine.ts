import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayKey, type Subscription } from '../_lib/push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const snap = await db.collection('pushSubscriptions').where('creatine', '==', true).get();
  if (snap.empty) return res.status(200).json({ targeted: 0, sent: 0, skipped: 0 });

  // On ne relance que ceux qui n'ont pas encore coché la prise du jour.
  const today = getDayKey();
  const progressDocs = await db.getAll(
    ...snap.docs.map((d) => db.collection('userProgress').doc(d.id))
  );
  const taken = new Set(
    progressDocs
      .filter((p) => (p.data()?.creatineDays as string[] | undefined)?.includes(today))
      .map((p) => p.id)
  );

  const pending = snap.docs.filter((d) => !taken.has(d.id));

  const results = await Promise.all(
    pending.map((d) =>
      sendTo(d.data() as Subscription, {
        title: 'CaliCrew',
        body: "Chef, t'as pris ta créatine ??",
        tag: 'creatine',
        url: '/',
      })
    )
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: pending.length, sent, skipped: taken.size });
}
