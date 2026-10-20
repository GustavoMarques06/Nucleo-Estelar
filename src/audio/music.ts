import { getContext, output } from './context';
import type { MusicPhase } from './phase';

// Música ambiente gerada por código. Cada fase da jornada tem a sua trilha: do começo solitário (poucas notas, graves),
// passando pela indústria (pulso suave), civilização (arpejos), expansão e império (cordas) até o épico e o além
// (baixo profundo, metais e coral). Os acordes trocam sozinhos e se sobrepõem, então mudar de fase é uma transição suave.
interface PhaseConfig {
  seconds: number;               // duração de cada acorde
  chords: number[][];
  bells: number[];               // notas agudas com eco
  bellCount: [number, number];   // quantas por acorde (mín, máx)
  pad: { wave: OscillatorType; gain: number; cutoff: number };
  pulse?: boolean;               // batida grave e suave a cada 2 s
  arp?: number;                  // arpejo: intervalo em segundos entre as notas
  strings?: boolean;             // camada de cordas (serrilhada filtrada, desafinada)
  drone?: boolean;               // baixo contínuo profundo
  brass?: boolean;               // crescendo de metais a cada acorde
  shimmer?: boolean;             // vibrato lento e notas muito agudas (coral)
}

const AM9 = [110, 164.81, 220, 329.63];
const PHASES: Record<MusicPhase, PhaseConfig> = {
  solitude: {
    seconds: 16, pad: { wave: 'triangle', gain: 0.034, cutoff: 700 }, bellCount: [1, 2],
    chords: [AM9, [98, 146.83, 196, 293.66], [87.31, 130.81, 174.61, 261.63], [110, 164.81, 246.94, 329.63]],
    bells: [440, 523.25, 659.25, 783.99],
  },
  industry: {
    seconds: 15, pad: { wave: 'triangle', gain: 0.04, cutoff: 850 }, bellCount: [1, 3], pulse: true,
    chords: [[110, 164.81, 220, 261.63, 329.63], [87.31, 130.81, 174.61, 220, 329.63], [130.81, 196, 246.94, 329.63], [98, 146.83, 196, 261.63, 293.66]],
    bells: [440, 523.25, 587.33, 659.25, 783.99],
  },
  civilization: {
    seconds: 14, pad: { wave: 'triangle', gain: 0.042, cutoff: 1000 }, bellCount: [2, 3], arp: 1.75,
    chords: [[130.81, 196, 261.63, 329.63], [174.61, 220, 261.63, 349.23], [196, 246.94, 293.66, 392], [110, 220, 261.63, 329.63]],
    bells: [523.25, 587.33, 659.25, 783.99, 880],
  },
  expansion: {
    seconds: 14, pad: { wave: 'sine', gain: 0.05, cutoff: 1100 }, bellCount: [2, 4], arp: 2.4, strings: false,
    chords: [[146.83, 220, 293.66, 440], [110, 164.81, 246.94, 329.63, 493.88], [130.81, 196, 293.66, 392], [98, 146.83, 220, 293.66, 440]],
    bells: [587.33, 659.25, 783.99, 880, 987.77, 1174.66],
  },
  empire: {
    seconds: 13, pad: { wave: 'triangle', gain: 0.045, cutoff: 1300 }, bellCount: [3, 4], arp: 1.5, strings: true,
    chords: [[110, 164.81, 220, 261.63, 392], [87.31, 130.81, 174.61, 220, 329.63], [130.81, 196, 261.63, 329.63, 392], [98, 146.83, 196, 246.94, 392]],
    bells: [659.25, 783.99, 880, 987.77, 1174.66, 1318.5],
  },
  epic: {
    seconds: 12, pad: { wave: 'triangle', gain: 0.05, cutoff: 1500 }, bellCount: [3, 4], arp: 1.25, strings: true, drone: true, brass: true,
    chords: [[110, 164.81, 220, 329.63, 440], [130.81, 196, 261.63, 392], [87.31, 130.81, 174.61, 261.63, 349.23], [98, 146.83, 196, 293.66, 392]],
    bells: [783.99, 880, 987.77, 1174.66, 1318.5, 1567.98],
  },
  beyond: {
    seconds: 18, pad: { wave: 'sine', gain: 0.055, cutoff: 1800 }, bellCount: [3, 5], strings: true, drone: true, shimmer: true,
    chords: [[98, 146.83, 220, 330, 494], [87.31, 130.81, 196, 293.66, 440], [110, 164.81, 246.94, 369.99, 554.37], [73.42, 110, 164.81, 246.94, 369.99]],
    bells: [1046.5, 1318.5, 1567.98, 1760, 2093, 2349.3],
  },
};

let bus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextAt = 0;
let chord = 0;
let phase: MusicPhase = 'solitude';

