import { describe, expect, it } from 'vitest';
import type { GameState, Vein } from '../types';
import { newGame } from './state';
import { goldenStrike, mineClick, simulate, strikeAmount } from './economy';
import { batteryCap, capFor, energyBalance, getModifiers, storageCap } from './modifiers';
import { dayFactor, isDay, nextTurn } from './daylight';
import { overclockPhase, overclockReactor, setPriority, setThrottle } from './energy';
import { autoDeposit, crustMix, layerIndex } from './deposit';
import { parseSave, serialize } from './save';
import { applyOffline } from './offline';
import { BALANCE } from '../data/balance';
import { LAYERS } from '../data/layers';
import { milestoneLevel, nextMilestone, prevMilestone } from '../data/milestones';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };
const mined = (a: GameState, b: GameState) => b.stats.totalMined - a.stats.totalMined;
/** Base com energia e armazém de sobra, para medir só o que interessa. */
const base = () => { const s = newGame(0); s.buildings.fission = 3; s.buildings.storage = 30; return s; };

describe('marcos de quantidade', () => {
  it('10, 25, 50, 100… e depois de 500 um a cada 100', () => {
    expect([0, 9, 10, 24, 25, 49, 50, 100, 150, 200, 300, 499, 500, 599, 600].map(milestoneLevel)).toEqual([0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10]);
    expect([0, 9, 10, 25, 499, 500, 650].map(nextMilestone)).toEqual([10, 10, 25, 50, 500, 600, 700]);
    expect([0, 9, 10, 30, 500, 650].map(prevMilestone)).toEqual([0, 0, 10, 25, 500, 600]);
  });

  it('cada marco multiplica a extração por unidade', () => {
    const per = (n: number) => { const s = base(); s.buildings.miner = n; return mined(s, simulate(s, 1).state) / n; };
    expect(per(10) / per(9)).toBeCloseTo(BALANCE.milestoneMult, 5);
    expect(per(25) / per(9)).toBeCloseTo(BALANCE.milestoneMult ** 2, 5);
  });

  it('armazéns não têm marcos; 100 mineradoras liberam o bônus especial', () => {
    const s = newGame(0);
    s.buildings.storage = 9; const c9 = storageCap(s);
    s.buildings.storage = 10; const c10 = storageCap(s);
    expect(c10 - c9).toBeLessThan(c9);                      // só a unidade nova, sem multiplicar tudo
    s.buildings.miner = 99; const click99 = getModifiers(s).click;
    s.buildings.miner = 100;
    expect(getModifiers(s).click).toBeCloseTo(click99 * 5);
  });

  it('energia, moradia e carga de bateria também sobem com os marcos', () => {
    const s = newGame(0);
    s.buildings.battery = 9; const b9 = batteryCap(s) / 9;
    s.buildings.battery = 10;
    expect(batteryCap(s) / 10).toBeCloseTo(b9 * BALANCE.milestoneMult);
    s.buildings.fission = 10;
    expect(getModifiers(s).energyOut.fission).toBeCloseTo(BALANCE.milestoneMult);
  });
});

describe('camadas do asteroide', () => {
  it('avançam com o minério extraído, mas só com a broca exigida', () => {
    const s = newGame(0);
    expect(layerIndex(s)).toBe(0);
    s.stats.totalMined = LAYERS[1].minMined;
    expect(layerIndex(s)).toBe(1);
    s.stats.totalMined = LAYERS[3].minMined;
    expect(layerIndex(s)).toBe(1);                          // o Manto metálico exige um Britador
    s.buildings.crusher = 1;
    expect(layerIndex(s)).toBe(3);
    s.stats.totalMined = 1e12;
    expect(layerIndex(s)).toBe(3);                          // o Núcleo externo exige a Perfuratriz
    s.buildings.deepDrill = 1;
    expect(layerIndex(s)).toBe(LAYERS.length - 1);
  });

  it('a crosta funda rende mais e só mostra titânio depois da pesquisa', () => {
    const s = newGame(0);
    s.buildings.miner = 5; s.buildings.solar = 4; s.buildings.storage = 20;
    const shallow = mined(s, simulate(s, 1).state);
    s.stats.totalMined = LAYERS[3].minMined; s.buildings.crusher = 1;
    expect(crustMix(s).titanium).toBeUndefined();
    research(s, 'deepProspecting');
    expect(crustMix(s).titanium).toBeGreaterThan(0);
    s.buildings.crusher = 0;
    s.stats.totalMined = LAYERS[1].minMined;
    const deeper = mined(s, simulate(s, 1).state);
    expect(deeper / shallow).toBeCloseTo(LAYERS[1].yield, 4);
  });
});

