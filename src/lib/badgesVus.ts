/**
 * Les badges déjà annoncés, par joueur.
 *
 * Firestore dit ce qui est gagné, pas ce qui a été vu. Sans cette trace,
 * l'animation se rejouerait à chaque ouverture pour les mêmes badges.
 *
 * Le stockage est local et non dans la progression : c'est une information
 * de cet appareil-ci, pas du joueur. Qui gagne un badge sur son téléphone
 * puis ouvre l'app sur un autre a le droit de revoir l'animation une fois.
 */
const CLE = 'calicrew-badges-vus';

function cle(uid: string): string {
  return `${CLE}-${uid}`;
}

export function lisBadgesVus(uid: string): Set<string> | null {
  try {
    const brut = localStorage.getItem(cle(uid));
    // null et non un ensemble vide : la distinction est tout l'intérêt. Un
    // ensemble vide annoncerait les badges déjà gagnés depuis des mois.
    if (brut === null) return null;
    return new Set(JSON.parse(brut) as string[]);
  } catch {
    return null;
  }
}

export function ecrisBadgesVus(uid: string, ids: Iterable<string>): void {
  try {
    localStorage.setItem(cle(uid), JSON.stringify([...ids]));
  } catch {
    // Navigation privée, quota plein : l'animation se rejouera, sans plus.
  }
}
