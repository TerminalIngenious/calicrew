import { useEffect, useState } from 'react';
import { Bell, BellOff, Smartphone } from 'lucide-react';
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

export default function NotificationSettings({ uid }: { uid: string }) {
  const [prefs, setPrefs] = useState<PushPrefs>(DEFAULT_PUSH_PREFS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = isPushSupported();
  const installRequired = needsInstall();
  const enabled = prefs.creatine || prefs.dailyChallenge;

  useEffect(() => {
    getPushPrefs(uid)
      .then(setPrefs)
      .catch(() => setPrefs(DEFAULT_PUSH_PREFS))
      .finally(() => setLoading(false));
  }, [uid]);

  async function toggle(key: keyof PushPrefs) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const next = { ...prefs, [key]: !prefs[key] };

    try {
      if (!enabled) {
        // Premier activation : demande la permission et crée l'abonnement.
        const result = await enablePush(uid, next);
        if (!result) {
          setError('Permission refusée. Autorise les notifications dans les réglages de ton navigateur.');
          setBusy(false);
          return;
        }
        setPrefs(result);
      } else if (!next.creatine && !next.dailyChallenge) {
        await disablePush(uid);
        setPrefs(next);
      } else {
        await updatePushPrefs(uid, { [key]: next[key] });
        setPrefs(next);
      }
    } catch (err) {
      console.error('Erreur notifications:', err);
      setError('Erreur lors de la mise à jour des notifications.');
    }
    setBusy(false);
  }

  if (loading) return null;

  return (
    <section className="section">
      <h3>
        {enabled ? <Bell size={16} style={{ marginRight: 6 }} /> : <BellOff size={16} style={{ marginRight: 6 }} />}
        Notifications
      </h3>

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

      {error && <p className="notif-error">{error}</p>}
    </section>
  );
}
