import type { Exercise } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'pull-ups', name: 'Tractions', category: 'pull', canBeWeighted: true },
  { id: 'chin-ups', name: 'Chin-ups', category: 'pull', canBeWeighted: true },
  { id: 'muscle-ups', name: 'Muscle-ups', category: 'pull', canBeWeighted: true },
  { id: 'australian-rows', name: 'Rowings australiens', category: 'pull', canBeWeighted: true },
  { id: 'dips', name: 'Dips', category: 'push', canBeWeighted: true },
  { id: 'push-ups', name: 'Pompes', category: 'push', canBeWeighted: true },
  { id: 'diamond-push-ups', name: 'Pompes diamant', category: 'push', canBeWeighted: true },
  { id: 'pike-push-ups', name: 'Pike push-ups', category: 'push', canBeWeighted: true },
  { id: 'handstand-push-ups', name: 'HSPU', category: 'push', canBeWeighted: true },
  { id: 'pistol-squats', name: 'Pistol squats', category: 'legs', canBeWeighted: true },
  { id: 'squats', name: 'Squats', category: 'legs', canBeWeighted: true },
  { id: 'lunges', name: 'Fentes', category: 'legs', canBeWeighted: true },
  { id: 'calf-raises', name: 'Mollets', category: 'legs', canBeWeighted: true },
  { id: 'l-sit', name: 'L-sit', category: 'core', canBeWeighted: true },
  { id: 'leg-raises', name: 'Relevés de jambes', category: 'core', canBeWeighted: true },
  { id: 'dragon-flags', name: 'Dragon flags', category: 'core', canBeWeighted: true },
  { id: 'planche', name: 'Planche', category: 'skill', canBeWeighted: true },
  { id: 'front-lever', name: 'Front lever', category: 'skill', canBeWeighted: true },
  { id: 'back-lever', name: 'Back lever', category: 'skill', canBeWeighted: true },
  { id: 'human-flag', name: 'Human flag', category: 'skill', canBeWeighted: true },
];

export const CATEGORY_LABELS: Record<Exercise['category'], string> = {
  push: 'Poussée',
  pull: 'Tirage',
  legs: 'Jambes',
  core: 'Abdos',
  skill: 'Skills',
};
