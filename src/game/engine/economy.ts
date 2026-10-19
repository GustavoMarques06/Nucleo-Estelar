import type { Amounts, BuildingDef, BuildingId, FlowSource, Flows, GameState, PopStatus, ResId, TickReport } from '../types';
import { BUILDINGS, BUILDING_BY_ID } from '../data/buildings';
import { UPGRADE_BY_ID } from '../data/upgrades';
import { BALANCE } from '../data/balance';
import { RESOURCES, RES_IDS } from '../data/resources';
import { cloneState } from './state';
import {
  energyBalance, getModifiers, housingCap, inputAvailability, isBuildingUnlocked,
  isUpgradeVisible, prodMult, recipeOf, storageCap, workforce, type Modifiers,
} from './modifiers';
import { bulkCost, canAfford, payCost } from './costs';
import { advanceExpeditions, advanceTerraform, autoLaunch, outpostYield } from './expansion';
import { advanceContracts, autoFulfill } from './contracts';
import { advanceCrises } from './crises';
import { isHigh, marketFactor, marketUnlocked, quoteSale, saturationOf, unitPriceNow } from './market';
import { recover } from '../data/market';
import { payUpkeep, upkeepBreakdown, upkeepRatio } from './upkeep';
import { FACTIONS, tierOf } from '../data/factions';
import { activeMix, autoDeposit, drain } from './deposit';
import { advanceFactions } from './factions';
import { addProduced, gain } from './stock';

const EPS = 1e-9;
const zero = () => Object.fromEntries(RES_IDS.map(r => [r, 0])) as Record<ResId, number>;
const safe = (x: number) => (x === Infinity ? 1e300 : Number.isFinite(x) && x > 0 ? x : 0);

type Status = TickReport['status'][BuildingId];

/** Tudo que cada fase da simulação precisa saber sobre o passo atual. */
interface Tick {
  s: GameState;           // estado sendo atualizado (já é uma cópia)
  m: Modifiers;
  dt: number;
  cap: number;            // capacidade do armazém
  energyRatio: number;    // fração da energia necessária que existe (0–1)
  workRatio: number;      // fração da mão de obra necessária que existe (0–1)
  upkeepRatio: number;    // fração do ritmo que a manutenção em dia permite às estruturas caras (0–1)
  status: TickReport['status'];
  track: ((src: FlowSource) => void) | null;   // atribui a variação de estoque desde a última marca a uma origem
}

const FLOW_SOURCES: FlowSource[] = ['mining', 'industry', 'energy', 'logistics', 'science', 'civilization', 'commerce', 'expansion', 'diplomacy',
  'population', 'colonies', 'trade', 'contracts', 'upkeep'];

/** Registro opcional de onde veio cada variação de estoque (a interface usa; o bot e o cálculo offline não pagam por isso). */
function makeTracker(s: GameState) {
  const flows = Object.fromEntries(FLOW_SOURCES.map(k => [k, {}])) as Flows;
  const last = { ...s.resources };
  const track = (src: FlowSource) => {
    for (const r of RES_IDS) {
      const d = s.resources[r] - last[r];
      if (d > 1e-12 || d < -1e-12) flows[src][r] = (flows[src][r] ?? 0) + d;
      last[r] = s.resources[r];
    }
  };
  return { flows, track };
}

const roomFor = (t: Tick, r: ResId) => (RESOURCES[r].stored ? Math.max(0, t.cap - t.s.resources[r]) : Infinity);
/** As indústrias não consomem os últimos 10% do armazém: sobra material para construir. */
const reserveFor = (t: Tick, r: ResId) => (RESOURCES[r].stored ? t.cap * BALANCE.constructionReserve : 0);

/** Geradores que consomem insumo (a fusão gasta água): descontam o que usam agora. */
function runInputGenerators(t: Tick) {
  const { s, dt } = t;
  for (const b of BUILDINGS) {
    if (!b.energyOut || !b.inputs || s.buildings[b.id] <= 0) continue;
    const f = inputAvailability(s, b, dt);
    for (const [r, per] of Object.entries(b.inputs)) s.resources[r as ResId] -= (per ?? 0) * s.buildings[b.id] * dt * f;
    t.status[b.id] = f < 0.999 ? { kind: 'input', res: Object.keys(b.inputs)[0] as ResId } : { kind: 'ok' };
    t.track?.('energy');
  }
}

