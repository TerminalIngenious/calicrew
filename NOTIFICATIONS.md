# Notifications push

Quatre rendez-vous quotidiens, envoyés par des Vercel Cron Jobs :

| Rappel | Heure visée | Cron UTC | Condition |
|---|---|---|---|
| Créatine | 20h | `0 18 * * *` (**été**) | rappel activé, créatine non cochée |
| Défi du jour | 17h | `0 15 * * *` (**été**) | défi du jour non validé |
| Défi surprise / patron du jour | 14h | `0 13 * * *` (hiver) | famille « vannes » activée |
| La vanne du soir | 21h | `0 20 * * *` (hiver) | famille « vannes » activée |

> Les deux premiers sont encore sur les valeurs d'été alors qu'on est passé
> à l'heure d'hiver : ils arrivent donc une heure trop tôt. Voir plus bas.

Et trois notifications en temps réel, déclenchées par l'app et non par l'heure :

| Notification | Déclencheur | Destinataire |
|---|---|---|
| « untel vient de te doubler » | fin d'une séance | ceux qui perdent une place |
| « untel a fini une séance » | fin d'une séance | le reste du groupe, 1×/jour/joueur |
| « untel a répondu à ton annonce » | proposition d'échange | l'auteur de l'annonce |

## Les quatre familles

L'abonnement porte quatre interrupteurs, réglables dans Profil →
Notifications :

| Clé | Ce que ça envoie |
|---|---|
| `creatine` | le rappel de 20h |
| `dailyChallenge` | le rappel de 17h |
| `groupe` | le temps réel : doublage, séance d'un pote, réponse à une annonce |
| `ambiance` | la vanne du soir et le défi surprise |

Les deux dernières sont arrivées après les deux premières. Un champ **absent**
vaut **oui**, côté client comme côté serveur : les abonnements créés avant leur
existence ne les ont pas, et les lire comme des refus aurait privé de tout le
groupe ceux qui avaient activé les rappels les premiers.

## Les compteurs du mois

`userProgress.moisCourant` tient les reps, les séances et la date de la
dernière séance du mois. **Ce n'est pas la source des classements** — ceux de
l'app sont toujours recalculés depuis les séances. C'est une commodité pour
les notifications : savoir qui vient d'être doublé demanderait sinon de relire
les séances des dix-neuf membres à chaque fin de séance, là où dix-neuf petits
documents suffisent.

Ils sont réécrits à deux moments : à la fin d'une séance pour le joueur
concerné, et pour tout le monde par le cron du soir, qui les recalcule depuis
les séances. C'est ce second passage qui répare une séance enregistrée hors
ligne.

`notifyState/leader` retient qui est en tête et depuis quand, pour la vanne
« untel mène depuis N jours » : il n'existe aucun historique du classement.

## Les textes

Les deux rappels tournent sur une liste de phrases, une par jour, dans
`api/_lib/messages.ts`. Le texte est choisi par le numéro du jour et non au
hasard : tout le groupe reçoit le même, ce qui est justement l'intérêt.

Pour en ajouter une, il suffit de l'écrire dans le tableau — la rotation
s'allonge toute seule. Les deux phrases d'origine sont gardées en tête de
liste.

## L'activation côté app

Une carte sur l'accueil (`src/components/NotifGate.tsx`) réclame l'activation
tant qu'aucun rappel n'est actif, et n'a pas de croix pour la fermer. Elle
disparaît dès que les rappels sont activés, et ne revient plus.

Elle ne peut pas forcer l'autorisation : le navigateur ne montre sa demande
qu'après un vrai clic, et une permission refusée ne peut plus être redemandée
par le code. Dans ce cas la carte bascule sur les instructions de réglages.

## Heure d'été, heure d'hiver

Les crons Vercel sont en UTC et ne gèrent pas les fuseaux. Le projet est sur le plan
**Hobby**, qui limite chaque cron à **un déclenchement par jour** : impossible de le faire
suivre le changement d'heure automatiquement, ni avec un horaire multiple
(`0 18,19 * * *`), ni avec un cron horaire filtré côté serveur.

Il faut donc basculer les horaires à la main, deux fois par an :

| Période | `creatine` (20h) | `daily-challenge` (17h) | `hasard` (14h) | `ambiance` (21h) |
|---|---|---|---|---|
| Heure d'hiver (dernier dimanche d'octobre → dernier dimanche de mars) | `0 19 * * *` | `0 16 * * *` | `0 13 * * *` | `0 20 * * *` |
| Heure d'été (dernier dimanche de mars → dernier dimanche d'octobre) | `0 18 * * *` | `0 15 * * *` | `0 12 * * *` | `0 19 * * *` |

