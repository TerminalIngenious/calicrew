import type { Card } from '../types';

/**
 * Saison 2 — Fous du bus (50 cartes).
 *
 * Nouveauté de la saison : les cartes sont réparties en **familles** de tailles
 * inégales, portées par `category` — un champ qui existait déjà sans vraiment
 * servir, toute la saison 1 étant en « Politique ». Rien à migrer donc, et une
 * carte reste une carte.
 *
 * Les raretés reprennent la répartition du Google Doc : 2 historiques (les
 * « mythiques » du doc), 5 légendaires, 8 épiques, 16 rares, 20 communes. Elles
 * sont étalées sur les neuf familles : aucune n'est entièrement composée de
 * rebuts, aucune n'est un jackpot. Compléter une famille demande donc de la
 * chance *et* des échanges, ce qui est le but.
 *
 * L'ordre du tableau compte : l'intro de saison fait défiler les familles dans
 * cet ordre, et la page Collection les empile pareil. On garde donc le
 * regroupement par famille, rareté décroissante à l'intérieur.
 *
 * Pas de champ `image` pour l'instant : les visuels sont en cours de
 * fabrication, l'emoji sert de repli d'ici là.
 */

/** Ordre d'affichage des familles — les « lignes de bus » de la saison. */
export const S2_FAMILIES = [
  'InfluVoleurs',
  'Dictateurs',
  'Tueurs en série',
  'Chanteurs & rappeurs',
  'Milliardaires',
  'Barons de la drogue',
  'Philosophes',
  'Scientifiques',
  'Mythologique',
] as const;