/** Status "normal" de uma estrutura: o que a limita além de insumos e armazém (energia ou mão de obra). */
function baseStatus(t: Tick, b: BuildingDef): Status {
  if (b.energyUse && t.energyRatio < 0.999) return { kind: 'power', ratio: t.energyRatio };
  if (b.workers && t.workRatio < 0.999) return { kind: 'workers', ratio: t.workRatio };
  return { kind: 'ok' };
}

/** Extratores: retiram do veio em foco (ou da crosta) conforme a composição; o veio perde reserva e, esgotado, a extração volta à crosta. */
function runExtractor(t: Tick, b: BuildingDef, n: number, ratio: number) {
  const { s, m, dt, cap } = t;
  let fullRes: ResId | null = null;
  let left = dt;                                     // tempo do passo que ainda falta extrair
  for (let pass = 0; pass < 3 && left > 1e-9; pass++) {
    const mix = activeMix(s, m);
    const vein = mix.veinId ? s.deposit.veins.find(v => v.id === mix.veinId)! : null;
    const full = n * b.extract! * ratio * mix.yield * left;
    const total = vein ? Math.min(full, vein.reserve) : full;
    let got = 0, wanted = 0;
    for (const [r, share] of Object.entries(mix.shares)) {
      const res = r as ResId;
      const want = total * (share ?? 0) * prodMult(m, res, b.id);
      const g = gain(s, res, want, cap);
      if (g < want - EPS) fullRes = res;
      got += g; wanted += want;
    }
    s.stats.totalMined += got;
    if (vein && wanted > 0) drain(s, vein.id, total * (got / wanted));
    // Se o veio acabou no meio do passo, o resto do tempo extrai da crosta.
    if (!vein || total >= full - 1e-12) break;
    left *= 1 - total / full;
  }
  const st = baseStatus(t, b);
  t.status[b.id] = st?.kind === 'ok' && fullRes ? { kind: 'full', res: fullRes } : st;
}

/** Produtores e conversores: limitados por energia, mão de obra, insumos e espaço para a saída. */
function runConverter(t: Tick, b: BuildingDef, n: number, ratio: number) {
  const { s, m, dt, cap } = t;
  const { inputs, outputs } = recipeOf(s, b);
  const speed = n * ratio * dt;
  let factor = 1;
  let limit: Status = { kind: 'ok' };
  for (const [r, per] of Object.entries(inputs ?? {})) {
    const need = (per ?? 0) * speed;
    const avail = Math.max(0, s.resources[r as ResId] - reserveFor(t, r as ResId));
    if (need > EPS && avail < need) {
      const f = avail / need;
      if (f < factor) { factor = f; limit = { kind: 'input', res: r as ResId }; }
    }
  }
  for (const [r, per] of Object.entries(outputs ?? {})) {
    const out = (per ?? 0) * prodMult(m, r as ResId, b.id) * speed;
    const room = roomFor(t, r as ResId);
    if (out > EPS && room < out) {
      const f = room / out;
      if (f < factor) { factor = f; limit = { kind: 'full', res: r as ResId }; }
    }
  }
  factor = Math.max(0, Math.min(1, factor));
  for (const [r, per] of Object.entries(inputs ?? {})) s.resources[r as ResId] -= (per ?? 0) * speed * factor;
  for (const [r, per] of Object.entries(outputs ?? {})) gain(s, r as ResId, (per ?? 0) * prodMult(m, r as ResId, b.id) * speed * factor, cap);
  t.status[b.id] = limit?.kind !== 'ok' && factor < 0.999 ? limit : baseStatus(t, b);
}

function runBuildings(t: Tick) {
  const { s, dt } = t;
  for (const b of BUILDINGS) {
    const n = s.buildings[b.id];
    if (b.energyOut && b.inputs) continue;                                 // já tratado em runInputGenerators
    if (n <= 0 || dt <= 0) { t.status[b.id] = { kind: 'idle' }; continue; }
    const ratio = (b.energyUse ? t.energyRatio : 1) * (b.workers ? t.workRatio : 1) * (b.upkeep ? t.upkeepRatio : 1);
    if (b.extract) runExtractor(t, b, n, ratio);
    else if (b.outputs) runConverter(t, b, n, ratio);
    else t.status[b.id] = baseStatus(t, b);
    t.track?.(b.category);
  }
}

