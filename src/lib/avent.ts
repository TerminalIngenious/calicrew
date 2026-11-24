import type { AventProgress, Quest, RankBadge } from '../types';

export type { AventProgress };

/**
 * Branlette Estivale — le calendrier de l'avent, du 1er au 25 décembre 2026.
 *
 * Quarante-cinq cartes pour vingt-cinq cases : personne ne peut tout avoir,
 * et surtout personne n'a la même collection le 25 au soir. C'est tout le
 * sujet de l'event — à vingt-cinq cartes pour vingt-cinq cases, tout le monde
 * aurait fini avec le même tas et il n'y aurait rien à échanger.
 *
 * Comme FaceID, l'event est entièrement à part du pass : ses cartes ne sont
 * pas dans les coffres, ses quêtes ne donnent pas d'XP, et sa progression est
 * dans son propre champ de `userProgress`.
 */

export const DEBUT = new Date(2026, 11, 1, 0, 0, 0).getTime();
export const FIN = new Date(2026, 11, 25, 23, 59, 59).getTime();

/** Le nombre de cases. Un calendrier de l'avent, pas un mois. */
export const CASES = 25;

export type RareteAvent = 'commune' | 'rare' | 'epique' | 'legendaire';

export const RARETES: RareteAvent[] = ['legendaire', 'epique', 'rare', 'commune'];

export const LIBELLE_RARETE: Record<RareteAvent, string> = {
  legendaire: 'Légendaire',
  epique: 'Épique',
  rare: 'Rare',
  commune: 'Commune',
};

export const COULEUR_RARETE: Record<RareteAvent, string> = {
  legendaire: '#ffd60a',
  epique: '#bf5af2',
  rare: '#64d2ff',
  commune: '#8e8e93',
};

export interface CarteAvent {
  /** Identifiant et nom de fichier image. Ne change jamais. */
  slug: string;
  nom: string;
  rarete: RareteAvent;
  /** Numéro imprimé sur la carte, de 1 à 45. */
  numero: number;
  /** La photo, dans public/avent/. Absente tant qu'elle n'est pas fournie. */
  image: string;
}

/*
 * Le vivier.
 *
 * L'ordre fixe le numéro imprimé sur les cartes : on peut corriger une
 * orthographe quand on veut, jamais un slug ni une position. Les deux
 * servent d'identifiant, et les changer ferait pointer les collections déjà
 * constituées sur les mauvaises cartes.
 *
 * Les raretés sont un premier jet, réparties sur la notoriété : 5
 * légendaires, 10 épiques, 14 rares, 16 communes. Une ligne à changer si le
 * groupe n'est pas d'accord — et il ne le sera pas.
 */
const VIVIER: [string, string, RareteAvent][] = [
  ['bunny-blue', 'Bunny Blue', 'epique'],
  ['eva-elfie', 'Eva Elfie', 'legendaire'],
  ['sweetie-fox', 'Sweetie Fox', 'legendaire'],
  ['mia-khalifa', 'Mia Khalifa', 'legendaire'],
  ['khalamite', 'Khalamité', 'rare'],
  ['angela-white', 'Angela White', 'epique'],
  ['manuel-ferrara', 'Manuel Ferrara', 'epique'],
  ['gatouzz', 'Gatouzz', 'rare'],
  ['tiffany-leidi', 'Tiffany Leidi', 'rare'],
  ['abella-danger', 'Abella Danger', 'epique'],
  ['lana-rhodes', 'Lana Rhoades', 'legendaire'],
  ['ad-laurent', 'Ad Laurent', 'rare'],
  ['angel-heaven', 'Angel Heaven', 'commune'],
  ['manoah-la-branche', 'Manoah La Branche', 'rare'],
  ['johnny-sins', 'Johnny Sins', 'legendaire'],
  ['jordi-el-nino-polla', 'Jordi El Niño Polla', 'epique'],
  ['keiran-lee', 'Keiran Lee', 'rare'],
  ['violet-myers', 'Violet Myers', 'rare'],
  ['little-angel', 'Little Angel', 'commune'],
  ['mia-malkova', 'Mia Malkova', 'epique'],
  ['carla-vyx', 'Carla Vyx', 'commune'],
  ['aphrodixia', 'Aphrodixia', 'commune'],
  ['comatozze', 'Comatozze', 'rare'],
  ['nicole-aniston', 'Nicole Aniston', 'epique'],
  ['angela-doll', 'Angela Doll', 'commune'],
  ['margot-dulac', 'Margot Dulac', 'rare'],
  ['britney-amber', 'Britney Amber', 'commune'],
  ['danny-d', 'Danny D', 'epique'],
  ['emma-hix', 'Emma Hix', 'commune'],
  ['angel-youngs', 'Angel Youngs', 'commune'],
  ['luxury-girl', 'Luxury Girl', 'rare'],
  ['hayley-davies', 'Hayley Davies', 'commune'],
  ['gabbie-carter', 'Gabbie Carter', 'epique'],
  ['savannah-bond', 'Savannah Bond', 'rare'],
  ['clea-gaultier', 'Clea Gaultier', 'rare'],
  ['autumn-falls', 'Autumn Falls', 'epique'],
  ['ruth-lee', 'Ruth Lee', 'commune'],
  ['hellolimoon', 'Hellolimoon', 'commune'],
  ['lexis-star', 'Lexis Star', 'commune'],
  ['ester-muniz', 'Ester Muniz', 'commune'],
  ['julie-jess', 'Julie Jess', 'rare'],
  ['reislin', 'Reislin', 'rare'],
  ['anastangel', 'Anastangel', 'commune'],
  ['gina-wap', 'Gina Wap', 'commune'],
  ['elly-clutch', 'Elly Clutch', 'commune'],
];

