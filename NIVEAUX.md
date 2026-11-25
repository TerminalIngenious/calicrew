# Niveaux de profil — conception

Document de travail, écrit avant le développement. Tout ce qui est chiffré ici
est calibré sur les **382 séances réellement enregistrées** par les 17 joueurs,
pas sur une intuition. Les commandes qui ont servi à mesurer sont rappelées en
fin de document.

---

## 1. Ce qui change, en une phrase

Aujourd'hui une seule jauge, l'XP, fait tout : elle monte le pass et c'est
tout. Demain il y en a deux, qui ne se mélangent jamais.

| | **CaliPass** | **XP** |
|---|---|---|
| Sert à | monter le **pass de la saison** | monter le **niveau de profil** |
| Gagné par | les quêtes, comme aujourd'hui | chaque séance finie, selon l'effort |
| Remis à zéro | à chaque saison | **jamais** |
| Plafond | niveau 100 | aucun |
| Récompenses | coffres de la saison | coffres, badges, titres |

La séparation est le point important. Le pass récompense **ce qu'on te demande
de faire** (les quêtes). Le niveau récompense **ce que tu fais**, point. On peut
être niveau 60 sans jamais toucher une quête.

---

## 2. CaliPass

C'est l'XP d'aujourd'hui, renommée. Rien ne change dans son fonctionnement :
mêmes quêtes, mêmes montants, mêmes 100 niveaux, mêmes paliers de coffres,
même remise à zéro à chaque saison.

Seuls les libellés bougent — `passXp` reste `passXp` dans la base, on ne
renomme pas un champ Firestore pour une question d'affichage.

> **Quête finie · +75 CaliPass**
> **Niveau 23 du pass — 1 240 / 1 500 CaliPass**

---

## 3. L'XP, et comment elle se calcule

### La formule

```
minutes   = min( durée de la séance en minutes , 120 )
séries    = séries cochées
reps      = répétitions cumulées
secondes  = secondes tenues (gainage, L-sit…)
tonnage   = somme de (charge × reps) sur les séries lestées, en kg
km        = distance en course / vélo / marche

XP =  2 × minutes
    + 3 × séries
    + reps / 4
    + secondes / 12
    + tonnage / 60
    + 4 × km

      plafonné à 800 par séance
```

### Pourquoi ces cinq termes

Chacun répond à une façon d'avoir travaillé, et aucun ne suffit seul :

- **Le temps**, parce qu'une séance longue est une séance dure. Plafonné à
  120 minutes : c'est ce qui empêche la séance de 54 heures oubliée ouverte
  de valoir quoi que ce soit.
- **Les séries**, parce que c'est l'unité de travail réelle. Pondérées fort
  (3 points) : c'est le terme le plus difficile à gonfler sans faire la séance.
- **Les reps**, mais divisées par 4. Sinon 200 pompes écrasent tout le reste.
- **Les secondes**, divisées par 12 — une minute de gainage vaut 5 points,
  à peu près une série. C'est le terme qui n'existait nulle part avant et qui
  répare l'injustice faite aux isométriques.
- **Le tonnage**, divisé par 60. C'est ta « difficulté » : 100 kg × 10 reps =
  1 000 kg = 16 points. Un développé lourd rapporte, du poids de corps aussi,
  autrement.
- **Les kilomètres**, pour que la course et le vélo ne soient pas à zéro.

### Ce que ça donne sur les vraies séances

Mesuré sur les 382 séances terminées du groupe :

| | XP |
|---|---|
| médiane d'une séance | **99** |
| moyenne | 124 |
| 75ᵉ centile | 192 |
| 90ᵉ centile | 261 |
| la plus grosse séance jamais faite | 528 |
| séances qui touchent le plafond de 800 | **0** |
| séances à 0 XP | 26, toutes réellement vides |

Le plafond est donc là pour la triche, pas pour les gros entraînements : la
plus grosse séance réelle est à 66 % du plafond.

Par semaine et par joueur, les onze joueurs à plus de cinq séances s'étalent
de **112 à 886 XP**, médiane **245**. C'est ce chiffre qui cale la courbe.

### Le plancher, et l'erreur qu'il a failli coûter

Première version : « moins de 3 séries **et** moins de 5 minutes → 0 XP ».
Passée sur les vraies séances, elle en mettait **72 sur 382 à zéro**, soit une
sur cinq. En regardant lesquelles : des séries uniques de quinze à trente
pompes, en une minute — les **défis du jour**. Trente pompes sont trente
pompes, elles valent leurs douze points.

