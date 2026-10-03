import { useMemo, useState } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { CATEGORY_LABELS } from '../lib/exercises';
import { computePersonalRecords, type PersonalRecord } from '../lib/stats';
import type { Session, Exercise } from '../types';

/** Ordre d'affichage des catégories, le même que la liste d'exercices. */
const CATEGORY_ORDER: Exercise['category'][] = [
  'push', 'pull', 'legs', 'core', 'skill', 'crossfit', 'running', 'velo', 'sportco',
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m} min`;
}

/** Valeur mise en avant : ce que vaut vraiment le record. */
function primaryValue(pr: PersonalRecord): string {
  if (pr.bestDistance) return `${pr.bestDistance} km`;
  if (pr.bestDuration) return formatDuration(pr.bestDuration);
  if (pr.unit === 'seconds') return `${pr.bestSet} s`;
  return `${pr.bestSet}`;
}

function primaryUnit(pr: PersonalRecord): string {
  if (pr.bestDistance || pr.bestDuration || pr.unit === 'seconds') return '';
  return 'reps';
}

/** Précision secondaire : charge, ou durée quand la distance prend la vedette. */
function detail(pr: PersonalRecord): string | null {
  const parts: string[] = [];
  if (pr.bestDistance && pr.bestDuration) parts.push(formatDuration(pr.bestDuration));
  if (pr.bestSetWeight) parts.push(`+${pr.bestSetWeight} kg`);
  if (pr.maxWeight && pr.maxWeight !== pr.bestSetWeight) {
    const type = pr.maxWeightType === 'halteres' ? 'haltères' : pr.maxWeightType === 'barre' ? 'barre' : 'lesté';
    parts.push(`max ${pr.maxWeight} kg (${type})`);
  }
  return parts.length > 0 ? parts.join(' • ') : null;
}

export default function PersonalRecords({ sessions }: { sessions: Session[] }) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const records = computePersonalRecords(sessions);
    const byCategory = new Map<string, PersonalRecord[]>();
    for (const pr of records) {
      const list = byCategory.get(pr.category) || [];
      list.push(pr);
      byCategory.set(pr.category, list);
    }
    // Dans chaque catégorie, le plus gros record d'abord.
    for (const list of byCategory.values()) {
      list.sort((a, b) =>
        (b.bestDistance || b.bestDuration || b.bestSet) - (a.bestDistance || a.bestDuration || a.bestSet)
      );
    }
    return CATEGORY_ORDER
      .filter((c) => byCategory.has(c))
      .map((c) => ({ category: c, records: byCategory.get(c)! }));
  }, [sessions]);

  const total = grouped.reduce((sum, g) => sum + g.records.length, 0);
  if (total === 0) return null;

  return (
    <section className="section">
      <button className="members-toggle" onClick={() => setOpen(!open)}>
        <h3><Trophy size={16} style={{ marginRight: 6 }} />PR ({total})</h3>
        <ChevronDown size={16} className={open ? 'rotated' : ''} />
      </button>

      {open && (
        <div className="pr-list">
          {grouped.map(({ category, records }) => (
            <div key={category} className="pr-group">
              <h4 className="pr-group-title">
                {CATEGORY_LABELS[category as Exercise['category']] || category}
              </h4>
              {records.map((pr) => {
                const extra = detail(pr);
                return (
                  <div key={pr.exerciseId} className="pr-row">
                    <div className="pr-row-info">
                      <span className="pr-row-name">{pr.exerciseName}</span>
                      {extra && <span className="pr-row-detail">{extra}</span>}
                    </div>
                    <div className="pr-row-value">
                      <span className="pr-row-number">{primaryValue(pr)}</span>
                      {primaryUnit(pr) && <span className="pr-row-unit">{primaryUnit(pr)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
