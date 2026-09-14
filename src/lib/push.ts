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

export async function getPushPrefs(uid: string): Promise<PushPrefs> {
  const snap = await getDoc(doc(db, 'pushSubscriptions', uid));
  if (!snap.exists()) return DEFAULT_PUSH_PREFS;
  const data = snap.data();
  return {
    creatine: data.creatine ?? false,
    dailyChallenge: data.dailyChallenge ?? false,
  };
}

/**
 * Demande la permission, s'abonne au push et enregistre l'abonnement dans Firestore.
 * Renvoie null si la permission est refusée ou si le push est indisponible.
 */
export async function enablePush(uid: string, prefs: PushPrefs): Promise<PushPrefs | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  await setDoc(doc(db, 'pushSubscriptions', uid), {
    uid,
    endpoint: json.endpoint,
    keys: json.keys,
    creatine: prefs.creatine,
    dailyChallenge: prefs.dailyChallenge,
    updatedAt: Date.now(),
  });

  return prefs;
}

/** Met à jour les préférences sans redemander la permission. */
export async function updatePushPrefs(uid: string, prefs: Partial<PushPrefs>): Promise<void> {
  await updateDoc(doc(db, 'pushSubscriptions', uid), { ...prefs, updatedAt: Date.now() });
}

/** Désabonne complètement et supprime l'abonnement stocké. */
export async function disablePush(uid: string): Promise<void> {
  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  await deleteDoc(doc(db, 'pushSubscriptions', uid));
}
