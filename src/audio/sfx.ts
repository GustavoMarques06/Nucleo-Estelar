import type { GameEvent } from '../game/events';
import { noise, tone } from './context';
import { BUILDING_BY_ID } from '../game/data/buildings';
import type { Category } from '../game/types';

let lastClick = 0;

/** Efeito sonoro de cada evento do jogo (todos curtos e discretos). */
type Handler<K extends GameEvent['type']> = (e: Extract<GameEvent, { type: K }>) => void;

/** Construir soa diferente por tipo de estrutura: batida na mineração, faísca na energia, sino na ciência... */
const BUILD_SOUND: Record<Category, () => void> = {
  mining: () => { noise(0.09, 0.06); tone(120, 0.1, { type: 'square', vol: 0.035, slide: -40 }); tone(240, 0.08, { delay: 0.08 }); },
  industry: () => { tone(196, 0.07, { type: 'square', vol: 0.03 }); tone(294, 0.09, { type: 'square', delay: 0.07, vol: 0.03 }); noise(0.05, 0.04); },
  energy: () => { tone(660, 0.05, { type: 'sawtooth', vol: 0.03, slide: 400 }); tone(1320, 0.12, { type: 'triangle', delay: 0.05, vol: 0.03 }); },
  logistics: () => { tone(247, 0.1, { type: 'triangle' }); tone(330, 0.12, { type: 'triangle', delay: 0.08 }); },
  science: () => { tone(988, 0.1, { type: 'sine', vol: 0.04 }); tone(1319, 0.2, { type: 'sine', delay: 0.09, vol: 0.035 }); },
  civilization: () => { tone(392, 0.12, { type: 'triangle' }); tone(494, 0.12, { type: 'triangle', delay: 0.09 }); tone(587, 0.2, { type: 'triangle', delay: 0.18 }); },
  commerce: () => { tone(1568, 0.05, { type: 'triangle', vol: 0.03 }); tone(2093, 0.14, { type: 'triangle', delay: 0.05, vol: 0.03 }); },
  expansion: () => { tone(262, 0.3, { type: 'sawtooth', vol: 0.025, slide: 260 }); tone(523, 0.16, { type: 'triangle', delay: 0.18 }); },
  diplomacy: () => { tone(330, 0.2, { type: 'triangle' }); tone(392, 0.2, { type: 'triangle', delay: 0.02 }); tone(494, 0.3, { type: 'triangle', delay: 0.02 }); },
};

