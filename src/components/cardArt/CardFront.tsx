import { useEffect, useLayoutEffect, useRef } from 'react';
import type { JSX } from 'react';
import { getRarityLabel } from '../../lib/cards';
import type { CardArt } from '../../lib/cardsS2Art';
import type { Card, CardRarity } from '../../types';
import './fonts.css';
import './CardFront.css';

/**
 * La face d'une carte de la saison 2, dessinée plutôt qu'affichée en image.
 *
 * C'est ce qui fait défiler la girouette en haut et tomber la pluie sur la
 * photo : une image figerait les deux. La carte reste aussi nette à n'importe
 * quel zoom, et corriger une stat ne demande pas de refaire un PNG.
 *
 * Tout est dimensionné en `cqw`, l'unité des container queries : la carte prend
 * la largeur qu'on lui donne et tout le reste suit. D'où un conteneur qui doit
 * avoir une largeur — dans un flex sans largeur, elle s'écraserait à zéro.
 */

/** Le kit nomme « mythique » ce que l'app appelle `historique`. */
const RARITY_CLASS: Record<CardRarity, string> = {
  commune: 'commune',
  rare: 'rare',
  epique: 'epique',
  legendaire: 'legendaire',
  historique: 'mythique',
};

const FLAGS: Record<string, JSX.Element> = {
  FR: <><rect width="1" height="2" fill="#0055a4" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ef4135" /></>,
  IT: <><rect width="1" height="2" fill="#009246" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#ce2b37" /></>,
  DE: <><rect width="3" height=".67" fill="#000" /><rect y=".67" width="3" height=".67" fill="#dd0000" /><rect y="1.33" width="3" height=".67" fill="#ffce00" /></>,
  AT: <><rect width="3" height="2" fill="#ed2939" /><rect y=".67" width="3" height=".67" fill="#fff" /></>,
  ES: <><rect width="3" height="2" fill="#c60b1e" /><rect y=".5" width="3" height="1" fill="#ffc400" /></>,
  CO: <><rect width="3" height="1" fill="#fcd116" /><rect y="1" width="3" height=".5" fill="#003893" /><rect y="1.5" width="3" height=".5" fill="#ce1126" /></>,
  VE: <><rect width="3" height=".67" fill="#ffcc00" /><rect y=".67" width="3" height=".67" fill="#00247d" /><rect y="1.33" width="3" height=".67" fill="#cf142b" /></>,
  RS: <><rect width="3" height=".67" fill="#c6363c" /><rect y=".67" width="3" height=".67" fill="#0c4076" /><rect y="1.33" width="3" height=".67" fill="#fff" /></>,
  LT: <><rect width="3" height=".67" fill="#fdb913" /><rect y=".67" width="3" height=".67" fill="#006a44" /><rect y="1.33" width="3" height=".67" fill="#c1272d" /></>,
  US: <><rect width="3" height="2" fill="#b22234" /><g fill="#fff">{[0.154, 0.462, 0.77, 1.077, 1.385, 1.692].map((y) => <rect key={y} y={y} width="3" height=".154" />)}</g><rect width="1.2" height="1.077" fill="#3c3b6e" /></>,
  GB: <><rect width="3" height="2" fill="#012169" /><path d="M0 0L3 2M3 0L0 2" stroke="#fff" strokeWidth=".4" /><path d="M0 0L3 2M3 0L0 2" stroke="#c8102e" strokeWidth=".14" /><path d="M1.5 0V2M0 1H3" stroke="#fff" strokeWidth=".6" /><path d="M1.5 0V2M0 1H3" stroke="#c8102e" strokeWidth=".35" /></>,
  CA: <><rect width="3" height="2" fill="#fff" /><rect width=".75" height="2" fill="#d52b1e" /><rect x="2.25" width=".75" height="2" fill="#d52b1e" /><path d="M1.5 .45L1.72 .85L1.95 .75L1.85 1.2L1.6 1.15V1.55H1.4V1.15L1.15 1.2L1.05 .75L1.28 .85Z" fill="#d52b1e" /></>,
  IL: <><rect width="3" height="2" fill="#fff" /><rect y=".2" width="3" height=".3" fill="#0038b8" /><rect y="1.5" width="3" height=".3" fill="#0038b8" /><path d="M1.5 .65L1.82 1.2H1.18Z M1.5 1.35L1.18 .8H1.82Z" fill="none" stroke="#0038b8" strokeWidth=".07" /></>,
  CU: <><rect width="3" height="2" fill="#002a8f" /><rect y=".4" width="3" height=".4" fill="#fff" /><rect y="1.2" width="3" height=".4" fill="#fff" /><path d="M0 0L1.73 1L0 2Z" fill="#cf142b" /><path d="M.58 .78L.64 .95H.82L.68 1.06L.73 1.23L.58 1.13L.43 1.23L.48 1.06L.34 .95H.52Z" fill="#fff" /></>,
  GR: <><rect width="3" height="2" fill="#0d5eaf" /><g fill="#fff">{[0.222, 0.667, 1.111, 1.556].map((y) => <rect key={y} y={y} width="3" height=".222" />)}</g><rect width="1.11" height="1.11" fill="#0d5eaf" /><rect x=".444" width=".222" height="1.11" fill="#fff" /><rect y=".444" width="1.11" height=".222" fill="#fff" /></>,
  SU: <><rect width="3" height="2" fill="#cc0000" /><path d="M.5 .2L.56 .38H.75L.6 .49L.65 .67L.5 .56L.35 .67L.4 .49L.25 .38H.44Z" fill="#ffd700" /></>,
};

