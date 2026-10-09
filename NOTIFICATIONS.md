# Notifications push

Deux rappels quotidiens, envoyés par des Vercel Cron Jobs :

| Rappel | Heure visée | Cron UTC | Condition |
|---|---|---|---|
| Créatine — « Chef, t'as pris ta créatine ?? » | 20h | `0 19 * * *` | rappel activé |
| Défi du jour | 17h | `0 16 * * *` | défi du jour non validé |

## Heure d'été, heure d'hiver

Les crons Vercel sont en UTC et ne gèrent pas les fuseaux. Le projet est sur le plan
**Hobby**, qui limite chaque cron à **un déclenchement par jour** : impossible de le faire
suivre le changement d'heure automatiquement, ni avec un horaire multiple
(`0 18,19 * * *`), ni avec un cron horaire filtré côté serveur.

Il faut donc basculer les horaires à la main, deux fois par an :

| Période | `creatine` | `daily-challenge` |
|---|---|---|
| Heure d'hiver (dernier dimanche d'octobre → dernier dimanche de mars) | `0 19 * * *` | `0 16 * * *` |
| Heure d'été (dernier dimanche de mars → dernier dimanche d'octobre) | `0 18 * * *` | `0 15 * * *` |

Réglé pour l'hiver le 9 octobre 2026. **Prochaine bascule : le 28 mars 2027**, vers les
valeurs d'été. Entre le 9 et le 25 octobre 2026, les rappels arrivent une heure plus tard
(21h et 18h) — seize jours de décalage assumés plutôt qu'une correction oubliée.

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
