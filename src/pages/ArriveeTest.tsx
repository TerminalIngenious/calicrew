import { useState } from 'react';
import ArriveeIntergalactique from '../components/ArriveeIntergalactique';

/**
 * L'animation d'arrivée, rejouable à volonté.
 *
 * Réservée au créateur par sa route : l'arrivée ne se joue qu'une fois par
 * personne, et il faut bien pouvoir la revoir pour la régler. Elle n'écrit
 * rien — la vraie, elle, note qu'elle a été vue.
 */
export default function ArriveeTest() {
  const [n, setN] = useState(0);
  return <ArriveeIntergalactique key={n} onFini={() => setN((x) => x + 1)} />;
}
