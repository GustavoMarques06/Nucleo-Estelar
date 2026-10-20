import type { GameState } from '../game/types';
import { colonyCount } from '../game/selectors';

/** Clima da música: acompanha o ponto em que a jornada atual está. */
export type MusicPhase = 'solitude' | 'industry' | 'civilization' | 'expansion' | 'empire' | 'epic' | 'beyond';

export function phaseOf(s: GameState): MusicPhase {
  if ((s.megaprojects.singularity ?? 0) >= 1 || s.transcendence.unlocked) return 'beyond';
  if (s.upgrades.megaEngineering || (s.megaprojects.dyson ?? 0) >= 1) return 'epic';
  if (s.upgrades.diplomacy || colonyCount(s) >= 5) return 'empire';
  if (s.upgrades.exploration || colonyCount(s) >= 1) return 'expansion';
  if (s.upgrades.habitats) return 'civilization';
  if (s.buildings.refinery > 0) return 'industry';
  return 'solitude';
}
