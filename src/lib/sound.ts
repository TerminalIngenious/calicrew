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
