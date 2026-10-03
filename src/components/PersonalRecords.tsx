import { useMemo, useState } from 'react';
import { Trophy, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { CATEGORY_LABELS, DEFAULT_EXERCISES } from '../lib/exercises';
import {
  RECORD_UNITS, acceptsWeight, formatRecordValue, groupRecords,
  makeRecordId, recordDetail, useRecords,
} from '../lib/records';
import type { Exercise, PersonalRecord, RecordUnit } from '../types';

/** Valeur libre dans le sélecteur d'exercice. */
const FREE = '__free__';

interface Draft {
  id: string;
  pick: string;
  freeName: string;
  unit: RecordUnit;
  value: string;
  weight: string;
  date: string;
  note: string;
}

function toDraft(pr?: PersonalRecord): Draft {
  if (!pr) {
    return { id: makeRecordId(), pick: '', freeName: '', unit: 'reps', value: '', weight: '', date: '', note: '' };
  }
  return {
    id: pr.id,
    pick: pr.exerciseId || FREE,
    freeName: pr.exerciseId ? '' : pr.exerciseName,
    unit: pr.unit,
    value: String(pr.value),
    weight: pr.weight ? String(pr.weight) : '',
    date: pr.date || '',
    note: pr.note || '',
  };
}

/** Unité suggérée par l'exercice : un gainage se mesure en temps, pas en reps. */
function suggestUnit(ex: Exercise): RecordUnit {
  if (ex.category === 'running' || ex.category === 'velo') return 'km';
  if (ex.category === 'sportco') return 'seconds';
  return ex.defaultUnit === 'seconds' ? 'seconds' : 'reps';
}

const EXERCISES_BY_CATEGORY = (() => {
  const map = new Map<string, Exercise[]>();
  for (const ex of DEFAULT_EXERCISES) {
    map.set(ex.category, [...(map.get(ex.category) || []), ex]);
  }
  return [...map.entries()];
})();

export default function PersonalRecords({
  uid,
  editable = false,
}: {
  uid: string | undefined;
  editable?: boolean;
}) {
  const { records, loading, save, remove } = useRecords(uid);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const grouped = useMemo(() => groupRecords(records), [records]);

  // Chez les autres joueurs, une section vide n'apporte rien. Sur son propre
  // profil elle doit rester visible, sinon on ne peut pas ajouter le premier.
  if (loading || (records.length === 0 && !editable)) return null;

  function openEditor(pr?: PersonalRecord) {
    setFormError(null);
    setDraft(toDraft(pr));
    setOpen(true);
  }

  function pickExercise(id: string) {
    setDraft((d) => {
      if (!d) return d;
      const ex = DEFAULT_EXERCISES.find((e) => e.id === id);
      // On ne force l'unité qu'à la sélection, pour ne pas écraser un choix
      // délibéré de l'utilisateur ensuite.
      return { ...d, pick: id, unit: ex ? suggestUnit(ex) : d.unit };
    });
  }

  async function submit() {
    if (!draft || saving) return;

    const name = draft.pick === FREE
      ? draft.freeName.trim()
      : DEFAULT_EXERCISES.find((e) => e.id === draft.pick)?.name || '';
    if (!name) {
      setFormError('Choisis un exercice ou donne-lui un nom.');
      return;
    }

    const value = Number(draft.value.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setFormError('Entre une valeur supérieure à 0.');
      return;
    }

    const weight = Number(draft.weight.replace(',', '.'));
    const category = draft.pick === FREE
      ? ''
      : DEFAULT_EXERCISES.find((e) => e.id === draft.pick)?.category || '';

    const pr: PersonalRecord = {
      id: draft.id,
      exerciseName: name,
      category,
      unit: draft.unit,
      value,
      updatedAt: Date.now(),
    };
    if (draft.pick !== FREE) pr.exerciseId = draft.pick;
    if (acceptsWeight(draft.unit) && Number.isFinite(weight) && weight > 0) pr.weight = weight;
    if (draft.date) pr.date = draft.date;
    if (draft.note.trim()) pr.note = draft.note.trim();

    setSaving(true);
    try {
      await save(pr);
      setDraft(null);
      setFormError(null);
    } catch {
      setFormError("Enregistrement impossible. Vérifie ta connexion.");
    } finally {
      setSaving(false);
    }
  }

  const unitHint = RECORD_UNITS.find((u) => u.value === draft?.unit)?.hint;

  return (
    <section className="section">
      <button className="members-toggle" onClick={() => setOpen(!open)}>
        <h3><Trophy size={16} style={{ marginRight: 6 }} />PR ({records.length})</h3>
        <ChevronDown size={16} className={open ? 'rotated' : ''} />
      </button>

      {open && (
        <>
          {records.length === 0 ? (
            <p className="pr-empty">
              Aucun record pour l'instant. Note tes PR toi-même : ils ne sont pas
              déduits de tes séances.
            </p>
          ) : (
            <div className="pr-list">
              {grouped.map(({ category, records: list }) => (
                <div key={category} className="pr-group">
                  <h4 className="pr-group-title">
                    {CATEGORY_LABELS[category as Exercise['category']] || 'Autre'}
                  </h4>
                  {list.map((pr) => {
                    const { value, unit } = formatRecordValue(pr);
                    const extra = recordDetail(pr);
                    return (
                      <div key={pr.id} className="pr-row">
                        <div className="pr-row-info">
                          <span className="pr-row-name">{pr.exerciseName}</span>
                          {extra && <span className="pr-row-detail">{extra}</span>}
                          {pr.date && <span className="pr-row-detail">{pr.date}</span>}
                        </div>
                        <div className="pr-row-value">
                          <span className="pr-row-number">{value}</span>
                          {unit && <span className="pr-row-unit">{unit}</span>}
                          {editable && (
                            <div className="pr-row-actions">
                              <button
                                className="icon-btn"
                                aria-label={`Modifier le record de ${pr.exerciseName}`}
                                onClick={() => openEditor(pr)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="icon-btn"
                                aria-label={`Supprimer le record de ${pr.exerciseName}`}
                                onClick={() => remove(pr.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {editable && (
            <button className="secondary-btn small pr-add" onClick={() => openEditor()}>
              <Plus size={16} /> Ajouter un PR
            </button>
          )}
        </>
      )}

      {draft && (
        <div className="modal-overlay" onClick={() => setDraft(null)}>
          <div className="modal-card pr-form" onClick={(e) => e.stopPropagation()}>
            <h3>{records.some((r) => r.id === draft.id) ? 'Modifier le PR' : 'Nouveau PR'}</h3>

            <label className="pr-field-label" htmlFor="pr-exercise">Exercice</label>
            <select
              id="pr-exercise"
              className="pr-select"
              value={draft.pick}
              onChange={(e) => pickExercise(e.target.value)}
            >
              <option value="" disabled>Choisis un exercice</option>
              {EXERCISES_BY_CATEGORY.map(([cat, list]) => (
                <optgroup key={cat} label={CATEGORY_LABELS[cat as Exercise['category']] || cat}>
                  {list.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              ))}
              <option value={FREE}>Autre (à écrire)</option>
            </select>

            {draft.pick === FREE && (
              <input
                type="text"
                placeholder="Nom de l'exercice"
                value={draft.freeName}
                maxLength={40}
                onChange={(e) => setDraft({ ...draft, freeName: e.target.value })}
              />
            )}

            <span className="pr-field-label">Type de record</span>
            <div className="unit-picker pr-unit-picker">
              {RECORD_UNITS.map((u) => (
                <button
                  key={u.value}
                  className={`unit-btn ${draft.unit === u.value ? 'active' : ''}`}
                  onClick={() => setDraft({ ...draft, unit: u.value })}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <label className="pr-field-label" htmlFor="pr-value">
              Valeur {unitHint && <em>{unitHint}</em>}
            </label>
            <input
              id="pr-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={draft.unit === 'seconds' ? 'En secondes' : ''}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            />

            {acceptsWeight(draft.unit) && (
              <>
                <label className="pr-field-label" htmlFor="pr-weight">Charge en kg (optionnel)</label>
                <input
                  id="pr-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={draft.weight}
                  onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                />
              </>
            )}

            <label className="pr-field-label" htmlFor="pr-date">Date (optionnel)</label>
            <input
              id="pr-date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />

            <label className="pr-field-label" htmlFor="pr-note">Précision (optionnel)</label>
            <input
              id="pr-note"
              type="text"
              placeholder="en 1h50, sans élan…"
              maxLength={60}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />

            {formError && <p className="pr-form-error">{formError}</p>}

            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setDraft(null)}>Annuler</button>
              <button className="primary-btn" onClick={submit} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
