/**
 * Records personnels, saisis à la main dans `userProgress/{uid}.personalRecords`.
 *
 * Ils ne sont pas déduits des séances loguées : un PR se fait souvent en
 * compétition ou en salle sans ouvrir l'app, et c'est le joueur qui sait ce
 * qui compte comme record pour lui. Un maxi de charge, par exemple, ne se
 * lisait pas du tout dans une séance en séries et reps.
 */

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Exercise, PersonalRecord, RecordUnit } from '../types';

export const RECORD_UNITS: { value: RecordUnit; label: string; hint: string }[] = [
  { value: 'reps', label: 'Reps', hint: 'ex : 25 tractions' },
  { value: 'kg', label: 'Kg', hint: 'ex : 120 kg au développé couché' },
  { value: 'seconds', label: 'Temps', hint: 'ex : 45 s de front lever' },
  { value: 'km', label: 'Km', hint: 'ex : 21 km' },
];

/** Ordre d'affichage des catégories, le même que la liste d'exercices. */
export const CATEGORY_ORDER: Exercise['category'][] = [
  'push', 'pull', 'legs', 'core', 'skill', 'crossfit', 'running', 'velo', 'sportco',
];

/** Une charge ne se cumule qu'avec un record en reps ou en temps. */
export function acceptsWeight(unit: RecordUnit): boolean {
  return unit === 'reps' || unit === 'seconds';
}

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.round(total % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

/** Valeur mise en avant, sans son unité quand celle-ci est déjà dans le texte. */
export function formatRecordValue(pr: PersonalRecord): { value: string; unit: string } {
  switch (pr.unit) {
    case 'seconds':
      return { value: formatSeconds(pr.value), unit: '' };
    case 'kg':
      return { value: String(pr.value), unit: 'kg' };
    case 'km':
      return { value: String(pr.value), unit: 'km' };
    default:
      return { value: String(pr.value), unit: 'reps' };
  }
}

/** Ligne secondaire : la charge portée, puis la précision libre. */
export function recordDetail(pr: PersonalRecord): string | null {
  const parts: string[] = [];
  if (pr.weight) parts.push(`+${pr.weight} kg`);
  if (pr.note) parts.push(pr.note);
  return parts.length > 0 ? parts.join(' • ') : null;
}

export function makeRecordId(): string {
  return `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalise ce qui vient de Firestore : un document distant n'est pas sûr. */
function clean(raw: unknown): PersonalRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is PersonalRecord =>
      !!r && typeof r === 'object' &&
      typeof (r as PersonalRecord).id === 'string' &&
      typeof (r as PersonalRecord).exerciseName === 'string' &&
      typeof (r as PersonalRecord).value === 'number' &&
      Number.isFinite((r as PersonalRecord).value)
    )
    .map((r) => ({ ...r, category: typeof r.category === 'string' ? r.category : '' }));
}

/** Regroupe par catégorie, la plus grosse valeur d'abord dans chacune. */
export function groupRecords(records: PersonalRecord[]) {
  const byCategory = new Map<string, PersonalRecord[]>();
  for (const pr of records) {
    const key = pr.category || 'autre';
    byCategory.set(key, [...(byCategory.get(key) || []), pr]);
  }
  for (const list of byCategory.values()) list.sort((a, b) => b.value - a.value);

  const known = CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
    category: c as string,
    records: byCategory.get(c)!,
  }));
  // Les exercices libres n'ont pas de catégorie : ils ferment la liste.
  const other = byCategory.has('autre')
    ? [{ category: 'autre', records: byCategory.get('autre')! }]
    : [];
  return [...known, ...other];
}

export function useRecords(uid: string | undefined) {
  // L'état porte l'uid qu'il décrit : en changeant de profil on repart donc de
  // `null` sans avoir à le remettre à zéro dans l'effet.
  const [loaded, setLoaded] = useState<{ uid: string; records: PersonalRecord[] } | null>(null);
  const [error, setError] = useState(false);

  const records = loaded && loaded.uid === uid ? loaded.records : null;
  const setRecords = useCallback(
    (next: PersonalRecord[]) => {
      if (uid) setLoaded({ uid, records: next });
    },
    [uid]
  );

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'userProgress', uid),
      (snap) => {
        setError(false);
        setLoaded({ uid, records: clean(snap.data()?.personalRecords) });
      },
      (err) => {
        console.error('Lecture des records impossible:', err);
        setError(true);
        setLoaded({ uid, records: [] });
      }
    );
  }, [uid]);

  /** Ajoute ou remplace un record, puis renvoie l'échec éventuel à l'appelant. */
  const save = useCallback(
    async (pr: PersonalRecord) => {
      if (!uid) return;
      const current = records ?? [];
      const next = current.some((r) => r.id === pr.id)
        ? current.map((r) => (r.id === pr.id ? pr : r))
        : [...current, pr];
      setRecords(next);
      await setDoc(doc(db, 'userProgress', uid), { personalRecords: next }, { merge: true });
    },
    [uid, records, setRecords]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!uid) return;
      const next = (records ?? []).filter((r) => r.id !== id);
      setRecords(next);
      await setDoc(doc(db, 'userProgress', uid), { personalRecords: next }, { merge: true });
    },
    [uid, records, setRecords]
  );

  return { records: records ?? [], loading: records === null, error, save, remove };
}
