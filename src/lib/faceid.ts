import type { FaceIdProgress, Quest, RankBadge } from '../types';

export type { FaceIdProgress };

/**
 * Event FaceID — 9 au 30 novembre 2026.
 *
 * Dix-huit membres du groupe, deux cartes chacun, trente-six cartes à
 * rassembler en trois semaines. Tout est à part du pass : ni le même set de
 * cartes, ni les mêmes coffres, ni le même écran. C'est voulu — un event qui
 * ressemble au reste de l'app n'est plus un event.
 */

/*
 * L'ouverture est calée sur 10h et non sur minuit : c'est l'heure à laquelle
 * `getWeekStart()` fait basculer la semaine, donc celle où arrivent les
 * nouvelles quêtes hebdomadaires. À minuit, l'event se serait allumé dix
 * heures avant ses propres missions, et le lundi matin aurait montré un
 * événement sans rien à y faire.
 */
export const FACEID_DEBUT = new Date(2026, 10, 9, 10, 0, 0).getTime();
export const FACEID_FIN = new Date(2026, 10, 30, 23, 59, 59).getTime();

export interface MembreFaceId {
  /** Sert d'identifiant de carte et de nom de fichier image. */
  slug: string;
  nom: string;
}

/**
 * Le trombinoscope.
 *
 * L'ordre fixe l'ordre d'affichage et, surtout, le numéro imprimé sur les
 * cartes. On peut corriger un prénom quand on veut, jamais un slug : il sert
 * d'identifiant de carte, et le changer ferait pointer les collections déjà
 * constituées sur les mauvaises têtes.
 *
 * Les six derniers sont arrivés après le lancement, et c'est pour ça qu'ils
 * sont à la fin plutôt qu'à leur place alphabétique : ajoutés au milieu, ils
 * auraient décalé les numéros de tous les suivants, déjà imprimés sur des
 * cartes distribuées.
 */
export const MEMBRES: MembreFaceId[] = [
  { slug: 'tristan', nom: 'Tristan' },
  { slug: 'matteo', nom: 'Mattéo' },
  { slug: 'colinne', nom: 'Colinne' },
  // Mattéo et Matéo sont deux personnes différentes : deux slugs, et surtout
  // pas de correction orthographique bien intentionnée.
  { slug: 'mateo', nom: 'Matéo' },
  { slug: 'marcus', nom: 'Marcus' },
  { slug: 'lucas', nom: 'Lucas' },
  { slug: 'johan', nom: 'Johan' },
  { slug: 'jimmy', nom: 'Jimmy' },
  { slug: 'hugo', nom: 'Hugo' },
  { slug: 'clement', nom: 'Clément' },
  { slug: 'bastien', nom: 'Bastien' },
  { slug: 'alexandre', nom: 'Alexandre' },
  { slug: 'elias', nom: 'Elias' },
  { slug: 'marina', nom: 'Marina' },
  { slug: 'enthony', nom: 'Enthony' },
  { slug: 'boris', nom: 'Boris' },
  { slug: 'maddy', nom: 'Maddy' },
  { slug: 'kathiana', nom: 'Kathiana' },
];

export type Face = 'a' | 'b';

/** Les cinq statistiques, dans l'ordre où elles sont imprimées. */
export const STATS = ['Gainage', 'Régularité', 'Explosivité', 'Ego', 'Excuses'] as const;

export interface CarteFaceId {
  id: string;
  slug: string;
  nom: string;
  face: Face;
  /** Numéro imprimé sur la carte, de 1 à 36. */
  numero: number;
  /** La photo détourée. Absente tant qu'elle n'est pas fournie. */
  image: string;
  /** Le surnom imprimé sous le prénom — différent d'une face à l'autre. */
  surnom: string;
  /** La note globale, sur 100. */
  note: number;
  /** Les cinq valeurs, dans l'ordre de STATS. */
  stats: number[];
  /** Libellés propres à la carte, quand elle ne suit pas STATS. */
  libelles?: string[];
}

