import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayNumber } from '../_lib/push.js';
import { lisAbonnements, veutAmbiance, lisNoms } from '../_lib/groupe.js';
import { DEFIS_SURPRISE, PATRON_DU_JOUR, messageDuJour } from '../_lib/messages.js';

/**
 * Le défi surprise de l'après-midi.
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
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const abonnes = (await lisAbonnements(db)).filter(veutAmbiance);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0 });

  const jour = getDayNumber();
  let titre = 'Défi surprise';
  let texte = messageDuJour(DEFIS_SURPRISE, jour);

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
    }
  }

  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, { title: titre, body: texte, tag: 'hasard', url: '/' }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: abonnes.length, sent, body: texte });
}
