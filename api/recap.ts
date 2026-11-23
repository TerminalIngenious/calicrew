import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_lib/push.js';
import { uidDuJeton } from './_lib/auth.js';
import { moisPrecedent } from './_lib/recap.js';
import { recapsDuMois } from './_lib/recapDonnees.js';
import { rendsRecap, sujetRecap } from './_lib/recapMail.js';
import { envoieMail, fournisseur } from './_lib/mail.js';

/**
 * Le récap du mois, à la demande et pour soi.
 *
 * En GET il s'affiche dans le navigateur, en POST il part par mail. Le vrai
 * envoi est mensuel et collectif : sans ce point d'entrée, vérifier une
 * virgule du gabarit demanderait d'attendre le 1er.
 *
 * Réservé aux administrateurs, qui peuvent aussi regarder le récap d'un
 * autre membre — c'est la même donnée que le tableau de bord.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const uid = await uidDuJeton(req);
  if (!uid) return res.status(401).json({ erreur: 'Non connecté' });

  const admins = (process.env.ADMIN_UIDS || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!admins.includes(uid)) return res.status(403).json({ erreur: 'Accès refusé' });

  const mois = typeof req.query.mois === 'string' && /^\d{4}-\d{2}$/.test(req.query.mois)
    ? req.query.mois
    : moisPrecedent();
  const cible = typeof req.query.uid === 'string' ? req.query.uid : uid;

  const tous = await recapsDuMois(getDb(), mois);
  const mien = tous.find((r) => r.recap.uid === cible);
  if (!mien) return res.status(404).json({ erreur: 'Personne à ce nom, ou pas d’adresse mail' });

  const html = rendsRecap(mien.recap);

  if (req.method === 'POST') {
    if (!fournisseur()) return res.status(503).json({ erreur: 'Aucune clé de messagerie configurée' });
    const ok = await envoieMail({
      a: mien.dest.email,
      nom: mien.dest.nom,
      sujet: sujetRecap(mien.recap),
      html,
    });
    return res.status(ok ? 200 : 502).json({ envoye: ok, mois, a: mien.dest.nom });
  }

  // Jamais mis en cache : c'est une page de données personnelles.
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
