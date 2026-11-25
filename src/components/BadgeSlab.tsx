import { ChevronRight } from 'lucide-react';
import RankBadgeIcon from './RankBadgeIcon';
import { BADGE_RANKS, estEvenement } from '../lib/badges';
import type { RankBadge } from '../types';

/**
 * Les badges d'un profil, sur un bandeau unique.
 *
 * Ils étaient étalés en grille, une tuile par badge : à quatorze médailles, la
 * section faisait 753 px — un écran et demi de téléphone avant d'atteindre la
 * suite du profil. Le bandeau reprend la forme des saisons, avec les trois
 * plus prestigieux en éventail au fond, et mène à leur page.
 *
 * Il a depuis maigri d'un tiers. Sur le profil il voisine maintenant avec la
 * ligne des cartes et celle de la progression, et à 124 px de haut il pesait
 * autant que les deux réunies alors qu'il dit moins de choses. Les médailles
 * passent de 74 à 52 px : ce sont des vignettes qui annoncent une page, pas
 * les objets eux-mêmes — ceux-là sont sur la page des badges.
 */

interface Props {
  badges: RankBadge[];
  onOpen: () => void;
}

/**
 * « 14 badges · 4 or ».
 *
 * La répartition complète — or, argent, bronze, événements — tenait ici et
 * passait sur deux lignes depuis que le bandeau a maigri. Elle vit désormais
 * dans l'en-tête de la page des badges, où elle a la place. Ce qui reste est
 * ce qu'on lit d'un coup d'œil : combien, et le plus prestigieux.
 */
function resume(badges: RankBadge[]): string {
  const total = `${badges.length} badge${badges.length > 1 ? 's' : ''}`;
  // Les badges d'événement n'ont pas de métal : comptés par `rank`, ils
  // seraient passés pour de l'or.
  const metaux = badges.filter((b) => !estEvenement(b));
  const meilleur = BADGE_RANKS.findIndex((_, i) => metaux.some((b) => b.rank === i));
  if (meilleur < 0) return total;
  const n = metaux.filter((b) => b.rank === meilleur).length;
  return `${total} · ${n} ${BADGE_RANKS[meilleur].name.toLowerCase()}`;
}

export default function BadgeSlab({ badges, onOpen }: Props) {
  return (
    <div className="season-slab-wrap">
      <button className="season-slab" onClick={onOpen}>
        {/* Les trois premiers de la liste, déjà triée du plus prestigieux au
            plus récent — le même ordre que les cartes marquantes d'une saison. */}
        <div className="season-slab-bg badge-slab-bg" aria-hidden="true">
          {badges.slice(0, 3).map((badge) => (
            <RankBadgeIcon key={badge.id} badge={badge} size={52} />
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
