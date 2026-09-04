import type { Season, PassLevel, Quest } from '../types';

const PASS1_QUESTS: Quest[] = [
  { id: 'p1q1', label: 'Régulier', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions' },
  { id: 'p1q2', label: 'Bosseur', description: 'Fais 500 reps cette semaine', target: 500, type: 'reps' },
  { id: 'p1q3', label: 'Endurant', description: 'Entraîne-toi 60 min au total', target: 3600, type: 'duration' },
  { id: 'p1q4', label: 'Touche-à-tout', description: 'Fais 5 exercices différents', target: 5, type: 'exercises' },
  { id: 'p1q5', label: 'Machine', description: 'Complète 30 séries', target: 30, type: 'sets' },
  { id: 'p1q6', label: 'Cindy Master', description: 'Fais 1 AMRAP cette semaine', target: 1, type: 'amrap', premiumOnly: true },
  { id: 'p1q7', label: 'No Rest Day', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', premiumOnly: true },
  { id: 'p1q8', label: 'Monstre', description: 'Fais 1000 reps cette semaine', target: 1000, type: 'reps', premiumOnly: true },
];

function buildLevels(): PassLevel[] {
  const levels: PassLevel[] = [];
  for (let i = 1; i <= 30; i++) {
    const lvl: PassLevel = { level: i, xpRequired: i * 100 };
    if (i % 3 === 0) lvl.freeChest = i <= 10 ? 'commune' : i <= 20 ? 'rare' : 'epique';
    if (i === 10) lvl.freeChest = 'epique';
    if (i === 20) lvl.freeChest = 'legendaire';
    if (i === 30) lvl.freeChest = 'historique';
    if (i % 2 === 0) lvl.premiumChest = i <= 10 ? 'rare' : i <= 20 ? 'epique' : 'legendaire';
    if (i === 15) lvl.premiumChest = 'legendaire';
    if (i === 25) lvl.premiumChest = 'historique';
    if (i === 30) lvl.premiumChest = 'historique';
    levels.push(lvl);
  }
  return levels;
}

// Pass 1 commence le 1er octobre 2026, dure 90 jours
const PASS1_START = new Date(2026, 9, 1).getTime();
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export const SEASONS: Season[] = [
  {
    id: 'pass-1',
    name: 'Saison 1',
    theme: 'Personnes Problématiques',
    startDate: PASS1_START,
    endDate: PASS1_START + NINETY_DAYS,
    passLevels: buildLevels(),
    quests: PASS1_QUESTS,
  },
];

export const XP_PER_QUEST = 100;

export function getCurrentSeason(): Season | null {
  const now = Date.now();
  return SEASONS.find((s) => now >= s.startDate && now < s.endDate) || null;
}

export function getSeasonById(id: string): Season | undefined {
  return SEASONS.find((s) => s.id === id);
}

export function getSeasonTimeLeft(season: Season): { days: number; hours: number } {
  const remaining = Math.max(0, season.endDate - Date.now());
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { days, hours };
}

export function getLevelFromXp(totalXp: number, levels: PassLevel[]): { level: number; currentLevelXp: number; xpForNext: number } {
  let remaining = totalXp;
  for (let i = 0; i < levels.length; i++) {
    const needed = levels[i].xpRequired;
    if (remaining < needed) {
      return { level: i, currentLevelXp: remaining, xpForNext: needed };
    }
    remaining -= needed;
  }
  return { level: levels.length, currentLevelXp: 0, xpForNext: 0 };
}

export function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  return monday.getTime();
}
