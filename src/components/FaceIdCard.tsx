import { useState } from 'react';
import type { CarteFaceId } from '../lib/faceid';
import { faceLabel } from '../lib/faceid';

/**
 * Une carte de l'event.
 *
 * Trois états : possédée, non possédée, et en cours de révélation. Le dernier
 * sert à l'ouverture d'un booster — la photo arrive floutée et se résout sous
 * une ligne de balayage, comme une image qu'on scanne. C'est le seul endroit
 * de l'app où une carte n'apparaît pas d'un coup, et c'est tout l'intérêt de
 * l'event : il s'appelle FaceID.
 */
export default function FaceIdCard({
  carte,
  possedee,
  revele = false,
  anonyme = false,
  taille = 'normale',
}: {
  carte: CarteFaceId;
  possedee: boolean;
  /** Joue l'animation de scan à l'apparition. */
  revele?: boolean;
  /** Masque le nom : on ne sait pas encore qui c'est. */
  anonyme?: boolean;
  taille?: 'normale' | 'grande';
}) {
  // Les photos ne sont pas encore là : la silhouette prend le relais sans
  // qu'on ait à tenir une liste de ce qui existe ou non.
  const [sansImage, setSansImage] = useState(false);
  const montreLaPhoto = possedee && !sansImage;

  return (
    <div
      className={[
        'fid-card',
        possedee ? 'owned' : 'locked',
        revele ? 'reveal' : '',
        taille === 'grande' ? 'big' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="fid-corner tl" />
      <span className="fid-corner tr" />
      <span className="fid-corner bl" />
      <span className="fid-corner br" />

      <div className="fid-card-visuel">
        {montreLaPhoto ? (
          <img src={carte.image} alt={carte.nom} onError={() => setSansImage(true)} />
        ) : (
          <Silhouette />
        )}
        {revele && <span className="fid-scanline" />}
      </div>

      <div className="fid-card-pied">
        {/* « Non identifié » ne tient pas sur une vignette de 70 px et se
            coupait en « Non id… ». Trois points d'interrogation disent la
            même chose et tiennent partout. */}
        <span className="fid-card-nom">
          {possedee && !anonyme ? carte.nom : '???'}
        </span>
        <span className="fid-card-face">{faceLabel(carte.face)}</span>
      </div>
    </div>
  );
}

function Silhouette() {
  return (
    <svg className="fid-silhouette" viewBox="0 0 100 120" aria-hidden="true">
      <circle cx="50" cy="42" r="22" />
      <path d="M12 120c0-23 17-38 38-38s38 15 38 38z" />
    </svg>
  );
}
