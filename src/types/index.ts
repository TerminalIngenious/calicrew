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
  totalDuration: number; // secondes
  exerciseVariety: number; // nombre d'exercices différents
}
