/**
 * Suivi de la prise de créatine.
 *
 * Le streak n'est jamais stocké : on garde la liste des jours cochés et on le
 * recalcule. C'est la seule façon qu'il ne dérive pas — l'ancienne version
 * gardait un compteur à part, et décocher ou sauter trois jours le laissait
 * afficher une valeur fausse.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'calicrew-creatine-days';
const LEGACY_LAST = 'calicrew-creatine-last';
const LEGACY_STREAK = 'calicrew-creatine-streak';
const LEGACY_TODAY = 'calicrew-creatine';

/** On ne garde pas l'historique complet, un an suffit largement. */
const KEEP_DAYS = 400;

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

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  // Midi en heure locale : aucun risque de retomber sur le même jour lors des
  // changements d'heure.
  return dayKey(new Date(y, m - 1, d + delta, 12));
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    }
    return migrate();
  } catch {
    return [];
  }
}

/** Reconstruit l'historique depuis l'ancien couple (dernier jour, streak). */
function migrate(): string[] {
  const last = localStorage.getItem(LEGACY_LAST) || localStorage.getItem(LEGACY_TODAY);
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return [];

  const streak = Math.max(1, Math.min(KEEP_DAYS, parseInt(localStorage.getItem(LEGACY_STREAK) || '1', 10) || 1));
  const days: string[] = [];
  for (let i = 0; i < streak; i++) days.push(shiftDay(last, -i));

  write(days);
  return days;
}

function write(days: string[]): void {
  const cutoff = shiftDay(dayKey(), -KEEP_DAYS);
  const kept = [...new Set(days)].filter((d) => d >= cutoff).sort().reverse();
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
    // Le cron de rappel ne lit pas ces clés, mais une ancienne version de
    // l'app encore ouverte dans un onglet, si.
    localStorage.setItem(LEGACY_LAST, kept[0] || '');
    localStorage.setItem(LEGACY_STREAK, String(computeStreak(kept)));
    if (kept.includes(dayKey())) localStorage.setItem(LEGACY_TODAY, dayKey());
    else localStorage.removeItem(LEGACY_TODAY);
  } catch {
    /* mode privé : on continue sans persistance */
  }
}

function computeStreak(days: string[]): number {
  const set = new Set(days);
  const today = dayKey();
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

export interface CreatineState {
  /** Jour local servant de référence, pour détecter le passage à minuit. */
  day: string;
  takenToday: boolean;
  streak: number;
  /** Le streak court mais la prise du jour n'est pas encore faite. */
  pending: boolean;
}

export function getCreatineState(): CreatineState {
  const days = read();
  const today = dayKey();
  const takenToday = days.includes(today);
  const streak = computeStreak(days);
  return { day: today, takenToday, streak, pending: !takenToday && streak > 0 };
}

export function setCreatineToday(taken: boolean): CreatineState {
  const today = dayKey();
  const days = read().filter((d) => d !== today);
  if (taken) days.push(today);
  write(days);
  return getCreatineState();
}

/**
 * État de la créatine, remis à jour au passage de minuit. L'app est une PWA
 * qu'on laisse ouverte : sans ça, la carte reste bloquée sur « prise
 * aujourd'hui » le lendemain matin.
 */
export function useCreatine() {
  const [state, setState] = useState(getCreatineState);

  const refresh = useCallback(() => {
    setState((prev) => {
      const next = getCreatineState();
      const same =
        prev.day === next.day &&
        prev.takenToday === next.takenToday &&
        prev.streak === next.streak;
      return same ? prev : next;
    });
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    // L'app peut rester au premier plan pendant le changement de jour.
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const toggle = useCallback(() => {
    setState((prev) => setCreatineToday(!prev.takenToday));
  }, []);

  return { ...state, toggle };
}
