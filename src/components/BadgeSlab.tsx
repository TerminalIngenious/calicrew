import { ChevronRight } from 'lucide-react';
import RankBadgeIcon from './RankBadgeIcon';
import { BADGE_RANKS } from '../lib/badges';
import type { RankBadge } from '../types';

/**
 * Les badges d'un profil, sur un bandeau unique.
 *
 * Ils étaient étalés en grille, une tuile par badge : à quatorze médailles, la
 * section faisait 753 px — un écran et demi de téléphone avant d'atteindre la
 * suite du profil. Le bandeau reprend la forme des saisons, avec les trois
 * plus prestigieux en éventail au fond, et mène à leur page.
 */

interface Props {
  badges: RankBadge[];
  onOpen: () => void;
}

/** « 4 or · 5 argent · 5 bronze », en sautant les métaux absents. */
function resume(badges: RankBadge[]): string {
  return BADGE_RANKS.map((rang, i) => {
    const n = badges.filter((b) => b.rank === i).length;
    return n > 0 ? `${n} ${rang.name.toLowerCase()}` : null;
  })
    .filter(Boolean)
    .join(' · ');
}

export default function BadgeSlab({ badges, onOpen }: Props) {
  return (
    <div className="season-slab-wrap">
      <button className="season-slab" onClick={onOpen}>
        {/* Les trois premiers de la liste, déjà triée du plus prestigieux au
            plus récent — le même ordre que les cartes marquantes d'une saison. */}
        <div className="season-slab-bg badge-slab-bg" aria-hidden="true">
          {badges.slice(0, 3).map((badge) => (
            <RankBadgeIcon key={badge.id} badge={badge} size={74} />
          ))}
        </div>
        <div className="season-slab-face">
          <span className="season-slab-kicker">Récompenses</span>
          <span className="season-slab-title">Badges</span>
          <span className="season-slab-count">{resume(badges)}</span>
        </div>
        <ChevronRight size={18} className="season-slab-chevron" />
      </button>
    </div>
  );
}
