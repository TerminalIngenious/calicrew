import type { CardRarity } from '../types';

/**
 * Sons synthétisés à la volée en Web Audio : aucun fichier à charger, donc
 * rien à mettre en cache pour la PWA et aucune latence au premier déclenchement.
 */

let ctx: AudioContext | null = null;
let master: AudioNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

type Ctor = typeof AudioContext;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const Impl: Ctor | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!Impl) return null;
  try {
    ctx = new Impl();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * À appeler dans le gestionnaire de clic. Les navigateurs — iOS en premier —
 * n'autorisent la création et la reprise du contexte audio que pendant un geste
 * utilisateur, or le son ne part qu'une seconde et demie plus tard.
 */
export function primeAudio(): void {
  const audio = getCtx();
  if (audio && audio.state === 'suspended') void audio.resume();
}

/**
 * Bus de sortie limité. Les trois couches se superposant, le cumul frôlait la
 * saturation sur les raretés hautes : le compresseur garantit qu'aucune
 * combinaison ne dépasse et ne produise de craquement.
 */
function getMaster(audio: AudioContext): AudioNode {
  if (master) return master;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  limiter.connect(audio.destination);
  master = limiter;
  return limiter;
}

function getNoise(audio: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(audio.sampleRate * 0.8);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/** Plus la carte est rare, plus l'explosion est ample et brillante. */
const INTENSITY: Record<CardRarity, { gain: number; tail: number; shimmer: number }> = {
  commune: { gain: 0.26, tail: 0.45, shimmer: 0 },
  rare: { gain: 0.32, tail: 0.6, shimmer: 2 },
  epique: { gain: 0.38, tail: 0.75, shimmer: 3 },
  legendaire: { gain: 0.45, tail: 0.95, shimmer: 4 },
  historique: { gain: 0.5, tail: 1.15, shimmer: 5 },
  intergalactique: { gain: 0.58, tail: 1.6, shimmer: 7 },
};

/** Souffle : bruit blanc filtré dont la coupure s'effondre, façon déflagration. */
function playBlast(audio: AudioContext, out: AudioNode, t: number, gain: number, tail: number) {
  const source = audio.createBufferSource();
  source.buffer = getNoise(audio);

  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(7000, t);
  filter.frequency.exponentialRampToValueAtTime(260, t + tail);

  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + tail);

  source.connect(filter).connect(env).connect(out);
  source.start(t);
  source.stop(t + tail + 0.05);
}

/** Impact grave : donne le poids du coup. */
function playThump(audio: AudioContext, out: AudioNode, t: number, gain: number) {
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.28);

  const env = audio.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + 0.38);
}

/** Éclats cristallins, réservés aux raretés élevées. */
function playShimmer(audio: AudioContext, out: AudioNode, t: number, count: number, gain: number) {
  const partials = [1568, 2093, 2637, 3136, 3951];
  for (let i = 0; i < count; i++) {
    const osc = audio.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = partials[i % partials.length];

    const env = audio.createGain();
    const start = t + 0.03 + i * 0.045;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain * 0.16, start + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + 0.6);
  }
}

/** Explosion jouée au moment où la carte éclate. */
export function playCardExplosion(rarity: CardRarity): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const { gain, tail, shimmer } = INTENSITY[rarity] ?? INTENSITY.commune;
  const t = audio.currentTime;

  try {
    const out = getMaster(audio);
    playBlast(audio, out, t, gain, tail);
    playThump(audio, out, t, gain * 0.9);
    if (shimmer > 0) playShimmer(audio, out, t, shimmer, gain);
  } catch {
    // Un son qui échoue ne doit jamais interrompre l'ouverture du coffre.
  }
}

// ── L'arrivée de la carte intergalactique ──

/**
 * La rumeur de la salle.
 *
 * Du bruit filtré très bas qui enfle, et rien d'autre : une vraie foule
 * demanderait un fichier, donc un téléchargement et un cache à gérer, pour
 * un son qu'on entend une fois dans sa vie. Celui-ci suffit à faire monter
 * la pression.
 */
export function playRumeur(duree = 6): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  try {
    const out = getMaster(audio);
    const t = audio.currentTime;
    const source = audio.createBufferSource();
    source.buffer = getNoise(audio);
    source.loop = true;

    const filtre = audio.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.Q.value = 0.8;
    filtre.frequency.setValueAtTime(300, t);
    filtre.frequency.linearRampToValueAtTime(900, t + duree * 0.8);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.09, t + duree * 0.6);
    env.gain.exponentialRampToValueAtTime(0.14, t + duree * 0.78);
    // Le silence juste avant la révélation : c'est lui qui fait l'effet.
    env.gain.exponentialRampToValueAtTime(0.0001, t + duree * 0.84);

    source.connect(filtre).connect(env).connect(out);
    source.start(t);
    source.stop(t + duree);
  } catch {
    // Un son raté ne doit jamais empêcher l'animation de se dérouler.
  }
}

/** Le gong d'ouverture. Trois partiels désaccordés, longue traîne. */
export function playCloche(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  try {
    const out = getMaster(audio);
    const t = audio.currentTime;
    // Désaccordés exprès : des partiels justes sonnent comme un synthé, pas
    // comme un métal frappé.
    for (const [freq, gain, duree] of [[523, 0.3, 2.6], [784, 0.16, 2.2], [1109, 0.1, 1.6]] as const) {
      const osc = audio.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 0.995, t + duree);

      const env = audio.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, t + duree);

      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + duree + 0.05);
    }
  } catch {
    // idem
  }
}

/** Un pas : le sol qui prend le poids de ce qui arrive. */
export function playPas(force = 1): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  try {
    const out = getMaster(audio);
    playThump(audio, out, audio.currentTime, 0.42 * force);
  } catch {
    // idem
  }
}

/**
 * La montée : un souffle dont la bande passante grimpe sans arrêt.
 *
 * C'est le son qui fait qu'on sent venir quelque chose avant de savoir
 * quoi. Il monte jusqu'au bout et se coupe net — une montée qui redescend
 * annonce une fausse alerte.
 */
export function playMontee(duree = 5): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  try {
    const out = getMaster(audio);
    const t = audio.currentTime;
    const source = audio.createBufferSource();
    source.buffer = getNoise(audio);
    source.loop = true;

    const filtre = audio.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.Q.value = 6;
    filtre.frequency.setValueAtTime(220, t);
    filtre.frequency.exponentialRampToValueAtTime(7200, t + duree);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.055, t + duree * 0.85);
    env.gain.exponentialRampToValueAtTime(0.11, t + duree * 0.97);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duree);

    source.connect(filtre).connect(env).connect(out);
    source.start(t);
    source.stop(t + duree + 0.05);
  } catch {
    // Un son raté ne doit jamais empêcher l'animation de se dérouler.
  }
}

/**
 * La chute : une sinusoïde qui plonge sous le seuil de l'audible.
 *
 * Elle ne s'entend pas vraiment, elle se sent — c'est elle qui donne du
 * ventre à l'impact, sous l'explosion qui part au même instant.
 */
export function playChute(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  try {
    const out = getMaster(audio);
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 1.5);

    const env = audio.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);

    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + 1.75);
  } catch {
    // idem
  }
}
