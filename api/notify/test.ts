import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo } from '../_lib/push.js';
import { lisNoms } from '../_lib/groupe.js';
import { uidDuJeton } from '../_lib/auth.js';
import { ADMIN_UIDS } from '../_lib/admins.js';

/**
 * Une notification de test, envoyée à tout le monde, qui dit qui l'a reçue.
 *
 * Des joueurs disaient ne plus rien recevoir depuis des jours, et il n'y
 * avait aucun moyen de le vérifier : les crons envoient et ne gardent trace
 * de rien, et un envoi réussi côté serveur ne prouve pas qu'un téléphone a
 * sonné. Cette route répond avec le détail par personne — qui a un
 * abonnement vivant, qui en a un périmé, qui n'en a aucun.
 *
 * Réservée aux comptes admin : elle écrit sur l'écran de tout le groupe.
 *
 * Ce qu'elle prouve et ce qu'elle ne prouve pas. Un `ok` signifie que le
 * service de push du navigateur a accepté le message — c'est tout ce qu'un
 * serveur peut savoir. Si quelqu'un est marqué reçu et n'a rien vu, le
 * problème est sur son téléphone : notifications coupées au niveau du
 * système, mode concentration, ou PWA désinstallée.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });
  if (!ADMIN_UIDS.includes(uid)) return res.status(403).json({ error: 'Forbidden' });

  configureWebPush();
  const db = getDb();

  const snap = await db.collection('pushSubscriptions').get();
  const noms = await lisNoms(db);

  const vivants = snap.docs.filter((d) => {
    const x = d.data();
    return !!x.endpoint && !!x.keys;
  });
  const perimes = snap.docs.filter((d) => {
    const x = d.data();
    return !x.endpoint || !x.keys;
  });

  /*
   * Une étiquette qui change à chaque essai.
   *
   * Sans ça, deux tests de suite ne feraient sonner qu'une fois : une
   * notification qui porte l'étiquette d'une notification déjà posée la
   * remplace en silence. C'est exactement le défaut qu'on vient de corriger
   * ailleurs, et ce serait un comble de le réintroduire dans l'outil qui
   * sert à le diagnostiquer.
   */
  const etiquette = `test-${Date.now()}`;
  const quand = new Date().toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit',
  });

  const resultats = await Promise.all(
    vivants.map(async (d) => {
      const sub = d.data() as Parameters<typeof sendTo>[0];
      const ok = await sendTo(sub, {
        title: 'Test de notification',
        body: `Si tu vois ça, tes notifications marchent. Envoyé à ${quand}.`,
        tag: etiquette,
        url: '/',
      });
      return { nom: noms.get(d.id) || d.id.slice(0, 6), ok };
    })
  );

  return res.status(200).json({
    envoyes: resultats.filter((r) => r.ok).length,
    total: resultats.length,
    resultats: resultats.sort((a, b) => Number(b.ok) - Number(a.ok) || a.nom.localeCompare(b.nom)),
    perimes: perimes.map((d) => noms.get(d.id) || d.id.slice(0, 6)).sort(),
  });
}
