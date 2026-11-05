import type { FaceIdProgress, Quest } from '../types';

export type { FaceIdProgress };

/**
 * Event FaceID — 9 au 30 novembre 2026.
 *
 * Douze membres du groupe, deux cartes chacun, vingt-quatre cartes à
 * rassembler en trois semaines. Tout est à part du pass : ni le même set de
 * cartes, ni les mêmes coffres, ni le même écran. C'est voulu — un event qui
 * ressemble au reste de l'app n'est plus un event.
 */

export const FACEID_DEBUT = new Date(2026, 10, 9, 0, 0, 0).getTime();
export const FACEID_FIN = new Date(2026, 10, 30, 23, 59, 59).getTime();

export interface MembreFaceId {
  /** Sert d'identifiant de carte et de nom de fichier image. */
  slug: string;
  nom: string;
}

/**
 * Le trombinoscope.
 *
 * À compléter avec les douze vrais prénoms. L'ordre fixe l'ordre d'affichage
 * et, surtout, les identifiants des cartes : le changer après le lancement
 * ferait pointer les collections déjà constituées sur les mauvaises têtes.
 * On peut corriger un prénom quand on veut, jamais un slug.
 */
export const MEMBRES: MembreFaceId[] = [
  { slug: 'matteo', nom: 'Mattéo' },
  { slug: 'lucas', nom: 'Lucas' },
  { slug: 'membre-03', nom: 'Membre 3' },
  { slug: 'membre-04', nom: 'Membre 4' },
  { slug: 'membre-05', nom: 'Membre 5' },
  { slug: 'membre-06', nom: 'Membre 6' },
  { slug: 'membre-07', nom: 'Membre 7' },
  { slug: 'membre-08', nom: 'Membre 8' },
  { slug: 'membre-09', nom: 'Membre 9' },
  { slug: 'membre-10', nom: 'Membre 10' },
  { slug: 'membre-11', nom: 'Membre 11' },
  { slug: 'membre-12', nom: 'Membre 12' },
];

export type Face = 'a' | 'b';

export interface CarteFaceId {
  id: string;
  slug: string;
  nom: string;
  face: Face;
  /** Chemin de l'image. Absente tant que les photos ne sont pas fournies. */
  image: string;
}

/** Les vingt-quatre cartes, dans l'ordre du trombinoscope. */
export const CARTES: CarteFaceId[] = MEMBRES.flatMap((m) =>
  (['a', 'b'] as Face[]).map((face) => ({
    id: `fid-${m.slug}-${face}`,
    slug: m.slug,
    nom: m.nom,
    face,
    image: `/faceid/${m.slug}-${face}.webp`,
  }))
);

export const TOTAL_CARTES = CARTES.length;

export function carteParId(id: string): CarteFaceId | undefined {
  return CARTES.find((c) => c.id === id);
}

export function faceLabel(face: Face): string {
  return face === 'a' ? 'Face A' : 'Face B';
}

// ── Progression ──

export const FACEID_VIDE: FaceIdProgress = { cartes: {}, boosters: 0, questsPrises: [] };

export function lisFaceId(brut: FaceIdProgress | undefined): FaceIdProgress {
  return {
    cartes: brut?.cartes || {},
    boosters: brut?.boosters || 0,
    questsPrises: brut?.questsPrises || [],
    bienvenue: brut?.bienvenue,
  };
}

export function nbPossedees(p: FaceIdProgress): number {
  return CARTES.filter((c) => (p.cartes[c.id] || 0) > 0).length;
}

export function collectionComplete(p: FaceIdProgress): boolean {
  return nbPossedees(p) >= TOTAL_CARTES;
}

// ── Boosters ──

export const CARTES_PAR_BOOSTER = 3;

/**
 * Le contenu d'un booster.
 *
 * Tirage sans remise dans ce qui manque, et non au hasard parmi les
 * vingt-quatre : à taux égal avec doublons, rassembler les vingt-quatre
 * demanderait une trentaine de boosters en moyenne — et quarante pour un
 * joueur sur dix. Impossible à distribuer en trois semaines, et surtout
 * pénible : passé la moitié, neuf ouvertures sur dix ne donneraient que des
 * doublons. Ici, huit boosters suffisent, pour tout le monde.
 *
 * Une fois la collection complète, le tirage reprend sur l'ensemble : les
 * boosters suivants ne donnent plus que des doublons, qui ne servent qu'à
 * échanger.
 */
