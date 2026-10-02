export type SeasonalTheme = 'pink' | 'halloween' | null;

/**
 * Habillages temporaires de l'app. Les bornes sont ici et nulle part ailleurs :
 * changer une date suffit à décaler un thème.
 *
 * Octobre Rose s'arrête le 30 pour laisser le 31 à Halloween.
 */
const PINK = { month: 9, from: 1, to: 30 };
const HALLOWEEN = { month: 9, from: 31, to: 31 };

function inRange(date: Date, range: { month: number; from: number; to: number }): boolean {
  const day = date.getDate();
  return date.getMonth() === range.month && day >= range.from && day <= range.to;
}

export function getSeasonalTheme(date = new Date()): SeasonalTheme {
  // Halloween d'abord : les deux plages sont dans le même mois.
  if (inRange(date, HALLOWEEN)) return 'halloween';
  if (inRange(date, PINK)) return 'pink';
  return null;
}
