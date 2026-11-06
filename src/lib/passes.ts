import type { Season, PassLevel, Quest, SportType, CardRarity, UserProgress } from '../types';

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

/*
 * Les sports des quêtes imposées.
 *
 * Pas les trois : en y mettant la course, un tiers de la liste devenait
 * inatteignable pour qui ne court pas — et dans ce groupe, ils sont une
 * poignée. Celui qui court choisit ses quêtes, c'est justement à ça que sert
 * le sélecteur.
 */
const SPORTS_PAR_DEFAUT: SportType[] = ['calisthenics', 'musculation'];

/**
 * Les quêtes de secours, pour qui n'a pas fait son choix du lundi.
 *
 * Dix quêtes prises dans le vivier qui sert au sélecteur, et non une liste
 * calculée à part. L'ancien système adaptait les objectifs à la semaine
 * précédente, mais il en produisait trois à six là où un joueur qui choisit
 * en a douze — et six quêtes d'initiation à quelqu'un qui s'était simplement
 * reposé une semaine. Qui ne choisit pas a maintenant exactement la même
 * quantité que les autres, simplement imposée.
 *
 * Le vivier est tiré d'après le numéro de semaine : la liste ne change donc
 * pas d'un rechargement à l'autre, et c'est bien la même pour tout le monde.
 */
export function questsParDefaut(): Quest[] {
  return [...getPermanentQuests(), ...generateQuestPool(SPORTS_PAR_DEFAUT).slice(0, 10)];
}

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
  { label: 'L-sit', description: 'Tiens 2 min de L-sit au total', target: 120, type: 'exercise_duration', xp: 75, exerciseId: 'l-sit', exerciseName: 'L-sit' },
  { label: 'Gainage', description: 'Tiens 5 min de gainage au total', target: 300, type: 'exercise_duration', xp: 75, exerciseId: 'gainage', exerciseName: 'Gainage' },
  { label: 'Pike push-ups', description: 'Fais 30 pike push-ups', target: 30, type: 'exercise_reps', xp: 75, exerciseId: 'pike-push-ups', exerciseName: 'Pike push-ups' },
  { label: 'AMRAP', description: 'Fais 1 AMRAP cette semaine', target: 1, type: 'amrap', xp: 100 },
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

// ── Quêtes difficiles (actives à partir du 21 septembre 2026) ──

const HARD_START = new Date(2026, 8, 21, 10, 0, 0, 0).getTime();

const GENERAL_HARD: Omit<Quest, 'id'>[] = [
  { label: '400 reps', description: 'Fais 400 reps au total', target: 400, type: 'reps', xp: 175 },
  { label: '600 reps', description: 'Fais 600 reps au total', target: 600, type: 'reps', xp: 225 },
  { label: '50 séries', description: 'Complète 50 séries', target: 50, type: 'sets', xp: 150 },
  { label: '70 séries', description: 'Complète 70 séries', target: 70, type: 'sets', xp: 200 },
  { label: 'Touche-à-tout', description: 'Fais 10 exercices différents', target: 10, type: 'exercises', xp: 150 },
  { label: '2 heures', description: 'Entraîne-toi 2h au total', target: 7200, type: 'duration', xp: 175 },
  { label: '3 heures', description: 'Entraîne-toi 3h au total', target: 10800, type: 'duration', xp: 225 },
  { label: '6 séances', description: 'Fais 6 séances cette semaine', target: 6, type: 'sessions', xp: 175 },
  { label: '7 séances', description: 'Fais 7 séances cette semaine', target: 7, type: 'sessions', xp: 225 },
];

