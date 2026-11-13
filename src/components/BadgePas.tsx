import { PALETTE_PAS } from '../lib/badges';
import BadgeHex, { type EncresGlyphe } from './BadgeHex';

/**
 * Les badges de pas : quatre journées, trois cumuls.
 *
 * Les sept portaient la même paire d'empreintes. La journée garde le pied —
 * c'est un coup d'éclat, on l'a fait avec ses jambes — et le cumul passe au
 * paysage : la route, la montagne, le tour du monde. Deux familles qu'on ne
 * cherche plus à comparer.
 */
export default function BadgePas({ id, size = 72 }: { id: string; size?: number }) {
  const palier = PALETTE_PAS.findIndex((p) => p.id === id);
  if (palier < 0) return null;
  return (
    <BadgeHex
      p={PALETTE_PAS[palier]}
      size={size}
      glyphe={(e) => <Glyphe palier={palier} e={e} />}
    />
  );
}

/** La paire d'empreintes, décalée : alignée, elle se lit comme deux taches. */
function Empreintes({ fill }: { fill: string }) {
  return (
    <g fill={fill} transform="scale(0.833)">
      <g transform="translate(6 2) rotate(-8 30 60)">
        <ellipse cx="30" cy="62" rx="15" ry="24" />
        <ellipse cx="30" cy="31" rx="12" ry="10" />
      </g>
      <g transform="translate(-6 -2) rotate(8 86 60)">
        <ellipse cx="86" cy="58" rx="15" ry="24" />
        <ellipse cx="86" cy="89" rx="12" ry="10" />
      </g>
    </g>
  );
}

/**
 * Une seule empreinte, quand il y a autre chose autour.
 *
 * Avec les orteils détachés, et pas seulement une grosse ellipse surmontée
 * d'une petite : sans eux, le dessin se lisait comme une quille de bowling.
 */
function Empreinte({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <path d="M34 56c0-13 7-21 16-21s16 8 16 21c0 8-3 12-3 19 0 11-5 19-13 19s-13-8-13-19c0-7-3-11-3-19z" />
      <ellipse cx="28" cy="38" rx="6" ry="7.5" transform="rotate(-22 28 38)" />
      <ellipse cx="39" cy="26" rx="6.5" ry="8" />
      <ellipse cx="51" cy="22" rx="6.5" ry="8" />
      <ellipse cx="62" cy="26" rx="6" ry="7.5" />
      <ellipse cx="72" cy="38" rx="5.5" ry="7" transform="rotate(22 72 38)" />
    </g>
  );
}

function Glyphe({ palier, e }: { palier: number; e: EncresGlyphe }) {
  switch (palier) {
    // 10 000 : la paire d'empreintes. Le premier palier dit juste « tu as marché ».
    case 0:
      return <Empreintes fill={e.encre} />;

    // 15 000 : la chaussure. On n'est plus sorti en savates.
    case 1:
      return (
        <g>
          <path
            d="M6 82c0-17 10-27 25-33l11-5c4-2 9 0 11 4l8 14 25 14c7 4 11 10 11 19v5H6z"
            fill={e.encre}
          />
          <path d="M2 82h96a4 4 0 014 5v3a10 10 0 01-10 10H14A12 12 0 012 88z" fill={e.accent} />
          {/* Les lacets creusés dans le ton du cœur : en clair sur un corps
              clair, ils disparaissaient et la chaussure faisait bloc. */}
          <g stroke={e.creux} strokeWidth="5" strokeLinecap="round" opacity="0.75">
            <path d="M31 62l15 8M40 50l15 8M49 38l14 8" />
          </g>
        </g>
      );

    // 20 000 : l'empreinte lancée. Les traits disent la vitesse.
    case 2:
      return (
        <g>
          <g stroke={e.accent} strokeWidth="6.5" strokeLinecap="round">
            <path d="M6 32h18M2 52h16M8 72h20" />
          </g>
          <g transform="translate(16 0) scale(0.92) translate(0 4)"><Empreinte fill={e.encre} /></g>
        </g>
      );

    // 30 000 : l'empreinte dans la flamme. Trente mille pas, ça brûle.
    case 3:
      return (
        <g>
          <path
            d="M50 2c8 18 30 26 30 50a30 30 0 01-60 0c0-16 10-21 15-31 2 9 6 13 9 15-3-13-1-24 6-34z"
            fill={e.accent}
          />
          <g transform="translate(50 62) scale(0.62) translate(-50 -52)">
            <Empreinte fill={e.encre} />
          </g>
        </g>
      );

    // 100 000 : la route. Le cumul ne se compte plus en pieds mais en chemin.
    case 4:
      return (
        <g>
          <path d="M8 96L38 12h24l30 84z" fill={e.encre} />
          {/* Les bas-côtés en creux : sans eux, le trapèze se lisait comme
              une cravate et pas comme une route qui s'éloigne. */}
          <path d="M8 96l30-84h5L20 96zM92 96L62 12h-5l23 84z" fill={e.creux} opacity="0.5" />
          <g fill={e.creux}>
            <rect x="46" y="22" width="8" height="13" rx="2" />
            <rect x="45" y="47" width="10" height="16" rx="2" />
            <rect x="43" y="76" width="14" height="19" rx="2" />
          </g>
        </g>
      );

    // 500 000 : la montagne. À ce compte-là, on monte vraiment quelque part.
    case 5:
      return (
        <g>
          <circle cx="76" cy="26" r="11" fill={e.accent} />
          <path d="M2 92L32 30l19 32 15-24 33 54z" fill={e.encre} />
          {/* Le versant à l'ombre, creusé dans le ton du cœur : sans lui, la
              silhouette blanche n'avait aucun relief. */}
          <path d="M32 30l19 32-9 30-40 0z" fill={e.creux} opacity="0.45" />
        </g>
      );

    // Un million : le tour du monde, couronné.
    default:
      return (
        <g>
          <path d="M24 22l11 10 15-18 15 18 11-10-4 18H28z" fill={e.accent} />
          <circle cx="50" cy="63" r="31" fill={e.encre} />
          <g stroke={e.creux} strokeWidth="4.5" fill="none" opacity="0.65">
            <ellipse cx="50" cy="63" rx="13" ry="31" />
            <path d="M21 52h58M21 74h58" />
          </g>
        </g>
      );
  }
}
