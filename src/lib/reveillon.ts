import type { Session } from '../types';
import { totalReps, exerciseTotal } from './stats';

/**
 * Le réveillon — 31 décembre 2026, 23h50, jusqu'au 1er janvier 00h30.
 *
 * Ses bornes ne sont pas dans `seasonalTheme.ts` avec les autres, et c'est
 * volontaire : le thème du 31 s'éteint à minuit, à la seconde précise où le
 * compte à rebours arrive à zéro. Accrocher le spectacle au thème revenait à
 * le faire disparaître au moment de commencer.
 */
export const DEBUT = new Date(2026, 11, 31, 23, 50, 0).getTime();
export const MINUIT = new Date(2027, 0, 1, 0, 0, 0).getTime();
export const FIN = new Date(2027, 0, 1, 0, 30, 0).getTime();

/** L'année qu'on enterre, et celle qui arrive. */
export const ANNEE_FINIE = 2026;
export const ANNEE_NEUVE = 2027;

export function enCours(maintenant = Date.now()): boolean {
  return maintenant >= DEBUT && maintenant <= FIN;
}

export function avantMinuit(maintenant = Date.now()): boolean {
  return maintenant < MINUIT;
}

/** Les secondes qui restent avant minuit, jamais négatives. */
export function secondesRestantes(maintenant = Date.now()): number {
  return Math.max(0, Math.ceil((MINUIT - maintenant) / 1000));
}

export interface BilanAnnee {
  seances: number;
  reps: number;
  heures: number;
  /** Le mois le plus chargé, en toutes lettres, et son nombre de séances. */
  meilleurMois: string;
  seancesMeilleurMois: number;
  /** La plus longue série de jours consécutifs avec au moins une séance. */
  serie: number;
  /** L'exercice le plus répété de l'année, et son total. */
  exercice: string;
  repsExercice: number;
  /** Le jour de la semaine où l'on s'entraîne le plus. */
  jourFavori: string;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Le bilan de l'année, calculé sur l'appareil.
 *
 * Toutes les séances de l'utilisateur sont déjà chargées pour l'accueil : les
 * reprendre ici ne coûte aucune lecture, là où un comptage côté serveur aurait
 * demandé une fonction de plus pour une page qui s'affiche une fois par an.
 *
 * Seules les séances terminées comptent. Une séance abandonnée au premier
 * exercice ne fait pas un souvenir.
 */
export function bilanAnnee(sessions: Session[], annee = ANNEE_FINIE): BilanAnnee {
  const prefixe = `${annee}-`;
  const faites = sessions.filter((s) => s.completed && s.date?.startsWith(prefixe));

  const parMois = new Array(12).fill(0);
  const parJour = new Array(7).fill(0);
  const parExercice = new Map<string, number>();

  for (const s of faites) {
    const [, m, j] = s.date.split('-').map(Number);
    parMois[m - 1]++;
    // Midi et non minuit : à minuit, une heure d'été mal arrondie fait
    // basculer la date sur la veille.
    parJour[new Date(annee, m - 1, j, 12).getDay()]++;
    for (const ex of s.exercises || []) {
      parExercice.set(ex.exerciseName, (parExercice.get(ex.exerciseName) || 0) + exerciseTotal(ex));
    }
  }

  const iMois = parMois.indexOf(Math.max(...parMois));
  const iJour = parJour.indexOf(Math.max(...parJour));
  const [exercice, repsExercice] = [...parExercice.entries()]
    .sort((a, b) => b[1] - a[1])[0] || ['—', 0];

  return {
    seances: faites.length,
    reps: totalReps(faites),
    /*
     * Le temps passé vient de `duration`, le chronomètre de la séance, et
     * non de la somme des exercices minutés : additionner les secondes de
     * gainage donnait « 0 h » à qui ne fait que des répétitions, c'est-à-dire
     * à presque tout le monde.
     */
    heures: Math.round(faites.reduce((t, s) => t + (s.duration || 0), 0) / 3600),
    meilleurMois: MOIS[iMois],
    seancesMeilleurMois: parMois[iMois],
    serie: plusLongueSerie(faites.map((s) => s.date)),
    exercice,
    repsExercice,
    jourFavori: JOURS[iJour],
  };
}

/**
 * La plus longue suite de jours consécutifs.
 *
 * Les dates sont comparées en jours entiers depuis l'époque plutôt qu'avec
 * des objets Date : deux séances à cheval sur un changement d'heure sont
 * séparées de 23 ou 25 heures, et un calcul en millisecondes aurait cassé la
 * série une fois par an.
 */
function plusLongueSerie(dates: string[]): number {
  const jours = [...new Set(dates)]
    .map((d) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000))
    .sort((a, b) => a - b);
  if (!jours.length) return 0;

  let meilleure = 1;
  let courante = 1;
  for (let i = 1; i < jours.length; i++) {
    courante = jours[i] === jours[i - 1] + 1 ? courante + 1 : 1;
    if (courante > meilleure) meilleure = courante;
  }
  return meilleure;
}

/**
 * Une phrase sur le bilan, choisie d'après ce qu'il contient.
 *
 * Ordre du plus remarquable au plus ordinaire : la première qui s'applique
 * est la bonne. Une seule phrase, et pas une liste — c'est le dernier écran
 * de l'année, il doit se lire d'un coup d'œil.
 */
export function motDeLaFin(b: BilanAnnee): string {
  if (b.seances === 0) return 'Une année de repos complet. 2027 ne te laissera pas tranquille.';
  if (b.seances >= 200) return 'Deux cents séances. À ce stade ce n’est plus un loisir, c’est un emploi.';
  if (b.seances >= 120) return 'Une séance tous les trois jours pendant un an. Chapeau bas.';
  if (b.serie >= 30) return `${b.serie} jours d’affilée. Ta meilleure série tient un mois entier.`;
  if (b.reps >= 20000) return `${b.reps.toLocaleString('fr-FR')} répétitions. Personne ne te croira.`;
  if (b.seances >= 50) return 'Une année solide. On remet ça ?';
  if (b.seances >= 12) return 'Un début. 2027 est là pour faire mieux.';
  return 'C’est peu, mais c’est plus que zéro. Et ça compte double.';
}