describe('veios com personalidade', () => {
  const deepVein = (): Vein => ({ id: 'v-9', kind: 'deep', name: 'Veio profundo 1', mix: { titanium: 0.3, gold: 0.15, iron: 0.4, copper: 0.15 }, yield: 2.5, reserve: 5000, total: 5000 });

  it('o veio profundo só serve à Perfuratriz: mineradoras e cliques continuam na crosta', () => {
    let s = base();
    s.buildings.miner = 5;
    s.deposit.veins = [deepVein()]; s.deposit.focus = 'v-9';
    let next = simulate(s, 1).state;
    expect(next.deposit.veins[0].reserve).toBe(5000);
    expect(next.resources.titanium).toBe(0);
    expect(mineClick(s, 1).state.deposit.veins[0].reserve).toBe(5000);
    s.buildings.deepDrill = 1; s.resources.population = 10;
    next = simulate(s, 1).state;
    expect(next.deposit.veins[0].reserve).toBeLessThan(5000);
    expect(next.resources.titanium).toBeGreaterThan(0);
    s = next;
  });

  it('as sondas autônomas ignoram um veio que nada alcança', () => {
    const s = research(base(), 'geology', 'autoProspect');
    s.deposit.auto = true;
    s.deposit.veins = [deepVein(), { id: 'v-2', kind: 'ferrous', name: 'Veio ferroso 1', mix: { iron: 0.82, copper: 0.18 }, yield: 1.5, reserve: 100, total: 100 }];
    s.deposit.focus = 'v-9';
    autoDeposit(s);
    expect(s.deposit.focus).toBe('v-2');
  });

  it('o veio instável desmorona em cerca de 3 minutos', () => {
    let s = base();
    s.buildings.miner = 20; s.buildings.storage = 40;
    const rate = 20 * BALANCE.milestoneMult;                // extração nominal (20 mineradoras = 1 marco)
    s.deposit.veins = [{ id: 'v-5', kind: 'unstable', name: 'Veio instável 1', mix: { iron: 0.55, copper: 0.35, gold: 0.1 }, yield: 3, reserve: rate * BALANCE.veinSeconds * 0.6, total: rate * BALANCE.veinSeconds * 0.6 }];
    s.deposit.focus = 'v-5';
    let t = 0;
    while (s.deposit.veins[0].reserve > 0 && t < 600) { s = simulate(s, 1).state; t++; }
    expect(t).toBeGreaterThan(160);
    expect(t).toBeLessThan(200);
  });
});

describe('pontos brilhantes', () => {
  it('rendem o maior entre 20 cliques e 15 s de extração, respeitando o armazém', () => {
    const s = newGame(0);
    expect(strikeAmount(s)).toBeCloseTo(BALANCE.strikeClicks);
    s.buildings.miner = 10;
    expect(strikeAmount(s)).toBeCloseTo(10 * BALANCE.milestoneMult * BALANCE.strikeSeconds);
    const r = goldenStrike(s);
    expect(r.state.resources.iron).toBeLessThanOrEqual(capFor(s, 'iron'));
    s.buildings.storage = 20;
    const total = Object.values(goldenStrike(s).gained).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeCloseTo(strikeAmount(s), 5);
  });
});

