import type { GameState } from '../types';

// Civilização: eras que crescem com a população, bem-estar da sociedade e um legado que atravessa as jornadas.
// Sem importar o resto do motor (modifiers e economia importam este arquivo).

export interface EraDef {
  id: string;
  name: string;
  desc: string;
  /** População mínima para entrar na era. */
  at: number;
  /** Ícone da era (sprite em public/assets/sprites); a cena larga fica em public/assets/art/era-scene-<id>.jpg. */
  sprite: string;
  /** Exigência extra além da população (a última era pede ter transcendido). */
  extra?: (s: GameState) => boolean;
}

export const ERAS: EraDef[] = [
  { id: 'camp', name: 'Acampamento', at: 1, sprite: 'era-camp',
    desc: 'Poucas pessoas, muitas tendas e uma luz acesa à noite. Ninguém aqui sabe se vai ficar.' },
  { id: 'village', name: 'Vila', at: 25, sprite: 'era-village',
    desc: 'As tendas viram casas. Há horta, há crianças, e alguém já reclama do vizinho.' },
  { id: 'town', name: 'Cidade', at: 250, sprite: 'era-town',
    desc: 'Ruas, escolas, mercado. A base deixa de ser um posto e vira um lugar com nome.' },
  { id: 'metropolis', name: 'Metrópole', at: 2500, sprite: 'era-metropolis',
    desc: 'Torres, rotas e turnos que nunca terminam. A cidade não dorme mais.' },
  { id: 'arcology', name: 'Arcologia', at: 25000, sprite: 'era-arcology',
    desc: 'Cidades-torre que se bastam. Gerações inteiras nascem sem ver o chão de Aurora.' },
  { id: 'ecumene', name: 'Ecumenópole', at: 250000, sprite: 'era-ecumene',
    desc: 'Um mundo inteiro é uma única cidade, com bairros do tamanho de países.' },
  { id: 'stellar', name: 'Civilização Estelar', at: 500000, sprite: 'era-stellar', extra: s => s.transcendence.count >= 1,
    desc: 'A sociedade atravessou o fim e voltou. Sua memória cruza estrelas e jornadas.' },
];

/** Bônus por degrau de era (da era atual) e por degrau do legado (a melhor era já alcançada em qualquer jornada). */
export const ERA_TAX = 0.06;
export const ERA_GROWTH = 0.05;
export const LEGACY_TAX = 0.03;
export const LEGACY_GROWTH = 0.04;

/** Índice da era (0 = ainda sem era; 1 = Acampamento…). */
export function eraIndex(s: Pick<GameState, 'resources' | 'transcendence'>): number {
  const pop = s.resources.population;
  let idx = 0;
  ERAS.forEach((e, i) => { if (pop >= e.at && (!e.extra || e.extra(s as GameState))) idx = i + 1; });
  return idx;
}

export const currentEra = (s: GameState): EraDef | null => ERAS[eraIndex(s) - 1] ?? null;
export const nextEra = (s: GameState): EraDef | null => ERAS[eraIndex(s)] ?? null;

/** Fração do caminho até a próxima era (0–1; 1 quando não há próxima). */
export function eraProgress(s: GameState): number {
  const next = nextEra(s);
  if (!next) return 1;
  const cur = currentEra(s);
  const from = cur?.at ?? 0;
  return Math.max(0, Math.min(1, (s.resources.population - from) / Math.max(1, next.at - from)));
}

/** Bônus de impostos e de crescimento populacional vindos da era atual e do legado. */
export function civBonus(s: GameState) {
  const era = eraIndex(s), best = s.civ.best;
  return { tax: 1 + ERA_TAX * era + LEGACY_TAX * best, growth: 1 + ERA_GROWTH * era + LEGACY_GROWTH * best };
}

// ---------- Bem-estar ----------
export interface WellbeingPart { id: 'food' | 'housing' | 'work' | 'health' | 'energy'; value: number }

/**
 * Bem-estar da sociedade (0–1): comida em estoque, moradia, trabalho, saúde e energia. Cada parte vale 0–1;
 * a média multiplica impostos e crescimento em 0,9–1,1.
 */
export function wellbeing(
  s: GameState,
  inputs: { foodNeed: number; cap: number; workRatio: number; energyRatio: number; healthUnlocked: boolean },
): { score: number; parts: WellbeingPart[]; factor: number } {
  const pop = s.resources.population;
  const food = inputs.foodNeed > 0 ? Math.min(1, s.resources.food / (inputs.foodNeed * 60)) : 1;       // 1 minuto de reserva = tranquilo
  const housing = pop <= 0 ? 1 : Math.min(1, inputs.cap / pop);
  const health = !inputs.healthUnlocked ? 1 : pop <= 0 ? 1 : Math.min(1, (s.buildings.hospital * 500) / pop);   // 1 centro médico por 500 pessoas
  const parts: WellbeingPart[] = [
    { id: 'food', value: food }, { id: 'housing', value: housing }, { id: 'work', value: inputs.workRatio },
    { id: 'health', value: health }, { id: 'energy', value: inputs.energyRatio },
  ];
  const score = parts.reduce((a, p) => a + p.value, 0) / parts.length;
  return { score, parts, factor: 0.9 + 0.2 * score };
}