function Flag({ code }: { code: string | null }) {
  if (!code || !FLAGS[code]) return null;
  return <svg className="cf-flag" viewBox="0 0 3 2" aria-hidden="true">{FLAGS[code]}</svg>;
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-1 1.7V20a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.3A2 2 0 0 1 3 16V5a2 2 0 0 1 2-2zm0 3v5h14V6H5zm2 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
}

// ── Fond automatique : prolonge les couleurs du bord de la photo ──

function avg(d: Uint8ClampedArray): string {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) continue;
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
  }
  return n ? `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})` : 'transparent';
}

/**
 * Les portraits n'ont pas tous le même format que l'emplacement prévu. Plutôt
 * que de les recadrer ou de laisser des bandes noires, on échantillonne les
 * bords de la photo et on prolonge ces couleurs sur les côtés.
 */
function fillBg(img: HTMLImageElement, bg: HTMLDivElement | null) {
  if (!bg) return;
  bg.className = 'cf-photo-bg';
  bg.style.background = '';
  img.style.removeProperty('--feather');
  const parent = img.parentElement;
  if (!parent) return;
  const box = parent.getBoundingClientRect();
  if (!box.width || !img.naturalWidth) return;
  const ir = img.naturalWidth / img.naturalHeight;
  const br = box.width / box.height;
  if (Math.abs(ir - br) < 0.02) return;
  const vertical = ir < br;
  const W = 80, H = Math.max(1, Math.round(W / ir)), BANDS = 6, EDGE = 4;
  try {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, W, H);
    const stops = (x: number, y: number, w: number, h: number, alongY: boolean) =>
      Array.from({ length: BANDS }, (_, i) => avg(alongY
        ? ctx.getImageData(x, Math.floor((i * H) / BANDS), w, Math.max(1, Math.ceil(H / BANDS))).data
        : ctx.getImageData(Math.floor((i * W) / BANDS), y, Math.max(1, Math.ceil(W / BANDS)), h).data)).join(',');
    const ow = box.height * ir, oh = box.width / ir;
    const side = vertical
      ? ((box.width - ow) / 2 / box.width) * 100
      : ((box.height - oh) / 2 / box.height) * 100;
    const f = vertical ? (6 * ow) / box.width : (6 * oh) / box.height;
    img.style.setProperty('--feather', vertical
      ? `linear-gradient(90deg,transparent ${side}%,#000 ${side + f}%,#000 ${100 - side - f}%,transparent ${100 - side}%)`
      : `linear-gradient(180deg,#000 0,#000 ${100 - 2 * side - f}%,transparent ${100 - 2 * side}%)`);
    bg.style.background = vertical
      ? `linear-gradient(180deg,${stops(0, 0, EDGE, H, true)}) left/50% 100% no-repeat,linear-gradient(180deg,${stops(W - EDGE, 0, EDGE, H, true)}) right/50% 100% no-repeat`
      : `linear-gradient(90deg,${stops(0, 0, W, EDGE, false)}) top/100% 50% no-repeat,linear-gradient(90deg,${stops(0, H - EDGE, W, EDGE, false)}) bottom/100% 50% no-repeat`;
  } catch {
    // Photo servie par un autre domaine sans CORS : le canvas est verrouillé,
    // on se rabat sur un fond flouté tiré de l'image elle-même.
    bg.classList.add('cf-blur');
    bg.style.background = `url("${img.src}") center/cover no-repeat`;
  }
}

/** Rétrécit un texte trop long jusqu'à ce qu'il tienne sur une ligne. */
function fit(el: HTMLElement, min: number) {
  el.style.fontSize = '';
  const base = parseFloat(getComputedStyle(el).fontSize);
  let s = base;
  while (el.scrollWidth > el.clientWidth + 1 && s > base * min) {
    s *= 0.96;
    el.style.fontSize = `${s}px`;
  }
}