export const SFX: { [K in GameEvent['type']]?: Handler<K> } = {
  mined: () => { const now = performance.now(); if (now - lastClick < 60) return; lastClick = now; noise(0.06, 0.05); tone(140, 0.05, { vol: 0.03, slide: -60 }); },
  sold: () => { tone(880, 0.07, { type: 'triangle' }); tone(1320, 0.1, { type: 'triangle', delay: 0.06 }); },
  built: e => (BUILD_SOUND[BUILDING_BY_ID[e.id]?.category] ?? (() => { tone(330, 0.08); tone(495, 0.1, { delay: 0.07 }); }))(),
  upgraded: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: 'triangle', delay: i * 0.07, vol: 0.04 })); },
  expeditionLaunched: () => tone(220, 0.5, { type: 'sawtooth', slide: 600, vol: 0.03 }),
  discovered: () => { tone(660, 0.12, { type: 'sine' }); tone(990, 0.2, { type: 'sine', delay: 0.1 }); },
  outpost: () => { tone(392, 0.12, { type: 'triangle' }); tone(523, 0.12, { type: 'triangle', delay: 0.1 }); tone(784, 0.25, { type: 'triangle', delay: 0.2 }); },
  mega: () => { tone(55, 0.9, { type: 'sawtooth', vol: 0.06 }); tone(110, 0.9, { type: 'sine', delay: 0.1, vol: 0.05 }); },
  ascended: () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'sine', delay: i * 0.09, vol: 0.04 })); },
  spaceEvent: () => { tone(740, 0.15, { type: 'sine' }); tone(740, 0.15, { type: 'sine', delay: 0.25 }); },
  eventChosen: () => tone(600, 0.12, { type: 'triangle' }),
  denied: () => tone(120, 0.12, { vol: 0.04 }),
  goal: () => { tone(659, 0.09, { type: 'triangle' }); tone(880, 0.09, { type: 'triangle', delay: 0.08 }); tone(1319, 0.2, { type: 'triangle', delay: 0.16 }); },
  crisis: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.04 }); tone(196, 0.3, { type: 'sawtooth', delay: 0.2, vol: 0.04 }); },
  crisisSolved: () => { tone(440, 0.1, { type: 'triangle' }); tone(660, 0.18, { type: 'triangle', delay: 0.09 }); },
  route: () => { tone(523, 0.07, { vol: 0.03 }); tone(784, 0.07, { delay: 0.06, vol: 0.03 }); tone(1047, 0.12, { delay: 0.12, vol: 0.03 }); },
  terraformed: () => { tone(330, 0.2, { type: 'sine' }); tone(494, 0.2, { type: 'sine', delay: 0.15 }); tone(659, 0.35, { type: 'sine', delay: 0.3 }); },
  gift: () => { tone(587, 0.1, { type: 'triangle' }); tone(880, 0.16, { type: 'triangle', delay: 0.09 }); },
  ending: () => { [196, 262, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, { type: 'sine', delay: i * 0.18, vol: 0.045 })); },
  transcended: () => { [131, 196, 262, 392, 523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.6, { type: 'triangle', delay: i * 0.12, vol: 0.045 })); },
  achievement: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { delay: i * 0.08, vol: 0.035 })); },
  contract: () => { tone(523, 0.08, { type: 'triangle' }); tone(784, 0.08, { type: 'triangle', delay: 0.07 }); tone(1047, 0.15, { type: 'triangle', delay: 0.14 }); },
  milestone: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.16, { type: 'square', delay: i * 0.06, vol: 0.03 })); },
  layer: () => { tone(98, 0.6, { type: 'sawtooth', vol: 0.05, slide: -30 }); [392, 523, 659].forEach((f, i) => tone(f, 0.25, { type: 'sine', delay: 0.25 + i * 0.1, vol: 0.04 })); },
  golden: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, { type: 'triangle', delay: i * 0.04, vol: 0.035 })); },
  prospect: () => { tone(1568, 0.5, { type: 'sine', vol: 0.035 }); tone(1568, 0.5, { type: 'sine', vol: 0.02, delay: 0.32 }); noise(0.05, 0.03); },
  veinDepleted: () => { tone(220, 0.3, { type: 'triangle', slide: -90, vol: 0.04 }); noise(0.18, 0.05); },
  decree: () => { tone(196, 0.22, { type: 'sawtooth', vol: 0.035 }); tone(392, 0.35, { type: 'triangle', delay: 0.16, vol: 0.04 }); tone(784, 0.4, { type: 'sine', delay: 0.3, vol: 0.035 }); },
  challenge: e => { if (e.done) [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', delay: i * 0.08, vol: 0.045 })); else { tone(147, 0.3, { type: 'sawtooth', vol: 0.045 }); tone(220, 0.4, { type: 'sawtooth', delay: 0.22, vol: 0.04 }); } },
  territory: () => { tone(185, 0.25, { type: 'sawtooth', vol: 0.035 }); tone(139, 0.35, { type: 'sawtooth', delay: 0.18, vol: 0.035 }); },
  nav: () => tone(520, 0.03, { type: 'sine', vol: 0.012 }),
  eventScan: () => { for (let i = 0; i < 4; i++) tone(1200 + i * 180, 0.05, { type: 'sine', delay: i * 0.28, vol: 0.02 }); noise(0.4, 0.015); },
  eventReveal: e => (e.good ? tone(1047, 0.1, { type: 'triangle', vol: 0.035 }) : tone(330, 0.12, { type: 'triangle', vol: 0.03 })),
  overclock: () => { tone(110, 0.5, { type: 'sawtooth', slide: 440, vol: 0.04 }); tone(880, 0.2, { type: 'square', delay: 0.4, vol: 0.025 }); },
};
