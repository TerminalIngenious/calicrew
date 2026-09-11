import type { Season, PassLevel, Quest, SportType, Session } from '../types';

// ── Ancien système de quêtes (fallback) ──

const BOOST = 1.2;

function xpForTarget(target: number): number {
  if (target < 50) return 50;
  if (target < 200) return 100;
  if (target < 500) return 200;
  return 350;
}

function roundTarget(n: number): number {
  if (n < 20) return Math.ceil(n / 5) * 5;
  if (n < 100) return Math.ceil(n / 10) * 10;
  return Math.ceil(n / 25) * 25;
}

function formatMin(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 > 0 ? String(m % 60).padStart(2, '0') : ''}`;
  return `${m} min`;
}

interface ExoStat {
  exerciseId: string;
  exerciseName: string;
  category: string;
  totalReps: number;
  bestSessionReps: number;
  totalDuration: number;
  bestSessionDuration: number;
}

function analyzeLastWeek(prevSessions: Session[]): ExoStat[] {
  const map = new Map<string, ExoStat>();
  const normalSessions = prevSessions.filter((s) => s.mode !== 'amrap');
  for (const s of normalSessions) {
    for (const ex of s.exercises) {
      const id = ex.exerciseId;
      const existing = map.get(id) || { exerciseId: id, exerciseName: ex.exerciseName, category: ex.exerciseCategory || '', totalReps: 0, bestSessionReps: 0, totalDuration: 0, bestSessionDuration: 0 };
      const sessionReps = ex.sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0);
      existing.totalReps += sessionReps;
      existing.bestSessionReps = Math.max(existing.bestSessionReps, sessionReps);
      const sessionDur = ex.runDuration || 0;
      existing.totalDuration += sessionDur;
      existing.bestSessionDuration = Math.max(existing.bestSessionDuration, sessionDur);
      map.set(id, existing);
    }
  }
  return [...map.values()];
}

const STARTER_QUESTS: Quest[] = [
  { id: '', label: 'Première séance', description: 'Fais 1 séance cette semaine', target: 1, type: 'sessions', xp: 50 },
  { id: '', label: 'En route', description: 'Fais 2 séances cette semaine', target: 2, type: 'sessions', xp: 100 },
  { id: '', label: 'Starter', description: 'Fais 50 reps cette semaine', target: 50, type: 'reps', xp: 50 },
  { id: '', label: '30 minutes', description: 'Entraîne-toi 30 min au total', target: 1800, type: 'duration', xp: 75 },
  { id: '', label: 'Curieux', description: 'Fais 3 exercices différents', target: 3, type: 'exercises', xp: 75 },
  { id: '', label: 'Première série', description: 'Complète 10 séries', target: 10, type: 'sets', xp: 50 },
];

function legacyBaseQuests(week: number): Quest[] {
  return [
    { id: `w${week}-base-sessions`, label: '3 séances', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 75 },
    { id: `w${week}-base-duration`, label: '30 minutes', description: 'Entraîne-toi 30 min au total', target: 1800, type: 'duration', xp: 75 },
    { id: `w${week}-base-sets`, label: '15 séries', description: 'Complète 15 séries cette semaine', target: 15, type: 'sets', xp: 50 },
  ];
}

export function generateWeeklyQuests(prevWeekSessions: Session[]): Quest[] {
  const week = getWeekNumber();
  const quests: Quest[] = [...legacyBaseQuests(week)];

  if (prevWeekSessions.length === 0) {
    return STARTER_QUESTS.map((q, i) => ({ ...q, id: `w${week}-starter-${i}` }));
  }

  const stats = analyzeLastWeek(prevWeekSessions);

  const totalDuration = prevWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalDuration > 1800) {
    const durTarget = Math.min(5400, roundTarget(Math.ceil(totalDuration * BOOST)));
    quests.push({ id: `w${week}-duration`, label: 'Endurance', description: `Entraîne-toi ${formatMin(durTarget)} au total`, target: durTarget, type: 'duration', xp: xpForTarget(Math.round(durTarget / 60)) });
  }

  const totalSessions = prevWeekSessions.length;
  if (totalSessions > 3) {
    const sessionTarget = Math.min(7, Math.ceil(totalSessions * BOOST));
    quests.push({ id: `w${week}-sessions`, label: 'Régularité', description: `Fais ${sessionTarget} séances cette semaine`, target: sessionTarget, type: 'sessions', xp: xpForTarget(sessionTarget * 30) });
  }

  const totalSets = prevWeekSessions.reduce((sum, s) => sum + s.exercises.reduce((eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0), 0);
  if (totalSets > 15) {
    const setsTarget = Math.min(80, roundTarget(Math.ceil(totalSets * BOOST)));
    quests.push({ id: `w${week}-sets`, label: 'Séries+', description: `Complète ${setsTarget} séries`, target: setsTarget, type: 'sets', xp: xpForTarget(setsTarget) });
  }

  const exerciseVariety = stats.length;
  if (exerciseVariety >= 3) {
    const varTarget = Math.ceil(exerciseVariety * BOOST);
    quests.push({ id: `w${week}-variety`, label: 'Polyvalent', description: `Fais ${varTarget} exercices différents`, target: varTarget, type: 'exercises', xp: 100 });
  }

  const totalReps = stats.reduce((sum, s) => sum + s.totalReps, 0);
  if (totalReps > 0) {
    const repsTarget = Math.min(600, roundTarget(Math.ceil(totalReps * BOOST)));
    quests.push({ id: `w${week}-reps`, label: 'Volume', description: `Fais ${repsTarget} reps au total`, target: repsTarget, type: 'reps', xp: xpForTarget(repsTarget) });
  }

  const amrapSessions = prevWeekSessions.filter((s) => s.mode === 'amrap');
  if (amrapSessions.length > 0) {
    const amrapTarget = Math.min(2, Math.max(1, Math.ceil(amrapSessions.length * BOOST)));
    quests.push({ id: `w${week}-amrap`, label: 'Cindy', description: `Fais ${amrapTarget} Cindy cette semaine`, target: amrapTarget, type: 'amrap', xp: 100 });
  }

  const strengthExos = stats.filter((s) => s.category !== 'running' && s.bestSessionReps > 0).sort((a, b) => b.bestSessionReps - a.bestSessionReps);
  const runningExos = stats.filter((s) => s.category === 'running' && s.bestSessionDuration > 0).sort((a, b) => b.bestSessionDuration - a.bestSessionDuration);

  for (const exo of strengthExos.slice(0, 3)) {
    const raw = Math.ceil(exo.bestSessionReps * BOOST);
    const target = Math.min(150, roundTarget(raw));
    quests.push({ id: `w${week}-exo-${exo.exerciseId}`, label: exo.exerciseName, description: `Fais ${target} ${exo.exerciseName.toLowerCase()} en une séance`, target, type: 'exercise_reps', xp: xpForTarget(target), exerciseId: exo.exerciseId, exerciseName: exo.exerciseName });
  }

  for (const exo of runningExos.slice(0, 1)) {
    const raw = Math.ceil(exo.bestSessionDuration * BOOST);
    const target = Math.min(3600, roundTarget(raw));
    quests.push({ id: `w${week}-exo-${exo.exerciseId}`, label: exo.exerciseName, description: `Cours ${formatMin(target)} de ${exo.exerciseName.toLowerCase()} en une séance`, target, type: 'exercise_duration', xp: xpForTarget(Math.round(target / 60)), exerciseId: exo.exerciseId, exerciseName: exo.exerciseName });
  }

  return quests;
}

// ── Nouveau système de quêtes (choix le lundi) ──

function getWeekNumber(): number {
  const monday = getWeekStart();
  const ref = new Date(2026, 0, 5).getTime();
  return Math.floor((monday - ref) / (7 * 24 * 60 * 60 * 1000));
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const SPORT_LABELS: Record<SportType, string> = {
  calisthenics: 'Calisthenics',
  musculation: 'Musculation',
  running: 'Running',
};

export function getPermanentQuests(): Quest[] {
  const week = getWeekNumber();
  return [
    { id: `w${week}-perm-sessions`, label: '3 séances', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 75 },
    { id: `w${week}-perm-duration`, label: '30 minutes', description: 'Entraîne-toi 30 min au total', target: 1800, type: 'duration', xp: 75 },
  ];
}

const GENERAL_POOL: Omit<Quest, 'id'>[] = [
  { label: '150 reps', description: 'Fais 150 reps au total', target: 150, type: 'reps', xp: 75 },
  { label: '200 reps', description: 'Fais 200 reps au total', target: 200, type: 'reps', xp: 100 },
  { label: '250 reps', description: 'Fais 250 reps au total', target: 250, type: 'reps', xp: 125 },
  { label: '20 séries', description: 'Complète 20 séries', target: 20, type: 'sets', xp: 75 },
  { label: '30 séries', description: 'Complète 30 séries', target: 30, type: 'sets', xp: 100 },
  { label: 'Polyvalent', description: 'Fais 5 exercices différents', target: 5, type: 'exercises', xp: 75 },
  { label: 'Explorateur', description: 'Fais 7 exercices différents', target: 7, type: 'exercises', xp: 100 },
  { label: '45 minutes', description: 'Entraîne-toi 45 min au total', target: 2700, type: 'duration', xp: 100 },
  { label: '1 heure', description: 'Entraîne-toi 1h au total', target: 3600, type: 'duration', xp: 125 },
  { label: '4 séances', description: 'Fais 4 séances cette semaine', target: 4, type: 'sessions', xp: 100 },
  { label: '5 séances', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', xp: 125 },
];

const CALISTHENICS_POOL: Omit<Quest, 'id'>[] = [
  { label: 'Tractions', description: 'Fais 50 tractions au total', target: 50, type: 'exercise_reps', xp: 100, exerciseId: 'pull-ups', exerciseName: 'Tractions' },
  { label: 'Dips', description: 'Fais 60 dips au total', target: 60, type: 'exercise_reps', xp: 100, exerciseId: 'dips', exerciseName: 'Dips' },
  { label: 'Pompes', description: 'Fais 80 pompes au total', target: 80, type: 'exercise_reps', xp: 100, exerciseId: 'push-ups', exerciseName: 'Pompes' },
  { label: 'Pompes diamant', description: 'Fais 30 pompes diamant', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'diamond-push-ups', exerciseName: 'Pompes diamant' },
  { label: 'HSPU', description: 'Fais 15 HSPU au total', target: 15, type: 'exercise_reps', xp: 100, exerciseId: 'handstand-push-ups', exerciseName: 'HSPU' },
  { label: 'Chin-ups', description: 'Fais 30 chin-ups au total', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'chin-ups', exerciseName: 'Chin-ups' },
  { label: 'Muscle-ups', description: 'Fais 10 muscle-ups au total', target: 10, type: 'exercise_reps', xp: 125, exerciseId: 'muscle-ups', exerciseName: 'Muscle-ups' },
  { label: 'Rowings australiens', description: 'Fais 40 rowings australiens', target: 40, type: 'exercise_reps', xp: 75, exerciseId: 'australian-rows', exerciseName: 'Rowings australiens' },
  { label: 'Pistol squats', description: 'Fais 20 pistol squats', target: 20, type: 'exercise_reps', xp: 100, exerciseId: 'pistol-squats', exerciseName: 'Pistol squats' },
  { label: 'Relevés de jambes', description: 'Fais 30 relevés de jambes', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'leg-raises', exerciseName: 'Relevés de jambes' },
  { label: 'Dragon flags', description: 'Fais 10 dragon flags', target: 10, type: 'exercise_reps', xp: 100, exerciseId: 'dragon-flags', exerciseName: 'Dragon flags' },
  { label: 'L-sit', description: 'Fais 15 L-sit', target: 15, type: 'exercise_reps', xp: 75, exerciseId: 'l-sit', exerciseName: 'L-sit' },
  { label: 'Pike push-ups', description: 'Fais 30 pike push-ups', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'pike-push-ups', exerciseName: 'Pike push-ups' },
  { label: 'Cindy', description: 'Fais 1 AMRAP Cindy cette semaine', target: 1, type: 'amrap', xp: 100 },
];

const MUSCULATION_POOL: Omit<Quest, 'id'>[] = [
  { label: 'Développé couché', description: 'Fais 30 développé couché', target: 30, type: 'exercise_reps', xp: 100, exerciseId: 'developpe-couche', exerciseName: 'Développé couché' },
  { label: 'Développé incliné', description: 'Fais 30 développé incliné', target: 30, type: 'exercise_reps', xp: 100, exerciseId: 'developpe-incline', exerciseName: 'Développé incliné' },
  { label: 'Développé militaire', description: 'Fais 25 développé militaire', target: 25, type: 'exercise_reps', xp: 100, exerciseId: 'developpe-militaire', exerciseName: 'Développé militaire' },
  { label: 'Squats', description: 'Fais 40 squats', target: 40, type: 'exercise_reps', xp: 75, exerciseId: 'squats', exerciseName: 'Squats' },
  { label: 'Soulevé de terre', description: 'Fais 20 soulevé de terre', target: 20, type: 'exercise_reps', xp: 100, exerciseId: 'souleve-de-terre', exerciseName: 'Soulevé de terre' },
  { label: 'Soulevé de terre roumain', description: 'Fais 20 soulevé de terre roumain', target: 20, type: 'exercise_reps', xp: 100, exerciseId: 'souleve-de-terre-roumain', exerciseName: 'Soulevé de terre roumain' },
  { label: 'Hip thrust', description: 'Fais 25 hip thrust', target: 25, type: 'exercise_reps', xp: 75, exerciseId: 'hip-thrust', exerciseName: 'Hip thrust' },
  { label: 'Rowing barre', description: 'Fais 30 rowing barre', target: 30, type: 'exercise_reps', xp: 100, exerciseId: 'rowing-barre', exerciseName: 'Rowing barre' },
  { label: 'Rowing haltère', description: 'Fais 30 rowing haltère', target: 30, type: 'exercise_reps', xp: 100, exerciseId: 'rowing-haltere', exerciseName: 'Rowing haltère' },
  { label: 'Curl biceps', description: 'Fais 30 curl biceps', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'curl-biceps', exerciseName: 'Curl biceps' },
  { label: 'Curl marteau', description: 'Fais 25 curl marteau', target: 25, type: 'exercise_reps', xp: 75, exerciseId: 'curl-marteau', exerciseName: 'Curl marteau' },
  { label: 'Élévations latérales', description: 'Fais 30 élévations latérales', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'elevations-laterales', exerciseName: 'Élévations latérales' },
  { label: 'Barre au front', description: 'Fais 20 barre au front', target: 20, type: 'exercise_reps', xp: 75, exerciseId: 'barre-au-front', exerciseName: 'Barre au front' },
  { label: 'Extension triceps', description: 'Fais 25 extension triceps', target: 25, type: 'exercise_reps', xp: 75, exerciseId: 'extension-triceps', exerciseName: 'Extension triceps' },
  { label: 'Shrugs', description: 'Fais 30 shrugs', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'shrugs', exerciseName: 'Shrugs' },
  { label: 'Fentes', description: 'Fais 30 fentes', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'lunges', exerciseName: 'Fentes' },
  { label: 'Mollets debout', description: 'Fais 40 mollets debout', target: 40, type: 'exercise_reps', xp: 75, exerciseId: 'calf-raises', exerciseName: 'Mollets debout' },
];

const RUNNING_POOL: Omit<Quest, 'id'>[] = [
  { label: '20 min de course', description: 'Cours 20 min au total', target: 1200, type: 'running_duration', xp: 75 },
  { label: '30 min de course', description: 'Cours 30 min au total', target: 1800, type: 'running_duration', xp: 100 },
  { label: '45 min de course', description: 'Cours 45 min au total', target: 2700, type: 'running_duration', xp: 125 },
  { label: '1h de course', description: 'Cours 1h au total', target: 3600, type: 'running_duration', xp: 150 },
  { label: '2 runs', description: 'Fais 2 séances de running', target: 2, type: 'running_sessions', xp: 75 },
  { label: '3 runs', description: 'Fais 3 séances de running', target: 3, type: 'running_sessions', xp: 100 },
  { label: 'Sprint', description: 'Fais 15 min de sprint', target: 900, type: 'exercise_duration', xp: 100, exerciseId: 'sprint', exerciseName: 'Sprint' },
  { label: 'Fractionné', description: 'Fais 20 min de fractionné', target: 1200, type: 'exercise_duration', xp: 100, exerciseId: 'interval-run', exerciseName: 'Fractionné' },
  { label: 'Course en côte', description: 'Fais 15 min de course en côte', target: 900, type: 'exercise_duration', xp: 100, exerciseId: 'hill-run', exerciseName: 'Course en côte' },
  { label: 'Tempo run', description: 'Fais 20 min de tempo run', target: 1200, type: 'exercise_duration', xp: 100, exerciseId: 'tempo-run', exerciseName: 'Tempo run' },
  { label: 'Marche rapide', description: 'Fais 30 min de marche rapide', target: 1800, type: 'exercise_duration', xp: 75, exerciseId: 'fast-walk', exerciseName: 'Marche rapide' },
];

const SPORT_POOLS: Record<SportType, Omit<Quest, 'id'>[]> = {
  calisthenics: CALISTHENICS_POOL,
  musculation: MUSCULATION_POOL,
  running: RUNNING_POOL,
};

export function generateQuestPool(sports: SportType[]): Quest[] {
  const week = getWeekNumber();
  const seed = week * 31337;

  const sportQuests: Omit<Quest, 'id'>[] = [];
  const perSport = Math.floor(14 / sports.length);
  const remainder = 14 - perSport * sports.length;

  for (let i = 0; i < sports.length; i++) {
    const pool = seededShuffle(SPORT_POOLS[sports[i]], seed + i);
    const count = perSport + (i < remainder ? 1 : 0);
    sportQuests.push(...pool.slice(0, count));
  }

  const generalCount = 20 - sportQuests.length;
  const generalShuffled = seededShuffle(GENERAL_POOL, seed + 99);
  const generalQuests = generalShuffled.slice(0, generalCount);

  const all = [...sportQuests, ...generalQuests];
  const shuffled = seededShuffle(all, seed + 42);

  return shuffled.map((q, i) => ({
    ...q,
    id: `w${week}-pick-${i}`,
  }));
}

// ── Levels ──

function buildLevels(): PassLevel[] {
  const levels: PassLevel[] = [];
  for (let i = 1; i <= 30; i++) {
    levels.push({
      level: i,
      xpRequired: i >= 25 ? 400 : 200,
      freeChest: i === 30 ? 'epique' : i === 15 ? 'rare' : 'commune',
    });
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
  const shifted = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const day = shifted.getDay();
  const diff = shifted.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(shifted.getFullYear(), shifted.getMonth(), diff, 10, 0, 0, 0);
  return monday.getTime();
}
