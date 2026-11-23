import type { Card, UserProgress } from '../types';

/**
 * La carte intergalactique — un event à elle toute seule.
 *
 * Elle n'appartient à aucune saison : son jeu est le sien, sans quoi
 * `isSetComplete` exigerait de la posséder pour terminer la collection de
 * la saison 2, et plus personne n'y arriverait jamais.
 *
 * Elle ne se tire pas non plus comme les autres. Le tirage ordinaire pioche
 * dans un sac où chaque carte est dupliquée selon sa rareté ; un coffre
 * garanti réduit ce sac aux seules raretés hautes, où il ne reste que deux
 * jetons sur mille cinq cent soixante-treize. Une carte au-dessus
 * d'historique y sortirait plus d'une fois sur deux — l'inverse du but.
 * Son tirage est donc indépendant et se joue avant, à probabilité fixe,
 * quel que soit le coffre.
 */
export const CARTE_INTERGALACTIQUE: Card = {
  id: 'ig-tristan',
  name: 'Tristan',
  subtitle: 'Dépôt de plainte',
  emoji: '🪐',
  image: '/cards/ig-tristan.webp',
  rarity: 'intergalactique',
  category: 'Intergalactique',
  set: 'intergalactique',
};

/** Le jeu à elle seule, pour que la collection sache où la ranger. */
export const SET_INTERGALACTIQUE = 'intergalactique';

/*
 * La fenêtre : cent jours, du 23 novembre 2026 au 3 mars 2027.
 *
 * Cent jours pour une carte qui vaut cent. Minuit des deux côtés : une
 * fenêtre qui s'ouvre et se ferme à une heure bâtarde se raconte mal.
 *
 * Elle dépasse la fin de la saison 2 de quatre jours. C'est assumé : la
 * saison 3 prendra le relais d'ici là. Si elle n'existait pas, aucun coffre
 * ne s'ouvrirait après le 27 février et les quatre derniers jours seraient
 * décoratifs.
 */
export const IG_DEBUT = new Date(2026, 10, 23, 0, 0, 0).getTime();
export const IG_FIN = new Date(2027, 2, 3, 23, 59, 59).getTime();

/** Une chance sur deux cents par coffre. */
export const IG_CHANCE = 0.005;

export function fenetreOuverte(maintenant = Date.now()): boolean {
  return maintenant >= IG_DEBUT && maintenant <= IG_FIN;
}

/**
 * Jours pleins restants, 0 le dernier jour.
 *
 * Au plancher et non au plafond : la fenêtre ferme à minuit moins une, donc
 * un arrondi au-dessus comptait un jour de plus et affichait « jour 1 sur
 * 100, encore 101 jours ». Zéro veut dire « c'est aujourd'hui ou jamais ».
 */
export function joursRestants(maintenant = Date.now()): number {
  return Math.max(0, Math.floor((IG_FIN - maintenant) / 86400000));
}

/** Le jour en cours dans la fenêtre, de 1 à 100. */
export function jourDeLaFenetre(maintenant = Date.now()): number {
  return Math.min(100, Math.max(1, Math.ceil((maintenant - IG_DEBUT) / 86400000)));
}

export function possede(progress: Pick<UserProgress, 'ownedCards'>): boolean {
  return (progress.ownedCards?.[CARTE_INTERGALACTIQUE.id] || 0) > 0;
}

/**
 * Ce coffre donne-t-il la carte ?
 *
 * Une par personne au maximum : celui qui l'a déjà relance un coffre normal,
 * sinon la carte la plus rare du jeu finirait en doublon chez le plus
 * assidu, ce qui ne récompense rien.
 */
export function tirageIntergalactique(
  progress: Pick<UserProgress, 'ownedCards'>,
  maintenant = Date.now(),
  hasard = Math.random
): boolean {
  if (!fenetreOuverte(maintenant)) return false;
  if (possede(progress)) return false;
  return hasard() < IG_CHANCE;
}
