import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSessions } from '../contexts/SessionsContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, getDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_EXERCISES, CATEGORY_LABELS, uniteProbable } from '../lib/exercises';
import { sportCoXp, enduranceXp, plafonneEndurance, getCurrentSeason, needsSeasonReset, startNewSeason, accordeXp } from '../lib/passes';
import { buildAmrapExercises } from '../lib/amrap';
import { accordeXpProfil, xpSeance } from '../lib/niveaux';
import {
  EXOS_ECHAUFFEMENT, FAMILLES, doseLabel, dureeEstimee, echauffementSuggere, enItem,
} from '../lib/echauffement';
import AmrapBuilder from '../components/AmrapBuilder';
import type { AmrapItem } from '../components/AmrapBuilder';
import type { Exercise, ExerciseLog, WeightType, Program, SetUnit, UserProgress, WarmupItem } from '../types';
import { ArrowLeft, Plus, Minus, Check, X, Zap, Timer, Weight, Mountain, Route, Gauge, ClipboardList, Pencil, Trash2, Search, Star, Flame } from 'lucide-react';

/** Enlève accents et casse : « Développé » se trouve en tapant « developpe ». */
function sansAccent(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Running et vélo partagent le même formulaire temps / distance / dénivelé. */
function isDistanceBased(category: string): boolean {
  return category === 'running' || category === 'velo';
}

export default function NewSession() {
  const { user } = useAuth();
  const { sessions } = useUserSessions();
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'config' | 'amrap'>('select');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<
    { exercise: Exercise; targetSets: number; targetTotal: number; unit: SetUnit; weighted: boolean; weight: number; weightType: WeightType }[]
  >([]);
  const [runningConfigs, setRunningConfigs] = useState<
    { exercise: Exercise; duration: number; distance: number; elevation: number }[]
  >([]);
  const [sportCoConfigs, setSportCoConfigs] = useState<
    { exercise: Exercise; duration: number }[]
  >([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState<Exercise['category']>('push');
  const [newExWeighted, setNewExWeighted] = useState(false);
  const [newExUnit, setNewExUnit] = useState<SetUnit>('reps');
  /* Vrai dès que la personne a touché le sélecteur d'unité. Tant qu'elle n'y
     a pas touché, le nom qu'elle tape le pilote ; après, on ne touche plus à
     son choix — deviner par-dessus une décision serait insupportable. */
  const [uniteChoisie, setUniteChoisie] = useState(false);
  const [addingExo, setAddingExo] = useState(false);
  const [editingExo, setEditingExo] = useState<Exercise | null>(null);
  const [editExoName, setEditExoName] = useState('');
  const [editExoCategory, setEditExoCategory] = useState<Exercise['category']>('push');
  const [editExoWeighted, setEditExoWeighted] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editModeCategory, setEditModeCategory] = useState<string | null>(null);
  const [selectedCustomExo, setSelectedCustomExo] = useState<Exercise | null>(null);
  const [recherche, setRecherche] = useState('');
  /** Catégorie affichée. 'frequents' = les exercices que le joueur fait vraiment. */
  const [filtre, setFiltre] = useState<string>('frequents');
  const [myPrograms, setMyPrograms] = useState<Program[]>([]);
  /** L'échauffement. Vide tant qu'on ne l'a pas activé. */
  const [echauffement, setEchauffement] = useState<WarmupItem[]>([]);
  const [familleEch, setFamilleEch] = useState<(typeof FAMILLES)[number]['cle']>('cardio');

  useEffect(() => {
    if (user) {
      loadCustomExercises();
      loadPrograms();
    }
  }, [user]);

  async function loadPrograms() {
    if (!user) return;
    try {
      const snap = await getDocs(query(collection(db, 'programs'), where('createdBy', '==', user.uid)));
      setMyPrograms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Program)));
    } catch {
      setMyPrograms([]);
    }
  }

  async function startFromProgram(prog: Program) {
    if (!user) return;
    const now = Date.now();

    // Un programme AMRAP décrit un circuit : ses exercices deviennent un tour,
    // et les séries seront matérialisées à la fin, comme tout AMRAP.
    if (prog.kind === 'amrap') {
      const circuit = buildAmrapExercises(
        prog.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          value: ex.targetReps,
          unit: ex.unit,
        }))
      );
      if (circuit.length === 0) return;

      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        exercises: circuit,
        completed: false,
        createdAt: now,
        startedAt: now,
        duration: 0,
        mode: 'amrap',
        amrapDuration: (prog.amrapMinutes || 20) * 60,
        amrapRounds: 0,
        amrapName: prog.name,
        ...(echauffement.length > 0 ? { warmup: echauffement } : {}),
      });
      navigate(`/session/${docRef.id}`);
      return;
    }

    const exercises: ExerciseLog[] = prog.exercises.map((ex) => {
      const log: ExerciseLog = {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseCategory: ex.exerciseCategory,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        sets: Array.from({ length: ex.targetSets }, () => ({ reps: 0, completed: false })),
      };
      if (ex.unit === 'seconds') log.unit = 'seconds';
      if (ex.weighted && ex.weight) {
        log.weighted = true;
        log.weight = ex.weight;
        log.weightType = ex.weightType;
      }
      return log;
    });
    const docRef = await addDoc(collection(db, 'sessions'), {
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: false,
      createdAt: now,
      startedAt: now,
      duration: 0,
      ...(echauffement.length > 0 ? { warmup: echauffement } : {}),
    });
    navigate(`/session/${docRef.id}`);
  }

  async function loadCustomExercises() {
    if (!user) return;
    const q = query(collection(db, 'customExercises'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    setCustomExercises(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exercise)));
  }

  async function addCustomExercise() {
    if (!newExName.trim() || !user || addingExo) return;
    setAddingExo(true);
    try {
      const docRef = await addDoc(collection(db, 'customExercises'), {
        name: newExName.trim(),
        category: newExCategory,
        isCustom: true,
        canBeWeighted: newExWeighted,
        defaultUnit: newExUnit,
        userId: user.uid,
      });
      const newEx: Exercise = {
        id: docRef.id,
        name: newExName.trim(),
        category: newExCategory,
        isCustom: true,
        canBeWeighted: newExWeighted,
        defaultUnit: newExUnit,
      };
      setCustomExercises((prev) => [...prev, newEx]);
      setNewExName('');
      setNewExWeighted(false);
      setNewExUnit('reps');
      setUniteChoisie(false);
      setShowAddExercise(false);
    } catch (err) {
      console.error('Erreur ajout exercice:', err);
      alert('Erreur lors de l\'ajout. Vérifie les règles Firestore.');
    }
    setAddingExo(false);
  }

  function openEditExo(ex: Exercise) {
    setEditingExo(ex);
    setEditExoName(ex.name);
    setEditExoCategory(ex.category);
    setEditExoWeighted(ex.canBeWeighted || false);
  }

  async function saveEditExo() {
    if (!editingExo || !editExoName.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'customExercises', editingExo.id), {
        name: editExoName.trim(),
        category: editExoCategory,
        canBeWeighted: editExoWeighted,
      });
      setCustomExercises((prev) =>
        prev.map((e) => e.id === editingExo.id
          ? { ...e, name: editExoName.trim(), category: editExoCategory, canBeWeighted: editExoWeighted }
          : e
        )
      );
      setEditingExo(null);
    } catch (err) {
      console.error('Erreur modification exercice:', err);
    }
    setSavingEdit(false);
  }

  async function deleteCustomExo(ex: Exercise) {
    if (!confirm(`Supprimer "${ex.name}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'customExercises', ex.id));
      setCustomExercises((prev) => prev.filter((e) => e.id !== ex.id));
      setSelectedExercises((prev) => prev.filter((e) => e.id !== ex.id));
    } catch (err) {
      console.error('Erreur suppression exercice:', err);
    }
  }

  async function startAmrap(name: string, minutes: number, items: AmrapItem[]) {
    if (!user) return;
    const now = Date.now();
    const exercises = buildAmrapExercises(items);
    if (exercises.length === 0) return;

    const payload: Record<string, unknown> = {
      userId: user.uid,
      date: new Date().toISOString().split('T')[0],
      exercises,
      completed: false,
      createdAt: now,
      startedAt: now,
      duration: 0,
      mode: 'amrap',
      amrapDuration: minutes * 60,
      amrapRounds: 0,
      ...(echauffement.length > 0 ? { warmup: echauffement } : {}),
    };
    if (name) payload.amrapName = name;

    const docRef = await addDoc(collection(db, 'sessions'), payload);
    navigate(`/session/${docRef.id}`);
  }

  /*
   * L'échauffement part avec la séance, dans le même document — et non dans
   * une séance à part : son temps court dans le chrono de la séance, et le
   * récap de la journée en compte une, pas deux. Les quatre lancements de
   * cette page le recopient donc dans leur payload.
   */
  function toggleEchauffement() {
    setEchauffement((prev) => (prev.length > 0 ? [] : echauffementSuggere()));
  }

  function toggleExoEchauffement(id: string) {
    setEchauffement((prev) => {
      if (prev.some((it) => it.id === id)) return prev.filter((it) => it.id !== id);
      const exo = EXOS_ECHAUFFEMENT.find((e) => e.id === id);
      return exo ? [...prev, enItem(exo)] : prev;
    });
  }

  function toggleExercise(ex: Exercise) {
    setSelectedExercises((prev) =>
      prev.find((e) => e.id === ex.id) ? prev.filter((e) => e.id !== ex.id) : [...prev, ex]
    );
  }

  function goToConfig() {
    const normal = selectedExercises.filter(
      (ex) => !isDistanceBased(ex.category) && ex.category !== 'sportco'
    );
    const running = selectedExercises.filter((ex) => isDistanceBased(ex.category));
    const sportCo = selectedExercises.filter((ex) => ex.category === 'sportco');
    setExerciseConfigs(
      normal.map((ex) => {
        const unit: SetUnit = ex.defaultUnit === 'seconds' ? 'seconds' : 'reps';
        return {
          exercise: ex,
          targetSets: 4,
          // 30 s par série pour un isométrique, 40 reps au total sinon.
          targetTotal: unit === 'seconds' ? 120 : 40,
          unit,
          weighted: false,
          weight: 0,
          weightType: 'body' as WeightType,
        };
      })
    );
    setRunningConfigs(
      running.map((ex) => ({ exercise: ex, duration: 30, distance: 5, elevation: 0 }))
    );
    setSportCoConfigs(
      sportCo.map((ex) => ({ exercise: ex, duration: 60 }))
    );
    setStep('config');
  }

  function updateConfig(index: number, field: 'targetSets' | 'targetTotal', delta: number) {
    setExerciseConfigs((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const newVal = Math.max(1, c[field] + delta);
        return { ...c, [field]: newVal };
      })
    );
  }

  async function startSession() {
    const now = Date.now();
    const normalExercises: ExerciseLog[] = exerciseConfigs.map((c) => {
      const repsPerSet = Math.ceil(c.targetTotal / c.targetSets);
      const log: ExerciseLog = {
        exerciseId: c.exercise.id,
        exerciseName: c.exercise.name,
        exerciseCategory: c.exercise.category,
        targetSets: c.targetSets,
        targetReps: repsPerSet,
        sets: Array.from({ length: c.targetSets }, () => ({ reps: 0, completed: false })),
      };
      if (c.unit === 'seconds') log.unit = 'seconds';
      if (c.weighted) {
        log.weighted = true;
        log.weight = c.weight;
        log.weightType = c.weightType;
      }
      return log;
    });

    const runningExercises: ExerciseLog[] = runningConfigs.map((c) => ({
      exerciseId: c.exercise.id,
      exerciseName: c.exercise.name,
      exerciseCategory: c.exercise.category,
      targetSets: 1,
      targetReps: 1,
      sets: [{ reps: 1, completed: true }],
      runDuration: c.duration * 60,
      runDistance: c.distance,
      runElevation: c.elevation || 0,
    }));

    const sportCoExercises: ExerciseLog[] = sportCoConfigs.map((c) => ({
      exerciseId: c.exercise.id,
      exerciseName: c.exercise.name,
      exerciseCategory: 'sportco',
      targetSets: 1,
      targetReps: 1,
      sets: [{ reps: 1, completed: true }],
      runDuration: c.duration * 60,
    }));

    const exercises = [...normalExercises, ...runningExercises, ...sportCoExercises];
    const isTimeOnly = exerciseConfigs.length === 0;
    const totalSportCoDuration = sportCoConfigs.reduce((sum, c) => sum + c.duration * 60, 0);
    const totalRunDuration =
      runningConfigs.reduce((sum, c) => sum + c.duration * 60, 0) + totalSportCoDuration;

    // La course, le vélo et la marche rapportent désormais comme le sport co.
    // Le plafond n'est appliqué qu'à eux : le sport co a déjà le sien, dans le
    // fait qu'on ne joue pas un match de foot six fois par jour.
    const enduranceBrut = runningConfigs.reduce(
      (sum, c) => sum + enduranceXp(c.duration * 60, c.exercise.id),
      0
    );
    const xpSportCo = sportCoXp(totalSportCoDuration);
    if (xpSportCo > 0 || enduranceBrut > 0) {
      try {
        const ref = doc(db, 'userProgress', user!.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const stored = snap.data() as UserProgress;
          const season = getCurrentSeason();
          // La bascule de saison se fait d'ordinaire à l'ouverture du Pass.
          // Si elle n'a pas encore eu lieu, cet XP s'ajouterait au total de la
          // saison précédente et disparaîtrait à la première visite du Pass.
          const base =
            season && needsSeasonReset(stored, season.id)
              ? startNewSeason(stored, season.id)
              : stored;
          const aujourdhui = new Date().toISOString().split('T')[0];
          const { xp: xpEndurance, journee } = plafonneEndurance(
            enduranceBrut,
            base.enduranceXpDay,
            aujourdhui
          );
          /* Par accordeXp et non par une addition : cet XP fait franchir des
             paliers, et leurs coffres doivent tomber comme ceux d'une quête. */
          const { passXp, chestsToOpen } = accordeXp(base, xpSportCo + xpEndurance, season);
          await updateDoc(ref, {
            passXp,
            enduranceXpDay: journee,
            currentSeasonId: base.currentSeasonId,
            chestsToOpen,
          });
        }
      } catch (err) {
        console.error('Erreur XP sport co / endurance:', err);
      }
    }

    if (isTimeOnly) {
      // Pas d'échauffement sur un log : il n'y a pas de séance à lancer,
      // on enregistre une sortie déjà faite.
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user!.uid,
        date: new Date().toISOString().split('T')[0],
        exercises,
        completed: true,
        createdAt: now,
        startedAt: now,
        duration: totalRunDuration,
      });

      /*
       * L'XP de profil de la sortie, accordée ici et nulle part ailleurs.
       *
       * Un log est créé déjà terminé : il ne passe jamais par l'écran de
       * séance, donc jamais par `finishSession` qui accorde l'XP des autres.
       * Sans ces lignes, courir dix kilomètres ne rapporterait aucun niveau.
       *
       * Et seulement pour un log : une séance mixte (course + exercices)
       * part en séance normale et sera payée à sa fin. La payer aussi ici,
       * c'est la payer deux fois.
       */
      try {
        const ref = doc(db, 'userProgress', user!.uid);
        const snap = await getDoc(ref);
        const progress = (snap.data() || {}) as UserProgress;
        const brute = xpSeance({ exercises, duration: totalRunDuration });
        const gain = accordeXpProfil(
          progress,
          brute,
          new Date().toISOString().split('T')[0]
        );
        await updateDoc(ref, {
          xp: gain.xp,
          xpJour: gain.xpJour,
          niveauxPris: gain.niveauxPris,
          ...(gain.coffres.length > 0
            ? { chestsToOpen: [...(progress.chestsToOpen || []), ...gain.coffres] }
            : {}),
        });
      } catch (err) {
        console.error('XP de profil du log impossible :', err);
      }

      navigate(`/session/${docRef.id}`);
    } else {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user!.uid,
        date: new Date().toISOString().split('T')[0],
        exercises,
        completed: false,
        createdAt: now,
        startedAt: now,
        duration: 0,
        ...(echauffement.length > 0 ? { warmup: echauffement } : {}),
      });
      navigate(`/session/${docRef.id}`);
    }
  }

  const allExercises = useMemo(
    () => [...DEFAULT_EXERCISES, ...customExercises],
    [customExercises]
  );
  const categories = useMemo(
    () => [...new Set(allExercises.map((e) => e.category))] as Exercise['category'][],
    [allExercises]
  );

  /**
   * Les exercices que le joueur fait vraiment, les plus fréquents d'abord.
   *
   * Le catalogue compte une centaine d'exercices répartis sur neuf catégories.
   * Tout afficher d'un coup, c'était cent boutons à faire défiler pour en
   * cocher quatre — et presque toujours les quatre mêmes. L'historique sait
   * lesquels : autant commencer par là.
   */
  const frequents = useMemo(() => {
    const compte = new Map<string, number>();
    for (const s of sessions.slice(0, 30)) {
      for (const ex of s.exercises) {
        compte.set(ex.exerciseId, (compte.get(ex.exerciseId) || 0) + 1);
      }
    }
    return [...compte.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => allExercises.find((e) => e.id === id))
      .filter((e): e is Exercise => !!e)
      .slice(0, 12);
  }, [sessions, allExercises]);

  // Sans historique, l'onglet n'aurait rien à montrer : on ouvre sur la
  // première catégorie plutôt que sur une page vide.
  const ongletDefaut = frequents.length >= 3 ? 'frequents' : categories[0];
  const filtreActif = filtre === 'frequents' && frequents.length < 3 ? ongletDefaut : filtre;

  const resultats = useMemo(() => {
    const q = sansAccent(recherche.trim());
    // La recherche ignore les onglets : chercher « dips » alors qu'on est sur
    // Tirage doit trouver Dips, pas répondre « aucun résultat ».
    if (q) return allExercises.filter((e) => sansAccent(e.name).includes(q));
    if (filtreActif === 'frequents') return frequents;
    return allExercises.filter((e) => e.category === filtreActif);
  }, [recherche, filtreActif, allExercises, frequents]);

  const modeEdition = editModeCategory === filtreActif;
  const categorieAUnPerso =
    filtreActif !== 'frequents' && allExercises.some((e) => e.category === filtreActif && e.isCustom);

  /* L'AMRAP a sa page, et non une fenêtre posée sur le catalogue : on y
     choisit des exercices, une durée et un nom — c'est une préparation de
     séance, pas une question à laquelle on répond en deux secondes. */
  if (step === 'amrap') {
    return <AmrapBuilder onClose={() => setStep('select')} onStart={startAmrap} />;
  }

  if (step === 'select') {
    return (
      <div className="page exo-page">
        {/* Le bandeau porte la recherche. Sur une page dont le travail est
            de trouver un exercice parmi cent trente-cinq, le champ de
            recherche est l'outil principal : il n'a rien à faire en
            quatrième position, sous trois blocs encadrés. */}
        <header className="exo-entete">
          <div className="exo-entete-fond" />
          <div className="exo-entete-contenu">
            <div className="exo-haut">
              <button className="exo-retour" onClick={() => navigate('/')} aria-label="Revenir à l'accueil">
                <ArrowLeft size={20} />
              </button>
              <span className="exo-kicker">Nouvelle séance</span>
              {selectedExercises.length > 0 && (
                <span className="exo-compte">{selectedExercises.length} choisi{selectedExercises.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <h1 className="exo-titre">Choisis tes exercices</h1>
            <div className="exo-search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Rechercher un exercice"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
              {recherche && (
                <button className="icon-btn" onClick={() => setRecherche('')} aria-label="Effacer">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Les raccourcis tiennent sur une ligne. Ils occupaient deux sections
            avec titres au-dessus du catalogue, et repoussaient d'autant ce que
            la page sert à faire : choisir des exercices. */}
        <div className="exo-raccourcis">
          <button className="exo-raccourci amrap" onClick={() => setStep('amrap')}>
            <Zap size={16} />
            <span>AMRAP</span>
          </button>
          {myPrograms.map((prog) => (
            <button key={prog.id} className="exo-raccourci" onClick={() => startFromProgram(prog)}>
              <ClipboardList size={16} />
              <span>{prog.name}</span>
              <em>{prog.exercises.length} exos</em>
            </button>
          ))}
        </div>

        {/* L'échauffement se décide avant de choisir ses exercices, parce
            qu'il passe avant eux dans la séance. Fermé, il ne prend qu'une
            ligne : on ne le subit pas quand on n'en veut pas. */}
        <div className={`ech-bloc ${echauffement.length > 0 ? 'actif' : ''}`}>
          <button className="ech-entete" onClick={toggleEchauffement}>
            <Flame size={16} />
            <span className="ech-titre">Échauffement</span>
            <span className="ech-resume">
              {echauffement.length > 0
                ? `${echauffement.length} exo${echauffement.length > 1 ? 's' : ''} · ~${dureeEstimee(echauffement)} min`
                : 'Non'}
            </span>
            <span className={`toggle ${echauffement.length > 0 ? 'active' : ''}`}>
              <span className="toggle-knob" />
            </span>
          </button>

          {echauffement.length > 0 && (
            <div className="ech-corps">
              <div className="ech-familles">
                {FAMILLES.map((f) => (
                  <button
                    key={f.cle}
                    className={`ech-famille ${familleEch === f.cle ? 'actif' : ''}`}
                    onClick={() => setFamilleEch(f.cle)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="ech-grille">
                {EXOS_ECHAUFFEMENT.filter((e) => e.famille === familleEch).map((exo) => {
                  const choisi = echauffement.some((it) => it.id === exo.id);
                  return (
                    <button
                      key={exo.id}
                      className={`ech-exo ${choisi ? 'choisi' : ''}`}
                      onClick={() => toggleExoEchauffement(exo.id)}
                    >
                      <span className="ech-exo-nom">{exo.nom}</span>
                      <span className="ech-exo-dose">{doseLabel(enItem(exo))}</span>
                      {choisi && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="exo-picker">
          <div className="exo-filters">
            {frequents.length >= 3 && (
              <button
                className={`exo-filter ${filtreActif === 'frequents' && !recherche ? 'active' : ''}`}
                onClick={() => { setFiltre('frequents'); setRecherche(''); }}
              >
                <Star size={14} />
                Fréquents
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat}
                className={`exo-filter ${filtreActif === cat && !recherche ? 'active' : ''}`}
                onClick={() => { setFiltre(cat); setRecherche(''); }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="exo-results">
            <div className="exo-results-head">
              <span>
                {recherche
                  ? `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`
                  : filtreActif === 'frequents'
                    ? 'Ce que tu fais le plus souvent'
                    : `${resultats.length} exercices`}
              </span>
              {/* Le crayon ne concerne que les exercices créés à la main : il
                  n'apparaît que dans la catégorie qui en contient. */}
              {categorieAUnPerso && !recherche && (
                <button
                  className={`icon-btn edit-cat-btn ${modeEdition ? 'active' : ''}`}
                  onClick={() => setEditModeCategory(modeEdition ? null : filtreActif)}
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>

            {resultats.length === 0 ? (
              <p className="empty">Aucun exercice ne correspond.</p>
            ) : (
              <div className="exercise-grid">
                {resultats.map((ex) => (
                  <button
                    key={ex.id}
                    className={`exercise-chip ${selectedExercises.find((e) => e.id === ex.id) ? 'selected' : ''} ${modeEdition && ex.isCustom ? 'edit-mode' : ''}`}
                    onClick={() => {
                      if (modeEdition && ex.isCustom) {
                        setSelectedCustomExo(ex);
                      } else {
                        toggleExercise(ex);
                      }
                    }}
                  >
                    {ex.name}
                    {!modeEdition && selectedExercises.find((e) => e.id === ex.id) && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}

            <button className="add-exercise-btn" onClick={() => setShowAddExercise(true)}>
              <Plus size={16} /> Ajouter un exercice
            </button>
          </div>
        </div>

        {showAddExercise && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-card-header">
                <h3>Nouvel exercice</h3>
                <button className="icon-btn" onClick={() => setShowAddExercise(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="add-exercise-form">
                <input
                  type="text"
                  placeholder="Nom de l'exercice"
                  value={newExName}
                  onChange={(e) => {
                    setNewExName(e.target.value);
                    if (uniteChoisie) return;
                    const devinee = uniteProbable(e.target.value);
                    if (devinee) setNewExUnit(devinee);
                  }}
                  autoFocus
                />
                <div className="category-picker">
                  {(Object.entries(CATEGORY_LABELS) as [Exercise['category'], string][]).map(([key, label]) => (
                    <button
                      key={key}
                      className={`category-chip ${newExCategory === key ? 'active' : ''}`}
                      onClick={() => setNewExCategory(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="config-row" style={{ marginTop: '0.75rem' }}>
                  <span>Unité</span>
                  <div className="unit-picker">
                    {([['reps', 'Reps'], ['seconds', 'Secondes']] as [SetUnit, string][]).map(([u, label]) => (
                      <button
                        key={u}
                        className={`unit-btn ${newExUnit === u ? 'active' : ''}`}
                        onClick={() => { setNewExUnit(u); setUniteChoisie(true); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* On dit pourquoi l'unité a bougé toute seule. Un réglage
                    qui change sans explication se lit comme un bug, et on le
                    remet à l'envers. */}
                {!uniteChoisie && newExUnit === 'seconds' && (
                  <p className="unit-devinee">
                    Mis en secondes : cet exercice se tient, il ne se compte pas.
                    Change-le si ce n'est pas le cas.
                  </p>
                )}
                <div className="weighted-toggle" style={{ marginTop: '0.75rem' }} onClick={() => setNewExWeighted(!newExWeighted)}>
                  <Weight size={16} />
                  <span>Peut être lesté</span>
                  <div className={`toggle ${newExWeighted ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setShowAddExercise(false)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={addCustomExercise} disabled={!newExName.trim() || addingExo}>
                  {addingExo ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingExo && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-card-header">
                <h3>Modifier l'exercice</h3>
                <button className="icon-btn" onClick={() => setEditingExo(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="add-exercise-form">
                <input
                  type="text"
                  placeholder="Nom de l'exercice"
                  value={editExoName}
                  onChange={(e) => setEditExoName(e.target.value)}
                  autoFocus
                />
                <div className="category-picker">
                  {(Object.entries(CATEGORY_LABELS) as [Exercise['category'], string][]).map(([key, label]) => (
                    <button
                      key={key}
                      className={`category-chip ${editExoCategory === key ? 'active' : ''}`}
                      onClick={() => setEditExoCategory(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="weighted-toggle" style={{ marginTop: '0.75rem' }} onClick={() => setEditExoWeighted(!editExoWeighted)}>
                  <Weight size={16} />
                  <span>Peut être lesté</span>
                  <div className={`toggle ${editExoWeighted ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setEditingExo(null)}>
                  Annuler
                </button>
                <button className="primary-btn" onClick={saveEditExo} disabled={!editExoName.trim() || savingEdit}>
                  {savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedCustomExo && (
          <div className="modal-overlay" onClick={() => setSelectedCustomExo(null)}>
            <div className="modal-card custom-exo-menu" onClick={(e) => e.stopPropagation()}>
              <h3>{selectedCustomExo.name}</h3>
              <div className="custom-exo-menu-actions">
                <button className="secondary-btn" onClick={() => { openEditExo(selectedCustomExo); setSelectedCustomExo(null); }}>
                  <Pencil size={14} /> Modifier
                </button>
                <button className="danger-btn" onClick={() => { deleteCustomExo(selectedCustomExo); setSelectedCustomExo(null); }}>
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedExercises.length > 0 && (
          <button className="primary-btn floating-btn" onClick={goToConfig}>
            Configurer ({selectedExercises.length})
          </button>
        )}
      </div>
    );
  }

  const isRunningOnly = exerciseConfigs.length === 0 && runningConfigs.length > 0 && sportCoConfigs.length === 0;
  const isVeloOnly = isRunningOnly && runningConfigs.every((c) => c.exercise.category === 'velo');
  const isSportCoOnly = exerciseConfigs.length === 0 && runningConfigs.length === 0 && sportCoConfigs.length > 0;
  const sportCoTotalMin = sportCoConfigs.reduce((sum, c) => sum + c.duration, 0);
  const sportCoPreviewXp = sportCoXp(sportCoTotalMin * 60);
  // L'aperçu ignore le plafond du jour : il dirait « 0 XP » à quelqu'un qui a
  // déjà couru ce matin, sans qu'on puisse lui expliquer pourquoi au moment où
  // il saisit. Le plafond s'applique à l'enregistrement, là où on connaît le
  // compteur réel.
  const endurancePreviewXp = runningConfigs.reduce(
    (sum, c) => sum + enduranceXp(c.duration * 60, c.exercise.id),
    0
  );

  function formatPace(durationMin: number, distanceKm: number): string {
    if (distanceKm <= 0) return '—';
    const paceMin = durationMin / distanceKm;
    const m = Math.floor(paceMin);
    const s = Math.round((paceMin - m) * 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatSpeed(durationMin: number, distanceKm: number): string {
    if (durationMin <= 0) return '—';
    return (distanceKm / (durationMin / 60)).toFixed(1);
  }

  return (
    <div className="page exo-page">
      <header className="exo-entete">
        <div className="exo-entete-fond" />
        <div className="exo-entete-contenu">
          <div className="exo-haut">
            <button className="exo-retour" onClick={() => setStep('select')} aria-label="Revenir au choix des exercices">
              <ArrowLeft size={20} />
            </button>
            <span className="exo-kicker">Nouvelle séance</span>
          </div>
          <h1 className="exo-titre">
            {isVeloOnly ? 'Log vélo' : isRunningOnly ? 'Log running' : isSportCoOnly ? 'Log sport co' : 'Objectifs'}
          </h1>
          <p className="exo-sous">
            {isRunningOnly || isSportCoOnly
              ? 'La sortie est déjà faite : on l\'enregistre.'
              : `${exerciseConfigs.length + runningConfigs.length + sportCoConfigs.length} exercices à régler`}
          </p>
        </div>
      </header>

      <div className="config-list">
        {sportCoConfigs.map((config, i) => (
          <div key={config.exercise.id} className="config-card running-config">
            <h3>{config.exercise.name}</h3>
            <div className="running-form">
              <div className="running-field">
                <div className="running-field-label">
                  <Timer size={16} />
                  <span>Temps</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="running-input"
                    value={config.duration || ''}
                    placeholder="0"
                    onChange={(e) => setSportCoConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, duration: Math.max(0, parseInt(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">min</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sportCoConfigs.length > 0 && (
          <div className="sportco-xp-banner">
            <Zap size={16} />
            <span>
              {sportCoPreviewXp} CaliPass gagnés
              <em>25 XP par tranche de 30 min</em>
            </span>
          </div>
        )}

        {runningConfigs.map((config, i) => (
          <div key={config.exercise.id} className="config-card running-config">
            <h3>{config.exercise.name}</h3>
            <div className="running-form">
              <div className="running-field">
                <div className="running-field-label">
                  <Timer size={16} />
                  <span>Temps</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="running-input"
                    value={config.duration || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, duration: Math.max(0, parseFloat(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">min</span>
                </div>
              </div>
              <div className="running-field">
                <div className="running-field-label">
                  <Route size={16} />
                  <span>Distance</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    className="running-input"
                    value={config.distance || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, distance: Math.max(0, parseFloat(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">km</span>
                </div>
              </div>
              <div className="running-field">
                <div className="running-field-label">
                  <Mountain size={16} />
                  <span>Dénivelé</span>
                </div>
                <div className="running-input-group">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="running-input"
                    value={config.elevation || ''}
                    placeholder="0"
                    onChange={(e) => setRunningConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, elevation: Math.max(0, parseInt(e.target.value) || 0) } : c)
                    )}
                  />
                  <span className="running-input-unit">m</span>
                </div>
              </div>
              <div className="running-pace">
                <Gauge size={16} />
                {config.exercise.category === 'velo' ? (
                  <span>Vitesse : {formatSpeed(config.duration, config.distance)} km/h</span>
                ) : (
                  <span>Allure : {formatPace(config.duration, config.distance)} min/km</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {endurancePreviewXp > 0 && (
          <div className="sportco-xp-banner">
            <Zap size={16} />
            <span>
              {endurancePreviewXp} CaliPass gagnés
              <em>12 XP par quart d'heure, moitié moins en marche</em>
            </span>
          </div>
        )}

        {exerciseConfigs.map((config, i) => {
          const repsPerSet = Math.ceil(config.targetTotal / config.targetSets);
          return (
            <div key={config.exercise.id} className="config-card">
              <h3>{config.exercise.name}</h3>
              <div className="config-row">
                <span>Unité</span>
                <div className="unit-picker">
                  {([['reps', 'Reps'], ['seconds', 'Secondes']] as [SetUnit, string][]).map(([u, label]) => (
                    <button
                      key={u}
                      className={`unit-btn ${config.unit === u ? 'active' : ''}`}
                      onClick={() => setExerciseConfigs((prev) =>
                        prev.map((c, idx) => idx === i
                          ? { ...c, unit: u, targetTotal: u === 'seconds' ? 120 : 40 }
                          : c)
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-row">
                <span>Objectif total</span>
                <div className="stepper">
                  <button onClick={() => updateConfig(i, 'targetTotal', config.unit === 'seconds' ? -15 : -5)}>
                    <Minus size={16} />
                  </button>
                  <span>{config.targetTotal}{config.unit === 'seconds' ? ' s' : ''}</span>
                  <button onClick={() => updateConfig(i, 'targetTotal', config.unit === 'seconds' ? 15 : 5)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="config-row">
                <span>Séries</span>
                <div className="stepper">
                  <button onClick={() => updateConfig(i, 'targetSets', -1)}>
                    <Minus size={16} />
                  </button>
                  <span>{config.targetSets}</span>
                  <button onClick={() => updateConfig(i, 'targetSets', 1)}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="config-row">
                <span>Poids</span>
                <div className="stepper">
                  <button onClick={() => {
                    setExerciseConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, weight: Math.max(0, c.weight - 0.5), weighted: Math.max(0, c.weight - 0.5) > 0 } : c)
                    );
                  }}>
                    <Minus size={16} />
                  </button>
                  <span>{config.weight > 0 ? `${config.weight} kg` : '—'}</span>
                  <button onClick={() => {
                    setExerciseConfigs((prev) =>
                      prev.map((c, idx) => idx === i ? { ...c, weight: c.weight + 0.5, weighted: true } : c)
                    );
                  }}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              {config.weight > 0 && (
                <div className="config-row">
                  <span>Type</span>
                  <div className="weight-type-picker">
                    {([['body', 'Lesté'], ['halteres', 'Haltères'], ['barre', 'Barre']] as [WeightType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        className={`weight-type-btn ${config.weightType === type ? 'active' : ''}`}
                        onClick={() => setExerciseConfigs((prev) =>
                          prev.map((c, idx) => idx === i ? { ...c, weightType: type } : c)
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="config-result">
                → {repsPerSet} {config.unit === 'seconds' ? 'sec' : 'reps'} / série{config.weight > 0 ? ` • ${config.weight} kg ${config.weightType === 'halteres' ? '(haltères)' : config.weightType === 'barre' ? '(barre)' : '(lesté)'}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      <button className="primary-btn floating-btn" onClick={startSession}>
        {isRunningOnly ? 'Enregistrer' : 'Lancer la séance'}
      </button>
    </div>
  );
}
