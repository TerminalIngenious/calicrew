import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Smartphone } from 'lucide-react';
import {
  isPushSupported,
  needsInstall,
  getPushPrefs,
  enablePush,
} from '../lib/push';

/**
 * L'appel à activer les notifications, sur l'accueil.
 *
 * Les rappels existaient déjà, mais il fallait les trouver : Profil →
 * Notifications → deux interrupteurs. Presque personne n'y allait, et les
 * crons tournaient tous les soirs pour une poignée d'abonnés.
 *
 * La carte apparaît donc sur l'accueil tant qu'aucun rappel n'est activé, et
 * elle n'a pas de croix pour la fermer : la seule façon de la faire
 * disparaître est d'activer les rappels. Elle s'en va d'elle-même ensuite, et
 * ne revient jamais.
 *
 * Ce que l'on ne peut pas faire : forcer l'autorisation. Le navigateur
 * n'affiche sa demande qu'après un vrai clic, et lui seul décide. Si elle est
 * refusée, aucune ligne de code ne peut revenir dessus — la carte explique
 * alors où la rétablir, puisque c'est tout ce qui reste.
 */
export default function NotifGate({ uid }: { uid: string }) {
  const [etat, setEtat] = useState<'chargement' | 'a-activer' | 'ok'>('chargement');
  const [occupe, setOccupe] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const supporte = isPushSupported();
  const installAbord = needsInstall();
  const refuse = supporte && Notification.permission === 'denied';

  useEffect(() => {
    let annule = false;
    getPushPrefs(uid)
      .then((prefs) => {
        if (annule) return;
        setEtat(prefs.creatine || prefs.dailyChallenge ? 'ok' : 'a-activer');
      })
      // Lecture impossible (hors ligne au lancement) : on ne réclame rien
      // plutôt que de réclamer à tort à quelqu'un qui a déjà tout activé.
      .catch(() => { if (!annule) setEtat('ok'); });
    return () => { annule = true; };
  }, [uid]);

  async function activer() {
    if (occupe) return;
    setOccupe(true);
    setEchec(null);
    // Les deux rappels d'un coup : c'est un oui ou un non, pas un réglage.
    // Le détail reste ajustable dans le profil.
    const resultat = await enablePush(uid, { creatine: true, dailyChallenge: true });
    if (resultat.ok) {
      setEtat('ok');
    } else {
      setEchec(
        resultat.reason === 'blocked'
          ? 'Tu as refusé la demande. Il faut maintenant passer par les réglages de ton téléphone.'
          : resultat.reason === 'dismissed'
            ? 'La demande est restée sans réponse. Réessaie et choisis « Autoriser ».'
            : "L'activation a échoué. Réessaie dans un moment."
      );
    }
    setOccupe(false);
  }

  if (etat === 'chargement' || etat === 'ok' || !supporte) return null;

  // Sur iPhone, le push n'existe pas tant que l'app n'est pas sur l'écran
  // d'accueil : proposer un bouton qui ne peut pas marcher serait pire que
  // de ne rien proposer.
  if (installAbord) {
    return (
      <div className="notif-gate">
        <div className="notif-gate-icon"><Smartphone size={20} /></div>
        <div className="notif-gate-text">
          <span className="notif-gate-title">Installe CaliCrew sur ton écran d'accueil</span>
          <span className="notif-gate-sub">
            Sur iPhone, les rappels n'arrivent que si l'app est installée.
            Partager → Sur l'écran d'accueil.
          </span>
          <Link className="notif-gate-link" to="/decouvrir">Voir comment faire</Link>
        </div>
      </div>
    );
  }

  if (refuse) {
    return (
      <div className="notif-gate">
        <div className="notif-gate-icon refuse"><BellOff size={20} /></div>
        <div className="notif-gate-text">
          <span className="notif-gate-title">Les notifications sont bloquées</span>
          <span className="notif-gate-sub">
            CaliCrew ne peut plus te les redemander. Réglages du téléphone →
            Notifications → CaliCrew, autorise-les, puis rouvre l'app.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-gate">
      <div className="notif-gate-icon"><Bell size={20} /></div>
      <div className="notif-gate-text">
        <span className="notif-gate-title">Active les notifications</span>
        <span className="notif-gate-sub">
          Le rappel créatine à 20h et le défi du jour à 17h. C'est ce qui fait
          qu'on tient la série — tu règles le détail dans ton profil.
        </span>
        {echec && <span className="notif-gate-error">{echec}</span>}
        <button className="primary-btn small notif-gate-btn" onClick={activer} disabled={occupe}>
          {occupe ? 'Demande en cours…' : 'Activer les notifications'}
        </button>
      </div>
    </div>
  );
}
