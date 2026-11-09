import { evenementEnCours } from './faceid';

export type SeasonalTheme = 'pink' | 'halloween' | 'faceid' | null;

/**
 * Habillages temporaires de l'app. Les bornes sont ici et nulle part ailleurs :
 * changer une date suffit à décaler un thème.
 *
 * Octobre Rose s'arrête le 30 pour laisser le 31 à Halloween.
 *
 * L'event FaceID repeint l'app en vert, mais seulement la couleur d'accent :
 * la première version ajoutait un quadrillage lumineux, des halos et des
 * dégradés, et c'est ça qui donnait l'air d'une démonstration — pas le vert.
 *
 * Ses bornes ne sont pas ici mais dans l'event, qui s'en sert aussi pour
 * ouvrir sa page et ses missions. Deux copies de la même date auraient fini
 * par diverger.
 */
const PINK = { month: 9, from: 1, to: 30 };
const HALLOWEEN = { month: 9, from: 31, to: 31 };

function inRange(date: Date, range: { month: number; from: number; to: number }): boolean {
  const day = date.getDate();
  return date.getMonth() === range.month && day >= range.from && day <= range.to;
}

export function getSeasonalTheme(date = new Date()): SeasonalTheme {
  if (evenementEnCours(date.getTime())) return 'faceid';
  // Halloween d'abord : les deux plages sont dans le même mois.
  if (inRange(date, HALLOWEEN)) return 'halloween';
  if (inRange(date, PINK)) return 'pink';
  return null;
}
