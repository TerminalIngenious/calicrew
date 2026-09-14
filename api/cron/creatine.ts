import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, type Subscription } from '../_lib/push.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const snap = await db.collection('pushSubscriptions').where('creatine', '==', true).get();

  const results = await Promise.all(
    snap.docs.map((d) =>
      sendTo(d.data() as Subscription, {
        title: 'CaliCrew',
        body: "Chef, t'as pris ta créatine ??",
        tag: 'creatine',
        url: '/',
      })
    )
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: snap.size, sent });
}
