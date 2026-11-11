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
  /** Le dessin au cœur du badge. */
  glyphe: 'faceid' | 'creatine' | 'pas';
  /** Sa couleur. Écrite en dur, elle restait verte sur tous les badges. */
  encre: string;
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
    glyphe: 'faceid',
    encre: '#5cf5ab',
    from: '#e4ff9e',
    mid: '#b6ff00',
    to: '#5a8200',
    coreFrom: '#2b3d05',
    coreTo: '#0c1104',
    glow: 'rgba(182, 255, 0, 0.5)',
  },

  /*
   * Les paliers de créatine.
   *
   * Un seul bleu qui s'approfondit de palier en palier, et non quatre
   * couleurs sans rapport : posés côte à côte dans le profil, ils doivent se
   * lire comme une progression et pas comme quatre récompenses
   * indépendantes. Le dernier vire au blanc froid — c'est le seul qui sort
   * de la famille, parce qu'une année entière mérite de ne ressembler à
   * aucun des autres.
   */
  'creatine-7': {
    titre: 'Créatine',
    soustitre: '7 jours d\u2019affilée',
    glyphe: 'creatine',
    encre: '#9fd4ff',
    from: '#cfe9ff', mid: '#7fc1f2', to: '#2f6d9e',
    coreFrom: '#0e2434', coreTo: '#06131d',
    glow: 'rgba(127, 193, 242, 0.45)',
  },
  'creatine-30': {
    titre: 'Créatine',
    soustitre: 'Un mois d\u2019affilée',
    glyphe: 'creatine',
    encre: '#8ec8ff',
    from: '#a8d8ff', mid: '#3f9ae8', to: '#15507f',
    coreFrom: '#0a1f33', coreTo: '#04101b',
    glow: 'rgba(63, 154, 232, 0.5)',
  },
  'creatine-100': {
    titre: 'Créatine',
    soustitre: 'Cent jours d\u2019affilée',
    glyphe: 'creatine',
    encre: '#b6bdff',
    from: '#c3cbff', mid: '#5c6cf0', to: '#262d94',
    coreFrom: '#121642', coreTo: '#070a21',
    glow: 'rgba(92, 108, 240, 0.55)',
  },
  'creatine-365': {
    titre: 'Créatine',
    soustitre: 'Une année d\u2019affilée',
    glyphe: 'creatine',
    encre: '#eaf4ff',
    from: '#ffffff', mid: '#dbe9f7', to: '#8aa6bd',
    coreFrom: '#1b2530', coreTo: '#0a0f14',
    glow: 'rgba(219, 233, 247, 0.6)',
  },

  /*
   * Les pas, en deux familles.
   *
   * Une journée et un cumul ne récompensent pas la même chose : l'une est un
   * coup d'éclat, l'autre une habitude. Deux familles de couleurs, donc, pour
   * qu'on ne cherche pas à les comparer — le vert pour la journée, le cuivre
   * pour les kilomètres empilés.
   */
  'pas-jour-10000': {
    titre: '10 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#9bf6c0',
    from: '#b9f7d2', mid: '#4ad98a', to: '#17704a',
    coreFrom: '#0b2a1c', coreTo: '#04120c',
    glow: 'rgba(74, 217, 138, 0.45)',
  },
  'pas-jour-15000': {
    titre: '15 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#8df3b4',
    from: '#9bf0c2', mid: '#22c56f', to: '#0d5c38',
    coreFrom: '#09241a', coreTo: '#030f0a',
    glow: 'rgba(34, 197, 111, 0.5)',
  },
  'pas-jour-20000': {
    titre: '20 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#b8f5a0',
    from: '#cdf7a6', mid: '#78d93a', to: '#2f6b14',
    coreFrom: '#13260a', coreTo: '#060f04',
    glow: 'rgba(120, 217, 58, 0.5)',
  },
  'pas-jour-30000': {
    titre: '30 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#e8ffb0',
    from: '#f0ffc4', mid: '#c2f53a', to: '#6f8f1a',
    coreFrom: '#1f2a06', coreTo: '#0b1003',
    glow: 'rgba(194, 245, 58, 0.55)',
  },

  'pas-total-100000': {
    titre: '100 000 pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#ffd1a3',
    from: '#ffd9b5', mid: '#e08a46', to: '#8a4717',
    coreFrom: '#2b1708', coreTo: '#140a03',
    glow: 'rgba(224, 138, 70, 0.45)',
  },
  'pas-total-500000': {
    titre: '500 000 pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#ffc488',
    from: '#ffcf9e', mid: '#d4722a', to: '#78380f',
    coreFrom: '#2e1505', coreTo: '#150902',
    glow: 'rgba(212, 114, 42, 0.5)',
  },
  'pas-total-1000000': {
    titre: 'Un million de pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#ffe9c2',
    from: '#fff1d6', mid: '#f0a94a', to: '#a05c16',
    coreFrom: '#33200a', coreTo: '#160d03',
    glow: 'rgba(240, 169, 74, 0.6)',
  },
};

/**
 * Les paliers, du plus court au plus long.
 *
 * L'ordre compte : on attribue en remontant la liste, pour que quelqu'un qui
 * arrive avec quatre cents jours au compteur reçoive les quatre d'un coup
 * plutôt que le dernier seulement.
 */
export const PALIERS_CREATINE = [7, 30, 100, 365] as const;

export function idBadgeCreatine(jours: number): string {
  return `creatine-${jours}`;
}

/**
 * Le badge d'un palier de créatine.
 *
 * `category`, `rank` et `monthKey` ne veulent rien dire ici — le type est
 * partagé avec les badges de classement, qui eux ont un podium et un mois.
 */
/** Les meilleures journées, et le compteur qui ne redescend jamais. */
export const PALIERS_PAS_JOUR = [10000, 15000, 20000, 30000] as const;
export const PALIERS_PAS_TOTAL = [100000, 500000, 1000000] as const;

export function idBadgePasJour(pas: number): string {
  return `pas-jour-${pas}`;
}

export function idBadgePasTotal(pas: number): string {
  return `pas-total-${pas}`;
}

/**
 * Le badge correspondant à un identifiant de palier.
 *
 * L'appelant n'a qu'une liste d'identifiants à poser : lui faire choisir la
 * bonne fonction de fabrication selon le préfixe revenait à écrire deux fois
 * la même correspondance, ici et chez lui.
 */
export function badgeAcquisPourId(id: string, maintenant = Date.now()): RankBadge {
  const famille = id.startsWith('creatine-') ? 'Créatine' : 'Pas';
  return badgeAcquis(id, famille, maintenant);
}

/**
 * Un badge qui se gagne en atteignant quelque chose, et non en finissant
 * devant quelqu'un.
 *
 * `category`, `rank` et `monthKey` ne veulent rien dire ici — le type est
 * partagé avec les badges de classement, qui eux ont un podium et un mois.
 */
function badgeAcquis(id: string, famille: string, maintenant: number): RankBadge {
  return {
    id,
    kind: 'event',
    eventId: id,
    category: 'reps',
    rank: 0,
    monthKey: '',
    seasonId: '',
    seasonName: famille,
    groupName: '',
    earnedAt: maintenant,
  };
}

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
