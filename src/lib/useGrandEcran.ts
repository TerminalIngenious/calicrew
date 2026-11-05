import { useSyncExternalStore } from 'react';

/**
 * Vrai au-delà de 1280 px, le seuil à partir duquel le chat du groupe tient
 * sa propre colonne.
 *
 * Presque tout le format ordinateur tient dans la feuille de style, et c'est
 * tant mieux : aucun écran n'a à savoir sur quoi il s'affiche. Mais le chat du
 * groupe est une fenêtre modale sur téléphone et une colonne permanente sur
 * ordinateur, et il écoute Firestore en continu : le rendre deux fois pour en
 * cacher un en CSS ouvrirait deux abonnements et doublerait les lectures.
 * Il faut donc choisir en JavaScript lequel des deux monter.
 *
 * Le seuil est plus haut que les 1024 px du reste du format ordinateur : en
 * dessous de 1280 px, la colonne de chat ne laissait au classement qu'une
 * largeur de tablette.
 */
const requete = '(min-width: 1280px)';

function abonne(rappel: () => void): () => void {
  const mq = window.matchMedia(requete);
  mq.addEventListener('change', rappel);
  return () => mq.removeEventListener('change', rappel);
}

export function useGrandEcran(): boolean {
  return useSyncExternalStore(
    abonne,
    () => window.matchMedia(requete).matches,
    // Pas de rendu serveur ici, mais useSyncExternalStore exige la valeur.
    () => false
  );
}
