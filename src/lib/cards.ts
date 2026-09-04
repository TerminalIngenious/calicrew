import type { Card, CardRarity } from '../types';

// ── Set de base (toujours disponible) ──

const BASE_CARDS: Card[] = [
  // Calisthenics
  { id: 'b1', name: 'Hannibal for King', emoji: '👑', rarity: 'legendaire', category: 'Calisthenics', set: 'base' },
  { id: 'b2', name: 'Chris Heria', emoji: '🔥', rarity: 'epique', category: 'Calisthenics', set: 'base' },
  { id: 'b3', name: 'Frank Medrano', emoji: '💪', rarity: 'epique', category: 'Calisthenics', set: 'base' },
  { id: 'b4', name: 'Andrea Larosa', emoji: '🤸', rarity: 'rare', category: 'Calisthenics', set: 'base' },
  { id: 'b5', name: 'Dejan Stipke', emoji: '🦾', rarity: 'rare', category: 'Calisthenics', set: 'base' },
  { id: 'b6', name: 'FitnessFAQs', emoji: '📚', rarity: 'rare', category: 'Calisthenics', set: 'base' },
  { id: 'b7', name: 'Browney', emoji: '🧪', rarity: 'commune', category: 'Calisthenics', set: 'base' },
  { id: 'b8', name: 'Austin Dunham', emoji: '🎬', rarity: 'commune', category: 'Calisthenics', set: 'base' },
  { id: 'b9', name: 'Gabo Saturno', emoji: '🌐', rarity: 'commune', category: 'Calisthenics', set: 'base' },
  { id: 'b10', name: 'Calisthenicmovement', emoji: '📐', rarity: 'commune', category: 'Calisthenics', set: 'base' },
  // Sport
  { id: 'b11', name: 'Cristiano Ronaldo', emoji: '⚽', rarity: 'legendaire', category: 'Football', set: 'base' },
  { id: 'b12', name: 'Kylian Mbappé', emoji: '⚡', rarity: 'epique', category: 'Football', set: 'base' },
  { id: 'b13', name: 'LeBron James', emoji: '🏀', rarity: 'epique', category: 'Basketball', set: 'base' },
  { id: 'b14', name: 'Usain Bolt', emoji: '🏃', rarity: 'rare', category: 'Athlétisme', set: 'base' },
  { id: 'b15', name: 'Teddy Riner', emoji: '🥋', rarity: 'rare', category: 'Judo', set: 'base' },
  { id: 'b16', name: 'David Goggins', emoji: '🪖', rarity: 'rare', category: 'Endurance', set: 'base' },
  { id: 'b17', name: 'Tibo InShape', emoji: '🇫🇷', rarity: 'commune', category: 'Fitness', set: 'base' },
  { id: 'b18', name: 'Jujimufu', emoji: '🤡', rarity: 'commune', category: 'Tricking', set: 'base' },
  // Légendes
  { id: 'b19', name: 'Bruce Lee', emoji: '🐉', rarity: 'historique', category: 'Arts martiaux', set: 'base' },
  { id: 'b20', name: 'Muhammad Ali', emoji: '🥊', rarity: 'historique', category: 'Boxe', set: 'base' },
  { id: 'b21', name: 'Arnold Schwarzenegger', emoji: '🏋️', rarity: 'legendaire', category: 'Bodybuilding', set: 'base' },
  { id: 'b22', name: 'Mike Tyson', emoji: '🥊', rarity: 'epique', category: 'Boxe', set: 'base' },
  { id: 'b23', name: 'Michael Jordan', emoji: '🐐', rarity: 'legendaire', category: 'Basketball', set: 'base' },
  { id: 'b24', name: 'Zinédine Zidane', emoji: '🇫🇷', rarity: 'epique', category: 'Football', set: 'base' },
  { id: 'b25', name: 'Conor McGregor', emoji: '🤜', rarity: 'rare', category: 'MMA', set: 'base' },
];

// ── Pass 1 : Personnes Problématiques ──

