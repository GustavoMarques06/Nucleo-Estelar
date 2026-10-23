import { describe, expect, it } from 'vitest';
import { ABSENCE_SECONDS, useGame } from './store';
import { newGame } from './engine/state';
import { simulate } from './engine/economy';
import type { GameState } from './types';

/** Base que produz créditos sozinha, com armazém de sobra. */
const producing = (): GameState => {
  const s = newGame(0);
  Object.assign(s.buildings, { miner: 20, fission: 4, storage: 40 });
  s.savedAt = Date.now();
  return simulate(s, 1).state;
};
const minedAfter = (dt: number) => {
  useGame.setState({ game: producing(), offline: null });
  const before = useGame.getState().game.stats.totalMined;
  useGame.getState().advance(dt);
  return { mined: useGame.getState().game.stats.totalMined - before, offline: useGame.getState().offline };
};

describe('jogo aberto em duas abas', () => {
  it('a aba que perde a vez grava uma última vez e depois não salva nem simula; a outra carrega esse progresso', () => {
    const data = new Map<string, string>();
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
    try {
      const s = producing();
      s.resources.credits = 777;
      useGame.setState({ game: s, inactive: false });
      useGame.getState().setInactive(true);                       // outra aba pediu a vez
      const saved = data.get('nucleo-estelar/save');
      expect(saved).toBeTruthy();
      useGame.getState().advance(1);
      expect(useGame.getState().game).toBe(s);                    // não simulou
      useGame.setState({ game: { ...s, resources: { ...s.resources, credits: 1 } } });
      expect(useGame.getState().save()).toBe(false);              // não grava por cima
      expect(data.get('nucleo-estelar/save')).toBe(saved);
      useGame.getState().reloadFromSave();                        // a aba que assume carrega o que foi gravado
      useGame.getState().setInactive(false);
      expect(useGame.getState().game.resources.credits).toBeCloseTo(777, 0);
    } finally {
      delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
      useGame.setState({ inactive: false });
    }
  });
});

describe('pausa longa com o jogo aberto (computador suspenso)', () => {
  it('conta como ausência: ritmo reduzido do jogo fechado e tela de boas-vindas', () => {
    const hour = 3600;
    const open = minedAfter(60).mined / 60;                  // ritmo normal por segundo
    const away = minedAfter(hour);
    expect(away.offline).not.toBeNull();
    expect(away.mined).toBeLessThan(open * hour * 0.1);      // muito abaixo do ritmo aberto
    expect(away.mined).toBeGreaterThan(0);
  });

  it('aba em segundo plano (um tique por minuto) segue como jogo aberto', () => {
    const r = minedAfter(ABSENCE_SECONDS - 1);
    expect(r.offline).toBeNull();
    const open = minedAfter(1).mined;
    expect(r.mined).toBeGreaterThan(open * (ABSENCE_SECONDS - 1) * 0.5);
  });
});