/** População: cresce com moradia e comida; sem comida, diminui. Paga impostos. */
function runPopulation(t: Tick): { cap: number; status: PopStatus; foodNeed: number } {
  const { s, m, dt, cap } = t;
  const popCap = housingCap(s, m);
  let pop = s.resources.population;
  const foodNeed = pop * BALANCE.foodPerPerson;
  let status: PopStatus = popCap > 0 || pop > 0 ? 'stable' : 'none';
  if (status !== 'none' && dt > 0) {
    const need = foodNeed * dt;
    let fed = 1;
    if (need > 0) {
      fed = Math.min(1, s.resources.food / need);
      s.resources.food = Math.max(0, s.resources.food - need);
    }
    if (fed < 0.999) {
      pop -= pop * BALANCE.starveRate * (1 - fed) * dt;
      status = 'starving';
    } else if (pop > popCap) {
      pop = Math.max(popCap, pop - pop * 0.05 * dt);
      status = 'housing';
    } else if (pop < popCap - EPS) {
      if (s.resources.food > EPS) {
        pop = Math.min(popCap, pop + (BALANCE.growthFlat + (popCap - pop) * BALANCE.growthRate) * m.popGrowth * dt);
        status = 'growing';
      } else status = 'starving';
    } else status = 'housing';
    s.resources.population = Math.max(0, pop);
    gain(s, 'credits', s.resources.population * BALANCE.taxPerPerson * m.tax * m.outputAll * dt, cap);
  }
  t.track?.('population');
  return { cap: popCap, status, foodNeed };
}

/** Colônias: produção passiva enviada para a base. */
function runColonies(t: Tick) {
  for (const loc of t.s.locations) {
    if (!loc.outpost) continue;
    for (const [r, v] of Object.entries(outpostYield(loc, t.m, t.s))) gain(t.s, r as ResId, (v ?? 0) * t.dt, t.cap);
  }
  t.track?.('colonies');
}

/** Facções com tratado ou aliança rendem um fio de influência (as embaixadas fazem o resto). */
function runDiplomacy(t: Tick) {
  const { s, dt } = t;
  if (!s.upgrades.diplomacy) return;
  let rate = 0;
  for (const f of FACTIONS) {
    const tier = tierOf(s.factions[f.id]?.relation ?? 0);
    rate += tier >= 2 ? BALANCE.influenceAlliance : tier === 1 ? BALANCE.influenceTreaty : 0;
  }
  if (rate > 0) gain(s, 'influence', rate * t.m.outputAll * dt, Infinity);
  t.track?.('diplomacy');
}

/** Efeitos temporários e eventos espaciais: só correm o relógio. */
function runTimers(s: GameState, dt: number) {
  for (const b of s.buffs) b.remaining -= dt;
  s.buffs = s.buffs.filter(b => b.remaining > 0);
  if (s.event) { s.event.remaining -= dt; if (s.event.remaining <= 0) s.event = null; }
  s.eventTimer -= dt;
  s.stats.playTime += dt;
  s.market.clock += dt;
  for (const [r, x] of Object.entries(s.market.sat)) {
    const left = recover(x ?? 0, dt);
    if (left < 0.002) delete s.market.sat[r as ResId]; else s.market.sat[r as ResId] = left;
  }
}

/** Vende `units` de `res` ao preço de agora: o mercado satura e o preço cai conforme o volume. */
function sellUnits(s: GameState, m: Modifiers, res: ResId, units: number): number {
  const q = quoteSale(s, m, res, units);
  if (marketUnlocked(s)) s.market.sat[res] = q.sat;
  s.resources[res] -= units;
  return q.earned;
}

/** Venda automática: respeita o piso de preço, a reserva escolhida e a saturação (vende só o que o mercado paga bem). */
function runAutosell(t: Tick) {
  const { s, m, cap } = t;
  if (!m.autosell) return;
  for (const r of RES_IDS) {
    if (!s.autosell[r] || s.resources[r] <= 0) continue;
    const base = RESOURCES[r].sellPrice ?? 0;
    if (base <= 0) continue;                              // créditos, drones etc. não se vendem (um save adulterado não pode apagá-los)
    if (base > 0 && unitPriceNow(s, m, r) < s.autosellFloor * base * (m.price[r] ?? 1) * m.priceAll) continue;
    const reserve = RESOURCES[r].stored ? cap * (s.keep[r] ?? 0) : 0;
    const units = s.resources[r] - reserve;
    if (units <= 0) continue;
    const high = isHigh(marketFactor(s, r) / (1 + saturationOf(s, r)));
    const earned = sellUnits(s, m, r, units);
    if (high && earned > 0) s.stats.highSales++;
    gain(s, 'credits', earned, cap);
  }
  t.track?.('trade');
}

/**
 * Avança a simulação em `dt` segundos. Função pura: devolve um novo estado e um relatório com as variações
 * e o status de cada estrutura (usado pela interface, pelo cálculo offline e pelos testes).
 */
