import PisteNiveaux from './PisteNiveaux';
import type { Palier } from './PisteNiveaux';
import type { PassLevel } from '../types';

/**
 * La piste des cent niveaux du pass.
 *
 * Ce n'est plus qu'une traduction : l'échelle elle-même vit dans
 * PisteNiveaux, partagée avec les niveaux de profil. Ici on dit seulement ce
 * qu'est un palier de pass — un niveau, un coffre, toujours.
 */
export default function PassTrack({
  levels,
  currentLevel,
  seasonId,
}: {
  levels: PassLevel[];
  /** Le dernier niveau atteint. Le palier juste au-dessus est le prochain. */
  currentLevel: number;
  seasonId: string;
}) {
  const paliers: Palier[] = levels.map((lvl) => ({
    niveau: lvl.level,
    // Tout palier du pass donne un coffre ; sans rareté garantie, il est
    // commun. C'est cette règle-là qui ne vaut que pour le pass.
    coffre: lvl.freeChest || 'commune',
  }));

  return (
    <PisteNiveaux
      paliers={paliers}
      niveauActuel={currentLevel}
      total={levels.length}
      seasonId={seasonId}
    />
  );
}
