import webpush from 'web-push';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/** Initialise Firebase Admin à partir du service account stocké en variable d'env. */
export function getDb() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquant');
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@calicrew.app';
  if (!publicKey || !privateKey) throw new Error('Clés VAPID manquantes');
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Vérifie le secret envoyé par Vercel Cron. */
export function isAuthorized(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization;
  return header === `Bearer ${secret}`;
}

export interface Subscription {
  uid: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Payload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Envoie une notification. Supprime l'abonnement de Firestore s'il est
 * définitivement invalide (404/410), sinon laisse l'erreur remonter au log.
 */
export async function sendTo(sub: Subscription, payload: Payload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await getDb().collection('pushSubscriptions').doc(sub.uid).delete();
    } else {
      console.error(`Echec push pour ${sub.uid}:`, status, (err as Error).message);
    }
    return false;
  }
}

/** Convertit une heure murale d'un fuseau donné en timestamp epoch. */
function zonedToEpoch(y: number, m: number, d: number, hour: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return guess - (asUtc - guess);
}

const TZ = 'Europe/Paris';

/**
 * Début du "jour de défi" courant : aujourd'hui 10h heure de Paris.
 * Identique au getDayStart() du client pour les utilisateurs en France.
 */
export function getDayStart(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return zonedToEpoch(get('year'), get('month'), get('day'), 10, TZ);
}

/** Même numérotation que le client, pour reconstruire l'id du défi du jour. */
export function getDayNumber(): number {
  const ref = zonedToEpoch(2026, 1, 1, 10, TZ);
  return Math.floor((getDayStart() - ref) / (24 * 60 * 60 * 1000));
}
