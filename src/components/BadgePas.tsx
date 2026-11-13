import type { ReactNode } from 'react';
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

/*
 * Les pieds viennent de l'icône `Footprints` de lucide — exactement celle
 * de la carte des pas sur l'accueil. Les empreintes dessinées à la main
 * n'étaient pas les mêmes d'un badge à l'autre que sur l'écran où l'on
 * compte ses pas, et deux pieds différents pour la même chose, ça se voit.
 *
 * Dessin au trait, dans sa grille d'origine de vingt-quatre : les
 * composants ci-dessous le remettent à l'échelle du centième des autres
 * dessins, pour qu'on puisse l'y composer sans calcul.
 */
const PIED_GAUCHE = 'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z';
const PIED_DROIT = 'M20 20v-2.38c0-1.12 1.03-2.12 1-4.62-.03-2.72-1.49-6-4.5-6C14.63 7 14 8.8 14 10.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z';

/** Le trait de lucide, épaissi : à côté de dessins pleins, il s'effaçait. */
function Trait({ encre, children }: { encre: string; children: ReactNode }) {
  return (
    <g stroke={encre} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {children}
    </g>
  );
}

/** La paire, à l'échelle du centième. */
function Empreintes({ encre, pose = 'translate(-9 -8) scale(4.3)' }: { encre: string; pose?: string }) {
  return (
    <g transform={pose}>
      <Trait encre={encre}>
        <path d={PIED_GAUCHE} />
        <path d={PIED_DROIT} />
        <path d="M16 17h4" />
        <path d="M4 13h4" />
      </Trait>
    </g>
  );
}

/** Un seul pied, quand il y a autre chose autour. */
function Empreinte({ encre, pose }: { encre: string; pose: string }) {
  return (
    <g transform={pose}>
      <Trait encre={encre}>
        <path d={PIED_GAUCHE} />
        <path d="M4 13h4" />
      </Trait>
    </g>
  );
}

function Glyphe({ palier, e }: { palier: number; e: EncresGlyphe }) {
  switch (palier) {
    // 10 000 : la paire d'empreintes. Le premier palier dit juste « tu as marché ».
    case 0:
      return <Empreintes encre={e.encre} />;

    // 15 000 : les mêmes pieds, et deux chevrons qui montent.
    //
    // C'était une chaussure, qu'on lisait comme une part de gâteau : de
    // profil et sans pied dedans, une chaussure n'est qu'un coin arrondi.
    // Les chevrons, eux, ne disent qu'une chose — c'est au-dessus.
    case 1:
      return (
        <g>
          <g stroke={e.accent} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M6 54l16-16 16 16M6 86l16-16 16 16" />
          </g>
          <Empreintes encre={e.encre} pose="translate(40 -6) scale(4.6)" />
        </g>
      );

    // 20 000 : l'empreinte lancée. Les traits disent la vitesse.
    case 2:
      return (
        <g>
          <g stroke={e.accent} strokeWidth="6.5" strokeLinecap="round">
            <path d="M4 30h26M0 54h20M6 78h28" />
          </g>
          <Empreinte encre={e.encre} pose="translate(27 -7) scale(5.6)" />
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
          <Empreinte encre={e.encre} pose="translate(32 35) scale(2.75)" />
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
