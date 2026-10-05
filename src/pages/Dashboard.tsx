import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session } from '../types';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, X, ChevronRight, Droplets, ClipboardList } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SeasonalBadge from '../components/SeasonalBadge';
import PinkRibbon from '../components/PinkRibbon';
import { getSeasonalTheme } from '../lib/seasonalTheme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS } from '../lib/exercises';
import { getWeekStart } from '../lib/passes';
import { totalReps, sessionReps, sessionSeconds } from '../lib/stats';
import { useCreatine } from '../lib/creatine';
import { amrapTitle } from '../lib/amrap';
import Loader from '../components/Loader';

const UPDATES = [
  {
    id: 'update-2026-10-05',
    date: '5 octobre 2026',
    title: 'AMRAP sur mesure',
    summary: 'Compose ton circuit, choisis ta durée, et les reps comptent enfin.',
    details: `AMRAP sur mesure : tu n'es plus limité au Cindy. Choisis tes exercices, le nombre de reps (ou de secondes) de chaque, la durée du chrono et un nom, puis enchaîne les rounds. Jusqu'à 8 exercices par circuit.\n\nWOD de référence en un clic : Cindy, Chelsea et Mary remplissent le circuit pour toi, modifiable ensuite.\n\nCircuits en temps : un round peut contenir 30 s de gainage aussi bien que 10 pompes. Les secondes sont comptées comme du temps, jamais comme des reps.\n\nLes reps d'un AMRAP comptent enfin : à la fin de la séance, les rounds réalisés deviennent des séries. 12 rounds de 5 tractions valent 12 séries de 5, donc 60 tractions dans les classements, les quêtes et tes totaux. Avant, un AMRAP comptait pour zéro rep. Les séances AMRAP déjà enregistrées ne sont pas recalculées.\n\nRecords AMRAP par circuit : dans les profils, le meilleur résultat est affiché par circuit et par durée, avec le détail du circuit. Comparer des rounds entre deux circuits différents ne voulait rien dire.`,
  },
  {
    id: 'update-2026-10-03',
    date: '3 octobre 2026',
    title: 'CrossFit & créatine synchronisée',
    summary: 'Nouvelle catégorie CrossFit, PR à saisir soi-même et créatine synchronisée.',
    details: `PR saisis à la main : tes records ne sont plus déduits de tes séances, c'est toi qui les écris. Tu choisis l'exercice, le type de record (reps, kg, temps ou km), la charge, la date et une précision libre. Un maxi de charge ou un record fait en compèt' n'avait aucune raison d'attendre d'être logué dans l'app pour exister.\n\nNouvelle catégorie CrossFit avec 31 mouvements : haltérophilie (épaulé, arraché, thruster, push press), gymnastique (pointes aux barres, muscle-up aux anneaux, wall walk, montée de corde) et conditionnement (burpees, wall balls, double unders, kettlebell swing, farmer's walk). Ils fonctionnent en séries, reps et charge comme la muscu : ils comptent dans les classements, dans les quêtes d'exercices et dans tes records. Les mouvements qui se mesurent au temps (marche en ATR, traîneau, rameur, assault bike) se loguent en secondes.\n\nCréatine synchronisée : ton suivi est maintenant le même sur téléphone et sur PC, et il survit à un vidage du cache. Il continue de fonctionner hors ligne.\n\nCompteur de créatine corrigé : le streak se recalcule à partir des jours réellement cochés. Il ne reste plus bloqué sur une ancienne valeur quand tu sautes des jours, décocher annule bien la journée, et la carte change de jour toute seule à minuit. Le streak de la veille reste affiché en gris tant que tu n'as pas pris ta dose du jour.\n\nRappel créatine plus malin : la notification de 20h ne part plus si tu as déjà coché la prise du jour.`,
  },
  {
    id: 'update-2026-10-02',
    date: '2 octobre 2026',
    title: 'Octobre Rose & Halloween',
    summary: 'L\'app passe en rose pour Octobre Rose, et en thème Halloween le 31.',
    details: `Direction artistique Octobre Rose : pendant tout le mois, l'identité de l'app bascule en rose, avec une lueur en haut d'écran et des rubans qui montent lentement en fond. Les couleurs qui portent une information ne changent pas : l'or, l'argent et le bronze du podium, les raretés des cartes, le vert de validation et le rouge restent identiques.\n\nUn bandeau rappelle que octobre est le mois de sensibilisation au dépistage du cancer du sein.\n\nThème Halloween le 31 octobre : toiles d'araignée dans les coins, araignée suspendue et citrouille remplacent l'habillage rose pour la journée.\n\nLes deux habillages suivent la date et se retirent tout seuls, il n'y a rien à activer.`,
  },
  {
    id: 'update-2026-10-01',
    date: '1er octobre 2026',
    title: 'Navigation repensée',
    summary: 'Cinq onglets clairs, profil réorganisé et sous-onglets dans le groupe.',
    details: `Navigation repensée : la barre du bas passe à cinq onglets avec un rôle clair chacun — Accueil, Progrès, Pass, Groupe, Profil. La page Progrès, qui existait sans qu'on puisse l'ouvrir, a maintenant son onglet.\n\nProfil réorganisé : tes stats, tes badges, tes records et tes cartes sont regroupés par section au lieu d'être empilés. Une section Compte rassemble le pseudo, les réglages de notifications (l'engrenage) et la déconnexion.\n\nGroupe en sous-onglets : Classement et Échanges sont séparés, la page ne déroule plus tout d'un bloc.`,
  },
  {
    id: 'update-2026-09-30',
    date: '30 septembre 2026',
    title: 'Badges, records & pass 100 niveaux',
    summary: 'Badges de podium, records personnels, séances modifiables et nouvelle ouverture de coffre.',
    details: `Badges de classement : les 3 premiers de chaque classement mensuel (reps, variété, temps) reçoivent un badge en fin de mois, par exemple TOP 2 Reps saison 1. Chaque classement a sa couleur et chaque place du podium son métal. Les badges s'affichent dans le profil.\n\nRecords personnels : chaque profil liste les PR par exercice — meilleure série, charge maximale, meilleure distance et meilleur temps. Les séances AMRAP sont exclues pour ne pas fausser les records.\n\nSéance modifiable en cours de route : ajoute un exercice que tu avais oublié, change le poids en pleine séance (il peut varier d'une série à l'autre) et ajuste le nombre de séries.\n\nNouvelle ouverture de coffre : la carte tourne dans la couleur de sa rareté, s'arrête sur une explosion, puis apparaît — avec un son dont l'intensité dépend de la rareté.\n\nPass étendu à 100 niveaux : le niveau 100 donne un coffre historique, et des paliers garantissent un coffre rare ou plus, épique ou plus, ou légendaire ou plus. Les 24 premiers niveaux gardent leur coût en XP, personne ne perd un niveau.`,
  },
  {
    id: 'update-2026-09-17',
    date: '17 septembre 2026',
    title: 'Reps ou secondes, vélo & pseudo',
    summary: 'Choix reps/secondes par exercice, catégorie Vélo et pseudo modifiable.',
    details: `Reps ou secondes : pour chaque exercice tu choisis l'unité. Un gainage ou un L-sit se logue en secondes, et ces secondes ne sont plus comptées comme des reps dans les classements, les quêtes et les records.\n\nNouvelle catégorie Vélo avec 9 exercices (vélo route, VTT, gravel, home trainer, spinning, fractionné et plus). Saisie du temps, de la distance et du dénivelé, avec la vitesse calculée en km/h.\n\nPseudo modifiable : tu peux changer ton pseudo depuis ton profil.`,
  },
  {
    id: 'update-2026-09-14',
    date: '14 septembre 2026',
    title: 'Défi du jour, Sport Co & notifications',
    summary: 'Un défi quotidien, la catégorie Sport Co, les notifications push et plus de quêtes.',
    details: `Défi quotidien : chaque jour à 10h, un défi identique pour tout le monde, à 25 XP.\n\nNouvelle catégorie Sport Co avec 15 sports collectifs (football, basket, hand, volley, rugby, tennis, padel et plus). Tu indiques simplement la durée : 25 XP par 30 minutes.\n\nNotifications push : active le rappel créatine (20h) et le rappel du défi du jour (17h), qui ne part que si tu ne l'as pas encore validé.\n\nPlus de quêtes au choix : le pool passe à 26 quêtes avec des objectifs plus difficiles. Tu en choisis toujours 10, plus les 2 quêtes de base, soit 12.\n\nRécompenses mensuelles revues : les 3 premiers des 3 classements reçoivent un coffre épique ou mieux. Le mois d'août n'est pas compté.\n\nCorrection : l'écran de choix des quêtes n'apparaît plus vide après avoir sélectionné ses sports.`,
  },
  {
    id: 'update-2026-09-11',
    date: '11 septembre 2026',
    title: 'Quêtes au choix & exos de muscu',
    summary: 'Choisis tes quêtes le lundi, 20 exercices de musculation et un coffre à chaque séance.',
    details: `Quêtes au choix : le lundi, tu indiques les sports que tu pratiques et tu sélectionnes tes quêtes de la semaine au lieu de les subir.\n\nRécompenses de fin de mois par classement du groupe : le podium de chaque classement est récompensé.\n\n20 exercices de musculation ajoutés : développés couché, incliné, décliné et militaire, curls, rowings, élévations, soulevé de terre, hip thrust et plus.\n\nExercices personnalisés : modifie-les ou supprime-les depuis le crayon de chaque catégorie, et utilise-les dans tes programmes.\n\nUn coffre commune offert à chaque séance terminée.`,
  },
  {
    id: 'update-2026-09-10',
    date: '10 septembre 2026',
    title: 'Chat de groupe',
    summary: 'Chat en temps réel dans chaque groupe et affichage corrigé sur iPhone.',
    details: `Chat de groupe en temps réel : une icône dans le header du groupe ouvre la discussion, avec les avatars des membres.\n\nAffichage corrigé sur les écrans à encoche : le header, les pages et la barre de navigation respectent les zones sûres de l'iPhone.`,
  },
  {
    id: 'update-2026-09-09',
    date: '9 septembre 2026',
    title: 'Programmes, créatine & quêtes v2',
    summary: 'Programmes d\'entraînement, suivi créatine, quêtes rééquilibrées et plus.',
    details: `Programmes d'entraînement : crée tes propres programmes avec tes exercices, séries, reps et poids. Partage-les en public pour que les autres puissent les importer. Lance une séance directement depuis un programme sauvegardé.\n\nSuivi créatine : un tracker quotidien sur le dashboard avec compteur de streak. Coche chaque jour pour suivre ta prise.\n\nTypes de poids : en plus du lesté, choisis entre haltères et barre lors de la configuration d'un exercice.\n\nQuêtes rééquilibrées : boost réduit (x1.2 au lieu de x1.6), plafonds sur tous les objectifs, quêtes de base fixes chaque semaine (3 séances, 30 min, 15 séries). Les quêtes d'exercices sont maintenant par séance ("fais 55 tractions en une séance") et pas sur la semaine entière.\n\nQuête Cindy : si tu fais des AMRAP, une quête Cindy apparaît (max 2/semaine). Les reps du Cindy comptent aussi dans les quêtes d'exercices (pompes, tractions, squats).\n\nSéances AMRAP modifiables : tu peux corriger le nombre de rounds après avoir terminé un Cindy.\n\nSéances Cindy exclues des quêtes d'exercices : les AMRAP ne gonflent plus les objectifs des quêtes perso.\n\nSplash screen : l'animation de saison ne s'affiche plus qu'une seule fois.\n\nChargement amélioré : la barre de chargement ne bloque plus à 95%.`,
  },
  {
    id: 'update-2026-09-08',
    date: '8 septembre 2026',
    title: 'Quêtes intelligentes & améliorations',
    summary: 'Quêtes personnalisées, classement mensuel, suppression de séances et plus.',
    details: `Quêtes personnalisées : les quêtes de la semaine sont maintenant générées automatiquement en fonction de tes exercices de la semaine précédente. Plus tu progresses, plus les objectifs augmentent.\n\nClassement mensuel : le classement du groupe se réinitialise le 1er de chaque mois avec un timer de countdown.\n\nStats du dashboard alignées sur le reset des quêtes (lundi 10h).\n\nSuppression de séances : tu peux maintenant supprimer une séance depuis la page récap. Elle disparaît de tes stats, du classement et des quêtes.\n\nModification de séances : corrige tes reps après avoir terminé une séance avec le bouton édition.\n\nCartes cliquables partout : toutes les cartes (même non débloquées) sont cliquables dans la Collection et le Profil avec une vue détaillée.\n\nLesté / Poids : le toggle "Lesté" est remplacé par un stepper simple pour ajuster le poids directement.`,
  },
  {
    id: 'update-2026-09-06',
    date: '6 septembre 2026',
    title: 'Running & Échanges de cartes',
    summary: 'Nouvelle catégorie Running et système d\'échange entre membres.',
    details: `Nouvelle catégorie Running avec 6 exercices dédiés (Course, Sprint, Fractionné, Course en côte, Tempo run, Marche rapide). Un formulaire spécifique permet de saisir le temps, la distance, le dénivelé et calcule automatiquement l'allure en min/km.\n\nSystème d'échange de cartes entre membres d'un même groupe : propose une de tes cartes contre celle d'un autre joueur, il accepte ou refuse.\n\nNouvelles quêtes running qui s'ajoutent au pool existant. Les quêtes se régénèrent le lundi à 10h avec un timer visible dans le pass.\n\nCoffres spéciaux : coffre Rare garanti au niveau 15, coffre Épique garanti au niveau 30, avec des couleurs distinctes dans le pass.`,
  },
  {
    id: 'update-2026-09-05',
    date: '5 septembre 2026',
    title: 'Groupes & Profils',
    summary: 'Photos de profil personnalisables, explorer les groupes et splash de saison.',
    details: `Photo de profil personnalisable avec les personnages des cartes débloquées, visible dans le classement et la liste des membres du groupe.\n\nNouvelle fonctionnalité "Explorer les groupes" : une barre de recherche accessible en permanence pour voir tous les groupes et leurs membres.\n\nModal de prévisualisation quand tu cliques sur un membre du groupe avec ses stats et un bouton vers son profil complet.\n\nAnimation d'intro splash pour la Saison 1 : Casier Judiciaire à l'ouverture de l'app.\n\nRecherche de groupes améliorée avec gestion des accents.`,
  },
];

