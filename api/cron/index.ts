import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthorized } from '../_lib/push.js';
import ambiance from '../_lib/taches/ambiance.js';
import creatine from '../_lib/taches/creatine.js';
import defiDuJour from '../_lib/taches/daily-challenge.js';
import faceid from '../_lib/taches/faceid.js';
import hasard from '../_lib/taches/hasard.js';
import pas from '../_lib/taches/pas.js';
import recap from '../_lib/taches/recap.js';

/**
 * L'unique porte d'entrée des tâches planifiées.
 *
 * Chaque route d'un projet Vercel compte pour une fonction, et le forfait
 * Hobby en autorise douze. À sept crons, un par fichier, le déploiement a
 * fini par être refusé — et il l'aurait été au prochain cron ajouté, sans
 * rapport avec celui qui aurait fait déborder.
 *
 * Les tâches vivent donc sous `_lib`, que Vercel ne publie pas, et ce
 * répartiteur les appelle par leur nom. Sept fonctions deviennent une.
 *
 * Le contrôle du secret se fait ici et une seule fois : les tâches ne sont
 * plus atteignables de l'extérieur, c'est cette porte qui est gardée.
 */
const TACHES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
  ambiance,
  creatine,
  'daily-challenge': defiDuJour,
  faceid,
  hasard,
  pas,
  recap,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const nom = typeof req.query.job === 'string' ? req.query.job : '';
  const tache = TACHES[nom];
  if (!tache) return res.status(404).json({ erreur: 'Tâche inconnue', connues: Object.keys(TACHES) });

  return tache(req, res);
}
