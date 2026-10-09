/** Unité d'une série : répétitions, ou secondes pour les exercices isométriques. */
export type SetUnit = 'reps' | 'seconds';

export interface Exercise {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'skill' | 'crossfit' | 'running' | 'velo' | 'sportco';
  isCustom?: boolean;
  canBeWeighted?: boolean;
  /** Unité proposée par défaut. Absent = 'reps'. */
  defaultUnit?: SetUnit;
}

export interface SetLog {
  /** Nombre de répétitions, ou de secondes si l'exercice est en unité 'seconds'. */
  reps: number;
  completed: boolean;
  /** Charge de cette série. Absent = celle de l'exercice, la charge peut varier en cours de séance. */
  weight?: number;
}

export type WeightType = 'body' | 'halteres' | 'barre';

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  targetSets: number;
  targetReps: number;
  sets: SetLog[];
  /** Absent = 'reps', pour rester compatible avec les séances existantes. */
  unit?: SetUnit;
  weighted?: boolean;
  weight?: number;
  weightType?: WeightType;
  runDuration?: number;
  runDistance?: number;
  runElevation?: number;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  exercises: ExerciseLog[];
  completed: boolean;
  createdAt: number;
  duration?: number;
  startedAt?: number;
  mode?: 'standard' | 'amrap';
  amrapDuration?: number;
  amrapRounds?: number;
  /**
   * Nom du WOD. Absent sur les anciennes séances, qui étaient toutes des
   * Cindy : l'affichage retombe alors sur « AMRAP ».
   */
  amrapName?: string;
  /**
   * Séance qui ne rapporte pas de coffre : rattrapage d'un défi juste après
   * une vraie séance, ou essai dans l'app. Les reps comptent quand même, c'est
   * la récompense qu'on renonce à toucher deux fois.
   */
  noReward?: boolean;
  /**
   * Façon de dérouler la séance. 'circuit' enchaîne un tour de tous les
   * exercices avant de recommencer, au lieu de finir un exercice puis de
   * passer au suivant. Les données ne changent pas, seul l'ordre d'affichage.
   */
  layout?: 'exercise' | 'circuit';
}

// ── Programs ──

export interface ProgramExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  targetSets: number;
  targetReps: number;
  unit?: SetUnit;
  weighted?: boolean;
  weight?: number;
  weightType?: WeightType;
}

export interface Program {
  id: string;
  name: string;
  /** Absent = 'standard' : les programmes d'avant sont tous en séries/reps. */
  kind?: 'standard' | 'amrap';
  /** Durée du chrono, pour un programme AMRAP. */
  amrapMinutes?: number;
  description?: string;
  createdBy: string;
  creatorName: string;
  exercises: ProgramExercise[];
  isPublic: boolean;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  createdBy: string;
  memberIds: string[];
  pendingIds: string[];
  createdAt: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalReps: number;
  totalSets: number;
  sessionsCount: number;
  totalDuration: number;
  exerciseVariety: number;
  avatarCardId?: string;
}

// ── Cards ──

export type CardRarity = 'historique' | 'legendaire' | 'epique' | 'rare' | 'commune';

export interface Card {
  id: string;
  name: string;
  subtitle?: string;
  emoji: string;
  image?: string;
  rarity: CardRarity;
  category: string;
  set: string;
  baseCardId?: string;
}

// ── Season / Pass ──

export interface Quest {
  id: string;
  label: string;
  description: string;
  target: number;
  type: 'sessions' | 'reps' | 'duration' | 'exercises' | 'sets' | 'amrap' | 'running_sessions' | 'running_duration' | 'exercise_reps' | 'exercise_duration';
  xp: number;
  exerciseId?: string;
  exerciseName?: string;
}

export interface PassLevel {
  level: number;
  xpRequired: number;
  freeChest?: CardRarity;
  premiumChest?: CardRarity;
}

export interface Season {
  id: string;
  name: string;
  theme: string;
  startDate: number;
  endDate: number;
  passLevels: PassLevel[];
  quests: Quest[];
}

// ── Achievements ──

export interface Achievement {
  id: string;
  label: string;
  description: string;
  emoji: string;
  target: number;
  type: 'totalSessions' | 'totalReps' | 'totalDuration' | 'totalAmrap' | 'exerciseVariety' | 'totalSets';
  reward: 'oldPassChest' | 'guaranteedEpique' | 'guaranteedLegendaire';
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  groupId: string;
  uid: string;
  displayName: string;
  avatarCardId?: string;
  text: string;
  createdAt: number;
}

