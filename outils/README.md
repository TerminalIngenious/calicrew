# Recadrage des portraits de l'event FaceID

Deux outils, utilisés une fois pour produire `public/faceid/*.webp` depuis les
photos brutes. Gardés ici pour la prochaine fournée.

## `visages.swift`

Détection de visage par le framework Vision de macOS, sans aucune dépendance.
Il tombe sur la détection de corps quand il n'y a pas de visage — casque
intégral, vue de dos, personne allongée au loin.

```
swiftc -O outils/visages.swift -o /tmp/visages
/tmp/visages photo1.jpg photo2.png
```

Il écrit une ligne JSON par image : dimensions après redressement EXIF, et la
boîte du plus grand visage ou corps, en coordonnées normalisées origine en
haut à gauche.

## `recadre-faceid.mjs`

Prend ces boîtes et découpe en 900 × 1200. Il **ne zoome pas** : il prend la
plus grande fenêtre 3/4 possible et la fait seulement glisser pour amener le
visage au bon endroit. Zoomer tuerait la moitié des photos — la montagne
derrière le randonneur fait la blague.

Les HEIC d'iPhone doivent passer par `sips` avant :

```
sips -s format png photo.HEIC --out photo.png
```

Le tableau des paires est en haut du fichier : un slug, la photo de la Face A,
celle de la Face B.
