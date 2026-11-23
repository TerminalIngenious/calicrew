import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useUserSessions } from '../contexts/SessionsContext';
import {
  ANNEE_FINIE, ANNEE_NEUVE, MINUIT, bilanAnnee, enCours, motDeLaFin, secondesRestantes,
} from '../lib/reveillon';

/**
 * Le passage à la nouvelle année.
 *
 * Trois moments dans un seul composant, parce que c'est une seule scène qui
 * se transforme : le compte à rebours à partir de 23h50, les feux à minuit,
 * puis le bilan de l'année qui monte sous les feux.
 *
 * Il ne dépend pas du thème saisonnier mais de sa propre horloge. Le thème du
 * 31 décembre s'éteint à minuit pile, c'est-à-dire à la seconde où tout
 * commence : accroché à lui, le spectacle aurait disparu en s'ouvrant.
 */

/** Les gerbes : position, couleur, taille et moment, posés à la main. */
const FEUX = [
  { x: 18, y: 26, couleur: '#ff453a', rayon: 86, retard: 0 },
  { x: 74, y: 19, couleur: '#ffd60a', rayon: 104, retard: 0.45 },
  { x: 46, y: 12, couleur: '#64d2ff', rayon: 120, retard: 1.1 },
  { x: 86, y: 38, couleur: '#30d158', rayon: 78, retard: 1.7 },
  { x: 10, y: 44, couleur: '#ff9f0a', rayon: 92, retard: 2.2 },
  { x: 60, y: 33, couleur: '#ff6fd8', rayon: 110, retard: 2.9 },
  { x: 32, y: 40, couleur: '#ffd60a', rayon: 74, retard: 3.6 },
  { x: 90, y: 14, couleur: '#64d2ff', rayon: 96, retard: 4.2 },
];

/** Les éclats d'une gerbe. Vingt : au-delà c'est une tache, en deçà une étoile. */
const ECLATS = Array.from({ length: 20 }, (_, i) => i);

function Gerbe({ x, y, couleur, rayon, retard }: (typeof FEUX)[number]) {
  return (
    <div
      className="rev-gerbe"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        color: couleur,
        animationDelay: `${retard}s`,
        ['--retard' as string]: `${retard}s`,
      }}
    >
      {/* La montée : un trait qui part du bas et s'éteint à l'instant où la
          gerbe s'ouvre. Sans lui, les éclats apparaissent de nulle part. */}
      <span className="rev-montee" style={{ animationDelay: `${retard}s` }} />
      {ECLATS.map((i) => (
        <span
          key={i}
          className="rev-eclat"
          style={{
            ['--a' as string]: `${(i * 360) / ECLATS.length}deg`,
            // Un rayon strictement égal donnerait une roue de vélo ; la
            // variation vient de l'indice, donc elle est la même à chaque
            // tour et ne scintille pas d'une boucle à l'autre.
            ['--d' as string]: `${rayon * (0.56 + ((i * 37) % 48) / 100)}px`,
            animationDelay: `${retard + 0.42}s`,
          }}
        />
      ))}
    </div>
  );
}

function Chiffres({ secondes }: { secondes: number }) {
  const mm = String(Math.floor(secondes / 60)).padStart(2, '0');
  const ss = String(secondes % 60).padStart(2, '0');
  // Les dix dernières secondes passent en un seul chiffre géant : à ce
  // moment-là on ne lit plus une durée, on compte à voix haute.
  if (secondes <= 10) return <span className="rev-dix">{secondes}</span>;
  return <span className="rev-horloge">{mm}:{ss}</span>;
}

export default function Reveillon() {
  const { sessions } = useUserSessions();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [ferme, setFerme] = useState(false);

  /*
   * Une seconde d'intervalle, et l'heure relue à chaque battement plutôt que
   * décrémentée : un téléphone qui met l'app en veille arrête les minuteurs,
   * et un compte à rebours qui compte ses propres secondes se serait réveillé
   * en retard de tout le temps passé écran éteint.
   */
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const bilan = useMemo(() => bilanAnnee(sessions), [sessions]);

  if (ferme || !enCours(maintenant)) return null;

  const avant = maintenant < MINUIT;
  const restantes = secondesRestantes(maintenant);
  // Les feux durent cinq minutes, le bilan tient le reste de la demi-heure.
  const feuxEnCours = !avant && maintenant < MINUIT + 5 * 60 * 1000;

  return (
    <div className={`rev ${avant ? 'rev-avant' : 'rev-apres'}`} role="dialog" aria-modal="true">
      {!avant && (
        <div className="rev-ciel" aria-hidden="true">
          {FEUX.map((f, i) => <Gerbe key={i} {...f} />)}
        </div>
      )}

      {avant ? (
        <div className="rev-centre">
          <span className="rev-kicker">Dernières secondes de {ANNEE_FINIE}</span>
          <Chiffres secondes={restantes} />
          <span className="rev-sous">
            {restantes <= 10 ? 'Prépare-toi.' : 'Reste là, ça vaut le coup.'}
          </span>
        </div>
      ) : (
        <div className="rev-centre rev-bilan">
          <span className="rev-annee">{ANNEE_NEUVE}</span>
          <span className="rev-voeu">Bonne année, CaliCrew</span>

          {/* Le bilan monte sous les feux, pas à leur place : la fête
              d'abord, les chiffres ensuite, et sans changer d'écran. */}
          <div className={`rev-chiffres ${feuxEnCours ? 'tard' : ''}`}>
            <span className="rev-chiffres-titre">Ton année {ANNEE_FINIE}</span>
            <div className="rev-grille">
              <div><b>{bilan.seances}</b><span>séances</span></div>
              <div><b>{bilan.reps.toLocaleString('fr-FR')}</b><span>répétitions</span></div>
              <div><b>{bilan.heures} h</b><span>d'entraînement</span></div>
              <div><b>{bilan.serie}</b><span>jours d'affilée</span></div>
            </div>
            <ul className="rev-lignes">
              <li>Ton meilleur mois : <b>{bilan.meilleurMois}</b>, {bilan.seancesMeilleurMois} séances.</li>
              <li>Ton exercice de l'année : <b>{bilan.exercice}</b>, {bilan.repsExercice.toLocaleString('fr-FR')} au total.</li>
              <li>Tu t'entraînes surtout le <b>{bilan.jourFavori}</b>.</li>
            </ul>
            <p className="rev-mot">{motDeLaFin(bilan)}</p>
          </div>
        </div>
      )}

      {/* Fermable, mais pas avant minuit : à 23h58 la croix n'aurait servi
          qu'à rater le passage par maladresse. */}
      {!avant && (
        <button className="rev-fermer" onClick={() => setFerme(true)} aria-label="Fermer">
          <X size={20} />
        </button>
      )}
    </div>
  );
}
