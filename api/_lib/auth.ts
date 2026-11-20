/**
 * L'uid derrière un jeton Firebase, ou null.
 *
 * Les crons s'authentifient avec un secret partagé, mais ces routes-ci sont
 * appelées par l'app depuis le téléphone des joueurs : un secret y serait
 * lisible par n'importe qui ouvrant les sources. On vérifie donc le jeton
 * d'identité Firebase, et c'est le serveur qui décide à qui la notification
 * part — l'appelant ne fournit jamais de destinataire.
 *
 * La vérification passe par l'API d'identité de Google et non par
 * `firebase-admin/auth`.
 *
 * `getAuth().verifyIdToken()` tire `jwks-rsa`, qui fait un `require()` de
 * `jose` — devenu ESM pur en version 6. Vercel compile les routes `api/` en
 * CommonJS, et ce `require()` échoue : la fonction mourait avant d'exécuter
 * la moindre ligne, en ERR_REQUIRE_ESM. Les notifications de fin de séance
 * et d'échange sont restées muettes sans que rien ne le signale, puisque
 * l'app n'attend pas la réponse. Un appel HTTP n'a aucune dépendance à
 * casser.
 *
 * La clé web n'est pas un secret : elle est publiée dans le bundle de l'app.
 * Elle sert ici à désigner le projet — Google refuse un jeton émis par un
 * autre.
 */
const LOOKUP = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';

export async function uidDuJeton(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<string | null> {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;

  const cle = process.env.VITE_FIREBASE_API_KEY;
  if (!cle) {
    console.error('VITE_FIREBASE_API_KEY manquante : impossible de vérifier un jeton.');
    return null;
  }

  try {
    const r = await fetch(`${LOOKUP}?key=${cle}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: header.slice(7) }),
    });
    // 400 : jeton expiré, mal formé, ou venu d'un autre projet.
    if (!r.ok) return null;
    const corps = (await r.json()) as { users?: { localId?: string }[] };
    return corps.users?.[0]?.localId || null;
  } catch (err) {
    console.error('Vérification du jeton impossible :', err);
    return null;
  }
}
