import type { Amounts, BuildingDef, GameState, ResId } from '../types';

export function unitCost(def: BuildingDef, owned: number, costMult = 1): Amounts {
  const f = Math.min(1e280, Math.pow(def.growth, owned)) * costMult;      // milhares de unidades não viram Infinity
  const out: Amounts = {};
  for (const [r, v] of Object.entries(def.cost)) out[r as ResId] = Math.max(1, Math.floor((v ?? 0) * f));
  return out;
}

export function bulkCost(def: BuildingDef, owned: number, amount: number, costMult = 1): Amounts {
  const total: Amounts = {};
  for (let i = 0; i < amount; i++) {
    for (const [r, v] of Object.entries(unitCost(def, owned + i, costMult))) total[r as ResId] = (total[r as ResId] ?? 0) + (v ?? 0);
  }
  return total;
}

export function canAfford(s: GameState, cost: Amounts): boolean {
  return Object.entries(cost).every(([r, v]) => s.resources[r as ResId] >= (v ?? 0) - 1e-9);
}

export function payCost(s: GameState, cost: Amounts) {
  for (const [r, v] of Object.entries(cost)) s.resources[r as ResId] = Math.max(0, s.resources[r as ResId] - (v ?? 0));
}

export const scaleCost = (c: Amounts, k: number): Amounts =>
  Object.fromEntries(Object.entries(c).map(([r, v]) => [r, Math.ceil((v ?? 0) * k)]));

/** Quantas unidades cabem no orçamento atual (limite de segurança de 1000). */
export function maxAffordable(s: GameState, def: BuildingDef, costMult = 1): number {
  const budget = { ...s.resources };
  let n = 0;
  while (n < 1000) {
    const c = unitCost(def, s.buildings[def.id] + n, costMult);
    if (!Object.entries(c).every(([r, v]) => budget[r as ResId] >= (v ?? 0))) break;
    for (const [r, v] of Object.entries(c)) budget[r as ResId] -= v ?? 0;
    n++;
  }
  return n;
}
