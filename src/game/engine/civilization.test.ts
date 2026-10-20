import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { simulate } from './economy';
import { ascend } from './progression';
import { parseSave, serialize } from './save';
import { ERAS, civBonus, currentEra, eraIndex, eraProgress, nextEra, wellbeing } from './civilization';
import { getModifiers } from './modifiers';

const withPop = (n: number) => { const s = newGame(0); s.resources.population = n; return s; };

describe('eras da civilização', () => {
  it('a era acompanha a população, em ordem crescente', () => {
    expect(eraIndex(withPop(0))).toBe(0);
    expect(currentEra(withPop(0))).toBeNull();
    expect(eraIndex(withPop(1))).toBe(1);
    expect(eraIndex(withPop(24))).toBe(1);
    expect(eraIndex(withPop(25))).toBe(2);
    expect(eraIndex(withPop(2500))).toBe(4);
    expect(currentEra(withPop(25000))?.id).toBe('arcology');
    const ats = ERAS.map(e => e.at);
    expect([...ats].sort((a, b) => a - b)).toEqual(ats);
  });

  it('a última era pede ter transcendido, mesmo com a população', () => {
    const s = withPop(1e9);
    expect(currentEra(s)?.id).toBe('ecumene');
    expect(nextEra(s)?.id).toBe('stellar');
    s.transcendence.count = 1;
    expect(currentEra(s)?.id).toBe('stellar');
    expect(nextEra(s)).toBeNull();
    expect(eraProgress(s)).toBe(1);
  });

  it('o progresso vai de 0 a 1 entre duas eras', () => {
    expect(eraProgress(withPop(25))).toBeCloseTo(0);
    expect(eraProgress(withPop(137.5))).toBeCloseTo(0.5);
    expect(eraProgress(withPop(249))).toBeLessThan(1);
  });

  it('era e legado aumentam impostos e crescimento (mais legado, mais bônus)', () => {
    const none = civBonus(withPop(0));
    expect(none).toEqual({ tax: 1, growth: 1 });
    const camp = civBonus(withPop(1)), town = civBonus(withPop(250));
    expect(town.tax).toBeGreaterThan(camp.tax);
    const legacy = withPop(0); legacy.civ.best = 4;
    expect(civBonus(legacy).tax).toBeGreaterThan(none.tax);
    expect(getModifiers(legacy).tax).toBeGreaterThan(getModifiers(withPop(0)).tax);
    expect(getModifiers(legacy).popGrowth).toBeGreaterThan(getModifiers(withPop(0)).popGrowth);
  });
});

describe('legado: a civilização atravessa as jornadas', () => {
  it('a simulação registra a melhor era alcançada', () => {
    const s = withPop(300);
    s.buildings.habitat = 40;                           // moradia para a população não cair
    s.resources.food = 1e6;
    const after = simulate(s, 1).state;
    expect(after.civ.best).toBe(3);
  });

  it('a Ascensão guarda a melhor era; o resto da população recomeça', () => {
    const s = withPop(3000);
    s.civ.best = 2;
    s.upgrades.ascensionProject = true;
    s.stats.earned = 1e12;
    const asc = ascend(s, 0)!;
    expect(asc.civ.best).toBe(4);                       // a era atual (Metrópole) virou legado
    expect(asc.resources.population).toBeLessThan(10);
  });

  it('o legado sobrevive ao salvamento e valores inválidos são ignorados', () => {
    const s = newGame(0); s.civ.best = 5;
    expect(parseSave(serialize(s))!.civ.best).toBe(5);
    const raw = JSON.parse(serialize(s)); raw.civ = { best: 999 };
    expect(parseSave(JSON.stringify(raw))!.civ.best).toBe(ERAS.length);
    raw.civ = { best: -3 }; expect(parseSave(JSON.stringify(raw))!.civ.best).toBe(0);
    delete raw.civ; expect(parseSave(JSON.stringify(raw))!.civ.best).toBe(0);
  });
});

describe('bem-estar', () => {
  const ok = { foodNeed: 10, cap: 100, workRatio: 1, energyRatio: 1, healthUnlocked: true };

  it('tudo em dia dá 100% e fator 1,1; tudo em falta dá fator 0,9', () => {
    const s = withPop(50); s.resources.food = 1e6; s.buildings.hospital = 1;
    const best = wellbeing(s, ok);
    expect(best.score).toBeCloseTo(1);
    expect(best.factor).toBeCloseTo(1.1);
    const bad = wellbeing(withPop(50), { foodNeed: 10, cap: 0, workRatio: 0, energyRatio: 0, healthUnlocked: true });
    expect(bad.score).toBeCloseTo(0);
    expect(bad.factor).toBeCloseTo(0.9);
  });

  it('cada medida reage ao seu problema', () => {
    const s = withPop(1000); s.resources.food = 1e6; s.buildings.hospital = 1;
    const part = (id: string, inputs = ok) => wellbeing(s, inputs).parts.find(p => p.id === id)!.value;
    expect(part('housing', { ...ok, cap: 500 })).toBeCloseTo(0.5);
    expect(part('health')).toBeCloseTo(0.5);               // 1 centro médico para 1000 pessoas
    expect(part('work', { ...ok, workRatio: 0.3 })).toBeCloseTo(0.3);
    expect(part('energy', { ...ok, energyRatio: 0.8 })).toBeCloseTo(0.8);
    s.resources.food = 100;
    expect(part('food')).toBeCloseTo(100 / 600);          // 1 minuto de reserva = 600
    expect(wellbeing(s, { ...ok, healthUnlocked: false }).parts.find(p => p.id === 'health')!.value).toBe(1);
  });
});