Le plancher est donc devenu le plus simple possible : *aucune série cochée,
aucun kilomètre, aucun temps de sortie → 0*. Et rien d'autre. Le farm de
micro-séances est tenu par le plafond journalier, pas par un plancher qui
punit ceux qui jouent le jeu.

Attention au piège inverse : le chrono de la séance ne compte pas comme du
travail, sinon une séance ouverte trois quarts d'heure sans qu'une case soit
cochée rapporterait 90 XP. Mais un match de foot d'une heure n'a ni série ni
kilomètre et doit rapporter. D'où le relevé séparé du temps de sortie.

---

## 4. La courbe des niveaux

```
coût du niveau n  =  round( 40 × n^0.67 )
```

Pas de plafond : la formule vaut pour le niveau 7 comme pour le 400.

Le niveau 1 est gratuit : on y commence. Le niveau 2 coûte 64 XP, soit une
bonne séance.

| niveau | coût | cumul | lent (112/sem) | médian (245/sem) | rapide (571/sem) |
|---|---|---|---|---|---|
| 2 | 64 | 64 | 0,6 sem | 0,3 sem | 0,1 sem |
| 5 | 118 | 367 | 3,3 sem | 1,5 sem | 0,6 sem |
| 10 | 187 | 1 169 | 2,4 mois | 4,8 sem | 2,0 sem |
| 15 | 245 | 2 281 | 4,7 mois | 2,2 mois | 4,0 sem |
| 25 | 346 | 5 301 | 10,9 mois | 5,0 mois | 2,1 mois |
| 40 | 474 | 11 536 | 23,8 mois | 10,9 mois | 4,7 mois |
| 50 | 550 | 16 698 | 2,9 ans | 15,7 mois | 6,8 mois |
| 75 | 722 | 32 726 | 5,6 ans | 2,6 ans | 13,2 mois |
| 100 | 875 | 52 793 | 9,1 ans | 4,1 ans | 21,4 mois |
| 150 | 1 148 | 103 665 | 17,8 ans | 8,1 ans | 3,5 ans |
| 200 | 1 392 | 167 400 | 28,7 ans | 13,1 ans | 5,6 ans |

Les trois colonnes sont les rythmes **réellement mesurés** dans le groupe :
le plus lent des joueurs réguliers, le médian, et le plus assidu.

Ce qu'il faut lire là-dedans : **les premiers niveaux tombent vite** — niveau 5
en moins de deux semaines, niveau 10 en un mois — et le niveau 100 reste un
objectif de plusieurs années, même pour le plus assidu du groupe. C'est ce que
tu demandais : facile au début, de plus en plus long ensuite.

---

## 5. Les récompenses de niveau

Trois sortes, qui ne tombent pas au même rythme.

### Les coffres

Un coffre tous les niveaux jusqu'à 10, puis tous les 2, puis tous les 5 à
partir de 50. La rareté garantie suit les paliers ronds :

| niveau | coffre |
|---|---|
| 3, 6, 9 | commune |
| 10 | rare |
| 15, 20 | rare |
| 25 | épique |
| 30, 40 | rare |
| 50 | **légendaire** |
| 60, 70 | épique |
| 75 | légendaire |
| 100 | **historique** |
| puis tous les 25 | légendaire |
| puis tous les 100 | historique |

Les coffres de niveau tirent dans **la saison en cours**, comme ceux du pass.

### Les badges

Aux paliers ronds : 10, 25, 50, 75, 100, 150, 200. Plus toute la liste du
§ 6, qui ne dépend pas du niveau.

### Les titres — *proposition de ma part*

Tu n'en as pas parlé, je le propose parce que c'est le seul moyen de donner
quelque chose aux niveaux qui n'ont ni coffre ni badge — et ils sont la
majorité. Un titre, c'est deux mots affichés sous le pseudo, choisis parmi
ceux qu'on a débloqués.

> **Mattéo**
> *Bête de somme* · niveau 47

Ça ne coûte presque rien à construire (un champ, une liste, un sélecteur dans
le profil) et ça donne une raison de monter entre deux paliers. À arbitrer.

---

## 6. Les badges à inventer

Les badges d'aujourd'hui sont de deux sortes : podium mensuel (or/argent/bronze
sur reps, variété, temps, pas) et événement. On garde tout, on ajoute six
familles. Rien ici ne dépend d'une saison : ce sont des traces permanentes.

### Paliers de niveau
`niveau-10` · `niveau-25` · `niveau-50` · `niveau-75` · `niveau-100` ·
`niveau-150` · `niveau-200`

