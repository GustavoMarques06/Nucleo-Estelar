import type { Amounts, GameState, Location, LocationType, ResId, Specialization } from '../types';
import { BALANCE } from '../data/balance';
import { colonyCount } from '../selectors';
import { FACTIONS, TREATY_AT } from '../data/factions';
import { LOCATION_BY_TYPE, LOCATION_TYPES, nameFor } from '../data/locations';
import { cloneState, rng } from './state';
import { canAfford, payCost, scaleCost } from './costs';
import { getModifiers, prodMult, type Modifiers } from './modifiers';
import { crisisFactor } from './crises';
import { routeInfo } from './routes';

/** Gera um local a partir da semente: mesmas regras, variações controladas (GDD, seção 8). */
/** `depth` = quantos locais já foram descobertos: quanto mais fundo no espaço, mais rico e mais distante. */
export function generateLocation(seed: number, richnessMult = 1, depth = 0): Location {
  const r = rng(seed * 7919 + 13);
  const total = LOCATION_TYPES.reduce((a, t) => a + t.weight, 0);
  let pick = r() * total, def = LOCATION_TYPES[0];
  for (const t of LOCATION_TYPES) { pick -= t.weight; if (pick <= 0) { def = t; break; } }
  return {
    id: `loc-${seed}`,
    seed,
    name: nameFor(r),
    type: def.type,
    sprite: def.sprites[Math.floor(r() * def.sprites.length)],
    richness: Math.round((0.6 + r() * 1.2) * richnessMult * (1 + 0.06 * depth) * 100) / 100,
    distance: 1 + Math.floor(r() * 5) + Math.floor(depth / 8),
    mineral: def.minerals[Math.floor(r() * def.minerals.length)],
    // 30% dos locais já são reivindicados por uma facção (decidido pela semente: igual em toda jornada).
    claimedBy: r() < 0.3 ? FACTIONS[Math.floor(r() * FACTIONS.length)].id : null,
    outpost: null,
  };
}

export const expeditionsUnlocked = (s: GameState) => !!s.upgrades.exploration;

export function expeditionCost(s: GameState, m: Modifiers = getModifiers(s)): Amounts {
  const n = s.locations.length + s.expeditions.length;
  return { fuel: Math.ceil(BALANCE.expeditionFuel * (1 + 0.3 * n) * m.expedition), ships: 1 };
}

export function expeditionDuration(s: GameState, m: Modifiers = getModifiers(s)) {
  const n = s.locations.length + s.expeditions.length;
  return BALANCE.expeditionTime * (1 + 0.15 * n) * m.expedition;
}

export function canLaunch(s: GameState): { ok: boolean; reason?: string } {
  if (!expeditionsUnlocked(s)) return { ok: false, reason: 'Pesquise Exploração estelar.' };
  if (s.expeditions.length >= BALANCE.expeditionMax) return { ok: false, reason: `No máximo ${BALANCE.expeditionMax} expedições ao mesmo tempo.` };
  if (!canAfford(s, expeditionCost(s))) return { ok: false, reason: 'Faltam naves ou combustível.' };
  return { ok: true };
}

export function launchExpedition(prev: GameState): GameState | null {
  if (!canLaunch(prev).ok) return null;
  const s = cloneState(prev);
  const m = getModifiers(s);
  payCost(s, expeditionCost(s, m));
  const total = expeditionDuration(s, m);
  s.expeditions.push({ id: `exp-${s.nextSeed}`, seed: s.nextSeed, remaining: total, total });
  s.nextSeed++;
  return s;
}

/** Avança expedições; devolve os locais descobertos. Usada dentro da simulação (funciona offline). */
export function advanceExpeditions(s: GameState, m: Modifiers, dt: number): string[] {
  const found: string[] = [];
  for (const e of s.expeditions) e.remaining -= dt * m.expeditionSpeed;
  for (const e of s.expeditions.filter(e => e.remaining <= 0)) {
    const loc = generateLocation(e.seed, m.richness, s.locations.length);
    s.locations.push(loc);
    if (!s.discovered.includes(loc.mineral)) s.discovered.push(loc.mineral);
    found.push(loc.id);
  }
  s.expeditions = s.expeditions.filter(e => e.remaining > 0);
  return found;
}


