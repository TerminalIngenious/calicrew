import { Zap, Target, Clock } from 'lucide-react';
import type { RankBadge, RankCategory } from '../types';
import { BADGE_CATEGORIES, BADGE_RANKS, estEvenement, eventStyle } from '../lib/badges';

const CATEGORY_ICONS: Record<RankCategory, typeof Zap> = {
  reps: Zap,
  variety: Target,
  time: Clock,
};

/**
 * Médaille hexagonale. Deux lectures visuelles indépendantes :
 * la monture métallique donne la place du podium, le cœur coloré et
 * l'icône donnent le classement concerné.
 */
export default function RankBadgeIcon({
  badge,
  size = 72,
}: {
  badge: RankBadge;
  size?: number;
}) {
  // Un badge d'événement n'a pas de métal ni de catégorie : il porte les
  // couleurs de son événement et son propre dessin.
  if (estEvenement(badge)) {
    const style = eventStyle(badge);
    if (!style) return null;
    return (
      <div
        className="rank-badge event"
        style={{
          '--badge-size': `${size}px`,
          '--metal-from': style.from,
          '--metal-mid': style.mid,
          '--metal-to': style.to,
          '--metal-glow': style.glow,
          '--cat-from': style.coreFrom,
          '--cat-to': style.coreTo,
        } as React.CSSProperties}
      >
        <div className="rank-badge-frame">
          <div className="rank-badge-core">
            <GlypheFaceId size={size * 0.42} />
          </div>
        </div>
      </div>
    );
  }

  const category = BADGE_CATEGORIES[badge.category];
  const rank = BADGE_RANKS[badge.rank];
  if (!category || !rank) return null;

  const Icon = CATEGORY_ICONS[badge.category];

  return (
    <div
      className="rank-badge"
      style={{
        '--badge-size': `${size}px`,
        '--metal-from': rank.from,
        '--metal-mid': rank.mid,
        '--metal-to': rank.to,
        '--metal-glow': rank.glow,
        '--cat-from': category.from,
        '--cat-to': category.to,
      } as React.CSSProperties}
    >
      <div className="rank-badge-frame">
        <div className="rank-badge-core">
          <Icon size={size * 0.3} strokeWidth={2.4} />
        </div>
      </div>
      <span className="rank-badge-rank">{badge.rank + 1}</span>
    </div>
  );
}

/**
 * Le dessin du badge FaceID : un visage pris dans les quatre crochets de
 * visée. C'est le même signe que sur le sachet de booster et aux coins des
 * cartes de l'event — on doit reconnaître d'où il vient sans lire le nom.
 */
function GlypheFaceId({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth={9} strokeLinecap="round">
        <path d="M8 36V16a8 8 0 018-8h20M84 8h20a8 8 0 018 8v20M112 84v20a8 8 0 01-8 8H84M36 112H16a8 8 0 01-8-8V84" />
      </g>
      <g fill="currentColor">
        <circle cx="60" cy="51" r="15" />
        <path d="M33 100c0-15 12-24 27-24s27 9 27 24z" />
      </g>
    </svg>
  );
}
