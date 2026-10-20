import type { BuildingDef, BuildingId, Effect } from '../types';
import { BALANCE } from './balance';

// Marcos de quantidade: ao chegar a 10, 25, 50, 100… unidades de uma estrutura, a função principal dela
// (produção, extração, energia, moradia, carga de bateria ou bônus) é multiplicada. Sempre há um próximo marco
// a poucas compras de distância — o "só mais uma" dos jogos idle.
// Armazéns ficam de fora: cada um já guarda mais que o anterior, e muita coisa no jogo escala com a capacidade
// (contratos, crises, a reserva das indústrias) — multiplicá-la por marcos desequilibraria tudo de uma vez.
export const hasMilestones = (b: BuildingDef) => !b.storage;

const FIRST = [10, 25, 50, 100, 150, 200, 300, 400, 500];
const STEP_AFTER = 100;                 // depois de 500, um marco a cada 100 unidades

/** Quantos marcos `owned` unidades já atingiram. */
export function milestoneLevel(owned: number): number {
  if (owned < FIRST[0]) return 0;
  const last = FIRST[FIRST.length - 1];
  if (owned < last) return FIRST.filter(t => owned >= t).length;
  return FIRST.length + Math.floor((owned - last) / STEP_AFTER);
}

/** Próximo marco depois de `owned` unidades. */
export function nextMilestone(owned: number): number {
  const t = FIRST.find(x => x > owned);
  if (t !== undefined) return t;
  const last = FIRST[FIRST.length - 1];
  return last + (Math.floor((owned - last) / STEP_AFTER) + 1) * STEP_AFTER;
}

/** Marco anterior (ou zero), para desenhar a barra de progresso até o próximo. */
export function prevMilestone(owned: number): number {
  const lvl = milestoneLevel(owned);
  if (lvl === 0) return 0;
  if (lvl <= FIRST.length) return FIRST[lvl - 1];
  return FIRST[FIRST.length - 1] + (lvl - FIRST.length) * STEP_AFTER;
}

/** Multiplicador da função principal com `owned` unidades. */
export const milestoneMult = (owned: number) => Math.pow(BALANCE.milestoneMult, milestoneLevel(owned));

/** Bônus especial ao atingir o marco de 100 unidades (além do multiplicador): sinergias entre estruturas. */
export const SPECIAL_AT = 100;
export const MILESTONE_SPECIALS: Partial<Record<BuildingId, { effects: Effect[]; text: string }>> = {
  miner: { effects: [{ kind: 'click', mult: 5 }], text: 'extração manual ×5' },
  crusher: { effects: [{ kind: 'output', building: 'deepDrill', mult: 1.25 }], text: 'Perfuratrizes profundas +25%' },
  solar: { effects: [{ kind: 'energyOut', mult: 1.1 }], text: 'toda a energia +10%' },
  refinery: { effects: [{ kind: 'output', building: 'foundry', mult: 1.25 }], text: 'Fundições +25%' },
  factory: { effects: [{ kind: 'output', building: 'industrialComplex', mult: 1.25 }], text: 'Complexos industriais +25%' },
  iceExtractor: { effects: [{ kind: 'output', building: 'chemicalPlant', mult: 1.25 }], text: 'Usinas químicas +25%' },
  storage: { effects: [{ kind: 'upkeep', mult: 0.9 }], text: 'manutenção −10%' },
  observatory: { effects: [{ kind: 'resource', res: 'science', mult: 1.15 }], text: 'toda a ciência +15%' },
  hydroponics: { effects: [{ kind: 'popGrowth', mult: 1.5 }], text: 'crescimento populacional +50%' },
  habitat: { effects: [{ kind: 'tax', mult: 1.15 }], text: 'impostos +15%' },
  recycler: { effects: [{ kind: 'output', building: 'refinery', mult: 1.25 }], text: 'Refinarias +25%' },
  converter: { effects: [{ kind: 'energyOut', building: 'solar', mult: 1.25 }], text: 'Painéis solares +25%' },
};