export function tireBooster(p: FaceIdProgress): string[] {
  const manquantes = CARTES.filter((c) => !(p.cartes[c.id] > 0)).map((c) => c.id);
  const pioche = melange(manquantes).slice(0, CARTES_PAR_BOOSTER);

  // Collection presque finie : on complète le sachet avec des doublons, pour
  // qu'un booster fasse toujours trois cartes.
  if (pioche.length < CARTES_PAR_BOOSTER) {
    const reste = melange(CARTES.map((c) => c.id));
    for (const id of reste) {
      if (pioche.length >= CARTES_PAR_BOOSTER) break;
      pioche.push(id);
    }
  }
  return pioche;
}

/** Ajoute les cartes d'un booster ouvert. */
export function ajoute(p: FaceIdProgress, ids: string[]): FaceIdProgress {
  const cartes = { ...p.cartes };
  for (const id of ids) cartes[id] = (cartes[id] || 0) + 1;
  return { ...p, cartes, boosters: Math.max(0, p.boosters - 1) };
}

function melange<T>(liste: T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

// ── Quêtes de l'event ──

/**
 * Les trois semaines qui portent des quêtes.
 *
 * L'event court jusqu'au 30, mais la semaine du 30 ne dure qu'un jour : y
 * poser des quêtes hebdomadaires reviendrait à les offrir ou à les rendre
 * impossibles. Trois semaines, trois quêtes chacune, plus le booster
 * d'ouverture : dix boosters pour huit nécessaires.
 */
export const SEMAINES: number[] = [
  new Date(2026, 10, 9, 10, 0, 0).getTime(),
  new Date(2026, 10, 16, 10, 0, 0).getTime(),
  new Date(2026, 10, 23, 10, 0, 0).getTime(),
];

/**
 * Le vivier.
 *
 * Toutes les quêtes de l'event valent un booster et rien d'autre : pas d'XP,
 * pour qu'elles ne viennent pas déformer la progression du pass. Elles sont
 * les mêmes pour tout le groupe, contrairement aux quêtes hebdomadaires que
 * chacun choisit : un event se raconte, et ça suppose que tout le monde ait
 * eu le même défi dans la semaine.
 */
const VIVIER: Omit<Quest, 'id'>[] = [
  { label: 'Prise d\'empreinte', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 0 },
  { label: 'Relevé complet', description: 'Fais 4 séances cette semaine', target: 4, type: 'sessions', xp: 0 },
  { label: 'Scan intégral', description: 'Fais 400 reps cette semaine', target: 400, type: 'reps', xp: 0 },
  { label: 'Fichage express', description: 'Fais 250 reps cette semaine', target: 250, type: 'reps', xp: 0 },
  { label: 'Garde à vue', description: 'Entraîne-toi 1h au total', target: 3600, type: 'duration', xp: 0 },
  { label: 'Interrogatoire', description: 'Entraîne-toi 45 min au total', target: 2700, type: 'duration', xp: 0 },
  { label: 'Signalement', description: 'Complète 40 séries cette semaine', target: 40, type: 'sets', xp: 0 },
  { label: 'Portrait-robot', description: 'Fais 6 exercices différents', target: 6, type: 'exercises', xp: 0 },
  { label: 'Reconstitution', description: 'Fais 1 AMRAP cette semaine', target: 1, type: 'amrap', xp: 0 },
];

/**
 * Les trois quêtes d'une semaine de l'event.
 *
 * Le vivier compte exactement neuf quêtes pour trois semaines de trois : on
 * le mélange une fois pour toutes, puis chaque semaine prend sa tranche.
 * Aucune quête ne revient deux fois sur l'event — un tirage indépendant par
 * semaine redonnait la même trois semaines de suite.
 *
 * Le mélange est figé dans le code et non tiré au hasard : tout le groupe
 * doit avoir les mêmes quêtes, et un joueur qui recharge la page ne doit pas
 * en voir d'autres.
 */
const ORDRE = [7, 0, 1, 3, 5, 8, 2, 4, 6];

export function questsDeSemaine(indexSemaine: number): Quest[] {
  return ORDRE.slice(indexSemaine * 3, indexSemaine * 3 + 3).map((i) => ({
    ...VIVIER[i],
    id: `fid-s${indexSemaine}-${i}`,
  }));
}

/** L'index de la semaine d'event en cours, ou -1 hors des trois semaines. */
export function semaineCourante(maintenant = Date.now()): number {
  for (let i = SEMAINES.length - 1; i >= 0; i--) {
    if (maintenant >= SEMAINES[i]) return i;
  }
  return -1;
}

export function evenementEnCours(maintenant = Date.now()): boolean {
  return maintenant >= FACEID_DEBUT && maintenant <= FACEID_FIN;
}

/** Jours restants avant la fin, 0 si c'est fini. */
export function joursRestants(maintenant = Date.now()): number {
  return Math.max(0, Math.ceil((FACEID_FIN - maintenant) / (24 * 60 * 60 * 1000)));
}
