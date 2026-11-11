import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

const CLE = 'calicrew-dernier-rechargement';
/** Une tentative par demi-minute : de quoi se rattraper sans boucler. */
const REPIT = 30_000;

interface Etat {
  echec: boolean;
}

/**
 * Le filet des pages chargées à la demande.
 *
 * Chaque page est un fichier à part, portant une empreinte dans son nom. Après
 * un déploiement, un navigateur qui a gardé l'ancienne page en mémoire réclame
 * une empreinte qui n'existe plus : l'import échoue, et le `Suspense` qui
 * l'attendait reste sur son écran de chargement. Pour toujours. C'est le
 * chargement sans fin qu'on voyait en changeant de page après une mise en
 * ligne.
 *
 * Sans limite d'erreur, React n'a aucun moyen de savoir que l'attente est
 * vaine. Avec celle-ci, on recharge la page une fois — ce qui suffit à
 * récupérer la nouvelle version — et si cela ne suffit pas, on le dit au lieu
 * de faire tourner un rond indéfiniment.
 */
export default class LimiteChargement extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { echec: false };

  static getDerivedStateFromError(): Etat {
    return { echec: true };
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    console.error('Page impossible à charger :', erreur, info.componentStack);
    let dernier = 0;
    try {
      dernier = Number(sessionStorage.getItem(CLE)) || 0;
    } catch {
      // Navigation privée ou stockage refusé : on se contente du message.
    }
    if (Date.now() - dernier < REPIT) return;
    try {
      sessionStorage.setItem(CLE, String(Date.now()));
    } catch {
      // Sans mémoire du dernier essai, un seul rechargement vaut mieux qu'aucun.
    }
    window.location.reload();
  }

  render() {
    if (!this.state.echec) return this.props.children;
    return (
      <div className="page chargement-echec">
        <h2>Page indisponible</h2>
        <p>
          Elle n'a pas pu être chargée. C'est souvent une mise à jour en cours :
          réessaie dans un instant.
        </p>
        <button className="primary-btn" onClick={() => window.location.reload()}>
          Recharger
        </button>
      </div>
    );
  }
}
