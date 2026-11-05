/**
 * Les textes des rappels quotidiens.
 *
 * Un rappel identique tous les soirs finit par ne plus être lu : au bout de
 * deux semaines, « Chef, t'as pris ta créatine ?? » ne fait plus sourire
 * personne et la notification se balaie sans la lire. On tourne donc sur une
 * liste, un texte par jour.
 *
 * Le texte du jour est choisi par le numéro du jour et non au hasard : tout
 * le groupe reçoit le même, et c'est précisément ce qui le rend drôle — on
 * peut en parler entre nous le soir même. Un tirage aléatoire par personne
 * aurait enlevé ça.
 */

export const CREATINE_MESSAGES = [
  // L'original reste en tête de liste : c'est devenu la phrase du groupe.
  "Chef, t'as pris ta créatine ??",
  'La créatine ne se prend pas toute seule.',
  'Tes 5 grammes t\'attendent. Ils commencent à trouver le temps long.',
  'Pas de créatine, pas de muscle-up. C\'est la science.',
  'Le shaker te regarde depuis ce matin.',
  'Un scoop. Un seul. Tu peux le faire.',
  'La créatine, c\'est comme les tractions : c\'est tous les jours.',
  'Quelqu\'un a encore oublié sa créatine. On ne dira pas qui.',
  '5 g. Pas 4. Pas 6. 5.',
  'Si tu lis ça, c\'est que t\'as toujours pas pris ta créatine.',
  'Créatine. Maintenant. On en parle plus.',
  'Tes muscles ont appelé. Ils demandent de l\'eau et de la poudre.',
  'Jour de repos ? La créatine, elle, ne se repose pas.',
  'Rappel : la créatine se prend aussi les jours où t\'as la flemme.',
  'Trente secondes de ta soirée. C\'est tout ce qu\'elle demande.',
];

export const DAILY_CHALLENGE_MESSAGES = [
  // L'original, là aussi.
  "T'as pas encore fait ton défi du jour ! Il te reste la soirée.",
  'Le défi du jour est toujours là. Lui, il ne lâche rien.',
  'Défi du jour : toujours pas coché. On attend.',
  'Minuit approche et ton défi est intact.',
  'Ton défi du jour prend la poussière.',
  'Encore le temps de sauver ta journée.',
  'Le défi du jour ne se fera pas tout seul. On a vérifié.',
  'De l\'XP gratuite, et tu laisses passer ?',
  'Il te reste la soirée. Après, c\'est fini pour aujourd\'hui.',
  'Ton défi du jour t\'a envoyé un message. C\'est celui-ci.',
  'Les autres ont fait le leur. Enfin, certains.',
  'Un défi par jour. On n\'en demande pas plus.',
  'Ce serait dommage de casser la série ce soir.',
  'Le canapé peut attendre dix minutes.',
];

/**
 * Le texte du jour. Le modulo est protégé contre les numéros de jour négatifs
 * (getDayNumber compte depuis le 1er janvier 2026).
 */
export function messageDuJour(messages: string[], jour: number): string {
  return messages[((jour % messages.length) + messages.length) % messages.length];
}
