import type { GameState } from '../types';

export interface TimelineMark { id: string; name: string; when: (s: GameState) => boolean }

// Marcos da linha do tempo: o momento (em tempo de jogo) em que cada um chegou fica guardado, e a jornada
// seguinte pode ser comparada com as anteriores.
export const TIMELINE_MARKS: TimelineMark[] = [
  { id: 'refinery', name: 'Primeira refinaria', when: s => s.buildings.refinery > 0 },
  { id: 'lab', name: 'Pesquisa científica', when: s => !!s.upgrades.lab },
  { id: 'habitats', name: 'Primeiros colonos', when: s => !!s.upgrades.habitats },
  { id: 'exploration', name: 'Exploração estelar', when: s => !!s.upgrades.exploration },
  { id: 'outpost', name: 'Primeira colônia', when: s => s.locations.some(l => l.outpost) },
  { id: 'diplomacy', name: 'Contato com as facções', when: s => !!s.upgrades.diplomacy },
  { id: 'fusion', name: 'Fusão nuclear', when: s => !!s.upgrades.fusion },
  { id: 'dyson1', name: 'Enxame de Dyson', when: s => (s.megaprojects.dyson ?? 0) >= 1 },
  { id: 'ascension', name: 'Ascensão liberada', when: s => !!s.upgrades.ascensionProject },
];

/** Segundos de jogo entre duas amostras da curva de créditos. */
export const SAMPLE_EVERY = 900;
/** Amostras guardadas por jornada (120 h); depois disso a curva para de crescer. */
export const SAMPLE_MAX = 480;
/** Jornadas anteriores guardadas para comparar. */
export const PAST_MAX = 5;
