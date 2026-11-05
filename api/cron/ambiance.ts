import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, isAuthorized, sendTo, getDayNumber } from '../_lib/push.js';
import {
  lisAbonnements, veutAmbiance, lisNoms, statsDe,
  jourDeSemaine, quantieme, debutDuJour, moisCourant, heureDuJour,
  type Membre,
} from '../_lib/groupe.js';
import {
  GROUPE_VIDE, LEADER_INTOUCHABLE, MEMBRE_DISPARU, BILAN_DIMANCHE,
  RESET_MOIS, VANNE_GENERIQUE, messageDuJour,
} from '../_lib/messages.js';

/** Au bout de combien de jours l'absence d'un membre devient une vanne. */
const SEUIL_DISPARU = 7;
/** Au bout de combien de jours la tête du classement devient une vanne. */
const SEUIL_LEADER = 5;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Les heures possibles, en UTC — soit 19h-21h l'hiver, 20h-22h l'été. */
const HEURES = [18, 19, 20];

/**
 * La vanne du soir.
 *
 * Un seul cron pour toutes les vannes, et non un par cas : le plan Hobby
 * n'autorise qu'un déclenchement par jour et par cron, donc six crons
 * auraient voulu dire six notifications certains soirs. Ici l'ordre des `if`
 * fait le tri — on ne dit qu'une chose, la plus intéressante du jour.
 *
 * L'heure, elle, change tous les soirs : trois crons pointent ici, chacun
 * avec la sienne en paramètre, et seul celui de service va au bout. Une vanne
 * attendue à heure fixe se lit d'avance.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const demandee = Number(req.query.h);
  if (demandee !== heureDuJour(getDayNumber(), HEURES, 7)) {
    return res.status(200).json({ skipped: true, heure: demandee });
  }

  configureWebPush();
  const db = getDb();

  const abonnes = (await lisAbonnements(db)).filter(veutAmbiance);
  if (abonnes.length === 0) return res.status(200).json({ targeted: 0, sent: 0 });

  // On relit les séances de tout le monde une fois par jour et on réécrit les
  // compteurs : c'est le seul endroit qui les remet d'aplomb si une fin de
  // séance s'est passée hors ligne.
  const uids = abonnes.map((a) => a.uid);
  const noms = await lisNoms(db);
  const stats = await Promise.all(uids.map((uid) => statsDe(db, uid)));
  await Promise.all(
    uids.map((uid, i) => db.collection('userProgress').doc(uid).set(
      { moisCourant: stats[i].mois }, { merge: true }
    ))
  );

  const membres: Membre[] = uids
    .map((uid, i) => ({
      uid,
      nom: noms.get(uid) || 'Quelqu\'un',
      reps: stats[i].mois.reps,
      seances: stats[i].mois.seances,
      derniere: stats[i].mois.derniere,
    }))
    .sort((a, b) => b.reps - a.reps);

  const texte = await choisis(db, membres, stats.map((s) => s.semaine), stats.map((s) => s.aujourdhui));

  const results = await Promise.all(
    abonnes.map((a) => sendTo(a, {
      title: 'CaliCrew',
      body: texte,
      tag: 'ambiance',
      url: '/group',
    }))
  );

  const sent = results.filter(Boolean).length;
  return res.status(200).json({ targeted: abonnes.length, sent, body: texte });
}

/** La vanne du jour, par ordre de priorité. */
async function choisis(
  db: ReturnType<typeof getDb>,
  membres: Membre[],
  semaines: number[],
  aujourdhui: number[]
): Promise<string> {
  const jour = getDayNumber();

  // Le 1er du mois, le classement repart de zéro : c'est la nouvelle du jour.
  if (quantieme() === 1) return messageDuJour(RESET_MOIS, jour);

  // Dimanche soir, le bilan de la semaine qui s'achève.
  if (jourDeSemaine() === 0) {
    const total = semaines.reduce((s, n) => s + n, 0);
    const meilleur = semaines.indexOf(Math.max(...semaines));
    const best = semaines[meilleur];
    const nom = membres[meilleur]?.nom || 'quelqu\'un';
    const modeles = BILAN_DIMANCHE;
    const modele = modeles[((jour % modeles.length) + modeles.length) % modeles.length];
    return modele(total, nom, best);
  }

  // Personne n'a rien fait de la journée.
  if (aujourdhui.every((n) => n === 0)) return messageDuJour(GROUPE_VIDE, jour);

  // Quelqu'un a disparu : on prend le plus absent, et seulement s'il a déjà
  // fait au moins une séance — sinon on charrierait un nouveau venu.
  const absent = membres
    .filter((m) => m.derniere > 0 && Date.now() - m.derniere > SEUIL_DISPARU * JOUR_MS)
    .sort((a, b) => a.derniere - b.derniere)[0];
  if (absent) {
    const jours = Math.floor((Date.now() - absent.derniere) / JOUR_MS);
    return applique(MEMBRE_DISPARU, jour, absent.nom, jours);
  }

  // La tête du classement ne bouge plus.
  const tete = membres[0];
  if (tete && tete.reps > 0) {
    const jours = await joursEnTete(db, tete.uid);
    if (jours >= SEUIL_LEADER) return applique(LEADER_INTOUCHABLE, jour, tete.nom, jours);
  }

  return messageDuJour(VANNE_GENERIQUE, jour);
}

/** Choisit un modèle du jour et lui passe ses arguments. */
function applique(
  modeles: ((nom: string, jours: number) => string)[],
  jour: number,
  nom: string,
  jours: number
): string {
  return modeles[((jour % modeles.length) + modeles.length) % modeles.length](nom, jours);
}

/**
 * Depuis combien de jours le même joueur est en tête.
 *
 * Il n'existe aucun historique du classement, et le reconstituer voudrait
 * dire rejouer toutes les séances du mois à chaque exécution. On se contente
 * donc de noter chaque soir qui est en tête : la réponse est fausse le
 * premier jour après un déploiement, juste tous les suivants.
 */
async function joursEnTete(db: ReturnType<typeof getDb>, uid: string): Promise<number> {
  const ref = db.collection('notifyState').doc('leader');
  const snap = await ref.get();
  const etat = snap.data() as { uid?: string; depuis?: number; mois?: string } | undefined;
  const mois = moisCourant();

  // Le classement est mensuel : une tête de mois dernier ne compte pas.
  if (!etat || etat.uid !== uid || etat.mois !== mois) {
    await ref.set({ uid, mois, depuis: debutDuJour() });
    return 0;
  }

  await ref.set({ uid, mois, depuis: etat.depuis }, { merge: true });
  return Math.round((debutDuJour() - (etat.depuis || debutDuJour())) / JOUR_MS);
}
