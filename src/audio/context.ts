// Contexto de áudio compartilhado: volume geral e primitivas de síntese (tom e ruído).
// Tudo é sintetizado no navegador (sem arquivos de som) e passa por um único ganho mestre.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;

export function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume * volume;       // curva quadrática: o controle soa mais uniforme
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Saída de todo o áudio do jogo (ganho mestre). */
export const output = (): AudioNode | null => { getContext(); return master; };

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (master && ctx) master.gain.setTargetAtTime(volume * volume, ctx.currentTime, 0.05);
}

/** Navegadores só liberam o áudio depois de um gesto do usuário. */
export function resumeContext() {
  const c = getContext();
  if (c && c.state === 'suspended') c.resume().catch(() => undefined);
}

export interface ToneOptions { type?: OscillatorType; vol?: number; slide?: number; delay?: number }

export function tone(freq: number, dur: number, { type = 'square', vol = 0.05, slide = 0, delay = 0 }: ToneOptions = {}) {
  const a = getContext(), out = output();
  if (!a || !out) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function noise(dur: number, vol = 0.04) {
  const a = getContext(), out = output();
  if (!a || !out) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1200;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(f).connect(g).connect(out);
  src.start();
}
