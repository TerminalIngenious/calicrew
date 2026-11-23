import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayNumber, getDayKey } from '../_lib/push.js';
import { lisAbonnements, veutAmbiance, lisNoms, heureDuJour } from '../_lib/groupe.js';
import { defiDuJour, PATRON_DU_JOUR } from '../_lib/messages.js';

/** Les heures possibles, en UTC — soit 10h-16h l'hiver, 11h-17h l'été. */
const HEURES = [9, 11, 13, 15];

/**
 * Le défi surprise de la journée.
 *
 * Rien à valider, rien à cocher, aucune incidence sur les statistiques : la
 * notification demande dix secondes d'effort là où on se trouve. C'est le
 * seul rappel qui ne regarde pas ce que le joueur a fait — il tombe pareil
 * pour tout le monde, et c'est ce qui le rend drôle.
 *
 * Un jour sur quatre, c'est le patron du jour à la place : un membre tiré au
 * sort, désigné par le numéro du jour pour que tout le monde reçoive le même
 * nom et que le tirage ne puisse pas tomber deux jours de suite sur la même
 * personne tant que le groupe ne change pas.
 *
 * L'heure change tous les jours, et c'est volontaire : un défi surprise qui
 * tombe à 14h pile n'est plus une surprise au bout de trois jours. Plusieurs
 * crons pointent donc ici, chacun avec son heure en paramètre, et seul celui
 * de service aujourd'hui va au bout.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const jour = getDayNumber();
  const demandee = Number(req.query.h);
  if (demandee !== heureDuJour(jour, HEURES, 0)) {
    return res.status(200).json({ skipped: true, heure: demandee });
  }

  configureWebPush();
  const db = getDb();

  const abonnes = (await lisAbonnements(db)).filter(veutAmbiance);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0 });

  const defi = defiDuJour(jour);
  let titre = 'Défi surprise';
  let texte = defi.texte;
  let patron = false;

  if (jour % 4 === 0) {
    const noms = await lisNoms(db);
    // Les abonnés triés par uid : l'ordre ne doit pas dépendre de celui, non
    // garanti, dans lequel Firestore rend les documents.
    const candidats = abonnes.map((a) => a.uid).sort();
    const choisi = candidats[((jour / 4) | 0) % candidats.length];
    const nom = noms.get(choisi);
    if (nom) {
      const modeles = PATRON_DU_JOUR;
      titre = 'Patron du jour';
      texte = modeles[((jour % modeles.length) + modeles.length) % modeles.length](nom);
      patron = true;
    }
  }

  /*
   * Le défi du jour est déposé dans la progression de chacun, et non dans une
   * collection à part : l'app y est déjà abonnée en direct, elle le reçoit
   * donc sans lecture de plus et sans règle d'accès nouvelle.
   *
   * Pas le jour du patron : il n'y a rien à faire ni à cocher.
   */
  if (!patron) {
    const jourCle = getDayKey();
    const lot = db.batch();
    for (const a of abonnes) {
      lot.set(
        db.collection('userProgress').doc(a.uid),
        { defiDuJour: { jour: jourCle, id: defi.id, texte: defi.texte,
                        exercices: defi.exercices || [], duree: defi.duree || 0, fait: false } },
        { merge: true }
      );
    }
    await lot.commit();
  }

  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, { title: titre, body: texte, tag: 'hasard', url: '/' }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: abonnes.length, sent, body: texte, defi: patron ? null : defi.id });
}
