# Notifications push

Deux rappels quotidiens, envoyés par des Vercel Cron Jobs :

| Rappel | Heure (Paris, été) | Cron UTC | Condition |
|---|---|---|---|
| Créatine — « Chef, t'as pris ta créatine ?? » | 20h | `0 18 * * *` | abonnement actif |
| Défi du jour | 17h | `0 15 * * *` | défi du jour non validé |

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

## Test manuel

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/creatine
```

Réponse attendue : `{"targeted":N,"sent":N}`.

## Limites connues

- **iOS** : le push ne fonctionne que si la PWA est installée sur l'écran d'accueil
  (iOS 16.4+). Dans un onglet Safari, c'est impossible — l'écran de réglages
  affiche un message d'installation à la place des interrupteurs.
- **Heure d'hiver** : les crons Vercel sont en UTC sans gestion de fuseau. De fin
  octobre à fin mars, les rappels arrivent une heure plus tôt (19h et 16h).
  Corriger en passant les schedules à `0 19 * * *` et `0 16 * * *`.
- **Plan Vercel** : sur Hobby, les crons sont limités en nombre et l'heure
  d'exécution n'est garantie qu'à l'heure près.
- **Fuseau des utilisateurs** : le numéro du défi du jour est calculé en heure de
  Paris côté serveur et en heure locale côté client. Un utilisateur hors de
  France pourrait recevoir le rappel alors qu'il a validé son défi.
