const RADIALS = 5;
const RINGS = [26, 46, 66, 86, 106];
const REACH = 120;

/** Quart de toile ancré dans un coin, rayons + fils concentriques. */
function CornerWeb() {
  const angles = Array.from({ length: RADIALS }, (_, i) => (i * 90) / (RADIALS - 1));

  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={1.1} aria-hidden="true">
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={deg} x1="0" y1="0" x2={Math.cos(rad) * REACH} y2={Math.sin(rad) * REACH} />
        );
      })}
      {RINGS.map((r) => (
        <path key={r} d={`M ${r} 0 A ${r} ${r} 0 0 1 0 ${r}`} />
      ))}
    </svg>
  );
}

/**
 * Décor d'Halloween : deux toiles dans les coins hauts et une araignée
 * suspendue. Purement ornemental, donc en `position: fixed` derrière le
 * contenu et insensible aux clics.
 */
export default function HalloweenDecor() {
  return (
    <div className="halloween-decor" aria-hidden="true">
      <div className="halloween-web halloween-web-left">
        <CornerWeb />
      </div>
      <div className="halloween-web halloween-web-right">
        <CornerWeb />
      </div>

      <div className="halloween-spider">
        <svg viewBox="0 0 24 40" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
          <line x1="12" y1="0" x2="12" y2="18" />
          <circle cx="12" cy="24" r="5.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18.5" r="2.6" fill="currentColor" stroke="none" />
          <path d="M7 21 2 17M7 24 1.5 24M7 27 2.5 31" />
          <path d="M17 21 22 17M17 24 22.5 24M17 27 21.5 31" />
        </svg>
      </div>
    </div>
  );
}