**État au 5 novembre 2026** : `hasard` et `ambiance` sont sur les valeurs
d'hiver, donc justes. `creatine` et `daily-challenge` sont restés sur les
valeurs d'été depuis le 25 octobre et arrivent **une heure trop tôt** — 19h et
16h au lieu de 20h et 17h. Il suffit de les passer à `0 19` et `0 16`.

**À faire le 28 mars 2027** : repasser les quatre aux valeurs d'été.

## Mise en route

Tout le code est en place. Il reste à renseigner les variables d'environnement.

### 1. Clés VAPID

La clé publique est :

```
VAPID_PUBLIC_KEY=BN96sPAJhZOx7N8H07WPVsBlff1gJZt1CIlonzbF1r9_dplFl7Gf0KrEOoRgtDhpFomSq2L1V8jPX8cV3VVq7fg
```

La **clé privée correspondante n'est pas versionnée** — elle est à coller
directement dans les variables d'environnement Vercel.

Pour régénérer une paire : `node -e "console.log(require('web-push').generateVAPIDKeys())"`.
Changer de clés invalide tous les abonnements existants, et la clé publique doit
alors être mise à jour ici et dans `VITE_VAPID_PUBLIC_KEY`.

### 2. Service account Firebase

Console Firebase → Paramètres du projet → Comptes de service → **Générer une nouvelle clé privée**.
Le JSON téléchargé doit être collé **sur une seule ligne** dans `FIREBASE_SERVICE_ACCOUNT`.

### 3. Variables sur Vercel

Project Settings → Environment Variables :

| Variable | Valeur |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | la clé publique ci-dessus |
| `VAPID_PUBLIC_KEY` | la clé publique ci-dessus |
| `VAPID_PRIVATE_KEY` | la clé privée ci-dessus |
| `VAPID_SUBJECT` | `mailto:ton@email.com` |
| `FIREBASE_SERVICE_ACCOUNT` | le JSON sur une ligne |
| `CRON_SECRET` | une chaîne aléatoire (`openssl rand -hex 32`) |

Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET` sur ses appels cron ;
les endpoints refusent toute requête sans ce header.

### 4. Règles Firestore

Déployer `firestore.rules` (collection `pushSubscriptions` ajoutée).

## Diagnostic

### Depuis l'app

Profil → Notifications. Un bandeau orange n'apparaît que si quelque chose demande
une action : abonnement rétabli, autorisation iOS à redemander, ou vérification
impossible. Rien ne s'affiche quand tout va bien.

Un bouton « Envoyer une notification de test » a existé, avec l'endpoint
`/api/push/test` : il parcourait toute la chaîne et nommait l'étape fautive. Retiré
le 9 octobre 2026 une fois les notifications en service. À restaurer depuis
l'historique git si un diagnostic redevient nécessaire.

### En ligne de commande

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/creatine
```

Réponse attendue : `{"targeted":N,"sent":N,"skipped":N}`.

Un `401` signifie soit un mauvais secret, soit — plus souvent — que `CRON_SECRET`
n'est pas défini sur Vercel. Dans ce cas Vercel n'envoie aucun en-tête
d'autorisation et **les crons repartent silencieusement en 401 tous les jours
sans que rien ne le signale**. C'est la panne la plus probable quand les rappels
ne partent pas alors que tout le reste semble correct.

## Pannes déjà rencontrées

- **Abonnement révoqué par iOS.** Safari supprime l'abonnement push après une
  mise à jour de la PWA, une réinstallation, ou plusieurs semaines sans ouvrir
  l'app. Les préférences restaient à « activé » avec un endpoint mort.
  `syncSubscription()` le détecte à l'ouverture des réglages et se réabonne sans
  rien demander, puisque la permission est déjà accordée.
- **Bouton d'activation grisé pour toujours.** `navigator.serviceWorker.ready` ne
  rejette jamais : sans service worker actif, la promesse reste en suspens et
  l'interface restait bloquée. Un délai de 10 s la borne désormais.

## Limites connues

- **iOS** : le push ne fonctionne que si la PWA est installée sur l'écran d'accueil
  (iOS 16.4+). Dans un onglet Safari, c'est impossible — l'écran de réglages
  affiche un message d'installation à la place des interrupteurs.
- **Plan Vercel** : sur Hobby, deux crons maximum par projet, un déclenchement par jour
  chacun, et l'heure d'exécution n'est garantie qu'à l'heure près.
- **Fuseau des utilisateurs** : le numéro du défi du jour est calculé en heure de
  Paris côté serveur et en heure locale côté client. Un utilisateur hors de
  France pourrait recevoir le rappel alors qu'il a validé son défi.
