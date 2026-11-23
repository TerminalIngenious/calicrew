/**
 * Le récap du mois d'un joueur.
 *
 * Tout le calcul est ici, sans Firestore et sans HTML : on lui donne des
 * séances et une progression, il rend des chiffres. C'est la partie qu'on
 * peut vérifier sans envoyer un seul mail.
 *
 * Le mail part le 1er et parle du mois qui vient de finir : un récap envoyé
 * le 31 au soir raterait la séance du 31.
 */

import { repsDeSeance } from './groupe.js';

export interface SeanceBrute extends Record<string, unknown> {
  userId?: string;
  date?: string;
  createdAt?: number;
  duration?: number;
}

export interface Recap {
  uid: string;
  nom: string;
  mois: string;
  moisNom: string;
  seances: number;
  reps: number;
  secondes: number;
  joursActifs: number;
  joursDuMois: number;
  /** Plus longue suite de jours consécutifs avec au moins une séance. */
  serie: number;
  meilleurJour: { jour: string; reps: number; seances: number } | null;
  topExos: { nom: string; valeur: number; unite: 'reps' | 'secondes' }[];
  /** Le même mois, un mois plus tôt. Pour dire si ça monte ou si ça tombe. */
  veille: { seances: number; reps: number };
  creatine: { coches: number; gels: number } | null;
  pas: { total: number; meilleur: number } | null;
  cartes: number;
  /** Jour de la dernière séance, toutes périodes confondues. */
  derniere: string | null;
  niveau: number;
  place: number | null;
  rivaux: number;
  titre: { nom: string; phrase: string };
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Le mois qui précède celui de `maintenant`, au format YYYY-MM. */
export function moisPrecedent(maintenant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit',
  }).formatToParts(maintenant);
  const an = Number(parts.find((p) => p.type === 'year')?.value);
  const mois = Number(parts.find((p) => p.type === 'month')?.value);
  return mois === 1 ? `${an - 1}-12` : `${an}-${String(mois - 1).padStart(2, '0')}`;
}

export function nomDuMois(mois: string): string {
  return MOIS_FR[Number(mois.slice(5, 7)) - 1] || mois;
}

/** « d'octobre », « de novembre » : l'élision devant une voyelle. */
export function duMois(mois: string): string {
  const nom = nomDuMois(mois);
  return /^[aeiouâéèêîôû]/i.test(nom) ? `d\u2019${nom}` : `de ${nom}`;
}

export function moisAvant(mois: string): string {
  const an = Number(mois.slice(0, 4));
  const m = Number(mois.slice(5, 7));
  return m === 1 ? `${an - 1}-12` : `${an}-${String(m - 1).padStart(2, '0')}`;
}

function joursDans(mois: string): number {
  return new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0).getDate();
}

/**
 * Le jour local d'une séance.
 *
 * Son champ `date` fait foi quand il existe : il a été écrit sur place, à
 * l'heure de la personne. `createdAt` ne sert que de secours, et il est en
 * UTC — à une heure du matin il désigne la veille.
 */
function jourDe(s: SeanceBrute): string {
  if (typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date)) return s.date;
  const quand = s.createdAt || 0;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(quand));
}

/** La plus longue suite de jours consécutifs présents dans l'ensemble. */
function plusLongueSerie(jours: Set<string>): number {
  let record = 0;
  for (const jour of jours) {
    const [a, m, j] = jour.split('-').map(Number);
    // On ne compte qu'à partir du premier jour d'une suite : sinon chaque
    // jour relancerait le même décompte et le coût serait quadratique.
    const veille = new Date(Date.UTC(a, m - 1, j - 1)).toISOString().slice(0, 10);
    if (jours.has(veille)) continue;
    let longueur = 0;
    let curseur = jour;
    while (jours.has(curseur)) {
      longueur += 1;
      const [x, y, z] = curseur.split('-').map(Number);
      curseur = new Date(Date.UTC(x, y - 1, z + 1)).toISOString().slice(0, 10);
    }
    if (longueur > record) record = longueur;
  }
  return record;
}

/** Secondes d'un exercice en unité de temps, reps sinon. */
function detaille(s: SeanceBrute): { nom: string; valeur: number; unite: 'reps' | 'secondes' }[] {
  const exercices = (s.exercises as Record<string, unknown>[] | undefined) || [];
  return exercices.map((ex) => ({
    nom: String(ex.exerciseName || 'Exercice'),
    valeur: ((ex.sets as { reps?: number; completed?: boolean }[] | undefined) || [])
      .reduce((n, set) => n + (set.completed ? set.reps || 0 : 0), 0),
    unite: ex.unit === 'seconds' ? ('secondes' as const) : ('reps' as const),
  }));
}

