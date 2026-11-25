import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import type { Session, Exercise, ExerciseLog, UserProgress } from '../types';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Square, Play, Settings, Calendar, Trash2, Pencil, Plus, Minus, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CATEGORY_LABELS, DEFAULT_EXERCISES } from '../lib/exercises';
import { amrapTitle, circuitLabel, materializeAmrapSets, repsPerRound, roundTotals } from '../lib/amrap';
import { sportCoXp, enduranceXp } from '../lib/passes';
import { accordeXpProfil, xpSeance } from '../lib/niveaux';
import type { GainSeance } from '../lib/niveaux';
import { sessionReps, getUnit, unitLabel, setWeight } from '../lib/stats';
import { previensSeance } from '../lib/notify';

/** Pas d'incrément : 5 s pour un isométrique, 1 rep sinon. */
import Loader from '../components/Loader';
import SetCard from '../components/SetCard';
import EchauffementLive from '../components/EchauffementLive';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Périmètre du cadran, pour animer l'arc par son pointillé. */
const CIRCONFERENCE = 2 * Math.PI * 128;

/** Idem pour la petite bulle de pause. */
const ARC_BULLE = 2 * Math.PI * 25;

/*
 * Au-delà de trois heures, on ne demande plus l'heure : on demande la durée.
 *
 * La durée d'une séance est son heure de fin moins son heure de départ. Qui
 * oublie d'appuyer sur « Terminer » et s'en souvient le surlendemain inscrit
 * donc cinquante-trois heures d'entraînement — c'est arrivé, et ça fausse le
 * classement du mois comme les succès de durée. Trois heures est au-dessus
 * de toute vraie séance et bien en dessous d'un oubli.
 */
const SEANCE_OUBLIEE = 3 * 3600;
const DUREES_OUBLI = [30, 45, 60, 90, 120];
const DUREE_OUBLI_DEFAUT = 60;

