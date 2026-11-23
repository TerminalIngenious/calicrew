/**
 * Ménage ponctuel : un compte d'essai, et deux séances à durée folle.
 *
 * Gardé dans le dépôt parce qu'une suppression doit laisser une trace de
 * ce qu'elle a fait et pourquoi — pas parce qu'on le relancera.
 *
 * Rien n'est écrit sans --ecrire : la liste s'affiche d'abord, on la lit,
 * puis on relance.
 *
 * Usage :
 *   node outils/menage.mjs
 *   node outils/menage.mjs --ecrire
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ecrire = process.argv.includes('--ecrire');
const CLE = join(homedir(), '.calicrew', 'cle.json');

/** Le compte d'essai : adresse tapée au hasard, aucun groupe, mort en août. */
const TOM = 'BrbCXHZYWDbnQcqm8hCLFoPPQJ02';

/** Chronos oubliés et vides : rien à sauver dedans. */
const A_SUPPRIMER = ['7gHDHGH9OzKDmDVA1T3c'];

/*
 * Chronos oubliés mais pleins : la séance a eu lieu, c'est sa durée qui est
 * fausse. On la ramène à une heure et demie plutôt que d'effacer des
 * répétitions réellement faites.
 *
 * La séance de One_T à 7,5 h n'est pas là : sa durée est exactement la somme
 * des temps qu'il a saisis lui-même (VTT, vélo, basket). Ce n'est pas un
 * chrono parti en vrille, c'est une journée déclarée — la corriger
 * reviendrait à inventer.
 */
const A_CORRIGER = [['bavOVM6skJd79QGbyGdG', 90]];

let compte;
try {
  compte = JSON.parse(await readFile(CLE, 'utf8'));
} catch (err) {
  console.error(`Clé illisible (${CLE}) : ${err.message}`);
  process.exit(1);
}
if (getApps().length === 0) initializeApp({ credential: cert(compte) });
const db = getFirestore();

const faire = [];

// ── Tom ──
for (const c of ['users', 'userProgress', 'pushSubscriptions']) {
  const ref = db.collection(c).doc(TOM);
  if ((await ref.get()).exists) faire.push({ quoi: `supprimer ${c}/${TOM}`, go: () => ref.delete() });
}
const siennes = await db.collection('sessions').where('userId', '==', TOM).get();
for (const d of siennes.docs) {
  faire.push({
    quoi: `supprimer sessions/${d.id}  (Tom · ${d.data().date})`,
    go: () => d.ref.delete(),
  });
}

// ── Les séances à durée folle ──
for (const id of A_SUPPRIMER) {
  const ref = db.collection('sessions').doc(id);
  const s = await ref.get();
  if (!s.exists) continue;
  const d = s.data();
  faire.push({
    quoi: `supprimer sessions/${id}  (${d.date} · ${Math.round(d.duration / 360) / 10} h · séance vide)`,
    go: () => ref.delete(),
  });
}
for (const [id, minutes] of A_CORRIGER) {
  const ref = db.collection('sessions').doc(id);
  const s = await ref.get();
  if (!s.exists) continue;
  const d = s.data();
  faire.push({
    quoi: `corriger sessions/${id}  ${Math.round(d.duration / 360) / 10} h → ${minutes} min  (${d.date})`,
    go: () => ref.update({ duration: minutes * 60 }),
  });
}

// ── Le compte de connexion, en dernier : si quelque chose casse avant, il
// reste de quoi retrouver à qui appartenaient les documents. ──
let auth = null;
try {
  const u = await getAuth().getUser(TOM);
  auth = u.email || '(sans email)';
  faire.push({ quoi: `supprimer le compte Auth de Tom (${auth})`, go: () => getAuth().deleteUser(TOM) });
} catch {
  console.log('Compte Auth de Tom : déjà absent.');
}

console.log(`\n${faire.length} opération(s) :\n`);
for (const f of faire) console.log('  ·', f.quoi);

if (!ecrire) {
  console.log('\nRien fait. Relance avec --ecrire pour appliquer.\n');
  process.exit(0);
}

console.log('');
for (const f of faire) {
  await f.go();
  console.log('  ✓', f.quoi);
}
console.log('\nTerminé.\n');
