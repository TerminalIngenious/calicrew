import type { CardRarity, ExerciseLog, Session } from '../types';
import { getUnit, setWeight } from './stats';

/**
 * Les niveaux de profil.
 *
 * Deux jauges vivent côte à côte dans l'app et ne se mélangent jamais :
 *
 *  — le **CaliPass** (`passXp`) monte le pass de la saison, se gagne sur les
 *    quêtes et repart de zéro à chaque saison. Il vit dans lib/passes.ts ;
 *  — l'**XP** (ce fichier) monte le niveau de profil, se gagne sur chaque
 *    séance finie selon l'effort réel, et ne redescend jamais.
 *
 * Le pass récompense ce qu'on te demande de faire. Le niveau récompense ce
 * que tu fais, point : on peut être niveau 60 sans avoir touché une quête.
 *
 * Tout ce qui est chiffré ici est calibré sur les 382 séances réellement
 * enregistrées par les 17 joueurs, et non sur une intuition — la première
 * courbe supposait 150 XP par séance, la mesure en donne 106 de médiane.
 * Voir NIVEAUX.md pour les relevés.
 */

// ── Plafonds ──────────────────────────────────────────────────────────────
//
// Aucun ne gêne un joueur réel : la plus grosse séance jamais enregistrée
// vaut 528 XP et la plus grosse semaine 886. Ils sont là pour la triche.

/** Au-delà, une séance ne rapporte plus. */
export const XP_MAX_SEANCE = 800;

/** Toutes séances confondues, sur une même journée. */
export const XP_MAX_JOUR = 1200;

/**
 * Durée prise en compte, en minutes.
 *
 * C'est ce plafond qui désamorce la séance laissée ouverte toute la nuit —
 * le cas qui a déjà faussé les classements une fois.
 */
const MINUTES_MAX = 120;

/** Tonnage pris en compte sur une séance, en kg. */
const TONNAGE_MAX = 15000;

/** Les catégories qui se mesurent en temps et en distance, pas en séries. */
const CATEGORIES_ENDURANCE = ['running', 'velo', 'sportco'];

export function estEndurance(ex: Pick<ExerciseLog, 'exerciseCategory'>): boolean {
  return CATEGORIES_ENDURANCE.includes(ex.exerciseCategory || '');
}

// ── Ce qu'on mesure d'une séance ──────────────────────────────────────────

export interface MesuresSeance {
  /** Durée retenue, plafonnée. */
  minutes: number;
  /** Séries cochées, hors endurance. */
  series: number;
  /** Répétitions cumulées, hors exercices tenus. */
  reps: number;
  /** Secondes tenues sur les isométriques. */
  secondes: number;
  /** Somme des charge × reps, en kg, plafonnée. */
  tonnage: number;
  /** Distance parcourue en course, vélo ou marche. */
  km: number;
  /**
   * Part de `minutes` qui vient d'une sortie, et non du chrono de la séance.
   *
   * Sert à distinguer deux séances que `minutes` seul confond : un match de
   * foot d'une heure, qui n'a ni série ni distance mais qui est du vrai
   * travail, et une séance ouverte une heure sans rien cocher, qui n'en est
   * pas. Sans cette distinction, l'une des deux est forcément mal traitée.
   */
  minutesEndurance: number;
}

/**
 * Relève une séance.
 *
 * Séparé du calcul d'XP pour deux raisons : ces mesures servent aussi aux
 * badges de volume, et une fonction qui mesure se vérifie sans connaître le
 * barème — si le barème change, les relevés ne bougent pas.
 */