/** Local reivindicado por uma facção com a qual não há tratado: fundar custa mais (taxa de disputa). */
export const isDisputed = (s: GameState, loc: Location) =>
  !!loc.claimedBy && !loc.outpost && (s.factions[loc.claimedBy]?.relation ?? 0) < TREATY_AT;

/** Influência para resolver uma disputa na diplomacia, sem taxa extra nem desgaste com a facção. */
const disputeInfluence = (s: GameState) => 20 + 6 * colonyCount(s);

export function outpostCost(s: GameState, loc: Location, byInfluence = false): Amounts {
  const disputed = isDisputed(s, loc);
  const k = Math.pow(1.35, colonyCount(s)) * (1 + 0.15 * loc.distance) * (disputed && !byInfluence ? BALANCE.disputeMult : 1);
  return { ...scaleCost({ credits: 20000, alloys: 500, components: 100 }, k), ships: 1, ...(disputed && byInfluence ? { influence: disputeInfluence(s) } : {}) };
}

export function outpostUpgradeCost(loc: Location): Amounts {
  const l = loc.outpost?.level ?? 1;
  return { credits: Math.ceil(15000 * Math.pow(2, l)), alloys: Math.ceil(400 * Math.pow(1.5, l)), components: Math.ceil(80 * Math.pow(1.5, l)) };
}

export function establishOutpost(prev: GameState, locId: string, spec: Specialization, byInfluence = false): GameState | null {
  const i = prev.locations.findIndex(l => l.id === locId);
  if (i < 0 || prev.locations[i].outpost) return null;
  const cost = outpostCost(prev, prev.locations[i], byInfluence);
  if (!canAfford(prev, cost)) return null;
  const s = cloneState(prev);
  payCost(s, cost);
  const claim = s.locations[i].claimedBy;
  // Pagar a taxa de disputa irrita a facção (a relação cai, mas nunca abaixo de zero); a influência evita isso.
  if (claim && !byInfluence && isDisputed(prev, prev.locations[i]) && s.factions[claim]) {
    s.factions[claim].relation = Math.max(0, s.factions[claim].relation - BALANCE.disputePenalty);
  }
  s.locations[i].outpost = { level: 1, spec, terra: 0, terraRemaining: 0, terraTotal: 0 };
  return s;
}

export function upgradeOutpost(prev: GameState, locId: string): GameState | null {
  const loc = prev.locations.find(l => l.id === locId);
  if (!loc?.outpost) return null;
  const cost = outpostUpgradeCost(loc);
  if (!canAfford(prev, cost)) return null;
  const s = cloneState(prev);
  payCost(s, cost);
  s.locations.find(l => l.id === locId)!.outpost!.level++;
  return s;
}

export function setSpecialization(prev: GameState, locId: string, spec: Specialization): GameState | null {
  const loc = prev.locations.find(l => l.id === locId);
  if (!loc?.outpost || loc.outpost.spec === spec) return null;
  const s = cloneState(prev);
  s.locations.find(l => l.id === locId)!.outpost!.spec = spec;
  return s;
}

/** Produção por segundo de um posto (já com bônus). */
export function outpostYield(loc: Location, m: Modifiers, s?: GameState): Amounts {
  if (!loc.outpost) return {};
  const { level, spec, terra } = loc.outpost;
  const k = loc.richness * level * (1 + 0.3 * terra);
  const y: Amounts = {};
  for (const [r, v] of Object.entries(LOCATION_BY_TYPE[loc.type].yields)) y[r as ResId] = (v ?? 0) * k;
  const add = (r: ResId, v: number) => { y[r] = (y[r] ?? 0) + v; };
  switch (spec) {
    case 'mining': for (const r of Object.keys(y) as ResId[]) if (r !== 'science') y[r]! *= 1.6; break;
    case 'agriculture': add('food', 2 * level); if (y.water) y.water *= 1.5; break;
    case 'science': if (y.science) y.science *= 1.5; add('science', 0.8 * level); break;
    case 'industry': add('alloys', 1 * level); add('components', 0.15 * level); break;
    case 'commerce': add('credits', 15 * level); break;
  }
  // Mundos já terraformados cultivam alimento por conta própria.
  if (terra >= 3) add('food', 4 * loc.richness * (terra - 2));
  const route = s ? routeInfo(s, loc).mult : 1;
  for (const r of Object.keys(y) as ResId[]) y[r]! *= m.outpost * prodMult(m, r) * route * (s ? crisisFactor(s, loc.id, r) : 1);
  return y;
}

