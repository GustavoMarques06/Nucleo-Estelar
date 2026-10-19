import { getContext, output } from './context';

// Música ambiente gerada por código: acordes longos (pads) que trocam a cada 14 s e, de vez em quando,
// uma nota aguda com eco. Baixa, lenta e sem melodia fixa para não cansar em partidas longas.
const CHORD_SECONDS = 14;
const CHORDS: number[][] = [
  [110, 164.81, 220, 261.63, 329.63],      // Lá menor
  [87.31, 130.81, 174.61, 220, 329.63],    // Fá maior
  [130.81, 196, 246.94, 329.63, 293.66],   // Dó maior
  [98, 146.83, 196, 261.63, 293.66],       // Sol suspenso
];
const BELLS = [440, 523.25, 587.33, 659.25, 783.99];       // pentatônica de lá menor

let bus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextAt = 0;
let chord = 0;

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

function playChord(at: number) {
  const a = getContext();
  if (!a || !bus) return;
  const notes = CHORDS[chord % CHORDS.length];
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(bus);
  for (const f of notes) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 12;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.045, at + 4);
    g.gain.setValueAtTime(0.045, at + CHORD_SECONDS - 3);
    g.gain.linearRampToValueAtTime(0.0001, at + CHORD_SECONDS + 4);
    o.connect(g).connect(filter);
    o.start(at);
    o.stop(at + CHORD_SECONDS + 4.2);
  }
  // 2 a 3 notas agudas espalhadas pelo acorde
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const t = at + 2 + Math.random() * (CHORD_SECONDS - 4);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = BELLS[Math.floor(Math.random() * BELLS.length)];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 3.6);
  }
  chord++;
}

export function startMusic() {
  if (timer) return;
  const a = getContext();
  if (!a) return;
  bus ??= buildBus();
  nextAt = a.currentTime + 0.3;
  const tick = () => {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') return;
    while (nextAt < ctx.currentTime + 3) { playChord(Math.max(nextAt, ctx.currentTime)); nextAt += CHORD_SECONDS; }
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
