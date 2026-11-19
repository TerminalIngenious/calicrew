/**
 * Corrige la durée d'une séance, avec le compte de service.
 *
 * Les règles Firestore n'autorisent la modification d'une séance qu'à son
 * propriétaire : même connecté, on ne peut pas réparer la séance de
 * quelqu'un d'autre depuis l'app. Ce script passe par l'Admin SDK, qui
 * contourne les règles — d'où la prudence : il n'écrit rien sans --ecrire,
 * et il montre toujours ce qu'il s'apprête à changer.
 *
 * Usage :
 *   npx vercel env pull .env.admin --environment=production
 *   node --env-file=.env.admin outils/corrige-duree.mjs <sessionId> <minutes>
 *   node --env-file=.env.admin outils/corrige-duree.mjs <sessionId> <minutes> --ecrire
 *
 * Pense à supprimer .env.admin après : il contient la clé du compte de
 * service, qui ouvre toute la base.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [, , sessionId, minutesArg, ...flags] = process.argv;
const ecrire = flags.includes('--ecrire');
const minutes = Number(minutesArg);

if (!sessionId || !Number.isFinite(minutes) || minutes <= 0) {
  console.error('Usage : node outils/corrige-duree.mjs <sessionId> <minutes> [--ecrire]');
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('FIREBASE_SERVICE_ACCOUNT manquant. Fais d’abord :');
  console.error('  npx vercel env pull .env.admin --environment=production');
  console.error('puis relance avec  node --env-file=.env.admin …');
  process.exit(1);
}

if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(raw)) });
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
