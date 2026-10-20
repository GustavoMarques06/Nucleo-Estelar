import type { ResId } from '../types';
import { BALANCE } from './balance';

export interface MarketCurve { amp: number; p1: number; p2: number; ph1: number; ph2: number }

// Mercado dinâmico: o preço de cada recurso oscila em torno do preço base com duas ondas de períodos
// diferentes. É determinístico (depende só do relógio do mercado), então dá para mostrar a previsão
// e testar. Liberado pela pesquisa "Entrepostos comerciais".
export const MARKET: Partial<Record<ResId, MarketCurve>> = {
  iron:       { amp: 0.15, p1: 540,  p2: 210, ph1: 0.4, ph2: 2.1 },
  copper:     { amp: 0.18, p1: 660,  p2: 270, ph1: 1.9, ph2: 0.3 },
  gold:       { amp: 0.35, p1: 900,  p2: 330, ph1: 3.6, ph2: 1.2 },
  alloys:     { amp: 0.20, p1: 780,  p2: 300, ph1: 5.2, ph2: 2.8 },
  components: { amp: 0.25, p1: 1020, p2: 390, ph1: 2.7, ph2: 4.4 },
  water:      { amp: 0.12, p1: 480,  p2: 180, ph1: 4.1, ph2: 0.9 },
  food:       { amp: 0.20, p1: 600,  p2: 240, ph1: 0.9, ph2: 5.0 },
  fuel:       { amp: 0.30, p1: 840,  p2: 360, ph1: 5.8, ph2: 3.3 },
  exotic:     { amp: 0.40, p1: 1200, p2: 450, ph1: 1.4, ph2: 2.5 },
  titanium:   { amp: 0.22, p1: 960,  p2: 360, ph1: 0.8, ph2: 3.9 },
  crystals:   { amp: 0.32, p1: 1140, p2: 420, ph1: 4.6, ph2: 1.7 },
  modules:    { amp: 0.28, p1: 1080, p2: 420, ph1: 3.1, ph2: 0.6 },
  slag:       { amp: 0.10, p1: 600,  p2: 250, ph1: 2.2, ph2: 4.7 },
};

export const MARKET_MIN = 0.5;
export const MARKET_MAX = 1.8;
export const SELL_FLOORS = [0, 0.5, 0.7, 0.85, 1, 1.1, 1.2, 1.3] as const;       // opções de "vender só acima de"
export const KEEP_STEPS = [0, 0.1, 0.25, 0.5, 0.75] as const;                    // opções de reserva do armazém

/** Multiplicador do preço base no instante `t` (segundos de mercado). */
export function marketAt(res: ResId, t: number): number {
  const c = MARKET[res];
  if (!c) return 1;
  const wave = 0.65 * Math.sin((2 * Math.PI * t) / c.p1 + c.ph1) + 0.35 * Math.sin((2 * Math.PI * t) / c.p2 + c.ph2);
  return Math.min(MARKET_MAX, Math.max(MARKET_MIN, 1 + c.amp * wave));
}

/** Amostras de preço de `from` até `from + span`, para o gráfico de previsão. */
export function marketCurve(res: ResId, from: number, span: number, points: number): number[] {
  return Array.from({ length: points }, (_, i) => marketAt(res, from + (span * i) / (points - 1)));
}

/** Próximo instante (em segundos a partir de agora) em que o preço atinge seu pico nos próximos `span` s. */
export function nextPeak(res: ResId, now: number, span = 1800, step = 15): { in: number; mult: number } {
  let best = { in: 0, mult: marketAt(res, now) };
  for (let dt = step; dt <= span; dt += step) {
    const v = marketAt(res, now + dt);
    if (v > best.mult) best = { in: dt, mult: v };
  }
  return best;
}

// ---------- Demanda: vender muito de uma vez derruba o preço ----------
// A demanda de cada recurso absorve a mesma quantidade de créditos (por isso itens caros têm profundidade pequena).
// A saturação `x` baixa o preço para 1/(1+x) e cada unidade vendida soma 1/profundidade; ela se recupera com o tempo.
export const baseDepth = (price: number) => BALANCE.marketValue / Math.max(0.1, price);

/** Receita de vender `units` unidades com saturação `x` (soma contínua do preço que vai caindo). */
export function saleRevenue(unitPrice: number, units: number, x: number, depth: number): number {
  if (units <= 0 || unitPrice <= 0) return 0;
  return unitPrice * depth * Math.log(1 + units / (depth * (1 + x)));
}

/** Nova saturação depois de vender `units`. */
export const saturationAfter = (x: number, units: number, depth: number) => x + units / depth;

/** Saturação depois de `dt` segundos de recuperação. */
export const recover = (x: number, dt: number) => x * Math.pow(0.5, dt / BALANCE.marketRecovery);
