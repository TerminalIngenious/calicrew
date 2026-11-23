import { useState } from 'react';
import type { CarteAvent } from '../../lib/avent';
import { LIBELLE_RARETE, TOTAL_CARTES } from '../../lib/avent';
import './fonts.css';
import './AventCardArt.css';

/**
 * La carte de l'event de décembre.
 *
 * Dessinée plutôt qu'affichée en image, comme celles de FaceID : la photo
 * n'est qu'un calque au milieu, et tout ce qui l'entoure — cadre, neige,
 * numéro, rareté — est rendu par le navigateur. Quarante-cinq images livrées
 * à la main ne seraient jamais au même gabarit, et ça se verrait dans une
 * grille.
 *
 * La photo peut manquer, et c'est prévu : tant que le fichier n'est pas dans
 * `public/avent/`, la carte montre les initiales sur un fond givré. Elle
 * reste lisible, et rien ne casse le jour où l'image arrive.
 *
 * Tout est dimensionné en `cqw` : la carte prend la largeur qu'on lui donne
 * et le reste suit. Son conteneur doit donc avoir une largeur.
 */
export default function AventCardArt({ carte, jour }: { carte: CarteAvent; jour?: number }) {
  const [sansPhoto, setSansPhoto] = useState(false);
  const initiales = carte.nom.split(/\s+/).map((m) => m[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`av-carte rarete-${carte.rarete}`}>
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
            <span className="av-marque">AVENT<em>26</em></span>
            {jour ? <span className="av-jour">{jour} déc.</span> : null}
          </div>

          <div className="av-bas">
            <span className="av-nom">{carte.nom}</span>
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
  );
}
