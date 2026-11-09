import { useEffect, useState } from 'react';
import '../pages/Maintenance.css';

/*
 * Les photos du trombinoscope déjà en place. La liste est écrite en dur et
 * non tirée de `CARTES` : certaines cartes attendent encore leur photo, et un
 * fichier manquant ferait un trou dans le mur.
 */
const VISAGES = [
  'tristan-a', 'matteo-a', 'colinne-a', 'mateo-a', 'marcus-a', 'lucas-a',
  'johan-a', 'hugo-a', 'bastien-a', 'tristan-b', 'matteo-b', 'colinne-b',
  'mateo-b', 'marcus-b', 'lucas-b', 'johan-b', 'hugo-b', 'bastien-b',
  'clement-b',
];

/** Trois colonnes qui défilent, chacune avec ses propres visages. */
const COLONNES = [
  VISAGES.filter((_, i) => i % 3 === 0),
  VISAGES.filter((_, i) => i % 3 === 1),
  VISAGES.filter((_, i) => i % 3 === 2),
];

const MESSAGES = [
  'Analyse des nouveaux visages…',
  'Détourage des oreilles… ça prend du temps.',
  'Recomptage des boosters pour que tout le monde finisse.',
  'Attribution des surnoms. Personne n\'a son mot à dire.',
  'Mesure des egos. Le serveur a chaud.',
  'Vérification des excuses. Beaucoup de données.',
  'Cinq visages de plus à faire rentrer dans le fichier.',
];

export default function MaintenanceScreen() {
  const [i, setI] = useState(0);

  // Les messages tournent dans un effet et pas au rendu : rien de ce qui
  // dépend de l'heure n'a sa place dans le corps d'un composant.
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mnt">
      <div className="mnt-mur" aria-hidden="true">
        {COLONNES.map((colonne, c) => (
          <div key={c} className={`mnt-colonne mnt-colonne-${c}`}>
            {/* La colonne est écrite deux fois : la boucle du défilement se
                recolle sans saut quand la copie arrive à la place de
                l'originale. */}
            {[...colonne, ...colonne].map((visage, n) => (
              <img key={`${visage}-${n}`} src={`/faceid/${visage}.webp`} alt="" loading="lazy" />
            ))}
          </div>
        ))}
      </div>

      <div className="mnt-voile" aria-hidden="true" />
      <div className="mnt-balayage" aria-hidden="true" />

      <div className="mnt-panneau">
        <svg viewBox="0 0 120 120" width="72" height="72" className="mnt-logo">
          <g stroke="#b6ff00" strokeWidth={8} strokeLinecap="round" fill="none">
            <path d="M8 36V16a8 8 0 018-8h20M84 8h20a8 8 0 018 8v20M112 84v20a8 8 0 01-8 8H84M36 112H16a8 8 0 01-8-8V84" />
          </g>
          <g fill="#b6ff00">
            <circle cx="60" cy="51" r="15" />
            <path d="M33 100c0-15 12-24 27-24s27 9 27 24z" />
          </g>
          <rect className="mnt-logo-scan" x="8" y="0" width="104" height="3" rx="1.5" fill="#eaffb0" />
        </svg>

        <span className="mnt-kicker">Fichier en cours de mise à jour</span>
        <h1>On agrandit le mur</h1>
        <p className="mnt-message" key={i}>{MESSAGES[i]}</p>

        <div className="mnt-barre"><div className="mnt-barre-fill" /></div>

        <p className="mnt-pied">
          Cinq têtes de plus arrivent dans l'event.<br />
          Personne ne perd ses cartes. Revenez dans un moment.
        </p>
      </div>
    </div>
  );
}
