import PinkRibbon from './PinkRibbon';

/** Rubans flottants : position en %, taille, délai et durée. */
const FLOATERS = [
  { left: 8, size: 22, delay: 0, duration: 19 },
  { left: 26, size: 14, delay: 6, duration: 23 },
  { left: 47, size: 18, delay: 2.5, duration: 17 },
  { left: 68, size: 13, delay: 9, duration: 25 },
  { left: 86, size: 20, delay: 4, duration: 21 },
];

/**
 * Habillage Octobre Rose. Le ton est volontairement sobre — la cause est
 * sérieuse : une lueur rose en haut d'écran et quelques rubans qui montent
 * lentement, sans animation appuyée.
 */
export default function PinkDecor() {
  return (
    <div className="pink-decor" aria-hidden="true">
      <div className="pink-decor-glow" />
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="pink-floater"
          style={{
            left: `${f.left}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        >
          <PinkRibbon size={f.size} />
        </span>
      ))}
    </div>
  );
}
