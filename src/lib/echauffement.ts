import type { WarmupItem } from '../types';

/**
 * Le catalogue d'échauffement.
 *
 * Volontairement à part de DEFAULT_EXERCISES : un échauffement ne compte ni
 * en répétitions, ni en XP, ni en record personnel. Trente secondes de
 * cercles de bras n'ont rien à faire dans les stats, et des pompes légères
 * ne doivent pas venir battre un record de pompes.
 */
export interface ExoEchauffement {
  id: string;
  nom: string;
  famille: 'cardio' | 'mobilite' | 'activation';
  /** La dose par défaut : des secondes pour une tenue, des reps sinon. */
  valeur: number;
  unite: 'reps' | 'seconds';
}

export const FAMILLES: { cle: ExoEchauffement['famille']; label: string }[] = [
  { cle: 'cardio', label: 'Cardio' },
  { cle: 'mobilite', label: 'Mobilité' },
  { cle: 'activation', label: 'Activation' },
];

export const EXOS_ECHAUFFEMENT: ExoEchauffement[] = [
  // Faire monter le cœur et la température.
  { id: 'ech-corde', nom: 'Corde à sauter', famille: 'cardio', valeur: 120, unite: 'seconds' },
  { id: 'ech-genoux', nom: 'Montées de genoux', famille: 'cardio', valeur: 45, unite: 'seconds' },
  { id: 'ech-talons', nom: 'Talons-fesses', famille: 'cardio', valeur: 45, unite: 'seconds' },
  { id: 'ech-jumping-jacks', nom: 'Jumping jacks', famille: 'cardio', valeur: 45, unite: 'seconds' },
  { id: 'ech-course-place', nom: 'Course sur place', famille: 'cardio', valeur: 120, unite: 'seconds' },
  { id: 'ech-rameur', nom: 'Rameur', famille: 'cardio', valeur: 180, unite: 'seconds' },
  { id: 'ech-velo', nom: 'Vélo', famille: 'cardio', valeur: 300, unite: 'seconds' },
  { id: 'ech-burpees-lents', nom: 'Burpees lents', famille: 'cardio', valeur: 10, unite: 'reps' },

  // Ouvrir les articulations avant de les charger.
  { id: 'ech-cercles-bras', nom: 'Cercles de bras', famille: 'mobilite', valeur: 30, unite: 'seconds' },
  { id: 'ech-epaules', nom: 'Rotations d’épaules', famille: 'mobilite', valeur: 30, unite: 'seconds' },
  { id: 'ech-poignets', nom: 'Rotations de poignets', famille: 'mobilite', valeur: 30, unite: 'seconds' },
  { id: 'ech-chevilles', nom: 'Rotations de chevilles', famille: 'mobilite', valeur: 30, unite: 'seconds' },
  { id: 'ech-hanches', nom: 'Cercles de hanches', famille: 'mobilite', valeur: 30, unite: 'seconds' },
  { id: 'ech-cat-cow', nom: 'Chat-vache', famille: 'mobilite', valeur: 45, unite: 'seconds' },
  { id: 'ech-chien', nom: 'Chien tête en bas', famille: 'mobilite', valeur: 45, unite: 'seconds' },
  { id: 'ech-thoracique', nom: 'Rotation thoracique', famille: 'mobilite', valeur: 45, unite: 'seconds' },
  { id: 'ech-fentes-mobilite', nom: 'Fente ouverture de hanche', famille: 'mobilite', valeur: 45, unite: 'seconds' },
  { id: 'ech-dislocations', nom: 'Dislocations au bâton', famille: 'mobilite', valeur: 10, unite: 'reps' },

  // Réveiller ce qui va travailler, à vide ou presque.
  { id: 'ech-scapular-pulls', nom: 'Scapular pulls', famille: 'activation', valeur: 10, unite: 'reps' },
  { id: 'ech-dead-hang', nom: 'Suspension à la barre', famille: 'activation', valeur: 30, unite: 'seconds' },
  { id: 'ech-pompes-legeres', nom: 'Pompes légères', famille: 'activation', valeur: 10, unite: 'reps' },
  { id: 'ech-squats-vide', nom: 'Squats à vide', famille: 'activation', valeur: 15, unite: 'reps' },
  { id: 'ech-fentes-marchees', nom: 'Fentes marchées', famille: 'activation', valeur: 10, unite: 'reps' },
  { id: 'ech-band-pull-apart', nom: 'Band pull-apart', famille: 'activation', valeur: 15, unite: 'reps' },
  { id: 'ech-good-morning', nom: 'Good morning à vide', famille: 'activation', valeur: 15, unite: 'reps' },
  { id: 'ech-gainage-leger', nom: 'Gainage', famille: 'activation', valeur: 30, unite: 'seconds' },
  { id: 'ech-superman', nom: 'Superman', famille: 'activation', valeur: 30, unite: 'seconds' },
  { id: 'ech-rowings-legers', nom: 'Rowings australiens légers', famille: 'activation', valeur: 10, unite: 'reps' },
];

/**
 * Ce qui est coché quand on active l'échauffement.
 *
 * Un écran vide aurait renvoyé le choix au joueur juste au moment où il veut
 * commencer : un de chaque famille, décochable, vaut mieux qu'une question.
 */
const SUGGESTION = ['ech-course-place', 'ech-cercles-bras', 'ech-hanches', 'ech-squats-vide'];

export function echauffementSuggere(): WarmupItem[] {
  return SUGGESTION
    .map((id) => EXOS_ECHAUFFEMENT.find((e) => e.id === id))
    .filter((e): e is ExoEchauffement => !!e)
    .map(enItem);
}

export function enItem(exo: ExoEchauffement): WarmupItem {
  return { id: exo.id, name: exo.nom, value: exo.valeur, unit: exo.unite };
}

/** « 45 s » ou « 10 reps », pour l'afficher partout de la même façon. */
export function doseLabel(item: { value: number; unit: 'reps' | 'seconds' }): string {
  if (item.unit !== 'seconds') return `${item.value} reps`;
  if (item.value < 60) return `${item.value} s`;
  const min = Math.floor(item.value / 60);
  const sec = item.value % 60;
  return sec === 0 ? `${min} min` : `${min} min ${sec} s`;
}

/** Le temps que prendra l'échauffement, en minutes, arrondi au plus proche. */
export function dureeEstimee(items: WarmupItem[]): number {
  // Un exercice en répétitions ne se chronomètre pas : on compte trois
  // secondes par répétition, ce qui vaut mieux que de ne rien annoncer.
  const secondes = items.reduce(
    (total, it) => total + (it.unit === 'seconds' ? it.value : it.value * 3),
    0
  );
  return Math.max(1, Math.round(secondes / 60));
}
