import type { Season, PassLevel, Quest, Session } from '../types';

// ── Quêtes personnalisées basées sur l'activité ──

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

function getWeekNumber(): number {
  const monday = getWeekStart();
  const ref = new Date(2026, 0, 5).getTime();
  return Math.floor((monday - ref) / (7 * 24 * 60 * 60 * 1000));
}

const STARTER_QUESTS: Quest[] = [
  { id: '', label: 'Première séance', description: 'Fais 1 séance cette semaine', target: 1, type: 'sessions', xp: 50 },
  { id: '', label: 'En route', description: 'Fais 2 séances cette semaine', target: 2, type: 'sessions', xp: 100 },
  { id: '', label: 'Starter', description: 'Fais 50 reps cette semaine', target: 50, type: 'reps', xp: 50 },
  { id: '', label: '30 minutes', description: 'Entraîne-toi 30 min au total', target: 1800, type: 'duration', xp: 75 },
  { id: '', label: 'Curieux', description: 'Fais 3 exercices différents', target: 3, type: 'exercises', xp: 75 },
  { id: '', label: 'Première série', description: 'Complète 10 séries', target: 10, type: 'sets', xp: 50 },
];

export function generateWeeklyQuests(prevWeekSessions: Session[]): Quest[] {
  const week = getWeekNumber();
  const quests: Quest[] = [];

  if (prevWeekSessions.length === 0) {
    return STARTER_QUESTS.map((q, i) => ({ ...q, id: `w${week}-starter-${i}` }));
  }

  const stats = analyzeLastWeek(prevWeekSessions);

  // ── Quêtes de base (toujours présentes) ──

  // Durée : min 30 min, boost doux, plafond 1h30
  const totalDuration = prevWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const durTarget = Math.min(5400, Math.max(1800, roundTarget(Math.ceil(totalDuration * BOOST))));
  quests.push({
    id: `w${week}-duration`,
    label: 'Endurance',
    description: `Entraîne-toi ${formatMin(durTarget)} au total`,
    target: durTarget,
    type: 'duration',
    xp: xpForTarget(Math.round(durTarget / 60)),
  });

  // Séances : min 2, plafond 7
  const totalSessions = prevWeekSessions.length;
  const sessionTarget = Math.min(7, Math.max(2, Math.ceil(totalSessions * BOOST)));
  quests.push({
    id: `w${week}-sessions`,
    label: 'Régularité',
    description: `Fais ${sessionTarget} séances cette semaine`,
    target: sessionTarget,
    type: 'sessions',
    xp: xpForTarget(sessionTarget * 30),
  });

  // Séries : min 15, plafond 80
  const totalSets = prevWeekSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((eSum, ex) => eSum + ex.sets.filter((set) => set.completed).length, 0), 0
  );
  const setsTarget = Math.min(80, Math.max(15, roundTarget(Math.ceil(totalSets * BOOST))));
  quests.push({
    id: `w${week}-sets`,
    label: 'Séries',
    description: `Complète ${setsTarget} séries`,
    target: setsTarget,
    type: 'sets',
    xp: xpForTarget(setsTarget),
  });

  // Reps totales : plafond 600
  const totalReps = stats.reduce((sum, s) => sum + s.totalReps, 0);
  if (totalReps > 0) {
    const repsTarget = Math.min(600, roundTarget(Math.ceil(totalReps * BOOST)));
    quests.push({
      id: `w${week}-reps`,
      label: 'Volume',
      description: `Fais ${repsTarget} reps au total`,
      target: repsTarget,
      type: 'reps',
      xp: xpForTarget(repsTarget),
    });
  }

  // ── Quêtes perso par exercice (top 3 max, plafonds raisonnables) ──

  const strengthExos = stats.filter((s) => s.category !== 'running' && s.bestSessionReps > 0).sort((a, b) => b.bestSessionReps - a.bestSessionReps);
  const runningExos = stats.filter((s) => s.category === 'running' && s.bestSessionDuration > 0).sort((a, b) => b.bestSessionDuration - a.bestSessionDuration);

  for (const exo of strengthExos.slice(0, 3)) {
    const raw = Math.ceil(exo.bestSessionReps * BOOST);
    const target = Math.min(150, roundTarget(raw));
    quests.push({
      id: `w${week}-exo-${exo.exerciseId}`,
      label: exo.exerciseName,
      description: `Fais ${target} ${exo.exerciseName.toLowerCase()} en une séance`,
      target,
      type: 'exercise_reps',
      xp: xpForTarget(target),
      exerciseId: exo.exerciseId,
      exerciseName: exo.exerciseName,
    });
  }

  for (const exo of runningExos.slice(0, 1)) {
    const raw = Math.ceil(exo.bestSessionDuration * BOOST);
    const target = Math.min(3600, roundTarget(raw));
    quests.push({
      id: `w${week}-exo-${exo.exerciseId}`,
      label: exo.exerciseName,
      description: `Cours ${formatMin(target)} de ${exo.exerciseName.toLowerCase()} en une séance`,
      target,
      type: 'exercise_duration',
      xp: xpForTarget(Math.round(target / 60)),
      exerciseId: exo.exerciseId,
      exerciseName: exo.exerciseName,
    });
  }

  return quests;
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
