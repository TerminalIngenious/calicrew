import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayKey } from '../_lib/push.js';
import { lisAbonnements } from '../_lib/groupe.js';
import { FACEID_LANCEMENT, FACEID_SEMAINE, FACEID_DERNIER_JOUR } from '../_lib/messages.js';

/*
 * Le logo de l'app, en vert.
 *
 * Pas un autre dessin : pendant l'event l'app elle-même passe au vert, et
 * une notification qui arrive avec une marque inconnue ne se rattache à
 * rien. Même logo, autre couleur.
 */
const ICONE = '/icon-vert-192.png';

/**
 * Les rendez-vous de l'event FaceID.
 *
 * Un seul cron pour les cinq dates, et non un par jour : le plan Hobby ne
 * déclenche un cron qu'une fois par jour, donc cinq crons auraient occupé
 * cinq créneaux toute l'année pour cinq matins de novembre. Ici le cron tourne
 * tous les jours à 9h UTC et ne dit quelque chose que les jours prévus.
 *
 * 9h UTC et non 10h : en novembre Paris est à UTC+1, et c'est l'heure de
 * Paris qui compte — c'est à 10h locales que `FACEID_DEBUT` ouvre l'event et
 * que les semaines basculent. Si l'event revenait un jour en été, l'heure du
 * cron serait à redescendre d'une heure.
 */
const RENDEZ_VOUS: Record<string, { titre: string; texte: string; tag: string }> = {
  '2026-11-09': { titre: 'FaceID', texte: FACEID_LANCEMENT, tag: 'faceid-debut' },
  '2026-11-16': { titre: 'FaceID — semaine 2', texte: FACEID_SEMAINE[0], tag: 'faceid-s2' },
  '2026-11-23': { titre: 'FaceID — semaine 3', texte: FACEID_SEMAINE[1], tag: 'faceid-s3' },
  '2026-11-29': { titre: 'FaceID', texte: FACEID_DERNIER_JOUR, tag: 'faceid-fin' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const jour = getDayKey();
  const rdv = RENDEZ_VOUS[jour];
  if (!rdv) return res.status(200).json({ skipped: true, jour });

  configureWebPush();
  const db = getDb();

  // Tous les abonnés, sans filtre de préférence : l'event n'a pas de case à
  // cocher, et quatre notifications en trois semaines ne sont pas la vanne
  // quotidienne qu'on peut vouloir couper.
  const abonnes = await lisAbonnements(db);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0 });

  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, {
      title: rdv.titre,
      body: rdv.texte,
      tag: rdv.tag,
      url: '/faceid',
      icon: ICONE,
    }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ jour, targeted: abonnes.length, sent, body: rdv.texte });
}
