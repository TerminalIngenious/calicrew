/**
 * Échanges de cartes par annonce.
 *
 * L'auteur publie la carte qu'il met à l'échange, visible par tout le groupe.
 * Chaque autre membre propose une carte, et l'auteur choisit avec qui conclure.
 *
 * Toute la logique est ici, sans Firestore : c'est la partie qui doit être
 * juste, puisqu'elle déplace des cartes entre deux inventaires.
 */

import type { TradeBid, TradeKind, TradeListing } from '../types';

export type Owned = Record<string, number>;

export function countOf(owned: Owned | undefined, cardId: string): number {
  return owned?.[cardId] || 0;
}

export function owns(owned: Owned | undefined, cardId: string): boolean {
  return countOf(owned, cardId) > 0;
}

/** Proposition de ce membre sur cette annonce, s'il en a déjà une. */
export function myBid(listing: TradeListing, uid: string): TradeBid | undefined {
  return (listing.bids || []).find((b) => b.uid === uid);
}

/** Les annonces d'avant les recherches n'ont pas de `kind` : ce sont des offres. */
export function listingKind(listing: TradeListing): TradeKind {
  return listing.kind === 'recherche' ? 'recherche' : 'offre';
}

/**
 * Qui donne quoi, une fois la proposition retenue.
 *
 * Dans une offre, la carte de l'annonce est celle que l'auteur donne et le
 * proposant choisit ce qu'il met en face. Dans une recherche c'est l'inverse :
 * la carte de l'annonce est celle que le proposant devra fournir, et il choisit
 * ce qu'il veut prendre dans la collection de l'auteur. L'échange est le même,
 * seul le côté fixé d'avance change.
 */
export function tradeCards(
  listing: TradeListing,
  bidCardId: string
): { ownerGives: string; bidderGives: string } {
  return listingKind(listing) === 'recherche'
    ? { ownerGives: bidCardId, bidderGives: listing.cardId }
    : { ownerGives: listing.cardId, bidderGives: bidCardId };
}

export type BidRefusal =
  | 'own-listing'      // on ne propose pas sur sa propre annonce
  | 'closed'           // annonce déjà conclue ou retirée
  | 'not-owned'        // la carte proposée n'est pas dans l'inventaire
  | 'same-card';       // proposer la carte déjà mise à l'échange ne donne rien

/**
 * Null si la proposition est acceptable, sinon la raison du refus. `owned` est
 * l'inventaire du proposant : c'est toujours lui qu'on vérifie ici, quel que
 * soit le sens de l'annonce.
 */
export function checkBid(
  listing: TradeListing,
  uid: string,
  cardId: string,
  owned: Owned | undefined
): BidRefusal | null {
  if (listing.status !== 'open') return 'closed';
  if (listing.ownerUid === uid) return 'own-listing';
  if (cardId === listing.cardId) return 'same-card';
  const { bidderGives } = tradeCards(listing, cardId);
  if (!owns(owned, bidderGives)) return 'not-owned';
  return null;
}

/** Peut-on seulement répondre à cette recherche ? Il faut posséder la carte. */
export function canAnswer(listing: TradeListing, owned: Owned | undefined): boolean {
  return listingKind(listing) === 'offre' || owns(owned, listing.cardId);
}

export const BID_REFUSAL_MESSAGES: Record<BidRefusal, string> = {
  'own-listing': "C'est ta propre annonce.",
  closed: "Cette annonce n'est plus ouverte.",
  'not-owned': "Tu n'as plus cette carte.",
  'same-card': "C'est la carte de l'annonce.",
};

/**
 * Remplace la proposition de ce membre, ou l'ajoute. Une personne n'a qu'une
 * proposition par annonce : reproposer écrase, ça évite d'empiler des offres
 * périmées que l'auteur devrait trier.
 */
export function withBid(bids: TradeBid[], bid: TradeBid): TradeBid[] {
  const others = (bids || []).filter((b) => b.uid !== bid.uid);
  return [...others, bid].sort((a, b) => a.createdAt - b.createdAt);
}

export function withoutBid(bids: TradeBid[], uid: string): TradeBid[] {
  return (bids || []).filter((b) => b.uid !== uid);
}

export type SwapRefusal = 'owner-missing-card' | 'bidder-missing-card';

export const SWAP_REFUSAL_MESSAGES: Record<SwapRefusal, string> = {
  'owner-missing-card': "Tu n'as plus la carte mise à l'échange.",
  'bidder-missing-card': "Cette personne n'a plus la carte proposée.",
};

export interface SwapResult {
  ownerCards: Owned;
  bidderCards: Owned;
}

/**
 * Déplace une carte de chaque côté.
 *
 * Les deux inventaires sont relus juste avant l'échange : entre la
 * proposition et le choix de l'auteur, une carte a pu partir dans un autre
 * échange. Sans cette vérification on pourrait créer une carte à partir de
 * rien, ou en faire disparaître une.
 */
export function swapCards(
  ownerCards: Owned,
  bidderCards: Owned,
  ownerCardId: string,
  bidderCardId: string
): { ok: true; result: SwapResult } | { ok: false; reason: SwapRefusal } {
  if (!owns(ownerCards, ownerCardId)) return { ok: false, reason: 'owner-missing-card' };
  if (!owns(bidderCards, bidderCardId)) return { ok: false, reason: 'bidder-missing-card' };

  const next: SwapResult = {
    ownerCards: { ...ownerCards },
    bidderCards: { ...bidderCards },
  };

  next.ownerCards[ownerCardId] = countOf(ownerCards, ownerCardId) - 1;
  next.ownerCards[bidderCardId] = countOf(ownerCards, bidderCardId) + 1;
  next.bidderCards[bidderCardId] = countOf(bidderCards, bidderCardId) - 1;
  next.bidderCards[ownerCardId] = countOf(bidderCards, ownerCardId) + 1;

  return { ok: true, result: next };
}

/** Annonces ouvertes du groupe, les plus récentes d'abord. */
export function sortListings(listings: TradeListing[]): TradeListing[] {
  return [...listings].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Pastille de l'onglet Échanges : ce qui demande une action de ma part, donc
 * les propositions reçues sur mes annonces. Les annonces des autres
 * n'attendent rien de moi.
 */
export function pendingActionCount(listings: TradeListing[], uid: string): number {
  return listings
    .filter((l) => l.status === 'open' && l.ownerUid === uid)
    .reduce((sum, l) => sum + (l.bids || []).length, 0);
}
