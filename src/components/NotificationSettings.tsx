import { useEffect, useState } from 'react';
import { Smartphone, Bell, AlertTriangle } from 'lucide-react';
import {
  isPushSupported,
  needsInstall,
  getPushPrefs,
  enablePush,
  disablePush,
  syncSubscription,
  auMoinsUn,
  DEFAULT_PUSH_PREFS,
  type PushPrefs,
  type SyncOutcome,
} from '../lib/push';

const ERROR_MESSAGES: Record<string, string> = {
  unsupported: "Ton navigateur ne supporte pas les notifications push.",
  'no-key': "Les notifications ne sont pas encore configurées sur le serveur.",
  blocked:
    "Les notifications sont bloquées pour CaliCrew. Autorise-les dans les réglages du site, puis réessaie.",
  dismissed: "Tu n'as pas répondu à la demande. Réessaie et choisis « Autoriser ».",
  rules: "Les règles Firestore n'autorisent pas encore les notifications. Déploie firestore.rules.",
  error: "Erreur lors de l'activation des notifications.",
};

/**
 * Tout ou rien.
 *
 * Il y avait un interrupteur par famille de rappel — quatre fenêtres à lire
 * et quatre décisions à prendre pour quelque chose qui n'en mérite qu'une.
 * On ne demande plus qu'une chose : les notifications, oui ou non. Les quatre
 * familles existent toujours dans l'abonnement, parce que le serveur s'en
 * sert pour savoir quoi envoyer à qui, mais elles sont réglées ensemble.
 */
const TOUT: PushPrefs = {
  creatine: true,
  dailyChallenge: true,
  groupe: true,
  ambiance: true,
};

export default function NotificationSettings({ uid }: { uid: string }) {
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncOutcome | null>(null);

  const supported = isPushSupported();
  const installRequired = needsInstall();
  const enabled = auMoinsUn(prefs);
  // Seuls ces états demandent quelque chose à l'utilisateur.
  const needsAttention =
    sync === 'repaired' || sync === 'permission-default' ||
    sync === 'permission-denied' || sync === 'failed';

  // Les préférences disent « activé » mais l'abonnement du navigateur a pu
  // être révoqué entre-temps : on le vérifie et on le répare au chargement.
  useEffect(() => {
    let cancelled = false;
    getPushPrefs(uid)
      .then(async (loaded) => {
        if (cancelled) return;
        setPrefs(loaded);
        const outcome = await syncSubscription(uid, loaded);
        if (!cancelled) setSync(outcome);
      })
      .catch(() => {
        if (!cancelled) setPrefs(DEFAULT_PUSH_PREFS);
      });
    return () => { cancelled = true; };
  }, [uid]);

  /**
   * Redemande l'autorisation sans toucher aux préférences : elles sont déjà
   * là, c'est seulement l'iPhone qui ne les laisse plus s'afficher.
   */
  async function regrant() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setErrorDetail(null);

    const result = await enablePush(uid, prefs);
    if (result.ok) {
      setSync(await syncSubscription(uid, prefs));
    } else {
      setError(ERROR_MESSAGES[result.reason]);
      setErrorDetail(result.detail ?? null);
    }
    setBusy(false);
  }

  async function basculer() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setErrorDetail(null);

    try {
      if (enabled) {
        await disablePush(uid);
        setPrefs(DEFAULT_PUSH_PREFS);
        setSync(null);
      } else {
        const result = await enablePush(uid, TOUT);
        if (result.ok) {
          setPrefs(TOUT);
          setSync(await syncSubscription(uid, TOUT));
        } else {
          setError(ERROR_MESSAGES[result.reason]);
          setErrorDetail(result.detail ?? null);
        }
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour des notifications.');
      setErrorDetail((err as Error).message ?? null);
    }
    setBusy(false);
  }

  // Sur iPhone hors écran d'accueil, le push est impossible : un interrupteur
  // qui ne peut rien faire vaut moins qu'une explication.
  if (installRequired) {
    return (
      <div className="notif-install-hint">
        <Smartphone size={18} />
        <span>
          Sur iPhone, installe CaliCrew sur ton écran d'accueil pour activer les notifications.
          <em>Partager → Sur l'écran d'accueil</em>
        </span>
      </div>
    );
  }

  if (!supported) return null;

  return (
    <>
      <label className="settings-row">
        <Bell size={17} />
        <div className="settings-row-info">
          <span className="settings-row-label">Notifications</span>
          <span className="settings-row-sub">{enabled ? 'Activées' : 'Désactivées'}</span>
        </div>
        <input
          type="checkbox"
          className="notif-switch"
          checked={enabled}
          disabled={busy}
          onChange={basculer}
        />
      </label>

      {/* Rien à afficher quand l'abonnement est sain : ce bloc ne sert qu'à
          signaler ce qui demande une action. */}
      {enabled && needsAttention && (
        <div className="notif-diag">
          {sync === 'repaired' && (
            <p className="notif-diag-line warn">
              <AlertTriangle size={14} />
              La liaison avec ton téléphone avait expiré, elle vient d'être rétablie.
            </p>
          )}
          {sync === 'permission-default' && (
            <>
              <p className="notif-diag-line warn">
                <AlertTriangle size={14} />
                Tes rappels sont activés mais l'iPhone n'a plus l'autorisation
                de les afficher. Ça arrive après une réinstallation de l'app.
              </p>
              <button
                className="primary-btn small notif-action-btn"
                onClick={regrant}
                disabled={busy}
              >
                {busy ? 'Demande en cours…' : "Redemander l'autorisation"}
              </button>
            </>
          )}
          {sync === 'permission-denied' && (
            <p className="notif-diag-line warn">
              <AlertTriangle size={14} />
              Les notifications sont refusées pour CaliCrew. Va dans Réglages
              de l'iPhone → Notifications → CaliCrew et autorise-les, puis
              rouvre l'app.
            </p>
          )}
          {sync === 'failed' && (
            <p className="notif-diag-line warn">
              <AlertTriangle size={14} />
              Impossible de joindre ton téléphone. Désactive puis réactive les rappels.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="notif-error">
          <p>{error}</p>
          {errorDetail && <code>{errorDetail}</code>}
        </div>
      )}
    </>
  );
}