interface Props {
  card: Card;
  art: CardArt;
  /** `false` fige la girouette et la pluie — utile pour une vignette. */
  anime?: boolean;
}

export default function CardFront({ card, art, anime = true }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const bg = useRef<HTMLDivElement>(null);

  const famille = card.category;
  const led = `LIGNE ${art.ligne} · ${famille.toUpperCase()} · `;

  useLayoutEffect(() => {
    const r = root.current;
    if (!r) return;
    const run = () => {
      r.querySelectorAll<HTMLElement>('.cf-first,.cf-last,.cf-nick').forEach((el) => fit(el, 0.45));
      r.querySelectorAll<HTMLElement>('.cf-stat .cf-k').forEach((el) => fit(el, 0.55));
      if (img.current?.complete) fillBg(img.current, bg.current);
    };
    run();
    // Les textes sont mesurés après coup : tant que les polices ne sont pas
    // chargées, les largeurs sont celles d'une police de repli.
    document.fonts?.ready.then(run);
    const ro = new ResizeObserver(run);
    ro.observe(r);
    return () => ro.disconnect();
  }, [card, art]);

  useEffect(() => {
    const i = img.current;
    if (!i) return;
    const onLoad = () => fillBg(i, bg.current);
    i.addEventListener('load', onLoad);
    return () => i.removeEventListener('load', onLoad);
  }, [art.photo]);

  return (
    <div className={`cf ${RARITY_CLASS[card.rarity]}${anime ? '' : ' cf-static'}`} ref={root}>
      <div className="cf-card">
        <div className="cf-inner">
          <div className="cf-bokeh" />
          <div className="cf-streetlight" />

          <div className="cf-photo">
            <div className="cf-photo-bg" ref={bg} />
            {art.photo ? (
              <img ref={img} src={art.photo} alt="" draggable={false} crossOrigin="anonymous" />
            ) : (
              <div className="cf-ph">
                <svg viewBox="0 0 100 110">
                  <circle cx="50" cy="34" r="22" fill="#8a8f9c" />
                  <path d="M8 110c0-26 19-44 42-44s42 18 42 44z" fill="#8a8f9c" />
                </svg>
              </div>
            )}
          </div>
          <div className="cf-glass" />
          <div className="cf-shade" />
          <div className="cf-rain" />

          <div className="cf-girouette">
            <div className="cf-line-no">{art.ligne}</div>
            <div className="cf-led">
              {/* Répété pour que la boucle du défilement ne laisse pas de trou. */}
              <div className="cf-led-scroll">{led}{led}{led}{led}</div>
            </div>
          </div>

          <div className="cf-value">
            <div className="cf-num">{art.valeur}</div>
            <div className="cf-tag">S2</div>
            <div className="cf-stop"><BusIcon /></div>
          </div>

          <div className="cf-rarity">
            <span>{getRarityLabel(card.rarity, card.set).toUpperCase()} ★</span>
          </div>

          <div className="cf-bottom">
            <div>
              {art.prenom && <div className="cf-first">{art.prenom.toUpperCase()}</div>}
              <div className="cf-last">{art.nom.toUpperCase()}</div>
              <div className="cf-nick">{card.subtitle}</div>
            </div>
            {art.citation && <div className="cf-quote">{art.citation}</div>}

            <div className="cf-stats">
              {art.stats.map((s) => (
                <div className="cf-stat" key={s.nom}>
                  <div className="cf-k">{s.nom}</div>
                  <div className="cf-v">{s.valeur}</div>
                  <div className="cf-bar"><i style={{ width: `${Math.min(s.valeur, 100)}%` }} /></div>
                </div>
              ))}
            </div>

            <div className="cf-panels">
              <div className="cf-skills">
                <h4>Compétences spéciales</h4>
                {art.competences.map((c) => (
                  <div className="cf-skill" key={c.nom}>
                    <div className="cf-ic">{c.icone}</div>
                    <div><b>{c.nom}</b><p>{c.description} <em>{c.bonus}</em></p></div>
                  </div>
                ))}
              </div>
              <div className="cf-infos">
                <h4>Infos réelles</h4>
                {art.infos.map((i) => (
                  <div className="cf-row" key={i.label}>
                    <span>{i.label}</span>
                    <span className={i.surligne ? 'cf-wanted' : ''}>
                      {i.valeur}
                      <Flag code={i.drapeau} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cf-footer">
              <span className="cf-logo">CALICREW</span>
              <span>LES FOUS DU BUS</span>
              <span>N° {art.numero}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