export function simulate(prev: GameState, dt: number, opts: { flows?: boolean } = {}): { state: GameState; report: TickReport } {
  const s = cloneState(prev);
  const m = getModifiers(s);
  const energy = energyBalance(s, m, dt);
  const upkeep = upkeepBreakdown(s, m);
  const tracker = opts.flows ? makeTracker(s) : null;
  const t: Tick = {
    s, m, dt, cap: storageCap(s, m), energyRatio: energy.ratio, workRatio: workforce(s).ratio,
    upkeepRatio: upkeepRatio(s.debt, upkeep.total), status: {}, track: tracker?.track ?? null,
  };
  const before = { ...s.resources };

  runInputGenerators(t);
  autoDeposit(s);
  runBuildings(t);
  const population = runPopulation(t);
  runColonies(t);
  runDiplomacy(t);

  const finishedExpeditions = advanceExpeditions(s, m, dt);
  const finishedTerraforms = advanceTerraform(s, m, dt);
  advanceContracts(s, dt);
  advanceCrises(s, dt);
  advanceFactions(s, dt);
  autoFulfill(s);
  t.track?.('contracts');
  autoLaunch(s, m);
  t.track?.('expansion');
  runTimers(s, dt);
  runAutosell(t);
  if (dt > 0) payUpkeep(s, upkeep.total, dt);
  t.track?.('upkeep');

  const delta = zero();
  for (const r of RES_IDS) {
    s.resources[r] = safe(s.resources[r]);
    delta[r] = s.resources[r] - before[r];
  }
  let flows: Flows | undefined;
  if (tracker && dt > 0) {
    flows = tracker.flows;
    for (const src of FLOW_SOURCES) for (const r of Object.keys(flows[src]) as ResId[]) flows[src][r] = flows[src][r]! / dt;
  }
  return { state: s, report: { delta, flows, upkeep: { rate: upkeep.total, debt: s.debt, ratio: t.upkeepRatio }, status: t.status, energy, workforce: workforce(s), population, finishedExpeditions, finishedTerraforms } };
}

/** Extração manual: um clique rende `clickAmount` dividido pela composição da jazida. */
export function mineClick(prev: GameState, base: number): { state: GameState; gained: Amounts } {
  const s = cloneState(prev);
  const m = getModifiers(s);
  const cap = storageCap(s, m);
  const mix = activeMix(s, m);
  let total = base * m.click * mix.yield;
  if (mix.veinId) total = Math.min(total, s.deposit.veins.find(v => v.id === mix.veinId)!.reserve);
  const gained: Amounts = {};
  let got = 0, wanted = 0;
  for (const [r, share] of Object.entries(mix.shares)) {
    const res = r as ResId;
    const want = total * (share ?? 0);
    const g = gain(s, res, want, cap);
    wanted += want; got += g;
    if (g <= 0) continue;
    gained[res] = g;
    s.stats.totalMined += g;
  }
  if (mix.veinId && wanted > 0) drain(s, mix.veinId, total * (got / wanted));
  return { state: s, gained };
}

export function sell(prev: GameState, res: ResId): { state: GameState; earned: number } {
  const units = Math.floor(prev.resources[res]);
  const m = getModifiers(prev);
  if (units < 1 || !RESOURCES[res].sellPrice) return { state: prev, earned: 0 };
  const s = cloneState(prev);
  const high = isHigh(marketFactor(prev, res) / (1 + saturationOf(prev, res)));
  const earned = sellUnits(s, m, res, units);
  s.resources.credits += earned;
  addProduced(s, 'credits', earned);
  if (high) s.stats.highSales++;
  return { state: s, earned };
}

export function buyBuilding(prev: GameState, id: BuildingId, amount: number): GameState | null {
  const def = BUILDING_BY_ID[id];
  if (amount < 1 || !isBuildingUnlocked(def, prev)) return null;
  const cost = bulkCost(def, prev.buildings[id], amount, getModifiers(prev).cost);
  if (!canAfford(prev, cost)) return null;
  const s = cloneState(prev);
  payCost(s, cost);
  s.buildings[id] += amount;
  return s;
}

export function buyUpgrade(prev: GameState, id: string): GameState | null {
  const def = UPGRADE_BY_ID[id];
  if (!def || !isUpgradeVisible(def, prev) || !canAfford(prev, def.cost)) return null;
  const s = cloneState(prev);
  payCost(s, def.cost);
  s.upgrades[id] = true;
  return s;
}
