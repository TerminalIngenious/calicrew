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
  /**
   * Le nom de l'événement d'où vient le badge, quand il en a un.
   *
   * Les paliers de créatine et de pas ne viennent d'aucun événement : ils se
   * gagnent toute l'année, et un « Événement » générique leur va très bien.
   * Le badge FaceID, lui, ne se regagnera jamais — autant dire d'où il
   * sort, sinon rien ne le rattache à l'event dans un an.
   */
  evenement?: string;
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

/**
 * L'habillage complet d'un badge dessiné en SVG.
 *
 * Ces badges-là sont dessinés de bout en bout, et pas en icône monochrome
 * posée sur une monture CSS comme les badges de classement : il leur faut
 * donc plus de tons que n'en porte EventBadgeStyle — le cœur en trois
 * couleurs, l'encre du dessin, et l'accent du détail qui tranche (l'éclair,
 * les rayons, la couronne).
 */
export interface PaletteBadge {
  id: string;
  /** Monture métallique : clair, médian, sombre. */
  m1: string; m2: string; m3: string;
  /** Cœur : le haut lumineux, le bas profond. */
  c1: string; c2: string; c3: string;
  /** Encre du dessin. */
  g1: string; g2: string;
  /** L'accent, pour le détail qui tranche. */
  acc1: string; acc2: string;
  glow: string;
}

/**
 * Le badge de l'event FaceID.
 *
 * Le vert néon de l'event reste sur la monture — c'est sa signature, on la
 * reconnaît du sachet de booster — mais le cœur part sur l'émeraude : les
 * badges de pas à la journée sont déjà en vert-citron, et deux familles de
 * la même teinte se confondraient dans le bandeau du profil.
 */
export const PALETTE_FACEID: PaletteBadge = {
  id: 'event-faceid',
  m1: '#f2ffc4', m2: '#b6ff00', m3: '#4f7400',
  c1: '#2bf0a6', c2: '#0b9c70', c3: '#032a1c',
  g1: '#ffffff', g2: '#d6fff0',
  acc1: '#eaff8a', acc2: '#b6ff00',
  glow: 'rgba(182, 255, 0, 0.55)',
};

/** Du plus court au plus long : l'ordre donne le dessin de chaque palier. */
export const PALETTE_CREATINE: PaletteBadge[] = [
  {
    id: 'creatine-7',
    m1: '#ebfdff', m2: '#67d8ef', m3: '#1b6c89',
    c1: '#5ff0ff', c2: '#12a5c9', c3: '#063b55',
    g1: '#ffffff', g2: '#b9f2ff',
    acc1: '#ffffff', acc2: '#8ae8ff',
    glow: 'rgba(63, 216, 239, 0.55)',
  },
  {
    id: 'creatine-30',
    m1: '#f0ebff', m2: '#a78bfa', m3: '#3f1d8f',
    c1: '#a78bfa', c2: '#5b2fd4', c3: '#200a4d',
    g1: '#ffffff', g2: '#ddd3ff',
    acc1: '#ffe27a', acc2: '#ffb020',
    glow: 'rgba(139, 92, 246, 0.6)',
  },
  {
    id: 'creatine-100',
    m1: '#ffe4f1', m2: '#f472b6', m3: '#8d1046',
    c1: '#ff6fae', c2: '#d41e6a', c3: '#4c0524',
    g1: '#ffffff', g2: '#ffd9e9',
    acc1: '#ffd27a', acc2: '#ff7a3d',
    glow: 'rgba(244, 114, 182, 0.6)',
  },
  {
    id: 'creatine-365',
    m1: '#fff8dc', m2: '#f5c33b', m3: '#8a5207',
    c1: '#ffd34d', c2: '#e08a09', c3: '#44220a',
    g1: '#ffffff', g2: '#fff0bd',
    acc1: '#ffffff', acc2: '#ffe8a3',
    glow: 'rgba(245, 195, 59, 0.65)',
  },
];

/**
 * Les pas, en deux rampes.
 *
 * La journée reste verte — on l'a faite avec ses jambes, dans la journée —
 * et le cumul part dans le cuivre puis le platine : un coup d'éclat et une
 * habitude ne se comparent pas, et les voir côte à côte ne doit pas donner
 * envie de les ranger sur la même échelle.
 */
