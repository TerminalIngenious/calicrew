import { useState } from 'react';
import type { CarteFaceId } from '../../lib/faceid';
import { STATS, TOTAL_CARTES } from '../../lib/faceid';
import './fonts.css';
import './FaceIdCardArt.css';

/**
 * La carte de l'event FaceID, dessinée plutôt qu'affichée en image.
 *
 * Même parti pris que pour la saison 2 : vingt-quatre images livrées à la
 * main ne seraient jamais tout à fait au même gabarit, et ça se verrait dans
 * une grille de vingt-quatre. Dessinée, la carte est identique au pixel près
 * d'une personne à l'autre, nette à n'importe quel zoom, et corriger une
 * statistique ne demande pas de refaire un fichier.
 *
 * Tout est dimensionné en `cqw`, l'unité des container queries : la carte
 * prend la largeur qu'on lui donne et le reste suit. D'où un conteneur qui
 * doit avoir une largeur — dans un flex sans largeur, elle s'écraserait.
 *
 * En dessous de 150 px de large, les statistiques et le surnom sont retirés.
 * Ce n'est pas un repli, c'est la même décision qu'un maquettiste prendrait :
 * à la taille d'une vignette, cinq colonnes de chiffres ne sont plus de
 * l'information, c'est du bruit gris.
 */
export default function FaceIdCardArt({ carte }: { carte: CarteFaceId }) {
  const [sansPhoto, setSansPhoto] = useState(false);
  const verifiee = carte.face === 'a';

  return (
    <div className={`fc2 ${verifiee ? 'face-a' : 'face-b'}`}>
      <div className="fc2-cadre">
        <div className="fc2-fond">
          <Scanner />
          {!sansPhoto && (
            <img
              className="fc2-photo"
              src={carte.image}
              alt={carte.nom}
              onError={() => setSansPhoto(true)}
            />
          )}

          <div className="fc2-haut">
            <span className="fc2-marque">FACE<em>ID</em></span>
            <span className="fc2-numero">
              {String(carte.numero).padStart(3, '0')}/{String(TOTAL_CARTES).padStart(3, '0')}
            </span>
          </div>

          <span className="fc2-note">{carte.note}</span>

          <span className="fc2-tampon">
            {verifiee ? <>Identity<br />Verified</> : <>Subject<br />Flagged</>}
          </span>

          <div className="fc2-bas">
            <span className="fc2-nom">{carte.nom}</span>
            {/* Pas de ligne vide en attendant : une carte sans surnom se
                contente de son prénom. */}
            {carte.surnom && <span className="fc2-surnom">{carte.surnom}</span>}

            <div className="fc2-stats">
              {STATS.map((nom, i) => (
                <div key={nom} className="fc2-stat">
                  <span className="fc2-stat-nom">{nom}</span>
                  <StatIcon index={i} />
                  <span className="fc2-stat-val">{carte.stats[i] ?? 0}</span>
                </div>
              ))}
            </div>

            <span className="fc2-logo">CaliCrew</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Le fond : grille, viseurs et empreinte digitale.
 *
 * Un seul SVG plutôt que des images : il se teinte avec la couleur de la
 * face, il ne pèse rien, et il reste net quand la carte est ouverte en grand.
 */
function Scanner() {
  return (
    <svg className="fc2-scanner" viewBox="0 0 300 400" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="fc2-grille" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
        </pattern>
        {/* Le halo éclaire le sujet, il ne repeint pas la carte : au-delà
            d'un cinquième d'opacité il lavait le noir et le cadre
            métallique n'avait plus rien sur quoi se détacher. */}
        <radialGradient id="fc2-halo" cx="50%" cy="40%" r="46%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill="url(#fc2-grille)" opacity="0.8" />
      <rect width="300" height="400" fill="url(#fc2-halo)" />
      <g fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5">
        <g transform="translate(52 128)">
          <circle r="9" /><path d="M-15 0h30M0 -15v30" />
        </g>
        <g transform="translate(248 96)">
          <circle r="9" /><path d="M-15 0h30M0 -15v30" />
        </g>
      </g>
      {/* L'empreinte : des arcs concentriques ouverts, posés en haut à droite. */}
      <g
        transform="translate(232 160)"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.4"
      >
        {[10, 20, 30, 40, 50].map((r) => (
          <path key={r} d={`M${-r} 8a${r} ${r * 1.25} 0 1 1 ${r * 2} 0`} />
        ))}
        <path d="M0 18v24" />
      </g>
    </svg>
  );
}

/** Les cinq pictogrammes, dans l'ordre de STATS. */
function StatIcon({ index }: { index: number }) {
  const commun = { className: 'fc2-stat-ico', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  switch (index) {
    case 0: // Gainage : une planche sur les avant-bras.
      return (
        <svg {...commun} fill="currentColor">
          <circle cx="5" cy="11" r="2.1" />
          <path d="M7.5 12.4c2.4-.9 5-1 7.6-.3l4.6 1.3a1 1 0 0 1-.3 2l-4.7-.6-5.6.9H3.2a1 1 0 0 1 0-2h2.1z" />
          <path d="M3 17h6l-1 2H3z" />
        </svg>
      );
    case 1: // Régularité : un calendrier.
      return (
        <svg {...commun} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
          <circle cx="8.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 2: // Explosivité : l'éclair.
      return (
        <svg {...commun} fill="currentColor">
          <path d="M13.2 2 4 13.6h6.1L9.4 22 20 10.1h-6.4z" />
        </svg>
      );
    case 3: // Ego : la couronne.
      return (
        <svg {...commun} fill="currentColor">
          <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
          <rect x="5" y="20" width="14" height="2" rx="1" />
        </svg>
      );
    default: // Excuses : la bulle qui parle.
      return (
        <svg {...commun} fill="currentColor">
          <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        </svg>
      );
  }
}
