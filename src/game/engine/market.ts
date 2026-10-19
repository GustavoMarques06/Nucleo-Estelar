import type { GameState, ResId } from '../types';
import { RESOURCES } from '../data/resources';
import { baseDepth, marketAt, saleRevenue, saturationAfter } from '../data/market';
import { sellPrice, type Modifiers } from './modifiers';

export const marketUnlocked = (s: GameState) => !!s.upgrades.commerce;

/** Multiplicador do preço base agora (1 enquanto o mercado dinâmico não está liberado). */
export const marketFactor = (s: GameState, res: ResId): number => (marketUnlocked(s) ? marketAt(res, s.market.clock) : 1);

/** Recursos vendáveis que têm cotação. */
export const tradedResources = (): ResId[] =>
  (Object.keys(RESOURCES) as ResId[]).filter(r => RESOURCES[r].sellPrice && r !== 'credits');

export const isHigh = (factor: number) => factor >= 1.25;

/** Escala da economia: a demanda acompanha o tamanho da civilização (como as recompensas de eventos). */
const economyScale = (s: Pick<GameState, 'stats'>) => Math.max(1, Math.sqrt(Math.max(0, s.stats.earned)) / 20);

/** Quantas unidades de `res` o mercado absorve até o preço cair à metade. */
export const marketDepth = (s: GameState, m: Modifiers, res: ResId) =>
  baseDepth(RESOURCES[res].sellPrice ?? 1) * economyScale(s) * m.depth;

/** Saturação atual da demanda de `res` (0 = preço cheio). Sem o mercado liberado nada satura. */
export const saturationOf = (s: GameState, res: ResId) => (marketUnlocked(s) ? s.market.sat[res] ?? 0 : 0);

/** Preço de uma unidade agora: base × mercado × (1/(1+saturação)). */
export const unitPriceNow = (s: GameState, m: Modifiers, res: ResId) =>
  sellPrice(res, m, marketFactor(s, res)) / (1 + saturationOf(s, res));

/** Quanto renderia vender `units` agora, e a saturação que isso deixaria. */
export function quoteSale(s: GameState, m: Modifiers, res: ResId, units: number): { earned: number; sat: number } {
  const x = saturationOf(s, res);
  if (!marketUnlocked(s)) return { earned: units * sellPrice(res, m, 1), sat: 0 };
  const depth = marketDepth(s, m, res);
  return { earned: saleRevenue(sellPrice(res, m, marketFactor(s, res)), units, x, depth), sat: saturationAfter(x, units, depth) };
}
