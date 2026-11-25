import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Un bandeau qui reste en haut de l'écran quand on descend, en version
 * condensée.
 *
 * Sur les deux pages à échelle — le pass et les niveaux de profil — on
 * descend sur plusieurs milliers de pixels, et le bandeau disparaissait au
 * bout de quelques paliers : pour revoir son niveau il fallait remonter tout
 * en haut.
 *
 * Le coller tel quel n'était pas la réponse : à 160 px de haut, il aurait
 * mangé un cinquième de l'écran en permanence. Il se replie donc — le titre,
 * la saison et l'explication s'en vont, le niveau et sa barre restent. C'est
 * exactement ce qu'on vient vérifier en défilant.
 *
 * ── Une sentinelle, et non un écouteur de défilement ──
 *
 * Un `scroll` se déclenche des dizaines de fois par seconde et obligerait à
 * mesurer la position du bandeau à chaque fois, c'est-à-dire à provoquer un
 * recalcul de mise en page pendant que la page défile. La sentinelle est un
 * bloc d'un pixel posé au-dessus du bandeau : le navigateur prévient tout
 * seul quand elle sort de l'écran, et seulement à ce moment-là.
 *
 * ── Une ref de rappel, et non un effet au montage ──
 *
 * C'est la même leçon que l'observateur du bloc de pause, dans la séance en
 * cours. Ces deux pages affichent un chargement avant leur contenu : au
 * premier rendu, la sentinelle n'existe pas. Un effet à dépendances vides
 * s'exécute une fois, ne trouve rien, et ne revient jamais — le bandeau ne
 * se repliait donc jamais sur le pass, dont la progression arrive du réseau.
 * Une ref de rappel est appelée au moment où le nœud apparaît, quel que soit
 * le rendu où ça arrive.
 */
export function useBandeauCollant(): [(noeud: HTMLDivElement | null) => void, boolean] {
  const [replie, setReplie] = useState(false);
  const observateur = useRef<IntersectionObserver | null>(null);

  const sentinelle = useCallback((noeud: HTMLDivElement | null) => {
    observateur.current?.disconnect();
    if (!noeud) return;
    observateur.current = new IntersectionObserver(
      ([e]) => setReplie(!e.isIntersecting),
      { threshold: 0 }
    );
    observateur.current.observe(noeud);
  }, []);

  // Le démontage de la page, lui, passe bien par un effet.
  useEffect(() => () => observateur.current?.disconnect(), []);

  return [sentinelle, replie];
}
