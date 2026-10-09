import { useEffect, useState } from 'react';
import { Settings, Smartphone, X, Bell, ChevronRight, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  isPushSupported,
  needsInstall,
  getPushPrefs,
  enablePush,
  updatePushPrefs,
  disablePush,
  syncSubscription,
  sendTestNotification,
  DEFAULT_PUSH_PREFS,
  type PushPrefs,
  type SyncOutcome,
  type TestReport,
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
 * `icon` : bouton engrenage compact pour un en-tête.
 * `row` : ligne pleine largeur, pour une liste de réglages.
 */
export default function NotificationSettings({
  uid,
  variant = 'icon',
}: {
  uid: string;
  variant?: 'icon' | 'row';
}) {
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncOutcome | null>(null);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestReport | null>(null);

  const supported = isPushSupported();
  const installRequired = needsInstall();
  const enabled = prefs.creatine || prefs.dailyChallenge;

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

  async function runTest() {
    if (testing) return;
    setTesting(true);
    setTest(null);
    setTest(await sendTestNotification());
    setTesting(false);
  }

  async function toggle(key: keyof PushPrefs) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setErrorDetail(null);
    const next = { ...prefs, [key]: !prefs[key] };

    try {
      if (!enabled) {
        // Première activation : demande la permission et crée l'abonnement.
        const result = await enablePush(uid, next);
        if (!result.ok) {
          setError(ERROR_MESSAGES[result.reason]);
          setErrorDetail(result.detail ?? null);
          setBusy(false);
          return;
        }
        setPrefs(next);
      } else if (!next.creatine && !next.dailyChallenge) {
        await disablePush(uid);
        setPrefs(next);
      } else {
        try {
          await updatePushPrefs(uid, { [key]: next[key] });
        } catch {
          // Le document a disparu — le serveur le supprime quand le service
          // push rejette l'abonnement. On se réabonne au lieu d'afficher une
          // erreur que l'utilisateur ne peut pas corriger.
          const result = await enablePush(uid, next);
          if (!result.ok) {
            setError(ERROR_MESSAGES[result.reason]);
            setErrorDetail(result.detail ?? null);
            setBusy(false);
            return;
          }
        }
        setPrefs(next);
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour des notifications.');
      setErrorDetail((err as Error).message ?? null);
    }
    setBusy(false);
  }

  function close() {
    setOpen(false);
    setError(null);
    setErrorDetail(null);
  }

  return (
    <>
      {variant === 'row' ? (
        <button className="settings-row" onClick={() => setOpen(true)}>
          <Bell size={17} />
          <div className="settings-row-info">
            <span className="settings-row-label">Notifications</span>
            <span className="settings-row-sub">
              {enabled
                ? [prefs.creatine && 'créatine', prefs.dailyChallenge && 'défi du jour']
                    .filter(Boolean)
                    .join(' • ')
                : 'Aucun rappel activé'}
            </span>
          </div>
          <ChevronRight size={16} />
        </button>
      ) : (
        <button
          className={`icon-btn notif-settings-btn ${enabled ? 'active' : ''}`}
          onClick={() => setOpen(true)}
          aria-label="Réglages des notifications"
        >
          <Settings size={18} />
          {enabled && <span className="notif-settings-dot" />}
        </button>
      )}

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3><Settings size={18} /> Notifications</h3>
              <button className="member-modal-close" onClick={close}>
                <X size={18} />
              </button>
            </div>

            {installRequired ? (
              <div className="notif-install-hint">
                <Smartphone size={18} />
                <span>
                  Sur iPhone, installe CaliCrew sur ton écran d'accueil pour activer les notifications.
                  <em>Partager → Sur l'écran d'accueil</em>
                </span>
              </div>
            ) : !supported ? (
              <p className="empty" style={{ fontSize: '0.85rem' }}>
                Ton navigateur ne supporte pas les notifications push.
              </p>
            ) : (
              <div className="notif-list">
                <label className="notif-row">
                  <div className="notif-row-info">
                    <span className="notif-row-label">Rappel créatine</span>
                    <span className="notif-row-desc">Tous les jours à 20h</span>
                  </div>
                  <input
                    type="checkbox"
                    className="notif-switch"
                    checked={prefs.creatine}
                    disabled={busy}
                    onChange={() => toggle('creatine')}
                  />
                </label>

                <label className="notif-row">
                  <div className="notif-row-info">
                    <span className="notif-row-label">Rappel défi du jour</span>
                    <span className="notif-row-desc">À 17h, seulement si le défi n'est pas validé</span>
                  </div>
                  <input
                    type="checkbox"
                    className="notif-switch"
                    checked={prefs.dailyChallenge}
                    disabled={busy}
                    onChange={() => toggle('dailyChallenge')}
                  />
                </label>
              </div>
            )}

            {supported && !installRequired && enabled && (
              <div className="notif-diag">
                {sync === 'repaired' && (
                  <p className="notif-diag-line warn">
                    <AlertTriangle size={14} />
                    Ton abonnement avait expiré, il vient d'être rétabli.
                  </p>
                )}
                {sync === 'no-permission' && (
                  <p className="notif-diag-line warn">
                    <AlertTriangle size={14} />
                    La permission a été retirée dans les réglages du navigateur.
                  </p>
                )}
                {sync === 'failed' && (
                  <p className="notif-diag-line warn">
                    <AlertTriangle size={14} />
                    Impossible de vérifier ton abonnement. Désactive puis réactive les rappels.
                  </p>
                )}

                <button className="secondary-btn small notif-test-btn" onClick={runTest} disabled={testing}>
                  <Send size={14} /> {testing ? 'Envoi…' : 'Envoyer une notification de test'}
                </button>

                {test && (
                  <div className={`notif-diag-result ${test.ok ? 'ok' : 'ko'}`}>
                    {test.ok ? (
                      <p className="notif-diag-line">
                        <CheckCircle2 size={14} />
                        Envoyée. Si rien n'apparaît, vérifie les notifications de CaliCrew
                        dans les réglages de ton téléphone.
                      </p>
                    ) : (
                      <>
                        <p className="notif-diag-line warn">
                          <AlertTriangle size={14} />
                          {test.error || "L'envoi a échoué."}
                        </p>
                        {test.missing && test.missing.length > 0 && (
                          <code>Config serveur manquante : {test.missing.join(', ')}</code>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="notif-error">
                <p>{error}</p>
                {errorDetail && <code>{errorDetail}</code>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
