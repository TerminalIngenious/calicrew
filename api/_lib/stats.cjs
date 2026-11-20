/**
 * Le calcul des statistiques, à part du serveur et de la page.
 *
 * En CommonJS (.cjs) et non en module : Vercel compile les routes `api/` en
 * CommonJS, et un `require()` d'un module ESM échoue — c'est ce qui faisait
 * planter /api/data. Le .cjs, lui, se laisse charger par les deux mondes.
 *
 * Ici il n'y a que des fonctions sur des tableaux : aucune lecture réseau,
 * aucun rendu. C'est ce qui permet de changer un chiffre sans toucher au
 * reste, et de vérifier un calcul en l'appelant directement.
 */

const JOUR = 24 * 60 * 60 * 1000;

/** Minuit, il y a `recul` jours. Bornes locales : c'est une journée vécue. */
function minuit(recul = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - recul * JOUR;
}

/**
 * Le moment d'une séance.
 *
 * `startedAt` d'abord, `createdAt` ensuite : les deux existent presque
 * toujours, mais les plus vieilles séances n'ont que la seconde. Le champ
 * `date` est une chaîne de jour et ne sait pas ordonner deux séances du
 * même jour.
 */
function quand(s) {
  return s.startedAt || s.createdAt || 0;
}

function repsDe(s) {
  return (s.exercises || []).reduce(
    (total, ex) => total + (ex.sets || []).reduce((n, set) => n + (set.reps || 0), 0),
    0
  );
}

/** Au-delà, la séance n'a pas été terminée : on la signale. */
const SEANCE_ABERRANTE = 6 * 3600;

function calcule({ users, sessions, groups, progress }) {
  const debutJour = minuit();
  const debut7 = minuit(6);
  const debut30 = minuit(29);

  const parMembre = new Map();
  for (const s of sessions) {
    if (!s.userId) continue;
    const liste = parMembre.get(s.userId);
    if (liste) liste.push(s);
    else parMembre.set(s.userId, [s]);
  }

  const groupesDe = new Map();
  for (const g of groups) {
    for (const uid of g.memberIds || []) {
      groupesDe.set(uid, [...(groupesDe.get(uid) || []), g.name]);
    }
  }

  const progressDe = new Map(progress.map((p) => [p.uid, p]));

  const membres = users.map((u) => {
    const siennes = parMembre.get(u.uid) || [];
    const p = progressDe.get(u.uid) || {};
    return {
      uid: u.uid,
      nom: u.displayName || '(sans pseudo)',
      email: u.email || '',
      inscrit: u.createdAt || 0,
      groupes: groupesDe.get(u.uid) || [],
      seances: siennes.length,
      seances7: siennes.filter((s) => quand(s) >= debut7).length,
      seances30: siennes.filter((s) => quand(s) >= debut30).length,
      derniere: siennes.length ? Math.max(...siennes.map(quand)) : null,
      reps: siennes.reduce((n, s) => n + repsDe(s), 0),
      duree: siennes.reduce((n, s) => n + (s.duration || 0), 0),
      xp: p.passXp || 0,
      cartes: Object.keys(p.ownedCards || {}).length,
      saison: p.currentSeasonId || '',
    };
  });

  // Du plus récemment actif au plus ancien : c'est l'ordre qui sert à lire.
  membres.sort((a, b) => (b.derniere || 0) - (a.derniere || 0));

  const actifsDepuis = (borne) =>
    new Set(sessions.filter((s) => quand(s) >= borne).map((s) => s.userId)).size;

  const parJour = [];
  for (let i = 29; i >= 0; i--) {
    const debut = minuit(i);
    const duJour = sessions.filter((s) => quand(s) >= debut && quand(s) < debut + JOUR);
    parJour.push({
      jour: new Date(debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      seances: duJour.length,
      membres: new Set(duJour.map((s) => s.userId)).size,
    });
  }

  const parSemaine = [];
  for (let i = 11; i >= 0; i--) {
    const debut = minuit(i * 7 + 6);
    const fin = minuit(i * 7) + JOUR;
    const deLaSemaine = sessions.filter((s) => quand(s) >= debut && quand(s) < fin);
    parSemaine.push({
      semaine: new Date(debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      seances: deLaSemaine.length,
      membres: new Set(deLaSemaine.map((s) => s.userId)).size,
    });
  }

  const compteExo = new Map();
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      const nom = ex.exerciseName || ex.exerciseId;
      const actuel = compteExo.get(nom) || { seances: 0, reps: 0 };
      actuel.seances += 1;
      actuel.reps += (ex.sets || []).reduce((n, set) => n + (set.reps || 0), 0);
      compteExo.set(nom, actuel);
    }
  }

  /* L'heure de la journée où l'on s'entraîne. Sur `startedAt`, pas sur la
     fin : c'est le moment où l'on s'y met qui dit quelque chose. */
  const parHeure = Array.from({ length: 24 }, (_, h) => ({ heure: h, seances: 0 }));
  for (const s of sessions) {
    const t = quand(s);
    if (t) parHeure[new Date(t).getHours()].seances += 1;
  }

  const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const parJourSemaine = JOURS_SEMAINE.map((nom) => ({ nom, seances: 0 }));
  for (const s of sessions) {
    const t = quand(s);
    if (t) parJourSemaine[new Date(t).getDay()].seances += 1;
  }

  const nomDe = new Map(users.map((u) => [u.uid, u.displayName || u.uid]));

  return {
    genere: Date.now(),
    inscrits: users.length,
    inscrits7: users.filter((u) => (u.createdAt || 0) >= debut7).length,
    inscrits30: users.filter((u) => (u.createdAt || 0) >= debut30).length,
    actifsJour: actifsDepuis(debutJour),
    actifs7: actifsDepuis(debut7),
    actifs30: actifsDepuis(debut30),
    seancesJour: sessions.filter((s) => quand(s) >= debutJour).length,
    seances7: sessions.filter((s) => quand(s) >= debut7).length,
    seances30: sessions.filter((s) => quand(s) >= debut30).length,
    seancesTotal: sessions.length,
    repsTotal: sessions.reduce((n, s) => n + repsDe(s), 0),
    dureeTotal: sessions.reduce((n, s) => n + (s.duration || 0), 0),
    parJour,
    parSemaine,
    parHeure,
    parJourSemaine,
    membres,
    fantomes: membres.filter((m) => m.seances === 0),
    horsGroupe: membres.filter((m) => m.groupes.length === 0),
    endormis: membres.filter(
      (m) => m.seances > 0 && m.derniere && m.derniere < minuit(13)
    ),
    groupes: groups
      .map((g) => ({
        id: g.id,
        nom: g.name,
        code: g.code || '',
        membres: (g.memberIds || []).length,
        enAttente: (g.pendingIds || []).length,
        cree: g.createdAt || 0,
        createur: nomDe.get(g.createdBy) || g.createdBy || '',
      }))
      .sort((a, b) => b.membres - a.membres),
    topExercices: [...compteExo.entries()]
      .map(([nom, v]) => ({ nom, ...v }))
      .sort((a, b) => b.seances - a.seances)
      .slice(0, 15),
    aberrantes: sessions
      .filter((s) => (s.duration || 0) > SEANCE_ABERRANTE)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .map((s) => ({
        id: s.id,
        nom: nomDe.get(s.userId) || s.userId,
        date: s.date,
        heures: Math.round((s.duration || 0) / 360) / 10,
      })),
  };
}

module.exports = { calcule };