describe('energia: dia, noite e baterias', () => {
  it('o fator solar vai de 70% a 130% e a média de uma volta é 100%, em passos curtos ou longos', () => {
    const P = BALANCE.dayPeriod;
    expect(dayFactor(P / 4)).toBeCloseTo(1 + BALANCE.dayAmplitude);
    expect(dayFactor((3 * P) / 4)).toBeCloseTo(1 - BALANCE.dayAmplitude);
    expect(dayFactor(123, P)).toBeCloseTo(1, 9);
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += dayFactor(i * P / 10, P / 10) * (P / 10);
    expect(sum / P).toBeCloseTo(dayFactor(0, P), 9);
    expect(isDay(P / 4)).toBe(true);
    expect(isDay((3 * P) / 4)).toBe(false);
    expect(nextTurn(P / 4)).toBeCloseTo(P / 4);
  });

  it('só os painéis solares sentem a noite', () => {
    const s = newGame(0);
    s.buildings.solar = 9; s.buildings.orbitalCollector = 1;   // 9: abaixo do primeiro marco
    s.stats.playTime = BALANCE.dayPeriod / 4;
    const noon = energyBalance(s).supply;
    s.stats.playTime = (3 * BALANCE.dayPeriod) / 4;
    const midnight = energyBalance(s).supply;
    const solar = 9 * 5;
    expect(noon - midnight).toBeCloseTo(solar * 2 * BALANCE.dayAmplitude, 5);
  });

  it('as baterias guardam a sobra (com perda) e cobrem a falta', () => {
    let s = newGame(0);
    s.buildings.fission = 1; s.buildings.battery = 1;
    s = simulate(s, 5).state;
    expect(s.energyCharge).toBeCloseTo((BALANCE.baseEnergy + 60) * 5 * BALANCE.batteryEfficiency);
    s = simulate(s, 60).state;
    expect(s.energyCharge).toBeCloseTo(600);                // cheia, sem passar do limite
    s.buildings.fission = 0; s.buildings.miner = 10; s.buildings.storage = 20;
    const r = simulate(s, 1);
    expect(r.report.energy.ratio).toBe(1);                  // a bateria segura a máquina a 100%
    expect(r.report.energy.fromBattery).toBeCloseTo(10 - BALANCE.baseEnergy);
    expect(r.state.energyCharge).toBeCloseTo(600 - 8);
  });

  it('o conversor só pega a sobra depois que as baterias enchem', () => {
    const s = newGame(0);
    s.buildings.fission = 1; s.buildings.converter = 1; s.buildings.battery = 1;
    research(s, 'energyStorage');
    const charging = simulate(s, 1).report;
    expect(charging.energy.converted).toBe(0);
    expect(charging.status.converter?.kind).toBe('surplus');
    s.energyCharge = 600;
    const full = simulate(s, 1);
    expect(full.report.energy.converted).toBeCloseTo(30);
    expect(full.report.status.converter?.kind).toBe('ok');
    expect(full.state.stats.produced.credits).toBeCloseTo(12);
  });

  it('sobrecarga: energia ×2 por 60 s, depois esfria 4 min antes de repetir', () => {
    let s = newGame(0);
    s.buildings.fission = 1;
    expect(overclockReactor(s, 'solar')).toBeNull();        // painel solar não tem sobrecarga
    const before = energyBalance(s).supply;
    s = overclockReactor(s, 'fission')!;
    expect(energyBalance(s).supply - BALANCE.baseEnergy).toBeCloseTo((before - BALANCE.baseEnergy) * BALANCE.overclockMult);
    s = simulate(s, 61).state;
    expect(overclockPhase(s, 'fission').kind).toBe('cooling');
    expect(energyBalance(s).supply).toBeCloseTo(before);
    expect(overclockReactor(s, 'fission')).toBeNull();
    s = simulate(s, BALANCE.overclockCooldown).state;
    expect(s.overclock.fission).toBeUndefined();
    expect(overclockReactor(s, 'fission')).not.toBeNull();
  });
});

