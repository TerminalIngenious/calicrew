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
   Redessinés à la main : ils servent de repère, le visiteur doit reconnaître
   son appareil d'un coup d'œil. */

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

/** Le logo de l'appareil sur lequel on se trouve. */
function LogoAppareil({ size = 26 }: { size?: number }) {
  if (PLATEFORME === 'android') return <LogoAndroid size={size} />;
  if (PLATEFORME === 'windows') return <LogoWindows size={size} />;
  return <LogoApple size={size} />;
}

/*
 * Les cartes de la vitrine sont des copies WebP des originaux : six images de
 * carte pesaient 1,3 Mo sur une page de présentation, dont la moitié des
 * visiteurs repartiront. Même rendu, 146 ko au lieu de 1 080.
 *
 * L'éventail de la section Collection, de la plus commune au centre à la plus
 * rare : c'est la rareté qui monte vers le milieu, pas le hasard. La carte
 * centrale est une historique, la seule rareté qu'on ne croise presque jamais.
 */
const EVENTAIL = [
  '/cards/vitrine/s1-arnold.webp',
  '/cards/vitrine/s1-macron-jetski.webp',
  '/cards/vitrine/s1-washington.webp',
  '/cards/vitrine/s1-obama-mic.webp',
  '/cards/vitrine/s1-zelensky.webp',
];

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

/**
 * Le mode d'emploi, pour les appareils où le navigateur ne propose rien.
 *
 * On ne montre jamais de bouton dans ces cas-là : un bouton « Installer » qui
 * ouvre un mode d'emploi au lieu d'installer est un bouton qui ment.
 */
