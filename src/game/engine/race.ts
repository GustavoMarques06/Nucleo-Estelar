import type { Amounts, GameState } from '../types';
import { RACE_DELAY, RACE_DELAY_MAX, RACE_DELAY_RELATION, RACE_TIME, RACE_WIN_INFLUENCE } from '../data/race';
import { FACTIONS } from '../data/factions';
import { diplomacyUnlocked } from './factions';
import { canAfford, payCost } from './costs';
import { cloneState } from './state';
import { grant } from './stock';

// Corrida pelo Portal estelar: quando os megaprojetos são liberados, a facção com quem a relação é mais fria começa
// o próprio portal. Terminar o seu primeiro dá um bônus; perder só encarece as expedições (nada é destruído).

const raceEligible = (s: GameState) => !!s.upgrades.megaEngineering && diplomacyUnlocked(s);

/** A facção mais fria com o jogador (a primeira da lista, no empate). */
export const rivalFor = (s: GameState) => FACTIONS.reduce((a, f) => ((s.factions[f.id]?.relation ?? 0) < (s.factions[a.id]?.relation ?? 0) ? f : a), FACTIONS[0]).id;

export const delayCost = (s: GameState): Amounts => ({ influence: 150 * (1 + (s.race?.delays ?? 0)) });

export function canDelayRival(s: GameState): { ok: boolean; reason?: string } {
  const r = s.race;
  if (!r || r.result) return { ok: false };
  if (r.delays >= RACE_DELAY_MAX) return { ok: false, reason: 'A rival já está atenta: não dá para atrasar mais.' };
  if (!canAfford(s, delayCost(s))) return { ok: false, reason: 'Falta influência.' };
  return { ok: true };
}

/** Campanha de atraso: a influência compra tempo, mas a rival percebe. */
export function delayRival(prev: GameState): GameState | null {
  if (!canDelayRival(prev).ok) return null;
  const s = cloneState(prev);
  payCost(s, delayCost(prev));
  const r = s.race!;
  r.progress = Math.max(0, r.progress - RACE_DELAY);
  r.delays++;
  const f = s.factions[r.faction];
  if (f) f.relation = Math.max(0, f.relation - RACE_DELAY_RELATION);
  return s;
}

/** Começa, avança e encerra a corrida (dentro da simulação; muda o estado recebido). Devolve o resultado se acabou agora. */
export function advanceRace(s: GameState, dt: number): 'won' | 'lost' | null {
  if (!s.race) {
    if (!raceEligible(s) || (s.megaprojects.gate ?? 0) >= 1) return null;
    s.race = { faction: rivalFor(s), progress: 0, result: null, delays: 0 };
  }
  const r = s.race;
  if (r.result) return null;
  if ((s.megaprojects.gate ?? 0) >= 1) {
    r.result = 'won';
    grant(s, { influence: RACE_WIN_INFLUENCE });
    return 'won';
  }
  if (!raceEligible(s)) return null;
  r.progress = Math.min(1, r.progress + dt / RACE_TIME);
  if (r.progress >= 1) { r.result = 'lost'; return 'lost'; }
  return null;
}
