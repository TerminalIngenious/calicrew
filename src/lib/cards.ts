import type { Card, CardRarity } from '../types';

export const ALL_CARDS: Card[] = [
  // HISTORIQUE (5)
  { id: 'h1', name: 'Bruce Lee', emoji: '🐉', rarity: 'historique', category: 'Arts martiaux' },
  { id: 'h2', name: 'Léonidas', emoji: '⚔️', rarity: 'historique', category: 'Guerrier' },
  { id: 'h3', name: 'Héraclès', emoji: '🏛️', rarity: 'historique', category: 'Mythologie' },
  { id: 'h4', name: 'Muhammad Ali', emoji: '🥊', rarity: 'historique', category: 'Boxe' },
  { id: 'h5', name: 'Miyamoto Musashi', emoji: '🗡️', rarity: 'historique', category: 'Samouraï' },

  // LÉGENDAIRE (8)
  { id: 'l1', name: 'Hannibal for King', emoji: '👑', rarity: 'legendaire', category: 'Calisthenics' },
  { id: 'l2', name: 'Chris Heria', emoji: '🔥', rarity: 'legendaire', category: 'Calisthenics' },
  { id: 'l3', name: 'Frank Medrano', emoji: '💪', rarity: 'legendaire', category: 'Calisthenics' },
  { id: 'l4', name: 'Cristiano Ronaldo', emoji: '⚽', rarity: 'legendaire', category: 'Football' },
  { id: 'l5', name: 'Mike Tyson', emoji: '🥊', rarity: 'legendaire', category: 'Boxe' },
  { id: 'l6', name: 'Zinédine Zidane', emoji: '🇫🇷', rarity: 'legendaire', category: 'Football' },
  { id: 'l7', name: 'Kylian Mbappé', emoji: '⚡', rarity: 'legendaire', category: 'Football' },
  { id: 'l8', name: 'Arnold Schwarzenegger', emoji: '🏋️', rarity: 'legendaire', category: 'Bodybuilding' },

  // ÉPIQUE (10)
  { id: 'e1', name: 'Andrea Larosa', emoji: '🤸', rarity: 'epique', category: 'Calisthenics' },
  { id: 'e2', name: 'Dejan Stipke', emoji: '🦾', rarity: 'epique', category: 'Calisthenics' },
  { id: 'e3', name: 'Viktor Kamenov', emoji: '🏆', rarity: 'epique', category: 'Calisthenics' },
  { id: 'e4', name: 'LeBron James', emoji: '🏀', rarity: 'epique', category: 'Basketball' },
  { id: 'e5', name: 'Conor McGregor', emoji: '🤜', rarity: 'epique', category: 'MMA' },
  { id: 'e6', name: 'Usain Bolt', emoji: '🏃', rarity: 'epique', category: 'Athlétisme' },
  { id: 'e7', name: 'Teddy Riner', emoji: '🥋', rarity: 'epique', category: 'Judo' },
  { id: 'e8', name: 'Tony Jaa', emoji: '🦵', rarity: 'epique', category: 'Arts martiaux' },
  { id: 'e9', name: 'Neymar Jr', emoji: '🎩', rarity: 'epique', category: 'Football' },
  { id: 'e10', name: 'Michael Jordan', emoji: '🐐', rarity: 'epique', category: 'Basketball' },

  // RARE (12)
  { id: 'r1', name: 'Daniels Laizans', emoji: '🇱🇻', rarity: 'rare', category: 'Calisthenics' },
  { id: 'r2', name: 'Osvaldo Lugones', emoji: '🇦🇷', rarity: 'rare', category: 'Calisthenics' },
  { id: 'r3', name: 'Simonster', emoji: '🎯', rarity: 'rare', category: 'Calisthenics' },
  { id: 'r4', name: 'FitnessFAQs', emoji: '📚', rarity: 'rare', category: 'Calisthenics' },
  { id: 'r5', name: 'Tibo InShape', emoji: '🇫🇷', rarity: 'rare', category: 'Fitness' },
  { id: 'r6', name: 'Antoine Griezmann', emoji: '⭐', rarity: 'rare', category: 'Football' },
  { id: 'r7', name: 'Paul Pogba', emoji: '🕺', rarity: 'rare', category: 'Football' },
  { id: 'r8', name: 'Novak Djokovic', emoji: '🎾', rarity: 'rare', category: 'Tennis' },
  { id: 'r9', name: 'Rafael Nadal', emoji: '🐂', rarity: 'rare', category: 'Tennis' },
  { id: 'r10', name: 'Karim Benzema', emoji: '🔱', rarity: 'rare', category: 'Football' },
  { id: 'r11', name: 'Giannis Antetokounmpo', emoji: '🦌', rarity: 'rare', category: 'Basketball' },
  { id: 'r12', name: 'Francis Ngannou', emoji: '🇨🇲', rarity: 'rare', category: 'MMA' },

  // COMMUNE (15)
  { id: 'c1', name: 'Calisthenicmovement', emoji: '📐', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c2', name: 'Austin Dunham', emoji: '🎬', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c3', name: 'Browney', emoji: '🧪', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c4', name: 'Gabo Saturno', emoji: '🌐', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c5', name: 'Red Delta Project', emoji: '🔺', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c6', name: 'Minus the Gym', emoji: '🏠', rarity: 'commune', category: 'Calisthenics' },
  { id: 'c7', name: 'Tom Merrick', emoji: '🧘', rarity: 'commune', category: 'Mobilité' },
  { id: 'c8', name: 'Hampton Liu', emoji: '🏋️', rarity: 'commune', category: 'Fitness' },
  { id: 'c9', name: 'Athlean-X', emoji: '🔬', rarity: 'commune', category: 'Fitness' },
  { id: 'c10', name: 'David Goggins', emoji: '🪖', rarity: 'commune', category: 'Endurance' },
  { id: 'c11', name: 'Ross Edgley', emoji: '🏊', rarity: 'commune', category: 'Endurance' },
  { id: 'c12', name: 'Eddie Hall', emoji: '🐘', rarity: 'commune', category: 'Strongman' },
  { id: 'c13', name: 'Larry Wheels', emoji: '🔩', rarity: 'commune', category: 'Powerlifting' },
  { id: 'c14', name: 'Jujimufu', emoji: '🤡', rarity: 'commune', category: 'Tricking' },
  { id: 'c15', name: 'Jeff Cavaliere', emoji: '🩺', rarity: 'commune', category: 'Fitness' },
];

export const RARITY_ORDER: CardRarity[] = ['historique', 'legendaire', 'epique', 'rare', 'commune'];

export const RARITY_LABELS: Record<CardRarity, string> = {
  historique: 'Historique',
  legendaire: 'Légendaire',
  epique: 'Épique',
  rare: 'Rare',
  commune: 'Commune',
};

export const RARITY_COLORS: Record<CardRarity, string> = {
  historique: '#ff2d55',
  legendaire: '#ffd700',
  epique: '#a855f7',
  rare: '#3b82f6',
  commune: '#6b7280',
};

const RARITY_WEIGHTS: Record<CardRarity, number> = {
  commune: 50,
  rare: 28,
  epique: 14,
  legendaire: 6,
  historique: 2,
};

export function rollCardFromChest(chestRarity: CardRarity, ownedIds: string[]): Card | null {
  const rarityIndex = RARITY_ORDER.indexOf(chestRarity);
  const eligibleRarities = RARITY_ORDER.slice(0, rarityIndex + 1);

  const availableCards = ALL_CARDS.filter(
    (c) => eligibleRarities.includes(c.rarity) && !ownedIds.includes(c.id)
  );

  if (availableCards.length === 0) {
    const anyAvailable = ALL_CARDS.filter((c) => !ownedIds.includes(c.id));
    if (anyAvailable.length === 0) return null;
    return anyAvailable[Math.floor(Math.random() * anyAvailable.length)];
  }

  const weighted: Card[] = [];
  for (const card of availableCards) {
    const w = RARITY_WEIGHTS[card.rarity] || 1;
    for (let i = 0; i < w; i++) weighted.push(card);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
