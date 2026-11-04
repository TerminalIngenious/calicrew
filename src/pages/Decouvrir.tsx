import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import {
  PLATEFORME,
  NAVIGATEUR,
  estInstallee,
  installationFaite,
  abonneInstallation,
  etatInstallation,
  lanceInstallation,
} from '../lib/install';
import type { Plateforme } from '../lib/install';
import './Decouvrir.css';

/* ── Logos des plateformes ──
   Redessinés à la main : ce sont des repères, le visiteur doit reconnaître son
   appareil d'un coup d'œil sans qu'on ait à écrire le mode d'emploi. */

function LogoAndroid({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 3.2 5.5 1.4a.42.42 0 0 1 .14-.58.42.42 0 0 1 .58.14l1.12 1.82A7.9 7.9 0 0 1 12 2.1c1 0 1.94.2 2.8.56L15.92.84a.42.42 0 0 1 .58-.14c.2.12.26.38.14.58L15.5 3.2A6.4 6.4 0 0 1 18.6 8.5H5.4a6.4 6.4 0 0 1 3.2-5.3Zm2.3 2.05a.72.72 0 1 0 0-1.45.72.72 0 0 0 0 1.45Zm6.2 0a.72.72 0 1 0 0-1.45.72.72 0 0 0 0 1.45Z" />
      <rect x="5.4" y="9.6" width="13.2" height="9.4" rx="1.5" />
      <rect x="1.6" y="9.4" width="2.7" height="7.4" rx="1.35" />
      <rect x="19.7" y="9.4" width="2.7" height="7.4" rx="1.35" />
      <rect x="7.3" y="18.4" width="2.7" height="5.2" rx="1.35" />
      <rect x="14" y="18.4" width="2.7" height="5.2" rx="1.35" />
    </svg>
  );
}

function LogoWindows({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2.6" y="2.6" width="8.6" height="8.6" rx="0.6" />
      <rect x="12.8" y="2.6" width="8.6" height="8.6" rx="0.6" />
      <rect x="2.6" y="12.8" width="8.6" height="8.6" rx="0.6" />
      <rect x="12.8" y="12.8" width="8.6" height="8.6" rx="0.6" />
    </svg>
  );
}

function LogoApple({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85-.72 0-1.86-.83-3.06-.81-1.57.02-3.02.91-3.83 2.32-1.63 2.83-.42 7.02 1.17 9.32.78 1.12 1.7 2.38 2.91 2.34 1.17-.05 1.61-.76 3.03-.76 1.41 0 1.82.76 3.06.73 1.26-.02 2.06-1.14 2.83-2.27.89-1.3 1.26-2.56 1.28-2.62-.03-.01-2.46-.94-2.49-3.75ZM14.3 5.6c.64-.78 1.07-1.86.95-2.94-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.84 1.03.08 2.08-.52 2.71-1.28Z" />
    </svg>
  );
}

/* ── État de l'installation ── */

function abonneEtat(cb: () => void): () => void {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  const off = abonneInstallation(cb);
  return () => {
    mq.removeEventListener('change', cb);
    off();
  };
}

function dejaInstallee(): boolean {
  return estInstallee() || installationFaite();
}

const NOM_PLATEFORME: Record<Plateforme, string> = {
  android: 'Android',
  ios: 'iPhone',
  windows: 'Windows',
  macos: 'Mac',
  autre: 'cet appareil',
};

