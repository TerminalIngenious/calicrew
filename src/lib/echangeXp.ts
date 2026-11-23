/**
 * Échange des cartes en double contre de l'XP de pass.
 *
 * Une carte en double ne sert à rien : elle n'avance aucune collection et ne
 * trouve pas toujours preneur dans les annonces d'échange. Elle se rend donc
 * contre de l'XP, à un tarif qui dépend de sa rareté.
 *
 * Toute la logique est ici et sans Firestore, comme pour les annonces : c'est
 * la partie qui doit être juste, puisqu'elle détruit des cartes.
 */

import type { Card, CardRarity, Season, UserProgress } from '../types';
import { getCardById, RARITY_ORDER } from './cards';
import { accordeXp, needsSeasonReset, startNewSeason } from './passes';

/**
 * Ce que rend un doublon, rareté par rareté.
 *
 * L'échelle suit l'inverse des taux de drop, mais compressée : au tarif exact
 * de la rareté, un doublon historique vaudrait quarante communes et un seul
 * suffirait à finir un pass. Ici un doublon commun pèse un huitième de niveau,
 * un historique un peu plus de deux niveaux — assez pour que rendre ses
 * doublons compte, trop peu pour remplacer le sport.
 */
export const XP_PAR_RARETE: Record<CardRarity, number> = {
  intergalactique: 0,
  historique: 600,
  legendaire: 300,
  epique: 120,
  rare: 50,
  commune: 25,
};

/**
 * L'intergalactique ne s'échange jamais.
 *
 * Elle est limitée à une par personne, donc aucun doublon ne peut exister —
 * mais la règle est écrite plutôt que supposée : le jour où un coffre spécial
 * en distribuerait une seconde, elle ne devrait toujours pas pouvoir partir
 * au recyclage.
 */
export function echangeable(card: Card): boolean {
  return card.rarity !== 'intergalactique';
}

export interface Doublon {
  card: Card;
  /** Exemplaires en trop : on garde toujours le premier. */
  extra: number;
  xpUnitaire: number;
}

/**
 * Les doublons d'une collection, du plus rare au plus commun.
 *
 * On ne compte jamais le premier exemplaire : la carte reste dans la
 * collection, sinon l'échange ferait reculer une saison déjà complétée et
 * pourrait vider l'avatar de quelqu'un.
 */
export function doublons(owned: Record<string, number> | undefined): Doublon[] {
  const sortie: Doublon[] = [];
  for (const [id, nombre] of Object.entries(owned || {})) {
    if (nombre <= 1) continue;
    const card = getCardById(id);
    if (!card || !echangeable(card)) continue;
    sortie.push({ card, extra: nombre - 1, xpUnitaire: XP_PAR_RARETE[card.rarity] });
  }
  return sortie.sort((a, b) => {
    const r = RARITY_ORDER.indexOf(a.card.rarity) - RARITY_ORDER.indexOf(b.card.rarity);
    return r !== 0 ? r : a.card.name.localeCompare(b.card.name, 'fr');
  });
}

/** Ce que rendrait un lot de doublons, tous exemplaires en trop compris. */
export function xpDuLot(lot: Doublon[]): number {
  return lot.reduce((total, d) => total + d.extra * d.xpUnitaire, 0);
}

/**
 * Retire des exemplaires d'une collection.
 *
 * Borné au nombre d'exemplaires en trop : même appelée avec un nombre
 * fantaisiste, la fonction ne peut pas faire tomber une carte à zéro.
 */
export function retire(
  owned: Record<string, number>,
  cardId: string,
  combien: number
): { collection: Record<string, number>; rendus: number } {
  const nombre = owned[cardId] || 0;
  const rendus = Math.max(0, Math.min(combien, nombre - 1));
  if (rendus === 0) return { collection: owned, rendus: 0 };
  return { collection: { ...owned, [cardId]: nombre - rendus }, rendus };
}

/**
 * Ce que devient une progression après un échange.
 *
 * Rendu pur et séparé de l'écriture : c'est la seule façon de vérifier les
 * bornes sans toucher à une vraie collection. La fonction reçoit l'état lu
 * dans la transaction et rend les champs à écrire, rien de plus.
 *
 * Les coffres de niveau sont accordés ici comme pour une quête : l'XP d'un
 * échange est de l'XP de pass, et un niveau franchi doit donner son coffre
 * quelle qu'en soit la source.
 */
export function appliqueEchange(
  stored: UserProgress,
  /** Combien d'exemplaires rendre, par carte. */
  demande: Record<string, number>,
  saison: Season | null
): {
  ownedCards: Record<string, number>;
  passXp: number;
  chestsToOpen: { rarity: CardRarity; pool: string }[];
  currentSeasonId: string;
  xpGagne: number;
  rendus: number;
} {
  /* La bascule de saison se fait d'ordinaire à l'ouverture du Pass. Si elle
     n'a pas encore eu lieu, cet XP s'ajouterait au total de la saison
     précédente et disparaîtrait à la première visite du Pass. */
  const base =
    saison && needsSeasonReset(stored, saison.id) ? startNewSeason(stored, saison.id) : stored;

  let collection = { ...(base.ownedCards || {}) };
  let xpGagne = 0;
  let rendus = 0;

  for (const [cardId, combien] of Object.entries(demande)) {
    const card = getCardById(cardId);
    if (!card || !echangeable(card)) continue;
    const sortie = retire(collection, cardId, combien);
    collection = sortie.collection;
    rendus += sortie.rendus;
    xpGagne += sortie.rendus * XP_PAR_RARETE[card.rarity];
  }

  const { passXp, chestsToOpen } = accordeXp(base, xpGagne, saison);

  return {
    ownedCards: collection,
    passXp,
    chestsToOpen,
    currentSeasonId: saison ? saison.id : base.currentSeasonId || '',
    xpGagne,
    rendus,
  };
}
