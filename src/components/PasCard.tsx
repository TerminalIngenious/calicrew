import { useState } from 'react';
import { Footprints, Check } from 'lucide-react';
import { usePas, pasXp, PAS_SEUIL, prochainPalier } from '../lib/pas';

/**
 * La saisie des pas du jour, sur l'accueil.
 *
 * Une tuile et non un écran : marcher n'est pas une séance, ça ne se
 * commence ni ne se termine. On recopie le chiffre de son téléphone une fois
 * dans la journée, comme on coche sa créatine.
 *
 * Le champ affiche ce qui est déjà enregistré et se corrige autant qu'on
 * veut — l'XP n'est versée qu'à hauteur de la différence, voir lib/pas.ts.
 */
export default function PasCard() {
  const { pasDuJour, loading, enregistre } = usePas();
  const [occupe, setOccupe] = useState(false);
  const [vientDEnregistrer, setVientDEnregistrer] = useState(false);

  /*
   * Le champ affiche ce qui est enregistré tant qu'on n'a rien tapé.
   *
   * Le brouillon vaut `null` quand il n'y en a pas, et la valeur affichée se
   * déduit : ainsi la saisie suit l'enregistrement sans qu'un effet ait à les
   * recopier l'un dans l'autre à chaque arrivée de Firestore.
   */
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const saisie = brouillon ?? (pasDuJour > 0 ? String(pasDuJour) : '');

  const valeur = Number(saisie.replace(/\s/g, ''));
  const valide = Number.isFinite(valeur) && valeur >= 0;
  const change = valide && valeur !== pasDuJour;

  async function valide_() {
    if (!change || occupe) return;
    setOccupe(true);
    await enregistre(valeur);
    setOccupe(false);
    // Le champ redevient le reflet de l'enregistrement.
    setBrouillon(null);
    setVientDEnregistrer(true);
    window.setTimeout(() => setVientDEnregistrer(false), 2000);
  }

  const xp = valide ? pasXp(valeur) : 0;

  return (
    <div className="pas-card">
      <div className="pas-card-haut">
        <Footprints size={18} />
        <div className="pas-card-titres">
          <span className="pas-card-titre">Pas d'aujourd'hui</span>
          <span className="pas-card-sous">
            {loading
              ? 'Chargement…'
              : pasDuJour > 0
                ? `${pasDuJour.toLocaleString('fr-FR')} pas · ${pasXp(pasDuJour)} XP`
                : `Recopie le chiffre de ton téléphone`}
          </span>
        </div>
        {vientDEnregistrer && <Check size={18} className="pas-card-ok" />}
      </div>

      <div className="pas-card-saisie">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="100"
          placeholder="0"
          value={saisie}
          onChange={(e) => setBrouillon(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') valide_(); }}
        />
        <button
          className="primary-btn small"
          onClick={valide_}
          disabled={!change || occupe}
        >
          {occupe ? '…' : 'Valider'}
        </button>
      </div>

      {/* On dit ce que ça rapporte avant d'enregistrer : un barème qu'on
          découvre après coup n'encourage personne. */}
      <span className="pas-card-bareme">
        {valide && valeur > 0
          ? xp > 0
            ? `${xp} XP — encore ${prochainPalier(valeur)} pas pour le prochain`
            : `Les ${PAS_SEUIL.toLocaleString('fr-FR')} premiers pas sont ceux de la vie courante. Plus que ${(PAS_SEUIL - valeur).toLocaleString('fr-FR')}.`
          : `250 pas = 1 XP, au-delà des ${PAS_SEUIL.toLocaleString('fr-FR')} premiers`}
      </span>

      {/* Sinon on se demande pourquoi le classement affiche plus de pas que
          ce qu'on a tapé. */}
      <span className="pas-card-bareme">
        Tes marches loguées en séance comptent aussi dans le classement.
      </span>
    </div>
  );
}