const CALISTHENICS_HARD: Omit<Quest, 'id'>[] = [
  { label: 'Tractions+', description: 'Fais 120 tractions au total', target: 120, type: 'exercise_reps', xp: 200, exerciseId: 'pull-ups', exerciseName: 'Tractions' },
  { label: 'Dips+', description: 'Fais 150 dips au total', target: 150, type: 'exercise_reps', xp: 200, exerciseId: 'dips', exerciseName: 'Dips' },
  { label: 'Pompes+', description: 'Fais 250 pompes au total', target: 250, type: 'exercise_reps', xp: 200, exerciseId: 'push-ups', exerciseName: 'Pompes' },
  { label: 'Muscle-ups+', description: 'Fais 30 muscle-ups au total', target: 30, type: 'exercise_reps', xp: 250, exerciseId: 'muscle-ups', exerciseName: 'Muscle-ups' },
  { label: 'HSPU+', description: 'Fais 50 HSPU au total', target: 50, type: 'exercise_reps', xp: 225, exerciseId: 'handstand-push-ups', exerciseName: 'HSPU' },
  { label: 'Pistol squats+', description: 'Fais 60 pistol squats', target: 60, type: 'exercise_reps', xp: 175, exerciseId: 'pistol-squats', exerciseName: 'Pistol squats' },
  { label: 'Dragon flags+', description: 'Fais 30 dragon flags', target: 30, type: 'exercise_reps', xp: 200, exerciseId: 'dragon-flags', exerciseName: 'Dragon flags' },
  { label: 'Pompes diamant+', description: 'Fais 100 pompes diamant', target: 100, type: 'exercise_reps', xp: 175, exerciseId: 'diamond-push-ups', exerciseName: 'Pompes diamant' },
  { label: 'Double AMRAP', description: 'Fais 2 AMRAP cette semaine', target: 2, type: 'amrap', xp: 200 },
];

const MUSCULATION_HARD: Omit<Quest, 'id'>[] = [
  { label: 'Développé couché+', description: 'Fais 100 développé couché', target: 100, type: 'exercise_reps', xp: 200, exerciseId: 'developpe-couche', exerciseName: 'Développé couché' },
  { label: 'Développé incliné+', description: 'Fais 90 développé incliné', target: 90, type: 'exercise_reps', xp: 200, exerciseId: 'developpe-incline', exerciseName: 'Développé incliné' },
  { label: 'Développé militaire+', description: 'Fais 80 développé militaire', target: 80, type: 'exercise_reps', xp: 200, exerciseId: 'developpe-militaire', exerciseName: 'Développé militaire' },
  { label: 'Squats+', description: 'Fais 120 squats', target: 120, type: 'exercise_reps', xp: 175, exerciseId: 'squats', exerciseName: 'Squats' },
  { label: 'Soulevé de terre+', description: 'Fais 70 soulevé de terre', target: 70, type: 'exercise_reps', xp: 225, exerciseId: 'souleve-de-terre', exerciseName: 'Soulevé de terre' },
  { label: 'Rowing barre+', description: 'Fais 100 rowing barre', target: 100, type: 'exercise_reps', xp: 200, exerciseId: 'rowing-barre', exerciseName: 'Rowing barre' },
  { label: 'Curl biceps+', description: 'Fais 100 curl biceps', target: 100, type: 'exercise_reps', xp: 175, exerciseId: 'curl-biceps', exerciseName: 'Curl biceps' },
  { label: 'Hip thrust+', description: 'Fais 90 hip thrust', target: 90, type: 'exercise_reps', xp: 175, exerciseId: 'hip-thrust', exerciseName: 'Hip thrust' },
  { label: 'Fentes+', description: 'Fais 100 fentes', target: 100, type: 'exercise_reps', xp: 175, exerciseId: 'lunges', exerciseName: 'Fentes' },
];

const RUNNING_HARD: Omit<Quest, 'id'>[] = [
  { label: '1h30 de course', description: 'Cours 1h30 au total', target: 5400, type: 'running_duration', xp: 175 },
  { label: '2h de course', description: 'Cours 2h au total', target: 7200, type: 'running_duration', xp: 200 },
  { label: '3h de course', description: 'Cours 3h au total', target: 10800, type: 'running_duration', xp: 250 },
  { label: '4 runs', description: 'Fais 4 séances de running', target: 4, type: 'running_sessions', xp: 150 },
  { label: '5 runs', description: 'Fais 5 séances de running', target: 5, type: 'running_sessions', xp: 200 },
  { label: 'Sprint+', description: 'Fais 40 min de sprint', target: 2400, type: 'exercise_duration', xp: 200, exerciseId: 'sprint', exerciseName: 'Sprint' },
  { label: 'Fractionné+', description: 'Fais 45 min de fractionné', target: 2700, type: 'exercise_duration', xp: 200, exerciseId: 'interval-run', exerciseName: 'Fractionné' },
  { label: 'Côte+', description: 'Fais 40 min de course en côte', target: 2400, type: 'exercise_duration', xp: 200, exerciseId: 'hill-run', exerciseName: 'Course en côte' },
  { label: 'Tempo+', description: 'Fais 50 min de tempo run', target: 3000, type: 'exercise_duration', xp: 200, exerciseId: 'tempo-run', exerciseName: 'Tempo run' },
];

