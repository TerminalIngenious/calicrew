import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { ArrowLeft, Package, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { useUserSessions } from '../contexts/SessionsContext';
import { questValue } from '../lib/quests';
import Loader from '../components/Loader';
import BottomNav from '../components/BottomNav';
import FaceIdCard from '../components/FaceIdCard';
import BoosterOpening from '../components/BoosterOpening';
import RankBadgeIcon from '../components/RankBadgeIcon';
import {
  CARTES, MEMBRES, TOTAL_CARTES, SEMAINES,
  ajoute, collectionComplete, evenementEnCours, joursRestants, lisFaceId,
  nbPossedees, questsDeSemaine, semaineCourante, tireBooster,
  BADGE_ID, badgeFaceId, BOOSTERS_OUVERTURE,
} from '../lib/faceid';
import type { Quest } from '../types';
import './FaceId.css';

const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

function texteRestant(enCours: boolean, maintenant: number): string {
  if (!enCours) {
    return maintenant < SEMAINES[0] ? 'Ouverture le 9 novembre' : 'Événement terminé';
  }
  const jours = joursRestants(maintenant);
  return `Il reste ${jours} jour${jours > 1 ? 's' : ''}`;
}

export default function FaceId() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { progress, loading } = useUserProgress(user?.uid);
  const { sessions } = useUserSessions();
  const [ouverture, setOuverture] = useState<string[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  // L'heure est lue une fois à l'ouverture de la page : lue à chaque rendu,
  // elle ferait dire autre chose au même écran selon le moment où React
  // décide de le recalculer.
  const [maintenant] = useState(() => Date.now());

  const fid = useMemo(() => lisFaceId(progress?.faceid), [progress]);
  const possedees = nbPossedees(fid);
  const complete = collectionComplete(fid);
  const enCours = evenementEnCours(maintenant);
  const semaine = semaineCourante(maintenant);

  /**
   * Les boosters d'ouverture.
   *
   * Donné à la première visite pendant l'event, et pas au lancement de
   * l'app : personne ne doit découvrir l'event par un chiffre qui a bougé
   * tout seul sur un écran qu'il n'a pas ouvert.
   */
  const bienvenueEnvoyee = useRef(false);
  useEffect(() => {
    if (!user || !progress || !enCours || fid.bienvenue) return;
    // Le garde-fou n'est pas du zèle : React monte les effets deux fois en
    // développement, et l'écriture ne se voit qu'au retour du serveur. Sans
    // lui, le booster d'ouverture était donné deux fois.
    if (bienvenueEnvoyee.current) return;
    bienvenueEnvoyee.current = true;
    const donne = { ...fid, boosters: fid.boosters + BOOSTERS_OUVERTURE, bienvenue: true };
    setDoc(doc(db, 'userProgress', user.uid), { faceid: donne }, { merge: true })
      .catch((err) => {
        bienvenueEnvoyee.current = false;
        console.error('Booster d\'ouverture impossible :', err);
      });
  }, [user, progress, enCours, fid]);

  /**
   * Le badge de fin, dès que les vingt-quatre sont là.
   *
   * Posé ici et non dans un cron : c'est le seul endroit qui sait, à la
   * seconde près, que la collection vient d'être bouclée — et la seule
   * seconde où l'annoncer a du sens.
   */
  const badgeEnvoye = useRef(false);
  useEffect(() => {
    if (!user || !progress || !complete) return;
    if ((progress.badges || []).some((b) => b.id === BADGE_ID)) return;
    if (badgeEnvoye.current) return;
    badgeEnvoye.current = true;
    updateDoc(doc(db, 'userProgress', user.uid), { badges: arrayUnion(badgeFaceId()) })
      .catch((err) => {
        badgeEnvoye.current = false;
        console.error('Badge FaceID impossible :', err);
      });
  }, [user, progress, complete]);

  async function ouvreBooster() {
    if (!user || occupe || fid.boosters <= 0) return;
    setOccupe(true);
    // Tirage et enregistrement AVANT l'animation : les cartes sont acquises
    // même si l'écran s'éteint au milieu.
    const tirage = tireBooster(fid);
    const apres = ajoute(fid, tirage);
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { faceid: apres });
      setOuverture(tirage);
    } catch (err) {
      console.error('Ouverture impossible :', err);
    }
    setOccupe(false);
  }

  async function prendBooster(questId: string) {
    if (!user || occupe) return;
    setOccupe(true);
    const apres = {
      ...fid,
      boosters: fid.boosters + 1,
      questsPrises: [...fid.questsPrises, questId],
    };
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { faceid: apres });
    } catch (err) {
      console.error('Récupération impossible :', err);
    }
    setOccupe(false);
  }

  // Les séances de la semaine d'event en cours, pour mesurer les quêtes.
  const seancesSemaine = useMemo(() => {
    if (semaine < 0) return [];
    const debut = SEMAINES[semaine];
    return sessions.filter(
      (s) => s.completed && s.createdAt >= debut && s.createdAt < debut + SEMAINE_MS
    );
  }, [sessions, semaine]);

  const quests: Quest[] = semaine >= 0 ? questsDeSemaine(semaine) : [];

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page fid-page">
      <div className="fid-grille" aria-hidden="true" />
      <div className="fid-balayage" aria-hidden="true" />

      <header className="fid-header">
        <button className="fid-retour" onClick={() => navigate('/battlepass')} aria-label="Retour">
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="fid-kicker">Événement</span>
          <h1 className="fid-titre">FaceID</h1>
        </div>
      </header>

      <p className="fid-pitch">
        Douze d'entre nous, deux portraits chacun. Vingt-quatre cartes à
        rassembler avant le 30 novembre — et aucune ne s'achète : elles sortent
        toutes des boosters.
      </p>

      <section className="fid-compteur">
        <div className="fid-compteur-ligne">
          <span className="fid-compteur-valeur">
            {String(possedees).padStart(2, '0')}<em> / {TOTAL_CARTES}</em>
          </span>
          <span className="fid-compteur-label">
            {complete ? 'Fichier complet' : 'Visages identifiés'}
          </span>
        </div>
        <div className="fid-jauge">
          <span style={{ width: `${(possedees / TOTAL_CARTES) * 100}%` }} />
        </div>
        <span className="fid-restant">{texteRestant(enCours, maintenant)}</span>
      </section>

      {complete && (
        <div className="fid-fini">
          <RankBadgeIcon badge={badgeFaceId(0)} size={64} />
          <div>
            <span className="fid-fini-titre">Fichier complet</span>
            <span className="fid-fini-sous">
              Les vingt-quatre visages sont identifiés. Le badge FaceID est dans ton profil.
            </span>
          </div>
        </div>
      )}

      {fid.boosters > 0 && (
        <button className="fid-slot" onClick={ouvreBooster} disabled={occupe}>
          <Package size={22} />
          <div className="fid-slot-texte">
            <span className="fid-slot-titre">
              {fid.boosters} booster{fid.boosters > 1 ? 's' : ''} à ouvrir
            </span>
            <span className="fid-slot-sous">3 cartes à l'intérieur</span>
          </div>
        </button>
      )}

      {quests.length > 0 && (
        <section className="fid-section">
          <h2 className="fid-section-titre">Missions de la semaine</h2>
          <p className="fid-section-sous">Une mission réussie, un booster. Les mêmes pour tout le groupe.</p>
          <div className="fid-quests">
            {quests.map((q) => {
              const valeur = questValue(q, seancesSemaine);
              const fini = valeur >= q.target;
              const prise = fid.questsPrises.includes(q.id);
              return (
                <div key={q.id} className={`fid-quest ${fini ? 'done' : ''} ${prise ? 'claimed' : ''}`}>
                  <span className="fid-ruban">Event</span>
                  <span className="fid-quest-label">{q.label}</span>
                  <span className="fid-quest-desc">{q.description}</span>
                  <div className="fid-quest-jauge">
                    <span style={{ width: `${Math.min(100, (valeur / q.target) * 100)}%` }} />
                  </div>
                  {prise ? (
                    <span className="fid-quest-prise"><Check size={14} /> Booster récupéré</span>
                  ) : fini ? (
                    <button
                      className="fid-quest-btn"
                      onClick={() => prendBooster(q.id)}
                      disabled={occupe}
                    >
                      Récupérer le booster
                    </button>
                  ) : (
                    <span className="fid-quest-compte">
                      {Math.min(valeur, q.target)} / {q.target}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="fid-section">
        <h2 className="fid-section-titre">Le fichier</h2>
        <div className="fid-fiches">
          {MEMBRES.map((m) => {
            const paire = CARTES.filter((c) => c.slug === m.slug);
            // Tant qu'on n'a rien de quelqu'un, on ne sait même pas de qui il
            // s'agit : c'est la moitié du plaisir d'ouvrir un booster.
            const connu = paire.some((c) => (fid.cartes[c.id] || 0) > 0);
            return (
              <div key={m.slug} className={`fid-fiche ${connu ? 'connu' : ''}`}>
                <span className="fid-fiche-nom">{connu ? m.nom : '— — —'}</span>
                <div className="fid-fiche-paire">
                  {paire.map((c) => (
                    <FaceIdCard
                      key={c.id}
                      carte={c}
                      possedee={(fid.cartes[c.id] || 0) > 0}
                      anonyme={!connu}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {ouverture && <BoosterOpening ids={ouverture} onFini={() => setOuverture(null)} />}

      <BottomNav />
    </div>
  );
}