export default function Dashboard() {
  const { displayName: myName } = useAuth();
  const navigate = useNavigate();
  const { sessions, loading } = useUserSessions();
  const [showUpdates, setShowUpdates] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);

  const lastSeenUpdate = localStorage.getItem('calicrew-last-seen-update');
  const hasUnread = lastSeenUpdate !== UPDATES[0]?.id;

  const creatine = useCreatine();

  function openUpdates() {
    setShowUpdates(true);
    localStorage.setItem('calicrew-last-seen-update', UPDATES[0]?.id || '');
  }

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
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Salut {myName}</h1>
        <SeasonalBadge compact />
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="icon-btn notif-btn" onClick={openUpdates}>
            <Bell size={18} />
            {hasUnread && <span className="notif-dot" />}
          </button>
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

          <span className="stats-period">Cette semaine</span>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.weekSessions}</span>
              <span className="stat-label">Séances</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.weekReps}</span>
              <span className="stat-label">Reps</span>
            </div>
          </div>

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

          <button className="primary-btn home-cta" onClick={() => navigate('/session/new')}>
            <Plus size={20} /> Nouvelle séance
          </button>
          <button className="home-secondary-cta" onClick={() => navigate('/programs')}>
            <ClipboardList size={18} />
            <span>Partir d'un programme</span>
            <ChevronRight size={16} />
          </button>

          <section className="section">
            <h2>Dernières séances</h2>
            {recentSessions.length === 0 ? (
              <p className="empty">Aucune séance pour l'instant. Lance-toi !</p>
            ) : (
              <div className="session-list">
                {recentSessions.map((s) => (
                  <div key={s.id} className="session-card" onClick={() => navigate(`/session/${s.id}`)}>
                    <div className="session-card-top">
                      <span className="session-date">
                        {format(new Date(s.date), 'd MMM', { locale: fr })}
                          <span className="session-categories"> • {s.mode === 'amrap' ? amrapTitle(s.amrapName) : getSessionCategories(s)}</span>
                      </span>
                      <span className={`session-badge ${s.completed ? 'done' : 'partial'}`}>
                        {s.completed ? 'Terminée' : 'En cours'}
                      </span>
                    </div>
                    <div className="session-card-bottom">
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

      {showUpdates && (
        <div className="modal-overlay" onClick={() => setShowUpdates(false)}>
          <div className="updates-modal" onClick={(e) => e.stopPropagation()}>
            <div className="updates-modal-header">
              <h3>Nouveautés</h3>
              <button className="member-modal-close" onClick={() => setShowUpdates(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="updates-list">
              {UPDATES.map((update) => {
                const isExpanded = expandedUpdate === update.id;
                return (
                  <div key={update.id} className="update-card" onClick={() => setExpandedUpdate(isExpanded ? null : update.id)}>
                    <div className="update-card-header">
                      <div>
                        <span className="update-card-title">{update.title}</span>
                        <span className="update-card-date">{update.date}</span>
                      </div>
                      <ChevronRight size={16} className={`update-chevron ${isExpanded ? 'rotated-90' : ''}`} />
                    </div>
                    {!isExpanded && (
                      <p className="update-card-summary">{update.summary}</p>
                    )}
                    {isExpanded && (
                      <div className="update-card-details">
                        {update.details.split('\n\n').map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
