/**
 * L'écran de chargement.
 *
 * Un seul logo toute l'année, celui de l'app, dessiné dans la couleur
 * d'accent : il devient vert tout seul pendant l'event, sans qu'un deuxième
 * dessin ait à exister. C'est aussi ce qui évite qu'une marque change pendant
 * trois semaines puis revienne — l'app reste la même, elle change de couleur.
 */
export default function Loader() {
  return (
    <div className="loader-screen">
      <svg viewBox="0 0 200 200" width="120" height="120" className="loader-svg" aria-hidden="true">
        {/* La barre et ses montants : le décor, immobile. */}
        <g fill="currentColor">
          <rect x="30" y="40" width="140" height="6" rx="3" />
          <rect x="45" y="40" width="5" height="25" rx="2.5" />
          <rect x="150" y="40" width="5" height="25" rx="2.5" />
        </g>
        <g className="loader-person" stroke="currentColor" fill="currentColor">
          <circle cx="100" cy="82" r="10" stroke="none" />
          <rect x="97" y="92" width="6" height="35" rx="3" stroke="none" />
          <g strokeWidth="5" strokeLinecap="round" fill="none">
            <line x1="97" y1="100" x2="75" y2="65" />
            <line x1="103" y1="100" x2="125" y2="65" />
            <line x1="98" y1="127" x2="85" y2="155" />
            <line x1="102" y1="127" x2="115" y2="155" />
          </g>
        </g>
      </svg>

      <div className="loader-bottom">
        <div className="loader-bar">
          <div className="loader-bar-fill loader-bar-indeterminate" />
        </div>
      </div>
    </div>
  );
}
