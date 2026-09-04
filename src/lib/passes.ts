import type { Season, PassLevel, Quest } from '../types';

// ── Pool de quêtes — on pioche dedans chaque semaine ──

interface QuestTemplate {
  label: string;
  description: string;
  target: number;
  type: Quest['type'];
  xp: number;
}

const EASY_QUESTS: QuestTemplate[] = [
  { label: 'Échauffement', description: 'Fais 1 séance cette semaine', target: 1, type: 'sessions', xp: 50 },
  { label: 'Starter', description: 'Fais 100 reps cette semaine', target: 100, type: 'reps', xp: 50 },
  { label: 'Petit tour', description: 'Entraîne-toi 15 min au total', target: 900, type: 'duration', xp: 50 },
  { label: 'Première série', description: 'Complète 10 séries', target: 10, type: 'sets', xp: 50 },
  { label: 'Curieux', description: 'Fais 3 exercices différents', target: 3, type: 'exercises', xp: 50 },
  { label: 'Mise en jambes', description: 'Fais 2 séances cette semaine', target: 2, type: 'sessions', xp: 50 },
  { label: 'Reps tranquilles', description: 'Fais 150 reps cette semaine', target: 150, type: 'reps', xp: 50 },
];

const MEDIUM_QUESTS: QuestTemplate[] = [
  { label: 'Régulier', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 100 },
  { label: 'Touche-à-tout', description: 'Fais 5 exercices différents', target: 5, type: 'exercises', xp: 100 },
  { label: 'Endurant', description: 'Entraîne-toi 45 min au total', target: 2700, type: 'duration', xp: 100 },
  { label: 'Sérieux', description: 'Complète 25 séries', target: 25, type: 'sets', xp: 100 },
  { label: 'Cadencé', description: 'Fais 300 reps cette semaine', target: 300, type: 'reps', xp: 100 },
  { label: 'Assidu', description: 'Fais 4 séances cette semaine', target: 4, type: 'sessions', xp: 100 },
  { label: 'Polyvalent', description: 'Fais 7 exercices différents', target: 7, type: 'exercises', xp: 100 },
  { label: 'Tiens bon', description: 'Entraîne-toi 1h au total', target: 3600, type: 'duration', xp: 100 },
];

const HARD_QUESTS: QuestTemplate[] = [
  { label: 'Machine', description: 'Complète 40 séries', target: 40, type: 'sets', xp: 200 },
  { label: 'No Rest Day', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', xp: 200 },
  { label: 'Bosseur', description: 'Fais 500 reps cette semaine', target: 500, type: 'reps', xp: 200 },
  { label: 'Acharné', description: 'Entraîne-toi 1h30 au total', target: 5400, type: 'duration', xp: 200 },
  { label: 'Soldat', description: 'Complète 50 séries', target: 50, type: 'sets', xp: 200 },
  { label: 'Explorateur', description: 'Fais 10 exercices différents', target: 10, type: 'exercises', xp: 200 },
  { label: 'Bulldozer', description: 'Fais 700 reps cette semaine', target: 700, type: 'reps', xp: 200 },
];

const EXTREME_QUESTS: QuestTemplate[] = [
  { label: 'Monstre', description: 'Fais 1000 reps cette semaine', target: 1000, type: 'reps', xp: 350 },
  { label: 'Marathonien', description: 'Entraîne-toi 2h au total', target: 7200, type: 'duration', xp: 350 },
  { label: 'Inhumain', description: 'Complète 70 séries', target: 70, type: 'sets', xp: 350 },
  { label: 'Obsédé', description: 'Fais 6 séances cette semaine', target: 6, type: 'sessions', xp: 350 },
  { label: 'Titan', description: 'Fais 1500 reps cette semaine', target: 1500, type: 'reps', xp: 350 },
  { label: 'Ironman', description: 'Entraîne-toi 3h au total', target: 10800, type: 'duration', xp: 350 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(2026, 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export function getWeeklyQuests(): Quest[] {
  const week = getWeekNumber();
  const rng = seededRandom(week * 7919);

  const easy = pickN(EASY_QUESTS, 2, rng);
  const medium = pickN(MEDIUM_QUESTS, 3, rng);
  const hard = pickN(HARD_QUESTS, 3, rng);
  const extreme = pickN(EXTREME_QUESTS, 2, rng);

  const all = [...easy, ...medium, ...hard, ...extreme];

  return all.map((q, i) => ({
    id: `w${week}-q${i}`,
    label: q.label,
    description: q.description,
    target: q.target,
    type: q.type,
    xp: q.xp,
  }));
}

// ── Levels ──

function buildLevels(): PassLevel[] {
  const levels: PassLevel[] = [];
  for (let i = 1; i <= 30; i++) {
    const lvl: PassLevel = { level: i, xpRequired: i >= 25 ? 400 : 200 };
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
    quests: [],
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
