import { Zap, Target, Clock, Footprints } from 'lucide-react';
import type { RankBadge, RankCategory } from '../types';
import { BADGE_CATEGORIES, BADGE_RANKS, estEvenement, eventStyle } from '../lib/badges';
import BadgeCreatine from './BadgeCreatine';
import BadgeFaceId from './BadgeFaceId';
import BadgePas from './BadgePas';

const CATEGORY_ICONS: Record<RankCategory, typeof Zap> = {
  reps: Zap,
  variety: Target,
  time: Clock,
  pas: Footprints,
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
    // Tous les badges d'événement sont dessinés en couleur de bout en bout :
    // la monture CSS et son cœur sombre ne savent pas les rendre.
    if (style.glyphe === 'creatine') return <BadgeCreatine id={badge.id} size={size} />;
    if (style.glyphe === 'pas') return <BadgePas id={badge.id} size={size} />;
    if (style.glyphe === 'faceid') return <BadgeFaceId size={size} />;
    return null;
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
