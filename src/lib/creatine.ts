/**
 * Suivi de la prise de créatine, stocké dans `userProgress/{uid}` :
 * `creatineDays` pour les prises, `creatineGels` pour les jours rattrapés.
 *
 * Trois principes :
 *
 * 1. Le streak n'est jamais stocké. On garde la liste des jours cochés et on le
 *    recalcule — c'est la seule façon qu'il ne dérive pas de l'état réel.
 * 2. On passe par `onSnapshot`, et non par une lecture ponctuelle. Le cache
 *    persistant de Firestore répond immédiatement et hors ligne, met les
 *    écritures en file d'attente, et propage la prise aux autres appareils.
 * 3. Les gels sont une liste de jours, comme les prises, et jamais un compteur.
 *    Le quota du mois se recompte depuis cette liste : un compteur se
 *    désynchroniserait du calendrier au premier changement de mois.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../contexts/AuthContext';

/** Anciennes clés locales, lues une seule fois pour la reprise d'historique. */
const LEGACY_DAYS = 'calicrew-creatine-days';
const LEGACY_LAST = 'calicrew-creatine-last';
const LEGACY_STREAK = 'calicrew-creatine-streak';
const LEGACY_TODAY = 'calicrew-creatine';

/** On ne garde pas l'historique complet, un an suffit largement. */
const KEEP_DAYS = 400;

/** Combien de jours oubliés on peut rattraper par mois civil. */
export const GELS_PAR_MOIS = 3;

/**
 * Jusqu'où en arrière un gel peut aller, aujourd'hui exclu.
 *
 * Volontairement court : on oublie de noter un jour ou deux, pas une semaine.
 * Une fenêtre large laisserait reconstruire un streak entier après coup, et le
 * streak ne voudrait plus rien dire.
 */
export const FENETRE_GEL = 3;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Liste vide partagée, pour garder une référence stable entre les rendus. */
const AUCUN: string[] = [];

/**
 * Jour local au format YYYY-MM-DD. Surtout pas `toISOString()` : il renvoie la
 * date UTC, donc entre minuit et 2h à Paris il désigne la veille.
 */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  // Midi en heure locale : aucun risque de retomber sur le même jour lors des
  // changements d'heure.
  return dayKey(new Date(y, m - 1, d + delta, 12));
}

/** Le mois civil d'un jour, au format YYYY-MM : c'est l'unité du quota. */
export function moisDe(key: string): string {
  return key.slice(0, 7);
}

/** Normalise ce qui vient de Firestore : trie, dédoublonne, borne, filtre. */
function clean(days: unknown): string[] {
  const list = Array.isArray(days) ? days : [];
  const cutoff = shiftDay(dayKey(), -KEEP_DAYS);
  return [...new Set(list.filter((d): d is string => typeof d === 'string' && DAY_RE.test(d) && d >= cutoff))]
    .sort()
    .reverse();
}

export function computeStreak(days: string[], today = dayKey()): number {
  const set = new Set(days);
  // Tant que la journée n'est pas finie, ne pas avoir encore coché ne casse
  // pas le streak : on le compte alors depuis la veille.
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;

  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * Les gels encore disponibles pour un mois donné.
 *
 * Le quota est rattaché au mois du jour rattrapé, pas à celui où on clique :
 * sans ça, un oubli du 31 réglé le 1er viderait le quota du mois suivant.
 */
export function gelsRestants(gels: string[], mois: string): number {
  return Math.max(0, GELS_PAR_MOIS - gels.filter((g) => moisDe(g) === mois).length);
}

/** Les jours de la fenêtre qu'un gel pourrait encore couvrir, récents d'abord. */
export function joursRattrapables(days: string[], gels: string[], today = dayKey()): string[] {
  const pris = new Set([...days, ...gels]);
  const sortie: string[] = [];
  for (let i = 1; i <= FENETRE_GEL; i++) {
    const jour = shiftDay(today, -i);
    if (pris.has(jour)) continue;
    if (gelsRestants(gels, moisDe(jour)) <= 0) continue;
    sortie.push(jour);
  }
  return sortie;
}

/** Les gels posés dans la fenêtre, donc encore annulables. */
export function gelsRecents(gels: string[], today = dayKey()): string[] {
  const fenetre = new Set(Array.from({ length: FENETRE_GEL }, (_, i) => shiftDay(today, -(i + 1))));
  return gels.filter((g) => fenetre.has(g));
}

/**
 * Historique local des versions précédentes, qui stockaient soit la liste des
 * jours, soit le couple (dernier jour, streak). Reconstruit la liste pour ne
 * pas faire perdre son streak à un utilisateur qui met l'app à jour.
 */
export function readLegacyDays(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_DAYS);
    if (raw) return clean(JSON.parse(raw));

    const last = localStorage.getItem(LEGACY_LAST) || localStorage.getItem(LEGACY_TODAY);
    if (!last || !DAY_RE.test(last)) return [];

    const stored = parseInt(localStorage.getItem(LEGACY_STREAK) || '1', 10);
    const streak = Math.max(1, Math.min(KEEP_DAYS, Number.isNaN(stored) ? 1 : stored));
    return clean(Array.from({ length: streak }, (_, i) => shiftDay(last, -i)));
  } catch {
    return [];
  }
}

function clearLegacy(): void {
  try {
    for (const k of [LEGACY_DAYS, LEGACY_LAST, LEGACY_STREAK, LEGACY_TODAY]) {
      localStorage.removeItem(k);
    }
  } catch {
    /* mode privé */
  }
}

