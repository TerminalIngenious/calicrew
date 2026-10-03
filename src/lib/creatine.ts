/**
 * Suivi de la prise de créatine, stocké dans `userProgress/{uid}.creatineDays`.
 *
 * Deux principes :
 *
 * 1. Le streak n'est jamais stocké. On garde la liste des jours cochés et on le
 *    recalcule — c'est la seule façon qu'il ne dérive pas de l'état réel.
 * 2. On passe par `onSnapshot`, et non par une lecture ponctuelle. Le cache
 *    persistant de Firestore répond immédiatement et hors ligne, met les
 *    écritures en file d'attente, et propage la prise aux autres appareils.
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

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export function useCreatine(): CreatineState & { toggle: () => void } {
  const { user } = useAuth();
  const today = useToday();
  const [days, setDays] = useState<string[] | null>(null);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setDays(null);
      return;
    }

    const ref = doc(db, 'userProgress', uid);
    let migrated = false;

    return onSnapshot(
      ref,
      (snap) => {
        const stored = snap.data()?.creatineDays;

        // Champ absent : première ouverture depuis la bascule sur Firestore.
        // On remonte l'historique local, puis on oublie les anciennes clés.
        if (stored === undefined && !migrated) {
          migrated = true;
          const legacy = readLegacyDays();
          if (legacy.length > 0) {
            setDays(legacy);
            setDoc(ref, { creatineDays: legacy }, { merge: true })
              .then(clearLegacy)
              .catch(() => { /* réessayé au prochain snapshot */ });
            return;
          }
          clearLegacy();
        }

        setDays(clean(stored));
      },
      (err) => {
        // Hors ligne sans cache, ou règles refusées : on retombe sur
        // l'historique local plutôt que d'afficher un streak nul et faux.
        console.error('Lecture créatine impossible:', err);
        setDays(readLegacyDays());
      }
    );
  }, [uid]);

  const toggle = useCallback(() => {
    if (!uid || days === null) return;
    const next = days.includes(today)
      ? days.filter((d) => d !== today)
      : clean([...days, today]);

    setDays(next); // l'écriture est mise en file si on est hors ligne
    setDoc(doc(db, 'userProgress', uid), { creatineDays: next }, { merge: true }).catch((err) => {
      console.error('Écriture créatine impossible:', err);
    });
  }, [uid, days, today]);

  return useMemo(() => {
    const list = days ?? [];
    const takenToday = list.includes(today);
    const streak = computeStreak(list, today);
    return {
      day: today,
      takenToday,
      streak,
      pending: !takenToday && streak > 0,
      loading: days === null,
      toggle,
    };
  }, [days, today, toggle]);
}
