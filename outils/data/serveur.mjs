/**
 * Le tableau de bord de CaliCrew, en local.
 *
 * Un petit serveur qui tourne sur ta machine, lit Firestore avec la clé de
 * service et sert une page de chiffres. Rien n'est déployé, rien n'est
 * publié : il écoute sur 127.0.0.1, donc même un autre appareil du réseau
 * ne peut pas l'ouvrir.
 *
 * Volontairement hors de l'app : ces chiffres-là ne regardent personne
 * d'autre, et une page d'administration embarquée se serait retrouvée dans
 * le code que tout le monde télécharge.
 *
 * Usage :
 *   node outils/data/serveur.mjs
 *   node outils/data/serveur.mjs --compte /chemin/vers/cle.json --port 4321
 *   node outils/data/serveur.mjs --sans-navigateur
 *
 * La clé se range par défaut dans ~/.calicrew/cle.json — hors du dépôt, qui
 * est public. On la génère dans la console Firebase : Paramètres du projet,
 * Comptes de service, « Générer une nouvelle clé privée ».
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// Le même calcul que la version en ligne : une seule implémentation.
import { calcule } from '../../api/_lib/stats.cjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const valeur = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};

const CLE = valeur('--compte', join(homedir(), '.calicrew', 'cle.json'));
const PORT = Number(valeur('--port', '4321'));

let compte;
try {
  compte = JSON.parse(await readFile(CLE, 'utf8'));
} catch (err) {
  console.error(`\nClé de service illisible : ${CLE}`);
  console.error(`  ${err.message}\n`);
  console.error('Pour la créer :');
  console.error('  1. console.firebase.google.com > calicrew-ec042');
  console.error('  2. Paramètres du projet > Comptes de service');
  console.error('  3. « Générer une nouvelle clé privée »');
  console.error(`  4. mkdir -p ~/.calicrew && mv ~/Downloads/calicrew-*.json ${CLE}\n`);
  process.exit(1);
}

if (getApps().length === 0) initializeApp({ credential: cert(compte) });
const db = getFirestore();

/**
 * Les quatre collections, d'un bloc.
 *
 * Tout est relu à chaque rafraîchissement plutôt que tenu en cache : le
 * volume est celui d'un groupe d'amis, et un cache qui ment sur des
 * chiffres qu'on consulte justement pour savoir où l'on en est serait pire
 * que deux secondes d'attente.
 */
async function lisTout() {
  const [users, sessions, groups, progress] = await Promise.all([
    db.collection('users').get(),
    db.collection('sessions').get(),
    db.collection('groups').get(),
    db.collection('userProgress').get(),
  ]);
  return {
    users: users.docs.map((d) => ({ uid: d.id, ...d.data() })),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })),
    groups: groups.docs.map((d) => ({ id: d.id, ...d.data() })),
    progress: progress.docs.map((d) => ({ uid: d.id, ...d.data() })),
  };
}

const serveur = createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') {
      const page = await readFile(join(ICI, '..', '..', 'public', 'data.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(page);
    }
    if (req.url?.startsWith('/api/stats')) {
      const brut = await lisTout();
      const stats = calcule(brut);
      console.log(
        `  lu : ${brut.users.length} membres, ${brut.sessions.length} séances, ` +
        `${brut.groups.length} groupes`
      );
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(stats));
    }
    res.writeHead(404).end('Rien ici.');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erreur: err.message }));
  }
});

/*
 * Le port déjà pris veut presque toujours dire « il tourne déjà ».
 *
 * Sans ce garde-fou, Node crachait trente lignes de pile d'appels pour dire
 * ça — de quoi croire que l'outil est cassé alors qu'il suffit d'ouvrir
 * l'onglet.
 */
/*
 * Ouvrir le navigateur fait partie du lancement.
 *
 * Retenir un port est exactement le genre de détail qui fait qu'on n'ouvre
 * plus un outil. `--sans-navigateur` reste là pour les cas où l'on veut
 * juste le serveur, par exemple quand il tourne déjà dans un autre onglet.
 */
function ouvre(url) {
  if (args.includes('--sans-navigateur')) return;
  const cmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start' : 'xdg-open';
  // `detached` et les flux ignorés : le navigateur ne doit pas garder le
  // terminal en otage ni écrire par-dessus nos messages.
  spawn(cmd, [url], { detached: true, stdio: 'ignore' }).unref();
}

serveur.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  Le tableau de bord tourne déjà.\n  http://localhost:${PORT}\n`);
    console.log('  Pour le relancer malgré tout :');
    console.log(`    lsof -ti tcp:${PORT} | xargs kill\n`);
    // Il tourne : la page est bonne, autant l'ouvrir quand même.
    ouvre(`http://localhost:${PORT}`);
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});

// 127.0.0.1 et non 0.0.0.0 : personne d'autre sur le réseau ne doit pouvoir
// ouvrir cette page, pas même un téléphone branché au même wifi.
serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  CaliCrew — données\n  http://localhost:${PORT}\n`);
  console.log('  Ctrl+C pour arrêter.\n');
  ouvre(`http://localhost:${PORT}`);
});
