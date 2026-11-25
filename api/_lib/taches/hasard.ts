import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo, getDayNumber, getDayKey } from '../push.js';
import { lisAbonnements, veutAmbiance, lisNoms } from '../groupe.js';
import { defiDuJour, PATRON_DU_JOUR } from '../messages.js';

/**
 * Les trois rendez-vous du jour, à l'heure de Paris.
 *
 * Ils étaient tirés au sort parmi quatre triplets, pour que le défi reste
 * une surprise. L'effet obtenu n'était pas celui-là : personne ne savait
 * quand regarder, et une notification manquée passait pour une notification
 * jamais envoyée. Des heures fixes se retiennent, et c'est ce qui permet de
 * remarquer qu'il en manque une.
 */
const HEURES_PARIS = [8, 14, 18];

/** Autant que de créneaux : sert à décaler le texte de chaque défi. */
const PAR_JOUR = 3;

/**
 * Le décalage de Paris sur UTC aujourd'hui : 1 l'hiver, 2 l'été.
 *
 * Vercel déclenche ses crons en UTC et ne connaît pas les fuseaux. Pour
 * tomber à 8 h, 14 h et 18 h de Paris toute l'année, six crons sont donc
 * déclarés — 6, 7, 12, 13, 16 et 17 UTC — et seuls les trois qui
 * correspondent à l'heure de Paris du jour vont au bout.
 *
 * Le décalage est mesuré et non écrit en dur : c'est précisément ce qui
 * manque aux deux crons de la créatine et du défi du jour, qui partent une
 * heure trop tôt tout l'hiver.
 */
const TZ_PARIS = 'Europe/Paris';

function decalageParis(): number {
  const maintenant = new Date();
  const paris = new Date(maintenant.toLocaleString('en-US', { timeZone: TZ_PARIS }));
  const utc = new Date(maintenant.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((paris.getTime() - utc.getTime()) / 3600000);
}

/** Trois heures pour le faire, ensuite il disparaît. */
const FENETRE_MS = 3 * 60 * 60 * 1000;

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
  /*
   * On compare l'heure *programmée* du cron, et non l'heure qu'il est.
   *
   * Vercel déclenche ses crons dans l'heure, pas à la minute : celui de
   * 17 h UTC est parti à 17 h 48 hier. En lisant l'horloge, un cron en
   * retard se serait cru hors créneau et le défi ne serait jamais parti.
   * Le paramètre `h`, lui, est fixé par la déclaration du cron.
   */
  const creneaux = HEURES_PARIS.map((h) => h - decalageParis());
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

  /*
   * Une étiquette par défi, et non une pour tous.
   *
   * Deux notifications qui portent la même étiquette ne s'empilent pas : la
   * seconde remplace la première, et ce remplacement est silencieux — ni
   * son, ni vibration, ni bandeau. Avec `tag: 'hasard'` fixe, celui qui ne
   * balayait pas son volet de notifications ne voyait qu'un seul des trois
   * défis du jour, et n'était alerté qu'une fois. Le lendemain, la notif
   * de la veille restée en place avalait encore la première.
   *
   * Le jour et le rang suffisent à les distinguer. Le service worker
   * demande en plus `renotify`, mais tous les téléphones ne l'honorent pas :
   * l'étiquette, elle, marche partout.
   */
  const etiquette = `hasard-${getDayKey()}-${rang}`;
  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, { title: titre, body: texte, tag: etiquette, url: '/' }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: abonnes.length, sent, body: texte, defi: patron ? null : defi.id, heure: demandee, rang });
}