/**
 * Le titre du mois.
 *
 * Les règles sont lues dans l'ordre, la première qui s'applique gagne : le
 * but est qu'une personne se reconnaisse, pas qu'on lui empile cinq
 * étiquettes. Elles sont écrites du cas le plus marquant au plus banal.
 */
function titreDuMois(r: Omit<Recap, 'titre'>): { nom: string; phrase: string } {
  const heures = r.secondes / 3600;
  const parSeance = r.seances > 0 ? r.secondes / r.seances : 0;

  if (r.seances === 0) {
    return {
      nom: 'Le Fantôme',
      phrase: 'Zéro séance. On a vérifié deux fois, on a même rafraîchi la page. Rien. Le mois prochain existe, lui aussi.',
    };
  }
  if (r.place === 1) {
    return {
      nom: 'Le Patron du mois',
      phrase: 'Premier du groupe. Personne n’a rien à dire, et c’est bien ça le pire pour eux.',
    };
  }
  if (r.serie >= 7) {
    return {
      nom: 'La Machine',
      phrase: `${r.serie} jours d’affilée. À ce stade ce n’est plus de la motivation, c’est un problème. Continue.`,
    };
  }
  if (r.joursActifs >= 15) {
    return {
      nom: 'Le Forçat',
      phrase: `${r.joursActifs} jours sur ${r.joursDuMois}. Un mois sur deux passé à transpirer. Le canapé a porté plainte.`,
    };
  }
  if (r.seances >= 12) {
    return {
      nom: 'L\u2019Assidu',
      phrase: `${r.seances} séances en un mois. Ce n\u2019est plus un passe-temps, c\u2019est un emploi du temps.`,
    };
  }
  if (heures >= 15) {
    return {
      nom: 'Le Marathonien',
      phrase: `${Math.round(heures)} heures de sport ce mois-ci. C’est deux journées de travail, sauf que personne ne te paie.`,
    };
  }
  if (parSeance >= 4800) {
    return {
      nom: 'Le Patient',
      phrase: 'Tes séances durent une éternité. On ne sait pas si tu t’entraînes ou si tu habites là-bas.',
    };
  }
  if (r.reps >= 2000) {
    return {
      nom: 'La Machine à reps',
      phrase: `${r.reps} répétitions. Quelqu’un a compté. C’était nous. On a eu mal au poignet.`,
    };
  }
  /* Reps basses et séances nombreuses : la personne compte en minutes, pas
     en répétitions — course, gainage, étirements. La féliciter sur ses reps
     serait à côté de la plaque. */
  if (r.seances >= 5 && r.reps / r.seances < 25) {
    return {
      nom: 'L\u2019Endurant',
      phrase: 'Tes séances ne se comptent pas en répétitions mais en minutes. C\u2019est une autre école, et elle fait mal aussi.',
    };
  }
  if (r.seances <= 2) {
    return {
      nom: 'L’Intermittent',
      phrase: `${r.seances} séance${r.seances > 1 ? 's' : ''} ce mois-ci. C’est plus que zéro, et on ne dira rien de plus.`,
    };
  }
  if (r.veille.seances > 0 && r.seances > r.veille.seances) {
    return {
      nom: 'En Progression',
      phrase: `${r.seances} séances contre ${r.veille.seances} le mois d’avant. La courbe monte, ne la regarde pas trop fort.`,
    };
  }
  return {
    nom: 'Le Régulier',
    phrase: 'Rien de spectaculaire, rien à redire. C’est exactement comme ça qu’on progresse, même si ça ne fait pas une belle histoire.',
  };
}

export interface EntreeRecap {
  uid: string;
  nom: string;
  seances: SeanceBrute[];
  progress: Record<string, unknown>;
}

/**
 * Les récaps de tout un groupe d'un coup.
 *
 * Ensemble et non un par un, parce que le classement du mois n'a de sens
 * qu'entre gens qui se connaissent : il faut les avoir tous sous la main.
 */
