import type { Amounts, GameState, ResId, Vein } from '../types';
import { BUILDINGS } from '../data/buildings';
import { BALANCE } from '../data/balance';
import { CRUST_ID, VEIN_KINDS, type VeinKind } from '../data/deposit';
import { RESOURCES, STARTER_DEPOSIT } from '../data/resources';
import { cloneState, rng } from './state';
import { depositShares, getModifiers, type Modifiers } from './modifiers';
import { canAfford, payCost } from './costs';

// Jazida: a crosta do asteroide é infinita; os veios são reservas finitas que rendem mais e trazem minérios novos.
// Enquanto houver um veio em foco, toda a extração (máquinas e cliques) sai dele; esgotado, volta para a crosta.

export const prospectingUnlocked = (s: GameState) => !!s.upgrades.geology;
export const autoDepositUnlocked = (s: GameState) => !!s.upgrades.autoProspect;

export const veinsLeft = (s: GameState) => s.deposit.veins.filter(v => v.reserve > 0);
const veinById = (s: GameState, id: string): Vein | undefined => s.deposit.veins.find(v => v.id === id);

/** O veio em foco, se ainda tiver reserva (senão a extração sai da crosta). */
export function activeVein(s: GameState): Vein | null {
  const v = veinById(s, s.deposit.focus);
  return v && v.reserve > 0 ? v : null;
}

export interface ActiveMix { veinId: string | null; shares: Amounts; yield: number }

/** De onde sai o minério agora: composição (com os bônus de prospecção) e multiplicador de extração. */
export function activeMix(s: GameState, m: Modifiers): ActiveMix {
  const v = activeVein(s);
  return v ? { veinId: v.id, shares: depositShares(m, v.mix), yield: v.yield } : { veinId: null, shares: depositShares(m, STARTER_DEPOSIT), yield: 1 };
}

/** Extração nominal (unidades/s) de todas as máquinas, sem contar energia e mão de obra: base do tamanho das reservas. */
export function extractionRate(s: GameState, m: Modifiers = getModifiers(s)): number {
  let rate = 0;
  for (const b of BUILDINGS) if (b.extract && s.buildings[b.id] > 0) rate += s.buildings[b.id] * b.extract * (m.output[b.id] ?? 1) * m.outputAll;
  return Math.max(1, rate);
}

export function prospectCost(s: GameState, m: Modifiers = getModifiers(s)): Amounts {
  return { credits: Math.max(BALANCE.prospectMin, Math.round(extractionRate(s, m) * BALANCE.veinSeconds * BALANCE.prospectFactor)) };
}

export const availableKinds = (s: GameState): VeinKind[] =>
  VEIN_KINDS.filter(k => (k.minFound ?? 0) <= s.deposit.found && (!k.requires || s.upgrades[k.requires]));

export function canProspect(s: GameState): { ok: boolean; reason?: string } {
  if (!prospectingUnlocked(s)) return { ok: false, reason: 'Pesquise Geologia.' };
  if (veinsLeft(s).length >= BALANCE.veinMaxActive) return { ok: false, reason: `No máximo ${BALANCE.veinMaxActive} veios ao mesmo tempo: esgote um antes.` };
  if (!canAfford(s, prospectCost(s))) return { ok: false, reason: 'Faltam créditos.' };
  return { ok: true };
}

/** Sorteia o tipo de veio entre os liberados (determinístico pela semente). */
function drawKind(s: GameState, r: () => number): VeinKind {
  const kinds = availableKinds(s);
  let x = r() * kinds.reduce((a, k) => a + k.weight, 0);
  for (const k of kinds) { x -= k.weight; if (x <= 0) return k; }
  return kinds[kinds.length - 1];
}

/** Descobre um veio novo (muda o estado recebido). Paga o custo, registra os minérios no catálogo e, se não há veio em foco, o escolhe. */
function prospectInto(s: GameState): Vein | null {
  if (!canProspect(s).ok) return null;
  const m = getModifiers(s);
  payCost(s, prospectCost(s, m));
  const seed = s.nextSeed++;
  const r = rng(seed * 977 + 5);
  const kind = drawKind(s, r);
  const reserve = Math.max(BALANCE.veinMinReserve, Math.round(extractionRate(s, m) * BALANCE.veinSeconds * kind.reserve * (0.8 + r() * 0.5)));
  const vein: Vein = { id: `v-${seed}`, kind: kind.id, name: `${kind.name} ${s.deposit.found + 1}`, mix: { ...kind.mix }, yield: kind.yield, reserve, total: reserve };
  s.deposit.veins.push(vein);
  s.deposit.found++;
  // Mantém a lista enxuta: dos veios esgotados ficam só os seis mais recentes.
  const spent = s.deposit.veins.filter(v => v.reserve <= 0);
  if (spent.length > 6) { const drop = new Set(spent.slice(0, spent.length - 6).map(v => v.id)); s.deposit.veins = s.deposit.veins.filter(v => !drop.has(v.id)); }
  for (const res of Object.keys(kind.mix) as ResId[]) { const mineral = RESOURCES[res].mineral; if (mineral && !s.discovered.includes(mineral)) s.discovered.push(mineral); }
  if (!activeVein(s)) s.deposit.focus = vein.id;
  return vein;
}

export function prospect(prev: GameState): GameState | null {
  if (!canProspect(prev).ok) return null;
  const s = cloneState(prev);
  return prospectInto(s) ? s : null;
}

export function setFocus(prev: GameState, id: string): GameState | null {
  if (id !== CRUST_ID) { const v = veinById(prev, id); if (!v || v.reserve <= 0) return null; }
  if (prev.deposit.focus === id) return null;
  const s = cloneState(prev);
  s.deposit.focus = id;
  return s;
}

export function setAutoDeposit(prev: GameState, on: boolean): GameState | null {
  if (!autoDepositUnlocked(prev) || prev.deposit.auto === on) return null;
  const s = cloneState(prev);
  s.deposit.auto = on;
  return s;
}

/** Quanto vale um veio para quem o escolhe sozinho: rendimento × valor de mercado da mistura (minérios raros pesam mais). */
export function veinScore(v: Vein): number {
  let value = 0;
  for (const [res, share] of Object.entries(v.mix)) value += (share ?? 0) * (RESOURCES[res as ResId].sellPrice ?? 1);
  return v.yield * value;
}

/** Tira `amount` de minério do veio em foco; esgotado, a extração volta para a crosta. */
export function drain(s: GameState, veinId: string, amount: number) {
  const v = veinById(s, veinId);
  if (!v) return;
  v.reserve = Math.max(0, v.reserve - amount);
  if (v.reserve <= 1e-9) {
    v.reserve = 0;
    if (s.deposit.focus === veinId) s.deposit.focus = CRUST_ID;
  }
}

/** Automação (pesquisa "Sondas autônomas"): foca o melhor veio e prospecta de novo quando não sobra nenhum. Dentro da simulação. */
export function autoDeposit(s: GameState) {
  if (!s.deposit.auto || !autoDepositUnlocked(s)) return;
  if (!activeVein(s)) {
    const best = veinsLeft(s).sort((a, b) => veinScore(b) - veinScore(a))[0];
    if (best) s.deposit.focus = best.id;
    else if (canProspect(s).ok && s.resources.credits >= (prospectCost(s).credits ?? 0) * 3) prospectInto(s);
  }
}

