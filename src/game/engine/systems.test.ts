import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { buyBuilding, buyUpgrade, simulate } from './economy';
import { getModifiers, housingCap, workforce } from './modifiers';
import { establishOutpost, generateLocation, launchExpedition, outpostYield } from './expansion';
import { ascend, buildMegaStage, buyPerk, buyRepeatable, checkAchievements, chooseEvent, megaRemaining, nextMegaStage, pendingAscension, spawnEvent } from './progression';
import { fulfillContract } from './contracts';
import { sellPrice } from './modifiers';
import { parseSave, serialize } from './save';
import type { GameState } from '../types';
import { BALANCE } from '../data/balance';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };

describe('pesquisa', () => {
  it('só pesquisa quando os pré-requisitos foram concluídos', () => {
    const s = newGame(0);
    s.resources.science = 1e6; s.resources.credits = 1e6;
    expect(buyUpgrade(s, 'habitats')).toBeNull();          // requer iceMining
    research(s, 'lab', 'iceMining');
    expect(buyUpgrade(s, 'habitats')?.upgrades.habitats).toBe(true);
  });

  it('estrutura bloqueada até a pesquisa', () => {
    const s = newGame(0);
    s.resources.credits = 1e6; s.resources.alloys = 1e6;
    expect(buyBuilding(s, 'habitat', 1)).toBeNull();
    research(s, 'lab', 'iceMining', 'habitats');
    expect(buyBuilding(s, 'habitat', 1)?.buildings.habitat).toBe(1);
  });
});

describe('população', () => {
  const colony = () => {
    const s = research(newGame(0), 'lab', 'iceMining', 'habitats');
    s.buildings.habitat = 2; s.buildings.solar = 10;
    return s;
  };

  it('cresce com moradia e comida, até o limite', () => {
    let s = colony();
    s.resources.food = 1000;
    for (let i = 0; i < 300; i++) s = simulate(s, 1).state;
    expect(s.resources.population).toBeCloseTo(housingCap(s), 0);
    expect(s.stats.earned).toBeGreaterThan(0);               // impostos (a manutenção dos habitats consome parte)
  });

  it('sem comida, diminui e avisa', () => {
    const s = colony();
    s.resources.population = 20;
    const r = simulate(s, 10);
    expect(r.report.population.status).toBe('starving');
    expect(r.state.resources.population).toBeLessThan(20);
  });

  it('mão de obra insuficiente reduz estruturas que precisam de trabalhadores', () => {
    const s = research(colony(), 'education');
    s.buildings.university = 2;                                // 10 trabalhadores
    s.resources.population = 5;
    s.resources.food = 1000;
    expect(workforce(s).ratio).toBeCloseTo(0.5);
    const r = simulate(s, 1);
    expect(r.report.status.university).toEqual({ kind: 'workers', ratio: 0.5 });
    expect(r.state.resources.science).toBeCloseTo(4);          // 2 × 4/s × 50%
  });
});

describe('expansão', () => {
  it('gera locais de forma determinística', () => {
    expect(generateLocation(42)).toEqual(generateLocation(42));
    expect(generateLocation(42).id).not.toEqual(generateLocation(43).id);
  });

  it('expedição consome nave e combustível e descobre um local', () => {
    let s = research(newGame(0), 'exploration');
    s.resources.ships = 1; s.resources.fuel = 100;
    s = launchExpedition(s)!;
    expect(s.expeditions).toHaveLength(1);
    expect(s.resources.ships).toBe(0);
    let found = 0;
    for (let i = 0; i < 200; i++) { const r = simulate(s, 1); s = r.state; found += r.report.finishedExpeditions.length; }
    expect(found).toBe(1);
    expect(s.locations).toHaveLength(1);
    expect(s.discovered).toContain(s.locations[0].mineral);
  });

  it('colônia produz por segundo conforme a especialização', () => {
    let s = research(newGame(0), 'exploration');
    s.locations.push({ ...generateLocation(7), type: 'rocky', richness: 1 });
    Object.assign(s.resources, { credits: 1e7, alloys: 1e6, components: 1e6, ships: 5 });
    s = establishOutpost(s, s.locations[0].id, 'commerce')!;
    const y = outpostYield(s.locations[0], getModifiers(s));
    expect(y.credits).toBeCloseTo(15);
    expect(y.iron).toBeCloseTo(6);
  });
});

