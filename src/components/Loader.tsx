import { evenementEnCours } from '../lib/faceid';

export default function Loader() {
  /*
   * Pendant l'event, c'est son signe qui tourne et pas la barre de traction.
   *
   * La question est posée à l'event lui-même et non aux habillages
   * saisonniers : l'event ne repeint plus l'app, mais il reste le sujet du
   * mois, et le premier écran a le droit de le dire. Le signe est dessiné
   * dans la couleur de l'app, pas dans le vert des cartes — c'est le même
   * produit qui s'ouvre, event ou pas.
   */
  const faceid = evenementEnCours();

  return (
    <div className={`loader-screen ${faceid ? 'faceid' : ''}`}>
      {faceid ? <LogoFaceId /> : <LogoCaliCrew />}
      <div className="loader-bottom">
        <div className="loader-bar">
          <div className="loader-bar-fill loader-bar-indeterminate" />
        </div>
      </div>
    </div>
  );
}

/** La barre de traction : le logo de tous les jours. */
function LogoCaliCrew() {
  return (
    <svg viewBox="0 0 200 200" width="120" height="120" className="loader-svg">
      <rect x="30" y="40" width="140" height="6" rx="3" fill="#ff6b35" />
      <rect x="45" y="40" width="5" height="25" rx="2.5" fill="#ff6b35" />
      <rect x="150" y="40" width="5" height="25" rx="2.5" fill="#ff6b35" />
      <g className="loader-person">
        <circle cx="100" cy="82" r="10" fill="#ff6b35" />
        <rect x="97" y="92" width="6" height="35" rx="3" fill="#ff6b35" />
        <line x1="97" y1="100" x2="75" y2="65" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
        <line x1="103" y1="100" x2="125" y2="65" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
        <line x1="98" y1="127" x2="85" y2="155" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
        <line x1="102" y1="127" x2="115" y2="155" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Le visage pris dans les crochets de visée, scanné en boucle.
 *
 * Le même dessin que le badge, le sachet et les angles des cartes. La ligne
 * qui le traverse descend sans fin : c'est un scan qui n'aboutit pas, ce qui
 * est exactement ce que fait un écran de chargement.
 */
function LogoFaceId() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" className="loader-svg loader-faceid">
      <g className="loader-fid-crochets" stroke="var(--accent)" strokeWidth={8} strokeLinecap="round" fill="none">
        <path d="M8 36V16a8 8 0 018-8h20M84 8h20a8 8 0 018 8v20M112 84v20a8 8 0 01-8 8H84M36 112H16a8 8 0 01-8-8V84" />
      </g>
      <g fill="var(--accent)">
        <circle cx="60" cy="51" r="15" />
        <path d="M33 100c0-15 12-24 27-24s27 9 27 24z" />
      </g>
      <rect className="loader-fid-scan" x="8" y="0" width="104" height="3" rx="1.5" fill="var(--accent-light)" />
    </svg>
  );
}