describe('indústria: ritmo, prioridade e escória', () => {
  it('ritmo menor extrai e consome menos; 0% pausa', () => {
    const s = base();
    s.buildings.miner = 10;
    const full = mined(s, simulate(s, 1).state);
    const half = setThrottle(s, 'miner', 0.5)!;
    expect(mined(half, simulate(half, 1).state)).toBeCloseTo(full / 2, 5);
    expect(energyBalance(half).demand).toBeCloseTo(energyBalance(s).demand / 2);
    const off = setThrottle(s, 'miner', 0)!;
    const r = simulate(off, 1);
    expect(mined(off, r.state)).toBe(0);
    expect(r.report.status.miner?.kind).toBe('paused');
    expect(setThrottle(s, 'storage', 0.5)).toBeNull();      // armazém não tem ritmo
    expect(setThrottle(s, 'miner', 0.3)).toBeNull();        // só os passos oferecidos
    expect(setThrottle(half, 'miner', 1)!.throttle.miner).toBeUndefined();
  });

  it('a prioridade decide quem pega o insumo escasso primeiro', () => {
    const s = research(newGame(0), 'metallurgy');
    s.buildings.fission = 1; s.buildings.foundry = 1; s.buildings.factory = 2;
    s.resources.population = 10;
    // Cobre: reserva de construção (10% de 100) + 2 unidades livres; ferro e ligas de sobra.
    Object.assign(s.resources, { copper: 12, iron: 60, alloys: 60 });
    const normal = simulate(s, 1).state;
    expect(normal.resources.components).toBe(0);            // a Fundição vem antes na lista e leva o cobre
    const high = simulate(setPriority(s, 'factory', 1)!, 1).state;
    expect(high.resources.components).toBeGreaterThan(0);
    expect(high.resources.alloys).toBeLessThan(normal.resources.alloys);
    expect(setPriority(s, 'miner', 1)).toBeNull();          // extratores sempre vêm primeiro
  });

  // Armazém pequeno (100): a reserva de construção fica em 10 e não atrapalha a medida.
  const small = () => { const s = research(newGame(0), 'metallurgy'); s.buildings.fission = 1; s.resources.population = 10; return s; };

  it('fundições geram escória, que nunca trava a produção; a recicladora a separa', () => {
    const s = small();
    s.buildings.foundry = 1;
    Object.assign(s.resources, { iron: 90, copper: 90 });
    const r = simulate(s, 1).state;
    expect(r.resources.slag).toBeCloseTo(1.2, 5);
    s.resources.slag = capFor(s, 'slag');
    const jammed = simulate(s, 1);
    expect(jammed.state.resources.alloys).toBeGreaterThan(0);
    expect(jammed.report.status.foundry?.kind).toBe('ok');
    const rec = small();
    rec.buildings.recycler = 1; rec.resources.slag = 90;
    const out = simulate(rec, 1).state;
    expect(out.resources.slag).toBeCloseTo(86, 5);
    expect(out.resources.iron).toBeGreaterThan(0);
    expect(out.resources.copper).toBeGreaterThan(0);
  });

  it('carregadores aceleram as indústrias (insumo e produto juntos), não os extratores', () => {
    const s = small();
    s.buildings.factory = 1; s.buildings.miner = 5;
    Object.assign(s.resources, { alloys: 50, copper: 50 });
    const without = simulate(s, 1).state;
    s.resources.drones = 50; s.drones.loader = 50;
    const k = getModifiers(s).industrySpeed;
    expect(k).toBeGreaterThan(1.15);
    const withL = simulate(s, 1).state;
    expect(withL.resources.components / without.resources.components).toBeCloseTo(k, 5);
    expect((50 - withL.resources.alloys) / (50 - without.resources.alloys)).toBeCloseTo(k, 5);
    expect(mined(s, withL)).toBeCloseTo(mined(s, without), 5);  // mineradoras não mudam
  });
});