describe('megaprojetos, eventos e Ascensão', () => {
  it('estágio do Dyson multiplica a energia', () => {
    let s = research(newGame(0), 'megaEngineering');
    s.buildings.solar = 10;
    Object.assign(s.resources, { credits: 1e9, alloys: 1e9, components: 1e9, exotic: 1e9 });
    const before = simulate(s, 1).report.energy.supply;
    s = buildMegaStage(s, 'dyson')!;
    // O gerador de emergência (2) não é multiplicado.
    expect(simulate(s, 1).report.energy.supply).toBeCloseTo((before - 2) * 1.5 + 2);
  });

  it('megaprojeto recebe materiais aos poucos, mesmo acima da capacidade do armazém', () => {
    let s = research(newGame(0), 'megaEngineering');
    Object.assign(s.resources, { credits: 1e9, alloys: 100, components: 1e9, exotic: 1e9 });
    s = buildMegaStage(s, 'dyson')!;
    expect(s.megaprojects.dyson ?? 0).toBe(0);
    expect(s.megaprogress.dyson.alloys).toBe(100);
    const total = 20000 * BALANCE.megaCostScale;              // custo-base do 1º estágio × escala do ritmo
    expect(megaRemaining(s, 'dyson').alloys).toBe(total - 100);
    s.resources.alloys = total - 100;
    s = buildMegaStage(s, 'dyson')!;
    expect(s.megaprojects.dyson).toBe(1);
    expect(s.megaprogress.dyson).toBeUndefined();
    expect(buildMegaStage({ ...s, resources: { ...s.resources, credits: 0, alloys: 0, components: 0, exotic: 0 } }, 'dyson')).toBeNull();
  });

  it('evento: escolha dá recompensa ou efeito temporário que expira', () => {
    let s = newGame(0);
    s.buildings.solar = 5; s.buildings.miner = 5;
    s = { ...s, event: { id: 'solarFlare', remaining: 60, seed: 1 } };
    s = chooseEvent(s, 0)!.state;
    expect(s.buffs).toHaveLength(1);
    for (let i = 0; i < 100; i++) s = simulate(s, 1).state;
    expect(s.buffs).toHaveLength(0);
    const spawned = spawnEvent({ ...s, eventTimer: 0 }, () => 0.1);
    expect(spawned.event).not.toBeNull();
    expect(spawned.eventTimer).toBeGreaterThan(0);
  });

  it('Ascensão: reinicia a jornada, mantém dados e melhorias permanentes', () => {
    let s = research(newGame(0), 'ascensionProject');
    s.stats.earned = 2.25e9; s.buildings.miner = 50; s.resources.credits = 1e6;
    s.discovered.push('gold');
    expect(pendingAscension(s)).toBe(6);
    s = ascend(s)!;
    expect(s.buildings.miner).toBe(0);
    expect(s.resources.credits).toBe(0);
    expect(s.ascension).toMatchObject({ points: 6, total: 6, count: 1 });
    expect(s.discovered).toContain('gold');
    s = buyPerk(s, 'production')!;
    expect(getModifiers(s).outputAll).toBeCloseTo(1.25);
    s = buyPerk(s, 'research')!;
    expect(s.upgrades.lab).toBe(true);
  });

  it('Núcleo Estelar não tem fim e cada estágio custa mais', () => {
    let s = research(newGame(0), 'megaEngineering');
    s.megaprojects.dyson = 4;
    const c0 = nextMegaStage(s, 'core')!.cost.credits!;
    s.megaprojects.core = 50;
    const c50 = nextMegaStage(s, 'core')!.cost.credits!;
    expect(c50).toBeGreaterThan(c0 * 1e15);
    expect(Number.isFinite(c50)).toBe(true);
    expect(getModifiers(s).outputAll).toBeGreaterThan(Math.pow(1.2, 50) * 0.99);
  });

  it('pesquisa contínua: sem nível máximo, custo crescente', () => {
    let s = research(newGame(0), 'automation', 'ai');
    s.resources.science = 1e12;
    for (let i = 0; i < 20; i++) s = buyRepeatable(s, 'rProduction')!;
    expect(s.repeatables.rProduction).toBe(20);
    expect(getModifiers(s).outputAll).toBeCloseTo(Math.pow(1.1, 20) * 1.25);   // × IA operacional
    expect(buyRepeatable({ ...s, resources: { ...s.resources, science: 0 } }, 'rProduction')).toBeNull();
  });

  it('contratos: surgem com o tempo, pagam acima do mercado e expiram', () => {
    let s = newGame(0);
    Object.assign(s.buildings, { refinery: 1, miner: 5, solar: 3 });
    s.stats.earned = 1000; s.stats.produced = { iron: 500, alloys: 200 };
    s.contractTimer = 0;
    s = simulate(s, 1).state;
    expect(s.contracts).toHaveLength(1);
    const c = s.contracts[0];
    s.resources[c.res] = c.amount;
    const r = fulfillContract(s, c.id)!;
    expect(r.state.contracts).toHaveLength(0);
    expect(r.state.stats.contractsDone).toBe(1);
    expect(r.reward.credits! / c.amount).toBeGreaterThan(sellPrice(c.res, getModifiers(s)));
    let e = s;
    for (let i = 0; i < 700; i++) e = simulate({ ...e, contractTimer: 1e9 }, 1).state;
    expect(e.contracts.find(x => x.id === c.id)).toBeUndefined();
  });

  it('conquistas dão bônus e sobrevivem à Ascensão', () => {
    let s = research(newGame(0), 'ascensionProject');
    s.buildings.miner = 50;
    s = checkAchievements(s).state;
    expect(s.achievements).toEqual(expect.arrayContaining(['firstMiner', 'miner50']));
    expect(getModifiers(s).outputAll).toBeCloseTo(1 + 0.02 * s.achievements.length);
    s.stats.earned = 1e10;
    expect(ascend(s)!.achievements).toEqual(s.achievements);
  });

  it('espaço profundo: locais descobertos depois são mais ricos', () => {
    let near = 0, far = 0;
    for (let i = 1; i <= 50; i++) { near += generateLocation(i, 1, 0).richness; far += generateLocation(i, 1, 40).richness; }
    expect(far / near).toBeCloseTo(1 + 0.06 * 40, 1);
  });

  it('salvamento preserva os sistemas novos', () => {
    let s = research(newGame(0), 'exploration');
    s.locations.push({ ...generateLocation(3), type: 'ocean', sprite: 'planet-ocean' });          // terraformável (gás e asteroides não são)
    s.locations[0].outpost = { level: 2, spec: 'science', terra: 2, terraRemaining: 100, terraTotal: 400 };
    s.megaprojects.dyson = 2;
    s.ascension = { points: 3, total: 9, count: 2, perks: { production: 2 } };
    s.buffs.push({ id: 'b', name: 'Teste', effects: [{ kind: 'outputAll', mult: 2 }], remaining: 30 });
    s.repeatables.rEnergy = 7; s.achievements.push('firstMiner'); s.stats.contractsDone = 12;
    s.contracts.push({ id: 'c-1', res: 'alloys', amount: 50, reward: { credits: 900 }, remaining: 100 });
    const back = parseSave(serialize(s))!;
    expect(back.locations[0]).toEqual(s.locations[0]);
    expect(back.megaprojects.dyson).toBe(2);
    expect(back.ascension).toEqual(s.ascension);
    expect(back.buffs[0].effects).toEqual([{ kind: 'outputAll', mult: 2 }]);
    expect(back.nextSeed).toBeGreaterThan(3);
    expect(back.repeatables.rEnergy).toBe(7);
    expect(back.achievements).toEqual(['firstMiner']);
    expect(back.contracts).toEqual(s.contracts);
    expect(back.stats.contractsDone).toBe(12);
  });

  it('carrega salvamentos da versão 1', () => {
    const v1 = JSON.stringify({ version: 1, resources: { credits: 50 }, buildings: { miner: 4 }, upgrades: { drills: true } });
    const s = parseSave(v1)!;
    expect(s.resources.credits).toBe(50);
    expect(s.locations).toEqual([]);
    expect(s.ascension.count).toBe(0);
  });
});
