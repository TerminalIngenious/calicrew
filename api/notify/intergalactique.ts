import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, configureWebPush, sendTo } from '../_lib/push.js';
import { uidDuJeton } from '../_lib/auth.js';
import { lisAbonnements, veutGroupe, lisNoms, type Abonnement } from '../_lib/groupe.js';

/**
 * Quelqu'un vient de trouver la carte intergalactique.
 *
 * Tout le groupe l'apprend, et c'est l'intérêt : une carte dont personne ne
 * sait qu'elle est tombée ne vaut pas plus qu'une commune. Sur cent jours,
 * une poignée de notifications au plus — chacun ne peut déclencher la
 * sienne qu'une fois.
 *
 * Le téléphone ne dit rien d'autre que « c'est arrivé ». Le serveur relit
 * la progression pour vérifier que la carte s'y trouve vraiment : sans ça,
 * n'importe qui pourrait annoncer au groupe qu'il l'a. Il tient aussi le
 * verrou qui empêche la seconde annonce, dans la progression et non dans le
 * corps de la requête.
 */
const CARTE_ID = 'ig-tristan';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ error: 'Unauthorized' });

  const db = getDb();
  const ref = db.collection('userProgress').doc(uid);
  const data = (await ref.get()).data() || {};

  const cartes = (data.ownedCards as Record<string, number> | undefined) || {};
  if (!(cartes[CARTE_ID] > 0)) return res.status(200).json({ annonce: false, raison: 'pas la carte' });
  if (data.annonceIntergalactique) return res.status(200).json({ annonce: false, raison: 'déjà annoncé' });

  /*
   * Le verrou est posé avant d'envoyer, pas après.
   *
   * Deux appels lancés coup sur coup — un double clic, un réseau qui
   * rejoue la requête — auraient tous deux trouvé le champ vide et annoncé
   * deux fois. Mieux vaut rater une notification que la doubler.
   */
  await ref.set({ annonceIntergalactique: true }, { merge: true });

  configureWebPush();
  const noms = await lisNoms(db);
  const moi = noms.get(uid) || 'Quelqu’un';

  const groupes = await db.collection('groups').where('memberIds', 'array-contains', uid).get();
  const cibles = new Set<string>();
  for (const g of groupes.docs) {
    for (const membre of ((g.data().memberIds as string[]) || [])) {
      if (membre !== uid) cibles.add(membre);
    }
  }

  const abonnes = await lisAbonnements(db);
  const parUid = new Map<string, Abonnement>(abonnes.map((a) => [a.uid, a]));

  const envois: Promise<boolean>[] = [];
  for (const cible of cibles) {
    const sub = parUid.get(cible);
    if (!sub || !veutGroupe(sub)) continue;
    envois.push(sendTo(sub, {
      title: '\u{1FA90} Intergalactique',
      body: `${moi} vient de trouver Tristan \u2014 Dépôt de plainte. Une par personne, et la fenêtre se referme.`,
      // Une par découvreur : deux personnes peuvent la trouver le même jour.
      tag: `intergalactique-${uid}`,
      url: '/collection',
    }));
  }

  const envoyes = (await Promise.all(envois)).filter(Boolean).length;
  return res.status(200).json({ annonce: true, cibles: cibles.size, envoyes });
}
