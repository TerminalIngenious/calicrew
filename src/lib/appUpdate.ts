/**
 * Mise à jour de l'app sans avoir à la fermer.
 *
 * Installée sur l'écran d'accueil, CaliCrew n'est presque jamais quittée : on
 * la met en arrière-plan, on y revient. Or un service worker ne cherche une
 * nouvelle version qu'au chargement de la page. Une app restée ouverte une
 * semaine continuait donc de servir la version d'il y a une semaine, et le seul
 * moyen de récupérer un correctif était de la fermer puis de la rouvrir.
 *
 * On cherche désormais une nouvelle version au retour au premier plan et toutes
 * les demi-heures. Quand elle est prête, le nouveau service worker prend la
 * main — `skipWaiting` dans sw.ts — et la page se recharge toute seule.
 */

/** Les écrans où un rechargement ferait perdre quelque chose. */
function travailEnCours(): boolean {
  const p = window.location.pathname;
  return p.startsWith('/session/');
}

export function watchForUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  // Au tout premier chargement il n'y a pas encore de contrôleur : sa prise de
  // fonction n'est pas une mise à jour, et recharger là n'aurait aucun sens.
  const premiereInstallation = !navigator.serviceWorker.controller;
  let rechargementEnAttente = false;
  let rechargement = false;

  const recharge = () => {
    if (rechargement) return;
    // En pleine séance, on patiente : on rechargera au prochain retour sur
    // l'app, une fois sorti de l'écran de suivi.
    if (travailEnCours()) {
      rechargementEnAttente = true;
      return;
    }
    rechargement = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (premiereInstallation) return;
    recharge();
  });

  const cherche = () => {
    if (rechargementEnAttente) {
      recharge();
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {
        // Hors ligne ou mise à jour refusée : on retentera au prochain retour.
      });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cherche();
  });
  window.addEventListener('focus', cherche);
  window.setInterval(cherche, 30 * 60 * 1000);

  /*
   * Et une fois au démarrage.
   *
   * Tous les déclencheurs ci-dessus supposent qu'on quitte l'app et qu'on y
   * revient. Au lancement à froid, la page est déjà visible et a déjà le
   * focus : aucun ne se déclenche, et on dépendait entièrement du script
   * d'enregistrement posé dans la page. Une vérification de plus ne coûte
   * rien et rend le rattrapage certain.
   */
  cherche();
}
