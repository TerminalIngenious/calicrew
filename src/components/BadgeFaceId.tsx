import { PALETTE_FACEID } from '../lib/badges';
import BadgeHex, { type EncresGlyphe } from './BadgeHex';

/**
 * Le badge de l'event FaceID : le fichier complet.
 *
 * Il restait le seul badge d'événement en icône blanche posée sur un cœur
 * presque noir, à côté de médailles dessinées en couleur. Le signe change
 * aussi : les crochets de visée disaient l'event, pas ce qu'on a fait
 * dedans. L'éventail de cartes et le coche disent la seule chose qui
 * compte ici — les avoir toutes.
 */
export default function BadgeFaceId({ size = 72 }: { size?: number }) {
  return <BadgeHex p={PALETTE_FACEID} size={size} glyphe={(e) => <Glyphe e={e} />} />;
}

function Glyphe({ e }: { e: EncresGlyphe }) {
  return (
    <g>
      {/* Les deux cartes du dessous sont bordées dans le ton du cœur :
          sans ce liseré, l'éventail se refermait en une seule tache. */}
      <g fill={e.encre} stroke={e.creux} strokeWidth="2.5">
        <rect x="8" y="22" width="44" height="62" rx="7" transform="rotate(-14 30 53)" />
        <rect x="48" y="22" width="44" height="62" rx="7" transform="rotate(14 70 53)" />
        <rect x="28" y="16" width="44" height="64" rx="7" />
      </g>
      {/* Le visage est creusé dans la carte du dessus, et non posé dessus :
          en clair sur clair, il aurait disparu. */}
      <g fill={e.creux}>
        <circle cx="50" cy="38" r="9" />
        <path d="M35 66c0-8 7-14 15-14s15 6 15 14z" />
      </g>
      <circle cx="78" cy="80" r="16" fill={e.accent} />
      <path
        d="M70 80l6 7 11-13"
        stroke={e.creux}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
