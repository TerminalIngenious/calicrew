import type { Season, PassLevel, Quest } from '../types';

const PASS1_QUESTS: Quest[] = [
  // Faciles — 50 XP
  { id: 'p1q1', label: 'Échauffement', description: 'Fais 1 séance cette semaine', target: 1, type: 'sessions', xp: 50 },
  { id: 'p1q2', label: 'Starter', description: 'Fais 100 reps cette semaine', target: 100, type: 'reps', xp: 50 },
  // Moyennes — 100 XP
  { id: 'p1q3', label: 'Régulier', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 100 },
  { id: 'p1q4', label: 'Touche-à-tout', description: 'Fais 5 exercices différents', target: 5, type: 'exercises', xp: 100 },
  { id: 'p1q5', label: 'Endurant', description: 'Entraîne-toi 45 min au total', target: 2700, type: 'duration', xp: 100 },
  // Difficiles — 200 XP
  { id: 'p1q6', label: 'Machine', description: 'Complète 40 séries', target: 40, type: 'sets', xp: 200 },
  { id: 'p1q7', label: 'No Rest Day', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', xp: 200 },
  { id: 'p1q8', label: 'Bosseur', description: 'Fais 500 reps cette semaine', target: 500, type: 'reps', xp: 200 },
  // Extrêmes — 350 XP
  { id: 'p1q9', label: 'Monstre', description: 'Fais 1000 reps cette semaine', target: 1000, type: 'reps', xp: 350 },
  { id: 'p1q10', label: 'Marathonien', description: 'Entraîne-toi 2h au total', target: 7200, type: 'duration', xp: 350 },
];

function buildLevels(): PassLevel[] {
  const levels: PassLevel[] = [];
  for (let i = 1; i <= 30; i++) {
    const lvl: PassLevel = { level: i, xpRequired: i * 100 };
    if (i % 2 === 0) lvl.freeChest = i <= 8 ? 'commune' : i <= 16 ? 'rare' : i <= 24 ? 'epique' : 'legendaire';
    if (i % 3 === 0 && !lvl.freeChest) lvl.freeChest = i <= 10 ? 'commune' : i <= 20 ? 'rare' : 'epique';
    if (i === 10) lvl.freeChest = 'epique';
    if (i === 15) lvl.freeChest = 'legendaire';
    if (i === 20) lvl.freeChest = 'legendaire';
    if (i === 25) lvl.freeChest = 'historique';
    if (i === 30) lvl.freeChest = 'historique';
    levels.push(lvl);
  }
  return levels;
}

// Pass 1 commence le 1er septembre 2026, dure 90 jours
const PASS1_START = new Date(2026, 8, 1).getTime();
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export const SEASONS: Season[] = [
  {
    id: 'pass-1',
    name: 'Saison 1',
    theme: 'Casier Judiciaire',
    startDate: PASS1_START,
    endDate: PASS1_START + NINETY_DAYS,
    passLevels: buildLevels(),
    quests: PASS1_QUESTS,
  },
];


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