/** Les instructions à afficher quand le navigateur ne propose rien lui-même. */
function instructions(plateforme: Plateforme): { titre: string; etapes: string[]; note?: string } {
  if (NAVIGATEUR === 'in-app') {
    return {
      titre: 'Ouvre ce lien dans ton navigateur',
      etapes: [
        'Tu es dans le navigateur intégré d\'une autre app — il n\'a pas de menu d\'installation.',
        'Appuie sur les trois points en haut à droite, puis « Ouvrir dans le navigateur ».',
        'Reviens ici et reprends l\'installation.',
      ],
      note: 'Ou copie le lien et colle-le dans Safari ou Chrome.',
    };
  }
  if (plateforme === 'ios') {
    return {
      titre: 'Installer sur iPhone',
      etapes: [
        'Appuie sur le bouton Partager, en bas de Safari.',
        'Fais défiler et choisis « Sur l\'écran d\'accueil ».',
        'Appuie sur « Ajouter ». CaliCrew rejoint tes apps.',
      ],
      note: 'Apple ne permet pas de lancer l\'installation depuis la page : ces trois gestes sont le seul chemin, et le résultat est exactement le même.',
    };
  }
  if (plateforme === 'macos' && NAVIGATEUR === 'safari') {
    return {
      titre: 'Installer sur Mac',
      etapes: [
        'Dans la barre de menus, ouvre « Fichier ».',
        'Choisis « Ajouter au Dock ».',
        'CaliCrew s\'ouvre désormais dans sa propre fenêtre.',
      ],
    };
  }
  if (NAVIGATEUR === 'firefox') {
    return {
      titre: 'Firefox n\'installe pas les apps',
      etapes: [
        'Ouvre cette page dans Chrome, Edge ou Safari.',
        'Le bouton d\'installation s\'activera tout seul.',
      ],
    };
  }
  return {
    titre: `Installer sur ${NOM_PLATEFORME[plateforme]}`,
    etapes: [
      'Ouvre le menu de ton navigateur (les trois points, en haut à droite).',
      'Choisis « Installer CaliCrew » ou « Ajouter à l\'écran d\'accueil ».',
      'Confirme : l\'app est posée sur ton appareil.',
    ],
    note: 'Sur ordinateur, une icône d\'installation apparaît aussi au bout de la barre d\'adresse.',
  };
}

/* ── Page ── */