export interface CreatineState {
  /** Jour local servant de référence, pour détecter le passage à minuit. */
  day: string;
  takenToday: boolean;
  streak: number;
  /** Le streak court mais la prise du jour n'est pas encore faite. */
  pending: boolean;
  /** Avant la première réponse de Firestore (cache compris). */
  loading: boolean;
  /** Gels encore disponibles pour le mois en cours. */
  gelsDispo: number;
  /** Jours oubliés qu'un gel peut encore couvrir, du plus récent au plus vieux. */
  rattrapables: string[];
  /** Gels déjà posés dans la fenêtre, donc encore annulables. */
  poses: string[];
}

/**
 * Jour courant, réévalué au retour sur l'app et au passage de minuit. L'app
 * est une PWA qu'on laisse ouverte : sans ça, la carte resterait bloquée sur
 * « prise aujourd'hui » le lendemain matin.
 */
function useToday(): string {
  const [today, setToday] = useState(dayKey);

  useEffect(() => {
    const check = () => setToday((prev) => (prev === dayKey() ? prev : dayKey()));
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, []);

  return today;
}

export function useCreatine(): CreatineState & { toggle: () => void; rattrape: (jour: string) => void } {
  const { user } = useAuth();
  const today = useToday();
  // L'état porte l'uid qu'il décrit : à la déconnexion on repart donc de
  // `null` sans avoir à le remettre à zéro dans l'effet.
  const [loaded, setLoaded] = useState<{ uid: string; days: string[]; gels: string[] } | null>(null);

  const uid = user?.uid;
  const etat = loaded && loaded.uid === uid ? loaded : null;
  const days = etat?.days ?? null;
  // La même référence quand il n'y a rien : un `[]` neuf à chaque rendu
  // relancerait les mémos qui en dépendent.
  const gels = etat?.gels ?? AUCUN;

  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, 'userProgress', uid);
    let migrated = false;

    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.data();
        const stored = data?.creatineDays;
        // Un gel sur un jour finalement coché n'a plus d'objet : on l'écarte
        // à la lecture plutôt que de laisser deux sources se contredire.
        const prises = clean(stored);
        const gelsLus = clean(data?.creatineGels).filter((g) => !prises.includes(g));

        // Champ absent : première ouverture depuis la bascule sur Firestore.
        // On remonte l'historique local, puis on oublie les anciennes clés.
        if (stored === undefined && !migrated) {
          migrated = true;
          const legacy = readLegacyDays();
          if (legacy.length > 0) {
            setLoaded({ uid, days: legacy, gels: gelsLus });
            setDoc(ref, { creatineDays: legacy }, { merge: true })
              .then(clearLegacy)
              .catch(() => { /* réessayé au prochain snapshot */ });
            return;
          }
          clearLegacy();
        }

        setLoaded({ uid, days: prises, gels: gelsLus });
      },
      (err) => {
        // Hors ligne sans cache, ou règles refusées : on retombe sur
        // l'historique local plutôt que d'afficher un streak nul et faux.
        console.error('Lecture créatine impossible:', err);
        setLoaded({ uid, days: readLegacyDays(), gels: [] });
      }
    );
  }, [uid]);

  const toggle = useCallback(() => {
    if (!uid || days === null) return;
    const next = days.includes(today)
      ? days.filter((d) => d !== today)
      : clean([...days, today]);

    setLoaded({ uid, days: next, gels }); // l'écriture est mise en file si hors ligne
    setDoc(doc(db, 'userProgress', uid), { creatineDays: next }, { merge: true }).catch((err) => {
      console.error('Écriture créatine impossible:', err);
    });
  }, [uid, days, gels, today]);

  /**
   * Pose ou retire un gel sur un jour oublié.
   *
   * Les mêmes règles qu'à l'affichage sont revérifiées ici : le bouton peut
   * avoir été rendu avant minuit et cliqué après, et un quota se vérifie là où
   * il s'écrit.
   */
  const rattrape = useCallback((jour: string) => {
    if (!uid || days === null) return;

    if (gels.includes(jour)) {
      const next = gels.filter((g) => g !== jour);
      setLoaded({ uid, days, gels: next });
      setDoc(doc(db, 'userProgress', uid), { creatineGels: next }, { merge: true }).catch((err) => {
        console.error('Écriture gel impossible:', err);
      });
      return;
    }

    if (!joursRattrapables(days, gels, today).includes(jour)) return;

    const next = clean([...gels, jour]);
    setLoaded({ uid, days, gels: next });
    setDoc(doc(db, 'userProgress', uid), { creatineGels: next }, { merge: true }).catch((err) => {
      console.error('Écriture gel impossible:', err);
    });
  }, [uid, days, gels, today]);

  return useMemo(() => {
    const list = days ?? [];
    const takenToday = list.includes(today);
    // Un jour gelé compte comme tenu : c'est tout l'objet du gel.
    const streak = computeStreak([...list, ...gels], today);
    return {
      day: today,
      takenToday,
      streak,
      pending: !takenToday && streak > 0,
      loading: days === null,
      gelsDispo: gelsRestants(gels, moisDe(today)),
      rattrapables: joursRattrapables(list, gels, today),
      poses: gelsRecents(gels, today),
      toggle,
      rattrape,
    };
  }, [days, gels, today, toggle, rattrape]);
}
