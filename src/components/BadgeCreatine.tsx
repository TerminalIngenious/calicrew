import { PALETTE_CREATINE } from '../lib/badges';
import BadgeHex, { type EncresGlyphe } from './BadgeHex';

/**
 * Les quatre paliers de créatine.
 *
 * Ils portaient tous la même goutte à quatre bleus voisins près. Chacun a
 * maintenant son dessin : la goutte nue, la goutte chargée, la goutte qui
 * rayonne, et la goutte devenue cristal.
 */
export default function BadgeCreatine({ id, size = 72 }: { id: string; size?: number }) {
  const palier = PALETTE_CREATINE.findIndex((p) => p.id === id);
  if (palier < 0) return null;
  return (
    <BadgeHex
      p={PALETTE_CREATINE[palier]}
      size={size}
      glyphe={(e) => <Glyphe palier={palier} e={e} />}
    />
  );
}

const GOUTTE = 'M50 14c14 19 24 30 24 43a24 24 0 01-48 0c0-13 10-24 24-43z';

/** Le reflet de la goutte : pleine, elle se lirait comme une tache. */
function Reflet() {
  return <ellipse cx="41" cy="52" rx="5" ry="8" fill="#fff" opacity="0.75" transform="rotate(-18 41 52)" />;
}

function Glyphe({ palier, e }: { palier: number; e: EncresGlyphe }) {
  // Sept jours : la goutte nue. Le premier palier n'a rien à prouver.
  if (palier === 0) {
    return <g><path d={GOUTTE} fill={e.encre} /><Reflet /></g>;
  }

  // Un mois : la goutte chargée.
  if (palier === 1) {
    return (
      <g>
        <path d={GOUTTE} fill={e.encre} />
        <path d="M54 33L37 62h11l-4 19 18-25H55z" fill={e.accent} />
      </g>
    );
  }

  // Cent jours : la goutte rayonne.
  if (palier === 2) {
    return (
      <g>
        <g stroke={e.accent} strokeWidth="6.5" strokeLinecap="round">
          <path d="M50 1v11M88 20l-8 7M88 80l-8-7M12 20l8 7M12 80l8-7" />
        </g>
        <path d={GOUTTE} fill={e.encre} />
        <Reflet />
      </g>
    );
  }

  // Une année : la goutte devenue cristal, et couronnée.
  return (
    <g>
      <path d="M22 16l11 10 17-18 17 18 11-10-5 19H27z" fill={e.accent} />
      <path d="M50 40l24 20-24 44-24-44z" fill={e.encre} />
      <g stroke={e.creux} strokeWidth="5" strokeLinejoin="round" fill="none" opacity="0.6">
        <path d="M26 60h48" />
        <path d="M50 40l-10 20 10 44 10-44z" />
      </g>
    </g>
  );
}
