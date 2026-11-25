/**
 * Décor de décembre : la neige qui tombe, la guirlande et la ligne d'arbres.
 *
 * La neige qui se *pose* sur les éléments n'est pas ici — elle est en CSS, en
 * `::before` sur les dalles. C'est ce qui permet de l'avoir sur toutes les
 * pages sans toucher un seul composant, et surtout de la voir bouger avec la
 * carte quand on fait défiler la page : un flocon posé par ce décor-ci, qui
 * est en `position: fixed`, serait resté en l'air pendant que la carte part.
 *
 * Comme les autres décors, tout est en `position: fixed` derrière le contenu
 * et insensible aux clics.
 *
 * ── Ce qui a changé, et pourquoi ──
 *
 * La première version empilait les signes de Noël : quinze ampoules des
 * quatre couleurs de la fête qui clignotaient, deux sapins à boules rouges,
 * bleues et jaunes avec une étoile sur la cime, des flocons blancs opaques.
 * Chaque objet, pris seul, disait bien « Noël ». Ensemble ils faisaient une
 * vitrine de supermarché posée sur une app qui, elle, est sobre.
 *
 * Ici, un seul parti : une nuit d'hiver. Les lumières sont toutes de la même
 * blancheur chaude, les arbres ne sont plus que des silhouettes, la neige est
 * fine et lente. On reconnaît la fête à l'ambiance, pas à l'inventaire.
 */

/*
 * Les flocons.
 *
 * Plus nombreux qu'avant mais beaucoup plus discrets : de la vraie neige de
 * nuit, c'est une poussière qu'on devine, pas des confettis. Les tailles
 * restent petites et les durées longues — un flocon qui traverse l'écran en
 * huit secondes tombe comme une pierre.
 *
 * Posés à la main pour qu'ils ne tombent pas en colonnes.
 */
const FLOCONS = [
  { x: 3, taille: 3, duree: 23, retard: 0, derive: 26, opacite: 0.5 },
  { x: 9, taille: 2, duree: 31, retard: 7, derive: -16, opacite: 0.34 },
  { x: 16, taille: 4, duree: 19, retard: 2.5, derive: 34, opacite: 0.62 },
  { x: 22, taille: 2, duree: 34, retard: 12, derive: -22, opacite: 0.3 },
  { x: 29, taille: 3, duree: 25, retard: 5, derive: 18, opacite: 0.46 },
  { x: 35, taille: 5, duree: 17, retard: 15, derive: 30, opacite: 0.7 },
  { x: 42, taille: 2, duree: 36, retard: 9, derive: -28, opacite: 0.32 },
  { x: 48, taille: 3, duree: 27, retard: 3.5, derive: 22, opacite: 0.48 },
  { x: 55, taille: 4, duree: 21, retard: 18, derive: -20, opacite: 0.58 },
  { x: 61, taille: 2, duree: 33, retard: 6, derive: 16, opacite: 0.3 },
  { x: 68, taille: 3, duree: 24, retard: 11, derive: -32, opacite: 0.5 },
  { x: 74, taille: 5, duree: 18, retard: 1.5, derive: 24, opacite: 0.66 },
  { x: 81, taille: 2, duree: 35, retard: 20, derive: -18, opacite: 0.28 },
  { x: 87, taille: 3, duree: 26, retard: 8, derive: 28, opacite: 0.44 },
  { x: 93, taille: 4, duree: 20, retard: 14, derive: -24, opacite: 0.6 },
  { x: 98, taille: 2, duree: 30, retard: 4, derive: 20, opacite: 0.32 },
  { x: 12, taille: 2, duree: 38, retard: 23, derive: 14, opacite: 0.26 },
  { x: 45, taille: 2, duree: 29, retard: 26, derive: -12, opacite: 0.3 },
  { x: 71, taille: 2, duree: 37, retard: 29, derive: 18, opacite: 0.27 },
  { x: 90, taille: 3, duree: 28, retard: 17, derive: -26, opacite: 0.4 },
];

/*
 * Les lumières de la guirlande.
 *
 * Toutes de la même blancheur chaude, et non des quatre couleurs de la fête.
 * Une guirlande rouge-vert-bleu-jaune qui clignote, c'est le sapin de la
 * mairie ; une guirlande d'un seul blanc ambré, c'est une terrasse en
 * décembre. La deuxième ressemble à l'app.
 *
 * Elles ne clignotent plus non plus : elles respirent, chacune à son rythme.
 * Un clignotement passe de 1 à 0,32 en une seconde et attire l'œil hors de
 * ce qu'on est en train de lire.
 */
const LUMIERES = Array.from({ length: 13 }, (_, i) => i);

/** Le creux du fil, en pixels : la guirlande pend, elle n'est pas tendue. */
const CREUX = 9;

export default function NoelDecor() {
  return (
    <>
      {/* La guirlande vit hors du décor, en calque à part.
       *
       * Le décor est derrière le contenu, pour qu'un arbre ne mange jamais
       * une ligne de texte. La guirlande, elle, est accrochée en haut de
       * l'écran : derrière, elle disparaissait sous les bannières pleine
       * largeur — celle du Pass notamment. Elle passe donc devant, comme
       * une vraie guirlande tendue au-dessus de la pièce, et reste sous la
       * barre de navigation. */}
      <div className="noel-guirlande">
        {/* Le fil est un trait et non une image : il doit s'étirer du
            téléphone à l'écran d'ordinateur sans s'épaissir. */}
        <svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 0.6 Q50 13.5 100 0.6"
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {LUMIERES.map((i) => {
          const t = i / (LUMIERES.length - 1);
          return (
            <span
              key={i}
              className="noel-lumiere"
              style={{
                left: `${t * 100}%`,
                // La même parabole que le fil, pour que les lumières pendent
                // dessus et non à côté.
                top: `${4 * CREUX * t * (1 - t)}px`,
                // Des phases premières entre elles : avec un pas régulier,
                // la respiration part en vague de gauche à droite et se
                // regarde comme une animation.
                animationDelay: `${(i * 1.7) % 4.3}s`,
              }}
            />
          );
        })}
      </div>

      <div className="noel-decor" aria-hidden="true">
        <div className="noel-lueur" />

        <div className="noel-neige">
          {FLOCONS.map((f, i) => (
            <span
              key={i}
              className="noel-flocon"
              style={{
                left: `${f.x}%`,
                width: f.taille,
                height: f.taille,
                animationDuration: `${f.duree}s`,
                animationDelay: `-${f.retard}s`,
                ['--derive' as string]: `${f.derive}px`,
                ['--creux' as string]: f.opacite,
              }}
            />
          ))}
        </div>

        {/* La ligne d'arbres, en deux rangées répétées à l'infini.
         *
         * Deux sapins posés dans les coins étaient deux objets ; une ligne
         * d'horizon est un lieu. Et comme c'est un motif qui se répète, elle
         * tient sur toutes les largeurs sans que les arbres s'étirent — ce
         * qu'un SVG en `preserveAspectRatio: none` leur aurait fait. */}
        <div className="noel-foret">
          <div className="noel-foret-fond" />
          <div className="noel-foret-devant" />
        </div>
      </div>
    </>
  );
}
