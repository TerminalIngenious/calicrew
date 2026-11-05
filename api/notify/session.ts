import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo, getDayKey } from '../_lib/push.js';
import { uidDuJeton } from '../_lib/auth.js';
import {
  lisAbonnements, veutGroupe, lisNoms, statsDe, lisMois, classement,
  type Abonnement,
} from '../_lib/groupe.js';
import { DOUBLE, SEANCE_FINIE, auHasard } from '../_lib/messages.js';

/**
 * Appelée à la fin d'une séance.
 *
 * Deux notifications en sortent : celle qui pique — « untel vient de te
 * doubler » — envoyée aux seuls joueurs qui viennent de perdre une place, et
 * celle qui informe le reste du groupe.
 *
 * Le corps de la requête ne sert à rien : le serveur recalcule lui-même les
 * compteurs du joueur depuis ses séances. Ce qui arrive du téléphone ne
 * décide donc ni du contenu, ni des destinataires.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  configureWebPush();
  const db = getDb();

  const progressRef = db.collection('userProgress').doc(uid);
  const avant = lisMois((await progressRef.get()).data());
  const stats = await statsDe(db, uid);
  const apres = stats.mois;

  // Le jalon de la diffusion au groupe ne concerne pas le comptage : il ne
  // doit pas être effacé par le recalcul.
  await progressRef.set(
    { moisCourant: { ...apres, dernierPing: avant.dernierPing || null } },
    { merge: true }
  );

  const abonnes = await lisAbonnements(db);
  const parUid = new Map<string, Abonnement>(abonnes.map((a) => [a.uid, a]));
  const noms = await lisNoms(db);
  const moi = noms.get(uid) || 'Quelqu\'un';

  const groupes = await db.collection('groups').where('memberIds', 'array-contains', uid).get();
  if (groupes.empty) return res.status(200).json({ doubles: 0, envoyes: 0 });

  // Une seule notification par personne, même si on partage plusieurs groupes.
  const doubles = new Set<string>();
  const temoins = new Set<string>();
  const places = new Map<string, number>();

  for (const g of groupes.docs) {
    const membres = await classement(db, (g.data().memberIds as string[]) || [], noms);
    membres.forEach((m, i) => {
      if (m.uid === uid) return;
      // Dépassé : il était devant avant la séance, il est derrière après.
      if (m.reps >= avant.reps && m.reps < apres.reps) {
        doubles.add(m.uid);
        places.set(m.uid, i + 1);
      } else {
        temoins.add(m.uid);
      }
    });
  }
  for (const u of doubles) temoins.delete(u);

  const envois: Promise<boolean>[] = [];

  for (const cible of doubles) {
    const sub = parUid.get(cible);
    if (!sub || !veutGroupe(sub)) continue;
    envois.push(sendTo(sub, {
      title: 'Classement',
      body: auHasard(DOUBLE)(moi, places.get(cible) || 0),
      tag: 'double',
      url: '/group',
    }));
  }

  /*
   * Le reste du groupe n'est prévenu qu'une fois par jour et par joueur.
   * Sans ce frein, dix-neuf personnes qui s'entraînent deux fois par jour
   * feraient une quarantaine de notifications quotidiennes à chacun, et tout
   * le monde couperait au bout d'une semaine.
   */
  const aujourdhui = getDayKey();
  const premiereDuJour = avant.dernierPing !== aujourdhui;
  if (premiereDuJour && apres.reps > avant.reps) {
    const corps = auHasard(SEANCE_FINIE)(moi, apres.reps - avant.reps);
    for (const cible of temoins) {
      const sub = parUid.get(cible);
      if (!sub || !veutGroupe(sub)) continue;
      envois.push(sendTo(sub, { title: 'CaliCrew', body: corps, tag: 'seance', url: '/group' }));
    }
    await progressRef.set({ moisCourant: { dernierPing: aujourdhui } }, { merge: true });
  }

  const envoyes = (await Promise.all(envois)).filter(Boolean).length;
  return res.status(200).json({ doubles: doubles.size, diffuse: premiereDuJour, envoyes });
}