const PASS1_CARDS: Card[] = [
  // Macron + variantes
  { id: 'p1-macron', name: 'Macron', emoji: '🇫🇷', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 'p1-macron-forsure', name: 'Macron', subtitle: 'For Sure', emoji: '🎤', rarity: 'rare', category: 'Politique', set: 'pass-1', baseCardId: 'p1-macron' },
  { id: 'p1-macron-jetski', name: 'Macron', subtitle: 'Jet-Ski', emoji: '🚤', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-macron' },
  { id: 'p1-macron-gilet', name: 'Macron', subtitle: 'Gilet Jaune', emoji: '🟡', rarity: 'legendaire', category: 'Politique', set: 'pass-1', baseCardId: 'p1-macron' },

  // Trump + variantes
  { id: 'p1-trump', name: 'Trump', emoji: '🍊', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 'p1-trump-covfefe', name: 'Trump', subtitle: 'Covfefe', emoji: '☕', rarity: 'rare', category: 'Politique', set: 'pass-1', baseCardId: 'p1-trump' },
  { id: 'p1-trump-wall', name: 'Trump', subtitle: 'The Wall', emoji: '🧱', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-trump' },

  // Elon Musk + variantes
  { id: 'p1-elon', name: 'Elon Musk', emoji: '🚀', rarity: 'rare', category: 'Tech', set: 'pass-1' },
  { id: 'p1-elon-x', name: 'Elon Musk', subtitle: 'X Æ A-12', emoji: '🤖', rarity: 'epique', category: 'Tech', set: 'pass-1', baseCardId: 'p1-elon' },
  { id: 'p1-elon-mars', name: 'Elon Musk', subtitle: 'To Mars', emoji: '🪐', rarity: 'legendaire', category: 'Tech', set: 'pass-1', baseCardId: 'p1-elon' },

  // Kanye + variantes
  { id: 'p1-kanye', name: 'Kanye West', emoji: '🎵', rarity: 'rare', category: 'Musique', set: 'pass-1' },
  { id: 'p1-kanye-ye', name: 'Kanye West', subtitle: 'Ye', emoji: '⛷️', rarity: 'epique', category: 'Musique', set: 'pass-1', baseCardId: 'p1-kanye' },
  { id: 'p1-kanye-god', name: 'Kanye West', subtitle: 'God Mode', emoji: '😇', rarity: 'legendaire', category: 'Musique', set: 'pass-1', baseCardId: 'p1-kanye' },

  // Poutine + variantes
  { id: 'p1-poutine', name: 'Poutine', emoji: '🐻', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 'p1-poutine-tsar', name: 'Poutine', subtitle: 'Tsar', emoji: '👑', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-poutine' },
  { id: 'p1-poutine-shirt', name: 'Poutine', subtitle: 'Shirtless', emoji: '🐴', rarity: 'historique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-poutine' },

  // Diddy + variante
  { id: 'p1-diddy', name: 'Diddy', emoji: '🕺', rarity: 'rare', category: 'Musique', set: 'pass-1' },
  { id: 'p1-diddy-freak', name: 'Diddy', subtitle: 'Freak Off', emoji: '🔒', rarity: 'legendaire', category: 'Musique', set: 'pass-1', baseCardId: 'p1-diddy' },

  // Andrew Tate + variante
  { id: 'p1-tate', name: 'Andrew Tate', emoji: '🚗', rarity: 'commune', category: 'Internet', set: 'pass-1' },
  { id: 'p1-tate-topg', name: 'Andrew Tate', subtitle: 'Top G', emoji: '💎', rarity: 'rare', category: 'Internet', set: 'pass-1', baseCardId: 'p1-tate' },

  // Balkany + variante
  { id: 'p1-balkany', name: 'Balkany', emoji: '💰', rarity: 'commune', category: 'Politique', set: 'pass-1' },
  { id: 'p1-balkany-fisc', name: 'Balkany', subtitle: 'Évasion Fiscale', emoji: '🏝️', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-balkany' },

  // Hanouna + variante
  { id: 'p1-hanouna', name: 'Hanouna', emoji: '📺', rarity: 'commune', category: 'TV', set: 'pass-1' },
  { id: 'p1-hanouna-tpmp', name: 'Hanouna', subtitle: 'TPMP', emoji: '🎪', rarity: 'rare', category: 'TV', set: 'pass-1', baseCardId: 'p1-hanouna' },

  // Kim Jong-un + variante
  { id: 'p1-kim', name: 'Kim Jong-un', emoji: '🚀', rarity: 'rare', category: 'Politique', set: 'pass-1' },
  { id: 'p1-kim-rocket', name: 'Kim Jong-un', subtitle: 'Rocket Man', emoji: '🎆', rarity: 'epique', category: 'Politique', set: 'pass-1', baseCardId: 'p1-kim' },
];

// ── Tout ──

export const ALL_CARDS: Card[] = [...BASE_CARDS, ...PASS1_CARDS];

export function getCardsBySet(setId: string): Card[] {
  return ALL_CARDS.filter((c) => c.set === setId);
}

export function getBaseCards(): Card[] {
  return BASE_CARDS;
}

export function getCardVariants(baseCardId: string): Card[] {
  return ALL_CARDS.filter((c) => c.baseCardId === baseCardId);
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
  commune: 45,
  rare: 30,
  epique: 16,
  legendaire: 7,
  historique: 2,
};

export function rollCard(
  pool: Card[],
  _ownedCards: Record<string, number>,
): Card | null {
  if (pool.length === 0) return null;

  const available = pool;

  const weighted: Card[] = [];
  for (const card of available) {
    const w = RARITY_WEIGHTS[card.rarity] || 1;
    for (let i = 0; i < w; i++) weighted.push(card);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
