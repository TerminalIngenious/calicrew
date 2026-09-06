import type { Card, CardRarity } from '../types';

// ── Pass 1 : Casier Judiciaire (50 cartes) ──

const PASS1_CARDS: Card[] = [
  // ── Historique (2) ──
  { id: 's1-charlie-kirk', name: 'Charlie Kirk', emoji: '🤏', rarity: 'historique', category: 'Politique', set: 'pass-1' },
  { id: 's1-washington', name: 'George Washington', emoji: '🗽', rarity: 'historique', category: 'Politique', set: 'pass-1' },

  // ── Légendaire (4) ──
  { id: 's1-macron-forsure', name: 'Macron', subtitle: 'For Sure', emoji: '🎤', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-macron' },
  { id: 's1-lepen-detournement', name: 'Marine Le Pen', subtitle: 'Détournement', emoji: '📿', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-lepen' },
  { id: 's1-trump-wall', name: 'Donald Trump', subtitle: 'Build The Wall', emoji: '🧱', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-trump' },
  { id: 's1-obama-mic', name: 'Barack Obama', subtitle: 'Drop The Mic', emoji: '🎙️', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-obama' },

  // ── Épique (8) ──
  { id: 's1-bardella-0', name: 'Jordan Bardella', subtitle: '0 Présence', emoji: '👻', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-bardella' },
  { id: 's1-melenchon-rep', name: 'Jean-Luc Mélenchon', subtitle: 'La République, c\'est moi !', emoji: '👆', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-melenchon' },
  { id: 's1-poutine-ours', name: 'Vladimir Poutine', subtitle: 'Dompteur d\'Ours', emoji: '🐻', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-poutine' },
  { id: 's1-macron-jetski', name: 'Macron', subtitle: 'Jet Ski', emoji: '🚤', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-macron' },
  { id: 's1-lepen-migrants', name: 'Marine Le Pen', subtitle: 'Les Migrants, c\'est comme les Éoliennes', emoji: '🌬️', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-lepen' },
  { id: 's1-glucksmann-1pct', name: 'Raphaël Glucksmann', subtitle: '1%', emoji: '📉', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-glucksmann' },
  { id: 's1-praud-debat', name: 'Pascal Praud', subtitle: 'J\'ouvre le débat', emoji: '📺', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-praud' },
  { id: 's1-zemmour-hein', name: 'Zemmour', subtitle: 'Hein !', emoji: '❗', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-zemmour' },

  // ── Rare (16) ──
  { id: 's1-obama', name: 'Barack Obama', emoji: '🇺🇸', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-trump', name: 'Donald Trump', emoji: '🍊', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-melenchon', name: 'Jean-Luc Mélenchon', emoji: '✊', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-bardella', name: 'Jordan Bardella', emoji: '🤵', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-macron', name: 'Macron', emoji: '🇫🇷', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-lepen', name: 'Marine Le Pen', emoji: '🦁', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-bagayoko', name: 'Bally Bagayoko', emoji: '🎯', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-poutou', name: 'Philippe Poutou', emoji: '🔧', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-meloni', name: 'Giorgia Meloni', emoji: '🇮🇹', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-lassalle', name: 'Jean Lassalle', emoji: '🏔️', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-edouard', name: 'Édouard Philippe', emoji: '🧔', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-kim', name: 'Kim Jong-Un', emoji: '🚀', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-poutine', name: 'Vladimir Poutine', emoji: '🐻', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-arnold', name: 'Arnold Schwarzenegger', emoji: '💪', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-kamala', name: 'Kamala Harris', emoji: '👩‍⚖️', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-zelensky', name: 'Volodymyr Zelensky', emoji: '🇺🇦', rarity: 'rare', category: 'Politique', set: 'pass-1' },

  // ── Commune (20) ──
  { id: 's1-glucksmann', name: 'Raphaël Glucksmann', emoji: '🇪🇺', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-zemmour', name: 'Éric Zemmour', emoji: '📢', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-praud', name: 'Pascal Praud', emoji: '📺', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-darmanin', name: 'Gérald Darmanin', emoji: '🏛️', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-valls', name: 'Manuel Valls', emoji: '✈️', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-boyard', name: 'Louis Boyard', emoji: '🔥', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-tanguy', name: 'Jean-Philippe Tanguy', emoji: '🎭', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-odoul', name: 'Julien Odoul', emoji: '🗣️', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-quatennens', name: 'Adrien Quatennens', emoji: '⚖️', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-erdogan', name: 'Erdogan', emoji: '🇹🇷', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-marechal', name: 'Marion Maréchal', emoji: '🏰', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-escufon', name: 'Thaïs d\'Escufon', emoji: '📱', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-hollande', name: 'François Hollande', emoji: '🌹', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-chenu', name: 'Sébastien Chenu', emoji: '🎩', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-guiraud', name: 'David Guiraud', emoji: '✊', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-panot', name: 'Mathilde Panot', emoji: '📣', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-dussopt', name: 'Olivier Dussopt', emoji: '📊', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-aubry', name: 'Manon Aubry', emoji: '🇪🇺', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-sarkozy', name: 'Nicolas Sarkozy', emoji: '⌚', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-bompard', name: 'Manuel Bompard', emoji: '📝', rarity: 'commune', category: 'Politique', set: 'pass-1' },
];

// ── Registry par saison ──

const CARD_SETS: Record<string, Card[]> = {
  'pass-1': PASS1_CARDS,
};

export function getCardsBySet(setId: string): Card[] {
  return CARD_SETS[setId] || [];
}

export function getAllCurrentCards(seasonId: string): Card[] {
  return getCardsBySet(seasonId);
}

export function getCardVariants(baseCardId: string, setId: string): Card[] {
  const cards = getCardsBySet(setId);
  return cards.filter((c) => c.baseCardId === baseCardId);
}

export function getCardDisplayName(card: Card): string {
  return card.subtitle ? `${card.name} — ${card.subtitle}` : card.name;
}

// ── Raretés ──

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

// ── Drop ──

const RARITY_WEIGHTS: Record<CardRarity, number> = {
  commune: 50,
  rare: 34,
  epique: 12,
  legendaire: 3,
  historique: 1,
};

export function rollCard(
  pool: Card[],
  _ownedCards: Record<string, number>,
): Card | null {
  if (pool.length === 0) return null;

  const weighted: Card[] = [];
  for (const card of pool) {
    const w = RARITY_WEIGHTS[card.rarity] || 1;
    for (let i = 0; i < w; i++) weighted.push(card);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
