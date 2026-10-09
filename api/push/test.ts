import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  // Une erreur non rattrapée ici produit un 500 opaque côté Vercel, ce qui
  // nous ramènerait au problème que cet endpoint est censé résoudre.
  try {
    return await run(req, res);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      step: 'serveur',
      error: (err as Error).message || 'Erreur serveur inattendue.',
    });
  }
}

async function run(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  const config = {
    serviceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    vapidPublic: !!process.env.VAPID_PUBLIC_KEY,
    vapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
    // Sans lui, Vercel n'envoie aucun en-tête d'autorisation et les crons
    // repartent en 401 sans rien faire ni rien signaler.
    cronSecret: !!process.env.CRON_SECRET,
    firebaseApiKey: !!process.env.VITE_FIREBASE_API_KEY,
  };
  const missing = Object.entries(config)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok: false, step: 'auth', error: 'Jeton manquant' });

  const uid = await verifyIdToken(token);
  if (!uid) {
    // Pas de `config` ici : l'état de la configuration ne regarde que
    // l'utilisateur authentifié, pas n'importe quel appelant.
    return res.status(401).json({
      ok: false,
      step: 'auth',
      error: config.firebaseApiKey
        ? "Session expirée. Recharge l'app et réessaie."
        : "VITE_FIREBASE_API_KEY absente côté serveur : impossible de vérifier qui appelle.",
    });
  }

  if (!config.serviceAccount || !config.vapidPublic || !config.vapidPrivate) {
    return res.status(503).json({
      ok: false, step: 'config', config, missing,
      error: 'Configuration serveur incomplète : aucune notification ne peut partir.',
    });
  }

  const snap = await getDb().collection('pushSubscriptions').doc(uid).get();
  if (!snap.exists) {
    return res.status(404).json({
      ok: false, step: 'subscription', config, missing,
      error: "Aucun abonnement enregistré pour ce compte. Désactive puis réactive les rappels.",
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
    // Identifie le service push du navigateur, sans rien révéler de l'abonnement.
    pushService: hostOf(sub.endpoint),
    parisDay: getDayKey(),
    error: sent
      ? undefined
      : "L'abonnement a été refusé par le service push. Il est expiré : réactive les rappels.",
  });
}

/**
 * Vérifie le jeton via l'API Identity Toolkit plutôt que par `firebase-admin/auth`.
 *
 * Cet import-là fait échouer le bundler de Vercel au chargement du module, ce
 * qui produisait un FUNCTION_INVOCATION_FAILED avant même d'entrer dans le
 * handler. La clé d'API web de Firebase n'est pas un secret — elle est déjà
 * dans le bundle client — et sert ici uniquement à valider le jeton.
 */
async function verifyIdToken(idToken: string): Promise<string | null> {
  const key = process.env.VITE_FIREBASE_API_KEY;
  if (!key) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;

  const body = (await res.json()) as { users?: { localId?: string }[] };
  return body.users?.[0]?.localId || null;
}

function hostOf(endpoint?: string): string {
  try {
    return new URL(endpoint || '').host;
  } catch {
    return 'inconnu';
  }
}
