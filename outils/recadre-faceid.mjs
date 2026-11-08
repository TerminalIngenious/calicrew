import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const PAIRES = [
  ['tristan',  'Tristan__Tristanchois - Professionnalisme.JPG', 'Tristan__Tristanchois - Shifumi Sensei.jpg'],
  ['matteo',   'Mattéo__IMG_1309.png',                          'Mattéo__Matteo dev - aura farming.png'],
  ['colinne',  'Colinne__IMG_4093.JPG',                         'Colinne__Folie.png'],
  ['mateo',    'Matéo__IMG_2299.JPG',                           'Matéo__IMG_2457.png'],
  ['marcus',   'Marcus__Le M - 0 gravité.JPG',                  'Marcus__Le M - Demonic form.PNG'],
  ['lucas',    'Lucas__LW - Ciao Energy.JPG',                   'Lucas__LW - 0_ travail.JPG'],
  ['johan',    'Johan__IMG_6242.png',                           'Johan__Johan - Colère.jpg'],
  ['hugo',     'Hugo__Hugo - Vacancier.JPG',                    'Hugo__Hugo - Batman form.JPG'],
  ['bastien',  'Bastien__LeMecDuDélire - Mewing Pas dans Star Wars.png', 'Bastien__Lemecdudelire - kawai.JPG'],
  ['clement',  null,                                            'Clément__Clément - très gros plan.JPG'],
];

const [, , detecteur, src, dest] = process.argv;
const RATIO = 3 / 4;
/** Hauteur visée du centre du visage dans la carte. Juste au-dessus du
 *  milieu : le bas est mangé par le voile qui porte le prénom. */
const CIBLE_Y = 0.42;

const fichiers = PAIRES.flatMap(([, a, b]) => [a, b]).filter(Boolean);
const infos = new Map();
for (const ligne of execFileSync(detecteur, fichiers.map((f) => path.join(src, f)),
    { encoding: 'utf8', maxBuffer: 1 << 24 }).trim().split('\n')) {
  const o = JSON.parse(ligne);
  infos.set(path.basename(o.path), o);
}

for (const [slug, a, b] of PAIRES) {
  for (const [face, fichier] of [['a', a], ['b', b]]) {
    if (!fichier) continue;
    const i = infos.get(path.basename(fichier));
    const { w, h, kind } = i;

    // On recadre sans zoomer : la plus grande fenêtre 3/4 possible, qu'on
    // fait seulement glisser. Zoomer sur le visage tuerait la moitié des
    // photos — la montagne derrière le randonneur fait la blague.
    let cw, ch;
    if (w / h > RATIO) { ch = h; cw = Math.round(h * RATIO); }
    else { cw = w; ch = Math.round(w / RATIO); }

    // Sur une boîte de corps, la tête est en haut, pas au milieu : viser le
    // centre du corps mettrait le torse là où on attend le visage.
    let cx = w / 2;
    let cy = h * 0.38;
    if (kind === 'visage') {
      cx = (i.x + i.fw / 2) * w;
      cy = (i.y + i.fh / 2) * h;
    } else if (kind === 'corps') {
      cx = (i.x + i.fw / 2) * w;
      cy = (i.y + i.fh * 0.12) * h;
    }

    const left = Math.max(0, Math.min(w - cw, Math.round(cx - cw / 2)));
    const top = Math.max(0, Math.min(h - ch, Math.round(cy - ch * CIBLE_Y)));

    const out = path.join(dest, `${slug}-${face}.webp`);
    const r = await sharp(path.join(src, fichier))
      .rotate()
      .extract({ left, top, width: cw, height: ch })
      .resize(900, 1200)
      .webp({ quality: 80 })
      .toFile(out);
    console.log(
      `${slug}-${face}`.padEnd(11),
      kind.padEnd(7),
      `| source ${w}×${h} → fenêtre ${cw}×${ch} à (${left},${top})`,
      `| ${Math.round(r.size / 1024)} ko`
    );
  }
}
