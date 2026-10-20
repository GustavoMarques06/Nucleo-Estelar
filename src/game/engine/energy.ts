import type { BuildingId, GameState, Priority } from '../types';
import { BUILDING_BY_ID } from '../data/buildings';
import { BALANCE } from '../data/balance';
import { cloneState } from './state';

// Controles finos da base: sobrecarga dos reatores, ritmo de cada estrutura e prioridade na disputa por insumos.

// ---------- Sobrecarga ----------
export type OverclockPhase = { kind: 'ready' } | { kind: 'active'; left: number } | { kind: 'cooling'; left: number };

export function overclockPhase(s: GameState, id: BuildingId): OverclockPhase {
  const oc = s.overclock[id];
  if (oc && oc.left > 0) return { kind: 'active', left: oc.left };
  if (oc && oc.cool > 0) return { kind: 'cooling', left: oc.cool };
  return { kind: 'ready' };
}

export const canOverclock = (s: GameState, id: BuildingId) =>
  !!BUILDING_BY_ID[id]?.overclock && s.buildings[id] > 0 && overclockPhase(s, id).kind === 'ready';

/** Liga a sobrecarga: energia ×2 por um tempo; depois o reator esfria antes de poder repetir. */
export function overclockReactor(prev: GameState, id: BuildingId): GameState | null {
  if (!canOverclock(prev, id)) return null;
  const s = cloneState(prev);
  s.overclock[id] = { left: BALANCE.overclockTime, cool: 0 };
  return s;
}

/** Avança os relógios das sobrecargas (dentro da simulação; muda o estado recebido). */
export function advanceOverclock(s: GameState, dt: number) {
  for (const [id, oc] of Object.entries(s.overclock)) {
    if (!oc) continue;
    if (oc.left > 0) {
      oc.left -= dt;
      // Terminou no meio do passo: o resto do passo já conta como resfriamento.
      if (oc.left <= 0) { oc.cool = BALANCE.overclockCooldown + oc.left; oc.left = 0; }
    } else oc.cool -= dt;
    if (oc.left <= 0 && oc.cool <= 0) delete s.overclock[id as BuildingId];
  }
}

// ---------- Ritmo e prioridade ----------
export const THROTTLE_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

/** Estruturas que têm ritmo ajustável: as que produzem, extraem, geram ou convertem. */
export const throttleable = (id: BuildingId) => { const b = BUILDING_BY_ID[id]; return !!(b && (b.extract || b.outputs || b.energyOut || b.surplus)); };
/** Estruturas que disputam insumos (só para elas a prioridade faz diferença). */
export const prioritizable = (id: BuildingId) => { const b = BUILDING_BY_ID[id]; return !!(b && b.inputs && !b.energyOut); };

export function setThrottle(prev: GameState, id: BuildingId, value: number): GameState | null {
  if (!throttleable(id) || !(THROTTLE_STEPS as readonly number[]).includes(value) || (prev.throttle[id] ?? 1) === value) return null;
  const s = cloneState(prev);
  if (value >= 1) delete s.throttle[id]; else s.throttle[id] = value;
  return s;
}

export function setPriority(prev: GameState, id: BuildingId, p: Priority | 0): GameState | null {
  if (!prioritizable(id) || (prev.priority[id] ?? 0) === p) return null;
  const s = cloneState(prev);
  if (p === 0) delete s.priority[id]; else s.priority[id] = p;
  return s;
}
