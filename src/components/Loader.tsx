import { useState, useEffect } from 'react';

export default function Loader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) return 95;
        const jump = p < 30 ? 8 : p < 60 ? 5 : p < 80 ? 3 : 1;
        return Math.min(95, p + jump);
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loader-screen">
      <svg viewBox="0 0 200 200" width="120" height="120" className="loader-svg">
        {/* Barre de traction */}
        <rect x="30" y="40" width="140" height="6" rx="3" fill="#ff6b35" />
        <rect x="45" y="40" width="5" height="25" rx="2.5" fill="#ff6b35" />
        <rect x="150" y="40" width="5" height="25" rx="2.5" fill="#ff6b35" />

        {/* Bonhomme qui essaye de faire une traction */}
        <g className="loader-person">
          {/* Tête */}
          <circle cx="100" cy="82" r="10" fill="#ff6b35" />
          {/* Corps */}
          <rect x="97" y="92" width="6" height="35" rx="3" fill="#ff6b35" />
          {/* Bras gauche */}
          <line x1="97" y1="100" x2="75" y2="65" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
          {/* Bras droit */}
          <line x1="103" y1="100" x2="125" y2="65" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
          {/* Jambe gauche */}
          <line x1="98" y1="127" x2="85" y2="155" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
          {/* Jambe droite */}
          <line x1="102" y1="127" x2="115" y2="155" stroke="#ff6b35" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
      <div className="loader-bottom">
        <span className="loader-pct">{progress}%</span>
        <div className="loader-bar">
          <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
