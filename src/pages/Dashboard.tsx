import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Droplets, ClipboardList, Snowflake } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SeasonalBadge from '../components/SeasonalBadge';
import PinkRibbon from '../components/PinkRibbon';
import NotifGate from '../components/NotifGate';
import PasCard from '../components/PasCard';
import DefiSurpriseCard from '../components/DefiSurpriseCard';
import CalendrierSeances from '../components/CalendrierSeances';
import { getSeasonalTheme } from '../lib/seasonalTheme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS } from '../lib/exercises';
import { getWeekStart, SEASONS } from '../lib/passes';
import { getCardById, isSetComplete } from '../lib/cards';
import { meritesExploits, totaux } from '../lib/badgesExploits';
import { totalReps, sessionReps, sessionSeconds } from '../lib/stats';
import { useCreatine, shiftDay, GELS_PAR_MOIS } from '../lib/creatine';
import { useUserProgress } from '../lib/useUserProgress';
import {
  badgeAcquisPourId, idBadgeCreatine, idBadgePasJour, idBadgePasTotal,
  PALIERS_CREATINE, PALIERS_PAS_JOUR, PALIERS_PAS_TOTAL,
} from '../lib/badges';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { amrapTitle } from '../lib/amrap';
import Loader from '../components/Loader';

/**
 * Le nom d'un jour de la fenêtre de rattrapage.
 *
 * « hier » et « avant-hier » plutôt qu'une date : c'est ainsi qu'on se
 * souvient d'un oubli, et la fenêtre est trop courte pour qu'une date aide.
 */
function libelleJour(cle: string, aujourdhui: string): string {
  if (cle === shiftDay(aujourdhui, -1)) return 'hier';
  if (cle === shiftDay(aujourdhui, -2)) return 'avant-hier';
  const [a, m, j] = cle.split('-').map(Number);
  return format(new Date(a, m - 1, j), 'EEEE', { locale: fr });
}

