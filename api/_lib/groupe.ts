import type { Firestore } from 'firebase-admin/firestore';
import type { Subscription } from './push.js';

/**
 * Un abonnement avec ses préférences.
 *
 * Les deux nouvelles familles sont volontairement « opt-out » : un champ
 * absent vaut oui. Les abonnements créés avant leur existence n'ont pas ces
 * champs, et les lire comme des refus aurait privé de tout le groupe ceux qui
 * avaient activé les rappels les premiers.
 */
export interface Abonnement extends Subscription {
  creatine?: boolean;
  dailyChallenge?: boolean;
  groupe?: boolean;
  ambiance?: boolean;
}

export async function lisAbonnements(db: Firestore): Promise<Abonnement[]> {
  const snap = await db.collection('pushSubscriptions').get();
  return snap.docs.map((d) => d.data() as Abonnement);
}

export function veutAmbiance(a: Abonnement): boolean {
  return a.ambiance !== false;
}

export function veutGroupe(a: Abonnement): boolean {
  return a.groupe !== false;
}

/** Compteurs du mois tenus pour les notifications. Voir `rafraichisMois`. */
export interface MoisCourant {
  /** YYYY-MM : des compteurs d'un autre mois doivent être lus comme zéro. */
  mois: string;
  reps: number;
  seances: number;
  /** Fin de la dernière séance, en epoch ms. */
  derniere: number;
  /** Jour du dernier « untel a fini une séance » envoyé au groupe. */
  dernierPing?: string;
}

export const MOIS_VIDE: Omit<MoisCourant, 'mois'> = { reps: 0, seances: 0, derniere: 0 };

/** Clé du mois courant à Paris. */
export function moisCourant(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit',
  }).format(new Date());
}

/** Les compteurs d'un joueur, ramenés à zéro s'ils datent d'un autre mois. */
export function lisMois(data: Record<string, unknown> | undefined): MoisCourant {
  const brut = data?.moisCourant as MoisCourant | undefined;
  const mois = moisCourant();
  if (!brut || brut.mois !== mois) return { mois, ...MOIS_VIDE };
  return { ...brut, mois };
}

/**
 * Les répétitions d'une séance.
 *
 * Reprend exactement la règle de `src/lib/stats.ts` : une série en secondes
 * range sa valeur dans le même champ `reps`, et la compter ici ferait d'un
 * gainage de 60 s le meilleur exercice du groupe.
 */
export function repsDeSeance(session: Record<string, unknown>): number {
  const exercices = (session.exercises as ExerciceLog[] | undefined) || [];
  return exercices.reduce((total, ex) => {
    if (ex.unit === 'seconds') return total;
    return total + (ex.sets || []).reduce((s, set) => s + (set.completed ? set.reps || 0 : 0), 0);
  }, 0);
}

interface ExerciceLog {
  unit?: string;
  sets?: { completed?: boolean; reps?: number }[];
}

/**
 * Recalcule les compteurs d'un joueur depuis ses séances et les réécrit.
 *
 * Les compteurs sont une commodité : les classements affichés dans l'app sont
 * toujours recalculés à partir des séances, jamais d'ici. Mais recalculer le
 * classement complet du groupe à chaque fin de séance demanderait de relire
 * les séances des dix-neuf membres — là où dix-neuf petits documents
 * suffisent. On ne relit en entier que celui qui vient de s'entraîner, ce qui
 * répare au passage les compteurs d'une séance enregistrée hors ligne.
 *
 * La requête n'a volontairement pas de filtre sur la date : une égalité plus
 * un intervalle demanderaient un index composite, et le tri en mémoire coûte
 * moins cher à maintenir qu'un index de plus.
 */
export async function rafraichisMois(db: Firestore, uid: string): Promise<MoisCourant> {
  return (await statsDe(db, uid)).mois;
}

export interface Stats {
  mois: MoisCourant;
  /** Séances depuis lundi, et depuis minuit. */
  semaine: number;
  aujourdhui: number;
}

/** Tout ce qu'on sait d'un joueur en une lecture de ses séances. */
export async function statsDe(db: Firestore, uid: string): Promise<Stats> {
  const mois = moisCourant();
  const debutMois = debutDuMois();
  const debutSemaine = debutDeSemaine();
  const debutJour = debutDuJour();
  const snap = await db.collection('sessions').where('userId', '==', uid).get();

  let reps = 0;
  let seances = 0;
  let derniere = 0;
  let semaine = 0;
  let aujourdhui = 0;
  for (const d of snap.docs) {
    const s = d.data();
    if (!s.completed) continue;
    const quand = (s.createdAt as number) || 0;
    if (quand > derniere) derniere = quand;
    if (quand >= debutSemaine) semaine += 1;
    if (quand >= debutJour) aujourdhui += 1;
    if (quand < debutMois) continue;
    seances += 1;
    reps += repsDeSeance(s);
  }

  return { mois: { mois, reps, seances, derniere }, semaine, aujourdhui };
}

