import { BALANCE } from '../data/balance';

// O asteroide gira: painéis solares rendem mais de dia e menos à noite (média 100% por volta).

const W = (2 * Math.PI) / BALANCE.dayPeriod;

/**
 * Fator solar médio no intervalo [t, t + dt]. Com dt = 0 é o valor instantâneo. A média exata (integral do seno)
 * faz passos longos — cálculo offline, aba em segundo plano — darem o mesmo total que passos curtos.
 */
export function dayFactor(t: number, dt = 0): number {
  const a = BALANCE.dayAmplitude;
  if (dt <= 1e-9) return 1 + a * Math.sin(W * t);
  return 1 + (a * (Math.cos(W * t) - Math.cos(W * (t + dt)))) / (W * dt);
}

/** Dia quando o sol está acima do horizonte (fator acima da média). */
export const isDay = (t: number) => Math.sin(W * t) >= 0;

/** Segundos até a próxima virada (nascer ou pôr do sol). */
export function nextTurn(t: number): number {
  const half = BALANCE.dayPeriod / 2;
  return half - (((t % half) + half) % half);
}
