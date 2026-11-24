import { useState } from 'react';
import type { CarteAvent } from '../../lib/avent';
import { LIBELLE_RARETE, LIBELLE_STAT, NOM_STAT, TOTAL_CARTES } from '../../lib/avent';
import './fonts.css';
import './AventCardArt.css';
import Godemichet from './Godemichet';

/** Le nœud du cadeau, posé en travers de l'objet au dos de la carte. */
function Noeud() {
  return (
    <svg className="av-noeud" viewBox="0 0 220 90" aria-hidden="true">
      <path d="M0 48h220v16H0z" fill="#e8403a" />
      <path d="M0 48h220v5H0z" fill="rgba(255,255,255,0.25)" />
      <path d="M110 56 60 28c-14-8-26 2-24 14 2 11 16 16 30 16z" fill="#ff5a4e" />
      <path d="M110 56 160 28c14-8 26 2 24 14-2 11-16 16-30 16z" fill="#ff5a4e" />
      <path d="M110 56 92 86h14l10-20z" fill="#d8352f" />
      <path d="M110 56 128 86h-14l-10-20z" fill="#d8352f" />
      <circle cx="110" cy="56" r="11" fill="#e8403a" />
      <circle cx="106" cy="52" r="4" fill="rgba(255,255,255,0.35)" />
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
