import type { Effect, GameState } from '../types';
import { CREW, CREW_BY_ID, CREW_MAX_LEVEL, crewXpFor } from '../data/crew';
import { cloneState } from './state';

/** Nível de um conselheiro com `xp` segundos na ativa. */
export function crewLevel(xp: number): number {
  let l = 0;
  while (l < CREW_MAX_LEVEL && xp >= crewXpFor(l + 1)) l++;
  return l;
}

/** Conselheiros que já chegaram à base (a transmissão deles está no Arquivo). */
export const crewAvailable = (s: GameState) => CREW.filter(c => s.story.includes(c.joins));
/** Vagas no conselho: duas; a partir da primeira Ascensão, três. */
export const crewSeats = (s: GameState) => (s.ascension.count >= 1 || s.transcendence.count >= 1 ? 3 : 2);

/** Põe na ativa ou tira (só quem já chegou, e só se houver vaga). */
export function toggleCrew(prev: GameState, id: string): GameState | null {
  const def = CREW_BY_ID[id];
  if (!def || !prev.story.includes(def.joins)) return null;
  const on = prev.crew.active.includes(id);
  if (!on && prev.crew.active.length >= crewSeats(prev)) return null;
  const s = cloneState(prev);
  s.crew.active = on ? s.crew.active.filter(x => x !== id) : [...s.crew.active, id];
  return s;
}

/** Quem está na ativa ganha experiência (dentro da simulação; muda o estado recebido). */
export function advanceCrew(s: GameState, dt: number) {
  const cap = crewXpFor(CREW_MAX_LEVEL);
  for (const id of s.crew.active) s.crew.xp[id] = Math.min(cap, (s.crew.xp[id] ?? 0) + dt);
}

/** Bônus dos conselheiros na ativa. */
export function crewEffects(s: Pick<GameState, 'crew'>): Effect[] {
  return s.crew.active.flatMap(id => {
    const def = CREW_BY_ID[id];
    const l = crewLevel(s.crew.xp[id] ?? 0);
    return def && l > 0 ? def.effects(l) : [];
  });
}
