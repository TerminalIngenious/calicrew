/**
 * L'envoi d'e-mail, derrière une seule fonction.
 *
 * Deux fournisseurs possibles, choisis par la clé présente dans
 * l'environnement, et aucune dépendance npm : ce sont deux appels HTTP, un
 * paquet de plus ne ferait qu'ajouter une surface à maintenir.
 *
 * Brevo d'abord parce qu'il accepte une adresse d'expéditeur vérifiée toute
 * seule ; Resend exige un nom de domaine, que l'app n'a pas. Si les deux
 * clés sont là, Brevo gagne — mais le code marche avec l'une ou l'autre.
 */

export interface Courrier {
  a: string;
  nom?: string;
  sujet: string;
  html: string;
}

/** L'adresse qui envoie. Doit être vérifiée chez le fournisseur. */
function expediteur(): { email: string; nom: string } {
  return {
    email: process.env.MAIL_EXPEDITEUR || 'calicrew@example.com',
    nom: process.env.MAIL_NOM || 'CaliCrew',
  };
}

export function fournisseur(): 'brevo' | 'resend' | null {
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
}

export async function envoieMail(c: Courrier): Promise<boolean> {
  const de = expediteur();
  const qui = fournisseur();

  try {
    if (qui === 'brevo') {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY as string,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: de.email, name: de.nom },
          to: [{ email: c.a, ...(c.nom ? { name: c.nom } : {}) }],
          subject: c.sujet,
          htmlContent: c.html,
        }),
      });
      if (!r.ok) console.error('Brevo a refusé :', r.status, await r.text());
      return r.ok;
    }

    if (qui === 'resend') {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: `${de.nom} <${de.email}>`,
          to: [c.a],
          subject: c.sujet,
          html: c.html,
        }),
      });
      if (!r.ok) console.error('Resend a refusé :', r.status, await r.text());
      return r.ok;
    }

    console.error('Aucune clé de messagerie : rien n’a été envoyé.');
    return false;
  } catch (err) {
    console.error('Envoi de mail impossible :', err);
    return false;
  }
}
