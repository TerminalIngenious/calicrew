import type { CarteFaceId } from '../lib/faceid';
import { faceLabel } from '../lib/faceid';
import FaceIdCardArt from './cardArt/FaceIdCardArt';

/**
 * Un emplacement du fichier.
 *
 * Possédé, il affiche la carte dessinée — voir cardArt/FaceIdCardArt.
 * Vide, il garde la monture de l'event : crochets de visée, silhouette et
 * « ??? ». Ce n'est pas une carte, c'est la case où il en manque une, et elle
 * doit se lire comme telle.
 *
 * La révélation est commune aux deux : la carte arrive floutée et se résout
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
  return (
    <div
      className={[
        'fid-card',
        possedee ? 'owned illustree' : 'locked',
        revele ? 'reveal' : '',
        taille === 'grande' ? 'big' : '',
      ].filter(Boolean).join(' ')}
    >
      {possedee ? (
        <div className="fid-card-visuel">
          <FaceIdCardArt carte={carte} />
          {revele && <span className="fid-scanline" />}
        </div>
      ) : (
        <>
          <span className="fid-corner tl" />
          <span className="fid-corner tr" />
          <span className="fid-corner bl" />
          <span className="fid-corner br" />

          <div className="fid-card-visuel">
            <Silhouette />
            {revele && <span className="fid-scanline" />}
          </div>

          {/* « Non identifié » ne tient pas sur une vignette de 70 px et se
              coupait en « Non id… ». Trois points d'interrogation disent la
              même chose et tiennent partout. */}
          <div className="fid-card-pied">
            <span className="fid-card-nom">{anonyme ? '???' : carte.nom}</span>
            <span className="fid-card-face">{faceLabel(carte.face)}</span>
          </div>
        </>
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