const SPORT_POOLS: Record<SportType, Omit<Quest, 'id'>[]> = {
  calisthenics: CALISTHENICS_POOL,
  musculation: MUSCULATION_POOL,
  running: RUNNING_POOL,
};

const SPORT_HARD_POOLS: Record<SportType, Omit<Quest, 'id'>[]> = {
  calisthenics: CALISTHENICS_HARD,
  musculation: MUSCULATION_HARD,
  running: RUNNING_HARD,
};

export function generateQuestPool(sports: SportType[]): Quest[] {
  const week = getWeekNumber();
  const seed = week * 31337;
  const hard = getWeekStart() >= HARD_START;

  const total = hard ? 26 : 20;
  const sportTarget = hard ? 18 : 14;

  const sportQuests: Omit<Quest, 'id'>[] = [];
  const perSport = Math.floor(sportTarget / sports.length);
  const remainder = sportTarget - perSport * sports.length;

  for (let i = 0; i < sports.length; i++) {
    const base = SPORT_POOLS[sports[i]];
    const full = hard ? [...base, ...SPORT_HARD_POOLS[sports[i]]] : base;
    const pool = seededShuffle(full, seed + i);
    const count = perSport + (i < remainder ? 1 : 0);
    sportQuests.push(...pool.slice(0, count));
  }

  const generalCount = total - sportQuests.length;
  const generalFull = hard ? [...GENERAL_POOL, ...GENERAL_HARD] : GENERAL_POOL;
  const generalQuests = seededShuffle(generalFull, seed + 99).slice(0, generalCount);

  const all = [...sportQuests, ...generalQuests];
  const shuffled = seededShuffle(all, seed + 42);

  return shuffled.map((q, i) => ({
    ...q,
    id: `w${week}-pick-${i}`,
  }));
}

// ── Défi quotidien ──

export function getDayStart(): number {
  const now = new Date();
  const shifted = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const day = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 10, 0, 0, 0);
  return day.getTime();
}

function getDayNumber(): number {
  const ref = new Date(2026, 0, 1, 10, 0, 0, 0).getTime();
  return Math.floor((getDayStart() - ref) / (24 * 60 * 60 * 1000));
}

const DAILY_POOL: Omit<Quest, 'id'>[] = [
  { label: 'Séance du jour', description: 'Fais 1 séance aujourd\'hui', target: 1, type: 'sessions', xp: 25 },
  { label: '50 reps', description: 'Fais 50 reps aujourd\'hui', target: 50, type: 'reps', xp: 25 },
  { label: '80 reps', description: 'Fais 80 reps aujourd\'hui', target: 80, type: 'reps', xp: 25 },
  { label: '100 reps', description: 'Fais 100 reps aujourd\'hui', target: 100, type: 'reps', xp: 25 },
  { label: '10 séries', description: 'Complète 10 séries aujourd\'hui', target: 10, type: 'sets', xp: 25 },
  { label: '15 séries', description: 'Complète 15 séries aujourd\'hui', target: 15, type: 'sets', xp: 25 },
  { label: '20 minutes', description: 'Entraîne-toi 20 min aujourd\'hui', target: 1200, type: 'duration', xp: 25 },
  { label: '30 minutes', description: 'Entraîne-toi 30 min aujourd\'hui', target: 1800, type: 'duration', xp: 25 },
  { label: '45 minutes', description: 'Entraîne-toi 45 min aujourd\'hui', target: 2700, type: 'duration', xp: 25 },
  { label: 'Varié', description: 'Fais 3 exercices différents aujourd\'hui', target: 3, type: 'exercises', xp: 25 },
  { label: 'Très varié', description: 'Fais 5 exercices différents aujourd\'hui', target: 5, type: 'exercises', xp: 25 },
  { label: '25 séries', description: 'Complète 25 séries aujourd\'hui', target: 25, type: 'sets', xp: 25 },
  { label: '150 reps', description: 'Fais 150 reps aujourd\'hui', target: 150, type: 'reps', xp: 25 },
  { label: '1 heure', description: 'Entraîne-toi 1h aujourd\'hui', target: 3600, type: 'duration', xp: 25 },
];

