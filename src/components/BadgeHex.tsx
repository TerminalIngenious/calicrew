import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PaletteBadge } from '../lib/badges';

/**
 * La médaille hexagonale des badges d'événement, dessinée en SVG.
 *
 * Les badges de classement posent une icône monochrome sur un cœur presque
 * noir découpé en CSS : les paliers d'une même famille s'y ressemblaient
 * tous, seule la monture changeait de teinte. Ici le cœur est en couleur
 * pleine, la monture est biseautée, et le dessin est passé par l'appelant —
 * on distingue deux paliers même à trente-six pixels.
 */
export interface EncresGlyphe {
  /** L'encre du dessin. */
  encre: string;
  /** L'accent, pour le détail qui tranche. */
  accent: string;
  /** Le ton du cœur, pour creuser un trait dans le dessin. */
  creux: string;
}

export default function BadgeHex({
  p,
  size,
  glyphe,
}: {
  p: PaletteBadge;
  size: number;
  glyphe: (encres: EncresGlyphe) => ReactNode;
}) {
  // Deux badges de la même famille peuvent cohabiter sur un écran : des
  // identifiants de dégradé fixes verraient le second réutiliser les défs du
  // premier.
  const cle = useId().replace(/:/g, '');

  /*
   * Le dessin est recentré d'après ce qu'il occupe vraiment.
   *
   * Une flamme, une route et une paire d'empreintes ne remplissent pas la
   * même part du carré de cent : calés sur ce carré, les uns penchaient à
   * droite, les autres tombaient vers le bas. On mesure leur encombrement
   * réel et on les ramène au centre de l'hexagone — ça vaut aussi pour les
   * dessins qu'on ajoutera plus tard.
   */
  const dessin = useRef<SVGGElement>(null);
  const [pose, setPose] = useState(POSE_DEFAUT);
  useLayoutEffect(() => {
    const g = dessin.current;
    if (!g) return;
    try {
      // getBBox ignore la transformation du nœud mesuré : le résultat ne
      // dépend donc pas de la pose déjà appliquée, et une seule passe suffit.
      const b = g.getBBox();
      if (!b.width || !b.height) return;
      const k = Math.min(LARGEUR / b.width, HAUTEUR / b.height);
      setPose(`translate(50 50) scale(${k}) translate(${-(b.x + b.width / 2)} ${-(b.y + b.height / 2)})`);
    } catch {
      // getBBox jette sur un nœud qui n'est pas rendu : le dessin garde la
      // pose par défaut, qui convient à un dessin remplissant son carré.
    }
  }, [p.id]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      /* `rank-badge` est gardée : le bandeau du profil place ses médailles
         avec cette classe, et ces badges-ci doivent s'y ranger comme les
         autres. */
      className="rank-badge badge-svg"
      style={{
        '--badge-size': `${size}px`,
        filter: `drop-shadow(0 4px 12px ${p.glow})`,
      } as CSSProperties}
    >
      <defs>
        <linearGradient id={`${cle}-m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.m1} />
          <stop offset="42%" stopColor={p.m2} />
          <stop offset="100%" stopColor={p.m3} />
        </linearGradient>
        <radialGradient id={`${cle}-c`} cx="0.35" cy="0.18" r="1.05">
          <stop offset="0%" stopColor={p.c1} />
          <stop offset="48%" stopColor={p.c2} />
          <stop offset="100%" stopColor={p.c3} />
        </radialGradient>
        <linearGradient id={`${cle}-g`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={p.g1} />
          <stop offset="100%" stopColor={p.g2} />
        </linearGradient>
        <linearGradient id={`${cle}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.acc1} />
          <stop offset="100%" stopColor={p.acc2} />
        </linearGradient>
        <linearGradient id={`${cle}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${cle}-clip`}><polygon points={HEX_IN} /></clipPath>
      </defs>

      {/* La monture, biseautée : un liseré clair en haut, l'ombre en bas. */}
      <polygon points={HEX} fill={`url(#${cle}-m)`} />
      <polygon points={HEX} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />

      <polygon points={HEX_IN} fill={`url(#${cle}-c)`} />
      <g clipPath={`url(#${cle}-clip)`}>
        {/* Le voile de lumière du haut : ce qui fait « verre » et pas « aplat ». */}
        <ellipse cx="50" cy="16" rx="42" ry="26" fill={`url(#${cle}-s)`} />
      </g>
      <polygon points={HEX_IN} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="1.4" />

      <g ref={dessin} transform={pose}>
        {glyphe({ encre: `url(#${cle}-g)`, accent: `url(#${cle}-a)`, creux: p.c2 })}
      </g>
    </svg>
  );
}

const HEX = '50,1 93.5,25.5 93.5,74.5 50,99 6.5,74.5 6.5,25.5';

/* La place laissée au dessin dans le cœur. Moins large que haute : un
   hexagone pointe en haut se referme vite, et un dessin qui remplirait les
   cinquante-six pixels du milieu mordrait sur la monture en haut et en bas. */
const LARGEUR = 56;
const HAUTEUR = 50;
/* Avant la mesure : ce que faisait le cadre quand chaque dessin était censé
   remplir son carré de cent. */
const POSE_DEFAUT = 'translate(50 50) scale(0.6) translate(-50 -50)';
const HEX_IN = '50,12 84,31.5 84,68.5 50,88 16,68.5 16,31.5';
