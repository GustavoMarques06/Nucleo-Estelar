import type { DroneRole, GameState } from '../types';
import { DRONE_ROLES } from '../data/drones';
import { cloneState } from './state';

export const dronesUnlocked = (s: GameState) => !!s.upgrades.droneLogistics;
export const droneTotal = (s: GameState) => Math.floor(s.resources.drones);
export const droneAssigned = (s: GameState) => DRONE_ROLES.reduce((a, r) => a + (s.drones[r.id] ?? 0), 0);
export const droneFree = (s: GameState) => Math.max(0, droneTotal(s) - droneAssigned(s));

/** Designa (delta > 0) ou libera (delta < 0) drones de uma função. Limita ao que existe. */
export function assignDrones(prev: GameState, role: DroneRole, delta: number): GameState | null {
  const cur = prev.drones[role] ?? 0;
  const next = Math.max(0, Math.min(cur + Math.floor(delta), cur + droneFree(prev)));
  if (next === cur) return null;
  const s = cloneState(prev);
  s.drones[role] = next;
  return s;
}
