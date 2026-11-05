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

// ──────────────────────────────────────────────────────────────────────────
// Les vannes du soir
// ──────────────────────────────────────────────────────────────────────────
// Même principe que les rappels : une liste, un texte par jour, le même pour
// tout le monde. Celles-ci parlent du groupe, donc elles prennent un nom ou
// un nombre — d'où des fonctions plutôt que des chaînes toutes faites.

/** Le groupe entier n'a rien fait de la journée. */
export const GROUPE_VIDE = [
  'Zéro séance aujourd\'hui. Pour personne. Bravo à tous.',
  'Journée blanche pour le groupe. Les barres n\'ont vu personne.',
  'Aucun d\'entre vous n\'a touché une barre aujourd\'hui. On note.',
  'Le parc a passé la journée seul. Il ne dit rien, mais il pense fort.',
  'Record du jour : 0 séance, 19 excuses.',
];

/** Un membre tient la tête du classement depuis un moment. */
export const LEADER_INTOUCHABLE = [
  (nom: string, jours: number) => `${nom} est en tête depuis ${jours} jours. Quelqu'un compte réagir ?`,
  (nom: string, jours: number) => `${jours} jours que ${nom} mène le classement. C'est long, ${jours} jours.`,
  (nom: string, jours: number) => `${nom} squatte la première place depuis ${jours} jours. Au sens propre, lui au moins.`,
  (nom: string) => `Toujours ${nom} en tête. Toujours.`,
];

/** Un membre n'a pas fait de séance depuis longtemps. */
export const MEMBRE_DISPARU = [
  (nom: string, jours: number) => `${nom} n'a pas touché une barre depuis ${jours} jours. On pense à lui.`,
  (nom: string, jours: number) => `Avis de recherche : ${nom}, vu pour la dernière fois il y a ${jours} jours.`,
  (nom: string, jours: number) => `${jours} jours sans séance pour ${nom}. Le canapé a gagné.`,
  (nom: string) => `Si quelqu'un croise ${nom}, qu'il lui rappelle qu'on fait du sport ici.`,
];

/** Le dimanche soir, le bilan de la semaine. */
export const BILAN_DIMANCHE = [
  (total: number, nom: string, best: number) =>
    `${total} séances pour le groupe cette semaine. ${nom} en a fait ${best} à lui tout seul.`,
  (total: number, nom: string) =>
    `Semaine terminée : ${total} séances au total, et ${nom} devant tout le monde.`,
  (total: number) => `${total} séances cette semaine. La semaine prochaine, on fait mieux.`,
];

/** Dimanche en fin d'après-midi, pour ceux qui n'ont encore rien fait. */
export const DERNIERE_CHANCE = [
  'Il te reste la soirée pour sauver ta semaine. Zéro séance, pour l\'instant.',
  'Dimanche soir. Ta semaine est encore vide. Ça se joue maintenant.',
  'Dernière ligne droite : aucune séance cette semaine. Une suffirait.',
];

/** Le 1er du mois, quand le classement repart de zéro. */
export const RESET_MOIS = [
  'Nouveau mois, classement remis à zéro. Tout le monde à égalité. Ça ne durera pas.',
  'Le classement vient d\'être effacé. Première place à prendre.',
  'Nouveau mois : tes reps d\'hier ne valent plus rien. À toi de jouer.',
];

/** Quand rien de particulier ne se passe — la vanne de fond. */
export const VANNE_GENERIQUE = [
  'Un muscle-up par jour éloigne le médecin. Enfin, pas sûr.',
  'Petit rappel : les tractions ne se font pas toutes seules.',
  'La barre t\'attend. Elle est patiente, mais pas éternelle.',
  'Quelqu\'un dans ce groupe est en train de s\'entraîner. Pas toi.',
  'Le meilleur moment pour s\'entraîner, c\'était hier. Le deuxième meilleur, c\'est là.',
  'Tes bras ne vont pas pousser en regardant ton téléphone.',
  'Rappel du soir : tu as un corps, il sert aussi à ça.',
  'Il paraît que les dips, c\'est bien. On dit ça comme ça.',
];

// ──────────────────────────────────────────────────────────────────────────
// Le défi surprise de l'après-midi
// ──────────────────────────────────────────────────────────────────────────
// Rien à valider, rien à cocher : c'est une notification qui demande dix
// secondes d'effort là où on est. Le but est qu'on la lise et qu'on s'exécute
// en riant, pas qu'elle entre dans les statistiques.

export const DEFIS_SURPRISE = [
  'Fais 10 pompes. Maintenant. Oui, là où tu es.',
  '20 squats. Tout de suite. Personne ne regarde.',
  'Gainage, 30 secondes. Le chrono tourne.',
  'Lève-toi et fais 15 squats. On attend.',
  'Cherche une barre, un portique, une branche. Une traction. Une seule.',
  '10 pompes. Si t\'es en réunion, 10 pompes mentales, on ne jugera pas.',
  '30 secondes de chaise contre le mur. C\'est court. Ça ne va pas le paraître.',
  'Monte les escaliers au lieu de l\'ascenseur. Ça compte aussi.',
  '15 fentes. Oui, en pantalon. On fait avec ce qu\'on a.',
  'Étire-toi. Là. Tu viens de le sentir, hein ?',
];

/** Le membre tiré au sort pour la journée. */
export const PATRON_DU_JOUR = [
  (nom: string) => `${nom} est le patron du jour. Ses règles, sa journée.`,
  (nom: string) => `Patron du jour : ${nom}. Tout le monde lui doit le respect jusqu'à minuit.`,
  (nom: string) => `Aujourd'hui, c'est ${nom} qui décide. Demain, quelqu'un d'autre.`,
];

// ──────────────────────────────────────────────────────────────────────────
// Le temps réel
// ──────────────────────────────────────────────────────────────────────────
// Celles-ci partent à l'instant où ça se produit, donc un texte au hasard et
// non un texte par jour : deux doublages dans la même soirée ne doivent pas
// arriver avec la même phrase.

/** Quelqu'un vient de te passer devant au classement. */
export const DOUBLE = [
  (nom: string, place: number) => `${nom} vient de te doubler. Tu es ${place}e.`,
  (nom: string) => `${nom} est passé devant toi au classement. Comme ça, sans prévenir.`,
  (nom: string, place: number) => `Tu viens de perdre une place. Merci ${nom}. Tu es ${place}e.`,
  (nom: string) => `${nom} t'a dépassé. Il va falloir faire quelque chose.`,
];

/** Un membre du groupe vient de finir sa séance. */
export const SEANCE_FINIE = [
  (nom: string, reps: number) => `${nom} vient de finir une séance. ${reps} reps.`,
  (nom: string, reps: number) => `${reps} reps pour ${nom}. Et toi, t'as fait quoi ?`,
  (nom: string, reps: number) => `${nom} a posé ${reps} reps. L'info est gratuite.`,
];

/** Quelqu'un a répondu à ton annonce d'échange. */
export const ECHANGE_REPONSE = [
  (nom: string) => `${nom} a répondu à ton annonce. À toi de voir.`,
  (nom: string) => `Proposition de ${nom} sur ton échange. Va regarder.`,
  (nom: string) => `${nom} veut traiter avec toi. Les affaires reprennent.`,
];

/** Tirage au hasard, pour les notifications qui partent à l'instant. */
export function auHasard<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)];
}
