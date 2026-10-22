import type { Amounts, GameState, Location, ResId, TradeRoute } from '../types';
import { LOCATION_BY_TYPE, ROUTE } from '../data/locations';
import { BALANCE } from '../data/balance';
import { repLevel } from './modifiers';
import { cloneState } from './state';
import { canAfford, payCost } from './costs';
import { t } from '../../i18n';

export const routesUnlocked = (s: GameState) => !!s.upgrades.logisticsNet;

/** Recursos que uma colônia produz (tipo do mundo + o que a especialização acrescenta). */
export function colonyProduces(loc: Location): ResId[] {
  if (!loc.outpost) return [];
  const out = new Set<ResId>(Object.keys(LOCATION_BY_TYPE[loc.type].yields) as ResId[]);
  switch (loc.outpost.spec) {
    case 'agriculture': out.add('food'); break;
    case 'science': out.add('science'); break;
    case 'industry': out.add('alloys'); out.add('components'); break;
    case 'commerce': case 'civilization': out.add('credits'); break;
  }
  return [...out];
}

export const needOf = (loc: Location): ResId => LOCATION_BY_TYPE[loc.type].need;

export const routesOf = (s: Pick<GameState, 'routes'>, locId: string) => s.routes.filter(r => r.a === locId || r.b === locId);
const partnerId = (r: TradeRoute, locId: string) => (r.a === locId ? r.b : r.a);

/** Máximo de rotas por colônia: 2 + 1 a cada 5 Portos de carga (até +3). */
export const maxRoutes = (s: GameState) => ROUTE.baseMax + Math.min(3, Math.floor((s.buildings.harbor ?? 0) / 5));

interface RouteInfo { supplied: boolean; suppliesCount: number; mult: number }

/** Efeito das rotas na produção de uma colônia. */
/** Rota suspensa por um bloqueio em qualquer ponta (rotas seguradas passam). */
export const isBlocked = (s: Pick<GameState, 'crises'>, r: TradeRoute) =>
  !r.insured && s.crises.some(c => c.kind === 'blockade' && (c.locId === r.a || c.locId === r.b));

export function routeInfo(s: Pick<GameState, 'routes' | 'locations' | 'crises'>, loc: Location): RouteInfo {
  let supplied = false, suppliesCount = 0;
  for (const r of routesOf(s, loc.id)) {
    if (isBlocked(s, r)) continue;
    const other = s.locations.find(l => l.id === partnerId(r, loc.id));
    if (!other?.outpost) continue;
    if (colonyProduces(other).includes(needOf(loc))) supplied = true;
    if (colonyProduces(loc).includes(needOf(other))) suppliesCount++;
  }
  return { supplied, suppliesCount, mult: (supplied ? 1 + ROUTE.suppliedBonus : 1) * (1 + ROUTE.supplierBonus * suppliesCount) };
}

/** Quanto essa rota renderia (para ajudar a escolher a parceira). */
export function routeScore(a: Location, b: Location): number {
  const s1 = colonyProduces(b).includes(needOf(a)) ? 1 : 0;
  const s2 = colonyProduces(a).includes(needOf(b)) ? 1 : 0;
  return s1 * 2 + s2;
}

export function routeCost(s: GameState, a: Location, b: Location): Amounts {
  return {
    credits: Math.ceil(ROUTE.creditsBase * Math.pow(ROUTE.creditsGrowth, s.routes.length) * Math.max(0.5, 1 - 0.03 * repLevel(s))),
    fuel: ROUTE.fuelBase + ROUTE.fuelPerDistance * (a.distance + b.distance),
  };
}

export function canOpenRoute(s: GameState, aId: string, bId: string): { ok: boolean; reason?: string } {
  if (!routesUnlocked(s)) return { ok: false, reason: 'Pesquise Rotas de transporte.' };
  const a = s.locations.find(l => l.id === aId), b = s.locations.find(l => l.id === bId);
  if (!a?.outpost || !b?.outpost || aId === bId) return { ok: false, reason: 'Escolha duas colônias diferentes.' };
  if (s.routes.some(r => (r.a === aId && r.b === bId) || (r.a === bId && r.b === aId))) return { ok: false, reason: 'Essas colônias já estão ligadas.' };
  const max = maxRoutes(s);
  if (routesOf(s, aId).length >= max || routesOf(s, bId).length >= max) return { ok: false, reason: t('Limite de {n} rotas por colônia (Portos de carga aumentam).', { n: max }) };
  if (!canAfford(s, routeCost(s, a, b))) return { ok: false, reason: 'Faltam créditos ou combustível.' };
  return { ok: true };
}

export function openRoute(prev: GameState, aId: string, bId: string): GameState | null {
  if (!canOpenRoute(prev, aId, bId).ok) return null;
  const a = prev.locations.find(l => l.id === aId)!, b = prev.locations.find(l => l.id === bId)!;
  const s = cloneState(prev);
  payCost(s, routeCost(prev, a, b));
  s.routes.push({ id: `rt-${s.nextSeed++}`, a: aId, b: bId });
  return s;
}

/** Seguro: a rota fica imune a bloqueios, ao custo de um pagamento e de manutenção. */
export const insuranceCost = (s: GameState): Amounts => ({
  credits: Math.ceil(BALANCE.insuranceCost * ROUTE.creditsBase * (1 + 0.25 * s.routes.length)),
});

export function insureRoute(prev: GameState, id: string): GameState | null {
  const r = prev.routes.find(x => x.id === id);
  if (!r || r.insured || !canAfford(prev, insuranceCost(prev))) return null;
  const s = cloneState(prev);
  payCost(s, insuranceCost(prev));
  s.routes.find(x => x.id === id)!.insured = true;
  return s;
}

export function dropInsurance(prev: GameState, id: string): GameState | null {
  const r = prev.routes.find(x => x.id === id);
  if (!r?.insured) return null;
  const s = cloneState(prev);
  delete s.routes.find(x => x.id === id)!.insured;
  return s;
}

export function closeRoute(prev: GameState, id: string): GameState | null {
  if (!prev.routes.some(r => r.id === id)) return null;
  const s = cloneState(prev);
  s.routes = s.routes.filter(r => r.id !== id);
  return s;
}

