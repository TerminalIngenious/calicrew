# Photos de l'event FaceID

Deux images par personne, nommées d'après le `slug` défini dans
`src/lib/faceid.ts` :

```
matteo-a.webp     Face A
matteo-b.webp     Face B
lucas-a.webp
lucas-b.webp
…
```

Format : **WebP**, portrait **3/4** (par exemple 600 × 800), visage centré et
plutôt haut dans le cadre — l'affichage recadre à `object-position: center 22%`.

Tant qu'un fichier n'existe pas, la carte retombe automatiquement sur la
silhouette : on peut donc en ajouter au fur et à mesure, sans rien changer
dans le code.

Pour convertir un lot de JPG :

```
for f in *.jpg; do sips -s format webp "$f" --out "${f%.jpg}.webp"; done
```

Les `slug` sont gelés : ils servent d'identifiant aux cartes déjà collectées.
On peut corriger un prénom quand on veut, jamais un slug.
