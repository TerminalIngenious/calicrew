import type { Card } from '../types';

/**
 * Saison 2 — Fous du bus (51 cartes).
 *
 * Nouveauté de la saison : les cartes sont réparties en **familles** de
 * tailles inégales. La famille est portée par `category`, qui existait déjà
 * dans le modèle sans servir — toute la saison 1 était en « Politique ». Rien
 * à migrer donc, et une carte reste une carte.
 *
 * Les raretés suivent la même répartition qu'en saison 1 — 2 historiques,
 * 4 légendaires, 9 épiques, 16 rares, 20 communes — et sont étalées sur les
 * huit familles : aucune famille n'est entièrement composée de rebuts, aucune
 * n'est un jackpot. Compléter une famille demande donc de la chance *et* des
 * échanges, ce qui est le but.
 */

/** Ordre d'affichage des familles. */
export const S2_FAMILIES = [
  'InfluVoleurs',
  'Dictateurs',
  'Tueurs en série',
  'Chanteurs & rappeurs',
  'Milliardaires',
  'Pirates',
  'Scientifiques',
  'Mythologique',
] as const;

export const PASS2_CARDS: Card[] = [
  // ── InfluVoleurs (6) ──
  { id: 's2-ciao-energy', name: 'Ciao Energy', subtitle: 'Squeezie, Léna, Inox', emoji: '🥤', rarity: 'epique', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-mister-v', name: 'Mister V', subtitle: 'Pizza de la mama', emoji: '🍕', rarity: 'rare', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-tibo-inshape', name: 'Tibo InShape', subtitle: 'Dédicaces', emoji: '✍️', rarity: 'rare', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-natoo', name: 'Natoo', subtitle: 'Bon chien', emoji: '🐕', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-joyca', name: 'Joyca', subtitle: 'Parfums', emoji: '🧴', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },
  { id: 's2-maghla', name: 'Maghla', subtitle: 'Polyester', emoji: '🧵', rarity: 'commune', category: 'InfluVoleurs', set: 'pass-2' },

  // ── Dictateurs (8) ──
  { id: 's2-staline', name: 'Staline', emoji: '☭', rarity: 'epique', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-mussolini', name: 'Mussolini', emoji: '🇮🇹', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-franco', name: 'Franco', emoji: '🇪🇸', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-netanyahu', name: 'Netanyahu', emoji: '🏛️', rarity: 'rare', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-hitler', name: 'Hitler', subtitle: 'Nullos', emoji: '💩', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-petain', name: 'Pétain', emoji: '🪖', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-castro', name: 'Fidel Castro', emoji: '🚬', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },
  { id: 's2-maduro', name: 'Maduro', emoji: '🛢️', rarity: 'commune', category: 'Dictateurs', set: 'pass-2' },

  // ── Tueurs en série (6) ──
  { id: 's2-xddl', name: 'Xavier Dupont de Ligonnès', emoji: '🕵️', rarity: 'historique', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-hannibal', name: 'Hannibal Lecter', emoji: '🍷', rarity: 'legendaire', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-dahmer', name: 'Jeffrey Dahmer', emoji: '🧊', rarity: 'epique', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-jack-eventreur', name: "Jack l'Éventreur", emoji: '🌫️', rarity: 'rare', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-ed-gein', name: 'Ed Gein', subtitle: 'Leatherface', emoji: '🪚', rarity: 'rare', category: 'Tueurs en série', set: 'pass-2' },
  { id: 's2-fourniret', name: 'Michel Fourniret', emoji: '🌲', rarity: 'commune', category: 'Tueurs en série', set: 'pass-2' },

  // ── Chanteurs & rappeurs (9) ──
  { id: 's2-kanye', name: 'Kanye West', subtitle: 'T-shirt à 20€', emoji: '👕', rarity: 'legendaire', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-pdiddy', name: 'P. Diddy', emoji: '🫒', rarity: 'epique', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-cloclo', name: 'Claude François', emoji: '💡', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-booba-kaaris', name: 'Booba & Kaaris', emoji: '✈️', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-freeze', name: 'Freeze Corleone', emoji: '🥶', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-drake', name: 'Drake', subtitle: 'La beuteu', emoji: '🦉', rarity: 'rare', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-bruel', name: 'Patrick Bruel', emoji: '🃏', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-6ix9ine', name: '6ix9ine', emoji: '🌈', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },
  { id: 's2-femtogo', name: 'Femtogo', emoji: '🎧', rarity: 'commune', category: 'Chanteurs & rappeurs', set: 'pass-2' },

  // ── Milliardaires (4) ──
  { id: 's2-musk', name: 'Elon Musk', subtitle: 'Salut romain', emoji: '🚀', rarity: 'legendaire', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-bezos', name: 'Jeff Bezos', emoji: '📦', rarity: 'epique', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-zuckerberg', name: 'Mark Zuckerberg', subtitle: 'Robot', emoji: '🤖', rarity: 'rare', category: 'Milliardaires', set: 'pass-2' },
  { id: 's2-pouyanne', name: 'Patrick Pouyanné', subtitle: '8 milliards de bénéfice', emoji: '⛽', rarity: 'commune', category: 'Milliardaires', set: 'pass-2' },

  // ── Pirates (7) ──
  { id: 's2-jack-sparrow', name: 'Jack Sparrow', emoji: '🧭', rarity: 'legendaire', category: 'Pirates', set: 'pass-2' },
  { id: 's2-barbe-noire', name: 'Barbe-Noire', emoji: '🏴‍☠️', rarity: 'epique', category: 'Pirates', set: 'pass-2' },
  { id: 's2-crochet', name: 'Capitaine Crochet', emoji: '🪝', rarity: 'rare', category: 'Pirates', set: 'pass-2' },
  { id: 's2-morgan', name: 'Henry Morgan', emoji: '🥃', rarity: 'rare', category: 'Pirates', set: 'pass-2' },
  { id: 's2-rackham', name: 'Jack Rackham', emoji: '💀', rarity: 'commune', category: 'Pirates', set: 'pass-2' },
  { id: 's2-la-buse', name: 'La Buse', emoji: '🗺️', rarity: 'commune', category: 'Pirates', set: 'pass-2' },
  { id: 's2-peter-pan', name: 'Peter Pan', emoji: '🧚', rarity: 'commune', category: 'Pirates', set: 'pass-2' },

  // ── Scientifiques (4) ──
  { id: 's2-einstein', name: 'Albert Einstein', emoji: '🧠', rarity: 'epique', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-tesla', name: 'Nikola Tesla', emoji: '⚡', rarity: 'rare', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-newton', name: 'Isaac Newton', emoji: '🍎', rarity: 'commune', category: 'Scientifiques', set: 'pass-2' },
  { id: 's2-mengele', name: 'Josef Mengele', emoji: '💉', rarity: 'commune', category: 'Scientifiques', set: 'pass-2' },

  // ── Mythologique (7) ──
  { id: 's2-zeus', name: 'Zeus', subtitle: 'Le Malin', emoji: '⚡', rarity: 'historique', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-cronos', name: 'Cronos', subtitle: 'Le mangeur de bébés', emoji: '⏳', rarity: 'epique', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-loki', name: 'Loki', subtitle: 'Famille nombreuse', emoji: '🐍', rarity: 'epique', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-poseidon', name: 'Poséidon', subtitle: 'Mmmh les fury', emoji: '🔱', rarity: 'rare', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-thor', name: 'Thor', subtitle: 'Le maxi golmond', emoji: '🔨', rarity: 'commune', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-atoum', name: 'Atoum', subtitle: 'Le masturbateur', emoji: '🌞', rarity: 'commune', category: 'Mythologique', set: 'pass-2' },
  { id: 's2-minotaure', name: 'Le Minotaure', subtitle: "C'est pas une déviance", emoji: '🐂', rarity: 'commune', category: 'Mythologique', set: 'pass-2' },
];
