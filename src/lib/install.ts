/**
 * Installation de l'app depuis le site, sans passer par un store.
 *
 * Chaque plateforme répond différemment, et c'est tout l'enjeu de ce fichier :
 *
 * - Android, Windows, macOS sous Chrome ou Edge : le navigateur propose
 *   lui-même l'installation via l'événement `beforeinstallprompt`. On
 *   l'intercepte pour la déclencher au moment choisi — un vrai bouton.
 * - iPhone et iPad : Apple n'expose aucune API. Le seul chemin est Partager →
 *   Sur l'écran d'accueil, fait à la main. On ne peut qu'expliquer.
 * - Safari sur Mac : Fichier → Ajouter au Dock, à la main également.
 * - Firefox : pas d'installation.
 *
 * L'événement part très tôt, souvent avant que React ait fini de monter.
 * `ecouteInstallation()` est donc appelée dès main.tsx, et ce module garde
 * l'invitation de côté jusqu'à ce qu'une page la demande.
 */

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Plateforme = 'android' | 'ios' | 'windows' | 'macos' | 'autre';
export type Navigateur = 'chromium' | 'safari' | 'firefox' | 'in-app' | 'autre';

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

function detectePlateforme(): Plateforme {
  if (/android/i.test(ua)) return 'android';
  // L'iPad se présente comme un Mac depuis iPadOS 13 : seul l'écran tactile
  // permet encore de les distinguer.
  const iPad = /Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || iPad) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macos';
  return 'autre';
}

function detecteNavigateur(): Navigateur {
  // Les navigateurs intégrés d'Instagram, Snap ou TikTok n'ont aucun menu
  // d'installation. C'est la première cause d'échec quand le lien est partagé
  // en story : il faut le dire, pas laisser l'utilisateur chercher.
  if (/Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|Line\//i.test(ua)) return 'in-app';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/edg|chrome|crios|chromium/i.test(ua)) return 'chromium';
  if (/safari/i.test(ua)) return 'safari';
  return 'autre';
}

export const PLATEFORME: Plateforme = detectePlateforme();
export const NAVIGATEUR: Navigateur = detecteNavigateur();

/** L'app tourne-t-elle déjà dans sa propre fenêtre, hors navigateur ? */
export function estInstallee(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // La propriété d'Apple, seule façon de le savoir sur iPhone.
  return (navigator as { standalone?: boolean }).standalone === true;
}

let invitation: InvitationInstallation | null = null;
let installee = false;
const abonnes = new Set<() => void>();

function previent() {
  for (const cb of abonnes) cb();
}

export function ecouteInstallation(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sans ça, Chrome affiche sa propre bannière au moment qui lui plaît.
    e.preventDefault();
    invitation = e as InvitationInstallation;
    previent();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    installee = true;
    previent();
  });
}

/** Pour useSyncExternalStore : doit renvoyer la même valeur tant que rien ne bouge. */
export function etatInstallation(): boolean {
  return invitation !== null;
}

export function installationFaite(): boolean {
  return installee;
}

export function abonneInstallation(cb: () => void): () => void {
  abonnes.add(cb);
  return () => abonnes.delete(cb);
}

/**
 * Déclenche la boîte de dialogue du navigateur. Renvoie `false` si rien n'a
 * pu être proposé — à l'appelant d'afficher les instructions manuelles.
 */
export async function lanceInstallation(): Promise<boolean> {
  if (!invitation) return false;
  const inv = invitation;
  // L'invitation n'est utilisable qu'une fois : on la libère avant d'attendre
  // la réponse, sinon un double clic rappellerait un événement déjà consommé.
  invitation = null;
  previent();
  await inv.prompt();
  const { outcome } = await inv.userChoice;
  return outcome === 'accepted';
}
