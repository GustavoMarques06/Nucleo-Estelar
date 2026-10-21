import type { Effect, GameState } from '../types';
import { AXIS_BY_ID, DOCTRINE_AXES, DOCTRINE_BY_ID } from '../data/doctrines';
import { cloneState } from './state';

/** Eixos já liberados nesta jornada. */
const doctrineAxesOpen = (s: GameState) => DOCTRINE_AXES.filter(a => a.unlock(s));

/** Algum eixo liberado ainda sem escolha (a interface marca a aba). */
export const doctrinePending = (s: GameState) => doctrineAxesOpen(s).some(a => !s.doctrines[a.id]);

/** Escolhe a doutrina de um eixo: só uma vez por jornada (a Ascensão libera de novo). */
export function chooseDoctrine(prev: GameState, axisId: string, optionId: string): GameState | null {
  const axis = AXIS_BY_ID[axisId];
  if (!axis || !axis.unlock(prev) || prev.doctrines[axisId] || !axis.options.some(o => o.id === optionId)) return null;
  const s = cloneState(prev);
  s.doctrines[axisId] = optionId;
  return s;
}

/** Efeitos das doutrinas escolhidas. */
export function doctrineEffects(s: Pick<GameState, 'doctrines'>): Effect[] {
  return Object.values(s.doctrines).flatMap(id => DOCTRINE_BY_ID[id]?.effects ?? []);
}