/**
 * Ce qui est imprimé sur chaque carte.
 *
 * Les deux faces d'une même personne n'ont rien en commun sauf le prénom :
 * c'est justement le sujet de l'event. Face A flatte, Face B accable — et la
 * dernière statistique, « Excuses », s'inverse d'une face à l'autre. C'est
 * elle qui fait la blague, donc elle est toujours en dernier, à la place où
 * l'œil termine sa lecture.
 *
 * Tableau à remplir avec les vrais surnoms et les vraies valeurs. Les cartes
 * non renseignées prennent les valeurs ci-dessous, pour que la mise en page
 * reste vérifiable avant que tout soit écrit.
 */
export interface ArtFaceId {
  surnom: string;
  note: number;
  stats: number[];
  /*
   * Les cinq libellés, quand la carte remplace ceux de STATS.
   *
   * Une personne peut avoir une blague qui lui est propre et qui ne tient
   * pas dans « Explosivité ». Les deux faces changent alors ensemble : lire
   * les mêmes lignes de part et d'autre est ce qui rend la comparaison
   * drôle.
   */
  libelles?: string[];
}

/*
 * Les valeurs d'attente.
 *
 * Le surnom est vide et non inventé : une carte sans surnom n'en affiche
 * pas, alors qu'un surnom bouche-trou se retrouverait sur le téléphone de
 * tout le monde le temps que le vrai arrive.
 */
const ART_PAR_DEFAUT: Record<Face, ArtFaceId> = {
  a: { surnom: '', note: 80, stats: [70, 70, 70, 70, 30] },
  b: { surnom: '', note: 70, stats: [60, 60, 60, 80, 80] },
};

/**
 * Ce qui est imprimé sur chaque carte, à compléter au fur et à mesure.
 *
 * Les notes et les statistiques restent à écrire : celles qui s'affichent
 * aujourd'hui sont des valeurs d'attente, identiques pour tout le monde.
 */
/** Colinne échange Régularité et Explosivité contre Beauté et Drôle. */
const COLINNE_STATS = ['Gainage', 'Beauté', 'Drôle', 'Ego', 'Excuses'];

