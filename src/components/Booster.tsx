import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Scissors } from 'lucide-react';
import type { CarteAvent } from '../lib/avent';
import AventCardArt from './cardArt/AventCardArt';
import Godemichet from './cardArt/Godemichet';
import './Booster.css';

/** La part du bord qu'il faut avoir parcourue pour que le sachet cède. */
const SEUIL = 0.78;

/**
 * Le booster de l'event, et son ouverture.
 *
 * Un sachet ne s'ouvre pas en appuyant dessus : on le déchire. Le geste est
 * donc un trait du doigt le long du bord haut, et la carte ne sort que
 * quand le trait est allé au bout. Trois raisons :
 *
 *  — l'ouverture est un moment, pas une formalité ; un bouton l'aurait
 *    expédiée en 80 ms ;
 *  — le geste est le même que sur un vrai sachet, donc personne n'a besoin
 *    qu'on lui explique ;
 *  — on ne déchire pas un sachet par accident dans sa poche.
 *
 * Pour qui ne peut pas faire glisser (souris récalcitrante, lecteur
 * d'écran), un bouton apparaît dès le premier appui qui n'a pas abouti.
 */
export default function Booster({
  carte,
  jour,
  dore = false,
  onFini,
}: {
  carte: CarteAvent;
  jour?: number;
  /** Le booster des vingt-cinq portes : même sachet, en doré. */
  dore?: boolean;
  onFini: () => void;
}) {
  const [coupe, setCoupe] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  /** Affiché après un appui qui n'a pas déchiré : la sortie de secours. */
  const [aidePropose, setAidePropose] = useState(false);
  const bande = useRef<HTMLDivElement>(null);
  const depart = useRef<number | null>(null);

  function debut(e: ReactPointerEvent<HTMLDivElement>) {
    if (ouvert) return;
    depart.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function bouge(e: ReactPointerEvent<HTMLDivElement>) {
    if (ouvert || depart.current === null || !bande.current) return;
    const largeur = bande.current.getBoundingClientRect().width;
    const avance = Math.min(1, Math.max(0, (e.clientX - depart.current) / (largeur * 0.82)));
    setCoupe(avance);
    if (avance >= SEUIL) {
      depart.current = null;
      setOuvert(true);
    }
  }

  function fin() {
    if (ouvert) return;
    depart.current = null;
    // Le sachet se referme s'il n'a pas cédé : un bord à moitié déchiré qui
    // reste en l'état donnerait l'impression que c'est cassé.
    if (coupe > 0.04) setCoupe(0);
    else setAidePropose(true);
  }

  return (
    <div className={`bst-ecran ${ouvert ? 'ouvert' : ''}`}>
      <div className="bst-scene">
        <div
          className={`bst ${ouvert ? 'bst-ouvert' : ''} ${dore ? 'bst-dore' : ''}`}
          style={{ ['--coupe' as string]: coupe }}
        >
          {/* Le corps du sachet. Les reflets sont trois calques superposés :
              le fond métallisé, l'irisation en conique, et la bande de
              lumière qui balaie — séparés pour que seule la dernière bouge. */}
          <div className="bst-corps">
            <div className="bst-iris" aria-hidden="true" />
            <div className="bst-lueur" aria-hidden="true" />
            <div className="bst-pli" aria-hidden="true" />

            <div className="bst-contenu">
              {/* Le même objet que sur les cartes : c'est la marque de
                  l'event, elle ne se redessine pas à chaque endroit. */}
              <Godemichet className="bst-embleme" couleur="var(--bst-or)" />

              <span className="bst-titre">
                Branlette
                <em>Hivernale</em>
              </span>
              <span className="bst-bandeau">
                {dore ? 'Booster doré · 1 carte' : 'Booster · 1 carte'}
              </span>
              <span className="bst-pied">
                {dore ? 'Les 25 portes' : jour ? `Case du ${jour} décembre` : 'Avent 2026'}
              </span>
            </div>

            <div className="bst-neige" aria-hidden="true" />
          </div>

          {/* La bande du haut : la partie qu'on arrache. Elle porte le
              pointillé, et c'est elle qui s'envole. */}
          <div className="bst-bande" ref={bande}>
            <div className="bst-bande-fond">
              <span className="bst-consigne">
                <Scissors size={13} />
                Fais glisser pour déchirer
              </span>
            </div>
            <div className="bst-dechirure" aria-hidden="true" />
            {!ouvert && <div className="bst-doigt" aria-hidden="true" />}
            <div
              className="bst-zone"
              onPointerDown={debut}
              onPointerMove={bouge}
              onPointerUp={fin}
              onPointerCancel={fin}
            />
          </div>

          <div className="bst-eclair" aria-hidden="true" />
        </div>

        {/* La carte sort du sachet : même composant que partout ailleurs,
            retournable, pour qu'on puisse voir le dos dans la foulée. */}
        {ouvert && (
          <div className="bst-carte">
            <AventCardArt carte={carte} jour={jour} retournable />
          </div>
        )}
      </div>

      {ouvert ? (
        <button className="bst-continuer" onClick={onFini}>Continuer</button>
      ) : aidePropose ? (
        <button className="bst-secours" onClick={() => setOuvert(true)}>
          Ouvrir sans faire glisser
        </button>
      ) : null}
    </div>
  );
}
