import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export interface PushPrefs {
  creatine: boolean;
  dailyChallenge: boolean;
}

export const DEFAULT_PUSH_PREFS: PushPrefs = { creatine: false, dailyChallenge: false };

/** Le navigateur supporte-t-il le Web Push ? */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iOS n'autorise le push que si la PWA est installée sur l'écran d'accueil. */
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Sur iOS hors écran d'accueil, le push est impossible quoi qu'il arrive. */
export function needsInstall(): boolean {
  return isIos() && !isStandalone();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * `navigator.serviceWorker.ready` ne rejette jamais : si aucun service worker
 * ne prend le contrôle, la promesse reste en suspens indéfiniment. Sans cette
 * garde, le bouton d'activation restait grisé pour toujours.
 */
async function readyRegistration(timeoutMs = 10_000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Service worker indisponible (délai dépassé)')),
        timeoutMs
      )
    ),
  ]);
}

async function subscribeNow(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

function subscriptionPayload(sub: PushSubscription, uid: string, prefs: PushPrefs) {
  const json = sub.toJSON();
  return {
    uid,
    endpoint: json.endpoint,
    keys: json.keys,
    creatine: prefs.creatine,
    dailyChallenge: prefs.dailyChallenge,
    updatedAt: Date.now(),
  };
}

export async function getPushPrefs(uid: string): Promise<PushPrefs> {
  const snap = await getDoc(doc(db, 'pushSubscriptions', uid));
  if (!snap.exists()) return DEFAULT_PUSH_PREFS;
  const data = snap.data();
  return {
    creatine: data.creatine ?? false,
    dailyChallenge: data.dailyChallenge ?? false,
  };
}

export type EnableResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unsupported' | 'no-key' | 'blocked' | 'dismissed' | 'rules' | 'error';
      detail?: string;
    };

/**
 * Demande la permission, s'abonne au push et enregistre l'abonnement dans Firestore.
 * Le motif d'échec est renvoyé explicitement : les causes sont très différentes
 * (clé absente côté build, permission bloquée par le navigateur, prompt ignoré).
 */
export async function enablePush(uid: string, prefs: PushPrefs): Promise<EnableResult> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-key' };

  // Si la permission est déjà bloquée, requestPermission() résout immédiatement
  // sans afficher de prompt : il faut le dire clairement à l'utilisateur.
  if (Notification.permission === 'denied') return { ok: false, reason: 'blocked' };

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return { ok: false, reason: 'blocked' };
  if (permission !== 'granted') return { ok: false, reason: 'dismissed' };

  try {
    const registration = await readyRegistration();

    const existing = await registration.pushManager.getSubscription();
    // Un abonnement créé avec une autre clé VAPID reste en place mais
    // deviendrait inutilisable : on le remplace.
    if (existing) await existing.unsubscribe();

    const sub = await subscribeNow(registration);
    await setDoc(doc(db, 'pushSubscriptions', uid), subscriptionPayload(sub, uid, prefs));

    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = (err as Error).message || String(err);
    // Cause la plus fréquente : les règles Firestore n'autorisent pas encore
    // la collection pushSubscriptions.
    if (code === 'permission-denied' || /permission|insufficient/i.test(message)) {
      return { ok: false, reason: 'rules', detail: message };
    }
    return { ok: false, reason: 'error', detail: message };
  }
}

/** Met à jour les préférences sans redemander la permission. */
export async function updatePushPrefs(uid: string, prefs: Partial<PushPrefs>): Promise<void> {
  await updateDoc(doc(db, 'pushSubscriptions', uid), { ...prefs, updatedAt: Date.now() });
}

/** Désabonne complètement et supprime l'abonnement stocké. */
export async function disablePush(uid: string): Promise<void> {
  if (isPushSupported()) {
    try {
      const registration = await readyRegistration();
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch {
      // Le désabonnement local a échoué : on supprime quand même le document,
      // sinon on resterait abonné côté serveur sans pouvoir l'arrêter.
    }
  }
  await deleteDoc(doc(db, 'pushSubscriptions', uid));
}

export type SyncOutcome =
  | 'inactive'            // aucun rappel activé, rien à vérifier
  | 'ok'                  // l'abonnement stocké est bien celui du navigateur
  | 'repaired'            // il avait été révoqué ou avait changé : réenregistré
  | 'permission-default'  // jamais accordée ou remise à zéro : on peut redemander
  | 'permission-denied'   // refusée : seuls les réglages du téléphone peuvent la rendre
  | 'unsupported'
  | 'failed';

/**
 * Réaligne l'abonnement du navigateur avec celui stocké dans Firestore.
 *
 * iOS révoque les abonnements push tout seul — après une mise à jour de la
 * PWA, une réinstallation, ou simplement plusieurs semaines sans ouvrir
 * l'app. Les préférences restaient alors à « activé » alors que l'endpoint
 * enregistré était mort : l'app affichait des rappels actifs et il n'arrivait
 * jamais rien. On s'en rend compte ici et on se réabonne sans rien demander,
 * puisque la permission est déjà accordée.
 */
export async function syncSubscription(uid: string, prefs: PushPrefs): Promise<SyncOutcome> {
  if (!prefs.creatine && !prefs.dailyChallenge) return 'inactive';
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return 'unsupported';
  // La distinction compte : « default » se répare par un bouton dans l'app,
  // « denied » ne se répare que dans les réglages du téléphone.
  if (Notification.permission === 'denied') return 'permission-denied';
  if (Notification.permission !== 'granted') return 'permission-default';

  try {
    const registration = await readyRegistration();
    const sub =
      (await registration.pushManager.getSubscription()) || (await subscribeNow(registration));

    const stored = await getDoc(doc(db, 'pushSubscriptions', uid));
    if (stored.exists() && stored.data().endpoint === sub.toJSON().endpoint) return 'ok';

    await setDoc(doc(db, 'pushSubscriptions', uid), subscriptionPayload(sub, uid, prefs));
    return 'repaired';
  } catch (err) {
    console.error('Synchronisation de l\'abonnement push impossible:', err);
    return 'failed';
  }
}
