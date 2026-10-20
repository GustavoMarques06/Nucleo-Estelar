import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { MIN_EXPEDITION_SECONDS, advanceExpeditions, expeditionTime, uniqueName } from './expansion';
import { getModifiers } from './modifiers';
import { unitCost } from './costs';
import { fmt } from './format';
import { advise } from './advisor';
import { simulate } from './economy';
import { BUILDING_BY_ID } from '../data/buildings';

describe('correções do fim de jogo', () => {
  it('expedições nunca são instantâneas, por maior que seja a velocidade', () => {
    const s = newGame(0);
    s.upgrades.exploration = true;
    s.buildings.comms = 500;                                      // velocidade absurda
    const m = getModifiers(s);
    expect(m.expeditionSpeed).toBeGreaterThan(50);
    expect(expeditionTime(s, m)).toBeGreaterThanOrEqual(MIN_EXPEDITION_SECONDS);
    s.expeditions = [{ id: 'e1', seed: 7, remaining: 100, total: 100 }];
    expect(advanceExpeditions(s, m, MIN_EXPEDITION_SECONDS / 2)).toEqual([]);            // na metade do mínimo, ainda viajando
    expect(advanceExpeditions(s, m, MIN_EXPEDITION_SECONDS)).toHaveLength(1);            // no mínimo, chega
  });

  it('locais novos não repetem o nome de um local conhecido', () => {
    expect(uniqueName(['Kepler Menor'], 'Vega II')).toBe('Vega II');
    expect(uniqueName(['Kepler Menor'], 'Kepler Menor')).toBe('Kepler Menor II');
    expect(uniqueName(['Kepler Menor', 'Kepler Menor II'], 'Kepler Menor')).toBe('Kepler Menor III');
    const many = ['X', ...['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].map(r => `X ${r}`)];
    expect(uniqueName(many, 'X')).toBe('X 11');
  });

  it('custos de milhares de unidades continuam finitos', () => {
    const c = unitCost(BUILDING_BY_ID.hydroponics, 10_000);
    for (const v of Object.values(c)) expect(Number.isFinite(v)).toBe(true);
  });

  it('números grandes usam sufixos até decilhão, depois notação científica', () => {
    expect(fmt(2.5e15)).toBe('2,5 quatri');
    expect(fmt(6.76e21)).toBe('6,7 sext');
    expect(fmt(1e33)).toBe('1 dec');
    expect(fmt(5e40)).toContain('e+40');
  });

  it('no fim do jogo, armazém pequeno demais aponta a Compressão de carga', () => {
    const s = newGame(0);
    s.upgrades.automation = true;
    s.buildings.storage = 60; s.buildings.miner = 5; s.buildings.solar = 20;
    s.upgrades.energyStorage = true; s.buildings.battery = 80;   // sem trabalhadores nem energia: só o custo pesa
    const a = advise(s, simulate(s, 1).report, {});
    expect(a.action).toEqual({ tab: 'research' });
  });
});
