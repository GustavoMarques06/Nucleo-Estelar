import type { Amounts, BuildingDef, BuildingId, Effect, GameState, ResId, UpgradeDef } from '../types';
import { UPGRADES } from '../data/upgrades';
import { RESOURCES, STARTER_DEPOSIT } from '../data/resources';
import { BALANCE } from '../data/balance';
import { BUILDINGS } from '../data/buildings';
import { PERKS } from '../data/ascension';
import { MEGAPROJECTS } from '../data/megaprojects';
import { REPEATABLES } from '../data/repeatables';
import { ACHIEVEMENT_BONUS } from '../data/achievements';
import { FACTIONS, tierOf } from '../data/factions';
import { STAR_PERKS } from '../data/transcendence';
import { DRONE_ROLES, droneBonus } from '../data/drones';
import { colonyCount } from '../selectors';

export interface Modifiers {
  click: number;
  output: Partial<Record<BuildingId, number>>;
  outputAll: number;
  resource: Partial<Record<ResId, number>>;
  energyOut: Partial<Record<BuildingId, number>>;
  energyAll: number;
  energyUse: number;
  storage: number;
  price: Partial<Record<ResId, number>>;
  priceAll: number;
  deposit: Partial<Record<ResId, number>>;
  popGrowth: number;
  popCap: number;
  tax: number;
  outpost: number;
  expedition: number;
  expeditionSpeed: number;
  richness: number;
  cost: number;
  contract: number;
  megaCost: number;
  droneBoost: number;
  depth: number;              // profundidade do mercado (fora a escala da economia)
  upkeep: number;             // multiplicador da manutenção
  terraSpeed: number;
  offline: number;
  autosell: boolean;
}

function base(): Modifiers {
  return {
    click: 1, output: {}, outputAll: 1, resource: {}, energyOut: {}, energyAll: 1, energyUse: 1, storage: 1,
    price: {}, priceAll: 1, deposit: {}, popGrowth: 1, popCap: 1, tax: 1, outpost: 1, expedition: 1,
    expeditionSpeed: 1, richness: 1, cost: 1, contract: 1, megaCost: 1, droneBoost: 1, depth: 1, upkeep: 1, terraSpeed: 1, offline: 0, autosell: false,
  };
}

const mul = <K extends string>(map: Partial<Record<K, number>>, k: K, v: number) => { map[k] = (map[k] ?? 1) * v; };

function applyEffect(m: Modifiers, e: Effect) {
  switch (e.kind) {
    case 'click': m.click *= e.mult; break;
    case 'output': mul(m.output, e.building, e.mult); break;
    case 'outputAll': m.outputAll *= e.mult; break;
    case 'resource': mul(m.resource, e.res, e.mult); break;
    case 'energyOut': if (e.building) mul(m.energyOut, e.building, e.mult); else m.energyAll *= e.mult; break;
    case 'energyUse': m.energyUse *= e.mult; break;
    case 'storage': m.storage *= e.mult; break;
    case 'price': if (e.res) mul(m.price, e.res, e.mult); else m.priceAll *= e.mult; break;
    case 'deposit': mul(m.deposit, e.res, e.mult); break;
    case 'popGrowth': m.popGrowth *= e.mult; break;
    case 'popCap': m.popCap *= e.mult; break;
    case 'tax': m.tax *= e.mult; break;
    case 'outpost': m.outpost *= e.mult; break;
    case 'expedition': m.expedition *= e.mult; break;
    case 'richness': m.richness *= e.mult; break;
    case 'cost': m.cost *= e.mult; break;
    case 'contract': m.contract *= e.mult; break;
    case 'megaCost': m.megaCost *= e.mult; break;
    case 'droneBoost': m.droneBoost *= e.mult; break;
    case 'depth': m.depth *= e.mult; break;
    case 'upkeep': m.upkeep *= e.mult; break;
    case 'offline': m.offline += e.seconds; break;
    case 'autosell': m.autosell = true; break;
  }
}