// ── Trades ──

/**
 * Sens de l'annonce. Une offre met une carte à disposition, une recherche
 * réclame une carte qu'on n'a pas — dans les deux cas l'échange final est le
 * même, c'est le côté connu d'avance qui change.
 */
export type TradeKind = 'offre' | 'recherche';

/** Proposition d'un membre sur une annonce. Une seule par personne. */
export interface TradeBid {
  uid: string;
  /** Figé à la proposition : évite une lecture de profil pour l'affichage. */
  displayName: string;
  cardId: string;
  createdAt: number;
}

/**
 * Annonce d'échange, ouverte à tout le groupe.
 *
 * L'auteur met une carte à l'échange, les autres proposent la leur, et c'est
 * l'auteur qui tranche. L'ancien système n'autorisait qu'une offre dirigée
 * vers une seule personne, qu'il fallait deviner.
 */
export interface TradeListing {
  id: string;
  groupId: string;
  ownerUid: string;
  ownerName: string;
  /** Absent = 'offre' : les annonces d'avant ne pouvaient qu'offrir. */
  kind?: TradeKind;
  /** Carte donnée par l'auteur si c'est une offre, réclamée si c'est une recherche. */
  cardId: string;
  bids: TradeBid[];
  status: 'open' | 'completed' | 'cancelled';
  createdAt: number;
  /** Renseignés à la conclusion, pour l'historique. */
  acceptedUid?: string;
  acceptedCardId?: string;
  completedAt?: number;
}

// ── Badges de classement ──

export type RankCategory = 'reps' | 'variety' | 'time';

export interface RankBadge {
  /** `${monthKey}-${category}-${rank}` : sert à ne pas attribuer deux fois le même. */
  id: string;
  category: RankCategory;
  /** 0 = 1er, 1 = 2e, 2 = 3e. */
  rank: number;
  /** Mois gagné, au format 'YYYY-MM'. */
  monthKey: string;
  seasonId: string;
  /** Figé au moment du gain : une saison passée peut être retirée du code. */
  seasonName: string;
  groupName: string;
  earnedAt: number;
}

// ── Weekly Quests ──

export type SportType = 'calisthenics' | 'musculation' | 'running';

export interface WeeklyQuestSelection {
  weekStart: number;
  sports: SportType[];
  chosenQuests: Quest[];
  locked: boolean;
}

// ── Records personnels ──

/** Unité d'un record. 'kg' sert aux maxis de charge (1RM et compagnie). */
export type RecordUnit = 'reps' | 'kg' | 'seconds' | 'km';

/**
 * Record saisi à la main par le joueur. Volontairement déconnecté des séances
 * loguées : un PR se fait souvent hors de l'app, et c'est le joueur qui sait
 * ce qui compte comme record pour lui.
 */
export interface PersonalRecord {
  id: string;
  /** Renseigné quand l'exercice vient du catalogue. */
  exerciseId?: string;
  exerciseName: string;
  /** Catégorie, pour le regroupement. Vide si exercice libre. */
  category: string;
  unit: RecordUnit;
  value: number;
  /** Charge additionnelle, pour un record en reps ou en temps lesté. */
  weight?: number;
  /** Date du record, au format YYYY-MM-DD. Facultative. */
  date?: string;
  /** Précision libre : « en 1h50 », « sans élan »… */
  note?: string;
  updatedAt: number;
}

// ── User Progress ──

export interface UserProgress {
  passXp: number;
  isPremium: boolean;
  ownedCards: Record<string, number>;
  questsClaimed: Record<string, number>;
  chestsToOpen: { rarity: CardRarity; pool: 'current' | 'old' }[];
  achievementsClaimed: string[];
  currentSeasonId: string;
  avatarCardId?: string;
  weeklyQuestSelection?: WeeklyQuestSelection;
  monthlyRewardsClaimed?: string;
  badges?: RankBadge[];
  /**
   * Jours où la créatine a été prise, au format YYYY-MM-DD. Le streak s'en
   * déduit et n'est jamais stocké, pour qu'il ne puisse pas devenir faux.
   */
  creatineDays?: string[];
  /** Records saisis par le joueur lui-même. */
  personalRecords?: PersonalRecord[];
}