export const PASS2_CARDS: Card[] = [
  // ── InfluVoleurs (6) ──
  { id: 's2-ciao-energy', name: 'Ciao Energy', subtitle: 'Squeezie, Léna, Inox', emoji: '🥤', rarity: 'historique', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-mister-v', name: 'Mister V', subtitle: 'Pizza della mama', emoji: '🍕', rarity: 'epique', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-tibo-inshape', name: 'Tibo InShape', subtitle: 'Dédicace', emoji: '✍️', rarity: 'rare', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-natoo', name: 'Natoo', subtitle: 'Bon chien', emoji: '🐕', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-joyca', name: 'Joyca', subtitle: 'Parfums', emoji: '🧴', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-maghla', name: 'Maghla', subtitle: 'Polyester', emoji: '🧵', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },

  // ── Dictateurs (8) ──
  { id: 's2-hitler', name: 'Adolf Hitler', subtitle: 'Le führer', emoji: '💩', rarity: 'legendaire', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-staline', name: 'Joseph Staline', subtitle: 'Le goulag', emoji: '☭', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-netanyahou', name: 'Benyamin Netanyahou', subtitle: 'Bibi le magicien', emoji: '🏛️', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-petain', name: 'Philippe Pétain', subtitle: 'Travail - Famille - Patrie', emoji: '🪖', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-mussolini', name: 'Benito Mussolini', subtitle: 'Il Duce', emoji: '🇮🇹', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-franco', name: 'Francisco Franco', subtitle: 'El Caudillo', emoji: '🇪🇸', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-castro', name: 'Fidel Castro', subtitle: 'Líder Máximo', emoji: '🚬', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-maduro', name: 'Nicolás Maduro', subtitle: 'Captured', emoji: '🛢️', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },

  // ── Tueurs en série (6) ──
  { id: 's2-xddl', name: 'Xavier Dupont de Ligonnès', subtitle: 'Bétonnière', emoji: '🕵️', rarity: 'legendaire', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-jeffrey-dahmer', name: 'Jeffrey Dahmer', subtitle: 'Le cannibale de Milwaukee', emoji: '🧊', rarity: 'epique', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-jack-eventreur', name: 'Jack l\'Éventreur', subtitle: 'From Hell', emoji: '🌫️', rarity: 'epique', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-ed-gein', name: 'Ed Gein', subtitle: 'Leatherface', emoji: '🪚', rarity: 'epique', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-hannibal-lecter', name: 'Hannibal Lecter', subtitle: 'Le cannibale raffiné', emoji: '🍷', rarity: 'rare', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-fourniret', name: 'Michel Fourniret', subtitle: 'L\'ogre des Ardennes', emoji: '🌲', rarity: 'commune', category: 'Tueurs en série', set: 'pass-2' },

  // ── Chanteurs & rappeurs (9) ──
  { id: 's2-p-diddy', name: 'P. Diddy', subtitle: 'Huile de bébé', emoji: '🫒', rarity: 'historique', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-kanye-west', name: 'Kanye West', subtitle: 'T-shirt à 20 €', emoji: '👕', rarity: 'epique', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-drake', name: 'Drake', subtitle: 'La beuteu', emoji: '🦉', rarity: 'epique', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-claude-francois', name: 'Claude François', subtitle: 'L\'ampoule', emoji: '💡', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-bruel', name: 'Patrick Bruel', subtitle: 'Le poker', emoji: '🃏', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-femtogo', name: 'Femtogo', subtitle: 'Le pédo', emoji: '🎧', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-booba-kaaris', name: 'Booba & Kaaris', subtitle: 'Orly', emoji: '✈️', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-freeze-corleone', name: 'Freeze Corleone', subtitle: '667', emoji: '🥶', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-6ix9ine', name: '6ix9ine', subtitle: 'L\'arc-en-ciel', emoji: '🌈', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },

  // ── Milliardaires (4) ──
  { id: 's2-elon-musk', name: 'Elon Musk', subtitle: 'Salut romain', emoji: '🚀', rarity: 'legendaire', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-bezos', name: 'Jeff Bezos', subtitle: 'La fusée', emoji: '📦', rarity: 'rare', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-pouyanne', name: 'Patrick Pouyanné', subtitle: '8 milliards de bénéfice', emoji: '⛽', rarity: 'rare', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-zuckerberg', name: 'Mark Zuckerberg', subtitle: 'Robot', emoji: '🤖', rarity: 'commune', category: 'Milliardaires', set: 'pass-2' },

  // ── Barons de la drogue (2) ──
  { id: 's2-ricky-ross', name: 'Ricky Donnell Ross', subtitle: 'L\'empereur de la drogue', emoji: '🛣️', rarity: 'epique', category: 'Barons de la drogue', set: 'pass-2' },
  { id: 's2-escobar', name: 'Pablo Escobar', subtitle: 'El Patrón', emoji: '🏵️', rarity: 'commune', category: 'Barons de la drogue', set: 'pass-2' },

  // ── Philosophes (4) ──
  { id: 's2-freud', name: 'Sigmund Freud', subtitle: 'Complexe d\'Œdipe', emoji: '🛋️', rarity: 'rare', category: 'Philosophes', set: 'pass-2' },
  { id: 's2-aristote', name: 'Aristote', subtitle: 'Le miso', emoji: '📜', rarity: 'rare', category: 'Philosophes', set: 'pass-2' },
  { id: 's2-schopenhauer', name: 'Arthur Schopenhauer', subtitle: 'Le dépressif', emoji: '🕰️', rarity: 'commune', category: 'Philosophes', set: 'pass-2' },
  { id: 's2-le-peuple', name: 'Le peuple', subtitle: 'Ne sait toujours pas réfléchir', emoji: '🐑', rarity: 'commune', category: 'Philosophes', set: 'pass-2' },

  // ── Scientifiques (4) ──
  { id: 's2-einstein', name: 'Albert Einstein', subtitle: 'E = mc²', emoji: '🧠', rarity: 'legendaire', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-newton', name: 'Isaac Newton', subtitle: 'Starfoulah la pomme', emoji: '🍎', rarity: 'rare', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-tesla', name: 'Nikola Tesla', subtitle: 'Le courant alternatif', emoji: '⚡', rarity: 'commune', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-mengele', name: 'Josef Mengele', subtitle: 'Medic nazi', emoji: '💉', rarity: 'commune', category: 'Scientifiques', set: 'pass-2' },

  // ── Mythologique (7) ──
  { id: 's2-zeus', name: 'Zeus', subtitle: 'Le Malin', emoji: '⚡', rarity: 'legendaire', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-loki', name: 'Loki', subtitle: 'Famille nombreuse', emoji: '🐍', rarity: 'epique', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-cronos', name: 'Cronos', subtitle: 'Mangeur de bébés', emoji: '⏳', rarity: 'rare', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-minotaure', name: 'Le Minotaure', subtitle: 'C\'est pas une déviance', emoji: '🐂', rarity: 'rare', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-atoum', name: 'Atoum', subtitle: 'Le masturbateur', emoji: '🌞', rarity: 'rare', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-poseidon', name: 'Poséidon', subtitle: 'Mmmmh les fury', emoji: '🔱', rarity: 'commune', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-thor', name: 'Thor', subtitle: 'Le maxi golmond', emoji: '🔨', rarity: 'commune', category: 'Mythologique', set: 'pass-2' },
];
