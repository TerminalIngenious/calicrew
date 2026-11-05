import { auth } from './firebase';

/**
 * Les notifications déclenchées par un geste dans l'app.
 *
 * Elles partent du serveur, qui seul détient la clé VAPID privée, mais c'est
 * l'app qui sait quand : à la seconde où une séance se termine, où une
 * proposition d'échange est déposée. Un cron ne pourrait pas le savoir à la
 * minute près.
 *
 * Trois règles ici :
 *
 * - rien n'est attendu. Une notification qui ne part pas ne doit jamais faire
 *   échouer une séance ou un échange, ni même les ralentir ;
 * - le jeton d'identité part dans l'en-tête. Le serveur vérifie qui appelle,
 *   et c'est lui qui décide des destinataires — l'app ne les donne jamais ;
 * - les erreurs sont avalées en silence. Hors ligne, l'appel échoue, et c'est
 *   très bien : la notification n'a plus d'intérêt une heure plus tard.
 */
async function previens(route: string, corps?: Record<string, unknown>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const jeton = await user.getIdToken();
    await fetch(`/api/notify/${route}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps || {}),
    });
  } catch {
    // Hors ligne, ou fonction indisponible : tant pis pour la notification.
  }
}

/** Une séance vient de se terminer. */
export function previensSeance(): void {
  void previens('session');
}

/** Quelqu'un vient de répondre à une annonce d'échange. */
export function previensEchange(listingId: string): void {
  void previens('trade', { listingId });
}
