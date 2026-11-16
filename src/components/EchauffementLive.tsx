import { useState } from 'react';
import { ArrowLeft, Check, Flame, Timer } from 'lucide-react';
import { doseLabel, dureeEstimee } from '../lib/echauffement';
import type { WarmupItem } from '../types';

/**
 * L'échauffement d'une séance en cours.
 *
 * Il n'a pas sa propre séance : le chrono qui tourne en haut est celui de la
 * séance, qui a déjà commencé. On coche ce qu'on a fait, puis on passe aux
 * exercices — et le récap, à la fin, n'en comptera qu'une.
 */
export default function EchauffementLive({
  items,
  chrono,
  onRetour,
  onPasser,
}: {
  items: WarmupItem[];
  /** Le temps de séance déjà écoulé, formaté par l'appelant. */
  chrono: string;
  onRetour: () => void;
  onPasser: () => void;
}) {
  const [faits, setFaits] = useState<string[]>([]);
  const [passage, setPassage] = useState(false);
  const restants = items.length - faits.length;

  function cocher(id: string) {
    setFaits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="page ech-live">
      <header className="page-header">
        <button className="icon-btn" onClick={onRetour} aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1>Échauffement</h1>
        <div className="session-timer">
          <Timer size={16} />
          <span>{chrono}</span>
        </div>
      </header>

      <div className="ech-live-banniere">
        <Flame size={18} />
        <span>
          {items.length} exercice{items.length > 1 ? 's' : ''} · environ {dureeEstimee(items)} min
        </span>
      </div>

      <div className="ech-live-liste">
        {items.map((it) => {
          const fait = faits.includes(it.id);
          return (
            <button
              key={it.id}
              className={`ech-live-ligne ${fait ? 'fait' : ''}`}
              onClick={() => cocher(it.id)}
            >
              <span className={`ech-live-case ${fait ? 'fait' : ''}`}>
                {fait && <Check size={14} />}
              </span>
              <span className="ech-live-nom">{it.name}</span>
              <span className="ech-live-dose">{doseLabel(it)}</span>
            </button>
          );
        })}
      </div>

      {/* Cocher n'est pas obligatoire : on peut passer à la séance à tout
          moment, et la liste n'est là que pour ne rien oublier. */}
      <button
        className="primary-btn floating-btn"
        onClick={() => { setPassage(true); onPasser(); }}
        disabled={passage}
      >
        {passage
          ? 'On y va…'
          : restants > 0
            ? `Passer à la séance (${restants} à faire)`
            : 'Passer à la séance'}
      </button>
    </div>
  );
}
