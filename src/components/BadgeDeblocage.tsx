import { useEffect, useRef, useState } from 'react';
import type { RankBadge } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { badgeTitle, estEvenement, eventStyle } from '../lib/badges';
import { lisBadgesVus, ecrisBadgesVus } from '../lib/badgesVus';
import RankBadgeIcon from './RankBadgeIcon';

/**
 * L'annonce d'un badge qui vient d'être gagné.
 *
 * Posée au-dessus de toute l'app et non dans une page : un badge peut tomber
 * pendant qu'on est sur le groupe ou sur le pass, et l'annoncer à la
 * prochaine visite de l'accueil reviendrait à ne pas l'annoncer.
 *
 * Un appui n'importe où passe au suivant, puis ferme. Pas de bouton :
 * l'écran entier est la cible, c'est le geste le plus simple à trouver quand
 * on ne s'attendait pas à voir quelque chose apparaître.
 */
export default function BadgeDeblocage() {
  const { user } = useAuth();
  const { progress } = useUserProgress(user?.uid);
  const [file, setFile] = useState<RankBadge[]>([]);
  /** Les identifiants déjà annoncés, en mémoire pour ne pas relire à chaque rendu. */
  const vus = useRef<Set<string> | null>(null);
  const uidCharge = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !progress) return;

    if (uidCharge.current !== uid) {
      uidCharge.current = uid;
      vus.current = lisBadgesVus(uid);
    }

    const badges = progress.badges || [];

    /*
     * Première ouverture depuis que l'annonce existe : on enregistre tout ce
     * qui est déjà gagné sans rien montrer. Sinon quelqu'un qui a six badges
     * derrière lui en prendrait six dans la figure à l'ouverture.
     */
    if (vus.current === null) {
      vus.current = new Set(badges.map((b) => b.id));
      ecrisBadgesVus(uid, vus.current);
      return;
    }

    const connus = vus.current;
    const nouveaux = badges.filter((b) => !connus.has(b.id));
    if (nouveaux.length === 0) return;

    // Marqués vus dès qu'ils entrent dans la file : si l'app se ferme
    // pendant l'animation, le badge est acquis et l'annonce a eu lieu.
    for (const b of nouveaux) connus.add(b.id);
    ecrisBadgesVus(uid, connus);
    setFile((f) => [...f, ...nouveaux]);
  }, [user, progress]);

  if (file.length === 0) return null;

  return (
    <AnnonceBadge
      badge={file[0]}
      restants={file.length - 1}
      onSuivant={() => setFile((f) => f.slice(1))}
    />
  );
}

/**
 * L'écran lui-même, sans la mécanique qui décide quand le montrer.
 *
 * Séparé pour pouvoir être regardé avec un badge quelconque sans toucher à
 * la progression de qui que ce soit — un écran qu'on ne peut relire qu'en
 * gagnant vraiment un badge ne se relit jamais.
 */
export function AnnonceBadge({
  badge,
  restants,
  onSuivant,
}: {
  badge: RankBadge;
  restants: number;
  onSuivant: () => void;
}) {
  const style = estEvenement(badge) ? eventStyle(badge) : undefined;

  return (
    <div
      className="deblocage"
      onClick={onSuivant}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSuivant(); }}
    >
      <div className="deblocage-halo" aria-hidden="true" />
      <div className="deblocage-contenu">
        <span className="deblocage-kicker">Badge débloqué</span>
        <div className="deblocage-badge">
          <RankBadgeIcon badge={badge} size={150} />
        </div>
        <span className="deblocage-titre">{style?.titre ?? badgeTitle(badge)}</span>
        {style?.soustitre && <span className="deblocage-sous">{style.soustitre}</span>}
        <span className="deblocage-suite">
          {restants > 0
            ? `Appuie pour la suite · ${restants} autre${restants > 1 ? 's' : ''}`
            : 'Appuie pour continuer'}
        </span>
      </div>
    </div>
  );
}