export function getDailyQuest(): Quest {
  const day = getDayNumber();
  const len = DAILY_POOL.length;
  const cycle = Math.floor(day / len);
  const idx = ((day % len) + len) % len;
  // Une permutation différente à chaque cycle : pas de répétition dans un cycle
  const ordered = seededShuffle(DAILY_POOL, cycle * 7919 + 1337);
  return { ...ordered[idx], id: `d${day}-daily` };
}

// ── Sport Co ──

/** 25 XP par tranche de 30 min complète. */
export function sportCoXp(seconds: number): number {
  return Math.floor(seconds / 1800) * 25;
}

// ── Endurance ──

/**
 * XP d'une sortie : course, vélo, marche.
 *
 * Jusqu'ici seul le sport co rapportait de l'XP directement — courir une
 * heure n'ajoutait rien, la sortie ne comptait qu'à travers l'unique quête
 * d'endurance de la semaine. Les gens couraient, l'app le savait, elle n'en
 * faisait rien.
 *
 * Compté au quart d'heure et non à la demi-heure comme le sport co : à la
 * demi-heure, une sortie de 45 minutes était arrondie à 30 et le dernier
 * quart d'heure partait à la poubelle.
 */
export const ENDURANCE_XP_QUART = 12;

/**
 * Marcher une heure n'est pas courir une heure : moitié moins. C'est aussi ce
 * qui permet de compter la marche sans qu'elle devienne la façon la plus
 * rentable de monter de niveau.
 */
const MARCHE = new Set(['fast-walk']);

/** Plafond par jour, pour que faire six fois le tour du quartier ne paie pas. */
export const ENDURANCE_XP_MAX_JOUR = 60;

export function enduranceXp(seconds: number, exerciseId: string): number {
  const quarts = Math.floor(seconds / 900);
  const taux = MARCHE.has(exerciseId) ? ENDURANCE_XP_QUART / 2 : ENDURANCE_XP_QUART;
  return Math.round(quarts * taux);
}

/**
 * Applique le plafond quotidien et renvoie le compteur du jour mis à jour.
 *
 * Le compteur porte sa date : un compteur sans date ne saurait pas qu'on a
 * changé de jour, et le plafond de lundi bloquerait encore mardi.
 */
export function plafonneEndurance(
  gagne: number,
  journee: { date: string; xp: number } | undefined,
  aujourdhui: string
): { xp: number; journee: { date: string; xp: number } } {
  const deja = journee?.date === aujourdhui ? journee.xp : 0;
  const accorde = Math.max(0, Math.min(gagne, ENDURANCE_XP_MAX_JOUR - deja));
  return { xp: accorde, journee: { date: aujourdhui, xp: deja + accorde } };
}

// ── Levels ──

export const PASS_LEVELS = 100;

/**
 * Paliers garantis. Tous les autres niveaux donnent un coffre classique.
 * 17 paliers sur 100 : assez pour jalonner la progression sans dévaluer
 * les raretés hautes.
 */
const SPECIAL_CHESTS: Record<number, CardRarity> = {
  10: 'rare',
  20: 'rare',
  25: 'epique',
  30: 'rare',
  40: 'rare',
  45: 'epique',
  50: 'legendaire',
  55: 'rare',
  60: 'rare',
  65: 'epique',
  70: 'rare',
  75: 'epique',
  80: 'legendaire',
  85: 'rare',
  90: 'epique',
  95: 'rare',
  100: 'historique',
};

/**
 * Coût d'un niveau. Les 24 premiers gardent leur coût d'origine pour que les
 * joueurs en cours de pass ne voient pas leur niveau bouger, puis la courbe
 * monte doucement. Total : environ 24 500 XP pour atteindre le niveau 100.
 */
function xpForLevel(level: number): number {
  if (level <= 24) return 200;
  if (level <= 50) return 220;
  if (level <= 75) return 260;
  return 300;
}