export function mesureSeance(session: Pick<Session, 'exercises' | 'duration'>): MesuresSeance {
  let series = 0;
  let reps = 0;
  let secondes = 0;
  let tonnage = 0;
  let km = 0;
  let secondesEndurance = 0;

  for (const ex of session.exercises || []) {
    if (estEndurance(ex)) {
      // Une sortie n'a ni séries ni reps : sa fausse série unique ne doit pas
      // compter, sinon courir dix kilomètres vaut une série de squats.
      secondesEndurance += ex.runDuration || 0;
      km += ex.runDistance || 0;
      continue;
    }
    for (const set of ex.sets || []) {
      if (!set.completed) continue;
      series++;
      if (getUnit(ex) === 'seconds') {
        secondes += set.reps;
      } else {
        reps += set.reps;
        tonnage += setWeight(ex, set) * set.reps;
      }
    }
  }

  /*
   * La durée de la séance, ou celle des sorties qu'elle contient.
   *
   * Un log de running est enregistré complété d'emblée, avec sa durée dans
   * `runDuration` ; selon le chemin pris, `duration` peut valoir 0. On prend
   * le plus grand des deux plutôt que l'un ou l'autre : une séance mixte a
   * les deux, et les additionner compterait la sortie deux fois.
   */
  const secondesTotal = Math.max(session.duration || 0, secondesEndurance);

  return {
    minutes: Math.min(Math.round(secondesTotal / 60), MINUTES_MAX),
    series,
    reps,
    secondes,
    tonnage: Math.min(Math.round(tonnage), TONNAGE_MAX),
    km: Math.round(km * 10) / 10,
    minutesEndurance: Math.min(Math.round(secondesEndurance / 60), MINUTES_MAX),
  };
}

/**
 * Y a-t-il eu du travail ?
 *
 * Une série cochée, un kilomètre, ou du temps de sortie. Le chrono de la
 * séance ne compte pas : une séance ouverte trois quarts d'heure sans qu'une
 * seule case soit cochée n'est pas une séance, c'est un onglet oublié.
 */
function aTravaille(m: MesuresSeance): boolean {
  return m.series > 0 || m.km > 0 || m.minutesEndurance > 0;
}

/**
 * L'XP d'une séance.
 *
 * Six termes, parce qu'il y a six façons d'avoir travaillé et qu'aucune ne
 * suffit seule :
 *
 *  — le temps, parce qu'une séance longue est une séance dure ;
 *  — les séries, l'unité de travail réelle, et le terme le plus difficile à
 *    gonfler sans faire la séance — d'où le coefficient le plus fort ;
 *  — les reps, divisées par 4, sinon deux cents pompes écrasent le reste ;
 *  — les secondes tenues, divisées par 12 : une minute de gainage vaut à peu
 *    près une série. C'est le terme qui n'existait nulle part et qui répare
 *    l'injustice faite aux isométriques ;
 *  — le tonnage, divisé par 60 : c'est la difficulté, au sens de la charge ;
 *  — les kilomètres, pour que la course et le vélo ne soient pas à zéro.
 */
export function xpSeance(session: Pick<Session, 'exercises' | 'duration'>): number {
  const m = mesureSeance(session);

  /*
   * Rien de fait, rien de gagné — et c'est le seul plancher.
   *
   * Un seuil plus haut (« au moins trois séries ou cinq minutes ») mettait à
   * zéro une séance réelle sur cinq : les défis du jour sont enregistrés
   * comme une série unique de quinze à trente pompes, en une minute. Trente
   * pompes sont trente pompes, elles valent leur douzaine de points. Le farm
   * de micro-séances est tenu par le plafond journalier, pas par un plancher
   * qui punit ceux qui jouent le jeu.
   */
  if (!aTravaille(m)) return 0;

  const brut =
    2 * m.minutes +
    3 * m.series +
    m.reps / 4 +
    m.secondes / 12 +
    m.tonnage / 60 +
    4 * m.km;

  return Math.min(Math.round(brut), XP_MAX_SEANCE);
}

/**
 * L'XP réellement accordée, une fois le plafond du jour appliqué.
 *
 * `dejaAujourdhui` est ce qui a déjà été accordé dans la journée. Le plafond
 * est journalier et non par séance parce qu'une journée de dix micro-séances
 * est le seul moyen restant de farmer.
 */
export function xpAccordable(xpBrute: number, dejaAujourdhui: number): number {
  return Math.max(0, Math.min(xpBrute, XP_MAX_JOUR - dejaAujourdhui));
}

// ── La courbe ─────────────────────────────────────────────────────────────

