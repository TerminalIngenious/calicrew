/**
 * Décor de décembre : la neige qui tombe, la guirlande et les sapins.
 *
 * La neige qui se *pose* sur les éléments n'est pas ici — elle est en CSS, en
 * `::before` sur les dalles. C'est ce qui permet de l'avoir sur toutes les
 * pages sans toucher un seul composant, et surtout de la voir bouger avec la
 * carte quand on fait défiler la page : un flocon posé par ce décor-ci, qui
 * est en `position: fixed`, serait resté en l'air pendant que la carte part.
 *
 * Comme les autres décors, tout est en `position: fixed` derrière le contenu
 * et insensible aux clics.
 */

/** Les flocons. Posés à la main pour qu'ils ne tombent pas en colonnes. */
const FLOCONS = [
  { x: 4, taille: 9, duree: 11, retard: 0, derive: 22 },
  { x: 13, taille: 5, duree: 15, retard: 3.5, derive: -14 },
  { x: 21, taille: 12, duree: 9, retard: 1.2, derive: 30 },
  { x: 29, taille: 6, duree: 17, retard: 6, derive: -20 },
  { x: 37, taille: 8, duree: 12.5, retard: 2.4, derive: 16 },
  { x: 44, taille: 4, duree: 19, retard: 8, derive: -26 },
  { x: 52, taille: 11, duree: 10, retard: 4.6, derive: 24 },
  { x: 59, taille: 6, duree: 16, retard: 0.8, derive: -18 },
  { x: 67, taille: 9, duree: 13, retard: 7.2, derive: 28 },
  { x: 74, taille: 5, duree: 18, retard: 2, derive: -12 },
  { x: 82, taille: 13, duree: 8.5, retard: 5.4, derive: 20 },
  { x: 89, taille: 7, duree: 14, retard: 9.5, derive: -24 },
  { x: 96, taille: 5, duree: 16.5, retard: 3, derive: 14 },
  { x: 8, taille: 4, duree: 20, retard: 11, derive: -16 },
  { x: 48, taille: 7, duree: 12, retard: 13, derive: -22 },
  { x: 78, taille: 4, duree: 21, retard: 15, derive: 18 },
];

/** Les ampoules de la guirlande, en boucle de quatre couleurs. */
const AMPOULES = Array.from({ length: 15 }, (_, i) => i);
const COULEURS = ['#ff453a', '#ffd60a', '#30d158', '#64d2ff'];

/** Un sapin : trois étages, un tronc, une étoile. */
function Sapin() {
  return (
    <svg viewBox="0 0 60 80" aria-hidden="true">
      <path d="M30 4 36 26H24z" fill="#1f6b3a" />
      <path d="M30 18 40 44H20z" fill="#247942" />
      <path d="M30 34 46 66H14z" fill="#1f6b3a" />
      <rect x="26" y="66" width="8" height="12" rx="2" fill="#5a3a22" />
      {/* La neige des branches : trois traits clairs sur le bord bas de
          chaque étage, là où elle tiendrait vraiment. */}
      <path d="M24 26h12l-2 3H26zM20 44h20l-2 3H22zM14 66h32l-2 3H16z"
            fill="rgba(255,255,255,0.82)" />
      <circle cx="30" cy="3" r="3.4" fill="#ffd60a" />
      <circle cx="22" cy="38" r="2" fill="#ff453a" />
      <circle cx="38" cy="52" r="2" fill="#64d2ff" />
      <circle cx="27" cy="58" r="2" fill="#ffd60a" />
    </svg>
  );
}

export default function NoelDecor() {
  return (
    <div className="noel-decor" aria-hidden="true">
      <div className="noel-lueur" />

      {/* La guirlande : un fil qui pend en arc, et les ampoules accrochées
          dessus. Le fil est un trait, pas une image : il doit s'étirer sur
          toute la largeur, du téléphone à l'écran d'ordinateur. */}
      <div className="noel-guirlande">
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 1 Q50 13 100 1" fill="none" stroke="rgba(255,255,255,0.28)"
                strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        </svg>
        {AMPOULES.map((i) => {
          const t = i / (AMPOULES.length - 1);
          return (
            <span
              key={i}
              className="noel-ampoule"
              style={{
                left: `${t * 100}%`,
                // La même parabole que le fil, pour que les ampoules pendent
                // dessus et non à côté.
                top: `${4 * 2.6 * t * (1 - t)}px`,
                color: COULEURS[i % COULEURS.length],
                animationDelay: `${(i % 5) * 0.34}s`,
              }}
            />
          );
        })}
      </div>

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
            }}
          />
        ))}
      </div>

      <div className="noel-sapin noel-sapin-gauche"><Sapin /></div>
      <div className="noel-sapin noel-sapin-droite"><Sapin /></div>
    </div>
  );
}