export const PALETTE_PAS: PaletteBadge[] = [
  {
    id: 'pas-jour-10000',
    m1: '#e9fff2', m2: '#5fe39a', m3: '#15774a',
    c1: '#5ff0a8', c2: '#10a861', c3: '#053122',
    g1: '#ffffff', g2: '#c8ffdf',
    acc1: '#ffffff', acc2: '#9bffc9',
    glow: 'rgba(95, 227, 154, 0.55)',
  },
  {
    id: 'pas-jour-15000',
    m1: '#e2ffe6', m2: '#4ade5f', m3: '#136b22',
    c1: '#63f07a', c2: '#12a63a', c3: '#05300f',
    g1: '#ffffff', g2: '#ccffd4',
    acc1: '#ffe27a', acc2: '#ffb020',
    glow: 'rgba(74, 222, 95, 0.6)',
  },
  {
    id: 'pas-jour-20000',
    m1: '#f2ffd6', m2: '#a3e635', m3: '#4d7314',
    c1: '#bef264', c2: '#6aa80c', c3: '#223d03',
    g1: '#ffffff', g2: '#eaffc4',
    acc1: '#ffffff', acc2: '#d9ff8a',
    glow: 'rgba(163, 230, 53, 0.6)',
  },
  {
    id: 'pas-jour-30000',
    m1: '#fbffd9', m2: '#d9f95a', m3: '#6b7d10',
    c1: '#e6ff6b', c2: '#9fc90a', c3: '#2c3a02',
    g1: '#ffffff', g2: '#f6ffd0',
    acc1: '#ff9d3d', acc2: '#ff5c1a',
    glow: 'rgba(217, 249, 90, 0.65)',
  },
  {
    id: 'pas-total-100000',
    m1: '#ffe6c9', m2: '#e0924a', m3: '#7d4315',
    c1: '#f0a65c', c2: '#b45f16', c3: '#3a1c06',
    g1: '#ffffff', g2: '#ffe7cc',
    acc1: '#ffffff', acc2: '#ffd4a3',
    glow: 'rgba(224, 146, 74, 0.55)',
  },
  {
    id: 'pas-total-500000',
    m1: '#ffd8c0', m2: '#e2602a', m3: '#7c2a0c',
    c1: '#f4713a', c2: '#c13a10', c3: '#3d1004',
    g1: '#ffffff', g2: '#ffdccb',
    acc1: '#ffd27a', acc2: '#ffa23d',
    glow: 'rgba(226, 96, 42, 0.6)',
  },
  {
    /* Le platine, et non un or de plus : le million doit se distinguer au
       premier regard du badge d'une année de créatine. */
    id: 'pas-total-1000000',
    m1: '#ffffff', m2: '#cfe0ec', m3: '#5d7183',
    c1: '#b9d3e6', c2: '#5d7e99', c3: '#111e29',
    g1: '#ffffff', g2: '#e4f1fb',
    acc1: '#fff6d5', acc2: '#f5c33b',
    glow: 'rgba(207, 224, 236, 0.6)',
  },
];