/**
 * Lundi de cette semaine à minuit, heure de Paris.
 *
 * Le recul se fait sur la date civile et non en retirant des millisecondes :
 * la semaine du changement d'heure dure 167 ou 169 heures, et un calcul en
 * millisecondes placerait la frontière à 23h ou 1h du matin.
 */
export function debutDeSemaine(): number {
  const jour = jourDeSemaine();
  // Dimanche appartient à la semaine qui s'achève, pas à celle qui commence.
  const recul = jour === 0 ? 6 : jour - 1;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const lundi = new Date(Date.UTC(get('year'), get('month') - 1, get('day') - recul));
  return zonedToEpoch(lundi.getUTCFullYear(), lundi.getUTCMonth() + 1, lundi.getUTCDate(), 0);
}

/** Premier jour du mois à minuit, heure de Paris. */
export function debutDuMois(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return zonedToEpoch(get('year'), get('month'), 1, 0);
}

/** Minuit d'aujourd'hui, heure de Paris. */
export function debutDuJour(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return zonedToEpoch(get('year'), get('month'), get('day'), 0);
}

/** Jour de la semaine à Paris, 0 = dimanche. */
export function jourDeSemaine(): number {
  const nom = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', weekday: 'short',
  }).format(new Date());
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nom);
}

/** Quantième du mois à Paris. */
export function quantieme(): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', day: '2-digit' })
      .format(new Date())
  );
}

function zonedToEpoch(y: number, m: number, d: number, hour: number): number {
  const guess = Date.UTC(y, m - 1, d, hour, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')
  );
  return guess - (asUtc - guess);
}

export interface Membre {
  uid: string;
  nom: string;
  reps: number;
  seances: number;
  derniere: number;
}

/** Les noms d'affichage, par uid. */
export async function lisNoms(db: Firestore): Promise<Map<string, string>> {
  const snap = await db.collection('users').get();
  const noms = new Map<string, string>();
  for (const d of snap.docs) {
    const data = d.data();
    if (data.uid) noms.set(data.uid as string, (data.displayName as string) || 'Quelqu\'un');
  }
  return noms;
}

/** Les membres d'un groupe avec leurs compteurs, du plus actif au moins actif. */
export async function classement(
  db: Firestore,
  memberIds: string[],
  noms: Map<string, string>
): Promise<Membre[]> {
  if (memberIds.length === 0) return [];
  const docs = await db.getAll(
    ...memberIds.map((uid) => db.collection('userProgress').doc(uid))
  );
  return docs
    .map((d) => {
      const mois = lisMois(d.data());
      return {
        uid: d.id,
        nom: noms.get(d.id) || 'Quelqu\'un',
        reps: mois.reps,
        seances: mois.seances,
        derniere: mois.derniere,
      };
    })
    .sort((a, b) => b.reps - a.reps);
}

/**
 * L'heure du jour pour une famille de notifications.
 *
 * Le plan Hobby ne déclenche un cron qu'une fois par jour : impossible de
 * tirer une heure au hasard depuis un cron unique. On inscrit donc un cron
 * par heure possible, chacun portant la sienne en paramètre, et c'est la
 * fonction ci-dessous qui dit laquelle est de service aujourd'hui. Les autres
 * se réveillent, lisent, et repartent sans rien envoyer.
 *
 * Le tirage dépend du numéro du jour et de rien d'autre : tout le groupe doit
 * recevoir la notification à la même heure, sinon la vanne du soir n'est plus
 * une vanne partagée. Le brassage évite la régularité d'un simple modulo, qui
 * aurait donné un cycle visible en quatre jours.
 *
 * Les heures sont en UTC et ne suivent pas le changement d'heure : ces
 * notifications sont faites pour tomber n'importe quand, une heure de
 * décalage entre l'été et l'hiver ne se remarque pas. Seules la créatine et
 * le défi du jour ont une heure à tenir.
 */
export function heureDuJour(jour: number, heures: number[], sel: number): number {
  // Un brassage par bits et non une multiplication : sur quatre heures, une
  // suite linéaire du numéro du jour redonnait un cycle de quatre jours,
  // parfaitement prévisible au bout d'une semaine.
  let h = (jour + sel) | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return heures[Math.abs(h) % heures.length];
}