function instructions(): { titre: string; etapes: string[]; note?: string } {
  if (NAVIGATEUR === 'in-app') {
    return {
      titre: 'Ouvre cette page dans ton navigateur',
      etapes: [
        'Tu es dans le navigateur intégré d\'une autre app — il n\'a pas de menu d\'installation.',
        'Appuie sur les trois points en haut à droite, puis « Ouvrir dans le navigateur ».',
        'Reviens ici : le bouton d\'installation apparaîtra tout seul.',
      ],
    };
  }
  if (PLATEFORME === 'ios') {
    return {
      titre: 'Sur iPhone, trois gestes',
      etapes: [
        'Appuie sur le bouton Partager, en bas de Safari.',
        'Fais défiler et choisis « Sur l\'écran d\'accueil ».',
        'Appuie sur « Ajouter ». CaliCrew rejoint tes apps.',
      ],
      note: 'Apple ne laisse aucune page lancer une installation : il n\'y a pas de bouton à cliquer, mais le résultat est exactement le même qu\'ailleurs — une vraie app sur ton écran d\'accueil, qui marche sans réseau.',
    };
  }
  if (PLATEFORME === 'macos' && NAVIGATEUR === 'safari') {
    return {
      titre: 'Sur Mac, depuis Safari',
      etapes: [
        'Dans la barre de menus, ouvre « Fichier ».',
        'Choisis « Ajouter au Dock ».',
        'CaliCrew s\'ouvre désormais dans sa propre fenêtre.',
      ],
      note: 'Depuis Chrome ou Edge, un bouton d\'installation apparaît directement sur cette page.',
    };
  }
  if (NAVIGATEUR === 'firefox') {
    return {
      titre: 'Firefox n\'installe pas les apps',
      etapes: [
        'Ouvre cette page dans Chrome, Edge ou Safari.',
        'Le bouton d\'installation apparaîtra tout seul.',
      ],
    };
  }
  return {
    titre: `Installer sur ${NOM_PLATEFORME[PLATEFORME]}`,
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
  /*
   * Le navigateur ne propose l'installation que sur l'appareil où l'on se
   * trouve, et seulement quand il l'accepte. Tant que cette invitation n'est
   * pas là, aucun bouton n'est affiché : il n'y a rien derrière.
   */
  const invitePrete = useSyncExternalStore(abonneInstallation, etatInstallation, () => false);
  const installee = useSyncExternalStore(abonneEtat, dejaInstallee, () => false);
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

  const installe = useCallback(() => {
    void lanceInstallation();
  }, []);

  const copieLien = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => setLienCopie(true),
      () => setLienCopie(false)
    );
  }, []);

  const manuel = instructions();

  return (
    <div className="lp" ref={page}>
      <header className="lp-bar">
        <div className="lp-bar-in">
          <span className="lp-logo">
            <img src="/icon.svg" alt="" width={26} height={26} />
            CaliCrew
          </span>
          {/* Vers /login et non vers la racine : la racine, c'est cette page-ci
              tant qu'on n'est pas connecté — on tournerait en rond. Un membre
              déjà connecté, lui, est renvoyé à son tableau de bord. */}
          <Link className="lp-bar-link" to="/login">
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
          {!installee && invitePrete && (
            <button className="lp-btn lp-btn-primaire" onClick={installe}>
              <LogoAppareil size={20} />
              Installer sur {NOM_PLATEFORME[PLATEFORME]}
            </button>
          )}
          <Link
            className={`lp-btn ${!installee && invitePrete ? 'lp-btn-fantome' : 'lp-btn-primaire'}`}
            to="/login"
          >
            {installee ? 'Ouvrir CaliCrew' : invitePrete ? 'Essayer dans le navigateur' : 'Ouvrir CaliCrew'}
          </Link>
        </div>

        <p className="lp-mention">
          {installee
            ? 'Déjà installée sur cet appareil.'
            : invitePrete
              ? 'Installation directe, sans App Store ni Play Store. Gratuit.'
              : 'Gratuit, sans App Store ni Play Store, et ça pèse moins qu\'une photo.'}
        </p>

        {/* Un lien, pas un bouton : sur cet appareil-ci rien ne s'installe au
            clic, et il vaut mieux le dire que faire semblant. */}
        {!installee && !invitePrete && (
          <a className="lp-ancre" href="#telecharger">
            Comment l'installer sur {NOM_PLATEFORME[PLATEFORME]} ↓
          </a>
        )}

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
          <img className="lp-carte" src="/cards/vitrine/s1-arnold.webp" alt="" loading="lazy" />
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
          {EVENTAIL.map((carte) => (
            <img className="lp-fan-card" key={carte} src={carte} alt="" loading="lazy" />
          ))}
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

        {installee ? (
          <div className="lp-etat">
            <p>CaliCrew est déjà installée sur cet appareil.</p>
            <Link className="lp-btn lp-btn-primaire" to="/login">
              Ouvrir l'app
            </Link>
          </div>
        ) : invitePrete ? (
          <div className="lp-store">
            <button className="lp-store-btn" onClick={installe}>
              <LogoAppareil size={26} />
              <span>
                <small>Installer sur</small>
                <strong>{NOM_PLATEFORME[PLATEFORME]}</strong>
              </span>
            </button>
          </div>
        ) : (
          <div className="lp-manuel">
            <h3>{manuel.titre}</h3>
            <ol>
              {manuel.etapes.map((etape, i) => (
                <li key={i}>{etape}</li>
              ))}
            </ol>
            {manuel.note && <p className="lp-manuel-note">{manuel.note}</p>}
            {NAVIGATEUR === 'in-app' && (
              <button className="lp-btn lp-btn-fantome lp-manuel-btn" onClick={copieLien}>
                {lienCopie ? 'Lien copié' : 'Copier le lien'}
              </button>
            )}
          </div>
        )}

        <p className="lp-mention">
          Sur Android, Windows et macOS, elle s'installe en un clic depuis Chrome ou Edge. Sur
          iPhone, Apple impose le menu Partager de Safari.
        </p>
      </section>

      <footer className="lp-pied">
        <span>CaliCrew</span>
        <Link to="/login">Ouvrir l'app</Link>
      </footer>
    </div>
  );
}
