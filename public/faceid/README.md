# Les photos de l'event FaceID

Le gabarit de la carte est **dessiné en code** — cadre, bandeau FACEID,
numéro, note globale, tampon, prénom, surnom, les cinq statistiques et le
logo. Voir `src/components/cardArt/FaceIdCardArt.tsx`.

Ce dossier ne contient donc **que les photos**, qui viennent se poser au
centre du cadre.

## Nommage

D'après le `slug` défini dans `src/lib/faceid.ts` :

```
matteo-a.webp     Face A — la version classe
matteo-b.webp     Face B — la version débile
lucas-a.webp
lucas-b.webp
…
```

Les `slug` sont gelés une fois l'event lancé : ils identifient les cartes déjà
collectées. Un prénom se corrige quand on veut, jamais un slug.

## Format

| | |
|---|---|
| Fichier | **WebP avec transparence** |
| Découpe | **sujet détouré**, fond transparent |
| Taille | **900 × 1200**, le sujet calé en bas du cadre |
| Poids | moins de **60 ko** par photo |

Le détourage compte : la photo se pose sur le fond du scanner, elle ne le
remplace pas. Un rectangle photo opaque écraserait la grille, le halo et
l'empreinte, et les deux faces se ressembleraient.

Cale le sujet **en bas de l'image** : il est ancré sur le bord inférieur, donc
une ligne d'épaules constante d'une photo à l'autre donne une série régulière.
Laisse de la marge en haut, la note globale vient s'y poser.

## Les textes et les chiffres

Ils ne sont pas ici mais dans `src/lib/faceid.ts`, table `ART` :

```ts
export const ART: Record<string, ArtFaceId> = {
  'fid-matteo-a': { surnom: 'Le Sage', note: 92, stats: [85, 90, 82, 88, 21] },
  'fid-matteo-b': { surnom: 'Le Gros Râleur', note: 66, stats: [62, 70, 67, 91, 93] },
};
```

Les cinq valeurs suivent l'ordre de `STATS` : **Gainage, Régularité,
Explosivité, Ego, Excuses**. La dernière s'inverse d'une face à l'autre —
c'est elle qui fait la blague.

Une carte absente de la table prend des valeurs par défaut, pour que la mise
en page reste vérifiable avant que les vingt-quatre soient écrites.

## Pendant que tout n'est pas là

Chaque photo manquante laisse simplement le cadre vide : le reste de la carte
s'affiche normalement. On peut donc remplir au fur et à mesure.