### Volume
| id | condition |
|---|---|
| `reps-10k` | 10 000 répétitions cumulées |
| `reps-50k` | 50 000 |
| `reps-100k` | 100 000 |
| `reps-500k` | 500 000 |
| `series-1k` | 1 000 séries |
| `series-10k` | 10 000 séries |

### Temps sous la barre
`temps-24h` (24 h cumulées) · `temps-100h` · `temps-500h` · `temps-1000h`

### Charge
`tonnage-10t` · `tonnage-100t` · `tonnage-500t` · `tonnage-1000t`
(tonnage cumulé, toutes séances confondues)

### Régularité
| id | condition |
|---|---|
| `serie-7` | 7 jours d'affilée avec une séance |
| `serie-30` | 30 jours |
| `serie-100` | 100 jours |
| `serie-365` | un an sans trou |
| `seances-50` | 50 séances |
| `seances-100` | 100 séances |
| `seances-500` | 500 séances |
| `seances-1000` | 1 000 séances |

### Exploits en une séance
| id | condition |
|---|---|
| `marathon` | une séance de 2 h |
| `500-reps` | 500 reps dans une séance |
| `amrap-20` | 20 tours sur un AMRAP |
| `20-series` | 20 séries dans une séance |
| `tonne` | 1 000 kg de tonnage dans une séance |
| `aube` | une séance commencée avant 6 h |
| `couche-tard` | une séance commencée après 23 h |

### Collection
`collection-saison` (une saison complète) · `collection-double` (deux saisons
complètes) · `historique` (posséder une carte historique) ·
`intergalactique` (déjà existant)

Ça fait **39 badges neufs**. Chacun a besoin d'un titre, d'un sous-titre, d'une
rubrique et d'un couple de couleurs, comme les badges d'événement actuels dans
`lib/badges.ts`.

---

## 7. Les pages

### 7.1 Profil — refonte

Dans l'ordre, de haut en bas :

1. **Le bandeau**, qui porte maintenant le niveau. Le numéro en gros, la barre
   d'XP qui ferme le bandeau d'un bord à l'autre — exactement comme le pass et
   la collection. L'avatar et le pseudo restent à gauche.
2. **Le titre** sous le pseudo, si les titres sont retenus.
3. **Ma progression**, inchangé.
4. **Les badges**, en bandeau plus petit comme tu l'as demandé : une rangée des
   quatre derniers gagnés et le compte, au lieu du grand bandeau actuel.
5. **Mes cartes**, nouvelle ligne qui ouvre la page du § 7.3. Elle remplace les
   étagères de saison empilées, qui prennent aujourd'hui la moitié de la page.
6. Programmes, compte, déconnexion — inchangés.

### 7.2 Page Niveaux — nouvelle, `/niveaux`

Une échelle qu'on fait défiler, à la Clash Royale. Chaque barreau porte son
numéro, sa récompense, et l'état : passé / en cours / à venir. On peut
descendre bien au-delà de son niveau pour voir ce qui attend.

La piste du pass existe déjà (`components/PassTrack.tsx`, avec son rail en
dégradé et ses pastilles) : **on la réutilise plutôt que d'en dessiner une
deuxième**. Deux échelles qui se ressemblent à 90 %, c'est le genre de détail
qui fait bricolé.

Différence avec le pass : l'échelle est infinie. On en affiche 40 à la fois et
on charge la suite au défilement.

### 7.3 Page Cartes — nouvelle, `/cartes`

Toutes les cartes, d'un coup, avec un filtre en haut :

> **Tout** · Saison 1 · Saison 2 · Avent · FaceID · Intergalactique

Aujourd'hui c'est éclaté entre `/collection` (saisons), `/avent/cartes` et
`/faceid/cartes`, avec trois mises en page différentes pour la même chose. La
nouvelle page absorbe les trois ; les anciennes routes redirigent dessus avec
le bon filtre pré-sélectionné, pour ne casser aucun lien existant.

Le compte en haut suit le filtre : « 19 / 50 » sur une saison, « 94 / 131 » sur
Tout.

---

## 8. Données et migration

### Nouveaux champs sur `userProgress`

```ts
/** XP de profil, cumulée à vie. Jamais remise à zéro. */
xp?: number;
/** Niveaux dont la récompense a déjà été donnée. Évite de la donner deux fois. */
niveauxPris?: number[];
/** Titre affiché sous le pseudo, si les titres sont retenus. */
titre?: string;
```

Le **niveau n'est pas stocké** : il se déduit de `xp`. Une valeur dérivée qu'on
stocke est une valeur qui peut devenir fausse — c'est déjà la règle pour le
streak de créatine.

### Migration

