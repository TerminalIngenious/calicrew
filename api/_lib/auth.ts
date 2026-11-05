import { getAuth } from 'firebase-admin/auth';
import { getDb } from './push.js';

/**
 * L'uid derrière un jeton Firebase, ou null.
 *
 * Les crons s'authentifient avec un secret partagé, mais ces routes-ci sont
 * appelées par l'app depuis le téléphone des joueurs : un secret y serait
 * lisible par n'importe qui ouvrant les sources. On vérifie donc le jeton
 * d'identité Firebase, et c'est le serveur qui décide à qui la notification
 * part — l'appelant ne fournit jamais de destinataire.
 */
export async function uidDuJeton(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<string | null> {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  // Initialise l'app admin, dont getAuth() a besoin.
  getDb();
  try {
    return (await getAuth().verifyIdToken(header.slice(7))).uid;
  } catch {
    return null;
  }
}
