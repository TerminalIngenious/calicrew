import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProgress } from '../types';

/**
 * La progression d'un joueur, servie d'abord par le cache local.
 *
 * Les pages lisaient ce document avec `getDoc`, qui attend le serveur avant de
 * rendre la main. D'où un chargement imprévisible : instantané avec une bonne
 * connexion, interminable dès que le réseau hésite. Et s'il échouait, plus rien
 * ne remettait `loading` à faux — l'écran de chargement tournait indéfiniment.
 *
 * `onSnapshot` livre immédiatement ce que contient le cache persistant, puis la
 * version du serveur dès qu'elle arrive. La page s'affiche donc tout de suite
 * aux lancements suivants, se met à jour toute seule, et une panne réseau passe
 * par le gestionnaire d'erreur au lieu de tout figer.
 */
export function useUserProgress(uid: string | undefined) {
  /**
   * L'uid est gardé dans l'état avec la donnée : il dit à quel joueur
   * appartient ce qu'on tient. Sans lui, en changeant de profil, on afficherait
   * la progression du précédent en la croyant chargée.
   */
  const [state, setState] = useState<{
    uid?: string;
    progress: UserProgress | null;
    failed: boolean;
  }>({ progress: null, failed: false });

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'userProgress', uid),
      (snap) => {
        setState({ uid, progress: snap.exists() ? (snap.data() as UserProgress) : null, failed: false });
      },
      (err) => {
        console.error('Progression indisponible :', err);
        setState({ uid, progress: null, failed: true });
      }
    );
  }, [uid]);

  // Tant que l'état ne porte pas l'uid demandé, c'est qu'on attend encore. On
  // le déduit plutôt que de le stocker : un `setLoading(true)` dans l'effet
  // provoquerait un rendu de plus à chaque changement de joueur.
  return {
    progress: state.uid === uid ? state.progress : null,
    loading: !!uid && state.uid !== uid,
    failed: state.uid === uid && state.failed,
  };
}