/** Combina melhorias, estruturas com bônus, megaprojetos, Ascensão e efeitos temporários. */
export function getModifiers(s: GameState): Modifiers {
  const m = base();
  for (const u of UPGRADES) if (s.upgrades[u.id]) u.effects.forEach(e => applyEffect(m, e));
  for (const p of PERKS) { const l = s.ascension.perks[p.id] ?? 0; if (l > 0) p.effects(l).forEach(e => applyEffect(m, e)); }
  for (const mp of MEGAPROJECTS) {
    const done = s.megaprojects[mp.id] ?? 0;
    for (let i = 0; i < done; i++) {
      const st = mp.endless ? mp.endless(i) : mp.stages[i];
      st?.effects.forEach(e => applyEffect(m, e));
    }
  }
  for (const p of STAR_PERKS) { const l = s.transcendence.perks[p.id] ?? 0; if (l > 0) p.effects(l).forEach(e => applyEffect(m, e)); }
  if (s.upgrades.diplomacy) {
    for (const f of FACTIONS) {
      const t = tierOf(s.factions[f.id]?.relation ?? 0);
      if (t >= 1) f.treaty.forEach(e => applyEffect(m, e));
      if (t >= 2) f.alliance.forEach(e => applyEffect(m, e));
      if (t >= 3) f.bond.forEach(e => applyEffect(m, e));
    }
  }
  for (const r of REPEATABLES) { const l = s.repeatables[r.id] ?? 0; if (l > 0) r.effects(l).forEach(e => applyEffect(m, e)); }
  if (s.achievements.length) m.outputAll *= 1 + ACHIEVEMENT_BONUS * s.achievements.length;
  for (const b of s.buffs) b.effects.forEach(e => applyEffect(m, e));
  for (const b of BUILDINGS) {
    const n = s.buildings[b.id];
    if (!b.boost || n <= 0) continue;
    const f = 1 + b.boost.per * n;
    switch (b.boost.kind) {
      case 'energyAll': m.energyAll *= f; break;
      case 'priceAll': m.priceAll *= f; break;
      case 'popGrowth': m.popGrowth *= f; break;
      case 'tax': m.tax *= f; break;
      case 'outputAll': m.outputAll *= f; break;
      case 'outpost': m.outpost *= f; break;
      case 'expeditionSpeed': m.expeditionSpeed *= f; break;
    }
  }
  // Economia viva: inflação encarece as estruturas; reputação melhora contratos; o mercado cresce com a civilização.
  m.cost *= 1 + inflation(s);
  const rep = repLevel(s);
  m.contract *= 1 + 0.03 * rep;
  m.depth *= (1 + 0.15 * s.buildings.market) * (1 + 0.08 * rep) * (1 + 0.04 * colonyCount(s));
  // Drones: bônus com retornos decrescentes, calculados por último (dependem do multiplicador de drones).
  for (const role of DRONE_ROLES) {
    const n = s.drones[role.id] ?? 0;
    if (n <= 0) continue;
    const b = droneBonus(role, n, m.droneBoost);
    if (role.id === 'courier') m.contract *= 1 + b;
    else if (role.id === 'scout') m.expeditionSpeed *= 1 + b;
    else if (role.id === 'hauler') m.outpost *= 1 + b;
    else if (role.id === 'mechanic') m.outputAll *= 1 + b;
    else if (role.id === 'terraformer') m.terraSpeed *= 1 + b;
  }
  return m;
}

/** Alta do custo das estruturas conforme a economia cresce (zera a cada Ascensão, como os créditos ganhos). */
export const inflation = (s: Pick<GameState, 'stats'>) => BALANCE.inflation * Math.log10(1 + s.stats.earned / BALANCE.inflationScale);

/** Nível de reputação comercial (cresce com a raiz quadrada da reputação). */
export const repLevel = (s: Pick<GameState, 'stats'>) => Math.floor(Math.sqrt(Math.max(0, s.stats.reputation) / BALANCE.repStep));

/** Receita em vigor de uma estrutura: a padrão ou a alternativa escolhida pelo jogador. */
export function recipeOf(s: Pick<GameState, 'recipes'>, b: BuildingDef): { inputs?: Amounts; outputs?: Amounts; energy: number } {
  return b.alt && s.recipes[b.id] ? b.alt : { inputs: b.inputs, outputs: b.outputs, energy: 1 };
}