**Aucune.** Tu as tranché : tout le monde démarre au niveau 1, et le pass n'est
pas touché. Donc rien à réécrire dans Firestore, et pas de pluie de coffres
rétroactifs à l'ouverture.

Conséquence assumée : les six mois de séances déjà faites ne comptent pas. Si
un jour tu changes d'avis, le recalcul reste possible — toutes les séances sont
là, et la formule du § 3 se rejoue sur l'historique en une passe.

### L'ordre d'écriture, et pourquoi il compte

L'XP se calcule et s'écrit **au moment où la séance est marquée finie**, dans la
même écriture que la séance, avant toute animation. C'est la leçon du coffre du
pass : une récompense montrée avant d'être écrite est une récompense rejouable.

---

## 9. Garde-fous

On vient de corriger deux failles ce mois-ci (unités fausses, coffre rejouable).
Les mêmes erreurs ne doivent pas revenir par la porte des niveaux.

| risque | parade |
|---|---|
| Séance laissée ouverte 54 h | temps plafonné à 120 min |
| Exercice de temps saisi en reps | `unit` est déjà fiable depuis la correction des unités ; les secondes ont leur propre terme |
| Séance vide validée en boucle | aucune série, aucun km, aucun temps de sortie → 0 XP |
| Charge délirante (999 kg) | tonnage plafonné à 15 000 kg par séance |
| Farm de micro-séances | plafond de **1 200 XP par jour**, toutes séances confondues |
| Récompense rejouée | écriture avant animation, et `niveauxPris` empêche le doublon |

Aucun de ces plafonds ne gêne un joueur réel : le plus gros de la base est à
528 XP sur sa meilleure séance et 886 XP sur sa meilleure semaine.

Vérifié sur les cas limites, en rejouant le vrai module :

| cas | XP |
|---|---|
| séance laissée ouverte 54 h, rien coché | **0** |
| défi du jour, 30 pompes en 1 min | 13 |
| gainage seul, 3 × 60 s | 44 |
| match de foot d'1 h, ni série ni km | 120 |
| 10 km en 50 min | 140 |
| charge délirante, 999 kg × 100 reps | 338 *(plafonné ; 1 665 sans)* |

---

## 10. Ce que la maintenance coûte, et la décision qui reste

L'app est coupée à partir d'aujourd'hui, 25 novembre. **La saison 1 se termine
le 30 novembre**, dans cinq jours.

Tu as dit de ne pas toucher aux quêtes de fin de saison, et je ne les ai pas
touchées. Mais il faut être clair sur ce qui se passe mécaniquement :

- Les coffres déjà gagnés et pas ouverts **ne sont pas perdus** : à la bascule
  de saison ils sont épinglés sur la saison 1 et donneront bien des cartes de
  la saison 1 (`startNewSeason`, `lib/passes.ts`).
- Les cartes, badges et records **ne bougent pas**.
- En revanche, pendant ces cinq jours, **personne ne peut finir une quête ni
  enregistrer une séance**. Le CaliPass qu'ils auraient gagné, et les coffres
  accrochés aux niveaux qu'ils auraient franchis, n'existeront jamais.

**Ce que je propose :** décaler la fin de la saison 1 de la durée exacte de la
maintenance. Une constante change dans `lib/passes.ts`, les quêtes ne sont pas
touchées, et chacun récupère ses cinq jours à la réouverture. La saison 2
démarre d'autant plus tard.

C'est à toi de trancher — ça déplace la date de lancement de la saison 2. Je
n'ai rien changé en attendant.

---

## 11. Ordre de développement

1. ~~`lib/niveaux.ts` : la formule d'XP, la courbe, les paliers.~~ **Fait.**
   Vérifié sur les 382 séances réelles et sur six cas limites ; l'aller-retour
   niveau ↔ XP est exact sur 300 niveaux.
2. L'XP accordée en fin de séance, avec ses plafonds.
3. Le bandeau du profil : niveau + barre. C'est ce qui rend la chose visible.
4. La page `/niveaux`, à partir de `PassTrack`.
5. Les 39 badges, et leur détection.
6. La page `/cartes` unifiée, et les redirections.
7. Les titres, si retenus.
8. Le renommage XP → CaliPass sur la page Pass.

Les points 1 à 3 suffisent à rouvrir l'app. Le reste peut arriver ensuite, sans
nouvelle coupure.

---

## Mesures

Les chiffres des § 3 et § 4 viennent d'un script de lecture seule passé sur la
collection `sessions` (382 séances terminées, 17 joueurs, 103 séances
d'endurance, 7 séances sans durée enregistrée). Il n'a rien écrit et n'a pas
été conservé : la clé de service vit dans `~/.calicrew/`, hors du dépôt.