/**
 * Coût du niveau `n`, c'est-à-dire l'XP qu'il faut pour passer de n-1 à n.
 *
 * Pas de plafond : la formule vaut pour le niveau 7 comme pour le 400. Elle
 * est calée sur le rythme réel mesuré — 228 XP par semaine pour le joueur
 * médian du groupe — de façon que le niveau 5 tombe en deux semaines, le 25
 * en cinq mois et le 100 en quatre ans et demi.
 */
export function coutNiveau(n: number): number {
  // On ne paie pas pour être niveau 1 : c'est là qu'on commence. Sans ce
  // cas, le cumul affiché et le niveau calculé divergeaient d'un palier —
  // l'app aurait annoncé 104 XP pour un niveau 2 qui en demande 64.
  if (n <= 1) return 0;
  return Math.round(40 * Math.pow(n, 0.67));
}

/**
 * XP cumulée nécessaire pour atteindre le niveau `n`.
 *
 * Somme directe plutôt que formule fermée : la courbe est arrondie à chaque
 * palier, et une intégrale donnerait un total qui ne correspond pas à la
 * somme des coûts affichés. Un joueur qui additionne ce qu'il voit doit
 * retomber sur le même nombre que l'app.
 */
export function cumulPourNiveau(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) total += coutNiveau(i);
  return total;
}

export interface Niveau {
  /** Niveau atteint. Commence à 1 : personne n'est « niveau 0 ». */
  niveau: number;
  /** XP engrangée dans le niveau en cours. */
  dansNiveau: number;
  /** XP que demande le niveau en cours, en entier. */
  pourSuivant: number;
}

/**
 * Le niveau que donne une XP cumulée.
 *
 * On monte palier par palier plutôt que par une racine : la courbe est
 * arrondie, et l'inverse d'une fonction arrondie n'est pas son inverse
 * analytique. À quelques centaines de paliers, la boucle est gratuite.
 */
export function niveauDepuisXp(xp: number): Niveau {
  let reste = Math.max(0, Math.floor(xp));
  let niveau = 1;
  // Garde-fou : une XP aberrante ne doit pas faire tourner la boucle à vide.
  while (niveau < 10000) {
    const cout = coutNiveau(niveau + 1);
    if (reste < cout) return { niveau, dansNiveau: reste, pourSuivant: cout };
    reste -= cout;
    niveau++;
  }
  return { niveau, dansNiveau: 0, pourSuivant: coutNiveau(niveau + 1) };
}

// ── Les récompenses ───────────────────────────────────────────────────────

/**
 * Raretés garanties aux paliers ronds. Les autres niveaux à coffre donnent
 * une commune.
 */
const COFFRES_GARANTIS: Record<number, CardRarity> = {
  10: 'rare',
  15: 'rare',
  20: 'rare',
  25: 'epique',
  30: 'rare',
  40: 'rare',
  50: 'legendaire',
  60: 'epique',
  70: 'epique',
  75: 'legendaire',
  100: 'historique',
};

/**
 * Est-ce que ce niveau donne un coffre ?
 *
 * Le rythme se desserre à mesure qu'on monte, parce que les niveaux coûtent
 * de plus en plus cher : un coffre à chaque niveau au-delà de 50 reviendrait
 * à distribuer des cartes au compte-gouttes pendant des mois, ou à en noyer
 * le marché si la courbe était plus douce.
 */
function aUnCoffre(n: number): boolean {
  if (n <= 10) return true;
  if (n <= 50) return n % 2 === 0;
  return n % 5 === 0;
}

/** Le coffre d'un niveau, ou null si ce niveau n'en donne pas. */
export function coffreDuNiveau(n: number): CardRarity | null {
  if (n < 2) return null;
  if (COFFRES_GARANTIS[n]) return COFFRES_GARANTIS[n];
  if (n > 100) {
    // Au-delà de 100, les paliers ronds reprennent le relais : ce sont les
    // seuls repères qui restent quand les niveaux s'espacent.
    if (n % 100 === 0) return 'historique';
    if (n % 25 === 0) return 'legendaire';
  }
  return aUnCoffre(n) ? 'commune' : null;
}

