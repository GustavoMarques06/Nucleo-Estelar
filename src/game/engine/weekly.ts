import type { Effect, GameState } from '../types';
import { BANES, BOONS, WEEKLY_RECORDS_MAX, type Mutator } from '../data/weekly';
import { rng } from './state';

const DAY = 86_400_000;

/** Número da semana (começa na segunda-feira; 1º/1/1970 foi uma quinta). */
export const weekOf = (ms: number) => Math.floor((ms / DAY + 3) / 7);
/** Segunda-feira em que a semana começa (meia-noite UTC). */
export const weekStart = (week: number) => new Date((week * 7 - 3) * DAY);

/** A regra da semana: uma vantagem e um revés, sorteados pela semana (iguais para todo mundo). */
export function weeklyRule(week: number): { boon: Mutator; bane: Mutator } {
  const r = rng(week * 7919 + 17);
  const boon = BOONS[Math.floor(r() * BOONS.length)];
  // O revés nunca anula a vantagem (preço contra preço, ciência contra ciência…).
  const clash = (m: Mutator) => m.effects.some(e => boon.effects.some(b => b.kind === e.kind && ('res' in b ? b.res : '') === ('res' in e ? e.res : '')));
  const banes = BANES.filter(b => !clash(b));
  return { boon, bane: banes[Math.floor(r() * banes.length)] };
}

export const weeklyEffects = (s: Pick<GameState, 'weekly'>): Effect[] => {
  if (s.weekly.active === null) return [];
  const { boon, bane } = weeklyRule(s.weekly.active);
  return [...boon.effects, ...bane.effects];
};

/** Guarda o tempo da jornada da semana que acabou de chegar à Ascensão (fica o melhor de cada semana). */
export function recordWeekly(records: GameState['weekly']['records'], week: number, time: number) {
  const prev = records.find(r => r.week === week);
  const rest = records.filter(r => r.week !== week);
  return [...rest, { week, time: prev ? Math.min(prev.time, time) : time }].sort((a, b) => a.week - b.week).slice(-WEEKLY_RECORDS_MAX);
}
