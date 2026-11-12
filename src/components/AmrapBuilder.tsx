import { useState } from 'react';
import { Plus, Minus, Timer, X, Trash2 } from 'lucide-react';
import { CATEGORY_LABELS, DEFAULT_EXERCISES } from '../lib/exercises';
import {
  AMRAP_MAX_ITEMS, AMRAP_MAX_MINUTES, AMRAP_MIN_MINUTES, AMRAP_PRESETS,
} from '../lib/amrap';
import type { Exercise, SetUnit } from '../types';
import { useScrollLock } from '../lib/useScrollLock';

export interface AmrapItem {
  exerciseId: string;
  value: number;
  unit: SetUnit;
}

/** Exercices groupés par catégorie pour le sélecteur. */
const BY_CATEGORY = (() => {
  const map = new Map<string, Exercise[]>();
  for (const ex of DEFAULT_EXERCISES) {
    // Un sport collectif ou une sortie vélo ne s'enchaîne pas en circuit.
    if (ex.category === 'sportco' || ex.category === 'velo' || ex.category === 'running') continue;
    map.set(ex.category, [...(map.get(ex.category) || []), ex]);
  }
  return [...map.entries()];
})();

const DEFAULT_ITEM: AmrapItem = { exerciseId: 'pull-ups', value: 5, unit: 'reps' };

/** Les durées qu'on choisit vraiment. Le reste se règle à la minute en dessous. */
const DUREES = [10, 15, 20, 30];

function itemFrom(exerciseId: string, value: number, unit?: SetUnit): AmrapItem {
  const ex = DEFAULT_EXERCISES.find((e) => e.id === exerciseId);
  return {
    exerciseId,
    value,
    unit: unit || (ex?.defaultUnit === 'seconds' ? 'seconds' : 'reps'),
  };
}

export default function AmrapBuilder({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (name: string, minutes: number, items: AmrapItem[]) => Promise<void> | void;
}) {
  useScrollLock(true);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState(20);
  const [items, setItems] = useState<AmrapItem[]>([DEFAULT_ITEM]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(presetId: string) {
    const preset = AMRAP_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.name);
    setMinutes(preset.minutes);
    setItems(preset.items.map((i) => itemFrom(i.exerciseId, i.value, i.unit)));
    setError(null);
  }

  function updateItem(index: number, patch: Partial<AmrapItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function pickExercise(index: number, exerciseId: string) {
    // Changer d'exercice réaligne l'unité sur ce que l'exercice suggère.
    setItems((prev) =>
      prev.map((it, i) => (i === index ? itemFrom(exerciseId, it.value) : it))
    );
  }

  function addItem() {
    if (items.length >= AMRAP_MAX_ITEMS) return;
    setItems((prev) => [...prev, DEFAULT_ITEM]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function start() {
    if (starting) return;
    if (items.length === 0) {
      setError('Ajoute au moins un exercice au circuit.');
      return;
    }
    if (items.some((it) => !Number.isFinite(it.value) || it.value <= 0)) {
      setError('Chaque exercice a besoin d\'une valeur supérieure à 0.');
      return;
    }
    const ids = items.map((it) => it.exerciseId);
    if (new Set(ids).size !== ids.length) {
      setError('Le même exercice revient deux fois dans le circuit.');
      return;
    }

    setStarting(true);
    try {
      await onStart(name.trim(), minutes, items);
    } catch {
      setError('Impossible de lancer la séance. Vérifie ta connexion.');
      setStarting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card amrap-builder" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card-header">
          <h3>Nouvel AMRAP</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <p className="amrap-builder-intro">
          Un maximum de rounds du circuit dans le temps imparti.
        </p>

        <span className="pr-field-label">Raccourcis</span>
        <div className="amrap-raccourcis">
          {AMRAP_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`amrap-choix ${name === p.name ? 'actif' : ''}`}
              onClick={() => applyPreset(p.id)}
            >
              {p.name}
            </button>
          ))}
          {/* « Libre » ne remet que le nom à zéro : on part souvent d'un WOD
              connu qu'on retouche, et perdre son circuit en cliquant ici
              serait la pire surprise possible. */}
          <button
            className={`amrap-choix ${name === '' ? 'actif' : ''}`}
            onClick={() => setName('')}
          >
            Libre
          </button>
        </div>

        <input
          id="amrap-name"
          className="amrap-nom"
          type="text"
          placeholder="Nom (optionnel)"
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <span className="pr-field-label">Durée</span>
        <div className="amrap-raccourcis">
          {DUREES.map((m) => (
            <button
              key={m}
              className={`amrap-choix ${minutes === m ? 'actif' : ''}`}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="amrap-reglage">
          <button
            aria-label="Moins une minute"
            onClick={() => setMinutes((m) => Math.max(AMRAP_MIN_MINUTES, m - 1))}
          >
            <Minus size={14} />
          </button>
          <span><Timer size={13} /> {minutes} min</span>
          <button
            aria-label="Plus une minute"
            onClick={() => setMinutes((m) => Math.min(AMRAP_MAX_MINUTES, m + 1))}
          >
            <Plus size={14} />
          </button>
        </div>

        <span className="pr-field-label">Le circuit</span>
        <div className="amrap-lignes">
          {items.map((item, i) => (
            <div key={i} className="amrap-ligne">
              <input
                className="amrap-ligne-valeur"
                type="number"
                inputMode="numeric"
                min="1"
                aria-label={`Valeur de l'exercice ${i + 1}`}
                value={item.value}
                onChange={(e) => updateItem(i, { value: Number(e.target.value) })}
              />
              <select
                className="amrap-ligne-nom"
                value={item.exerciseId}
                aria-label={`Exercice ${i + 1}`}
                onChange={(e) => pickExercise(i, e.target.value)}
              >
                {BY_CATEGORY.map(([cat, list]) => (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat as Exercise['category']] || cat}>
                    {list.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {/* Une seule pastille qui bascule, plutôt que deux boutons :
                  l'unité n'a que deux états et la ligne n'a pas la place. */}
              <button
                className="amrap-ligne-unite"
                aria-label={`Unité de l'exercice ${i + 1} : ${item.unit === 'seconds' ? 'secondes' : 'répétitions'}`}
                onClick={() => updateItem(i, { unit: item.unit === 'seconds' ? 'reps' : 'seconds' })}
              >
                {item.unit === 'seconds' ? 'sec' : 'reps'}
              </button>
              {items.length > 1 && (
                <button
                  className="amrap-ligne-retirer"
                  aria-label={`Retirer l'exercice ${i + 1}`}
                  onClick={() => removeItem(i)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {items.length < AMRAP_MAX_ITEMS && (
          <button className="amrap-ajouter" onClick={addItem}>
            <Plus size={15} /> Ajouter un exercice
          </button>
        )}

        {error && <p className="pr-form-error">{error}</p>}

        <div className="amrap-actions">
          <button className="amrap-annuler" onClick={onClose}>Annuler</button>
          <button className="amrap-lancer" onClick={start} disabled={starting}>
            {starting ? 'Lancement…' : `Lancer ${minutes} min`}
          </button>
        </div>
      </div>
    </div>
  );
}
