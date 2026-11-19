/**
 * Corrige la durée d'une séance, avec le compte de service.
 *
 * Les règles Firestore n'autorisent la modification d'une séance qu'à son
 * propriétaire : même connecté, on ne peut pas réparer la séance de
 * quelqu'un d'autre depuis l'app. Ce script passe par l'Admin SDK, qui
 * contourne les règles — d'où la prudence : il n'écrit rien sans --ecrire,
 * et il montre toujours ce qu'il s'apprête à changer.
 *
 * La clé vient d'un fichier, et non de l'environnement : Vercel marque la
 * sienne comme sensible, et `vercel env pull` la redescend vide. Il faut
 * donc en générer une dans la console Firebase — Paramètres du projet,
 * Comptes de service, « Générer une nouvelle clé privée ». Les clés
 * déjà émises continuent de fonctionner, Vercel n'est pas touché.
 *
 * Usage :
 *   node outils/corrige-duree.mjs <sessionId> <minutes> --compte <cle.json>
 *   node outils/corrige-duree.mjs <sessionId> <minutes> --compte <cle.json> --ecrire
 *
 * Pense à supprimer le fichier de clé après : il ouvre toute la base.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

const [, , sessionId, minutesArg, ...flags] = process.argv;
const ecrire = flags.includes('--ecrire');
const minutes = Number(minutesArg);
const chemin = flags.includes('--compte') ? flags[flags.indexOf('--compte') + 1] : null;

if (!sessionId || !Number.isFinite(minutes) || minutes <= 0 || !chemin) {
  console.error('Usage : node outils/corrige-duree.mjs <sessionId> <minutes> --compte <cle.json> [--ecrire]');
  process.exit(1);
}

let compte;
try {
  compte = JSON.parse(await readFile(chemin, 'utf8'));
} catch (err) {
  console.error(`Clé illisible (${chemin}) : ${err.message}`);
  console.error('Génère-la dans la console Firebase : Paramètres du projet › Comptes de service.');
  process.exit(1);
}

if (getApps().length === 0) initializeApp({ credential: cert(compte) });
const db = getFirestore();

const ref = db.collection('sessions').doc(sessionId);
const snap = await ref.get();
if (!snap.exists) {
  console.error(`Aucune séance ${sessionId}.`);
  process.exit(1);
}

const s = snap.data();
const h = (sec) => `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
const reps = (s.exercises || []).reduce(
  (total, ex) => total + (ex.sets || []).reduce((n, set) => n + (set.reps || 0), 0),
  0
);

console.log(`Séance   ${sessionId}`);
console.log(`Joueur   ${s.userId}`);
console.log(`Date     ${s.date}`);
console.log(`Exos     ${(s.exercises || []).map((e) => e.exerciseName).join(', ')}`);
console.log(`Reps     ${reps}`);
console.log(`Durée    ${h(s.duration || 0)}  →  ${h(minutes * 60)}`);

if (!ecrire) {
  console.log('\nRien écrit. Relance avec --ecrire pour appliquer.');
  process.exit(0);
}

await ref.update({ duration: Math.round(minutes * 60) });
console.log('\nDurée corrigée.');
