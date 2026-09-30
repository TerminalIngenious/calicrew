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

/** 'TOP 2 Reps' */
export function badgeTitle(badge: RankBadge): string {
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

/** Les plus prestigieux d'abord, puis les plus récents. */
export function sortBadges(badges: RankBadge[]): RankBadge[] {
  return [...badges].sort((a, b) => a.rank - b.rank || b.earnedAt - a.earnedAt);
}
