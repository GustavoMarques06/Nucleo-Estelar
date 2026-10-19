import type { Amounts, GameState, ResId } from '../types';
import { RESOURCES } from '../data/resources';
import { storageCap } from './modifiers';

// Mecânica de estoque: tudo que entra no armazém passa por aqui (respeita a capacidade e registra o que foi produzido).
// Fica fora da economia para que contratos, eventos e progressão possam conceder recursos sem depender dela.

export function addProduced(s: GameState, res: ResId, amount: number) {
  if (amount <= 0) return;
  s.stats.produced[res] = (s.stats.produced[res] ?? 0) + amount;
  if (res === 'credits') s.stats.earned += amount;
  const mineral = RESOURCES[res].mineral;
  if (mineral && !s.discovered.includes(mineral)) s.discovered.push(mineral);
}

/** Adiciona respeitando a capacidade do armazém; devolve quanto entrou. */
export function gain(s: GameState, res: ResId, amount: number, cap: number): number {
  const room = RESOURCES[res].stored ? Math.max(0, cap - s.resources[res]) : Infinity;
  const got = Math.max(0, Math.min(amount, room));
  s.resources[res] += got;
  addProduced(s, res, got);
  return got;
}

/** Adiciona várias quantidades (recompensas de eventos, contratos e objetivos). */
export function grant(s: GameState, amounts: Amounts) {
  const cap = storageCap(s);
  for (const [r, v] of Object.entries(amounts)) gain(s, r as ResId, v ?? 0, cap);
}
