import { useEffect, useState } from 'react';
import { Zap, Check, Undo2, Timer } from 'lucide-react';
import { defiActif, mesurable, resteMs, valide, annule, donneCoffre } from '../lib/defiSurprise';
import type { UserProgress } from '../types';

/** « 2 h 14 », « 12 min », « 40 s » — l'unité suit ce qu'il reste. */
function compte(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s} s`;
}

/**
 * Le défi surprise, sur l'accueil.
 *
 * Il ne vit que trois heures, et il y en a deux par jour. La carte disparaît
 * d'elle-même à la fin de la fenêtre, sans rechargement : c'est tout
 * l'intérêt d'un défi surprise, et un compte à rebours qui s'arrête sans
 * rien faire serait un mensonge.
 */
export default function DefiSurpriseCard({ uid, progress }: { uid: string; progress: UserProgress | null }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  // L'heure relue plutôt que décomptée : un téléphone en veille ne fait pas
  // tourner les minuteurs, et le compte serait faux au réveil.
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const defi = defiActif(progress, maintenant);
  if (!defi) return null;

  const reste = resteMs(defi, maintenant);

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
        {/* Le temps qui reste prend la place de l'état tant que le défi
            n'est pas fait : une fois coché, c'est la coche qu'on vient
            vérifier, pas le chrono. */}
        {!defi.fait && reste > 0 ? (
          <span className={`defi-minuteur ${reste < 15 * 60 * 1000 ? 'presse' : ''}`}>
            <Timer size={12} />
            {compte(reste)}
          </span>
        ) : (
          <span className={`defi-etat ${defi.fait ? 'oui' : ''}`}>
            {defi.fait ? 'Fait' : 'Pas encore fait'}
          </span>
        )}
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
        <span className="defi-note">
          S'enregistre en séance, {donneCoffre(uid) ? 'avec coffre' : 'sans coffre'}.
        </span>
      )}
      {defi.fait && defi.seanceId && (
        <span className="defi-note">Séance enregistrée. Les quêtes sont à jour.</span>
      )}
      {erreur && <span className="defi-note erreur">Ça n'a pas marché. Réessaie.</span>}
    </div>
  );
}
