import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { fenetreOuverte } from '../lib/intergalactique';
import ArriveeIntergalactique from './ArriveeIntergalactique';

/**
 * Décide si l'arrivée de la carte doit se jouer, et la retient une fois vue.
 *
 * Séparée de l'animation elle-même : celle-ci ne sait rien de Firestore ni
 * de qui regarde, et se teste donc en l'appelant seule.
 */
export default function PorteIntergalactique() {
  const { user } = useAuth();
  const { progress } = useUserProgress(user?.uid);
  /* Masqué dès la fin, sans attendre l'écriture : un aller-retour réseau
     laisserait l'écran en place quelques secondes de trop. */
  const [fini, setFini] = useState(false);

  if (!user || fini) return null;
  if (!fenetreOuverte()) return null;
  // Tant que la progression n'est pas arrivée, on ne montre rien : la jouer
  // puis découvrir qu'elle était déjà vue serait pire que d'attendre.
  if (!progress || progress.vuIntergalactique) return null;

  async function vue() {
    setFini(true);
    if (!user) return;
    try {
      await setDoc(doc(db, 'userProgress', user.uid), { vuIntergalactique: true }, { merge: true });
    } catch (err) {
      console.error('Impossible de noter l’arrivée comme vue :', err);
    }
  }

  return <ArriveeIntergalactique onFini={vue} />;
}