export const ART: Record<string, ArtFaceId> = {
  // Tristan
  'fid-tristan-a': { surnom: 'Bosseur', note: 84, stats: [72, 92, 82, 86, 23] },
  'fid-tristan-b': { surnom: 'Maître Shifumi', note: 59, stats: [62, 51, 56, 92, 86] },

  // Mattéo
  'fid-matteo-a': { surnom: 'Chill Guy', note: 77, stats: [78, 76, 70, 74, 17] },
  'fid-matteo-b': { surnom: 'Drag Queen', note: 64, stats: [54, 65, 64, 83, 93] },

  // Colinne
  'fid-colinne-a': { surnom: 'Pipou', note: 86, stats: [90, 98, 100, 57, 23],
                     libelles: COLINNE_STATS },
  'fid-colinne-b': { surnom: 'Sous Gêne Asiatique', note: 55, stats: [68, 12, 97, 88, 89],
                     libelles: COLINNE_STATS },

  // Matéo
  'fid-mateo-a': { surnom: 'Sous Fête', note: 82, stats: [78, 79, 85, 80, 10] },
  'fid-mateo-b': { surnom: 'Sous Alcool', note: 59, stats: [64, 50, 57, 90, 95] },

  // Marcus
  'fid-marcus-a': { surnom: 'Restau Chill', note: 78, stats: [75, 93, 69, 78, 29] },
  'fid-marcus-b': { surnom: 'Demonic Form', note: 57, stats: [56, 55, 51, 82, 88] },

  // Lucas
  'fid-lucas-a': { surnom: 'Ciao Energy', note: 76, stats: [82, 71, 72, 60, 22] },
  'fid-lucas-b': { surnom: '0% Travail', note: 65, stats: [65, 60, 59, 91, 91] },

  // Johan
  'fid-johan-a': { surnom: 'Entrepreneur Entreprenant', note: 87, stats: [86, 89, 89, 69, 8] },
  'fid-johan-b': { surnom: 'Colère', note: 54, stats: [59, 48, 48, 90, 96] },

  // Jimmy
  'fid-jimmy-a': { surnom: '', note: 85, stats: [89, 75, 88, 70, 28] },
  'fid-jimmy-b': { surnom: '', note: 61, stats: [54, 59, 67, 91, 93] },

  // Hugo
  'fid-hugo-a': { surnom: 'Vacancier', note: 77, stats: [78, 79, 70, 58, 26] },
  'fid-hugo-b': { surnom: 'Batman Form', note: 56, stats: [47, 56, 57, 92, 86] },

  // Clément
  'fid-clement-a': { surnom: '', note: 81, stats: [90, 85, 69, 71, 20] },
  'fid-clement-b': { surnom: 'Très Gros Plan', note: 55, stats: [60, 54, 46, 89, 96] },

  // Bastien
  'fid-bastien-a': { surnom: 'Mewing', note: 86, stats: [83, 87, 78, 72, 30] },
  'fid-bastien-b': { surnom: 'Kawai', note: 67, stats: [65, 63, 63, 98, 93] },

  // Alexandre
  'fid-alexandre-a': { surnom: '360p', note: 73, stats: [69, 75, 73, 84, 14] },
  'fid-alexandre-b': { surnom: 'Full Dents', note: 55, stats: [52, 45, 50, 86, 91] },

  // Elias
  'fid-elias-a': { surnom: 'Dormeur', note: 79, stats: [76, 82, 74, 63, 24] },
  'fid-elias-b': { surnom: 'Randonnée', note: 61, stats: [66, 57, 60, 85, 90] },

  // Marina
  'fid-marina-a': { surnom: 'Mog', note: 80, stats: [77, 83, 76, 70, 21] },
  'fid-marina-b': { surnom: 'Solide sur les appuis', note: 62, stats: [74, 55, 58, 84, 89] },

  // Enthony
  'fid-enthony-a': { surnom: 'CEO', note: 85, stats: [81, 88, 83, 80, 12] },
  'fid-enthony-b': { surnom: 'Allumer le feu', note: 60, stats: [58, 54, 62, 95, 87] },

  // Boris
  'fid-boris-a': { surnom: 'Je sais', note: 83, stats: [80, 85, 79, 76, 18] },
  'fid-boris-b': { surnom: 'Mangeur d\'âme', note: 58, stats: [57, 52, 55, 94, 88] },

  // Maddy
  'fid-maddy-a': { surnom: 'Baddies', note: 82, stats: [78, 84, 80, 81, 16] },
  'fid-maddy-b': { surnom: 'Sarouel', note: 59, stats: [60, 53, 57, 88, 92] },

  // Kathiana
  'fid-kathiana-a': { surnom: 'Queen', note: 84, stats: [79, 86, 81, 83, 19] },
  'fid-kathiana-b': { surnom: 'Rockstar', note: 63, stats: [61, 58, 66, 93, 85] },
};

/** Les trente-six cartes, dans l'ordre du trombinoscope. */
export const CARTES: CarteFaceId[] = MEMBRES.flatMap((m, i) =>
  (['a', 'b'] as Face[]).map((face, j) => {
    const id = `fid-${m.slug}-${face}`;
    const art = ART[id] || ART_PAR_DEFAUT[face];
    return {
      id,
      slug: m.slug,
      nom: m.nom,
      face,
      numero: i * 2 + j + 1,
      image: `/faceid/${m.slug}-${face}.webp`,
      surnom: art.surnom,
      note: art.note,
      stats: art.stats,
      libelles: art.libelles,
    };
  })
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
    rattrapage: brut?.rattrapage,
  };
}

