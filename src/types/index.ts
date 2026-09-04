export interface Exercise {
  id: string;
  name: string;
  category: 'push' | 'pull' | 'legs' | 'core' | 'skill';
  isCustom?: boolean;
  canBeWeighted?: boolean;
}

export interface SetLog {
  reps: number;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: string;
  targetSets: number;
  targetReps: number;
  sets: SetLog[];
  weighted?: boolean;
  weight?: number;
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
}

// ── Cards ──

export type CardRarity = 'historique' | 'legendaire' | 'epique' | 'rare' | 'commune';

export interface Card {
  id: string;
  name: string;
  subtitle?: string;
  emoji: string;
  rarity: CardRarity;
  category: string;
  set: 'base' | string;
  premiumOnly?: boolean;
  baseCardId?: string;
}

// ── Season / Pass ──

export interface Quest {
  id: string;
  label: string;
  description: string;
  target: number;
  type: 'sessions' | 'reps' | 'duration' | 'exercises' | 'sets' | 'amrap';
  premiumOnly?: boolean;
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

// ── Trades ──

export interface TradeOffer {
  id: string;
  fromUid: string;
  toUid: string;
  offeredCardId: string;
  requestedCardId: string;
  groupId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
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
}