export const CARTES: CarteAvent[] = VIVIER.map(([slug, nom, rarete], i) => ({
  slug,
  nom,
  rarete,
  numero: i + 1,
  image: `/avent/${slug}.webp`,
}));

export const TOTAL_CARTES = CARTES.length;

export function carteParSlug(slug: string): CarteAvent | undefined {
  return CARTES.find((c) => c.slug === slug);
}

// ── Le calendrier de chacun ──

/*
 * La rareté de chaque case.
 *
 * Le calendrier monte : les premiers jours donnent des communes, la dernière
 * semaine des épiques, et les deux dernières cases des légendaires. Un
 * calendrier qui tire au hasard d'un bout à l'autre n'a pas de fin — le 25
 * décembre doit valoir le 25 décembre.
 *
 * Les quantités comptent autant que l'ordre : 8 communes piochées parmi 16,
 * 8 rares parmi 14, 7 épiques parmi 10, 2 légendaires parmi 5. C'est ce qui
 * fait que deux personnes n'ont pas la même collection, et que celles qui
 * manquent à l'un sont justement celles que l'autre a en double.
 */
const PLAN: RareteAvent[] = [
  'commune', 'commune', 'commune', 'commune', 'commune', 'commune', // 1-6
  'rare', 'commune', 'rare', 'commune',                             // 7-10
  'rare', 'rare', 'rare', 'rare', 'epique',                         // 11-15
  'rare', 'epique', 'rare', 'epique', 'epique',                     // 16-20
  'epique', 'epique', 'epique', 'legendaire', 'legendaire',         // 21-25
];

/**
 * Un générateur pseudo-aléatoire semé, pour que le calendrier d'un compte
 * soit toujours le même.
 *
 * Tiré de l'uid et de rien d'autre : pas d'horodatage, pas de `Math.random`.
 * Recalculé à chaque ouverture de la page, il doit redonner exactement la
 * même suite — sinon la case du 12 décembre changerait de carte entre deux
 * visites, et le calendrier déjà ouvert ne voudrait plus rien dire.
 */