export function calculeRecaps(entrees: EntreeRecap[], mois: string): Recap[] {
  const veille = moisAvant(mois);
  const jours = joursDans(mois);

  const bruts = entrees.map((e) => {
    const duMois = e.seances.filter((s) => s.completed && jourDe(s).startsWith(mois));
    const duVeille = e.seances.filter((s) => s.completed && jourDe(s).startsWith(veille));

    const parJour = new Map<string, { reps: number; seances: number }>();
    const parExo = new Map<string, { valeur: number; unite: 'reps' | 'secondes' }>();
    let reps = 0;
    let secondes = 0;

    for (const s of duMois) {
      const jour = jourDe(s);
      const r = repsDeSeance(s);
      reps += r;
      secondes += (s.duration as number) || 0;
      const avant = parJour.get(jour) || { reps: 0, seances: 0 };
      parJour.set(jour, { reps: avant.reps + r, seances: avant.seances + 1 });
      for (const ex of detaille(s)) {
        if (ex.valeur <= 0) continue;
        const cumul = parExo.get(ex.nom);
        // L'unité vient du premier passage : un même nom d'exercice ne change
        // pas d'unité d'une séance à l'autre.
        parExo.set(ex.nom, { valeur: (cumul?.valeur || 0) + ex.valeur, unite: cumul?.unite || ex.unite });
      }
    }

    /* Jamais une séance postérieure au mois raconté : le mail part le 1er,
       mais un aperçu demandé plus tard ne doit pas annoncer une séance que
       le destinataire n'avait pas encore faite. */
    const finies = e.seances
      .filter((s) => s.completed)
      .map(jourDe)
      .filter((j) => j.slice(0, 7) <= mois)
      .sort();
    const meilleur = [...parJour.entries()].sort((a, b) => b[1].reps - a[1].reps)[0];
    const creatineDays = (e.progress.creatineDays as string[] | undefined) || [];
    const creatineGels = (e.progress.creatineGels as string[] | undefined) || [];
    const coches = creatineDays.filter((d) => d.startsWith(mois)).length;
    const gels = creatineGels.filter((d) => d.startsWith(mois)).length;
    const pasJours = (e.progress.pasJours as Record<string, number> | undefined) || {};
    const pasDuMois = Object.entries(pasJours).filter(([j]) => j.startsWith(mois)).map(([, n]) => n);

    return {
      uid: e.uid,
      nom: e.nom,
      mois,
      moisNom: nomDuMois(mois),
      seances: duMois.length,
      reps,
      secondes,
      joursActifs: parJour.size,
      joursDuMois: jours,
      serie: plusLongueSerie(new Set(parJour.keys())),
      meilleurJour: meilleur ? { jour: meilleur[0], reps: meilleur[1].reps, seances: meilleur[1].seances } : null,
      topExos: [...parExo.entries()]
        .map(([nom, v]) => ({ nom, valeur: v.valeur, unite: v.unite }))
        .sort((a, b) => b.valeur - a.valeur)
        .slice(0, 3),
      veille: {
        seances: duVeille.length,
        reps: duVeille.reduce((n, s) => n + repsDeSeance(s), 0),
      },
      creatine: coches > 0 || gels > 0 ? { coches, gels } : null,
      pas: pasDuMois.length > 0
        ? { total: pasDuMois.reduce((a, b) => a + b, 0), meilleur: Math.max(...pasDuMois) }
        : null,
      /* Seuls les identifiants d'une vraie carte comptent : la base garde
         une clé parasite d'une ancienne version, et elle faisait afficher
         une carte de plus que ce que l'app montre. */
      cartes: Object.entries((e.progress.ownedCards as Record<string, number> | undefined) || {})
        .filter(([id, n]) => n > 0 && /^(s\d+-|ig-)/.test(id)).length,
      derniere: finies.length > 0 ? finies[finies.length - 1] : null,
      niveau: 0,
      place: null as number | null,
      rivaux: 0,
    };
  });

  /* Le classement ne compte que ceux qui ont bougé : finir 12e sur 25 quand
     dix n'ont rien fait du mois n'apprend rien à personne. */
  const actifs = bruts.filter((b) => b.seances > 0).sort((a, b) => b.reps - a.reps);
  for (const b of bruts) {
    b.rivaux = actifs.length;
    const rang = actifs.findIndex((a) => a.uid === b.uid);
    b.place = rang >= 0 ? rang + 1 : null;
  }

  return bruts.map((b) => ({ ...b, titre: titreDuMois(b) }));
}
