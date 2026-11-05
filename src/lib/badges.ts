import type { RankBadge, RankCategory } from '../types';

/** Habillage d'une catégorie de classement : couleur + libellé. */
interface CategoryStyle {
  label: string;
  /** Dégradé du cœur du badge. */
  from: string;
  to: string;
}

export const BADGE_CATEGORIES: Record<RankCategory, CategoryStyle> = {
  reps: { label: 'Reps', from: '#ff8a3d', to: '#ff4d2d' },
  variety: { label: 'Variété', from: '#c084fc', to: '#7c3aed' },
  time: { label: 'Temps', from: '#5eead4', to: '#0891b2' },
  pas: { label: 'Pas', from: '#a3e635', to: '#4d7c0f' },
};

/** Habillage d'une place du podium : le métal de la monture. */
interface RankStyle {
  label: string;
  name: string;
  /** Dégradé de la monture métallique. */
  from: string;
  mid: string;
  to: string;
  glow: string;
}

export const BADGE_RANKS: RankStyle[] = [
  { label: 'TOP 1', name: 'Or', from: '#fff4c2', mid: '#ffd700', to: '#b8860b', glow: 'rgba(255, 215, 0, 0.5)' },
  { label: 'TOP 2', name: 'Argent', from: '#ffffff', mid: '#d4d8de', to: '#8b9199', glow: 'rgba(203, 213, 225, 0.45)' },
  { label: 'TOP 3', name: 'Bronze', from: '#f0c9a0', mid: '#cd7f32', to: '#7c4a1e', glow: 'rgba(205, 127, 50, 0.45)' },
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Les badges d'événement.
 *
 * Ils n'ont ni podium ni mois : on ne les gagne pas en finissant devant
 * quelqu'un, mais en allant au bout de quelque chose. Leur habillage est
 * celui de leur événement, pas celui du métal.
 */
export interface EventBadgeStyle {
  titre: string;
  soustitre: string;
  /** Monture : trois tons, comme un métal. */
  from: string;
  mid: string;
  to: string;
  /** Cœur, volontairement sombre pour que le dessin ressorte. */
  coreFrom: string;
  coreTo: string;
  glow: string;
}

export const EVENT_BADGES: Record<string, EventBadgeStyle> = {
  faceid: {
    titre: 'FaceID',
    soustitre: 'Fichier complet',
    from: '#9bf7cb',
    mid: '#2fe08a',
    to: '#0a6b40',
    coreFrom: '#073a26',
    coreTo: '#04130c',
    glow: 'rgba(47, 224, 138, 0.5)',
  },
};

export function estEvenement(badge: RankBadge): boolean {
  return badge.kind === 'event';
}

export function eventStyle(badge: RankBadge): EventBadgeStyle | undefined {
  return badge.eventId ? EVENT_BADGES[badge.eventId] : undefined;
}

/** 'TOP 2 Reps', ou le nom de l'événement. */
export function badgeTitle(badge: RankBadge): string {
  if (estEvenement(badge)) return eventStyle(badge)?.titre ?? 'Événement';
  return `${BADGE_RANKS[badge.rank]?.label ?? 'TOP'} ${BADGE_CATEGORIES[badge.category]?.label ?? ''}`.trim();
}

/** 'Septembre 2026' à partir d'une clé 'YYYY-MM'. */
export function badgeMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const idx = Number(month) - 1;
  return `${MONTHS[idx] ?? month} ${year}`;
}

export function makeBadgeId(monthKey: string, category: RankCategory, rank: number): string {
  return `${monthKey}-${category}-${rank}`;
}

/**
 * Les événements d'abord, puis les plus prestigieux, puis les plus récents.
 *
 * Un badge d'événement passe devant l'or : il ne se regagnera jamais, là où
 * un TOP 1 revient tous les mois.
 */
export function sortBadges(badges: RankBadge[]): RankBadge[] {
  return [...badges].sort((a, b) => {
    const ea = estEvenement(a) ? 0 : 1;
    const eb = estEvenement(b) ? 0 : 1;
    return ea - eb || a.rank - b.rank || b.earnedAt - a.earnedAt;
  });
}
