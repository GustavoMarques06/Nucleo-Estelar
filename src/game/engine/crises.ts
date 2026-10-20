import type { Amounts, Crisis, CrisisKind, GameState, Location, ResId } from '../types';
import { BALANCE } from '../data/balance';
import { CRISES, CRISIS_BY_KIND } from '../data/crises';
import { TREATY_AT } from '../data/factions';
import { cloneState } from './state';
import { canAfford, payCost } from './costs';
import { capsOf } from './modifiers';
import { routesOf } from './routes';

/** Quanto da produção a colônia mantém neste recurso (1 = sem crise). */
export function crisisFactor(s: Pick<GameState, 'crises'>, locId: string, res: ResId): number {
  const c = s.crises.find(x => x.locId === locId);
  return c ? CRISIS_BY_KIND[c.kind].hit(res, BALANCE.crisisPenalty) : 1;
}

export const crisisOf = (s: GameState, locId: string): Crisis | null => s.crises.find(c => c.locId === locId) ?? null;

/** Custo de resolver na hora. Fica dentro da capacidade do armazém (fração dela, crescendo com o nível da colônia). */
export function crisisCost(s: GameState, c: Crisis): Amounts {
  const loc = s.locations.find(l => l.id === c.locId);
  const level = loc?.outpost?.level ?? 1;
  const cap = capsOf(s);
  const k = Math.min(0.45, 0.08 + 0.035 * Math.min(level, 10));
  const discount = (loc?.outpost?.terra ?? 0) >= 3 ? 0.6 : 1;               // mundos terraformados são mais resilientes
  const amt = (v: number) => Math.max(1, Math.ceil(v * discount));
  const lv = Math.min(level, 60);                                            // custos em créditos sem estourar com níveis absurdos
  switch (c.kind) {
    case 'drought': return { water: amt(cap.water * k) };
    case 'unrest': return { credits: amt(15000 * Math.pow(1.6, lv)) };
    case 'raid': return { fuel: amt(cap.fuel * k * 0.6), components: amt(cap.components * k * 0.6) };
    case 'plague': return { food: amt(cap.food * k) };
    case 'blockade': return { fuel: amt(cap.fuel * k * 0.5), credits: amt(8000 * Math.pow(1.5, lv)) };
  }
}

const helperRelation = (s: GameState, c: Crisis) => s.factions[CRISIS_BY_KIND[c.kind].helper]?.relation ?? 0;
export const HELP_COST = 8;                                                 // relação gasta ao pedir ajuda
export const canAskHelp = (s: GameState, c: Crisis) => !!s.upgrades.diplomacy && helperRelation(s, c) >= TREATY_AT;

export function resolveCrisis(prev: GameState, id: string, how: 'pay' | 'help'): GameState | null {
  const c = prev.crises.find(x => x.id === id);
  if (!c) return null;
  const s = cloneState(prev);
  if (how === 'pay') {
    const cost = crisisCost(prev, c);
    if (!canAfford(prev, cost)) return null;
    payCost(s, cost);
  } else {
    if (!canAskHelp(prev, c)) return null;
    const f = s.factions[CRISIS_BY_KIND[c.kind].helper];
    f.relation = Math.max(0, f.relation - HELP_COST);
  }
  s.crises = s.crises.filter(x => x.id !== id);
  s.stats.crisesSolved++;
  return s;
}

/**
 * Sorteia uma crise para uma colônia sem crise. Só é chamada com o jogo aberto (como os eventos): ficar fora
 * nunca gera crises. Sempre reagenda o próximo sorteio.
 */
export function spawnCrisis(prev: GameState, random: () => number = Math.random): GameState {
  const s = cloneState(prev);
  s.crisisTimer = BALANCE.crisisMinGap + random() * (BALANCE.crisisMaxGap - BALANCE.crisisMinGap);
  const free = s.locations.filter(l => l.outpost && !s.crises.some(c => c.locId === l.id));
  if (!free.length || s.crises.length >= BALANCE.crisisMax) return s;
  const hostile = (l: Location) => !!l.claimedBy && (s.factions[l.claimedBy]?.relation ?? 0) < TREATY_AT;
  const pickWeighted = <T,>(items: T[], w: (t: T) => number): T => {
    let r = random() * items.reduce((a, t) => a + w(t), 0);
    for (const t of items) { r -= w(t); if (r <= 0) return t; }
    return items[items.length - 1];
  };
  const loc = free[Math.floor(random() * free.length)];
  const def = pickWeighted(CRISES, d => d.weight(loc, hostile(loc), routesOf(s, loc.id).filter(r => !r.insured).length));
  const total = BALANCE.crisisDuration * ((loc.outpost?.terra ?? 0) >= 3 ? 0.5 : 1);   // terraformados passam mais rápido
  s.crises.push({ id: `cr-${s.nextSeed++}`, locId: loc.id, kind: def.kind as CrisisKind, remaining: total, total });
  return s;
}

/** Avança os prazos (dentro da simulação). */
export function advanceCrises(s: GameState, dt: number) {
  for (const c of s.crises) c.remaining -= dt;
  s.crises = s.crises.filter(c => c.remaining > 0);
  if (s.locations.some(l => l.outpost)) s.crisisTimer -= dt;
}


