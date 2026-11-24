import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ArrowLeft, Check, Gift, Lock, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { useUserSessions } from '../contexts/SessionsContext';
import { questValue } from '../lib/quests';
import Loader from '../components/Loader';
import BottomNav from '../components/BottomNav';
import AventCardArt from '../components/cardArt/AventCardArt';
import Booster from '../components/Booster';
import RankBadgeIcon from '../components/RankBadgeIcon';
import {
  BADGE_ID, CARTES, CASES, DEBUT, SEMAINES, TOTAL_CARTES,
  badgeAvent, calendrierDe, carteParSlug, collectionComplete, enCours, jourOuvert,
  lis, nbPossedees, quetesDeSemaine, semaineCourante, tireBooster, tireBoosterDore,
} from '../lib/avent';
import { estAdmin } from '../lib/admin';
import type { CarteAvent } from '../lib/avent';
import type { Quest } from '../types';
import './Avent.css';

const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

/** Ce que raconte l'en-tête selon le moment du mois. */
function texteRestant(ouvert: boolean, maintenant: number): string {
  if (!ouvert) return maintenant < DEBUT ? 'Ouverture le 1er décembre' : 'Calendrier terminé';
  const reste = CASES - jourOuvert(maintenant);
  if (reste <= 0) return 'Dernière case — joyeux Noël';
  return `Encore ${reste} case${reste > 1 ? 's' : ''} avant Noël`;
}

