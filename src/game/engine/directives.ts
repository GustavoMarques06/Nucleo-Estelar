import type { BuildingId, Directive, DirectiveDo, DirectiveWhen, GameState, ResId } from '../types';
import { RESOURCES, RES_IDS } from '../data/resources';
import { BUILDING_IDS } from '../data/buildings';
import { THROTTLE_STEPS, throttleable } from './energy';
import { cloneState } from './state';
import { challengeBlocks } from './challenges';

// Diretivas: regras "se … então …" que a base cumpre sozinha a cada passo da simulação (também offline).
// Liberadas pela IA operacional. As condições olham o armazém e a energia; as ações vendem ou mudam o ritmo.

export const DIRECTIVE_MAX = 6;
export const DIRECTIVE_FRACS = [0.1, 0.25, 0.5, 0.75, 0.9] as const;
/** A venda de uma diretiva deixa este tanto do armazém (vende só o excedente). */
export const SELL_DOWN_TO = 0.5;
/** "Sobra energia" = a geração passa a demanda em pelo menos isto. */
const SPARE_MARGIN = 1.2;

export const directivesUnlocked = (s: GameState) => !!s.upgrades.ai;

/** Recursos que uma condição pode olhar: os guardados no armazém. */
export const watchable = (): ResId[] => RES_IDS.filter(r => RESOURCES[r].stored);
/** Recursos que uma diretiva pode vender: guardados e com preço. */
export const sellableByDirective = (): ResId[] => watchable().filter(r => (RESOURCES[r].sellPrice ?? 0) > 0);
/** Estruturas cujo ritmo uma diretiva pode mudar. */
export const throttleTargets = (): BuildingId[] => BUILDING_IDS.filter(throttleable);

const FRACS = DIRECTIVE_FRACS as readonly number[];
const STEPS = THROTTLE_STEPS as readonly number[];

export function validWhen(w: DirectiveWhen): boolean {
  if (w.kind === 'energyShort' || w.kind === 'energySpare') return true;
  return (w.kind === 'above' || w.kind === 'below') && watchable().includes(w.res) && FRACS.includes(w.frac);
}
export function validDo(d: DirectiveDo): boolean {
  if (d.kind === 'sell') return sellableByDirective().includes(d.res);
  return d.kind === 'throttle' && throttleable(d.building) && STEPS.includes(d.value);
}

/** Regra nova: um ponto de partida comum (vender o ferro quando o armazém está quase cheio). */
export function addDirective(prev: GameState): GameState | null {
  if (!directivesUnlocked(prev) || prev.directives.length >= DIRECTIVE_MAX) return null;
  const s = cloneState(prev);
  s.directives.push({ id: `d-${s.nextSeed++}`, when: { kind: 'above', res: 'iron', frac: 0.9 }, then: { kind: 'sell', res: 'iron' }, on: true, fired: 0 });
  return s;
}

export function updateDirective(prev: GameState, id: string, patch: { when?: DirectiveWhen; then?: DirectiveDo; on?: boolean }): GameState | null {
  const i = prev.directives.findIndex(d => d.id === id);
  if (i < 0) return null;
  const cur = prev.directives[i];
  const next: Directive = { ...cur, when: patch.when ?? cur.when, then: patch.then ?? cur.then, on: patch.on ?? cur.on };
  if (!validWhen(next.when) || !validDo(next.then)) return null;
  const s = cloneState(prev);
  s.directives[i] = { ...next, when: { ...next.when }, then: { ...next.then }, fired: patch.when || patch.then ? 0 : cur.fired };
  return s;
}

export function removeDirective(prev: GameState, id: string): GameState | null {
  if (!prev.directives.some(d => d.id === id)) return null;
  const s = cloneState(prev);
  s.directives = s.directives.filter(d => d.id !== id);
  return s;
}

export interface DirectiveContext {
  caps: Record<ResId, number>;
  energy: { ratio: number; supply: number; demand: number };
  /** Vende `units` de `res` ao preço de agora e devolve os créditos (a economia cuida do mercado). */
  sell: (res: ResId, units: number) => number;
}

/** A condição vale agora? */
export function conditionMet(s: GameState, w: DirectiveWhen, ctx: Pick<DirectiveContext, 'caps' | 'energy'>): boolean {
  switch (w.kind) {
    case 'above': return s.resources[w.res] > ctx.caps[w.res] * w.frac;
    case 'below': return s.resources[w.res] < ctx.caps[w.res] * w.frac;
    case 'energyShort': return ctx.energy.ratio < 0.999;
    case 'energySpare': return ctx.energy.supply >= ctx.energy.demand * SPARE_MARGIN;
  }
}

/** Cumpre as diretivas ligadas (dentro da simulação; muda o estado recebido). */
export function runDirectives(s: GameState, ctx: DirectiveContext) {
  if (!directivesUnlocked(s) || !s.directives.length) return;
  for (const d of s.directives) {
    if (!d.on || !conditionMet(s, d.when, ctx)) continue;
    if (d.then.kind === 'sell') {
      if (challengeBlocks(s, 'sell')) continue;
      const units = Math.floor(s.resources[d.then.res] - ctx.caps[d.then.res] * SELL_DOWN_TO);
      if (units >= 1 && ctx.sell(d.then.res, units) > 0) d.fired++;
    } else {
      const { building, value } = d.then;
      if ((s.throttle[building] ?? 1) === value) continue;
      if (value >= 1) delete s.throttle[building]; else s.throttle[building] = value;
      d.fired++;
    }
  }
}