export const EVENT_BADGES: Record<string, EventBadgeStyle> = {
  faceid: {
    titre: 'Fichier complet',
    soustitre: 'Les trente-six cartes',
    evenement: 'Event FaceID',
    glyphe: 'faceid',
    encre: '#d6fff0',
    from: '#f2ffc4',
    mid: '#b6ff00',
    to: '#4f7400',
    coreFrom: '#0b9c70',
    coreTo: '#032a1c',
    glow: 'rgba(182, 255, 0, 0.55)',
  },

  /*
   * Les paliers de créatine.
   *
   * Quatre familles franches — aqua, indigo, magma, or — et non quatre bleus
   * voisins : posés côte à côte dans le profil, les quatre doivent se
   * distinguer au premier coup d'œil, et la rampe doit se lire comme une
   * montée en valeur. L'habillage complet du dessin est dans
   * PALETTE_CREATINE ; les champs ci-dessous servent ce qui entoure le badge
   * (fenêtre de détail, animation de déblocage) et reprennent les mêmes tons.
   */
  'creatine-7': {
    titre: 'Créatine',
    soustitre: '7 jours d\u2019affilée',
    glyphe: 'creatine',
    encre: '#b9f2ff',
    from: '#ebfdff', mid: '#67d8ef', to: '#1b6c89',
    coreFrom: '#12a5c9', coreTo: '#063b55',
    glow: 'rgba(63, 216, 239, 0.55)',
  },
  'creatine-30': {
    titre: 'Créatine',
    soustitre: 'Un mois d\u2019affilée',
    glyphe: 'creatine',
    encre: '#ddd3ff',
    from: '#f0ebff', mid: '#a78bfa', to: '#3f1d8f',
    coreFrom: '#5b2fd4', coreTo: '#200a4d',
    glow: 'rgba(139, 92, 246, 0.6)',
  },
  'creatine-100': {
    titre: 'Créatine',
    soustitre: 'Cent jours d\u2019affilée',
    glyphe: 'creatine',
    encre: '#ffd9e9',
    from: '#ffe4f1', mid: '#f472b6', to: '#8d1046',
    coreFrom: '#d41e6a', coreTo: '#4c0524',
    glow: 'rgba(244, 114, 182, 0.6)',
  },
  'creatine-365': {
    titre: 'Créatine',
    soustitre: 'Une année d\u2019affilée',
    glyphe: 'creatine',
    encre: '#fff0bd',
    from: '#fff8dc', mid: '#f5c33b', to: '#8a5207',
    coreFrom: '#e08a09', coreTo: '#44220a',
    glow: 'rgba(245, 195, 59, 0.65)',
  },

  /*
   * Les pas, en deux familles.
   *
   * Une journée et un cumul ne récompensent pas la même chose : l'une est un
   * coup d'éclat, l'autre une habitude. Deux familles de couleurs, donc, pour
   * qu'on ne cherche pas à les comparer — le vert pour la journée, le cuivre
   * puis le platine pour les kilomètres empilés. L'habillage du dessin est
   * dans PALETTE_PAS ; ces champs-ci servent ce qui entoure le badge et
   * reprennent les mêmes tons.
   */
  'pas-jour-10000': {
    titre: '10 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#c8ffdf',
    from: '#e9fff2', mid: '#5fe39a', to: '#15774a',
    coreFrom: '#10a861', coreTo: '#053122',
    glow: 'rgba(95, 227, 154, 0.55)',
  },
  'pas-jour-15000': {
    titre: '15 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#ccffd4',
    from: '#e2ffe6', mid: '#4ade5f', to: '#136b22',
    coreFrom: '#12a63a', coreTo: '#05300f',
    glow: 'rgba(74, 222, 95, 0.6)',
  },
  'pas-jour-20000': {
    titre: '20 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#eaffc4',
    from: '#f2ffd6', mid: '#a3e635', to: '#4d7314',
    coreFrom: '#6aa80c', coreTo: '#223d03',
    glow: 'rgba(163, 230, 53, 0.6)',
  },
  'pas-jour-30000': {
    titre: '30 000 pas',
    soustitre: 'En une journée',
    glyphe: 'pas', encre: '#f6ffd0',
    from: '#fbffd9', mid: '#d9f95a', to: '#6b7d10',
    coreFrom: '#9fc90a', coreTo: '#2c3a02',
    glow: 'rgba(217, 249, 90, 0.65)',
  },

  'pas-total-100000': {
    titre: '100 000 pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#ffe7cc',
    from: '#ffe6c9', mid: '#e0924a', to: '#7d4315',
    coreFrom: '#b45f16', coreTo: '#3a1c06',
    glow: 'rgba(224, 146, 74, 0.55)',
  },
  'pas-total-500000': {
    titre: '500 000 pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#ffdccb',
    from: '#ffd8c0', mid: '#e2602a', to: '#7c2a0c',
    coreFrom: '#c13a10', coreTo: '#3d1004',
    glow: 'rgba(226, 96, 42, 0.6)',
  },
  'pas-total-1000000': {
    titre: 'Un million de pas',
    soustitre: 'Depuis le début',
    glyphe: 'pas', encre: '#e4f1fb',
    from: '#ffffff', mid: '#cfe0ec', to: '#5d7183',
    coreFrom: '#5d7e99', coreTo: '#111e29',
    glow: 'rgba(207, 224, 236, 0.6)',
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