// ---------- Terraformação ----------
export const MAX_TERRA = 5;
const NON_TERRAFORMABLE: LocationType[] = ['gas', 'metallic', 'crystal'];
export const terraformable = (loc: Location) => !NON_TERRAFORMABLE.includes(loc.type);
export const locationSprite = (loc: Location) => ((loc.outpost?.terra ?? 0) >= MAX_TERRA ? 'planet-habitable' : loc.sprite);

/** Custo do PRÓXIMO nível. Cresce 1,9× por nível e fica dentro da capacidade típica do armazém. */
export function terraformCost(loc: Location): Amounts {
  const l = loc.outpost?.terra ?? 0;
  const k = Math.pow(1.9, l);
  return { credits: Math.ceil(2e6 * Math.pow(2.2, l)), water: Math.ceil(15000 * k), fuel: Math.ceil(4000 * k), components: Math.ceil(8000 * k) };
}

export function terraformDuration(loc: Location, m: Modifiers): number {
  const l = loc.outpost?.terra ?? 0;
  return (600 * Math.pow(1.5, l)) / m.terraSpeed;
}

export function canTerraform(s: GameState, loc: Location): { ok: boolean; reason?: string } {
  if (!s.upgrades.terraforming) return { ok: false, reason: 'Pesquise Terraformação.' };
  if (!loc.outpost) return { ok: false, reason: 'Funde uma colônia primeiro.' };
  if (!terraformable(loc)) return { ok: false, reason: 'Gigantes gasosos e asteroides não podem ser terraformados.' };
  if (loc.outpost.terra >= MAX_TERRA) return { ok: false, reason: 'Já é um mundo-jardim.' };
  if (loc.outpost.terraRemaining > 0) return { ok: false, reason: 'Terraformação em andamento.' };
  if (!canAfford(s, terraformCost(loc))) return { ok: false, reason: 'Faltam materiais.' };
  return { ok: true };
}

export function startTerraform(prev: GameState, locId: string): GameState | null {
  const loc = prev.locations.find(l => l.id === locId);
  if (!loc || !canTerraform(prev, loc).ok) return null;
  const s = cloneState(prev);
  const m = getModifiers(s);
  payCost(s, terraformCost(loc));
  const target = s.locations.find(l => l.id === locId)!.outpost!;
  target.terraTotal = terraformDuration(loc, m);
  target.terraRemaining = target.terraTotal;
  return s;
}

/** Avança as terraformações em andamento; devolve os locais que subiram de nível. */
export function advanceTerraform(s: GameState, m: Modifiers, dt: number): string[] {
  const done: string[] = [];
  for (const loc of s.locations) {
    const o = loc.outpost;
    if (!o || o.terraRemaining <= 0) continue;
    o.terraRemaining -= dt * m.terraSpeed;
    if (o.terraRemaining <= 0) { o.terraRemaining = 0; o.terra = Math.min(MAX_TERRA, o.terra + 1); done.push(loc.id); }
  }
  return done;
}

// ---------- Automação por drones (Batedores) ----------
/** Locais descobertos que ainda não viraram colônia: os Batedores só exploram se houver poucos. */
export const unsettled = (s: GameState) => s.locations.filter(l => !l.outpost).length;

/** Lança uma expedição sozinho (muda o estado recebido). Devolve true se lançou. */
export function autoLaunch(s: GameState, m: Modifiers): boolean {
  if ((s.drones.scout ?? 0) < 1 || unsettled(s) + s.expeditions.length >= 3) return false;
  if (!canLaunch(s).ok) return false;
  payCost(s, expeditionCost(s, m));
  const total = expeditionDuration(s, m);
  s.expeditions.push({ id: `exp-${s.nextSeed}`, seed: s.nextSeed, remaining: total, total });
  s.nextSeed++;
  return true;
}
