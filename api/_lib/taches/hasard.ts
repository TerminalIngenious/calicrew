import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo, getDayNumber, getDayKey } from '../push.js';
import { lisAbonnements, veutAmbiance, lisNoms } from '../groupe.js';
import { defiDuJour, PATRON_DU_JOUR } from '../messages.js';

/**
 * Les trois créneaux du jour, en UTC — soit 8h-18h l'hiver, 9h-19h l'été.
 *
 * Trois défis par jour et non un seul, et jamais les trois mêmes heures d'un
 * jour sur l'autre. Les triplets sont écrits à la main plutôt que tirés au
 * sort : un défi ne vit que trois heures, donc deux créneaux séparés de deux
 * heures feraient disparaître le premier avant la fin de sa fenêtre. Tous
 * ceux-ci laissent au moins quatre heures entre deux défis.
 */
const TRIPLETS = [[7, 11, 15], [9, 13, 17], [7, 11, 17], [7, 13, 17]];

/** Autant que de créneaux : sert à décaler le texte de chaque défi. */
const PAR_JOUR = 3;

/** Trois heures pour le faire, ensuite il disparaît. */
const FENETRE_MS = 3 * 60 * 60 * 1000;

/** Le même brassage que pour les heures d'ambiance : une suite linéaire du
    numéro du jour redonnerait un cycle visible au bout d'une semaine. */
function melange(n: number): number {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return Math.abs(h);
}

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
 * tombe à 14h pile n'est plus une surprise au bout de trois jours. Six crons
 * pointent donc ici, chacun avec son heure en paramètre, et seuls les trois
 * de service aujourd'hui vont au bout.
 *
 * Chaque défi ne vit que trois heures. Passé ce délai la carte disparaît de
 * l'accueil, faite ou non : c'est ce qui sépare un défi surprise d'une
 * tâche de la journée, et ce qui fait qu'on le fait tout de suite.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const jour = getDayNumber();
  const demandee = Number(req.query.h);
  const creneaux = TRIPLETS[melange(jour) % TRIPLETS.length];
  const rang = creneaux.indexOf(demandee);
  if (rang < 0) {
    return res.status(200).json({ skipped: true, heure: demandee, creneaux });
  }

  configureWebPush();
  const db = getDb();

  const abonnes = (await lisAbonnements(db)).filter(veutAmbiance);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0 });

  // Trois défis dans la même journée : chacun doit avoir son texte.
  const defi = defiDuJour(jour * PAR_JOUR + rang);
  // La fenêtre est dans le titre : sans elle, personne ne sait que la
  // carte aura disparu en rentrant du travail.
  let titre = 'Défi surprise · 3 h';
  let texte = defi.texte;
  let patron = false;

  if (jour % 4 === 0 && rang === 0) {
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
                        exercices: defi.exercices || [], duree: defi.duree || 0, fait: false,
                        expire: Date.now() + FENETRE_MS } },
        { merge: true }
      );
    }
    await lot.commit();
  }

  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, { title: titre, body: texte, tag: 'hasard', url: '/' }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: abonnes.length, sent, body: texte, defi: patron ? null : defi.id, heure: demandee, rang });
}
