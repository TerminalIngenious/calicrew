import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/push.js';
import { uidDuJeton } from './_lib/auth.js';
import { calcule } from './_lib/stats.cjs';

/**
 * Les chiffres de l'app, pour le créateur seulement.
 *
 * Le verrou est ici et non dans la page : la réponse contient les adresses
 * email des inscrits, et une page qui se contenterait de cacher un bouton
 * laisserait l'adresse de l'API ouverte à qui la devine. Le serveur vérifie
 * donc le jeton Firebase, puis que l'uid derrière est bien dans la liste —
 * sans quoi il ne lit même pas la base.
 *
 * La liste vient de l'environnement, pas du code : ajouter quelqu'un ne doit
 * pas demander un déploiement, et surtout une liste en dur dans un dépôt
 * public annonce à tout le monde quel compte vise une attaque.
 */
function admins(): string[] {
  return (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ erreur: 'Non connecté' });

  const liste = admins();
  if (liste.length === 0) {
    return res.status(503).json({ erreur: 'ADMIN_UIDS non configuré sur le serveur' });
  }
  if (!liste.includes(uid)) return res.status(403).json({ erreur: 'Accès refusé' });

  const db = getDb();
  const [users, sessions, groups, progress] = await Promise.all([
    db.collection('users').get(),
    db.collection('sessions').get(),
    db.collection('groups').get(),
    db.collection('userProgress').get(),
  ]);

  const stats = calcule({
    users: users.docs.map((d) => ({ uid: d.id, ...d.data() })),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })),
    groups: groups.docs.map((d) => ({ id: d.id, ...d.data() })),
    progress: progress.docs.map((d) => ({ uid: d.id, ...d.data() })),
  });

  // Jamais de cache : ces chiffres n'ont d'intérêt que frais, et un
  // intermédiaire qui garderait la réponse la servirait à un autre compte.
  res.setHeader('Cache-Control', 'no-store, private');
  res.status(200).json(stats);
}
