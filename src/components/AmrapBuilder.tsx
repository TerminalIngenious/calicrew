import { useMemo, useState } from 'react';
import { Check, Plus, Minus, Timer, X, Trash2 } from 'lucide-react';
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

/** Les catégories dans l'ordre du catalogue, pour les onglets du sélecteur. */
const CATEGORIES = BY_CATEGORY.map(([cat]) => cat as Exercise['category']);

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
  const [items, setItems] = useState<AmrapItem[]>([]);
  const [filtre, setFiltre] = useState<Exercise['category']>(CATEGORIES[0]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogue = useMemo(
    () => BY_CATEGORY.find(([cat]) => cat === filtre)?.[1] || [],
    [filtre]
  );
  const complet = items.length >= AMRAP_MAX_ITEMS;

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

  /**
   * La pastille ajoute ou retire : c'est le même geste que pour une séance
   * classique. Le dérouleur d'avant obligeait à ajouter une ligne vide, puis
   * à l'ouvrir pour y chercher l'exercice — deux gestes et un catalogue
   * invisible tant qu'on n'avait pas déplié.
   */
  function toggleExercise(exerciseId: string) {
    setError(null);
    setItems((prev) => {
      const dedans = prev.findIndex((it) => it.exerciseId === exerciseId);
      if (dedans >= 0) return prev.filter((_, i) => i !== dedans);
      if (prev.length >= AMRAP_MAX_ITEMS) return prev;
      const ex = DEFAULT_EXERCISES.find((e) => e.id === exerciseId);
      // Une durée par défaut en secondes, un nombre de répétitions sinon :
      // cinq secondes de gainage n'auraient aucun sens.
      return [...prev, itemFrom(exerciseId, ex?.defaultUnit === 'seconds' ? 30 : 5)];
    });
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
        {items.length === 0 ? (
          <p className="amrap-vide">Touche un exercice ci-dessous pour le mettre dans le circuit.</p>
        ) : (
          <div className="amrap-lignes">
            {items.map((item, i) => {
              const nom = DEFAULT_EXERCISES.find((e) => e.id === item.exerciseId)?.name
                || item.exerciseId;
              return (
                <div key={item.exerciseId} className="amrap-ligne">
                  <input
                    className="amrap-ligne-valeur"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    aria-label={`Valeur de ${nom}`}
                    value={item.value}
                    onChange={(e) => updateItem(i, { value: Number(e.target.value) })}
                  />
                  <span className="amrap-ligne-nom">{nom}</span>
                  {/* Une seule pastille qui bascule, plutôt que deux boutons :
                      l'unité n'a que deux états et la ligne n'a pas la place. */}
                  <button
                    className="amrap-ligne-unite"
                    aria-label={`Unité de ${nom} : ${item.unit === 'seconds' ? 'secondes' : 'répétitions'}`}
                    onClick={() => updateItem(i, { unit: item.unit === 'seconds' ? 'reps' : 'seconds' })}
                  >
                    {item.unit === 'seconds' ? 'sec' : 'reps'}
                  </button>
                  <button
                    className="amrap-ligne-retirer"
                    aria-label={`Retirer ${nom}`}
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Le catalogue s'affiche comme dans « Choisis tes exercices » : les
            mêmes onglets, les mêmes pastilles. Deux écrans pour le même geste
            n'avaient pas à se ressembler si peu. */}
        <div className="amrap-filtres">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`amrap-filtre ${filtre === cat ? 'actif' : ''}`}
              onClick={() => setFiltre(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div className="amrap-catalogue">
          {catalogue.map((ex) => {
            const choisi = items.some((it) => it.exerciseId === ex.id);
            return (
              <button
                key={ex.id}
                className={`amrap-exo ${choisi ? 'choisi' : ''}`}
                // Plein, on laisse retirer mais plus ajouter : sinon le clic
                // ne fait rien et on croit l'app cassée.
                disabled={complet && !choisi}
                onClick={() => toggleExercise(ex.id)}
              >
                {ex.name}
                {choisi && <Check size={14} />}
              </button>
            );
          })}
        </div>

        {complet && (
          <p className="amrap-plein">
            {AMRAP_MAX_ITEMS} exercices, c'est le maximum pour un circuit.
          </p>
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
