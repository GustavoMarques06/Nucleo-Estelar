import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { mineClick, simulate } from './economy';
import { getModifiers } from './modifiers';
import { activeMix, activeVein, autoDeposit, availableKinds, canProspect, extractionRate, prospect, prospectCost, setAutoDeposit, setFocus, veinScore } from './deposit';
import { parseSave, serialize } from './save';
import { VEIN_KINDS } from '../data/deposit';
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID } from '../data/buildings';

const mining = (): GameState => {
  const s = newGame(0);
  Object.assign(s.buildings, { miner: 10, solar: 10, storage: 30 });
  s.upgrades.geology = true;
  s.resources.credits = 1e6;
  return s;
};

describe('prospecção', () => {
  it('exige Geologia, custa créditos proporcionais ao ritmo e limita os veios ativos', () => {
    const s = mining();
    delete s.upgrades.geology;
    expect(canProspect(s).ok).toBe(false);
    s.upgrades.geology = true;
    expect(canProspect(s).ok).toBe(true);
    const small = prospectCost(s).credits!;
    s.buildings.miner = 100;
    expect(prospectCost(s).credits!).toBeGreaterThan(small * 5);
    let t = s;
    for (let i = 0; i < BALANCE.veinMaxActive; i++) t = prospect(t)!;
    expect(prospect(t)).toBeNull();
    expect(canProspect(t).reason).toMatch(/veios/);
    s.resources.credits = 0;
    expect(prospect(s)).toBeNull();
  });

  it('o veio nasce com reserva de ~15 min de extração, entra em foco e registra o mineral', () => {
    const s = mining();
    const rate = extractionRate(s);
    const t = prospect(s)!;
    const v = t.deposit.veins[0];
    expect(v.reserve).toBeGreaterThan(rate * BALANCE.veinSeconds * 0.5);
    expect(v.reserve).toBeLessThan(rate * BALANCE.veinSeconds * 2.5);
    expect(t.deposit.focus).toBe(v.id);
    expect(t.deposit.found).toBe(1);
    expect(t.resources.credits).toBe(1e6 - prospectCost(s).credits!);
    expect(Object.values(v.mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it('tipos de veio são liberados por pesquisa e pela quantidade já descoberta', () => {
    const s = mining();
    const ids = () => availableKinds(s).map(k => k.id);
    expect(ids()).toEqual(['ferrous', 'cuprous']);
    s.deposit.found = 2;
    expect(ids()).toContain('auriferous');
    expect(ids()).not.toContain('titanic');
    expect(ids()).not.toContain('unstable');                       // o instável só depois de 3 veios
    s.deposit.found = 3;
    expect(ids()).toContain('unstable');
    s.upgrades.deepProspecting = true;
    expect(ids()).toContain('titanic');
    expect(ids()).not.toContain('deep');                           // o profundo exige Perfuração profunda
    s.upgrades.crystallography = true; s.upgrades.deepDrilling = true; s.deposit.found = 6;
    expect(ids()).toEqual(VEIN_KINDS.map(k => k.id));
  });

  it('o sorteio é determinístico pela semente', () => {
    const a = prospect({ ...mining(), nextSeed: 77 })!, b = prospect({ ...mining(), nextSeed: 77 })!;
    expect(a.deposit.veins[0]).toEqual(b.deposit.veins[0]);
  });
});

describe('extração por veio', () => {
  it('veio em foco rende mais que a crosta e esgota; depois a extração volta à crosta', () => {
    let s = mining();
    const crust = simulate(s, 10).state.stats.totalMined;
    s = prospect(s)!;
    s.deposit.veins[0].reserve = 40; s.deposit.veins[0].total = 40;
    s.deposit.veins[0].yield = 1.5;
    const first = simulate(s, 10).state;
    expect(first.stats.totalMined).toBeGreaterThan(crust * 0.99);
    expect(first.deposit.veins[0].reserve).toBe(0);
    expect(first.deposit.focus).toBe('crust');
    expect(first.stats.totalMined).toBeLessThanOrEqual(40 * 1.0001 + crust);   // nunca tira mais do que havia
    const later = simulate(first, 10).state;
    expect(later.stats.totalMined - first.stats.totalMined).toBeCloseTo(crust, 4);
  });

  it('a composição do veio muda o que entra no armazém; veios de titânio dão titânio', () => {
    let s = mining();
    s.upgrades.deepProspecting = true;
    s = prospect({ ...s, nextSeed: 1 })!;
    s.deposit.veins[0] = { ...s.deposit.veins[0], kind: 'titanic', mix: { titanium: 0.5, iron: 0.5 }, yield: 1.3, reserve: 1e6, total: 1e6 };
    s.deposit.focus = s.deposit.veins[0].id;
    const t = simulate(s, 20).state;
    expect(t.resources.titanium).toBeGreaterThan(0);
    expect(t.resources.copper).toBe(0);
    expect(activeMix(s, getModifiers(s)).shares.titanium).toBeCloseTo(0.5);
  });

  it('o clique também usa e esgota o veio', () => {
    let s = mining();
    s = prospect(s)!;
    s.deposit.veins[0].reserve = 1.2; s.deposit.veins[0].yield = 2;
    const r = mineClick(s, 1);
    expect(Object.values(r.gained).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(r.state.deposit.veins[0].reserve).toBeLessThan(1.2);
    const again = mineClick(mineClick(r.state, 1).state, 1).state;
    expect(again.deposit.veins[0].reserve).toBe(0);
    expect(activeVein(again)).toBeNull();
  });

  it('armazém cheio não gasta a reserva do veio', () => {
    let s = mining();
    s = prospect(s)!;
    const v = s.deposit.veins[0];
    v.reserve = v.total = 5000;
    for (const r of ['iron', 'copper', 'gold', 'titanium', 'crystals'] as const) s.resources[r] = 1e9;
    const t = simulate(s, 10).state;
    expect(t.deposit.veins[0].reserve).toBeCloseTo(5000, 3);
  });

  it('escolher o foco: só veios com reserva ou a crosta', () => {
    const s = prospect(mining())!;
    expect(setFocus(s, s.deposit.veins[0].id)).toBeNull();                   // já está em foco
    const c = setFocus(s, 'crust')!;
    expect(c.deposit.focus).toBe('crust');
    expect(setFocus(c, 'nada')).toBeNull();
    c.deposit.veins[0].reserve = 0;
    expect(setFocus(c, c.deposit.veins[0].id)).toBeNull();
  });
});

describe('sondas autônomas', () => {
  it('só ligam com a pesquisa; escolhem o melhor veio e prospectam quando acaba', () => {
    let s = mining();
    expect(setAutoDeposit(s, true)).toBeNull();
    s.upgrades.autoProspect = true;
    s = setAutoDeposit(s, true)!;
    const t = simulate(s, 2).state;
    expect(t.deposit.veins.length).toBe(1);                                  // prospectou sozinha
    expect(activeVein(t)).not.toBeNull();
    // Dois veios: foca o de maior valor
    const v = prospect(prospect(mining())!)!;
    v.upgrades.autoProspect = true; v.deposit.auto = true;
    v.deposit.focus = 'crust';
    const best = [...v.deposit.veins].sort((a, b) => veinScore(b) - veinScore(a))[0];
    autoDeposit(v);
    expect(v.deposit.focus).toBe(best.id);
  });
});

describe('titânio, cristais e estruturas novas', () => {
  it('a forja converte ferro e titânio em muita liga; a matriz converte cristais em ciência', () => {
    const f = newGame(0);
    Object.assign(f.buildings, { titaniumForge: 2, solar: 100, storage: 20, habitat: 50 });
    f.resources.population = 100;
    Object.assign(f.resources, { iron: 5000, titanium: 5000 });
    const a = simulate(f, 10).state;
    expect(a.resources.alloys).toBeGreaterThan(200);
    expect(a.resources.titanium).toBeLessThan(5000);
    const g = newGame(0);
    Object.assign(g.buildings, { crystalArray: 2, solar: 100, storage: 20, habitat: 50 });
    g.resources.population = 100; g.resources.crystals = 5000;
    const b = simulate(g, 10).state;
    expect(b.resources.science).toBeGreaterThan(500);
  });

  it('a perfuratriz profunda extrai muito mais que o britador', () => {
    expect(BUILDING_BY_ID.deepDrill.extract!).toBeGreaterThan(BUILDING_BY_ID.crusher.extract! * 2);
  });
});

describe('salvamento v10', () => {
  it('guarda veios, foco, automação e contagem; dados inválidos são descartados', () => {
    let s = mining();
    s.upgrades.autoProspect = true;
    s = prospect(prospect(s)!)!;
    s.deposit.auto = true;
    const back = parseSave(serialize(s))!;
    expect(back.deposit).toEqual(s.deposit);
    const raw = JSON.parse(serialize(s));
    raw.deposit.veins.push({ id: 'x', kind: 'nao-existe', name: 'x', mix: { iron: 1 }, yield: 1, reserve: 5, total: 5 });
    raw.deposit.veins.push({ id: 'y', kind: 'ferrous', name: 'y', mix: {}, yield: 1, reserve: 5, total: 5 });
    raw.deposit.focus = 'fantasma';
    const clean = parseSave(JSON.stringify(raw))!;
    expect(clean.deposit.veins).toHaveLength(2);
    expect(clean.deposit.focus).toBe('crust');
  });

  it('um save antigo abre com a jazida vazia, focada na crosta', () => {
    const raw = JSON.parse(serialize(newGame(0)));
    raw.version = 9; delete raw.deposit;
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.deposit).toEqual({ veins: [], focus: 'crust', auto: false, found: 0 });
  });
});