export default function Dashboard() {
  const { user, displayName: myName } = useAuth();
  const navigate = useNavigate();
  const { sessions, loading } = useUserSessions();
  const creatine = useCreatine();
  const { progress } = useUserProgress(user?.uid);

  /**
   * Les badges qui se gagnent en atteignant quelque chose : créatine et pas.
   *
   * Ici et pas dans un cron : c'est le seul endroit qui connaît le compteur
   * à la seconde près, et le badge doit arriver pendant que la personne
   * regarde l'écran où elle vient de cocher.
   *
   * Un seul effet et une seule écriture pour les deux familles. Séparés, ils
   * partaient du même instantané et le second arrivait sur un document que
   * le premier n'avait pas encore modifié.
   *
   * Plusieurs paliers peuvent tomber d'un coup. Quelqu'un qui marche depuis
   * des mois avant que ces badges existent les reçoit tous à sa prochaine
   * ouverture, et non le dernier seulement : il a bien passé les autres en
   * chemin.
   */
  const badgesEnvoyes = useRef(new Set<string>());
  useEffect(() => {
    if (!user || !progress || creatine.loading) return;

    const jours = progress.pasJours || {};
    const valeurs = Object.values(jours);
    const meilleurJour = valeurs.reduce((max, v) => Math.max(max, v), 0);
    const cumul = valeurs.reduce((somme, v) => somme + v, 0);

    /* Les badges d'exploit rejoignent la même écriture que la créatine et
       les pas. Un deuxième effet aurait relu le même instantané et serait
       arrivé sur un document que le premier n'avait pas encore modifié —
       c'est exactement la raison pour laquelle ces deux familles-là avaient
       déjà été réunies. */
    const t = totaux(sessions, progress);
    const coll = {
      saisonsCompletes: SEASONS.filter((s) => isSetComplete(s.id, progress.ownedCards || {})).length,
      historique: Object.entries(progress.ownedCards || {}).some(
        ([id, n]) => n > 0 && getCardById(id)?.rarity === 'historique'
      ),
    };

    const merites = [
      ...PALIERS_CREATINE.filter((j) => creatine.streak >= j).map(idBadgeCreatine),
      ...PALIERS_PAS_JOUR.filter((p) => meilleurJour >= p).map(idBadgePasJour),
      ...PALIERS_PAS_TOTAL.filter((p) => cumul >= p).map(idBadgePasTotal),
      ...meritesExploits(t, coll),
    ];

    const acquis = new Set((progress.badges || []).map((b) => b.id));
    const aDonner = merites.filter((id) => !acquis.has(id) && !badgesEnvoyes.current.has(id));
    if (aDonner.length === 0) return;

    // Marqués avant l'écriture : le temps qu'elle revienne, l'effet peut
    // rejouer et donner les mêmes badges une deuxième fois.
    for (const id of aDonner) badgesEnvoyes.current.add(id);
    updateDoc(doc(db, 'userProgress', user.uid), {
      badges: arrayUnion(...aDonner.map((id) => badgeAcquisPourId(id))),
    }).catch((err) => {
      for (const id of aDonner) badgesEnvoyes.current.delete(id);
      console.error('Badge impossible :', err);
    });
  }, [user, progress, sessions, creatine.loading, creatine.streak]);

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  const stats = useMemo(() => {
    const weekStart = getWeekStart();
    const weekSessions = sessions.filter((s) => s.createdAt >= weekStart && s.completed);
    const weekReps = totalReps(weekSessions);
    return { weekSessions: weekSessions.length, weekReps };
  }, [sessions]);

  function getSessionCategories(s: Session): string {
    const cats = [...new Set(s.exercises.map((e) => e.exerciseCategory || '').filter(Boolean))];
    if (cats.length === 0) {
      return `${s.exercises.length} exo${s.exercises.length > 1 ? 's' : ''}`;
    }
    return cats.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] || c).join(', ');
  }

  return (
    <div className="page accueil">
      {/* Le bandeau d'accueil, comme celui du pass : il monte jusqu'au bord
          de l'écran, zone de sécurité comprise, et les chiffres de la
          semaine vivent dedans. Dans deux cartes séparées, ils pesaient
          autant que la créatine et les pas — trois blocs de même poids, et
          plus rien qui ressort. */}
      <header className="acc-entete">
        <div className="acc-entete-fond" />
        <div className="acc-entete-contenu">
          <div className="acc-salut">
            <h1>Salut {myName}</h1>
            <SeasonalBadge compact />
          </div>

          {!loading && (
            <div className="acc-semaine">
              <div className="acc-chiffre">
                <span className="acc-nombre">{stats.weekSessions}</span>
                <span className="acc-mot">séance{stats.weekSessions > 1 ? 's' : ''}</span>
              </div>
              <div className="acc-chiffre">
                <span className="acc-nombre">{stats.weekReps}</span>
                <span className="acc-mot">reps</span>
              </div>
              <span className="acc-depuis">cette semaine</span>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="page loading"><Loader /></div>
      ) : (
        <>
          {getSeasonalTheme() === 'pink' && (
            <div className="pink-awareness">
              <PinkRibbon size={22} />
              <div className="pink-awareness-text">
                <span className="pink-awareness-title">Octobre Rose</span>
                <span className="pink-awareness-sub">
                  Mois de sensibilisation au dépistage du cancer du sein.
                </span>
              </div>
            </div>
          )}

          {/* Avant tout le reste : c'est le seul endroit où on peut encore
              rattraper quelqu'un qui n'a pas activé ses rappels. */}
          {user && <NotifGate uid={user.uid} />}


          {/* Après les chiffres de la semaine et avant les gestes du jour :
              c'est le recul, pas une action à faire. */}
          <CalendrierSeances sessions={sessions} />

          {/* Avant la créatine et les pas : c'est le seul geste du jour qui
              expire ce soir. */}
          {user && <DefiSurpriseCard uid={user.uid} progress={progress} />}

          <button
            type="button"
            className={`creatine-card ${creatine.takenToday ? 'taken' : ''}`}
            onClick={creatine.toggle}
            disabled={creatine.loading}
            aria-pressed={creatine.takenToday}
          >
            <div className="creatine-left">
              <Droplets size={18} />
              <div>
                <span className="creatine-title">Créatine</span>
                <span className="creatine-sub">
                  {creatine.loading
                    ? 'Chargement…'
                    : creatine.takenToday
                      ? 'Prise aujourd\'hui'
                      : 'Pas encore prise aujourd\'hui'}
                </span>
              </div>
            </div>
            <div className="creatine-right">
              {creatine.streak > 0 && (
                <span className={`creatine-streak ${creatine.pending ? 'pending' : ''}`}>
                  {creatine.streak}j
                </span>
              )}
              <div className={`creatine-check ${creatine.takenToday ? 'active' : ''}`}>
                {creatine.takenToday && <Droplets size={14} />}
              </div>
            </div>
          </button>

          {/* Le rattrapage, sous la carte et pas dedans : la carte reste un
              seul geste, et les gels n'apparaissent que s'il y a un oubli à
              réparer ou un gel à annuler. */}
          {!creatine.loading && (creatine.rattrapables.length > 0 || creatine.poses.length > 0) && (
            <div className="gels">
              <div className="gels-tete">
                <span className="gels-titre">
                  <Snowflake size={13} /> Gels
                </span>
                <span className="gels-quota">
                  {creatine.gelsDispo} / {GELS_PAR_MOIS} ce mois-ci
                </span>
              </div>
              <div className="gels-jours">
                {creatine.poses.map((jour) => (
                  <button
                    key={jour}
                    type="button"
                    className="gel-jour pose"
                    onClick={() => creatine.rattrape(jour)}
                  >
                    {libelleJour(jour, creatine.day)} gelé
                  </button>
                ))}
                {creatine.rattrapables.map((jour) => (
                  <button
                    key={jour}
                    type="button"
                    className="gel-jour"
                    onClick={() => creatine.rattrape(jour)}
                  >
                    Rattraper {libelleJour(jour, creatine.day)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Juste après la créatine : ce sont les deux gestes quotidiens qui
              ne passent pas par une séance. */}
          <PasCard />

          <button className="primary-btn home-cta" onClick={() => navigate('/session/new')}>
            <Plus size={20} /> Nouvelle séance
          </button>
          {/* Un lien, pas un bouton : c'est le chemin de côté, et une
              deuxième boîte sous la grande en faisait une alternative de
              même poids. */}
          <button className="acc-lien" onClick={() => navigate('/programs')}>
            <ClipboardList size={16} />
            <span>Partir d'un programme</span>
            <ChevronRight size={15} />
          </button>

          <section className="acc-section">
            <h2>Dernières séances</h2>
            {recentSessions.length === 0 ? (
              <p className="empty">Aucune séance pour l'instant. Lance-toi !</p>
            ) : (
              <div className="session-list">
                {recentSessions.map((s) => (
                  <div key={s.id} className="acc-seance" onClick={() => navigate(`/session/${s.id}`)}>
                    <div className="acc-seance-tete">
                      <span className="acc-seance-date">
                        {format(new Date(s.date), 'd MMM', { locale: fr })}
                      </span>
                      <span className="acc-seance-quoi">
                        {s.mode === 'amrap' ? amrapTitle(s.amrapName) : getSessionCategories(s)}
                      </span>
                      {/* Seules les séances en cours portent une étiquette :
                          « Terminée » sur chaque ligne, c'est le cas normal
                          répété dix fois, donc du bruit. */}
                      {!s.completed && <span className="acc-seance-encours">En cours</span>}
                      <ChevronRight size={15} className="acc-seance-fleche" />
                    </div>
                    <div className="acc-seance-chiffres">
                      {s.mode === 'amrap' ? (
                        <span>{s.amrapRounds || 0} rounds</span>
                      ) : (
                        <>
                          <span>
                            {s.exercises.reduce(
                              (sum, ex) => sum + ex.sets.filter((set) => set.completed).length,
                              0
                            )}{' '}
                            séries
                          </span>
                          {sessionReps(s) > 0 && <span>{sessionReps(s)} reps</span>}
                          {sessionSeconds(s) > 0 && <span>{sessionSeconds(s)} sec</span>}
                        </>
                      )}
                      {s.duration && s.duration > 0 && (
                        <span>
                          {Math.floor(s.duration / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
}