function buildBus(): GainNode | null {
  const a = getContext(), out = output();
  if (!a || !out) return null;
  const g = a.createGain();
  g.gain.value = 0.5;
  // eco suave para as notas agudas
  const delay = a.createDelay(1);
  delay.delayTime.value = 0.46;
  const fb = a.createGain();
  fb.gain.value = 0.38;
  delay.connect(fb).connect(delay);
  g.connect(delay);
  delay.connect(out);
  g.connect(out);
  return g;
}

/** Nota simples com ataque e queda: a base das camadas extras. */
function note(freq: number, at: number, len: number, o: { wave?: OscillatorType; vol: number; attack?: number; cutoff?: number; detune?: number; dest?: AudioNode }) {
  const a = getContext();
  if (!a || !bus) return;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.wave ?? 'sine';
  osc.frequency.value = freq;
  if (o.detune) osc.detune.value = o.detune;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(o.vol, at + (o.attack ?? 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  let tail: AudioNode = g;
  osc.connect(g);
  if (o.cutoff) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.cutoff; g.connect(f); tail = f; }
  tail.connect(o.dest ?? bus);
  osc.start(at);
  osc.stop(at + len + 0.1);
}

function playChord(at: number) {
  const a = getContext();
  if (!a || !bus) return;
  const cfg = PHASES[phase];
  const notes = cfg.chords[chord % cfg.chords.length];
  const len = cfg.seconds;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cfg.pad.cutoff;
  filter.connect(bus);
  for (const f of notes) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = cfg.pad.wave;
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 12;
    if (cfg.shimmer) {                       // vibrato lento: coral etéreo
      const lfo = a.createOscillator(), lg = a.createGain();
      lfo.frequency.value = 0.18 + Math.random() * 0.2;
      lg.gain.value = 7;
      lfo.connect(lg).connect(o.detune);
      lfo.start(at); lfo.stop(at + len + 4.2);
    }
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(cfg.pad.gain, at + 4);
    g.gain.setValueAtTime(cfg.pad.gain, at + len - 3);
    g.gain.linearRampToValueAtTime(0.0001, at + len + 4);
    o.connect(g).connect(filter);
    o.start(at);
    o.stop(at + len + 4.2);
  }
  // notas agudas espalhadas pelo acorde, com eco
  const [lo, hi] = cfg.bellCount;
  const count = lo + Math.floor(Math.random() * (hi - lo + 1));
  for (let i = 0; i < count; i++) {
    note(cfg.bells[Math.floor(Math.random() * cfg.bells.length)], at + 2 + Math.random() * (len - 4), 3.5, { vol: 0.035, attack: 0.03 });
  }
  if (cfg.pulse) for (let t = 0; t < len; t += 2) note(55, at + t, 0.9, { wave: 'sine', vol: 0.05, attack: 0.04 });
  if (cfg.arp) {
    const top = notes.slice(-3);
    for (let t = 1, k = 0; t < len - 1; t += cfg.arp, k++) note(top[k % top.length] * 2, at + t, 1.1, { wave: 'triangle', vol: 0.02, attack: 0.015 });
  }
  if (cfg.strings) for (const f of notes.slice(0, 3)) { for (const d of [-9, 9]) note(f * 2, at, len + 3, { wave: 'sawtooth', vol: 0.012, attack: 3.5, cutoff: 900, detune: d }); }
  if (cfg.drone) note(notes[0] / 2, at, len + 4, { wave: 'sawtooth', vol: 0.03, attack: 5, cutoff: 260 });
  if (cfg.brass) note(notes[1], at + len * 0.45, len * 0.55, { wave: 'sawtooth', vol: 0.02, attack: len * 0.3, cutoff: 650 });
  chord++;
}

/** Troca a trilha (a próxima nota já sai no novo clima; os acordes em andamento se desfazem sozinhos). */
export function setMusicPhase(next: MusicPhase) {
  if (next === phase) return;
  phase = next;
  chord = 0;
}

export function currentMusicPhase(): MusicPhase { return phase; }

export function startMusic() {
  if (timer) return;
  const a = getContext();
  if (!a) return;
  bus ??= buildBus();
  nextAt = a.currentTime + 0.3;
  const tick = () => {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') return;
    while (nextAt < ctx.currentTime + 3) { playChord(Math.max(nextAt, ctx.currentTime)); nextAt += PHASES[phase].seconds; }
  };
  tick();
  timer = setInterval(tick, 1000);
}

export function stopMusic() {
  if (timer) { clearInterval(timer); timer = null; }
  const a = getContext();
  if (a && bus) {
    // some com um fade curto; os acordes já agendados se extinguem sozinhos
    bus.gain.setTargetAtTime(0.0001, a.currentTime, 0.4);
    const old = bus;
    bus = null;
    setTimeout(() => old.disconnect(), 5000);
  }
}
