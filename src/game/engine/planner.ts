import type { BuildingDef, BuildingId, GameState, ResId } from '../types';
import { BUILDINGS, BUILDING_BY_ID } from '../data/buildings';
import { getModifiers, isBuildingUnlocked, prodMult, recipeOf, type Modifiers } from './modifiers';
import { activeMix } from './deposit';

// Planejador de cadeia: quantas estruturas de cada elo sustentam N unidades de uma estrutura, do minério ao
// produto, com os bônus e as receitas de agora. Não conta o que as outras estruturas já consomem.

export interface PlanRow { building: BuildingId; units: number; have: number; feeds: ResId[]; energy: number; workers: number }
export interface Plan { rows: PlanRow[]; missing: ResId[]; energy: number; workers: number }

const MAX_DEPTH = 6;
/** Ritmo das indústrias (os Carregadores aceleram insumo e produto). */
const speedOf = (m: Modifiers, b: BuildingDef) => (b.category === 'industry' ? m.industrySpeed : 1);

/** Estruturas que o planejador sabe dimensionar: as que consomem algo. */
export const plannable = (s: GameState) => BUILDINGS.filter(b => isBuildingUnlocked(b, s) && !b.surplus && Object.keys(recipeOf(s, b).inputs ?? {}).length > 0);

/** Quanto uma unidade de `b` produz de `res` por segundo agora (0 se não produz). */
function rateOf(s: GameState, m: Modifiers, b: BuildingDef, res: ResId): number {
  if (b.extract) {
    const mix = activeMix(s, m, b.id);
    return b.extract * mix.yield * (m.output[b.id] ?? 1) * m.outputAll * (mix.shares[res] ?? 0) * (m.resource[res] ?? 1);
  }
  const per = recipeOf(s, b).outputs?.[res] ?? 0;
  return per * prodMult(m, res, b.id) * speedOf(m, b);
}

/** Quem produz `res`: a estrutura liberada que o jogador mais tem (no empate, a que rende mais por unidade). */
function producerFor(s: GameState, m: Modifiers, res: ResId): BuildingDef | null {
  const options = BUILDINGS.filter(b => isBuildingUnlocked(b, s) && !b.surplus && rateOf(s, m, b, res) > 0);
  // A recicladora só entra se não houver outra opção: ela vive da escória das fundições.
  const main = options.filter(b => b.id !== 'recycler');
  const pool = main.length ? main : options;
  return pool.sort((a, b) => s.buildings[b.id] - s.buildings[a.id] || rateOf(s, m, b, res) - rateOf(s, m, a, res))[0] ?? null;
}

export function planChain(s: GameState, target: BuildingId, count: number, m: Modifiers = getModifiers(s)): Plan {
  const def = BUILDING_BY_ID[target];
  const units = new Map<BuildingId, number>();
  const feeds = new Map<BuildingId, Set<ResId>>();
  const order: BuildingId[] = [];
  const missing = new Set<ResId>();
  // Extratores dão vários minérios de uma vez: o número de unidades é o do minério mais exigente.
  const oreNeed = new Map<BuildingId, Map<ResId, number>>();

  const needInputs = (b: BuildingDef, n: number, depth: number) => {
    for (const [r, per] of Object.entries(recipeOf(s, b).inputs ?? {})) {
      const rate = (per ?? 0) * n * speedOf(m, b);
      if (rate > 0) supply(r as ResId, rate, depth);
    }
  };
  const supply = (res: ResId, rate: number, depth: number) => {
    if (depth > MAX_DEPTH) return;
    const p = producerFor(s, m, res);
    if (!p) { missing.add(res); return; }
    if (!order.includes(p.id)) order.push(p.id);
    (feeds.get(p.id) ?? feeds.set(p.id, new Set()).get(p.id)!).add(res);
    if (p.extract) {
      const ores = oreNeed.get(p.id) ?? oreNeed.set(p.id, new Map()).get(p.id)!;
      ores.set(res, (ores.get(res) ?? 0) + rate);
      return;
    }
    const n = rate / rateOf(s, m, p, res);
    units.set(p.id, (units.get(p.id) ?? 0) + n);
    needInputs(p, n, depth + 1);
  };

  needInputs(def, count, 1);
  for (const [id, ores] of oreNeed) {
    const b = BUILDING_BY_ID[id];
    units.set(id, Math.max(...[...ores].map(([r, rate]) => rate / rateOf(s, m, b, r))));
  }
  const energyOf = (b: BuildingDef, n: number) => n * (b.energyUse ?? 0) * m.energyUse * recipeOf(s, b).energy;
  const rows: PlanRow[] = order.map(id => {
    const b = BUILDING_BY_ID[id], n = units.get(id) ?? 0;
    return { building: id, units: n, have: s.buildings[id], feeds: [...(feeds.get(id) ?? [])], energy: energyOf(b, n), workers: n * (b.workers ?? 0) };
  });
  return {
    rows,
    missing: [...missing],
    energy: energyOf(def, count) + rows.reduce((a, r) => a + r.energy, 0),
    workers: count * (def.workers ?? 0) + rows.reduce((a, r) => a + r.workers, 0),
  };
}
