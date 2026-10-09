import { useEffect } from 'react';

/**
 * Empêche la page de défiler tant qu'une modale est ouverte.
 *
 * Sur iOS, `overflow: hidden` sur le body ne suffit pas toujours : Safari
 * continue de faire défiler le document sous la modale. On fige donc le body
 * en `position: fixed` à sa position courante, qu'on restaure à la fermeture —
 * sinon on reviendrait en haut de page à chaque fermeture.
 *
 * Plusieurs modales peuvent être ouvertes en même temps (une modale qui en
 * ouvre une autre) : un compteur évite que la première à se fermer ne
 * déverrouille pour tout le monde.
 */
let locks = 0;
let savedY = 0;

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (locks === 0) {
      savedY = window.scrollY;
      const { body } = document;
      body.style.position = 'fixed';
      body.style.top = `-${savedY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.overflow = 'hidden';
    }
    locks++;

    return () => {
      locks--;
      if (locks > 0) return;
      const { body } = document;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, savedY);
    };
  }, [active]);
}
