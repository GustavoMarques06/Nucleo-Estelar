import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { simulate } from './economy';
import { advise } from './advisor';

const run = (s: ReturnType<typeof newGame>) => {
  const { report } = simulate(s, 1);
  return advise(s, report, {});
};

describe('conselheiro: ações de correção', () => {
  it('sem mineradora, o remédio é construir a primeira', () => {
    expect(run(newGame(0)).action).toEqual({ build: 'miner' });
  });
  it('falta de energia aponta um gerador', () => {
    const s = newGame(0);
    Object.assign(s.buildings, { solar: 1, miner: 6, refinery: 6 });
    const a = run(s);
    expect(a.limiting.severity).toBe('bad');
    expect(a.action).toEqual({ build: 'solar' });
  });
  it('contrato pronto leva à aba Comércio', () => {
    const s = newGame(0);
    s.buildings.miner = 3; s.buildings.solar = 3;
    s.contracts = [{ id: 'c1', res: 'iron', amount: 1, reward: 10, remaining: 100, total: 100 } as never];
    s.resources.iron = 5;
    expect(run(s).action).toEqual({ tab: 'commerce' });
  });
});