/** Multiplicador final de um recurso produzido por uma estrutura (ou por colônias, sem estrutura). */
export const prodMult = (m: Modifiers, res: ResId, b?: BuildingId) =>
  (b ? m.output[b] ?? 1 : 1) * m.outputAll * (m.resource[res] ?? 1);

/** Capacidade somada de n unidades (série geométrica quando cada unidade é maior que a anterior). */
export function buildingStorage(b: BuildingDef, n: number): number {
  const g = b.storageGrowth ?? 1;
  return g === 1 ? b.storage! * n : b.storage! * (Math.pow(g, n) - 1) / (g - 1);
}

export function storageCap(s: GameState, m = getModifiers(s)): number {
  let cap = BALANCE.baseStorage;
  for (const b of BUILDINGS) if (b.storage) cap += buildingStorage(b, s.buildings[b.id]);
  return Math.floor(cap * m.storage);
}

export function housingCap(s: GameState, m = getModifiers(s)): number {
  let cap = 0;
  for (const b of BUILDINGS) if (b.housing) cap += b.housing * s.buildings[b.id];
  // Colônias terraformadas também recebem moradores.
  for (const l of s.locations) if (l.outpost?.terra) cap += 30 * l.outpost.terra * l.richness;
  return cap * m.popCap;
}

/** `market` = multiplicador do mercado dinâmico (1 = preço base; contratos usam sempre o base). */
export function sellPrice(res: ResId, m: Modifiers, market = 1): number {
  return (RESOURCES[res].sellPrice ?? 0) * (m.price[res] ?? 1) * m.priceAll * market;
}

/** Composição normalizada da jazida (soma = 1). */
export function depositShares(m: Modifiers, base: Amounts = STARTER_DEPOSIT): Amounts {
  const raw = Object.entries(base).map(([r, w]) => [r, (w ?? 0) * (m.deposit[r as ResId] ?? 1)] as const);
  const total = raw.reduce((a, [, w]) => a + w, 0);
  return Object.fromEntries(raw.map(([r, w]) => [r, w / total]));
}

/** Fração (0–1) em que uma estrutura geradora consegue funcionar com os insumos em estoque. */
export function inputAvailability(s: GameState, b: BuildingDef, dt: number): number {
  if (!b.inputs) return 1;
  const n = s.buildings[b.id];
  let f = 1;
  for (const [r, per] of Object.entries(b.inputs)) {
    const need = (per ?? 0) * n * dt;
    if (need > 0) f = Math.min(f, s.resources[r as ResId] / need);
  }
  return Math.max(0, Math.min(1, f));
}

export function energyBalance(s: GameState, m = getModifiers(s), dt = 1) {
  let supply = BALANCE.baseEnergy, demand = 0;
  for (const b of BUILDINGS) {
    const n = s.buildings[b.id];
    if (n <= 0) continue;
    if (b.energyOut) supply += n * b.energyOut * (m.energyOut[b.id] ?? 1) * m.energyAll * inputAvailability(s, b, dt);
    if (b.energyUse) demand += n * b.energyUse * m.energyUse * recipeOf(s, b).energy;
  }
  const ratio = demand > 0 ? Math.min(1, supply / demand) : 1;
  return { supply, demand, ratio };
}

export function workforce(s: GameState) {
  let demand = 0;
  for (const b of BUILDINGS) if (b.workers) demand += b.workers * s.buildings[b.id];
  const supply = s.resources.population;
  return { supply, demand, ratio: demand > 0 ? Math.min(1, supply / demand) : 1 };
}

// ---------- Desbloqueios ----------
export const isBuildingUnlocked = (b: BuildingDef, s: GameState) =>
  (!b.requires || !!s.upgrades[b.requires]) && (!b.unlock || b.unlock(s));

export const upgradeRequirementsMet = (u: UpgradeDef, s: GameState) => (u.requires ?? []).every(r => s.upgrades[r]);
export const isUpgradeVisible = (u: UpgradeDef, s: GameState) =>
  !s.upgrades[u.id] && upgradeRequirementsMet(u, s) && (!u.unlock || u.unlock(s));
