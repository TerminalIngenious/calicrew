import type { BattlePassLevel, Quest, CardRarity } from '../types';

export const QUESTS: Quest[] = [
  { id: 'q1', label: 'Régulier', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions' },
  { id: 'q2', label: 'Bosseur', description: 'Fais 500 reps cette semaine', target: 500, type: 'reps' },
  { id: 'q3', label: 'Endurant', description: 'Entraîne-toi 60 min au total', target: 3600, type: 'duration' },
  { id: 'q4', label: 'Touche-à-tout', description: 'Fais 5 exercices différents', target: 5, type: 'exercises' },
  { id: 'q5', label: 'Machine', description: 'Complète 30 séries', target: 30, type: 'sets' },
  { id: 'q6', label: 'Cindy Master', description: 'Fais 1 AMRAP cette semaine', target: 1, type: 'amrap', premiumOnly: true },
  { id: 'q7', label: 'No Rest Day', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', premiumOnly: true },
  { id: 'q8', label: 'Monstre', description: 'Fais 1000 reps cette semaine', target: 1000, type: 'reps', premiumOnly: true },
];

export const XP_PER_QUEST = 100;

function chestReward(rarity: CardRarity): { type: 'chest'; rarity: CardRarity } {
  return { type: 'chest', rarity };
}

export const BATTLE_PASS_LEVELS: BattlePassLevel[] = [
  { level: 1, xpRequired: 100, freeReward: chestReward('commune') },
  { level: 2, xpRequired: 200, premiumReward: chestReward('commune') },
  { level: 3, xpRequired: 300, freeReward: chestReward('commune') },
  { level: 4, xpRequired: 400, premiumReward: chestReward('rare') },
  { level: 5, xpRequired: 500, freeReward: chestReward('rare') },
  { level: 6, xpRequired: 600, premiumReward: chestReward('commune') },
  { level: 7, xpRequired: 700, freeReward: chestReward('commune') },
  { level: 8, xpRequired: 800, premiumReward: chestReward('rare') },
  { level: 9, xpRequired: 900, freeReward: chestReward('rare') },
  { level: 10, xpRequired: 1000, freeReward: chestReward('epique'), premiumReward: chestReward('epique') },
  { level: 11, xpRequired: 1100, premiumReward: chestReward('commune') },
  { level: 12, xpRequired: 1200, freeReward: chestReward('commune') },
  { level: 13, xpRequired: 1300, premiumReward: chestReward('rare') },
  { level: 14, xpRequired: 1400, freeReward: chestReward('rare') },
  { level: 15, xpRequired: 1500, freeReward: chestReward('epique'), premiumReward: chestReward('legendaire') },
  { level: 16, xpRequired: 1600, premiumReward: chestReward('commune') },
  { level: 17, xpRequired: 1700, freeReward: chestReward('commune') },
  { level: 18, xpRequired: 1800, premiumReward: chestReward('rare') },
  { level: 19, xpRequired: 1900, freeReward: chestReward('rare') },
  { level: 20, xpRequired: 2000, freeReward: chestReward('legendaire'), premiumReward: chestReward('epique') },
  { level: 21, xpRequired: 2100, premiumReward: chestReward('commune') },
  { level: 22, xpRequired: 2200, freeReward: chestReward('commune') },
  { level: 23, xpRequired: 2300, premiumReward: chestReward('rare') },
  { level: 24, xpRequired: 2400, freeReward: chestReward('epique') },
  { level: 25, xpRequired: 2500, freeReward: chestReward('legendaire'), premiumReward: chestReward('legendaire') },
  { level: 26, xpRequired: 2600, premiumReward: chestReward('epique') },
  { level: 27, xpRequired: 2700, freeReward: chestReward('rare') },
  { level: 28, xpRequired: 2800, premiumReward: chestReward('legendaire') },
  { level: 29, xpRequired: 2900, freeReward: chestReward('epique') },
  { level: 30, xpRequired: 3000, freeReward: chestReward('historique'), premiumReward: chestReward('historique') },
];

export function getTotalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level && i < BATTLE_PASS_LEVELS.length; i++) {
    total += BATTLE_PASS_LEVELS[i].xpRequired;
  }
  return total;
}

export function getLevelFromXp(totalXp: number): { level: number; currentLevelXp: number; xpForNext: number } {
  let remaining = totalXp;
  for (let i = 0; i < BATTLE_PASS_LEVELS.length; i++) {
    const needed = BATTLE_PASS_LEVELS[i].xpRequired;
    if (remaining < needed) {
      return { level: i, currentLevelXp: remaining, xpForNext: needed };
    }
    remaining -= needed;
  }
  return { level: BATTLE_PASS_LEVELS.length, currentLevelXp: 0, xpForNext: 0 };
}

export function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  return monday.getTime();
}