export function nbPossedees(p: FaceIdProgress): number {
  return CARTES.filter((c) => (p.cartes[c.id] || 0) > 0).length;
}

export function collectionComplete(p: FaceIdProgress): boolean {
  return nbPossedees(p) >= TOTAL_CARTES;
}

// ── Boosters ──

/**
 * Le nombre de cartes par sachet.
 *
 * Trois au lancement, quand le fichier comptait vingt-quatre visages. Passé
 * à trente-six, trois ne suffisait plus : il aurait fallu douze boosters
 * pour onze distribuables, donc une collection impossible à boucler. Quatre
 * ramène le nécessaire à neuf et rend sa marge à l'event.
 */
export const CARTES_PAR_BOOSTER = 4;

/**
 * Les boosters offerts à la première visite.
 *
 * Deux et non un : huit cartes d'un coup font comprendre l'event en une
 * minute, là où un seul sachet laisse sur sa faim.
 */
export const BOOSTERS_OUVERTURE = 2;

/**
 * Le booster de rattrapage, donné une fois à tout le monde.
 *
 * L'event s'est agrandi en cours de route : six personnes de plus, douze
 * cartes de plus, alors que les boosters d'ouverture étaient déjà ouverts
 * pour la plupart. Sans eux, qui avait ouvert ses deux sachets à trois
 * cartes se retrouvait avec trente cartes à trouver pour neuf missions,
 * soit une mission de marge. Avec eux, tout le monde retrouve les trois
 * missions de marge d'avant l'agrandissement, quel que soit le moment où il
 * est entré.
 */
export const BOOSTERS_RATTRAPAGE = 2;

/**
 * Le contenu d'un booster.
 *
 * Tirage sans remise dans ce qui manque, et non au hasard parmi les
 * trente-six : à taux égal avec doublons, tout rassembler demanderait
 * cent cinquante cartes en moyenne. Impossible à distribuer en trois
 * semaines, et surtout pénible : passé la moitié, neuf ouvertures sur dix ne
 * donneraient que des doublons. Ici, neuf boosters suffisent, pour tout le
 * monde.
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
 * impossibles. Trois semaines, trois missions chacune, plus les deux
 * boosters d'ouverture et les deux de rattrapage : treize pour neuf
 * nécessaires.
 */
export const SEMAINES: number[] = [
  FACEID_DEBUT,
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

const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * L'index de la semaine d'event en cours, ou -1 hors des trois semaines.
 *
 * La borne haute compte autant que la basse : l'event court jusqu'au 30, mais
 * la dernière semaine de missions s'achève le 29. Sans elle, le 30 affichait
 * encore les missions de la semaine écoulée, avec des compteurs figés que
 * plus aucune séance ne faisait bouger.
 */
export function semaineCourante(maintenant = Date.now()): number {
  for (let i = SEMAINES.length - 1; i >= 0; i--) {
    if (maintenant >= SEMAINES[i]) {
      return maintenant < SEMAINES[i] + SEMAINE_MS ? i : -1;
    }
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

// ── Le badge ──

/** Identifiant du badge de l'event. Un seul, et il ne se regagne pas. */
export const BADGE_ID = 'event-faceid';

/**
 * Le badge de fin.
 *
 * Il rejoint les badges de classement du profil, mais il n'a ni podium ni
 * groupe : on ne le gagne pas en finissant devant quelqu'un, mais en allant
 * au bout des trente-six. `category` et `rank` ne sont là que parce que le
 * type est partagé — rien ne les lit pour un badge d'événement.
 */
export function badgeFaceId(maintenant = Date.now()): RankBadge {
  return {
    id: BADGE_ID,
    kind: 'event',
    eventId: 'faceid',
    category: 'reps',
    rank: 0,
    monthKey: '2026-11',
    seasonId: '',
    seasonName: 'Événement',
    groupName: '',
    earnedAt: maintenant,
  };
}