export default function Decouvrir() {
  const invitePrete = useSyncExternalStore(abonneInstallation, etatInstallation, () => false);
  const installee = useSyncExternalStore(abonneEtat, dejaInstallee, () => false);
  const [fiche, setFiche] = useState<Plateforme | null>(null);
  const [lienCopie, setLienCopie] = useState(false);
  const page = useRef<HTMLDivElement>(null);

  /** Les sections montent à l'écran en arrivant dans le champ de vision. */
  useEffect(() => {
    const cibles = page.current?.querySelectorAll('.lp-reveal');
    if (!cibles?.length) return;
    // Sans IntersectionObserver, tout reste simplement visible.
    if (!('IntersectionObserver' in window)) {
      cibles.forEach((el) => el.classList.add('vu'));
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            e.target.classList.add('vu');
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    cibles.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const installe = useCallback(async (plateforme: Plateforme) => {
    // L'invitation du navigateur ne vaut que pour l'appareil utilisé : un
    // visiteur sur Windows qui clique « Android » ne peut qu'être renseigné.
    if (plateforme === PLATEFORME && (await lanceInstallation())) return;
    setFiche(plateforme);
    setLienCopie(false);
  }, []);

  const copieLien = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => setLienCopie(true),
      () => setLienCopie(false)
    );
  }, []);

  const fichier = fiche ? instructions(fiche) : null;

  return (
    <div className="lp" ref={page}>
      <header className="lp-bar">
        <div className="lp-bar-in">
          <span className="lp-logo">
            <img src="/icon.svg" alt="" width={26} height={26} />
            CaliCrew
          </span>
          <Link className="lp-bar-link" to="/">
            Ouvrir l'app
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden="true" />
        <h1 className="lp-h1">
          Ta salle,
          <br />
          c'est dehors.
        </h1>
        <p className="lp-sub">
          Note tes séances, suis ta progression, collectionne les cartes et vise la première
          place du classement. Entre potes.
        </p>

        <div className="lp-cta">
          {installee ? (
            <Link className="lp-btn lp-btn-primaire" to="/">
              Ouvrir CaliCrew
            </Link>
          ) : (
            <button className="lp-btn lp-btn-primaire" onClick={() => installe(PLATEFORME)}>
              {PLATEFORME === 'ios' || PLATEFORME === 'macos' ? (
                <LogoApple size={20} />
              ) : PLATEFORME === 'windows' ? (
                <LogoWindows size={20} />
              ) : (
                <LogoAndroid size={20} />
              )}
              Installer sur {NOM_PLATEFORME[PLATEFORME]}
            </button>
          )}
          <Link className="lp-btn lp-btn-fantome" to="/">
            Essayer dans le navigateur
          </Link>
        </div>

        <p className="lp-mention">
          {invitePrete
            ? 'Installation directe, sans App Store ni Play Store. Gratuit.'
            : 'Sans App Store ni Play Store. Gratuit, et ça pèse moins qu\'une photo.'}
        </p>

        <div className="lp-scene" aria-hidden="true">
          <div className="lp-phone">
            <div className="lp-screen">
              <div className="lp-screen-head">
                <span>Salut Mattéo</span>
              </div>
              <div className="lp-tiles">
                <div className="lp-tile">
                  <b>4</b>
                  <span>Séances</span>
                </div>
                <div className="lp-tile">
                  <b>382</b>
                  <span>Reps</span>
                </div>
              </div>
              <div className="lp-row">
                <span>Tractions</span>
                <i>+12 %</i>
              </div>
              <div className="lp-row">
                <span>Dips</span>
                <i>+8 %</i>
              </div>
              <div className="lp-bar-graph">
                {[40, 65, 52, 80, 72, 96, 88].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <img className="lp-carte" src="/cards/s1-arnold.png" alt="" loading="lazy" />
        </div>
      </section>

      <section className="lp-section lp-reveal">
        <p className="lp-kicker">Chaque série compte</p>
        <h2 className="lp-h2">
          Tu notes. Elle compte,
          <br />
          classe, compare.
        </h2>
        <p className="lp-texte">
          Séries, répétitions, temps sous tension, records personnels. CaliCrew garde tout, même
          sans réseau, et te dit exactement où tu progresses — et où tu stagnes.
        </p>
      </section>

      <section className="lp-section lp-reveal">
        <p className="lp-kicker">Collection</p>
        <h2 className="lp-h2">Une carte à chaque palier.</h2>
        <p className="lp-texte">
          Des saisons, des familles, des raretés. Les cartes se gagnent à la sueur, s'échangent
          entre membres du crew, et tournent entre tes doigts.
        </p>
        <div className="lp-fan" aria-hidden="true">
          <span className="lp-fan-card" />
          <span className="lp-fan-card" />
          <img className="lp-fan-card lp-fan-vraie" src="/cards/s1-arnold.png" alt="" loading="lazy" />
          <span className="lp-fan-card" />
          <span className="lp-fan-card" />
        </div>
      </section>

      <section className="lp-section lp-reveal">
        <p className="lp-kicker">Le crew</p>
        <h2 className="lp-h2">
          Seul on tient.
          <br />
          À plusieurs on revient.
        </h2>
        <p className="lp-texte">
          Un groupe, un classement, des défis et un fil de discussion. La notification du soir
          n'est pas un rappel : c'est une provocation.
        </p>
      </section>

      <section className="lp-telecharger lp-reveal" id="telecharger">
        <h2 className="lp-h2">Installe-la.</h2>
        <p className="lp-texte">
          CaliCrew s'installe depuis cette page, directement sur ton appareil. Pas de store, pas
          de compte développeur, pas de mise à jour à télécharger : elle se tient à jour toute
          seule.
        </p>

        <div className="lp-store">
          <button className="lp-store-btn" onClick={() => installe('android')}>
            <LogoAndroid size={26} />
            <span>
              <small>Installer sur</small>
              <strong>Android</strong>
            </span>
          </button>
          <button className="lp-store-btn" onClick={() => installe('ios')}>
            <LogoApple size={26} />
            <span>
              <small>Ajouter sur</small>
              <strong>iPhone</strong>
            </span>
          </button>
          <button className="lp-store-btn" onClick={() => installe('windows')}>
            <LogoWindows size={24} />
            <span>
              <small>Installer sur</small>
              <strong>Windows</strong>
            </span>
          </button>
          <button className="lp-store-btn" onClick={() => installe('macos')}>
            <LogoApple size={26} />
            <span>
              <small>Installer sur</small>
              <strong>macOS</strong>
            </span>
          </button>
        </div>

        <p className="lp-mention">
          Android, Windows et macOS installent l'app en un clic depuis Chrome ou Edge. Sur
          iPhone, Apple demande de passer par le menu Partager de Safari — trois gestes, on te
          les montre.
        </p>
      </section>

      <footer className="lp-pied">
        <span>CaliCrew</span>
        <Link to="/">Ouvrir l'app</Link>
      </footer>

      {fichier && (
        <div className="lp-voile" onClick={() => setFiche(null)}>
          <div className="lp-fiche" onClick={(e) => e.stopPropagation()}>
            <h3>{fichier.titre}</h3>
            <ol>
              {fichier.etapes.map((etape, i) => (
                <li key={i}>{etape}</li>
              ))}
            </ol>
            {fichier.note && <p className="lp-fiche-note">{fichier.note}</p>}
            <div className="lp-fiche-actions">
              {NAVIGATEUR === 'in-app' && (
                <button className="lp-btn lp-btn-fantome" onClick={copieLien}>
                  {lienCopie ? 'Lien copié' : 'Copier le lien'}
                </button>
              )}
              <button className="lp-btn lp-btn-primaire" onClick={() => setFiche(null)}>
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