describe('armazéns especializados', () => {
  it('cada um aumenta só o seu grupo', () => {
    const s = newGame(0);
    s.buildings.silo = 1; s.buildings.tank = 1; s.buildings.depot = 1;
    expect(capFor(s, 'iron')).toBe(storageCap(s) + 300);
    expect(capFor(s, 'slag')).toBe(storageCap(s) + 300);
    expect(capFor(s, 'water')).toBe(storageCap(s) + 300);
    expect(capFor(s, 'alloys')).toBe(storageCap(s) + 300);
    s.buildings.depot = 0;
    expect(capFor(s, 'alloys')).toBe(storageCap(s));
    expect(capFor(s, 'credits')).toBe(Infinity);
  });

  it('não aumentam a reserva que as indústrias deixam para construir', () => {
    const s = newGame(0);
    s.buildings.refinery = 1; s.buildings.solar = 2; s.buildings.silo = 10;
    s.resources.iron = 15;                                  // acima de 10% do armazém geral (10), abaixo de 10% do total
    const r = simulate(s, 1).state;
    expect(r.resources.alloys).toBeGreaterThan(0);
  });
});

describe('salvamento dos sistemas novos', () => {
  it('ida e volta preserva ritmo, prioridade, sobrecarga e carga', () => {
    let s = base();
    s.buildings.factory = 1; s.buildings.battery = 2; s.energyCharge = 345;
    s = setThrottle(s, 'miner', 0.25)!;
    s = setPriority(s, 'factory', -1)!;
    s = overclockReactor(s, 'fission')!;
    const back = parseSave(serialize(s))!;
    expect(back.throttle).toEqual({ miner: 0.25 });
    expect(back.priority).toEqual({ factory: -1 });
    expect(back.overclock).toEqual({ fission: { left: BALANCE.overclockTime, cool: 0 } });
    expect(back.energyCharge).toBe(345);
  });

  it('valores inválidos são descartados e saves antigos abrem com os padrões', () => {
    const bad = JSON.parse(serialize(newGame(0)));
    bad.throttle = { miner: 0.3, storage: 0.5, refinery: 'x', factory: 0 };
    bad.priority = { miner: 1, factory: 2, refinery: -1 };
    bad.overclock = { solar: { left: 10, cool: 0 }, fission: { left: 9999, cool: 50 } };
    bad.energyCharge = -5;
    const s = parseSave(JSON.stringify(bad))!;
    expect(s.throttle).toEqual({ factory: 0 });
    expect(s.priority).toEqual({ refinery: -1 });
    expect(s.overclock).toEqual({ fission: { left: BALANCE.overclockTime, cool: 0 } });
    expect(s.energyCharge).toBe(0);
    const old = JSON.parse(serialize(newGame(0)));
    old.version = 10; delete old.throttle; delete old.priority; delete old.overclock; delete old.energyCharge; delete old.drones.loader;
    const o = parseSave(JSON.stringify(old))!;
    expect(o).not.toBeNull();
    expect(o.drones.loader).toBe(0);
    expect(o.throttle).toEqual({});
  });

  it('8 h fora com baterias, conversores e sobrecarga não geram valores inválidos', () => {
    const s = research(base(), 'energyStorage', 'metallurgy');
    Object.assign(s.buildings, { solar: 30, battery: 3, converter: 2, miner: 20, foundry: 2, recycler: 1 });
    s.resources.population = 20;
    const o = overclockReactor(s, 'fission')!;
    const { state } = applyOffline({ ...o, savedAt: 0 }, 8 * 3600 * 1000);
    expect(Number.isFinite(state.energyCharge)).toBe(true);
    expect(state.energyCharge).toBeLessThanOrEqual(batteryCap(state) + 1e-6);
    expect(state.overclock.fission).toBeUndefined();
    for (const v of Object.values(state.resources)) expect(Number.isFinite(v)).toBe(true);
  });
});
