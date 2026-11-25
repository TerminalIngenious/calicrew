import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, Check, X } from 'lucide-react';
import { auth } from '../lib/firebase';
import BottomNav from '../components/BottomNav';

interface Resultat { nom: string; ok: boolean }
interface Reponse {
  envoyes: number;
  total: number;
  resultats: Resultat[];
  /** Ceux dont l'abonnement est mort : ils doivent réactiver eux-mêmes. */
  perimes: string[];
}

/**
 * L'envoi d'une notification de test à tout le groupe.
 *
 * Des joueurs disaient ne plus rien recevoir depuis des jours, et rien ne
 * permettait de le vérifier : les crons envoient sans garder trace, et il
 * fallait attendre le lendemain pour savoir si une correction avait marché.
 *
 * Cette page envoie à la demande et répond par le détail : qui a reçu, qui
 * a échoué, et qui n'a plus d'abonnement du tout. Réservée au compte admin,
 * puisqu'elle écrit sur l'écran de tout le monde.
 */
export default function TestNotif() {
  const navigate = useNavigate();
  const [etat, setEtat] = useState<'repos' | 'envoi'>('repos');
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    const user = auth.currentUser;
    if (!user || etat === 'envoi') return;
    setEtat('envoi');
    setErreur(null);
    try {
      const jeton = await user.getIdToken();
      const r = await fetch('/api/notify/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!r.ok) throw new Error(`Le serveur a répondu ${r.status}`);
      setReponse((await r.json()) as Reponse);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Envoi impossible');
    }
    setEtat('repos');
  }

  return (
    <div className="page tst-page">
      <header className="tst-entete">
        <div className="tst-entete-fond" />
        <div className="tst-entete-contenu">
          <div className="tst-haut">
            <button className="tst-retour" onClick={() => navigate(-1)} aria-label="Revenir">
              <ArrowLeft size={20} />
            </button>
            <span className="tst-kicker">Outil</span>
          </div>
          <h1 className="tst-titre">Test de notification</h1>
          <p className="tst-sous">
            Envoie une notification à tout le groupe, tout de suite, et dit qui
            l'a reçue.
          </p>
        </div>
      </header>

      <button className="primary-btn" onClick={envoyer} disabled={etat === 'envoi'}>
        <BellRing size={18} />
        {etat === 'envoi' ? 'Envoi…' : 'Envoyer la notification de test'}
      </button>

      {erreur && <p className="tst-erreur">{erreur}</p>}

      {reponse && (
        <>
          <p className="tst-bilan">
            <b>{reponse.envoyes} / {reponse.total}</b> notifications acceptées
            par le service de push.
          </p>

          <ul className="tst-liste">
            {reponse.resultats.map((r) => (
              <li key={r.nom} className={r.ok ? 'ok' : 'rate'}>
                {r.ok ? <Check size={15} /> : <X size={15} />}
                <span>{r.nom}</span>
                <em>{r.ok ? 'envoyée' : 'échec'}</em>
              </li>
            ))}
          </ul>

          {reponse.perimes.length > 0 && (
            <>
              <h3 className="tst-titre-section">Abonnement périmé</h3>
              <p className="tst-note">
                Leur téléphone a révoqué l'abonnement. Ils le répareront tout
                seuls à leur prochaine ouverture de l'app.
              </p>
              <ul className="tst-liste">
                {reponse.perimes.map((n) => (
                  <li key={n} className="rate"><X size={15} /><span>{n}</span></li>
                ))}
              </ul>
            </>
          )}

          {/* Ce que le test ne peut pas dire. Sans cette phrase, un « envoyée »
              passerait pour une preuve que le téléphone a sonné. */}
          <p className="tst-note">
            « Envoyée » veut dire que le service de push a accepté le message —
            c'est tout ce qu'un serveur peut savoir. Si quelqu'un y figure et
            n'a rien vu, le blocage est sur son téléphone : notifications
            coupées dans les réglages, mode concentration, ou app désinstallée.
          </p>
        </>
      )}

      <BottomNav />
    </div>
  );
}
