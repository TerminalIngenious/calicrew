import { useState } from 'react';
import type { CarteAvent } from '../../lib/avent';
import { LIBELLE_RARETE, LIBELLE_STAT, NOM_STAT, TOTAL_CARTES } from '../../lib/avent';
import './fonts.css';
import './AventCardArt.css';
import Godemichet from './Godemichet';

/**
 * Le nœud du cadeau, posé en travers de l'objet au dos de la carte.
 *
 * Un vrai ruban de satin n'est pas une forme plate : chaque boucle montre
 * sa face intérieure, plus sombre, et retient un trait de lumière sur son
 * arête. C'est ce qui sépare un nœud d'un papillon découpé dans du papier.
 */
function Noeud() {
  return (
    <svg className="av-noeud" viewBox="0 0 220 120" aria-hidden="true">
      {/* Le ruban qui ceinture : il traverse de bord à bord, sinon le nœud
          est posé sur l'objet au lieu de l'entourer. */}
      <path d="M0 45h220v22H0z" fill="#d8352f" />
      <path d="M0 45h220v7H0z" fill="rgba(255,255,255,0.26)" />
      <path d="M0 63h220v4H0z" fill="rgba(0,0,0,0.25)" />

      {/* Les pans qui retombent, coupés en V au bout comme un vrai ruban. */}
      <g fill="#c22f28">
        <path d="M100 62c-8 18-18 32-34 45l12-9 4 14c16-13 28-32 32-46z" />
        <path d="M120 62c8 18 18 32 34 45l-12-9-4 14c-16-13-28-32-32-46z" />
      </g>
      <path d="M100 62c-6 14-14 26-24 37" stroke="rgba(255,255,255,0.18)" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Les deux boucles, en goutte : elles sortent du nœud, montent et y
          reviennent. La face intérieure, plus sombre, se voit sous la
          boucle — sans elle, le ruban est un triangle découpé. */}
      <g>
        <path d="M105 47C88 26 58 14 42 24 28 33 32 50 52 58c20 8 44 4 54-2z" fill="#ff5a4e" />
        <path d="M106 56c-12 5-34 8-52 2-10-3-16-9-15-15 2 9 13 13 27 15 14 2 30 1 40-2z" fill="rgba(0,0,0,0.3)" />
        <path d="M100 46C84 29 60 20 46 26" stroke="rgba(255,255,255,0.34)" strokeWidth="4.5" fill="none" strokeLinecap="round" />

        <path d="M115 47c17-21 47-33 63-23 14 9 10 26-10 34-20 8-44 4-54-2z" fill="#ff5a4e" />
        <path d="M114 56c12 5 34 8 52 2 10-3 16-9 15-15-2 9-13 13-27 15-14 2-30 1-40-2z" fill="rgba(0,0,0,0.3)" />
        <path d="M120 46c16-17 40-26 54-20" stroke="rgba(255,255,255,0.34)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Le cœur du nœud : un bout de ruban enroulé et serré, pas une
          pastille — d'où les deux plis qui le pincent. */}
      <rect x="99" y="42" width="22" height="28" rx="9" fill="#e8403a" />
      <path d="M103 46c-2 7-2 15 0 21" stroke="rgba(0,0,0,0.24)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M117 46c2 7 2 15 0 21" stroke="rgba(0,0,0,0.24)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M105 47c3-2 7-2 10 0" stroke="rgba(255,255,255,0.36)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * La carte de l'event de décembre.
 *
 * Dessinée plutôt qu'affichée en image, comme celles de FaceID : la photo
 * n'est qu'un calque au milieu, et tout ce qui l'entoure — cadre, neige,
 * stats, numéro — est rendu par le navigateur. Quarante-cinq images livrées
 * à la main ne seraient jamais au même gabarit, et ça se verrait dans une
 * grille.
 *
 * Elle a un dos, et elle tourne quand on le lui demande (`retournable`) :
 * dans une grille on ouvre la carte, on ne la retourne pas, sinon le même
 * clic ferait deux choses différentes selon l'endroit.
 *
 * Tout est dimensionné en `cqw` : la carte prend la largeur qu'on lui donne
 * et le reste suit. Son conteneur doit donc avoir une largeur.
 */
export default function AventCardArt({
  carte,
  jour,
  retournable = false,
}: {
  carte: CarteAvent;
  jour?: number;
  retournable?: boolean;
}) {
  const [sansPhoto, setSansPhoto] = useState(false);
  const [dos, setDos] = useState(false);
  const initiales = carte.nom.split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase();
  const stats = (Object.keys(LIBELLE_STAT) as (keyof typeof LIBELLE_STAT)[]);

  return (
    <div
      className={`av-carte rarete-${carte.rarete} ${retournable ? 'retournable' : ''} ${dos ? 'au-dos' : ''}`}
      onClick={retournable ? () => setDos((d) => !d) : undefined}
      role={retournable ? 'button' : undefined}
      tabIndex={retournable ? 0 : undefined}
      onKeyDown={retournable ? (e) => { if (e.key === 'Enter' || e.key === ' ') setDos((d) => !d); } : undefined}
      aria-label={retournable ? `${carte.nom} — retourner la carte` : undefined}
    >
      <div className="av-pivot">
        <div className="av-face av-recto">
          <div className="av-cadre">
            <div className="av-fond">
              {sansPhoto ? (
                <div className="av-sans-photo" aria-hidden="true">
                  <span>{initiales}</span>
                </div>
              ) : (
                <img
                  className="av-photo"
                  src={carte.image}
                  alt={carte.nom}
                  onError={() => setSansPhoto(true)}
                />
              )}

              {/* Le voile du bas : sans lui, un nom clair posé sur une photo
                  claire devient illisible, et on ne choisit pas les photos. */}
              <div className="av-voile" />

              <div className="av-haut">
                <div className="av-bloc-note">
                  <span className="av-note">{carte.note}</span>
                  <Godemichet className="av-embleme" />
                </div>
                {jour ? <span className="av-jour">{jour} déc.</span> : null}
              </div>

              <div className="av-bas">
                <span className="av-nom">{carte.nom}</span>
                <div className="av-stats">
                  {stats.map((cle) => (
                    <div className="av-stat" key={cle} title={NOM_STAT[cle]}>
                      <span className="av-stat-valeur">{carte.stats[cle]}</span>
                      <span className="av-stat-cle">{LIBELLE_STAT[cle]}</span>
                    </div>
                  ))}
                </div>
                <div className="av-pied">
                  <span className="av-rarete">{LIBELLE_RARETE[carte.rarete]}</span>
                  <span className="av-numero">
                    {String(carte.numero).padStart(2, '0')}/{TOTAL_CARTES}
                  </span>
                </div>
              </div>

              {/* La neige sur le bord haut du cadre : la carte appartient au
                  mois, pas seulement à l'event. */}
              <div className="av-neige" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="av-face av-verso">
          <div className="av-cadre">
            <div className="av-fond av-fond-dos">
              <div className="av-paquet">
                <Godemichet className="av-god-dos" />
                <Noeud />
              </div>
              <span className="av-dos-titre">Branlette<em>Hivernale</em></span>
              <span className="av-dos-pied">Avent 2026 · {String(carte.numero).padStart(2, '0')}/{TOTAL_CARTES}</span>
              <div className="av-neige" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
