import PinkRibbon from './PinkRibbon';

/** Octobre, mois de sensibilisation au cancer du sein. */
export function isPinkOctober(date = new Date()): boolean {
  return date.getMonth() === 9;
}

/**
 * Badge discret posé dans l'en-tête des pages principales pendant tout
 * octobre. Il disparaît seul le 1er novembre : rien à retirer à la main.
 */
export default function PinkOctoberBadge({ compact = false }: { compact?: boolean }) {
  if (!isPinkOctober()) return null;

  return (
    <span className={`pink-october ${compact ? 'compact' : ''}`} title="Octobre Rose">
      <PinkRibbon size={compact ? 16 : 18} />
      {!compact && <span className="pink-october-label">Octobre Rose</span>}
    </span>
  );
}
