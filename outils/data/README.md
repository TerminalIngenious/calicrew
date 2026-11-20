# Données — le tableau de bord local

Un petit serveur qui tourne sur ta machine et montre l'état de l'app :
inscrits, actifs, séances, exercices, groupes, et les anomalies à surveiller.

Il ne vit **pas** dans CaliCrew et n'est **pas** déployé. Il écoute sur
`127.0.0.1`, donc personne d'autre ne peut l'ouvrir — pas même un téléphone
sur le même wifi.

## La clé, une fois pour toutes

1. [console.firebase.google.com](https://console.firebase.google.com) →
   projet **calicrew-ec042**
2. ⚙️ **Paramètres du projet** → onglet **Comptes de service**
3. **Générer une nouvelle clé privée** → un `.json` arrive dans `~/Downloads`
4. Range-la hors du dépôt, qui est public :

```bash
mkdir -p ~/.calicrew && mv ~/Downloads/calicrew-ec042-*.json ~/.calicrew/cle.json
```

Les clés déjà en service continuent de fonctionner : la production n'est pas
touchée.

## Lancer

```bash
npm run data
```

Le navigateur s'ouvre tout seul sur <http://localhost:4321>. `Ctrl+C` pour
arrêter.

L'adresse ne vit que tant que la commande tourne : ce n'est pas un site, il
n'y a rien en ligne, et rien à partager.

Pour lancer sans ouvrir de fenêtre :

```bash
node outils/data/serveur.mjs --sans-navigateur
```

Pour une clé rangée ailleurs, ou un autre port :

```bash
node outils/data/serveur.mjs --compte /chemin/cle.json --port 4321
```

## Ce qu'il montre

- **En haut** : inscrits, actifs sur 7 et 30 jours, séances du jour et de la
  semaine, part d'inscrits réellement actifs.
- **Les courbes** : séances par jour sur 30 jours, par semaine sur 12
  semaines, par heure de la journée et par jour de la semaine.
- **Alertes** : séances d'une durée impossible (avec leur identifiant, à
  passer à `outils/corrige-duree.mjs`), inscrits sans aucune séance, comptes
  dans aucun groupe, et membres endormis depuis plus de deux semaines.
- **Les membres** : tableau triable — séances, reps, temps, XP, cartes,
  dernière activité, date d'inscription.
- **Le sport** : exercices les plus pratiqués, et les groupes.

Tout est relu à chaque « Recharger » : aucun cache, les chiffres sont ceux
de la base à la seconde près.
