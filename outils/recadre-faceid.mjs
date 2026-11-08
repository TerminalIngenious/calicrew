import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/*
 * Un slug, la photo de la Face A, celle de la Face B.
 *
 * Une entrée peut être un objet `{ f, crop, contain }` au lieu d'un simple
 * nom de fichier. `crop` impose la fenêtre de découpe et court-circuite la
 * détection — utile quand le visage est si haut dans l'image qu'aucun
 * glissement ne peut le descendre à la bonne hauteur. `contain` fait rentrer
 * cette fenêtre en entier au lieu de la rogner, en laissant des bandes
 * transparentes sur les côtés : le fond du scanner s'y voit, et une tête qui
 * ne tient pas dans un format 3/4 tient quand même sur la carte.
 */
const PAIRES = [
  ['tristan',  'Tristan__Tristanchois - Professionnalisme.JPG', 'Tristan__Tristanchois - Shifumi Sensei.jpg'],
  /*
   * Gros plan : la tête fait 1170 px de haut pour 1125 de large, elle ne peut
   * pas tenir dans un format 3/4 sans qu'on rogne les cheveux ou qu'on noie
   * les lèvres sous le prénom. On la fait donc rentrer en entier, avec deux
   * bandes transparentes de 43 px sur les côtés où la grille du scanner
   * continue. La fenêtre est calée pour que les lèvres tombent à 58 % de la
   * carte : le prénom commence à 63 %, et c'est le rouge à lèvres qui fait
   * la carte. La légende Snapchat reste dans le champ : la voir ne gêne
   * personne, et vouloir la cacher coûtait la moitié de la tête.
   */
  ['matteo',   'Mattéo__IMG_1309.png',
               { f: 'Mattéo__drag-queen.jpg', contain: true,
                 crop: { left: 0, top: 187, width: 1125, height: 1660 } }],
  ['colinne',  'Colinne__IMG_4093.JPG',
               { f: 'Colinne__gene-asiatique.jpg', crop: { left: 330, top: 0, width: 615, height: 820 } }],
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

const nomDe = (e) => (typeof e === 'string' ? e : e?.f);
const cropDe = (e) => (typeof e === 'string' ? null : e?.crop);
const containDe = (e) => (typeof e === 'string' ? false : !!e?.contain);

const fichiers = PAIRES.flatMap(([, a, b]) => [a, b]).filter(Boolean).map(nomDe);
const infos = new Map();
for (const ligne of execFileSync(detecteur, fichiers.map((f) => path.join(src, f)),
    { encoding: 'utf8', maxBuffer: 1 << 24 }).trim().split('\n')) {
  const o = JSON.parse(ligne);
  infos.set(path.basename(o.path), o);
}

for (const [slug, a, b] of PAIRES) {
  for (const [face, entree] of [['a', a], ['b', b]]) {
    if (!entree) continue;
    const fichier = nomDe(entree);
    const impose = cropDe(entree);
    const contain = containDe(entree);
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

    let left = Math.max(0, Math.min(w - cw, Math.round(cx - cw / 2)));
    let top = Math.max(0, Math.min(h - ch, Math.round(cy - ch * CIBLE_Y)));
    if (impose) ({ left, top, width: cw, height: ch } = impose);

    const out = path.join(dest, `${slug}-${face}.webp`);
    const r = await sharp(path.join(src, fichier))
      .rotate()
      .extract({ left, top, width: cw, height: ch })
      .resize(900, 1200, contain
        // Fond transparent et non noir : les bandes laissent voir la grille
        // et l'empreinte de la carte, au lieu d'y coller deux barres.
        ? { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }
        : undefined)
      .webp({ quality: 80, alphaQuality: 90 })
      .toFile(out);
    console.log(
      `${slug}-${face}`.padEnd(11),
      (impose ? 'imposé' : kind).padEnd(7) + (contain ? ' entier' : ''),
      `| source ${w}×${h} → fenêtre ${cw}×${ch} à (${left},${top})`,
      `| ${Math.round(r.size / 1024)} ko`
    );
  }
}
