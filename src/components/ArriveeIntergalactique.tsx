import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CARTE_INTERGALACTIQUE, DOS_INTERGALACTIQUE, joursRestants } from '../lib/intergalactique';
import { playCardExplosion, playChute, playCloche, playMontee, playPas, playRumeur, primeAudio } from '../lib/sound';
import CielArrivee from './CielArrivee';
import '../pages/Arrivee.css';

/**
 * L'arrivée de la carte intergalactique, une fois et une seule.
 *
 * Mise en scène d'entrée sur un ring : le noir, les projecteurs, la rumeur
 * qui monte, les pas qui font trembler le sol, une seconde de silence, puis
 * la révélation. C'est le silence qui fait l'effet, pas le volume.
 *
 * Elle démarre sur un appui et non toute seule, pour deux raisons : les
 * navigateurs n'autorisent le son que pendant un geste de l'utilisateur, et
 * une séquence de onze secondes imposée à quelqu'un qui ouvrait l'app pour
 * noter ses pompes serait une punition.
 *
 * Toute la chorégraphie tient dans des `animation-delay` déclenchés en une
 * fois : découpée en étapes successives, chaque changement de classe
 * relancerait les animations déjà en cours.
 */

/** Les rendez-vous sonores, en millisecondes depuis le lancement. */
const BANDE_SON: [number, () => void][] = [
  [0, () => playRumeur(7.3)],
  [2000, () => playMontee(5.3)],
  [2900, playCloche],
  [4600, () => playPas(0.7)],
  [5600, () => playPas(0.9)],
  [6500, () => playPas(1.15)],
  [7800, () => playCardExplosion('intergalactique')],
  [7800, playChute],
];

/** Fin de la séquence : au-delà, l'écran attend qu'on le referme. */
const DUREE = 10600;

export default function ArriveeIntergalactique({ onFini }: { onFini: () => void }) {
  const [phase, setPhase] = useState<'attente' | 'joue' | 'fini'>('attente');
  const [sortie, setSortie] = useState(false);
  /* L'heure du départ est partagée avec le ciel : les deux animations
     suivent la même horloge, l'une en CSS, l'autre en canvas. Dans l'état
     et non dans une ref, puisqu'elle est passée au rendu. */
  const [depart, setDepart] = useState(0);

  useEffect(() => {
    if (phase !== 'joue') return;
    const minuteries = BANDE_SON.map(([quand, jouer]) => window.setTimeout(jouer, quand));
    minuteries.push(window.setTimeout(() => setPhase('fini'), DUREE));
    return () => minuteries.forEach(clearTimeout);
  }, [phase]);

  function lance() {
    // Le contexte audio ne s'ouvre que pendant le geste : tout le reste de
    // la bande-son part de minuteries, trop tard pour y avoir droit.
    primeAudio();
    setDepart(Date.now());
    setPhase('joue');
  }

  function ferme() {
    setSortie(true);
    window.setTimeout(onFini, 420);
  }

  /*
   * L'écran est posé dans le corps du document, et non là où le composant
   * vit.
   *
   * Un `position: fixed` se cale sur le premier ancêtre transformé, et il
   * y en a dans l'app — l'animation s'affichait alors dans le cadre d'une
   * page au lieu de prendre le téléphone entier.
   */
  const dans = (contenu: React.ReactNode) => createPortal(contenu, document.body);

  if (phase === 'attente') {
    return dans(
      <div className="arr arr-attente" onClick={lance} role="button" tabIndex={0}>
        <span className="arr-kicker">Quelque chose est arrivé</span>
        <span className="arr-appuie">Appuie pour voir</span>
        <span className="arr-note">Monte le son.</span>
      </div>
    );
  }

  return dans(
    <div
      className={`arr arr-joue ${phase === 'fini' ? 'arr-pose' : ''} ${sortie ? 'arr-sortie' : ''}`}
      onClick={phase === 'fini' ? ferme : undefined}
    >
      <CielArrivee depart={depart} />

      {/* Les bandes de cinéma : deux rectangles noirs qui entrent et
          sortent. Rien ne dit « ce qui suit compte » aussi vite. */}
      <div className="arr-bande arr-bande-h" aria-hidden="true" />
      <div className="arr-bande arr-bande-b" aria-hidden="true" />
      <div className="arr-vignette" aria-hidden="true" />

      <div className="arr-projo arr-projo-g" aria-hidden="true" />
      <div className="arr-projo arr-projo-d" aria-hidden="true" />

      <div className="arr-speaker" aria-hidden="true">
        {'CE SOIR, DANS CALICREW'.split('').map((c, i) => (
          <span key={i} style={{ animationDelay: `${0.5 + i * 0.055}s` }}>
            {c === ' ' ? ' ' : c}
          </span>
        ))}
      </div>

      {/* Le dos de carte qui fonce depuis le fond, puis la carte qui se
          retourne : deux faces d'un même bloc, retourné en 3D. */}
      <div className="arr-scene">
        {/* Le halo tourne derrière la carte une fois qu'elle est posée :
            c'est ce qui fait qu'elle respire au lieu de se figer. */}
        <div className="arr-halo" aria-hidden="true" />
        <div className="arr-carte">
          <img className="arr-face arr-dos" src={DOS_INTERGALACTIQUE} alt="" />
          <img className="arr-face arr-recto" src={CARTE_INTERGALACTIQUE.image} alt="" />
        </div>
      </div>

      <div className="arr-onde" aria-hidden="true" />
      <div className="arr-onde arr-onde-2" aria-hidden="true" />
      {/* Trois couches décalées en rouge, vert et bleu : à l'impact,
          l'image se désaligne une fraction de seconde. */}
      <div className="arr-flash arr-flash-r" aria-hidden="true" />
      <div className="arr-flash arr-flash-b" aria-hidden="true" />
      <div className="arr-flash" aria-hidden="true" />

      <div className="arr-titre" aria-hidden="true">INTERGALACTIQUE</div>

      <p className="arr-sous">
        Une seule par personne.<br />
        {joursRestants()} jours pour la trouver.
      </p>

      {phase === 'fini' && <span className="arr-continue">Appuie pour continuer</span>}
    </div>
  );
}