export default function Avent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { progress, loading } = useUserProgress(user?.uid);
  const { sessions } = useUserSessions();
  const [occupe, setOccupe] = useState(false);
  /** La carte qui vient de sortir, montrée dans son sachet. */
  const [booster, setBooster] = useState<{ carte: CarteAvent; jour?: number; dore?: boolean } | null>(null);
  const [apercu, setApercu] = useState<CarteAvent | null>(null);
  // L'heure lue une fois à l'ouverture : relue à chaque rendu, le même écran
  // dirait autre chose selon le moment où React décide de le recalculer.
  const [maintenant] = useState(() => Date.now());

  const av = useMemo(() => lis(progress?.avent), [progress]);
  // Le calendrier est recalculé depuis l'uid à chaque visite plutôt que
  // stocké : vingt-cinq slugs de plus dans le document pour une suite qui ne
  // change jamais, et qu'on peut rejouer n'importe quand.
  const calendrier = useMemo(() => (user ? calendrierDe(user.uid) : []), [user]);
  const ouvert = enCours(maintenant);
  const jourMax = jourOuvert(maintenant);
  const possedees = nbPossedees(av);
  const complete = collectionComplete(av);
  const semaine = semaineCourante(maintenant);

  /*
   * Le badge des vingt-cinq portes, et le booster doré qui va avec, posés à
   * la seconde où la dernière s'ouvre.
   *
   * Les deux dans la même écriture : séparés, un échec réseau entre les deux
   * aurait laissé un badge sans récompense, ou l'inverse. Le drapeau
   * bonusDonne est ce qui empêche de le regagner en rouvrant la page.
   */
  const bonusEnvoye = useRef(false);
  useEffect(() => {
    if (!user || !progress || !complete) return;
    const aBadge = (progress.badges || []).some((b) => b.id === BADGE_ID);
    if (aBadge && av.bonusDonne) return;
    if (bonusEnvoye.current) return;
    bonusEnvoye.current = true;
    const maj: Record<string, unknown> = {};
    if (!aBadge) maj.badges = arrayUnion(badgeAvent());
    if (!av.bonusDonne) {
      maj['avent.bonusDonne'] = true;
      maj['avent.boostersOr'] = (av.boostersOr || 0) + 1;
    }
    updateDoc(doc(db, 'userProgress', user.uid), maj)
      .catch((err) => {
        bonusEnvoye.current = false;
        console.error('Bonus avent impossible :', err);
      });
  }, [user, progress, complete, av.bonusDonne, av.boostersOr]);

  async function ouvrePorte(jour: number) {
    if (!user || occupe || jour > jourMax || av.portes.includes(jour)) return;
    setOccupe(true);
    const slug = calendrier[jour - 1];
    const apres = {
      ...av,
      portes: [...av.portes, jour],
      cartes: { ...av.cartes, [slug]: (av.cartes[slug] || 0) + 1 },
    };
    try {
      // Enregistré avant l'animation : la carte est acquise même si l'écran
      // s'éteint pendant la révélation.
      await updateDoc(doc(db, 'userProgress', user.uid), { avent: apres });
      const carte = carteParSlug(slug);
      // Le sachet arrive une fois le volet rabattu : les deux en même temps,
      // on ne voit ni l'un ni l'autre.
      if (carte) setTimeout(() => setBooster({ carte, jour }), 620);
    } catch (err) {
      console.error('Ouverture impossible :', err);
    }
    setOccupe(false);
  }

  async function ouvreBooster() {
    if (!user || occupe || av.boosters <= 0) return;
    setOccupe(true);
    const slug = tireBooster(av);
    const apres = {
      ...av,
      boosters: av.boosters - 1,
      cartes: { ...av.cartes, [slug]: (av.cartes[slug] || 0) + 1 },
    };
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { avent: apres });
      const carte = carteParSlug(slug);
      if (carte) setBooster({ carte });
    } catch (err) {
      console.error('Ouverture impossible :', err);
    }
    setOccupe(false);
  }

  async function ouvreBoosterDore() {
    if (!user || occupe || (av.boostersOr || 0) <= 0) return;
    setOccupe(true);
    const slug = tireBoosterDore(av);
    const apres = {
      ...av,
      boostersOr: (av.boostersOr || 0) - 1,
      cartes: { ...av.cartes, [slug]: (av.cartes[slug] || 0) + 1 },
    };
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { avent: apres });
      const carte = carteParSlug(slug);
      if (carte) setBooster({ carte, dore: true });
    } catch (err) {
      console.error('Ouverture impossible :', err);
    }
    setOccupe(false);
  }

  async function prendBooster(questId: string) {
    if (!user || occupe) return;
    setOccupe(true);
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), {
        avent: { ...av, boosters: av.boosters + 1, questsPrises: [...av.questsPrises, questId] },
      });
    } catch (err) {
      console.error('Récupération impossible :', err);
    }
    setOccupe(false);
  }

  const seancesSemaine = useMemo(() => {
    if (semaine < 0) return [];
    const debut = SEMAINES[semaine];
    return sessions.filter((s) => s.completed && s.createdAt >= debut && s.createdAt < debut + SEMAINE_MS);
  }, [sessions, semaine]);

  const quetes: Quest[] = semaine >= 0 ? quetesDeSemaine(semaine) : [];
  const aOuvrir = ouvert && av.portes.length < jourMax;

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page avt-page">
      <header className="avt-header">
        <button className="avt-retour" onClick={() => navigate('/battlepass')} aria-label="Retour">
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="avt-kicker">Événement</span>
          <h1 className="avt-titre">Branlette Hivernale</h1>
        </div>
      </header>

      <p className="avt-pitch">
        Quarante-cinq cartes, vingt-cinq cases. Une par jour jusqu'à Noël, et
        pas les mêmes que ton voisin : chaque calendrier est tiré à part. Les
        vingt qui manquent au tien sortent des missions.
      </p>

      <section className="avt-compteur">
        <div className="avt-compteur-ligne">
          <span className="avt-compteur-valeur">
            {String(possedees).padStart(2, '0')}<em> / {TOTAL_CARTES}</em>
          </span>
          <span className="avt-compteur-label">
            {complete ? 'Calendrier terminé' : 'Cartes trouvées'}
          </span>
        </div>
        <div className="avt-jauge">
          <span style={{ width: `${(possedees / TOTAL_CARTES) * 100}%` }} />
        </div>
        <span className="avt-restant">{texteRestant(ouvert, maintenant)}</span>
      </section>

      {complete && (
        <div className="avt-fini">
          <RankBadgeIcon badge={badgeAvent(0)} size={64} />
          <div>
            <span className="avt-fini-titre">Vingt-cinq cases ouvertes</span>
            <span className="avt-fini-sous">
              Tu es allé au bout du calendrier. Le badge est dans ton profil.
            </span>
          </div>
        </div>
      )}

      {(av.boostersOr || 0) > 0 && (
        <button className="avt-slot avt-slot-or" onClick={ouvreBoosterDore} disabled={occupe}>
          <Gift size={22} />
          <div className="avt-slot-texte">
            <span className="avt-slot-titre">Booster doré</span>
            <span className="avt-slot-sous">Une épique ou une légendaire que tu n'as pas</span>
          </div>
        </button>
      )}

      {av.boosters > 0 && (
        <button className="avt-slot" onClick={ouvreBooster} disabled={occupe}>
          <Gift size={22} />
          <div className="avt-slot-texte">
            <span className="avt-slot-titre">
              {av.boosters} booster{av.boosters > 1 ? 's' : ''} à ouvrir
            </span>
            <span className="avt-slot-sous">Une carte prise dans tout le vivier</span>
          </div>
        </button>
      )}

      <section className="avt-section">
        <h2 className="avt-section-titre">Le calendrier</h2>
        <p className="avt-section-sous">
          {aOuvrir
            ? 'Les cases des jours passés restent ouvrables. Rien ne se perd.'
            : 'Reviens demain pour la suivante.'}
        </p>

        {/* Le tableau : un vrai calendrier de supermarché, avec son décor
            imprimé et ses vingt-cinq portes découpées dedans. Le décor est
            sous les portes, pas autour : c'est lui qu'on découvre quand une
            porte s'ouvre. */}
        <div className="avt-tableau">
          <div className="avt-tableau-tete">
            <span className="avt-tableau-marque">Calendrier de l'avent</span>
            <span className="avt-tableau-annee">2026</span>
          </div>

          <div className="avt-decor" aria-hidden="true">
            <span className="avt-dec avt-dec-sapin" />
            <span className="avt-dec avt-dec-sapin2" />
            <span className="avt-dec avt-dec-god" />
            <span className="avt-dec avt-dec-god2" />
            <span className="avt-dec avt-dec-cadeau" />
            <span className="avt-dec avt-dec-etoile" />
            <span className="avt-dec avt-dec-etoile2" />
            <span className="avt-dec avt-dec-canne" />
            <span className="avt-dec avt-dec-flocon" />
            <span className="avt-dec avt-dec-flocon2" />
          </div>

          <div className="avt-grille">
            {Array.from({ length: CASES }, (_, i) => i + 1).map((jour) => {
              const ouverte = av.portes.includes(jour);
              const dispo = ouvert && jour <= jourMax && !ouverte;
              // Seule la case du jour s'anime. Quatorze cases en retard qui
              // battent toutes ensemble, ce n'est plus un appel, c'est une
              // alarme — et on ne sait plus laquelle est celle d'aujourd'hui.
              const duJour = dispo && jour === jourMax;
              const carte = ouverte ? carteParSlug(calendrier[jour - 1]) : undefined;
              return (
                <button
                  key={jour}
                  className={`avt-case ${ouverte ? 'ouverte' : ''} ${dispo ? 'dispo' : ''} ${duJour ? 'du-jour' : ''} ${jour === CASES ? 'noel' : ''}`}
                  disabled={!dispo && !ouverte}
                  onClick={() => (ouverte && carte ? setApercu(carte) : ouvrePorte(jour))}
                >
                  {/* Le fond de la case : ce qu'il y a derrière la porte. */}
                  <span className="avt-niche">
                    {ouverte && carte ? (
                      <>
                        <img className="avt-niche-photo" src={carte.image} alt="" loading="lazy" />
                        <span className={`avt-niche-nom rarete-${carte.rarete}`}>{carte.nom}</span>
                      </>
                    ) : (
                      <Lock size={13} className="avt-niche-cadenas" />
                    )}
                  </span>

                  {/* Le volet, charnière à gauche. Il pivote au lieu de
                      disparaître : c'est le geste du calendrier en carton. */}
                  <span className="avt-volet">
                    <span className="avt-volet-face">
                      <span className="avt-volet-jour">{jour}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {quetes.length > 0 && (
        <section className="avt-section">
          <h2 className="avt-section-titre">Missions de la semaine</h2>
          <p className="avt-section-sous">
            Une mission réussie, un booster — et le booster pioche dans les cartes
            que ton calendrier ne te donnera jamais.
          </p>
          <div className="avt-quetes">
            {quetes.map((q) => {
              const valeur = questValue(q, seancesSemaine);
              const fini = valeur >= q.target;
              const prise = av.questsPrises.includes(q.id);
              return (
                <div key={q.id} className={`avt-quete ${fini ? 'done' : ''} ${prise ? 'claimed' : ''}`}>
                  <span className="avt-ruban">Event</span>
                  <span className="avt-quete-label">{q.label}</span>
                  <span className="avt-quete-desc">{q.description}</span>
                  <div className="avt-quete-jauge">
                    <span style={{ width: `${Math.min(100, (valeur / q.target) * 100)}%` }} />
                  </div>
                  {prise ? (
                    <span className="avt-quete-prise"><Check size={14} /> Booster récupéré</span>
                  ) : fini ? (
                    <button className="avt-quete-btn" onClick={() => prendBooster(q.id)} disabled={occupe}>
                      Récupérer le booster
                    </button>
                  ) : (
                    <span className="avt-quete-compte">{Math.min(valeur, q.target)} / {q.target}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Le vivier n'est plus montré à tout le monde.
          Voir les quarante-cinq cases dont onze resteront vides quoi qu'on
          fasse, ça n'excite pas, ça agace. Chacun voit ce qu'il a dans la
          collection de son profil ; la liste complète reste ici pour
          l'administration, qui a besoin de savoir qui manque à qui. */}
      {estAdmin(user?.uid) && (
      <section className="avt-section">
        <h2 className="avt-section-titre">Le vivier</h2>
        <p className="avt-section-sous">
          Les quarante-cinq, visibles de toi seul.
        </p>
        <div className="avt-vivier">
          {CARTES.map((c) => {
            const n = av.cartes[c.slug] || 0;
            return (
              <button
                key={c.slug}
                className={`avt-vignette rarete-${c.rarete} ${n > 0 ? 'eue' : ''}`}
                disabled={n === 0}
                onClick={() => setApercu(c)}
              >
                <span className="avt-vignette-nom">{n > 0 ? c.nom : '— — —'}</span>
                <span className="avt-vignette-num">{String(c.numero).padStart(2, '0')}</span>
                {n > 1 && <span className="avt-vignette-doublon">×{n}</span>}
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* Le crédit de la seule photo du lot qui en demande un : celle de
          Manuel Ferrara vient de Wikimedia Commons, sous une licence qui
          oblige à nommer le photographe et à laisser la même licence sur
          l'image recadrée. */}
      <p className="avt-credit">
        Photo de Manuel Ferrara © Glenn Francis,{' '}
        <a href="https://www.pacificprodigital.com" target="_blank" rel="noreferrer noopener">
          PacificProDigital.com
        </a>
        , recadrée, sous licence{' '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr"
          target="_blank"
          rel="noreferrer noopener"
        >
          CC BY-SA 4.0
        </a>.
      </p>

      {booster && (
        <Booster
          carte={booster.carte}
          jour={booster.jour}
          dore={booster.dore}
          onFini={() => setBooster(null)}
        />
      )}

      {apercu && (
        <div className="avt-apercu" onClick={() => setApercu(null)}>
          <div className="avt-apercu-carte" onClick={(e) => e.stopPropagation()}>
            <button className="avt-apercu-fermer" onClick={() => setApercu(null)} aria-label="Fermer">
              <X size={18} />
            </button>
            <AventCardArt carte={apercu} retournable />
            {(av.cartes[apercu.slug] || 0) > 1 && (
              <span className="avt-apercu-doublons">×{av.cartes[apercu.slug]} dans ta collection</span>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
