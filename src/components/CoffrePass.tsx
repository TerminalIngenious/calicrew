import { useId, type CSSProperties } from 'react';
import type { CardRarity } from '../types';

/**
 * Le coffre d'un palier du pass, dessiné en SVG.
 *
 * La piste des cent niveaux affichait une petite boîte en icône, de la même
 * taille et du même gris pour tous : rien ne disait qu'un palier valait
 * mieux qu'un autre avant d'avoir lu l'étiquette. Le coffre prend sa
 * couleur de la rareté garantie, et se voit de loin.
 */
interface Teintes {
  /** Le coffre : la lumière, le ton plein, l'ombre. */
  c1: string; c2: string; c3: string;
  /** Les ferrures. Du laiton partout, de l'acier sur le coffre blanc. */
  f1: string; f2: string;
  glow: string;
}

const TEINTES: Record<CardRarity, Teintes> = {
  commune: {
    c1: '#ffffff', c2: '#dfe5ec', c3: '#9aa5b4',
    f1: '#b6c1cf', f2: '#6b7684',
    glow: 'rgba(255, 255, 255, 0.3)',
  },
  rare: {
    c1: '#9ec9ff', c2: '#3b82f6', c3: '#1b3f85',
    f1: '#ffd98a', f2: '#9a6a12',
    glow: 'rgba(59, 130, 246, 0.55)',
  },
  epique: {
    c1: '#dbb6ff', c2: '#a855f7', c3: '#4d1489',
    f1: '#ffd98a', f2: '#9a6a12',
    glow: 'rgba(168, 85, 247, 0.55)',
  },
  legendaire: {
    c1: '#ffe9a3', c2: '#ffc400', c3: '#8f5f00',
    f1: '#fff4cf', f2: '#a97b14',
    glow: 'rgba(255, 196, 0, 0.55)',
  },
  historique: {
    c1: '#ffb0c0', c2: '#ff2d55', c3: '#850b26',
    f1: '#ffd98a', f2: '#9a6a12',
    glow: 'rgba(255, 45, 85, 0.55)',
  },
};

/* Le contour du coffre : couvercle bombé, corps aux angles arrondis. Il sert
   aussi de masque — les aplats de lumière, d'ombre et les ferrures sont
   dessinés en grand puis découpés dedans, plutôt qu'ajustés un à un. */
const SILHOUETTE = 'M12 48V36a38 24 0 0 1 76 0v42a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z';

export default function CoffrePass({
  rarity,
  size = 72,
}: {
  rarity: CardRarity;
  size?: number;
}) {
  const t = TEINTES[rarity];
  // Plusieurs coffres cohabitent sur la piste : des identifiants fixes
  // feraient tous les suivants piocher les dégradés du premier.
  const cle = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="coffre"
      style={{ filter: `drop-shadow(0 5px 12px ${t.glow})` } as CSSProperties}
    >
      <defs>
        <clipPath id={`${cle}-c`}><path d={SILHOUETTE} /></clipPath>
        <linearGradient id={`${cle}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.f1} />
          <stop offset="100%" stopColor={t.f2} />
        </linearGradient>
      </defs>

      {/* L'ombre au sol : sans elle, le coffre flotte. */}
      <ellipse cx="50" cy="90" rx="34" ry="5" fill="#000" opacity="0.3" />

      <g clipPath={`url(#${cle}-c)`}>
        <rect x="0" y="0" width="100" height="100" fill={t.c2} />
        {/* La moitié droite bascule dans l'ombre d'un seul coup : c'est la
            coupe franche qui donne le volume, pas un dégradé mou. */}
        <path d="M58 0h42v100H58z" fill={t.c3} />
        <rect x="18" y="14" width="16" height="86" fill={t.c1} opacity="0.9" />

        {/* Le bandeau qui sépare couvercle et corps : c'est lui qui fait lire
            « coffre » et non « sac ». */}
        <rect x="0" y="44" width="100" height="12" fill={`url(#${cle}-f)`} />
        <g fill={`url(#${cle}-f)`}>
          <rect x="10" y="56" width="10" height="30" />
          <rect x="80" y="56" width="10" height="30" />
          <rect x="8" y="76" width="84" height="10" />
        </g>
      </g>

      <rect x="42" y="40" width="16" height="22" rx="4" fill={`url(#${cle}-f)`} />
      <circle cx="50" cy="48" r="3" fill="#4a3205" />
      <path d="M50 49l2 7h-4z" fill="#4a3205" />

      <path d={SILHOUETTE} fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="2.5" />
    </svg>
  );
}
