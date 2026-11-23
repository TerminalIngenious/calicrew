import { useState } from 'react';
import { Zap, Check, Undo2 } from 'lucide-react';
import { defiActif, mesurable, valide, annule } from '../lib/defiSurprise';
import type { UserProgress } from '../types';

/**
 * Le défi surprise du jour, sur l'accueil.
 *
 * La carte ne paraît que le jour même : un défi d'hier ne se rattrape pas,
 * c'est tout l'intérêt d'un défi surprise.
 */
export default function DefiSurpriseCard({ uid, progress }: { uid: string; progress: UserProgress | null }) {
  const defi = defiActif(progress);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);

  if (!defi) return null;

  async function bascule() {
    if (!defi || envoi) return;
    setEnvoi(true);
    setErreur(false);
    try {
      if (defi.fait) await annule(uid, defi);
      else await valide(uid, defi);
    } catch (err) {
      console.error('Défi surprise :', err);
      setErreur(true);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={`defi-card ${defi.fait ? 'fait' : ''}`}>
      <div className="defi-tete">
        <Zap size={15} />
        <span>Défi surprise</span>
        <span className={`defi-etat ${defi.fait ? 'oui' : ''}`}>
          {defi.fait ? 'Fait' : 'Pas encore fait'}
        </span>
      </div>

      <p className="defi-texte">{defi.texte}</p>

      <button className="defi-bouton" onClick={bascule} disabled={envoi}>
        {defi.fait ? (
          <>
            <Undo2 size={15} /> Finalement non
          </>
        ) : (
          <>
            <Check size={15} /> Je l'ai fait
          </>
        )}
      </button>

      {/* Dit ce que le bouton va déclencher. Une séance qui s'enregistre
          toute seule sans prévenir se lirait comme un bug. */}
      {!defi.fait && mesurable(defi) && (
        <span className="defi-note">S'enregistre en séance, sans coffre.</span>
      )}
      {defi.fait && defi.seanceId && (
        <span className="defi-note">Séance enregistrée. Les quêtes sont à jour.</span>
      )}
      {erreur && <span className="defi-note erreur">Ça n'a pas marché. Réessaie.</span>}
    </div>
  );
}
