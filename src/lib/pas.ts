import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../contexts/AuthContext';
import { dayKey } from './creatine';
import { ENDURANCE_XP_MAX_JOUR } from './passes';

/**
 * Les pas de la journée.
 *
 * Tout le monde a un podomètre dans la poche, mais aucun moyen de le lire
 * depuis une page web : HealthKit n'a pas d'API web, et passer par l'app
 * Raccourcis demanderait à chacun d'installer quelque chose. On saisit donc
 * le chiffre à la main, comme la créatine.
 *
 * Le barème n'est pas inventé : il se déduit de celui qui existe déjà. Courir
 * vaut 48 XP de l'heure, marcher la moitié, soit 24. Une marche normale fait
 * environ 6 000 pas de l'heure. D'où 250 pas pour 1 XP — c'est le tarif de la
 * marche, exprimé en pas au lieu de minutes.
 *
 * Et les pas rapportent de l'XP, jamais des reps : 10 000 pas ne doivent pas
 * venir écraser 300 tractions au classement du mois.
 */

/** Les trois premiers mille pas sont ceux de la vie courante, pas du sport. */
export const PAS_SEUIL = 3000;

/** 250 pas = 1 XP, soit le tarif horaire de la marche converti. */
export const PAS_PAR_XP = 250;

/** Au-delà, c'est une faute de frappe — personne ne fait cent mille pas. */
export const PAS_MAX = 100000;

export function pasXp(pas: number): number {
  return Math.max(0, Math.floor((pas - PAS_SEUIL) / PAS_PAR_XP));
}

/** Les pas qu'il reste à faire avant le prochain XP. */
export function prochainPalier(pas: number): number {
  if (pas < PAS_SEUIL) return PAS_SEUIL - pas;
  return PAS_PAR_XP - ((pas - PAS_SEUIL) % PAS_PAR_XP);
}

interface Jour { date: string; xp: number }

/**
 * Ce que vaut une nouvelle saisie, en tenant compte de ce qui a déjà été payé.
 *
 * Trois choses s'entremêlent ici et aucune ne peut être ignorée :
 *
 * - on peut corriger ses pas dix fois dans la journée, et il ne faut payer
 *   que la différence — sinon saisir 5 000 puis 10 000 rapporterait le prix
 *   de 15 000 ;
 * - le plafond quotidien est partagé avec la course et le vélo, donc une
 *   heure de course déjà comptée réduit d'autant ce que les pas peuvent
 *   rapporter ;
 * - une correction à la baisse doit reprendre l'XP versée en trop, d'où un
 *   delta qui peut être négatif.
 */
export function recalcule(
  pas: number,
  jour: string,
  enduranceJour: Jour | undefined,
  pasJour: Jour | undefined
): { delta: number; endurance: Jour; pas: Jour } {
  const dejaPas = pasJour?.date === jour ? pasJour.xp : 0;
  const dejaTout = enduranceJour?.date === jour ? enduranceJour.xp : 0;
  // Ce qui vient de la course et du vélo, et qui n'est pas à nous.
  const autre = Math.max(0, dejaTout - dejaPas);

  const cible = Math.max(0, Math.min(pasXp(pas), ENDURANCE_XP_MAX_JOUR - autre));
  return {
    delta: cible - dejaPas,
    endurance: { date: jour, xp: autre + cible },
    pas: { date: jour, xp: cible },
  };
}

/** On garde un an de saisies, comme la créatine. */
const GARDE_JOURS = 400;

export function usePas() {
  const { user } = useAuth();
  /*
   * L'uid est gardé avec la donnée plutôt que remis à zéro dans l'effet : un
   * `setJours({})` au début de l'effet provoquerait un rendu de plus à chaque
   * changement de joueur, et surtout afficherait les pas du précédent le
   * temps que l'abonnement se rebranche.
   */
  const [etat, setEtat] = useState<{ uid?: string; jours: Record<string, number> }>({ jours: {} });

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'userProgress', user.uid),
      (snap) => {
        const data = snap.data();
        setEtat({ uid: user.uid, jours: (data?.pasJours as Record<string, number>) || {} });
      },
      (err) => {
        console.error('Pas indisponibles :', err);
        setEtat({ uid: user.uid, jours: {} });
      }
    );
  }, [user]);

  const aJour = etat.uid === user?.uid;
  const jours = aJour ? etat.jours : {};
  const loading = !!user && !aJour;

  const aujourdhui = dayKey();
  const pasDuJour = jours[aujourdhui] || 0;

  const enregistre = useCallback(
    async (valeur: number) => {
      if (!user) return;
      const pas = Math.max(0, Math.min(PAS_MAX, Math.round(valeur)));
      const snap = await import('firebase/firestore').then(({ getDoc }) =>
        getDoc(doc(db, 'userProgress', user.uid))
      );
      const data = snap.data() || {};

      const { delta, endurance, pas: compteur } = recalcule(
        pas,
        aujourdhui,
        data.enduranceXpDay,
        data.pasXpDay
      );

      // On élague les vieilles entrées à l'écriture : sans ça la carte de
      // progression grossirait indéfiniment, un champ par jour.
      const suivants: Record<string, number> = { ...(data.pasJours || {}), [aujourdhui]: pas };
      const gardes = Object.keys(suivants).sort().slice(-GARDE_JOURS);
      const elague = Object.fromEntries(gardes.map((k) => [k, suivants[k]]));

      await setDoc(
        doc(db, 'userProgress', user.uid),
        {
          pasJours: elague,
          pasXpDay: compteur,
          enduranceXpDay: endurance,
          passXp: Math.max(0, ((data.passXp as number) || 0) + delta),
        },
        { merge: true }
      );
    },
    [user, aujourdhui]
  );

  return { pasDuJour, jours, loading, enregistre };
}

/** Total des pas sur un mois donné, au format YYYY-MM. */
export function pasDuMois(jours: Record<string, number> | undefined, mois: string): number {
  if (!jours) return 0;
  return Object.entries(jours)
    .filter(([k]) => k.startsWith(mois))
    .reduce((total, [, v]) => total + (v || 0), 0);
}
