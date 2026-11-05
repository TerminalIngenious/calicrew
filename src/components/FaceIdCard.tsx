import { useState } from 'react';
import type { CarteFaceId } from '../lib/faceid';
import { faceLabel } from '../lib/faceid';

/**
 * Une carte de l'event.
 *
 * Une carte possédée est son image, bord à bord : le dessin est fourni
 * entier, comme pour la saison 1, et rien ne vient se poser dessus. Ce qu'on
 * ajouterait — crochets, prénom, mention de face — ferait double emploi avec
 * ce que l'illustration dit déjà, et finirait par la recouvrir.
 *
 * L'emplacement vide, lui, garde la monture : crochets de visée, silhouette
 * et « ??? ». Ce n'est pas une carte, c'est la case où il en manque une, et
 * elle doit se lire comme telle.
 *
 * Reste la révélation, commune aux deux : l'image arrive floutée et se résout
 * sous une ligne de balayage. C'est la seule carte de l'app qui n'apparaît
 * pas d'un coup, et c'est tout l'intérêt d'un event qui s'appelle FaceID.
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
        montreLaPhoto ? 'illustree' : '',
        revele ? 'reveal' : '',
        taille === 'grande' ? 'big' : '',
      ].filter(Boolean).join(' ')}
    >
      {!montreLaPhoto && (
        <>
          <span className="fid-corner tl" />
          <span className="fid-corner tr" />
          <span className="fid-corner bl" />
          <span className="fid-corner br" />
        </>
      )}

      <div className="fid-card-visuel">
        {montreLaPhoto ? (
          <img src={carte.image} alt={carte.nom} onError={() => setSansImage(true)} />
        ) : (
          <Silhouette />
        )}
        {revele && <span className="fid-scanline" />}
      </div>

      {/* L'illustration porte déjà le prénom : on ne l'écrit qu'en dessous
          d'une case vide, pour dire ce qui manque. « Non identifié » ne tient
          pas sur une vignette de 70 px et se coupait en « Non id… ». */}
      {!montreLaPhoto && (
        <div className="fid-card-pied">
          <span className="fid-card-nom">{anonyme ? '???' : carte.nom}</span>
          <span className="fid-card-face">{faceLabel(carte.face)}</span>
        </div>
      )}
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
