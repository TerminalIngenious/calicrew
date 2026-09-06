import type { Card, CardRarity } from '../types';

// ── Pass 1 : Casier Judiciaire (50 cartes) ──

const PASS1_CARDS: Card[] = [
  // ── Historique (2) ──
  { id: 's1-charlie-kirk', name: 'Charlie Kirk', emoji: '🤏', image: '/cards/s1-charlie-kirk.png', rarity: 'historique', category: 'Politique', set: 'pass-1' },
  { id: 's1-washington', name: 'George Washington', emoji: '🗽', image: '/cards/s1-washington.png', rarity: 'historique', category: 'Politique', set: 'pass-1' },

  // ── Légendaire (4) ──
  { id: 's1-macron-forsure', name: 'Macron', subtitle: 'For Sure', emoji: '🎤', image: '/cards/s1-macron-forsure.png', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-macron' },
  { id: 's1-lepen-detournement', name: 'Marine Le Pen', subtitle: 'Détournement', emoji: '📿', image: '/cards/s1-lepen-detournement.png', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-lepen' },
  { id: 's1-trump-wall', name: 'Donald Trump', subtitle: 'Build The Wall', emoji: '🧱', image: '/cards/s1-trump-wall.png', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-trump' },
  { id: 's1-obama-mic', name: 'Barack Obama', subtitle: 'Drop The Mic', emoji: '🎙️', image: '/cards/s1-obama-mic.png', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 's1-obama' },

  // ── Épique (8) ──
  { id: 's1-bardella-0', name: 'Jordan Bardella', subtitle: '0 Présence', emoji: '👻', image: '/cards/s1-bardella-0.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-bardella' },
  { id: 's1-melenchon-rep', name: 'Jean-Luc Mélenchon', subtitle: 'La République, c\'est moi !', emoji: '👆', image: '/cards/s1-melenchon-rep.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-melenchon' },
  { id: 's1-poutine-ours', name: 'Vladimir Poutine', subtitle: 'Dompteur d\'Ours', emoji: '🐻', image: '/cards/s1-poutine-ours.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-poutine' },
  { id: 's1-macron-jetski', name: 'Macron', subtitle: 'Jet Ski', emoji: '🚤', image: '/cards/s1-macron-jetski.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-macron' },
  { id: 's1-lepen-migrants', name: 'Marine Le Pen', subtitle: 'Les Migrants, c\'est comme les Éoliennes', emoji: '🌬️', image: '/cards/s1-lepen-migrants.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-lepen' },
  { id: 's1-glucksmann-1pct', name: 'Raphaël Glucksmann', subtitle: '1%', emoji: '📉', image: '/cards/s1-glucksmann-1pct.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-glucksmann' },
  { id: 's1-praud-debat', name: 'Pascal Praud', subtitle: 'J\'ouvre le débat', emoji: '📺', image: '/cards/s1-praud-debat.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-praud' },
  { id: 's1-zemmour-hein', name: 'Zemmour', subtitle: 'Hein !', emoji: '❗', image: '/cards/s1-zemmour-hein.png', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 's1-zemmour' },

  // ── Rare (16) ──
  { id: 's1-obama', name: 'Barack Obama', emoji: '🇺🇸', image: '/cards/s1-obama.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-trump', name: 'Donald Trump', emoji: '🍊', image: '/cards/s1-trump.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-melenchon', name: 'Jean-Luc Mélenchon', emoji: '✊', image: '/cards/s1-melenchon.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-bardella', name: 'Jordan Bardella', emoji: '🤵', image: '/cards/s1-bardella.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-macron', name: 'Macron', emoji: '🇫🇷', image: '/cards/s1-macron.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-lepen', name: 'Marine Le Pen', emoji: '🦁', image: '/cards/s1-lepen.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-bagayoko', name: 'Bally Bagayoko', emoji: '🎯', image: '/cards/s1-bagayoko.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-poutou', name: 'Philippe Poutou', emoji: '🔧', image: '/cards/s1-poutou.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-meloni', name: 'Giorgia Meloni', emoji: '🇮🇹', image: '/cards/s1-meloni.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-lassalle', name: 'Jean Lassalle', emoji: '🏔️', image: '/cards/s1-lassalle.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-edouard', name: 'Édouard Philippe', emoji: '🧔', image: '/cards/s1-edouard.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-kim', name: 'Kim Jong-Un', emoji: '🚀', image: '/cards/s1-kim.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-poutine', name: 'Vladimir Poutine', emoji: '🐻', image: '/cards/s1-poutine.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-arnold', name: 'Arnold Schwarzenegger', emoji: '💪', image: '/cards/s1-arnold.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-kamala', name: 'Kamala Harris', emoji: '👩‍⚖️', image: '/cards/s1-kamala.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 's1-zelensky', name: 'Volodymyr Zelensky', emoji: '🇺🇦', image: '/cards/s1-zelensky.png', rarity: 'rare', category: 'Politique', set: 'pass-1' },

  // ── Commune (20) ──
  { id: 's1-glucksmann', name: 'Raphaël Glucksmann', emoji: '🇪🇺', image: '/cards/s1-glucksmann.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-zemmour', name: 'Éric Zemmour', emoji: '📢', image: '/cards/s1-zemmour.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-praud', name: 'Pascal Praud', emoji: '📺', image: '/cards/s1-praud.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-darmanin', name: 'Gérald Darmanin', emoji: '🏛️', image: '/cards/s1-darmanin.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-valls', name: 'Manuel Valls', emoji: '✈️', image: '/cards/s1-valls.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-boyard', name: 'Louis Boyard', emoji: '🔥', image: '/cards/s1-boyard.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-tanguy', name: 'Jean-Philippe Tanguy', emoji: '🎭', image: '/cards/s1-tanguy.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-odoul', name: 'Julien Odoul', emoji: '🗣️', image: '/cards/s1-odoul.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-quatennens', name: 'Adrien Quatennens', emoji: '⚖️', image: '/cards/s1-quatennens.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-erdogan', name: 'Erdogan', emoji: '🇹🇷', image: '/cards/s1-erdogan.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-marechal', name: 'Marion Maréchal', emoji: '🏰', image: '/cards/s1-marechal.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-escufon', name: 'Thaïs d\'Escufon', emoji: '📱', image: '/cards/s1-escufon.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-hollande', name: 'François Hollande', emoji: '🌹', image: '/cards/s1-hollande.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-chenu', name: 'Sébastien Chenu', emoji: '🎩', image: '/cards/s1-chenu.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-guiraud', name: 'David Guiraud', emoji: '✊', image: '/cards/s1-guiraud.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-panot', name: 'Mathilde Panot', emoji: '📣', image: '/cards/s1-panot.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-dussopt', name: 'Olivier Dussopt', emoji: '📊', image: '/cards/s1-dussopt.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-aubry', name: 'Manon Aubry', emoji: '🇪🇺', image: '/cards/s1-aubry.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-sarkozy', name: 'Nicolas Sarkozy', emoji: '⌚', image: '/cards/s1-sarkozy.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 's1-bompard', name: 'Manuel Bompard', emoji: '📝', image: '/cards/s1-bompard.png', rarity: 'commune', category: 'Politique', set: 'pass-1' },
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

export function getCardById(cardId: string): Card | undefined {
  for (const cards of Object.values(CARD_SETS)) {
    const found = cards.find((c) => c.id === cardId);
    if (found) return found;
  }
  return undefined;
}
