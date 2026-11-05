# Les cartes de l'event FaceID

Deux cartes par personne, **dessinées entières** et déposées ici. L'app les
affiche telles quelles, bord à bord — elle n'ajoute ni cadre, ni prénom, ni
mention de face par-dessus. Tout ce qui doit se lire sur la carte doit être
dans l'image.

## Nommage

D'après le `slug` défini dans `src/lib/faceid.ts` :

```
matteo-a.webp     Face A
matteo-b.webp     Face B
lucas-a.webp
lucas-b.webp
…
```

Les `slug` sont gelés une fois l'event lancé : ils identifient les cartes déjà
collectées. Un prénom se corrige quand on veut, jamais un slug.

## Format

| | |
|---|---|
| Format de fichier | **WebP** (PNG accepté, mais trois à quatre fois plus lourd) |
| Proportions | **3/4** — par exemple **900 × 1200** |
| Poids visé | **moins de 60 ko** par carte, soit 1,4 Mo pour les vingt-quatre |
| Coins | à dessiner carrés : l'app arrondit de 9 px |

Les proportions sont souples : l'image est affichée en `contain`, donc un
format un peu différent laisse une marge plutôt que de se faire rogner. Mais
vingt-quatre cartes au même format font une grille autrement plus nette.

Attention à la lisibilité en **vignette** : dans le trombinoscope, une carte
fait environ 70 px de large. Un prénom en petit corps y devient illisible.

## Pendant que les images n'existent pas

Chaque carte retombe automatiquement sur une silhouette : on peut donc les
ajouter une par une, sans rien changer dans le code, et voir le fichier se
remplir au fur et à mesure.

## Conversion

Depuis des PNG ou des JPG :

```
for f in *.png; do cwebp -q 82 "$f" -o "${f%.png}.webp"; done
```

Sans `cwebp` installé, `sips -s format webp fichier.png --out fichier.webp`
fait l'affaire sur macOS.
