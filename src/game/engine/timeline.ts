import type { GameState, JourneyRecord, TimelineState } from '../types';
import { PAST_MAX, SAMPLE_EVERY, SAMPLE_MAX, TIMELINE_MARKS } from '../data/timeline';
import { cloneState } from './state';

/** Valor guardado na curva: log10 dos créditos ganhos (cabe numa linha só, de 10 a 10¹⁵). */
export const sampleOf = (earned: number) => Math.round(Math.log10(1 + Math.max(0, earned)) * 1000) / 1000;

/** Registra os marcos que acabaram de chegar e as amostras da curva que já venceram. Devolve o mesmo estado se nada mudou. */
export function recordTimeline(prev: GameState): GameState {
  const tl = prev.timeline;
  const fresh = TIMELINE_MARKS.filter(m => tl.marks[m.id] === undefined && m.when(prev));
  const due = Math.min(SAMPLE_MAX, Math.floor(prev.stats.playTime / SAMPLE_EVERY) + 1) - tl.samples.length;
  if (!fresh.length && due <= 0) return prev;
  const s = cloneState(prev);
  const at = Math.round(prev.stats.playTime);
  for (const m of fresh) s.timeline.marks[m.id] = at;
  // Uma volta longa (offline) pode vencer várias amostras de uma vez: todas recebem o valor de agora.
  for (let i = 0; i < due; i++) s.timeline.samples.push(sampleOf(prev.stats.earned));
  return s;
}

/** Fecha a jornada atual na linha do tempo (Ascensão ou Transcendência) e começa uma nova. */
export function archiveJourney(prev: GameState): TimelineState {
  const done = recordTimeline(prev);
  const rec: JourneyRecord = {
    n: prev.ascension.count + prev.transcendence.count + 1,
    time: Math.round(prev.stats.playTime),
    earned: prev.stats.earned,
    marks: { ...done.timeline.marks },
    samples: [...done.timeline.samples, sampleOf(prev.stats.earned)].slice(0, SAMPLE_MAX + 1),
  };
  return { marks: {}, samples: [], past: [...prev.timeline.past.map(j => ({ ...j, marks: { ...j.marks }, samples: [...j.samples] })), rec].slice(-PAST_MAX) };
}

/** Melhor tempo já registrado para um marco nas jornadas anteriores (−1 = sem registro, de um save antigo). */
export const bestMark = (tl: TimelineState, id: string): number | null => {
  const xs = tl.past.map(j => j.marks[id]).filter((x): x is number => x !== undefined && x >= 0);
  return xs.length ? Math.min(...xs) : null;
};
