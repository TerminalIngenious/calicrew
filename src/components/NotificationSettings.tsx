import { useEffect, useState } from 'react';
import { Bell, Smartphone, X } from 'lucide-react';
import {
  isPushSupported,
  needsInstall,
  getPushPrefs,
  enablePush,
  updatePushPrefs,
  disablePush,
  DEFAULT_PUSH_PREFS,
  type PushPrefs,
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

export default function NotificationSettings({ uid }: { uid: string }) {
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const supported = isPushSupported();
  const installRequired = needsInstall();
  const enabled = prefs.creatine || prefs.dailyChallenge;

  useEffect(() => {
    getPushPrefs(uid)
      .then(setPrefs)
      .catch(() => setPrefs(DEFAULT_PUSH_PREFS));
  }, [uid]);

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
        await updatePushPrefs(uid, { [key]: next[key] });
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
      <button
        className={`icon-btn notif-bell ${enabled ? 'active' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {enabled && <span className="notif-bell-dot" />}
      </button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <h3><Bell size={18} /> Notifications</h3>
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
