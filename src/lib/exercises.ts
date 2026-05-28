import type { Exercise } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'pull-ups', name: 'Tractions', category: 'pull' },
  { id: 'chin-ups', name: 'Chin-ups', category: 'pull' },
  { id: 'muscle-ups', name: 'Muscle-ups', category: 'pull' },
  { id: 'australian-rows', name: 'Rowings australiens', category: 'pull' },
  { id: 'dips', name: 'Dips', category: 'push' },
  { id: 'push-ups', name: 'Pompes', category: 'push' },
  { id: 'diamond-push-ups', name: 'Pompes diamant', category: 'push' },
  { id: 'pike-push-ups', name: 'Pike push-ups', category: 'push' },
  { id: 'handstand-push-ups', name: 'HSPU', category: 'push' },
  { id: 'pistol-squats', name: 'Pistol squats', category: 'legs' },
  { id: 'squats', name: 'Squats', category: 'legs' },
  { id: 'lunges', name: 'Fentes', category: 'legs' },
  { id: 'calf-raises', name: 'Mollets', category: 'legs' },
  { id: 'l-sit', name: 'L-sit', category: 'core' },
  { id: 'leg-raises', name: 'Relevés de jambes', category: 'core' },
  { id: 'dragon-flags', name: 'Dragon flags', category: 'core' },
  { id: 'planche', name: 'Planche', category: 'skill' },
  { id: 'front-lever', name: 'Front lever', category: 'skill' },
  { id: 'back-lever', name: 'Back lever', category: 'skill' },
  { id: 'human-flag', name: 'Human flag', category: 'skill' },
];

export const CATEGORY_LABELS: Record<Exercise['category'], string> = {
  push: 'Poussée',
  pull: 'Tirage',
  legs: 'Jambes',
  core: 'Abdos',
  skill: 'Skills',
};
