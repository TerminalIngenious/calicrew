import PinkRibbon from './PinkRibbon';
import Pumpkin from './Pumpkin';
import { getSeasonalTheme } from '../lib/seasonalTheme';

/**
 * Badge d'habillage posé dans l'en-tête des pages principales. Il suit la date
 * et disparaît seul : rien à retirer ni à remettre à la main.
 *
 * Un cas par habillage, et pas un « sinon » : le jour où FaceID est arrivé,
 * il est tombé dans celui d'Halloween et a affiché une citrouille pendant
 * tout novembre. L'event, lui, n'a pas de badge ici — il a déjà sa dalle en
 * relief dans la page du pass, et son fichier dans le profil.
 */
export default function SeasonalBadge({ compact = false }: { compact?: boolean }) {
  const theme = getSeasonalTheme();
  if (theme !== 'pink' && theme !== 'halloween') return null;

  const size = compact ? 16 : 18;
  const label = theme === 'pink' ? 'Octobre Rose' : 'Halloween';

  return (
    <span className={`seasonal-badge seasonal-${theme} ${compact ? 'compact' : ''}`} title={label}>
      {theme === 'pink' ? <PinkRibbon size={size} /> : <Pumpkin size={size} />}
      {!compact && <span className="seasonal-badge-label">{label}</span>}
    </span>
  );
}
