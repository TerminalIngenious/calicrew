import { useId, type CSSProperties } from 'react';
import { PALETTE_CREATINE, type PaletteCreatine } from '../lib/badges';

/**
 * Les badges de créatine, dessinés entièrement en SVG.
 *
 * Les autres badges posent une icône monochrome sur un cœur presque noir
 * découpé en CSS. Les quatre paliers de créatine s'y ressemblaient tous :
 * même goutte, même fond sombre, seule la monture changeait de bleu. Ici le
 * cœur est en couleur pleine, la monture est biseautée et chaque palier a
 * son propre dessin — on les distingue même à trente-six pixels.
 */
export default function BadgeCreatine({ id, size = 72 }: { id: string; size?: number }) {
  const palier = PALETTE_CREATINE.findIndex((p) => p.id === id);
  // Deux badges du même palier peuvent cohabiter sur un écran : des
  // identifiants de dégradé fixes verraient le second réutiliser les défs du
  // premier.
  const cle = useId().replace(/:/g, '');
  if (palier < 0) return null;
  const p = PALETTE_CREATINE[palier];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      /* `rank-badge` est gardée : le bandeau du profil place ses médailles
         avec cette classe, et un badge créatine doit s'y ranger comme les
         autres. */
      className="rank-badge badge-creatine"
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

      <g transform="translate(50 51) scale(0.6) translate(-50 -50)">
        <Glyphe palier={palier} p={p} cle={cle} />
      </g>
    </svg>
  );
}

const HEX = '50,1 93.5,25.5 93.5,74.5 50,99 6.5,74.5 6.5,25.5';
const HEX_IN = '50,12 84,31.5 84,68.5 50,88 16,68.5 16,31.5';
const GOUTTE = 'M50 14c14 19 24 30 24 43a24 24 0 01-48 0c0-13 10-24 24-43z';

/** Le reflet de la goutte : pleine, elle se lirait comme une tache. */
function Reflet() {
  return <ellipse cx="41" cy="52" rx="5" ry="8" fill="#fff" opacity="0.75" transform="rotate(-18 41 52)" />;
}

function Glyphe({ palier, p, cle }: { palier: number; p: PaletteCreatine; cle: string }) {
  const encre = `url(#${cle}-g)`;

  // Sept jours : la goutte nue. Le premier palier n'a rien à prouver.
  if (palier === 0) {
    return <g><path d={GOUTTE} fill={encre} /><Reflet /></g>;
  }

  // Un mois : la goutte chargée.
  if (palier === 1) {
    return (
      <g>
        <path d={GOUTTE} fill={encre} />
        <path d="M54 33L37 62h11l-4 19 18-25H55z" fill={`url(#${cle}-a)`} />
      </g>
    );
  }

  // Cent jours : la goutte rayonne.
  if (palier === 2) {
    return (
      <g>
        <g stroke={`url(#${cle}-a)`} strokeWidth="6.5" strokeLinecap="round">
          <path d="M50 1v11M88 20l-8 7M88 80l-8-7M12 20l8 7M12 80l8-7" />
        </g>
        <path d={GOUTTE} fill={encre} />
        <Reflet />
      </g>
    );
  }

  // Une année : la goutte devenue cristal, et couronnée.
  return (
    <g>
      <path d="M22 16l11 10 17-18 17 18 11-10-5 19H27z" fill={`url(#${cle}-a)`} />
      <path d="M50 40l24 20-24 44-24-44z" fill={encre} />
      <g stroke={p.c2} strokeWidth="5" strokeLinejoin="round" fill="none" opacity="0.6">
        <path d="M26 60h48" />
        <path d="M50 40l-10 20 10 44 10-44z" />
      </g>
    </g>
  );
}