/** Les niveaux qui portent un badge. */
export const PALIERS_BADGE = [10, 25, 50, 75, 100, 150, 200];

/**
 * Les coffres dus pour être passé de `avant` à `apres`.
 *
 * Rendus en liste plutôt qu'accordés ici : cette fonction ne touche à rien,
 * elle se contente de dire ce qui est dû. C'est l'appelant qui écrit, et il
 * écrit avant d'animer — un coffre montré avant d'être enregistré est un
 * coffre rejouable, on l'a déjà payé une fois sur le pass.
 */
export function coffresEntre(avant: number, apres: number): CardRarity[] {
  const coffres: CardRarity[] = [];
  for (let n = avant + 1; n <= apres; n++) {
    const coffre = coffreDuNiveau(n);
    if (coffre) coffres.push(coffre);
  }
  return coffres;
}

// ── L'attribution ─────────────────────────────────────────────────────────

/**
 * Ce que rapporte une séance, une fois tout appliqué.
 *
 * Rendu en bloc plutôt qu'écrit ici : cette fonction est pure, elle se
 * vérifie sans Firestore, et c'est l'appelant qui décide quand écrire. Il
 * écrit **avant** d'animer quoi que ce soit — un gain montré avant d'être
 * enregistré est un gain rejouable, on l'a déjà payé une fois sur le coffre
 * du pass.
 */
export interface GainSeance {
  /** Nouvelle XP cumulée. */
  xp: number;
  /** Compteur du jour, à réécrire tel quel. */
  xpJour: { date: string; xp: number };
  /** Niveaux dont la récompense est désormais due, à réécrire tel quel. */
  niveauxPris: number[];
  /** Les coffres à ajouter, déjà au format de `chestsToOpen`. */
  coffres: { rarity: CardRarity; pool: string }[];
  /** XP réellement accordée, une fois le plafond du jour passé. */
  accorde: number;
  niveauAvant: number;
  niveauApres: number;
  /** Vrai si le plafond du jour a rogné le gain. À dire, pas à taire. */
  plafonne: boolean;
}

/**
 * Accorde l'XP d'une séance et les coffres des niveaux franchis au passage.
 *
 * Le seul chemin par lequel l'XP de profil doit arriver, d'où qu'elle vienne.
 * C'est la leçon de `accordeXp` côté pass : tant que chaque source écrivait
 * l'XP à sa façon, seuls certains chemins pensaient aux coffres, et qui
 * montait de niveau par un autre chemin franchissait le palier sans rien
 * recevoir — une perte que personne ne peut remarquer, puisque rien n'annonce
 * un coffre qui n'arrive pas.
 */
export function accordeXpProfil(
  progress: {
    xp?: number;
    xpJour?: { date: string; xp: number };
    niveauxPris?: number[];
    chestsToOpen?: { rarity: CardRarity; pool: string }[];
  },
  xpBrute: number,
  aujourdhui: string
): GainSeance {
  const dejaAujourdhui = progress.xpJour?.date === aujourdhui ? progress.xpJour.xp : 0;
  const accorde = xpAccordable(xpBrute, dejaAujourdhui);

  const xpAvant = progress.xp || 0;
  const xp = xpAvant + accorde;
  const niveauAvant = niveauDepuisXp(xpAvant).niveau;
  const niveauApres = niveauDepuisXp(xp).niveau;

  // Les paliers déjà payés ne sont jamais repayés, même si le niveau est
  // recalculé plus tard ou si deux écritures se croisent.
  const pris = new Set(progress.niveauxPris || []);
  const coffres: { rarity: CardRarity; pool: string }[] = [];
  for (let n = niveauAvant + 1; n <= niveauApres; n++) {
    if (pris.has(n)) continue;
    pris.add(n);
    const coffre = coffreDuNiveau(n);
    if (coffre) coffres.push({ rarity: coffre, pool: 'current' });
  }

  return {
    xp,
    xpJour: { date: aujourdhui, xp: dejaAujourdhui + accorde },
    niveauxPris: [...pris].sort((a, b) => a - b),
    coffres,
    accorde,
    niveauAvant,
    niveauApres,
    plafonne: accorde < xpBrute,
  };
}
