import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getDb, configureWebPush, sendTo, getDayKey, type Subscription } from '../_lib/push.js';

/**
 * Envoie une notification de test à l'utilisateur authentifié, et renvoie un
 * diagnostic de la chaîne.
 *
 * Tout ce qui pouvait casser dans les notifications échouait en silence : une
 * variable d'environnement absente sur Vercel, un abonnement révoqué par iOS,
 * un cron qui repart en 401. Cet endpoint parcourt exactement le même chemin
 * que les crons — mêmes clés VAPID, même Admin SDK, même abonnement stocké —
 * et dit où ça coince.
 *
 * Il ne renvoie jamais la valeur d'un secret, seulement sa présence.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const config = {
    serviceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    vapidPublic: !!process.env.VAPID_PUBLIC_KEY,
    vapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
    // Sans lui, Vercel n'envoie aucun en-tête d'autorisation et les crons
    // repartent en 401 sans rien faire ni rien signaler.
    cronSecret: !!process.env.CRON_SECRET,
  };
  const missing = Object.entries(config)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  if (!config.serviceAccount) {
    return res.status(503).json({
      ok: false,
      step: 'config',
      config,
      missing,
      error: 'FIREBASE_SERVICE_ACCOUNT manquant : impossible de vérifier qui appelle.',
    });
  }

  const db = getDb();

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok: false, step: 'auth', error: 'Jeton manquant' });

  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(token)).uid;
  } catch {
    return res.status(401).json({ ok: false, step: 'auth', error: 'Jeton invalide' });
  }

  if (!config.vapidPublic || !config.vapidPrivate) {
    return res.status(503).json({
      ok: false, step: 'config', config, missing,
      error: 'Clés VAPID manquantes : aucune notification ne peut partir.',
    });
  }

  const snap = await db.collection('pushSubscriptions').doc(uid).get();
  if (!snap.exists) {
    return res.status(404).json({
      ok: false, step: 'subscription', config, missing,
      error: "Aucun abonnement enregistré pour ce compte. Réactive les rappels dans l'app.",
    });
  }

  const sub = snap.data() as Subscription & { creatine?: boolean; dailyChallenge?: boolean };

  configureWebPush();
  const sent = await sendTo(sub, {
    title: 'CaliCrew',
    body: 'Test reçu : les notifications fonctionnent.',
    tag: 'test',
    url: '/',
  });

  return res.status(sent ? 200 : 502).json({
    ok: sent,
    step: 'send',
    config,
    missing,
    prefs: { creatine: !!sub.creatine, dailyChallenge: !!sub.dailyChallenge },
    // L'endpoint identifie le service push du navigateur, sans rien révéler.
    pushService: hostOf(sub.endpoint),
    parisDay: getDayKey(),
    error: sent
      ? undefined
      : "L'abonnement a été refusé par le service push. Il est probablement expiré : réactive les rappels.",
  });
}

function hostOf(endpoint?: string): string {
  try {
    return new URL(endpoint || '').host;
  } catch {
    return 'inconnu';
  }
}
