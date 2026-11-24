import { Gift, ChevronRight } from 'lucide-react';
import { CARTES, enCours, lis, nbPossedees, TOTAL_CARTES } from '../lib/avent';
import type { AventProgress } from '../types';

/**
 * La collection de l'avent dans le profil.
 *
 * Même forme que celle de FaceID, et même règle : le bandeau survit à la
 * fin de l'event, parce que les quarante-cinq cartes ramenées en décembre
 * sont justement ce qu'on vient montrer en mars. Il ne s'affiche pas tant
 * que la première case n'est pas ouverte, sauf pendant l'event lui-même,
 * où il annonce ce qui attend.
 */
export default function AventShelf({
  avent,
  onOpen,
  termine = false,
}: {
  avent?: AventProgress;
  /** Ouvre la collection — celle du joueur dont c'est le profil. */
  onOpen?: () => void;
  /** L'event est fini : le bandeau part au fond de la page, marqué comme tel. */
  termine?: boolean;
}) {
  const av = lis(avent);
  const possedees = nbPossedees(av);
  if (possedees === 0 && !enCours()) return null;

  const apercu = CARTES.filter((c) => (av.cartes[c.slug] || 0) > 0).slice(0, 3);
  const vides = 3 - apercu.length;

  return (
    <section className="section">
      <button className={`ev-shelf ${termine ? 'termine' : ''}`} onClick={onOpen} disabled={!onOpen}>
        <div className="ev-shelf-vignettes" aria-hidden="true">
          {apercu.map((c) => (
            <img key={c.slug} src={c.image} alt="" className="ev-shelf-vignette" />
          ))}
          {Array.from({ length: vides }, (_, i) => (
            <span key={`vide-${i}`} className="ev-shelf-vignette vide" />
          ))}
        </div>
        <div className="ev-shelf-texte">
          <span className="ev-shelf-kicker"><Gift size={13} /> Événement</span>
          <span className="ev-shelf-titre">Branlette Estivale</span>
          <span className="ev-shelf-compte">{possedees} / {TOTAL_CARTES} cartes trouvées</span>
          <div className="ev-shelf-jauge">
            <span style={{ width: `${(possedees / TOTAL_CARTES) * 100}%` }} />
          </div>
        </div>
        {termine && <span className="ev-shelf-etat">Terminé</span>}
        {onOpen && <ChevronRight size={18} className="ev-shelf-fleche" />}
      </button>
    </section>
  );
}
