import type { GameState, ResId } from '../types';
import { RES_IDS } from '../data/resources';
import { BALANCE } from '../data/balance';
import { simulate } from './economy';
import { capsOf, getModifiers } from './modifiers';
import { RESOURCES } from '../data/resources';

export interface OfflineSummary {
  seconds: number;
  capped: boolean;
  gained: Partial<Record<ResId, number>>;
  discoveries: number;
  terraforms: number;          // níveis de terraformação concluídos
  crisesCleared: number;       // crises de colônia que não punem a ausência
  fullStorage: ResId[];        // materiais que ficaram com o armazém cheio (produção parada)
}

export const offlineCap = (s: GameState) => BALANCE.offlineCapSeconds + getModifiers(s).offline;

/**
 * Simula o período ausente em etapas, respeitando cadeias de produção, capacidade, população e expedições.
 * Datas no futuro (relógio alterado) contam como zero.
 */
export function applyOffline(s: GameState, now = Date.now(), steps = 400): { state: GameState; summary: OfflineSummary | null } {
  // Data inválida conta como ausência zero: um NaN aqui contaminaria o estado inteiro.
  const raw = Number.isFinite(s.savedAt) && Number.isFinite(now) ? Math.max(0, (now - s.savedAt) / 1000) : 0;
  const cap = offlineCap(s);
  const seconds = Math.min(cap, raw);
  if (seconds < 30) return { state: { ...s, savedAt: now }, summary: null };
  // Crises nunca punem a ausência: o jogador volta com as colônias em ordem.
  const crisesCleared = s.crises.length;
  let state = s.crises.length || s.contracts.some(c => c.risk) ? { ...s, crises: [], contracts: s.contracts.filter(c => !c.risk) } : s;
  let discoveries = 0, terraforms = 0;
  const dt = (seconds * BALANCE.offlineRate) / steps;      // fechado, o jogo avança bem mais devagar que aberto
  for (let i = 0; i < steps; i++) {
    const r = simulate(state, dt);
    state = r.state;
    discoveries += r.report.finishedExpeditions.length;
    terraforms += r.report.finishedTerraforms.length;
  }
  state = { ...state, crisisTimer: Math.max(state.crisisTimer, 240) };      // a primeira crise só chega depois de um tempo
  const gained: OfflineSummary['gained'] = {};
  for (const r of RES_IDS) {
    const d = state.resources[r] - s.resources[r];
    if (d > 0.5) gained[r] = d;
  }
  state = { ...state, savedAt: now };
  const caps = capsOf(state);
  const fullStorage = (Object.keys(gained) as ResId[]).filter(r => RESOURCES[r].stored && state.resources[r] >= caps[r] - 0.01);
  const hasNews = Object.keys(gained).length > 0 || discoveries > 0;
  return { state, summary: hasNews ? { seconds, capped: raw > cap, gained, discoveries, terraforms, crisesCleared, fullStorage } : null };
}