/** « mardi 24 novembre » → « Mardi 24 novembre ». */
function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useUserSessions();
  const [session, setSession] = useState<Session | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<number>(0);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  // Chrono session
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Chrono pause
  const [restTime, setRestTime] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restDuration, setRestDuration] = useState(90); // par défaut 1:30
  /** Le bloc de pause est-il à l'écran ? Sinon, la bulle prend le relais. */
  const [restVisible, setRestVisible] = useState(true);
  const restSectionRef = useRef<HTMLDivElement | null>(null);
  const restObsRef = useRef<IntersectionObserver | null>(null);
  const [showRestSettings, setShowRestSettings] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // AMRAP
  const [amrapRounds, setAmrapRounds] = useState(0);
  /** Ce que la séance vient de rapporter, montré sur le récap. */
  const [gainXp, setGainXp] = useState<GainSeance | null>(null);
  const [amrapTimeUp, setAmrapTimeUp] = useState(false);
  /** Coché avant de terminer : la séance ne donnera pas de coffre. */
  const [noReward, setNoReward] = useState(false);
  /** Ordre d'affichage : exercice par exercice, ou un tour de chaque. */
  const [layout, setLayout] = useState<'exercise' | 'circuit'>('exercise');

  // Confirmation terminer
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [pickedExercise, setPickedExercise] = useState<Exercise | null>(null);
  const [newExSets, setNewExSets] = useState(4);
  const [newExTarget, setNewExTarget] = useState(10);
  const [showFinish, setShowFinish] = useState(false);
  /** La durée rattrapée, en minutes, quand la séance a été oubliée ouverte. */
  const [dureeOubli, setDureeOubli] = useState(DUREE_OUBLI_DEFAUT);
  const [dureeLibre, setDureeLibre] = useState('');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restRef.current) clearInterval(restRef.current);
    };
  }, [id]);

  // Chrono session en fond
  useEffect(() => {
    if (session && session.amrapRounds !== undefined) setAmrapRounds(session.amrapRounds);
    if (session?.layout) setLayout(session.layout);
    if (session && session.startedAt && !session.completed) {
      startTimeRef.current = session.startedAt;
      setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
      timerRef.current = setInterval(() => {
        const now = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(now);
        if (session.mode === 'amrap' && session.amrapDuration && now >= session.amrapDuration && !amrapTimeUp) {
          setAmrapTimeUp(true);
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.startedAt, session?.completed]);

  async function loadSession() {
    if (!id) return;
    const snap = await getDoc(doc(db, 'sessions', id));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as Session;
      setSession(data);
      if (data.completed) setFinished(true);
    }
  }

  /*
   * Une ref de rappel, et non un effet : le bloc de pause n'existe que dans
   * la vue « séance en cours ». Un effet monté une fois ne saurait pas qu'on
   * revient d'un récap ou d'un échauffement, et n'observerait plus rien.
   */
  const observeRest = useCallback((noeud: HTMLDivElement | null) => {
    restObsRef.current?.disconnect();
    restSectionRef.current = noeud;
    if (!noeud) {
      setRestVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entree]) => setRestVisible(entree.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(noeud);
    restObsRef.current = obs;
  }, []);

  useEffect(() => () => restObsRef.current?.disconnect(), []);

  // Chrono de pause
  function startRest() {
    setRestTime(restDuration);
    setRestRunning(true);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current);
          setRestRunning(false);
          // Vibration si supporté
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRest() {
    if (restRef.current) clearInterval(restRef.current);
    setRestRunning(false);
    setRestTime(0);
  }

  /** La préférence est enregistrée : on la retrouve en rouvrant la séance. */
  async function switchLayout(next: 'exercise' | 'circuit') {
    if (!session || !id || next === layout) return;
    setLayout(next);
    setSession({ ...session, layout: next });
    try {
      await updateDoc(doc(db, 'sessions', id), { layout: next });
    } catch (err) {
      console.error('Changement de vue non enregistré:', err);
    }
  }

  async function logSet(exerciseIndex: number, setIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const set = updated.exercises[exerciseIndex].sets[setIndex];
    if (set.completed) {
      set.completed = false;
      set.reps = 0;
    } else {
      set.reps = updated.exercises[exerciseIndex].targetReps;
      set.completed = true;
      // Lancer le chrono de pause automatiquement
      startRest();
    }

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
    });
  }

  async function adjustReps(exerciseIndex: number, setIndex: number, delta: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const set = updated.exercises[exerciseIndex].sets[setIndex];
    set.reps = Math.max(0, set.reps + delta);
    set.completed = set.reps > 0;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), {
      exercises: updated.exercises,
    });
  }

  /** La charge peut évoluer d'une série à l'autre (montée en pyramide, dégressif). */
  async function adjustSetWeight(exerciseIndex: number, setIndex: number, delta: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    const set = ex.sets[setIndex];
    set.weight = Math.max(0, Math.round((setWeight(ex, set) + delta) * 2) / 2);

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  /** Ajoute une série, en reprenant la charge de la dernière. */
  async function addSet(exerciseIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    const last = ex.sets[ex.sets.length - 1];

    ex.sets = [...ex.sets, { reps: 0, completed: false, ...(last ? { weight: setWeight(ex, last) } : {}) }];
    ex.targetSets = ex.sets.length;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  /**
   * Retire la dernière série. Refusée si elle est validée : on ne supprime
   * jamais une performance déjà enregistrée sans que ce soit explicite.
   */
  async function removeSet(exerciseIndex: number) {
    if (!session || !id) return;
    const updated = { ...session };
    const ex = updated.exercises[exerciseIndex];
    if (ex.sets.length <= 1 || ex.sets[ex.sets.length - 1].completed) return;

    ex.sets = ex.sets.slice(0, -1);
    ex.targetSets = ex.sets.length;

    setSession({ ...updated });
    await updateDoc(doc(db, 'sessions', id), { exercises: updated.exercises });
  }

  async function openAddExercise() {
    setPickedExercise(null);
    setShowAddExercise(true);
    if (!user || customExercises.length > 0) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'customExercises'), where('userId', '==', user.uid))
      );
      setCustomExercises(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
    } catch {
      setCustomExercises([]);
    }
  }

  function pickExercise(ex: Exercise) {
    setPickedExercise(ex);
    setNewExSets(4);
    setNewExTarget(ex.defaultUnit === 'seconds' ? 30 : 10);
  }

  /** Ajoute un exercice oublié au moment de préparer la séance. */
  async function addExerciseToSession(exercise: Exercise, sets: number, target: number) {
    if (!session || !id) return;
    const log: ExerciseLog = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseCategory: exercise.category,
      targetSets: sets,
      targetReps: target,
      sets: Array.from({ length: sets }, () => ({ reps: 0, completed: false })),
    };
    if (exercise.defaultUnit === 'seconds') log.unit = 'seconds';

    const exercises = [...session.exercises, log];
    setSession({ ...session, exercises });
    setExpandedExercise(exercises.length - 1);
    setShowAddExercise(false);
    await updateDoc(doc(db, 'sessions', id), { exercises });
  }

  /** Retire un exercice ajouté par erreur. */
  async function removeExerciseFromSession(exerciseIndex: number) {
    if (!session || !id) return;
    const exercises = session.exercises.filter((_, i) => i !== exerciseIndex);
    setSession({ ...session, exercises });
    setExpandedExercise(-1);
    await updateDoc(doc(db, 'sessions', id), { exercises });
  }

  async function addAmrapRound() {
    if (!session || !id) return;
    const newRounds = amrapRounds + 1;
    setAmrapRounds(newRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds: newRounds });
  }

  async function removeAmrapRound() {
    if (!session || !id || amrapRounds <= 0) return;
    const newRounds = amrapRounds - 1;
    setAmrapRounds(newRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds: newRounds });
  }

  function editReps(exIdx: number, setIdx: number, value: number) {
    if (!session) return;
    const updated = { ...session, exercises: session.exercises.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => {
        if (si !== setIdx) return s;
        return { reps: value, completed: value > 0 };
      })};
    })};
    setSession(updated);
  }

  async function saveEdits() {
    if (!session || !id) return;
    await updateDoc(doc(db, 'sessions', id), { exercises: session.exercises });
    await refresh();
    setEditing(false);
  }

  async function saveAmrapEdit() {
    if (!session || !id) return;
    const exercises = materializeAmrapSets(session.exercises, amrapRounds);
    await updateDoc(doc(db, 'sessions', id), { amrapRounds, exercises });
    setSession({ ...session, amrapRounds, exercises });
    await refresh();
    setEditing(false);
  }

  async function deleteSession() {
    if (!id) return;
    await deleteDoc(doc(db, 'sessions', id));
    await refresh();
    navigate('/');
  }

  /* Verrou synchrone : deux appuis rapides sur « Terminer » liraient la même
     progression et accorderaient deux fois l'XP de la même séance. Une ref
     change dans l'appui même, un état React seulement au rendu suivant. */
  const finEnCours = useRef(false);

  async function finishSession() {
    if (!session || !id) return;
    if (finEnCours.current) return;
    finEnCours.current = true;
    try {
      await terminerLaSeance();
    } finally {
      finEnCours.current = false;
    }
  }

  async function terminerLaSeance() {
    if (!session || !id) return;
    const brut = Math.floor((Date.now() - (session.startedAt || session.createdAt)) / 1000);
    const isAmrapSession = session.mode === 'amrap';
    /*
     * Un AMRAP dure le temps qu'on lui a donné, point. Son chrono se fige
     * déjà à la fin du temps à l'écran ; sa durée enregistrée doit en faire
     * autant, sinon un AMRAP de vingt minutes laissé ouvert une nuit en
     * compte douze heures.
     */
    const duration = isAmrapSession
      ? Math.min(brut, session.amrapDuration || brut)
      : brut > SEANCE_OUBLIEE
        ? dureeOubli * 60
        : brut;
    // Un AMRAP ne logue rien pendant l'effort : on matérialise ici les tours
    // en séries, sinon ses reps ne compteraient ni dans les classements ni
    // dans les quêtes.
    const exercises = isAmrapSession
      ? materializeAmrapSets(session.exercises, amrapRounds)
      : session.exercises;
    const updateData: Record<string, unknown> = { completed: true, duration, exercises };
    if (isAmrapSession) updateData.amrapRounds = amrapRounds;
    if (noReward) updateData.noReward = true;
    setSession({ ...session, exercises, noReward });
    await updateDoc(doc(db, 'sessions', id), updateData);

    /*
     * Les récompenses de la séance : le coffre de fin, et l'XP de profil.
     *
     * Une séance « sans coffre » ne donne pas d'XP non plus. C'est tout
     * l'objet de cette case : elle sert à enregistrer un rattrapage ou un
     * essai juste après une vraie séance, et payer l'XP deux fois serait
     * exactement le double paiement qu'elle existe pour éviter. Les reps,
     * elles, comptent toujours — dans les stats et les classements.
     */
    if (!noReward) {
      try {
        const ref = doc(db, 'userProgress', session.userId);
        const snap = await getDoc(ref);
        const progress = (snap.data() || {}) as UserProgress;

        const brute = xpSeance({ exercises, duration });
        const aujourdhui = new Date().toISOString().split('T')[0];
        const gain = accordeXpProfil(progress, brute, aujourdhui);

        /* Une seule écriture pour le coffre de fin, l'XP et les coffres des
           niveaux franchis. Deux écritures séparées, c'est la porte ouverte
           à une séance qui donne son coffre mais pas son XP parce que le
           réseau a lâché entre les deux. */
        await updateDoc(ref, {
          chestsToOpen: [
            ...(progress.chestsToOpen || []),
            { rarity: 'commune' as const, pool: 'current' },
            ...gain.coffres,
          ],
          xp: gain.xp,
          xpJour: gain.xpJour,
          niveauxPris: gain.niveauxPris,
        });
        setGainXp(gain);
      } catch (err) {
        // La progression peut ne pas exister encore : la séance est déjà
        // enregistrée, elle, et c'est le principal.
        console.error('XP de fin de séance impossible :', err);
      }
    }

    // Après l'enregistrement, jamais avant : le serveur relit les séances
    // pour savoir qui vient d'être doublé, et il lui faut celle-ci.
    previensSeance();

    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    setShowFinish(false);
  }

  async function passerEchauffement() {
    if (!id) return;
    const quand = Date.now();
    // On écrit l'état avant la réponse du serveur : rester sur la page
    // d'échauffement le temps d'un aller-retour donnerait l'impression que
    // le bouton n'a pas marché.
    setSession((prev) => (prev ? { ...prev, warmupDoneAt: quand } : prev));
    try {
      await updateDoc(doc(db, 'sessions', id), { warmupDoneAt: quand });
    } catch (err) {
      console.error('Erreur passage échauffement:', err);
    }
  }

  if (!session) return <div className="page loading"><Loader /></div>;

  // Running, vélo et sport co ont besoin du formulaire distance/temps : on ne
  // peut pas les ajouter à une séance en séries/reps déjà lancée.
  const inSession = new Set(session.exercises.map((e) => e.exerciseId));
  const addableExercises = [...DEFAULT_EXERCISES, ...customExercises].filter(
    (e) =>
      e.category !== 'running' &&
      e.category !== 'velo' &&
      e.category !== 'sportco' &&
      !inSession.has(e.id)
  );
  const addableCategories = [...new Set(addableExercises.map((e) => e.category))];

  // Un circuit compte autant de tours que l'exercice qui en a le plus.
  const circuitRounds = session.exercises.reduce((max, ex) => Math.max(max, ex.sets.length), 0);
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const displayDuration = session.duration && session.duration > 0 ? session.duration : elapsed;

  /*
   * L'échauffement passe avant tout le reste.
   *
   * Il fait partie de la séance : le chrono tourne déjà, et c'est le même
   * document. On ne le revoit plus une fois passé — ni en rouvrant une
   * séance terminée.
   */
  if (!finished && !session.completed && session.warmup?.length && !session.warmupDoneAt) {
    return (
      <EchauffementLive
        items={session.warmup}
        chrono={formatTime(elapsed)}
        onRetour={() => navigate('/')}
        onPasser={passerEchauffement}
      />
    );
  }

  if (finished) {
    const totalReps = sessionReps(session);
    const categories = [...new Set(session.exercises.map((e) => e.exerciseCategory || '').filter(Boolean))];
    const categoryLabel = categories.map((c) => (CATEGORY_LABELS as Record<string, string>)[c] || c).join(', ');
    const isAmrap = session.mode === 'amrap';
    const displayRounds = editing ? amrapRounds : (session.amrapRounds || amrapRounds);

    return (
      <div className="page rec-page">
        {/* Le bandeau du récap : la date en titre, et le résultat de la
            séance en gros — les tours pour un AMRAP, les reps sinon. Tout ça
            tenait dans une carte encadrée où les trois chiffres avaient le
            même poids que la date et que la liste des catégories. */}
        <header className="rec-entete">
          <div className="rec-entete-fond" />
          <div className="rec-entete-contenu">
            <div className="rec-haut">
              <button className="rec-retour" onClick={() => navigate('/')} aria-label="Revenir à l'accueil">
                <ArrowLeft size={20} />
              </button>
              <span className="rec-kicker">
                {isAmrap ? `AMRAP · ${session.amrapDuration ? Math.floor(session.amrapDuration / 60) : 20} min` : 'Récap'}
              </span>
              <button
                className="rec-crayon"
                aria-label={editing ? 'Enregistrer' : 'Modifier'}
                onClick={() => editing ? (isAmrap ? saveAmrapEdit() : saveEdits()) : setEditing(true)}
              >
                {editing ? <Check size={19} /> : <Pencil size={17} />}
              </button>
            </div>
            <h1 className="rec-titre">
              <Calendar size={15} />
              {/* Seule la première lettre prend la majuscule : en français le
                  mois n'en porte pas, et capitaliser toute la ligne donnait
                  « Mardi 24 Novembre 2026 ». */}
              <span>{majuscule(format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr }))}</span>
            </h1>
            <div className="rec-mesures">
              <span className="rec-chiffre">{isAmrap ? displayRounds : totalReps}</span>
              <span className="rec-unite">{isAmrap ? `round${displayRounds > 1 ? 's' : ''}` : 'reps'}</span>
              <span className="rec-reste">
                {formatTime(displayDuration)}
                {!isAmrap && ` · ${completedSets}/${totalSets} séries`}
              </span>
            </div>
            <div className="rec-etiquettes">
              {/* Ce que la séance vient de rapporter. Affiché seulement au
                  retour de la séance, pas en rouvrant un vieux récap : à ce
                  moment-là l'XP a déjà été comptée, et la réafficher ferait
                  croire qu'on vient de la regagner. */}
              {gainXp && gainXp.accorde > 0 && (
                <span className="rec-gain">
                  +{gainXp.accorde} XP
                  {gainXp.niveauApres > gainXp.niveauAvant && (
                    <em> · niveau {gainXp.niveauApres}</em>
                  )}
                </span>
              )}
              {gainXp?.plafonne && (
                <span className="rec-plafond">Plafond du jour atteint</span>
              )}
              {session.noReward && <span className="recap-no-reward">Séance sans coffre</span>}
              {!isAmrap && categoryLabel && <span className="rec-categories">{categoryLabel}</span>}
            </div>
          </div>
          {!isAmrap && (
            <div className="rec-barre">
              <div className="rec-barre-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </header>

        {isAmrap ? (
          <div className="recap-exercise-card">
            {/* Le score d'abord : un AMRAP se raconte en tours, pas en séries. */}
            <div className="amrap-score">
              <b>{displayRounds}</b>
              <span>
                round{displayRounds > 1 ? 's' : ''} en{' '}
                {session.amrapDuration ? Math.floor(session.amrapDuration / 60) : 20} min
              </span>
            </div>

            {editing && (
              <div className="amrap-edit-rounds" style={{ marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rounds</span>
                <div className="stepper">
                  <button onClick={() => setAmrapRounds((r) => Math.max(0, r - 1))}><Minus size={16} /></button>
                  <span>{amrapRounds}</span>
                  <button onClick={() => setAmrapRounds((r) => r + 1)}><Plus size={16} /></button>
                </div>
              </div>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              <div className="amrap-detail-ligne">
                <em>Durée</em>
                <b>{formatTime(displayDuration)}</b>
              </div>
              {roundTotals(session.exercises, displayRounds).map((t, i) => (
                <div key={i} className="amrap-detail-ligne">
                  <em>{t.name}</em>
                  <b>{t.total}{t.unit === 'sec' ? ' s' : ''}</b>
                </div>
              ))}
              {/* Un circuit qui ne tient qu'en secondes n'a pas de total en
                  reps : la ligne disparaît plutôt que d'annoncer zéro. */}
              {repsPerRound(session.exercises) > 0 && (
                <div className="amrap-detail-ligne">
                  <em>Total</em>
                  <b>{displayRounds * repsPerRound(session.exercises)} reps</b>
                </div>
              )}
              {/* Le circuit en légende, et non en ligne de tableau : à quatre
                  exercices il déborde de sa colonne et casse l'alignement. */}
              <p className="amrap-detail-circuit">Un round : {circuitLabel(session.exercises)}</p>
            </div>
          </div>
        ) : (
          <div className="recap-exercises">
            {session.exercises.map((ex, exIdx) => {
              if (ex.exerciseCategory === 'sportco') {
                return (
                  <div key={exIdx} className="recap-exercise-card">
                    <div className="recap-exercise-header">
                      <div>
                        <h3>{ex.exerciseName}</h3>
                      </div>
                      <span className="recap-exercise-badge done">Complété</span>
                    </div>
                    <div className="recap-stats-row" style={{ marginTop: '0.75rem' }}>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDuration ? Math.floor(ex.runDuration / 60) : 0}</span>
                        <span>min</span>
                      </div>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">+{sportCoXp(ex.runDuration || 0)}</span>
                        <span>CaliPass</span>
                      </div>
                    </div>
                  </div>
                );
              }
              if (ex.exerciseCategory === 'running' || ex.exerciseCategory === 'velo') {
                const isVelo = ex.exerciseCategory === 'velo';
                const paceMin = ex.runDistance && ex.runDistance > 0 && ex.runDuration
                  ? ex.runDuration / 60 / ex.runDistance : 0;
                const paceM = Math.floor(paceMin);
                const paceS = Math.round((paceMin - paceM) * 60);
                const speed = ex.runDuration && ex.runDuration > 0
                  ? (ex.runDistance || 0) / (ex.runDuration / 3600) : 0;
                return (
                  <div key={exIdx} className="recap-exercise-card">
                    <div className="recap-exercise-header">
                      <div>
                        <h3>{ex.exerciseName}</h3>
                      </div>
                      <span className="recap-exercise-badge done">Complété</span>
                    </div>
                    <div className="recap-stats-row" style={{ marginTop: '0.75rem' }}>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDuration ? Math.floor(ex.runDuration / 60) : 0}</span>
                        <span>min</span>
                      </div>
                      <div className="recap-mini-stat">
                        <span className="recap-mini-value">{ex.runDistance || 0}</span>
                        <span>km</span>
                      </div>
                      {isVelo ? (
                        speed > 0 && (
                          <div className="recap-mini-stat">
                            <span className="recap-mini-value">{speed.toFixed(1)}</span>
                            <span>km/h</span>
                          </div>
                        )
                      ) : (
                        paceMin > 0 && (
                          <div className="recap-mini-stat">
                            <span className="recap-mini-value">{paceM}:{String(paceS).padStart(2, '0')}</span>
                            <span>min/km</span>
                          </div>
                        )
                      )}
                      {(ex.runElevation || 0) > 0 && (
                        <div className="recap-mini-stat">
                          <span className="recap-mini-value">{ex.runElevation}</span>
                          <span>m D+</span>
                        </div>
                      )}
                      {enduranceXp(ex.runDuration || 0, ex.exerciseId) > 0 && (
                        <div className="recap-mini-stat">
                          <span className="recap-mini-value">+{enduranceXp(ex.runDuration || 0, ex.exerciseId)}</span>
                          <span>CaliPass</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const exCompletedSets = ex.sets.filter((s) => s.completed).length;
              const exTotalReps = ex.sets.reduce((s, set) => s + (set.completed ? set.reps : 0), 0);
              const allDone = exCompletedSets === ex.sets.length;

              return (
                <div key={exIdx} className="recap-exercise-card">
                  <div className="recap-exercise-header">
                    <div>
                      <h3>{ex.exerciseName}</h3>
                      <span className="recap-exercise-sub">
                        Objectif : {ex.targetReps} reps × {ex.sets.length} séries{ex.weighted && ex.weight ? ` • ${ex.weight} kg${ex.weightType === 'halteres' ? ' (haltères)' : ex.weightType === 'barre' ? ' (barre)' : ''}` : ''}
                      </span>
                    </div>
                    <span className={`recap-exercise-badge ${allDone ? 'done' : 'partial'}`}>
                      {allDone ? 'Complet' : `${exCompletedSets}/${ex.sets.length}`}
                    </span>
                  </div>
                  <div className="recap-sets-grid">
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className={`recap-set ${set.completed ? 'completed' : 'missed'} ${editing ? 'editing' : ''}`}>
                        <span className="recap-set-label">S{setIdx + 1}</span>
                        {editing ? (
                          <input
                            type="number"
                            className="recap-set-input"
                            value={set.reps}
                            onChange={(e) => editReps(exIdx, setIdx, Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        ) : (
                          <span className="recap-set-reps">{set.completed ? set.reps : '—'}</span>
                        )}
                        {!editing && set.completed && set.reps >= ex.targetReps && (
                          <Check size={12} className="recap-set-check" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="recap-exercise-total">
                    Total : {exTotalReps} {unitLabel(getUnit(ex))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="recap-actions">
          <button className="primary-btn" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
          <button className="delete-session-btn" onClick={() => setShowDelete(true)}>
            <Trash2 size={16} /> Supprimer la séance
          </button>
        </div>

        {showDelete && (
          <div className="modal-overlay" onClick={() => setShowDelete(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Supprimer cette séance ?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Elle sera retirée de tes stats, du classement et des quêtes.
              </p>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowDelete(false)}>
                  Annuler
                </button>
                <button className="primary-btn" style={{ flex: 1, background: '#ef4444' }} onClick={deleteSession}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mode AMRAP live
  if (session.mode === 'amrap') {
    const amrapTotal = session.amrapDuration || 1200;
    const remaining = Math.max(0, amrapTotal - elapsed);
    const amrapProgress = ((amrapTotal - remaining) / amrapTotal) * 100;
    const tempsEcoule = remaining === 0;
    // Le chrono de l'en-tête se fige à la fin du temps : un AMRAP de 20 min
    // qui affiche 21:34 parce qu'on a mis une minute à ranger son téléphone
    // n'a aucun sens — et c'est ce chiffre qui part dans le récap.
    const chrono = tempsEcoule ? amrapTotal : elapsed;

    return (
      <div className="page amrap-live">
        <header className="amrap-live-top">
          <div className="amrap-live-fond" />
          <div className="amrap-live-contenu">
            <button className="amrap-live-retour" onClick={() => navigate('/')} aria-label="Revenir à l'accueil">
              <ArrowLeft size={20} />
            </button>
            <span className="amrap-live-nom">{amrapTitle(session.amrapName)}</span>
            <span className="amrap-live-temps">
              {formatTime(chrono)} / {formatTime(amrapTotal)}
            </span>
          </div>
        </header>

        {/*
          * Toute la moitié haute valide un round.
          *
          * En plein effort on ne vise pas : on tape l'écran. Le cadran, le
          * compteur et le bouton ne font donc qu'une seule zone de frappe,
          * et seules les corrections — annuler, terminer — restent des
          * boutons à part, hors de portée d'un geste machinal.
          */}
        <div
          className={`amrap-zone ${tempsEcoule ? 'fini' : ''}`}
          role={tempsEcoule ? undefined : 'button'}
          tabIndex={tempsEcoule ? undefined : 0}
          onClick={tempsEcoule ? undefined : addAmrapRound}
        >
          <div className={`amrap-cadran ${remaining <= 10 ? 'ending' : ''}`}>
            <svg viewBox="0 0 280 280" aria-hidden="true">
              <circle className="amrap-cadran-fond" cx="140" cy="140" r="128" />
              <circle
                className="amrap-cadran-arc"
                cx="140" cy="140" r="128"
                strokeDasharray={CIRCONFERENCE}
                strokeDashoffset={CIRCONFERENCE * (amrapProgress / 100)}
              />
            </svg>
            <div className="amrap-cadran-centre">
              <span className="amrap-cadran-valeur">{formatTime(remaining)}</span>
              <span className="amrap-cadran-label">
                {tempsEcoule ? 'terminé' : 'restant'}
              </span>
            </div>
          </div>

          <div className="amrap-compteur">
            <b>{amrapRounds}</b>
            <span>round{amrapRounds > 1 ? 's' : ''}</span>
          </div>

          <div className="amrap-frappe">
            {tempsEcoule ? (
              <span className="amrap-frappe-fini">Chrono terminé</span>
            ) : (
              <>
                <Check size={20} />
                <span>Round complété</span>
                <small>touche n'importe où</small>
              </>
            )}
          </div>
        </div>

        <div className="amrap-circuit">
          {session.exercises.map((ex, i) => (
            <span key={`${ex.exerciseId}-${i}`} className="amrap-pastille">
              <b>{getUnit(ex) === 'seconds' ? `${ex.targetReps} s` : ex.targetReps}</b>
              {' '}{ex.exerciseName.toLowerCase()}
            </span>
          ))}
        </div>

        <div className="amrap-corrections">
          {tempsEcoule && (
            <button className="amrap-undo-btn" onClick={addAmrapRound}>
              Ajouter un round
            </button>
          )}
          {amrapRounds > 0 && (
            <button className="amrap-undo-btn" onClick={removeAmrapRound}>
              Annuler le dernier round
            </button>
          )}
        </div>

        <button className="finish-btn floating-btn" onClick={() => setShowFinish(true)}>
          Terminer
        </button>

        {showFinish && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Terminer {amrapTitle(session.amrapName)} ?</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {amrapRounds} round{amrapRounds > 1 ? 's' : ''} en {formatTime(elapsed)}
              </p>
              <label className="no-reward-row">
                <input type="checkbox" checked={noReward} onChange={() => setNoReward(!noReward)} />
                <span>
                  <strong>Séance sans coffre</strong>
                  <em>Pour un rattrapage ou un essai. Les reps comptent quand même.</em>
                </span>
              </label>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowFinish(false)}>
                  Continuer
                </button>
                <button className="primary-btn" style={{ flex: 1 }} onClick={finishSession}>
                  Terminer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page seance-live">
      {/* Le bandeau de la séance.
       *
       * Le chrono était une mention de 0,9 rem à droite du titre, et les
       * séries faites vivaient plus bas dans une gélule à part. Ce sont
       * pourtant les deux seules choses qu'on regarde entre deux séries :
       * le chrono passe en gros, le compte à côté, et la progression devient
       * le trait qui ferme le bandeau. */}
      <header className="liv-entete">
        <div className="liv-entete-fond" />
        <div className="liv-entete-contenu">
          <div className="liv-haut">
            <button className="liv-retour" onClick={() => navigate('/')} aria-label="Revenir à l'accueil">
              <ArrowLeft size={20} />
            </button>
            <span className="liv-kicker">Séance en cours</span>
          </div>
          <div className="liv-mesures">
            <span className="liv-chrono">{formatTime(elapsed)}</span>
            <span className="liv-series">{completedSets}/{totalSets} séries</span>
          </div>
        </div>
        <div className="liv-barre">
          <div className="liv-barre-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Chrono de pause */}
      <div className="rest-timer-section" ref={observeRest}>
        <div className="rest-timer-row">
          {restRunning ? (
            <div className={`rest-timer-display ${restTime <= 5 ? 'ending' : ''}`}>
              <span className="rest-label">Pause</span>
              <span className="rest-countdown">{formatTime(restTime)}</span>
              <button className="rest-stop-btn" onClick={stopRest}>
                <Square size={14} /> Stop
              </button>
            </div>
          ) : (
            <button className="rest-start-btn" onClick={startRest}>
              <Play size={14} /> Pause {formatTime(restDuration)}
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowRestSettings(!showRestSettings)}>
            <Settings size={18} />
          </button>
        </div>
        {showRestSettings && (
          <div className="rest-settings">
            <span>Durée de pause :</span>
            <div className="rest-time-picker">
              <div className="time-picker-col">
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.min(599, d + 60))}>
                  <ChevronUp size={20} />
                </button>
                <span className="time-picker-value">{String(Math.floor(restDuration / 60)).padStart(2, '0')}</span>
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.max(5, d - 60))}>
                  <ChevronDown size={20} />
                </button>
                <span className="time-picker-label">min</span>
              </div>
              <span className="time-picker-sep">:</span>
              <div className="time-picker-col">
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.min(599, d + 5))}>
                  <ChevronUp size={20} />
                </button>
                <span className="time-picker-value">{String(restDuration % 60).padStart(2, '0')}</span>
                <button className="time-picker-arrow" onClick={() => setRestDuration((d) => Math.max(5, d - 5))}>
                  <ChevronDown size={20} />
                </button>
                <span className="time-picker-label">sec</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {session.exercises.length > 1 && (
        <div className="layout-switch">
          <button
            className={`layout-switch-btn ${layout === 'exercise' ? 'active' : ''}`}
            onClick={() => switchLayout('exercise')}
          >
            Par exercice
          </button>
          <button
            className={`layout-switch-btn ${layout === 'circuit' ? 'active' : ''}`}
            onClick={() => switchLayout('circuit')}
          >
            En circuit
          </button>
        </div>
      )}

      {layout === 'circuit' ? (
        <div className="live-circuit">
          {Array.from({ length: circuitRounds }, (_, round) => {
            // Un exercice peut avoir moins de séries que les autres : il sort
            // simplement du circuit une fois les siennes épuisées.
            const inRound = session.exercises
              .map((ex, exIdx) => ({ ex, exIdx, set: ex.sets[round] }))
              .filter((e) => e.set !== undefined);
            const done = inRound.every((e) => e.set.completed);

            return (
              <div key={round} className={`circuit-round ${done ? 'done' : ''}`}>
                <h3 className="circuit-round-title">
                  Tour {round + 1}
                  <span>{inRound.filter((e) => e.set.completed).length}/{inRound.length}</span>
                </h3>
                <div className="sets-grid">
                  {inRound.map(({ ex, exIdx, set }) => (
                    <SetCard
                      key={exIdx}
                      exercise={ex}
                      set={set}
                      label={ex.exerciseName}
                      sublabel={ex.weighted && ex.weight ? `${ex.weight} kg` : undefined}
                      onAdjustReps={(d) => adjustReps(exIdx, round, d)}
                      onAdjustWeight={(d) => adjustSetWeight(exIdx, round, d)}
                      onValidate={() => logSet(exIdx, round)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="live-exercises">
        {session.exercises.map((ex, exIdx) => {
          const exCompleted = ex.sets.filter((s) => s.completed).length;
          const exTotal = ex.sets.length;
          const remaining = exTotal - exCompleted;
          const isExpanded = expandedExercise === exIdx;

          return (
            <div key={exIdx} className="live-exercise-card">
              <div
                className="live-exercise-header"
                onClick={() => setExpandedExercise(isExpanded ? -1 : exIdx)}
              >
                <div>
                  <h3>{ex.exerciseName}{ex.weighted && ex.weight ? ` (${ex.weight} kg${ex.weightType === 'halteres' ? ' haltères' : ex.weightType === 'barre' ? ' barre' : ''})` : ''}</h3>
                  <span className="exercise-progress-text">
                    {exCompleted}/{exTotal} séries • {remaining > 0 ? `${remaining} restante${remaining > 1 ? 's' : ''}` : 'Terminé ✓'}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {isExpanded && exCompleted === 0 && session.exercises.length > 1 && (
                <button
                  className="remove-exercise-btn"
                  onClick={() => removeExerciseFromSession(exIdx)}
                >
                  <Trash2 size={13} /> Retirer cet exercice
                </button>
              )}

              {isExpanded && (
                <div className="sets-grid">
                  {ex.sets.map((set, setIdx) => (
                    <SetCard
                      key={setIdx}
                      exercise={ex}
                      set={set}
                      label={`Série ${setIdx + 1}`}
                      onAdjustReps={(d) => adjustReps(exIdx, setIdx, d)}
                      onAdjustWeight={(d) => adjustSetWeight(exIdx, setIdx, d)}
                      onValidate={() => logSet(exIdx, setIdx)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && (() => {
                const lastDone = ex.sets[ex.sets.length - 1]?.completed;
                return (
                  <div className="set-count-row">
                    <span className="set-count-label">Séries</span>
                    <div className="stepper">
                      <button
                        onClick={() => removeSet(exIdx)}
                        disabled={ex.sets.length <= 1 || lastDone}
                        title={lastDone ? 'Dévalide la dernière série pour la retirer' : undefined}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{ex.sets.length}</span>
                      <button onClick={() => addSet(exIdx)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
      )}

      <button className="add-exercise-live-btn" onClick={openAddExercise}>
        <Plus size={16} /> Ajouter un exercice
      </button>

      {showAddExercise && (
        <div className="modal-overlay" onClick={() => setShowAddExercise(false)}>
          <div className="explore-modal" onClick={(e) => e.stopPropagation()}>
            <div className="explore-modal-header">
              <h3>{pickedExercise ? pickedExercise.name : 'Ajouter un exercice'}</h3>
              <button className="member-modal-close" onClick={() => setShowAddExercise(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="explore-results" style={{ padding: '0.5rem 1.25rem 1.5rem' }}>
              {pickedExercise ? (
                <>
                  <button className="trade-back-btn" onClick={() => setPickedExercise(null)}>
                    ← Retour
                  </button>
                  <div className="config-row">
                    <span>Séries</span>
                    <div className="stepper">
                      <button onClick={() => setNewExSets((n) => Math.max(1, n - 1))}><Minus size={16} /></button>
                      <span>{newExSets}</span>
                      <button onClick={() => setNewExSets((n) => n + 1)}><Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="config-row">
                    <span>{pickedExercise.defaultUnit === 'seconds' ? 'Secondes / série' : 'Reps / série'}</span>
                    <div className="stepper">
                      <button onClick={() => setNewExTarget((n) => Math.max(1, n - (pickedExercise.defaultUnit === 'seconds' ? 5 : 1)))}><Minus size={16} /></button>
                      <span>{newExTarget}{pickedExercise.defaultUnit === 'seconds' ? ' s' : ''}</span>
                      <button onClick={() => setNewExTarget((n) => n + (pickedExercise.defaultUnit === 'seconds' ? 5 : 1))}><Plus size={16} /></button>
                    </div>
                  </div>
                  <button
                    className="primary-btn"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => addExerciseToSession(pickedExercise, newExSets, newExTarget)}
                  >
                    Ajouter à la séance
                  </button>
                </>
              ) : (
                addableCategories.map((cat) => (
                  <div key={cat} className="category-section">
                    <h3 className="category-title">{CATEGORY_LABELS[cat]}</h3>
                    <div className="exercise-grid">
                      {addableExercises
                        .filter((e) => e.category === cat)
                        .map((ex) => (
                          <button
                            key={ex.id}
                            className="exercise-chip"
                            onClick={() => pickExercise(ex)}
                          >
                            {ex.name}
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* La pause suit le défilement.

          Avec huit exercices, le compte à rebours sort de l'écran dès qu'on
          descend saisir ses séries : on pousse sa série sans savoir s'il
          reste dix secondes ou une minute. La bulle ne paraît que dans ce
          cas-là, et la ramener en haut suffit à la faire disparaître. */}
      {restRunning && !restVisible && (
        <button
          className={`rest-bulle ${restTime <= 5 ? 'ending' : ''}`}
          onClick={() => restSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
          aria-label={`Pause : ${formatTime(restTime)} restantes. Revenir au chrono.`}
        >
          <svg viewBox="0 0 56 56" aria-hidden="true">
            <circle className="rest-bulle-fond" cx="28" cy="28" r="25" />
            <circle
              className="rest-bulle-arc"
              cx="28" cy="28" r="25"
              strokeDasharray={ARC_BULLE}
              strokeDashoffset={ARC_BULLE * (1 - restTime / Math.max(1, restDuration))}
            />
          </svg>
          <span className="rest-bulle-temps">{formatTime(restTime)}</span>
        </button>
      )}

      <button className="finish-btn floating-btn" onClick={() => setShowFinish(true)}>
        Terminer la séance
      </button>

      {showFinish && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Terminer la séance ?</h3>
            {elapsed > SEANCE_OUBLIEE ? (
              /* On n'enregistre pas le chrono sans demander : il dit le temps
                 passé depuis le départ, pas celui passé à s'entraîner. */
              <div className="oubli-bloc">
                <p className="oubli-intro">
                  Cette séance tourne depuis <strong>{formatTime(elapsed)}</strong>.
                  Tu as sûrement oublié de la terminer — elle a duré combien ?
                </p>
                <div className="oubli-choix">
                  {DUREES_OUBLI.map((m) => (
                    <button
                      key={m}
                      className={`oubli-option ${dureeOubli === m && !dureeLibre ? 'actif' : ''}`}
                      onClick={() => { setDureeOubli(m); setDureeLibre(''); }}
                    >
                      {m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`}
                    </button>
                  ))}
                </div>
                <div className="oubli-libre">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="300"
                    placeholder="Autre"
                    value={dureeLibre}
                    onChange={(e) => {
                      setDureeLibre(e.target.value);
                      const m = parseInt(e.target.value, 10);
                      // Une saisie vide ou absurde ne doit pas effacer le
                      // choix précédent : on garde la dernière valeur valide.
                      if (Number.isFinite(m) && m > 0 && m <= 300) setDureeOubli(m);
                    }}
                  />
                  <span>min</span>
                </div>
                <p className="oubli-recap">
                  Enregistré : <strong>{dureeOubli} min</strong> • {completedSets}/{totalSets} séries faites
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Durée : {formatTime(elapsed)} • {completedSets}/{totalSets} séries faites
              </p>
            )}
            <label className="no-reward-row">
              <input
                type="checkbox"
                checked={noReward}
                onChange={() => setNoReward(!noReward)}
              />
              <span>
                <strong>Séance sans coffre</strong>
                <em>Pour un rattrapage ou un essai. Les reps comptent quand même.</em>
              </span>
            </label>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowFinish(false)}>
                Continuer
              </button>
              <button className="primary-btn" style={{ flex: 1 }} onClick={finishSession}>
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
