import type { GameState } from '../types';
import { CHALLENGE_BY_ID, type Block, type ChallengeDef } from '../data/challenges';

export const challengesUnlocked = (s: GameState) => s.ascension.count >= 1 || s.challenges.done.length > 0;

export const activeChallenge = (s: Pick<GameState, 'challenges'>): ChallengeDef | null =>
  (s.challenges.active && CHALLENGE_BY_ID[s.challenges.active]) || null;

/** Uma mecânica está bloqueada pelo desafio ativo? */
export const challengeBlocks = (s: Pick<GameState, 'challenges'>, what: Block) => activeChallenge(s)?.block === what;

/** Segundos que ainda restam no prazo do desafio ativo (null = sem prazo). */
export function deadlineLeft(s: GameState): number | null {
  const c = activeChallenge(s);
  return c?.deadline ? Math.max(0, c.deadline - s.stats.playTime) : null;
}

/** O desafio ativo foi cumprido agora (a Ascensão chegou dentro das regras)? */
export function challengeMet(s: GameState): boolean {
  const c = activeChallenge(s);
  if (!c) return false;
  return !c.deadline || s.stats.playTime <= c.deadline;
}