function buildLevels(): PassLevel[] {
  const levels: PassLevel[] = [];
  for (let i = 1; i <= PASS_LEVELS; i++) {
    levels.push({
      level: i,
      xpRequired: xpForLevel(i),
      freeChest: SPECIAL_CHESTS[i] || 'commune',
    });
  }
  return levels;
}

// Pass 1 commence le 1er septembre 2026, dure 90 jours
const PASS1_START = new Date(2026, 8, 1).getTime();
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

// La saison 2 démarre à la seconde où la 1 s'arrête : pas de trou pendant
// lequel getCurrentSeason() renverrait null.
const PASS2_START = PASS1_START + NINETY_DAYS;

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
  {
    id: 'pass-2',
    name: 'Saison 2',
    theme: 'Fous du bus',
    startDate: PASS2_START,
    endDate: PASS2_START + NINETY_DAYS,
    passLevels: buildLevels(),
    quests: [],
  },
];

export function getCurrentSeason(): Season | null {
  const now = Date.now();
  return SEASONS.find((s) => now >= s.startDate && now < s.endDate) || null;
}

/**
 * Le rang de la dernière saison commencée, -1 si aucune ne l'est.
 *
 * `getCurrentSeason` rend `null` entre deux saisons et une fois la dernière
 * terminée. Pour savoir ce qu'on a le droit de montrer, c'est « déjà
 * commencée » qui compte, pas « en cours » : une collection passée reste
 * consultable, une saison à venir doit rester fermée.
 */
export function lastStartedSeasonIndex(): number {
  const now = Date.now();
  return SEASONS.filter((s) => now >= s.startDate).length - 1;
}

/**
 * Faut-il basculer ce joueur sur une nouvelle saison ?
 *
 * Un `currentSeasonId` vide désigne un compte qui n'a jamais joué : il
 * démarre dans la saison en cours, ce n'est pas une bascule.
 */
export function needsSeasonReset(progress: UserProgress, seasonId: string): boolean {
  return !!progress.currentSeasonId && progress.currentSeasonId !== seasonId;
}

/**
 * Remet le pass à zéro pour une nouvelle saison.
 *
 * Sans ça, l'XP cumulée resterait acquise : un joueur arriverait au premier
 * jour de la saison 2 déjà à mi-parcours, et surtout ne toucherait plus aucun
 * coffre tant qu'il n'aurait pas dépassé son total de la saison précédente,
 * puisque les récompenses se déclenchent au franchissement d'un niveau.
 *
 * Ce qui a été gagné reste gagné : les cartes, les badges et les succès ne
 * sont pas touchés. Les coffres encore fermés sont épinglés sur la saison où
 * ils ont été obtenus, sinon ils donneraient en silence des cartes de la
 * nouvelle saison.
 */
export function startNewSeason(progress: UserProgress, seasonId: string): UserProgress {
  const previous = progress.currentSeasonId;
  return {
    ...progress,
    passXp: 0,
    currentSeasonId: seasonId,
    chestsToOpen: (progress.chestsToOpen || []).map((chest) =>
      chest.pool === 'current' && previous ? { ...chest, pool: previous } : chest
    ),
  };
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

// ── Collections des saisons passées ──

/**
 * Saison qui précède celle donnée, dans l'ordre de SEASONS.
 * Renvoie undefined pour la toute première.
 */
export function getPreviousSeason(seasonId: string): Season | undefined {
  const index = SEASONS.findIndex((s) => s.id === seasonId);
  return index > 0 ? SEASONS[index - 1] : undefined;
}

/**
 * Quête bonus hebdomadaire, en dehors du pass.
 *
 * Elle ne rapporte pas d'XP — elle est volontairement hors progression — mais
 * un coffre de la saison précédente, pour laisser une chance de compléter une
 * collection qu'on ne peut plus remplir autrement. Elle n'apparaît que tant
 * qu'il manque des cartes : une fois la collection finie, elle disparaît.
 */
export function getArchiveQuest(previousSeason: Season): Quest {
  const week = getWeekNumber();
  return {
    id: `w${week}-archive-${previousSeason.id}`,
    label: `Archive — ${previousSeason.name}`,
    description: 'Fais 4 séances cette semaine',
    target: 4,
    type: 'sessions',
    xp: 0,
  };
}
