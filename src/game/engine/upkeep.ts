import type { GameState } from '../types';
import { BUILDINGS } from '../data/buildings';
import { BALANCE } from '../data/balance';
import { type Modifiers } from './modifiers';

// Manutenção: estruturas grandes, colônias e rotas seguradas custam créditos por segundo. O que não puder ser
// pago vira dívida (paga primeiro com os créditos que entrarem); passando da tolerância, as estruturas caras
// perdem ritmo, mas nunca param de vez.

export interface UpkeepBreakdown { buildings: number; colonies: number; insurance: number; total: number }

/** Créditos por segundo de manutenção (já com os redutores). */
export function upkeepBreakdown(s: GameState, m: Modifiers): UpkeepBreakdown {
  let buildings = 0;
  for (const b of BUILDINGS) if (b.upkeep && s.buildings[b.id] > 0) buildings += b.upkeep * s.buildings[b.id];
  let colonies = 0;
  for (const l of s.locations) {
    if (!l.outpost) continue;
    colonies += BALANCE.colonyUpkeep * Math.pow(l.outpost.level, 1.2) * (1 + 0.25 * l.outpost.terra);
  }
  const insurance = s.routes.filter(r => r.insured).length * BALANCE.insuranceUpkeep;
  const k = m.upkeep;
  return { buildings: buildings * k, colonies: colonies * k, insurance: insurance * k, total: (buildings + colonies + insurance) * k };
}

/** Fração do ritmo que as estruturas com manutenção conseguem manter, dada a dívida atual. */
export function upkeepRatio(debt: number, rate: number): number {
  const grace = rate * BALANCE.upkeepGrace;
  if (debt <= grace || rate <= 0) return 1;
  return Math.max(BALANCE.upkeepFloor, grace / debt);
}

/** Cobra `dt` segundos de manutenção dos créditos em caixa; o que faltar vira dívida. */
export function payUpkeep(s: GameState, rate: number, dt: number) {
  s.debt += rate * dt;
  const pay = Math.min(s.resources.credits, s.debt);
  s.resources.credits -= pay;
  s.debt -= pay;
  if (s.debt < 1e-6) s.debt = 0;
}