function graine(uid: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // mulberry32 : court, sans dépendance, et surtout identique partout.
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function melangeAvec(liste: string[], suivant: () => number): string[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(suivant() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * Les vingt-cinq cartes d'un compte, dans l'ordre des jours.
 *
 * L'index 0 est le 1er décembre.
 */
export function calendrierDe(uid: string): string[] {
  const suivant = graine(uid);
  const restant: Record<RareteAvent, string[]> = {
    commune: [], rare: [], epique: [], legendaire: [],
  };
  // Le mélange se fait rareté par rareté, dans un ordre fixe : mélanger le
  // vivier entier d'abord aurait fait dépendre le tirage des communes du
  // nombre de légendaires, et ajouter une carte plus tard aurait tout décalé.
  for (const r of RARETES) {
    restant[r] = melangeAvec(CARTES.filter((c) => c.rarete === r).map((c) => c.slug), suivant);
  }
  return PLAN.map((r) => restant[r].shift() as string);
}

/** Le numéro du jour ouvrable aujourd'hui, de 0 (rien) à 25. */
export function jourOuvert(maintenant = Date.now()): number {
  if (maintenant < DEBUT) return 0;
  const d = new Date(maintenant);
  if (d.getFullYear() !== 2026 || d.getMonth() !== 11) return maintenant > FIN ? CASES : 0;
  return Math.min(CASES, d.getDate());
}

export function enCours(maintenant = Date.now()): boolean {
  return maintenant >= DEBUT && maintenant <= FIN;
}

// ── Progression ──

export const VIDE: AventProgress = { cartes: {}, portes: [], boosters: 0, questsPrises: [] };

export function lis(brut: AventProgress | undefined): AventProgress {
  return {
    cartes: brut?.cartes || {},
    portes: brut?.portes || [],
    boosters: brut?.boosters || 0,
    questsPrises: brut?.questsPrises || [],
  };
}

export function nbPossedees(p: AventProgress): number {
  return CARTES.filter((c) => (p.cartes[c.slug] || 0) > 0).length;
}

export function collectionComplete(p: AventProgress): boolean {
  return p.portes.length >= CASES;
}

/**
 * Ce que donne un booster : une carte parmi celles qu'on n'a pas.
 *
 * Elle est tirée dans tout le vivier et non dans le calendrier : c'est la
 * seule façon d'obtenir les vingt cartes que son propre calendrier ne
 * donnera jamais, et donc la raison d'aller chercher les quêtes.
 *
 * Collection complète, le booster redonne une carte au hasard — un doublon,
 * qui ne sert plus qu'à échanger.
 */
export function tireBooster(p: AventProgress): string {
  const manquantes = CARTES.filter((c) => !(p.cartes[c.slug] > 0));
  const pioche = manquantes.length ? manquantes : CARTES;
  return pioche[Math.floor(Math.random() * pioche.length)].slug;
}

// ── Les quêtes de l'event ──

/**
 * Les trois semaines qui portent des quêtes.
 *
 * Pas de quatrième : la dernière semaine s'arrête le 25 et ne dure que
 * quatre jours. Y poser des missions hebdomadaires revenait à les offrir ou
 * à les rendre impossibles.
 *
 * 10h et non minuit, comme pour FaceID : c'est l'heure à laquelle la semaine
 * bascule dans le reste de l'app.
 */
export const SEMAINES: number[] = [
  new Date(2026, 11, 1, 10, 0, 0).getTime(),
  new Date(2026, 11, 8, 10, 0, 0).getTime(),
  new Date(2026, 11, 15, 10, 0, 0).getTime(),
];

const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Le vivier de quêtes. Un booster chacune, et zéro XP : l'event ne doit pas
 * venir déformer la progression du pass.
 */
const QUETES: Omit<Quest, 'id'>[] = [
  { label: 'Chauffe de décembre', description: 'Fais 3 séances cette semaine', target: 3, type: 'sessions', xp: 0 },
  { label: 'Marathon du père Noël', description: 'Fais 5 séances cette semaine', target: 5, type: 'sessions', xp: 0 },
  { label: 'Bûche et biceps', description: 'Fais 400 reps cette semaine', target: 400, type: 'reps', xp: 0 },
  { label: 'Hotte bien remplie', description: 'Fais 250 reps cette semaine', target: 250, type: 'reps', xp: 0 },
  { label: 'Nuit du 24', description: 'Entraîne-toi 1h au total', target: 3600, type: 'duration', xp: 0 },
  { label: 'Veillée', description: 'Entraîne-toi 45 min au total', target: 2700, type: 'duration', xp: 0 },
  { label: 'Guirlande de séries', description: 'Complète 40 séries cette semaine', target: 40, type: 'sets', xp: 0 },
  { label: 'Sapin décoré', description: 'Fais 6 exercices différents', target: 6, type: 'exercises', xp: 0 },
  { label: 'Traîneau lancé', description: 'Fais 1 AMRAP cette semaine', target: 1, type: 'amrap', xp: 0 },
];

/*
 * Le mélange est figé dans le code, pas tiré au hasard : tout le groupe doit
 * avoir les mêmes missions, et recharger la page ne doit pas en changer.
 */
const ORDRE = [0, 3, 8, 2, 6, 5, 1, 7, 4];

export function quetesDeSemaine(index: number): Quest[] {
  return ORDRE.slice(index * 3, index * 3 + 3).map((i) => ({
    ...QUETES[i],
    id: `avt-s${index}-${i}`,
  }));
}

/** L'index de la semaine en cours, ou -1 en dehors. */
export function semaineCourante(maintenant = Date.now()): number {
  for (let i = SEMAINES.length - 1; i >= 0; i--) {
    if (maintenant >= SEMAINES[i]) {
      return maintenant < SEMAINES[i] + SEMAINE_MS ? i : -1;
    }
  }
  return -1;
}

// ── Le badge ──

export const BADGE_ID = 'event-avent';

/** Le badge des vingt-cinq portes. Il ne se regagne pas. */
export function badgeAvent(maintenant = Date.now()): RankBadge {
  return {
    id: BADGE_ID,
    kind: 'event',
    eventId: 'avent',
    category: 'reps',
    rank: 0,
    monthKey: '2026-12',
    seasonId: '',
    seasonName: 'Événement',
    groupName: '',
    earnedAt: maintenant,
  };
}
