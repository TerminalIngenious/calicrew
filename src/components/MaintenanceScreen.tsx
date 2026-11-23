import { useEffect, useState } from 'react';
import { SEASONS } from '../lib/passes';
import '../pages/Maintenance.css';

/*
 * Les cartes de la saison 1 qui défilent en fond.
 *
 * Celles de la saison 2 n'ont rien à faire ici : l'écran annonce la saison
 * sans en montrer une seule carte, sinon la surprise est éventée avant
 * d'avoir commencé. La liste est écrite en dur plutôt que tirée du
 * catalogue — ce fond doit s'afficher même si le catalogue bouge.
 */
const CARTES = [
  's1-macron', 's1-trump', 's1-obama', 's1-lepen', 's1-melenchon', 's1-bardella',
  's1-poutine', 's1-zemmour', 's1-sarkozy', 's1-hollande', 's1-zelensky', 's1-meloni',
  's1-kim', 's1-erdogan', 's1-arnold', 's1-kamala', 's1-praud', 's1-darmanin',
  's1-valls', 's1-boyard', 's1-panot', 's1-aubry', 's1-glucksmann', 's1-poutou',
  's1-washington', 's1-charlie-kirk', 's1-macron-forsure', 's1-trump-wall',
  's1-obama-mic', 's1-lepen-detournement',
];

/** Trois colonnes qui défilent, chacune avec ses propres cartes. */
const COLONNES = [
  CARTES.filter((_, i) => i % 3 === 0),
  CARTES.filter((_, i) => i % 3 === 1),
  CARTES.filter((_, i) => i % 3 === 2),
];

/*
 * Ce qu'on dit pendant l'attente.
 *
 * Rien qui promette ce qu'on ne tiendra pas, et rien sur le contenu de la
 * saison 2 : ce qui rassure, c'est de savoir ce qu'on garde.
 */
const MESSAGES = [
  'Dernières quêtes de la saison 1. Elles comptent encore.',
  'Tes cartes restent à toi. Toutes, pour toujours.',
  'Tes coffres pas encore ouverts donneront des cartes de la saison 1.',
  'Le pass repart de zéro. La collection, non.',
  'Nouvelles familles, nouveau thème. On n’en dit pas plus.',
  'Tes badges et tes records ne bougent pas.',
  'On range la saison 1 et on installe la suite.',
];

const SAISON2 = SEASONS.find((s) => s.id === 'pass-2');

/** « 3 j 04 h 12 », ou null si l'heure est passée. */
function compteARebours(cible: number, maintenant: number): string | null {
  const reste = cible - maintenant;
  if (reste <= 0) return null;
  const j = Math.floor(reste / 86400000);
  const h = Math.floor((reste % 86400000) / 3600000);
  const m = Math.floor((reste % 3600000) / 60000);
  if (j > 0) return `${j} j ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')}`;
}

export default function MaintenanceScreen() {
  const [i, setI] = useState(0);
  const [reste, setReste] = useState<string | null>(null);

  // Les messages tournent dans un effet et pas au rendu : rien de ce qui
  // dépend de l'heure n'a sa place dans le corps d'un composant.
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 3400);
    return () => clearInterval(t);
  }, []);

  // À la minute : afficher les secondes ferait un écran nerveux pour une
  // attente qui se compte en jours.
  useEffect(() => {
    if (!SAISON2) return;
    const maj = () => setReste(compteARebours(SAISON2.startDate, Date.now()));
    maj();
    const t = setInterval(maj, 30000);
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
            {[...colonne, ...colonne].map((carte, n) => (
              <img key={`${carte}-${n}`} src={`/cards/${carte}.png`} alt="" loading="lazy" />
            ))}
          </div>
        ))}
      </div>

      <div className="mnt-voile" aria-hidden="true" />
      <div className="mnt-balayage" aria-hidden="true" />

      <div className="mnt-panneau">
        <span className="mnt-kicker">Mise à jour en cours</span>
        <h1>La saison 2<br />arrive</h1>

        {reste && (
          <div className="mnt-compte">
            <span className="mnt-compte-l">Ouverture dans</span>
            <span className="mnt-compte-v">{reste}</span>
          </div>
        )}

        <p className="mnt-message" key={i}>{MESSAGES[i]}</p>

        <div className="mnt-barre"><div className="mnt-barre-fill" /></div>

        <p className="mnt-pied">
          Profite des derniers jours pour finir tes quêtes.<br />
          Personne ne perd ses cartes. Reviens dans un moment.
        </p>
      </div>
    </div>
  );
}
