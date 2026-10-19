import type { Buff, GameState } from '../types';
import { DECREE_BUFF_PREFIX, DECREE_BY_ID } from '../data/decrees';
import { colonyCount } from '../selectors';
import { cloneState } from './state';
import { canAfford, payCost } from './costs';

// Decretos: efeitos temporários comprados com influência. Reeditar um decreto ativo renova a duração.

export const decreesUnlocked = (s: GameState) => !!s.upgrades.embassies;

export const activeDecree = (s: GameState, id: string): Buff | undefined => s.buffs.find(b => b.id === DECREE_BUFF_PREFIX + id);

/** Governar um império grande custa mais: +6% por colônia. */
export const decreeCost = (s: GameState, id: string) => Math.ceil(DECREE_BY_ID[id].cost * (1 + 0.06 * colonyCount(s)));

export function canEnact(s: GameState, id: string): { ok: boolean; reason?: string } {
  const d = DECREE_BY_ID[id];
  if (!d) return { ok: false };
  if (!decreesUnlocked(s)) return { ok: false, reason: 'Pesquise Corpo diplomático.' };
  if (!canAfford(s, { influence: decreeCost(s, id) })) return { ok: false, reason: 'Falta influência.' };
  return { ok: true };
}

export function enactDecree(prev: GameState, id: string): GameState | null {
  if (!canEnact(prev, id).ok) return null;
  const d = DECREE_BY_ID[id];
  const s = cloneState(prev);
  payCost(s, { influence: decreeCost(prev, id) });
  s.buffs = s.buffs.filter(b => b.id !== DECREE_BUFF_PREFIX + id);
  s.buffs.push({ id: DECREE_BUFF_PREFIX + id, name: d.name, effects: d.effects, remaining: d.duration });
  return s;
}
