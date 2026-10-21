import type { Amounts, GameState, Location } from '../types';
import { ANOMALY_CHANCE, ANOMALY_NAMES, DIG_MAX, DIG_STAGES, RELICS } from '../data/relics';
import { canAfford, payCost } from './costs';
import { cloneState, rng } from './state';
import { grant } from './stock';
import { t } from '../../i18n';

// Sítios de anomalia: parte dos locais descobertos guarda algo dos Acendedores (decidido pela semente, igual em
// toda jornada). Escavar leva três etapas pagas; a última entrega uma relíquia permanente.

export const digsUnlocked = (s: GameState) => !!s.upgrades.exploration;

/** O local tem um sítio de anomalia? */
export const hasAnomaly = (loc: Pick<Location, 'seed'>) => rng(loc.seed * 4241 + 99)() < ANOMALY_CHANCE;
export const anomalyName = (loc: Pick<Location, 'seed'>) => ANOMALY_NAMES[Math.floor(rng(loc.seed * 613 + 7)() * ANOMALY_NAMES.length)];

/** Escala da economia (a mesma dos eventos e pedidos): o custo acompanha o tamanho do império. */
const digScale = (s: GameState) => Math.max(1, Math.sqrt(Math.max(0, s.stats.earned)) / 20);

/** Custo de começar a etapa `stage` (0, 1, 2). */
export function digCost(s: GameState, stage: number): Amounts {
  const k = digScale(s) * (stage + 1);
  return { credits: Math.ceil(1500 * k), fuel: Math.ceil(40 * k), ...(stage === 0 ? { ships: 1 } : {}) };
}

export const digOf = (s: GameState, locId: string) => s.digs.find(d => d.locId === locId);

export function canDig(s: GameState, locId: string): { ok: boolean; reason?: string } {
  if (!digsUnlocked(s)) return { ok: false, reason: 'Pesquise Exploração estelar.' };
  const loc = s.locations.find(l => l.id === locId);
  if (!loc || !hasAnomaly(loc)) return { ok: false };
  if (s.dug.includes(locId)) return { ok: false, reason: 'Este sítio já foi escavado.' };
  const dig = digOf(s, locId);
  if (dig && dig.remaining > 0) return { ok: false, reason: 'Etapa em andamento.' };
  if (!dig && s.digs.length >= DIG_MAX) return { ok: false, reason: t('No máximo {n} escavações ao mesmo tempo.', { n: DIG_MAX }) };
  if (!canAfford(s, digCost(s, dig?.stage ?? 0))) return { ok: false, reason: 'Faltam créditos, combustível ou naves.' };
  return { ok: true };
}

/** Começa a próxima etapa da escavação (a primeira abre o sítio). */
export function startDig(prev: GameState, locId: string): GameState | null {
  if (!canDig(prev, locId).ok) return null;
  const s = cloneState(prev);
  const dig = digOf(s, locId);
  const stage = dig?.stage ?? 0;
  payCost(s, digCost(prev, stage));
  const total = DIG_STAGES[stage].time;
  if (dig) { dig.remaining = total; dig.total = total; }
  else s.digs.push({ locId, stage: 0, remaining: total, total });
  return s;
}

/** Relíquia que este sítio entrega: uma das que faltam, sorteada pela semente (null = já tem todas). */
function relicFor(s: GameState, loc: Pick<Location, 'seed'>): string | null {
  const left = RELICS.filter(r => !s.relics.includes(r.id));
  return left.length ? left[Math.floor(rng(loc.seed * 31 + 3)() * left.length)].id : null;
}

/** O que um sítio rende quando todas as relíquias já foram achadas. */
const digSpoils = (s: GameState): Amounts => {
  const k = digScale(s);
  return { exotic: Math.ceil(10 * Math.sqrt(k)), science: Math.ceil(300 * k) };
};

/** Avança as escavações (dentro da simulação; muda o estado recebido). Devolve as relíquias achadas neste passo. */
export function advanceDigs(s: GameState, dt: number): string[] {
  const found: string[] = [];
  for (const d of s.digs) {
    if (d.remaining <= 0) continue;
    d.remaining -= dt;
    if (d.remaining > 0) continue;
    d.remaining = 0;
    d.stage++;
    if (d.stage < DIG_STAGES.length) continue;
    const loc = s.locations.find(l => l.id === d.locId);
    const relic = loc ? relicFor(s, loc) : null;
    if (relic) { s.relics.push(relic); found.push(relic); }
    else grant(s, digSpoils(s));
    s.dug.push(d.locId);
  }
  s.digs = s.digs.filter(d => d.stage < DIG_STAGES.length);
  return found;
}
