import { describe, expect, it } from 'vitest';
import type { GameState, Location, LocationType } from '../types';
import { newGame } from './state';
import { sell, simulate } from './economy';
import { energyBalance, getModifiers, inflation, recipeOf, repLevel } from './modifiers';
import { marketDepth, quoteSale, saturationOf, unitPriceNow } from './market';
import { recover } from '../data/market';
import { upkeepBreakdown, upkeepRatio } from './upkeep';
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID } from '../data/buildings';
import { DECREES } from '../data/decrees';
import { activeDecree, enactDecree } from './decrees';
import { LOBBY_GAIN, canLobby, lobbyFaction } from './factions';
import { advanceContracts, fulfillContract } from './contracts';
import { establishOutpost, generateLocation, outpostCost } from './expansion';
import { insureRoute, isBlocked, openRoute, routeInfo } from './routes';
import { spawnCrisis } from './crises';
import { applyOffline } from './offline';
import { chooseEvent } from './progression';
import { EVENT_BY_ID } from '../data/events';
import { buildMegaStage, megaRemaining } from './progression';
import { parseSave, serialize } from './save';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };
const mk = (seed: number, type: LocationType): Location => ({ ...generateLocation(seed), type, richness: 1, claimedBy: null, distance: 2 });
const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e12, alloys: 1e9, components: 1e9, modules: 1e6, water: 1e7, fuel: 1e7, food: 1e7, ships: 100, exotic: 1e6, science: 1e9 });
  return s;
};
function withColonies(types: LocationType[]): GameState {
  let s = rich(research(newGame(0), 'exploration', 'logisticsNet', 'diplomacy'));
  types.forEach((t, i) => s.locations.push(mk(100 + i, t)));
  s.locations.forEach(l => { s = establishOutpost(s, l.id, 'mining')!; });
  return s;
}
const market = () => { const s = research(newGame(0), 'commerce'); s.stats.earned = 1e6; return s; };

describe('demanda do mercado', () => {
  it('antes da pesquisa vender não satura nada', () => {
    const s = newGame(0);
    s.resources.iron = 1000;
    const r = sell(s, 'iron');
    expect(r.earned).toBe(1000);
    expect(r.state.market.sat.iron).toBeUndefined();
  });

  it('vender muito derruba o preço; a quantidade total rende menos que o preço cheio', () => {
    const s = market();
    const m = getModifiers(s);
    const depth = marketDepth(s, m, 'iron');
    s.resources.iron = depth * 2;
    const full = unitPriceNow(s, m, 'iron') * Math.floor(s.resources.iron);
    const r = sell(s, 'iron');
    expect(r.earned).toBeLessThan(full);
    expect(r.earned).toBeGreaterThan(0);
    expect(saturationOf(r.state, 'iron')).toBeGreaterThan(1.5);
    expect(unitPriceNow(r.state, m, 'iron')).toBeLessThan(unitPriceNow(s, m, 'iron') * 0.4);
  });

  it('o resultado não depende de vender de uma vez ou em partes (sem brecha para fatiar)', () => {
    const s = market();
    const m = getModifiers(s);
    const lump = quoteSale(s, m, 'copper', 4000);
    const half = quoteSale(s, m, 'copper', 2000);
    const s2 = { ...s, market: { ...s.market, sat: { copper: half.sat } } };
    const second = quoteSale(s2, m, 'copper', 2000);
    expect(half.earned + second.earned).toBeCloseTo(lump.earned, 6);
    expect(second.sat).toBeCloseTo(lump.sat, 9);
  });

  it('a saturação se recupera com o tempo (meia-vida) e some', () => {
    const s = market();
    s.market.sat.iron = 2;
    const after = simulate(s, BALANCE.marketRecovery).state;
    expect(after.market.sat.iron!).toBeCloseTo(1, 1);
    const later = simulate(after, BALANCE.marketRecovery * 12).state;
    expect(later.market.sat.iron).toBeUndefined();
    expect(recover(4, BALANCE.marketRecovery)).toBeCloseTo(2);
  });

  it('diversificar rende mais que despejar um recurso só', () => {
    const s = market();
    const m = getModifiers(s);
    s.stats.earned = 0;                                   // economia pequena: a demanda é curta
    const depth = marketDepth(s, m, 'iron');
    const eff = (res: 'iron' | 'water', units: number) => quoteSale(s, m, res, units).earned / (units * unitPriceNow(s, m, res));
    expect(eff('iron', depth)).toBeLessThan(eff('iron', depth / 2));         // quanto mais de um só, pior o preço médio
    expect(eff('iron', depth / 2) + eff('water', depth / 2)).toBeGreaterThan(2 * eff('iron', depth));   // repartir rende mais
  });

  it('a profundidade cresce com a economia, entrepostos, reputação e pesquisas', () => {
    const base = market();
    const d0 = marketDepth(base, getModifiers(base), 'iron');
    const big = market(); big.stats.earned = 1e9;
    expect(marketDepth(big, getModifiers(big), 'iron')).toBeGreaterThan(d0 * 10);
    const shops = market(); shops.buildings.market = 10;
    expect(marketDepth(shops, getModifiers(shops), 'iron')).toBeGreaterThan(d0 * 2);
    const rep = market(); rep.stats.reputation = 600;
    expect(marketDepth(rep, getModifiers(rep), 'iron')).toBeGreaterThan(d0 * 1.5);
    const tech = research(market(), 'marketAnalysis');
    expect(marketDepth(tech, getModifiers(tech), 'iron')).toBeCloseTo(d0 * 1.5);
  });

  it('a venda automática respeita a reserva do armazém e o piso com a saturação', () => {
    const s = research(market(), 'logistics');
    s.autosell.copper = true;
    s.resources.copper = 100;
    const cap = 100;                                      // armazém inicial
    s.keep.copper = 0.5;
    const r = simulate(s, 1).state;
    expect(r.resources.copper).toBeCloseTo(cap * 0.5, 4);   // vendeu só o que passava da reserva
    // piso: com a demanda saturada o preço fica abaixo de 100% e a venda espera
    const t = research(market(), 'logistics');
    t.autosell.copper = true; t.autosellFloor = 1; t.resources.copper = 50;
    t.market.sat.copper = 3; t.market.clock = 0;
    const kept = simulate(t, 1).state.resources.copper;
    expect(kept).toBeGreaterThan(40);
  });
});

describe('manutenção, dívida e inflação', () => {
  const heavy = () => {
    const s = newGame(0);
    s.buildings.crusher = 4; s.buildings.solar = 100;
    return s;
  };

  it('só estruturas caras cobram manutenção, proporcional ao custo', () => {
    expect(BUILDING_BY_ID.miner.upkeep).toBeUndefined();
    expect(BUILDING_BY_ID.crusher.upkeep).toBeGreaterThan(0);
    expect(BUILDING_BY_ID.fusion.upkeep!).toBeGreaterThan(BUILDING_BY_ID.fission.upkeep!);
    const s = heavy();
    const u = upkeepBreakdown(s, getModifiers(s));
    expect(u.buildings).toBeCloseTo(4 * BUILDING_BY_ID.crusher.upkeep!);
    expect(u.colonies).toBe(0);
  });

  it('cobra dos créditos em caixa e vira dívida quando falta dinheiro', () => {
    let s = heavy();
    const rate = upkeepBreakdown(s, getModifiers(s)).total;
    s.resources.credits = rate * 10;
    s = simulate(s, 5).state;
    expect(s.resources.credits).toBeCloseTo(rate * 5, 4);
    expect(s.debt).toBe(0);
    s.resources.credits = 0;
    s = simulate(s, 10).state;
    expect(s.debt).toBeCloseTo(rate * 10, 4);
  });

  it('a dívida é paga primeiro com os créditos que entram', () => {
    let s = heavy();
    s.debt = 50;
    s.resources.credits = 1000;
    s = simulate(s, 1).state;
    expect(s.debt).toBe(0);
    expect(s.resources.credits).toBeLessThan(1000);
  });

  it('dentro da tolerância nada muda; depois o ritmo cai, mas nunca abaixo do piso', () => {
    const rate = 10;
    const grace = rate * BALANCE.upkeepGrace;
    expect(upkeepRatio(grace * 0.9, rate)).toBe(1);
    expect(upkeepRatio(grace * 2, rate)).toBeCloseTo(0.5);
    expect(upkeepRatio(grace * 1000, rate)).toBe(BALANCE.upkeepFloor);
    expect(upkeepRatio(500, 0)).toBe(1);
  });

  it('com dívida alta as estruturas caras produzem menos (e as baratas não)', () => {
    const base = newGame(0);
    base.buildings.crusher = 2; base.buildings.miner = 2; base.buildings.solar = 100; base.resources.population = 100;
    const ok = simulate(base, 1).state;
    const broke = simulate({ ...base, debt: 1e9 }, 1).state;
    const mined = (x: GameState) => x.stats.totalMined;
    expect(mined(broke)).toBeLessThan(mined(ok));
    expect(mined(broke)).toBeGreaterThan(0);
  });

  it('colônias custam por nível e terraformação; o decreto de austeridade reduz tudo', () => {
    let s = withColonies(['rocky', 'ice']);
    const before = upkeepBreakdown(s, getModifiers(s)).colonies;
    expect(before).toBeGreaterThan(0);
    s.locations[0].outpost!.level = 6;
    expect(upkeepBreakdown(s, getModifiers(s)).colonies).toBeGreaterThan(before * 1.5);
    s.resources.influence = 1000;
    s = research(s, 'embassies');
    const total = upkeepBreakdown(s, getModifiers(s)).total;
    s = enactDecree(s, 'austerity')!;
    expect(upkeepBreakdown(s, getModifiers(s)).total).toBeCloseTo(total * 0.4);
  });

  it('inflação cresce devagar com os créditos ganhos', () => {
    const s = newGame(0);
    expect(inflation(s)).toBe(0);
    s.stats.earned = 2e5;
    const a = inflation(s);
    s.stats.earned = 2e9;
    expect(inflation(s)).toBeGreaterThan(a);
    expect(inflation(s)).toBeLessThan(0.3);
    expect(getModifiers(s).cost).toBeCloseTo(1 + inflation(s));
  });
});

describe('influência, decretos e disputas', () => {
  it('embaixadas geram influência; tratados e alianças rendem um fio', () => {
    let s = research(newGame(0), 'diplomacy', 'embassies');
    s.buildings.embassy = 5; s.buildings.solar = 100; s.resources.population = 100; s.buildings.habitat = 20;
    s = simulate(s, 10).state;
    expect(s.resources.influence).toBeCloseTo(5 * 0.05 * 10, 3);
    s.factions.helix.relation = 30; s.factions.ferrum.relation = 70;
    const before = s.resources.influence;
    s = simulate(s, 10).state;
    const trickle = (BALANCE.influenceTreaty + BALANCE.influenceAlliance) * 10;
    expect(s.resources.influence - before).toBeGreaterThan(5 * 0.05 * 10 + trickle * 0.9);
  });

  it('decretos cobram influência, duram e renovam sem acumular', () => {
    let s = research(newGame(0), 'embassies');
    s.resources.influence = 2000;
    const d = DECREES.find(x => x.id === 'mobilization')!;
    s = enactDecree(s, d.id)!;
    expect(s.resources.influence).toBe(2000 - d.cost);                 // sem colônias: custo-base
    expect(getModifiers(s).outputAll).toBeCloseTo(1.2);
    s = simulate(s, 100).state;
    s = enactDecree(s, d.id)!;
    expect(s.buffs.filter(b => b.name === d.name)).toHaveLength(1);
    expect(activeDecree(s, d.id)!.remaining).toBe(d.duration);
    expect(enactDecree({ ...s, resources: { ...s.resources, influence: 0 } }, d.id)).toBeNull();
    expect(enactDecree(newGame(0), d.id)).toBeNull();           // exige a pesquisa
    s = simulate(s, d.duration + 5).state;
    expect(activeDecree(s, d.id)).toBeUndefined();
  });

  it('campanha diplomática compra relação, mais cara quanto maior a relação, sem esfriar a rival', () => {
    let s = research(newGame(0), 'diplomacy');
    s.resources.influence = 500;
    s.factions.helix.relation = 10; s.factions.vesper.relation = 20;
    expect(canLobby(s, 'helix').ok).toBe(true);
    const a = lobbyFaction(s, 'helix')!;
    expect(a.factions.helix.relation).toBe(10 + LOBBY_GAIN);
    expect(a.factions.vesper.relation).toBe(20);
    s.factions.helix.relation = 90;
    const b = lobbyFaction(s, 'helix')!;
    expect(500 - b.resources.influence).toBeGreaterThan(500 - a.resources.influence);
    s.factions.helix.relation = 100;
    expect(canLobby(s, 'helix').ok).toBe(false);
  });

  it('fundar em local disputado com influência evita a taxa e o desgaste', () => {
    let s = rich(research(newGame(0), 'exploration', 'diplomacy', 'embassies'));
    const loc = { ...mk(300, 'rocky'), claimedBy: 'helix' };
    s.locations.push(loc);
    s.resources.influence = 500;
    const plain = outpostCost(s, loc);
    const viaInfluence = outpostCost(s, loc, true);
    expect(viaInfluence.credits!).toBeLessThan(plain.credits!);
    expect(viaInfluence.influence).toBeGreaterThan(0);
    s.factions.helix.relation = 10;
    const paid = establishOutpost(s, loc.id, 'mining', true)!;
    expect(paid.factions.helix.relation).toBe(10);                // sem desgaste
    expect(paid.resources.influence).toBeLessThan(500);
    const fee = establishOutpost(s, loc.id, 'mining')!;
    expect(fee.factions.helix.relation).toBe(Math.max(0, 10 - BALANCE.disputePenalty));
  });
});

describe('reputação e contratos urgentes', () => {
  const contractsGame = () => {
    const s = newGame(0);
    Object.assign(s.buildings, { refinery: 1, solar: 3 });
    s.stats.earned = 1000; s.stats.produced = { alloys: 500, iron: 500 };
    return s;
  };

  it('cumprir contratos sobe a reputação e o nível melhora contratos e rotas', () => {
    let s = contractsGame();
    s.contracts.push({ id: 'c1', res: 'iron', amount: 10, reward: { credits: 5 }, remaining: 100 });
    s.resources.iron = 50;
    s = fulfillContract(s, 'c1')!.state;
    expect(s.stats.reputation).toBe(BALANCE.repContract);
    s.stats.reputation = BALANCE.repStep * 4;                     // nível 2
    expect(repLevel(s)).toBe(2);
    expect(getModifiers(s).contract).toBeCloseTo(1.06);
  });

  it('contratos urgentes só vêm depois de alguns cumpridos, pagam mais e vencem mais cedo', () => {
    const base = contractsGame();
    base.contractTimer = 0;
    let urgent = 0, normal = 0, pay = [0, 0];
    for (let seed = 1; seed < 80; seed++) {
      const lo = simulate({ ...base, contracts: [], nextSeed: seed }, 1).state.contracts[0];
      expect(lo?.risk).toBeUndefined();                          // ainda não há urgentes
      const hi = simulate({ ...base, stats: { ...base.stats, contractsDone: BALANCE.contractRiskAfter }, contracts: [], nextSeed: seed }, 1).state.contracts[0];
      if (hi.risk) { urgent++; pay[1] += hi.reward.credits! / hi.amount; expect(hi.remaining).toBeLessThanOrEqual(BALANCE.contractRiskDuration); }
      else { normal++; pay[0] += hi.reward.credits! / hi.amount; }
    }
    expect(urgent).toBeGreaterThan(5);
    expect(normal).toBeGreaterThan(urgent);
  });

  it('falhar num contrato urgente custa reputação; ficar fora não pune', () => {
    let s = contractsGame();
    s.stats.reputation = 20;
    s.contractTimer = 1e6;
    s.contracts = [{ id: 'u', res: 'iron', amount: 10, reward: { credits: 5 }, remaining: 5, risk: true }, { id: 'n', res: 'iron', amount: 10, reward: { credits: 5 }, remaining: 5 }];
    advanceContracts(s, 10);
    expect(s.stats.reputation).toBe(20 - BALANCE.repRiskFail);
    // offline: contratos urgentes somem antes da simulação
    const away = contractsGame();
    away.stats.reputation = 20; away.savedAt = 0;
    away.contracts = [{ id: 'u', res: 'iron', amount: 10, reward: { credits: 5 }, remaining: 100, risk: true }];
    const back = applyOffline(away, 3600 * 1000).state;
    expect(back.stats.reputation).toBe(20);
    expect(back.contracts.some(c => c.risk)).toBe(false);
  });
});

describe('bloqueios de rota e seguro', () => {
  const routed = () => {
    let s = withColonies(['rocky', 'ice']);
    s = openRoute(s, s.locations[0].id, s.locations[1].id)!;
    return s;
  };

  it('um bloqueio suspende o bônus da rota; a rota segurada passa', () => {
    let s = routed();
    const [a, b] = s.locations;
    expect(routeInfo(s, a).supplied).toBe(true);                  // gelo fornece água ao mundo rochoso
    s.crises.push({ id: 'cr-9', locId: b.id, kind: 'blockade', remaining: 100, total: 100 });
    expect(routeInfo(s, a).supplied).toBe(false);
    expect(isBlocked(s, s.routes[0])).toBe(true);
    s = insureRoute(s, s.routes[0].id)!;
    expect(s.routes[0].insured).toBe(true);
    expect(routeInfo(s, a).supplied).toBe(true);
  });

  it('só colônias com rota sem seguro sofrem bloqueio; o seguro custa manutenção', () => {
    let s = routed();
    let hit = 0;
    for (let i = 1; i < 300; i++) {
      const r = spawnCrisis({ ...s, crises: [], nextSeed: 1000 + i }, (() => { let x = i; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })());
      if (r.crises[0]?.kind === 'blockade') hit++;
    }
    expect(hit).toBeGreaterThan(10);
    const sem = withColonies(['rocky', 'ice']);                   // sem rotas: nunca bloqueia
    for (let i = 1; i < 200; i++) {
      const r = spawnCrisis({ ...sem, crises: [], nextSeed: 5000 + i }, (() => { let x = i; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })());
      expect(r.crises[0]?.kind).not.toBe('blockade');
    }
    const upBefore = upkeepBreakdown(s, getModifiers(s)).insurance;
    s = insureRoute(s, s.routes[0].id)!;
    expect(upkeepBreakdown(s, getModifiers(s)).insurance).toBeGreaterThan(upBefore);
    for (let i = 1; i < 200; i++) {                               // rotas seguradas: nunca bloqueia
      const r = spawnCrisis({ ...s, crises: [], nextSeed: 9000 + i }, (() => { let x = i; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })());
      expect(r.crises[0]?.kind).not.toBe('blockade');
    }
  });

  it('reputação alta barateia as rotas', () => {
    const s = withColonies(['rocky', 'ice', 'ocean']);
    const [a, b] = [s.locations[0].id, s.locations[2].id];
    const cheap = { ...s, stats: { ...s.stats, reputation: 600 } };
    expect(openRoute(cheap, a, b)!.resources.credits).toBeGreaterThan(openRoute(s, a, b)!.resources.credits);
  });
});

describe('receitas alternativas e cadeia de módulos', () => {
  it('a receita alternativa troca insumos, produção e energia', () => {
    const s = newGame(0);
    s.recipes.refinery = true;
    const b = BUILDING_BY_ID.refinery;
    expect(recipeOf(s, b).outputs).toEqual(b.alt!.outputs);
    expect(recipeOf(newGame(0), b).outputs).toEqual(b.outputs);
    const std = newGame(0), alt = newGame(0);
    for (const x of [std, alt]) { x.buildings.refinery = 4; x.buildings.solar = 100; x.resources.iron = 50; x.resources.copper = 50; }
    alt.recipes.refinery = true;
    const d1 = energyBalance(std).demand, d2 = energyBalance(alt).demand;
    expect(d2).toBeCloseTo(d1 * b.alt!.energy);
    const a = simulate(std, 10).state, c = simulate(alt, 10).state;
    expect(c.resources.copper).toBeLessThan(50);                  // gastou cobre
    expect(c.resources.alloys).toBeGreaterThan(a.resources.alloys); // e rendeu mais liga que a receita padrão
  });

  it('a linha de módulos transforma componentes, ouro e combustível em módulos', () => {
    const s = newGame(0);
    s.buildings.moduleLine = 2; s.buildings.solar = 100; s.buildings.storage = 20; s.resources.population = 100; s.buildings.habitat = 50;
    Object.assign(s.resources, { components: 5000, gold: 5000, fuel: 5000 });
    const r = simulate(s, 10).state;
    expect(r.resources.modules).toBeGreaterThan(0);
    expect(r.resources.components).toBeLessThan(5000);
  });

  it('estágios avançados dos megaprojetos exigem módulos', () => {
    let s = rich(research(newGame(0), 'megaEngineering'));
    s.megaprojects.dyson = 1;
    s.resources.modules = 0;
    const need = megaRemaining(s, 'dyson');
    expect(need.modules).toBeGreaterThan(0);
    const next = buildMegaStage(s, 'dyson')!;                     // entrega o que houver, sem concluir
    expect(next.megaprojects.dyson).toBe(1);
    s.resources.modules = 1e6;
    for (let i = 0; i < 3; i++) s = buildMegaStage(s, 'dyson') ?? s;
    expect(s.megaprojects.dyson).toBeGreaterThan(1);
  });
});

describe('fluxos e histórico', () => {
  it('a soma dos fluxos por origem fecha com a variação de estoque', () => {
    let s = withColonies(['rocky', 'metallic']);
    Object.assign(s.buildings, { miner: 5, solar: 20, refinery: 3, crusher: 1 });
    s.resources.iron = 20;
    const dt = 1;
    const r = simulate(s, dt, { flows: true }).report;
    expect(r.flows).toBeDefined();
    for (const res of ['iron', 'alloys', 'credits', 'copper'] as const) {
      const sum = Object.values(r.flows!).reduce((a, f) => a + (f[res] ?? 0), 0);
      expect(sum, res).toBeCloseTo(r.delta[res] / dt, 6);
    }
    expect(r.flows!.upkeep.credits!).toBeLessThan(0);
    expect(simulate(s, 1).report.flows).toBeUndefined();          // sem pedir, não calcula
  });
});

describe('salvamento v7', () => {
  it('guarda saturação, reserva, receitas, dívida, reputação, seguro e contratos urgentes', () => {
    let s = withColonies(['rocky', 'ice']);
    s = openRoute(s, s.locations[0].id, s.locations[1].id)!;
    s = insureRoute(s, s.routes[0].id)!;
    s.market.sat = { iron: 1.5 };
    s.keep = { copper: 0.25 };
    s.recipes = { refinery: true };
    s.debt = 77;
    s.stats.reputation = 42;
    s.contracts = [{ id: 'u', res: 'iron', amount: 5, reward: { credits: 9 }, remaining: 50, risk: true }];
    const back = parseSave(serialize(s))!;
    expect(back.market.sat.iron).toBeCloseTo(1.5);
    expect(back.keep.copper).toBe(0.25);
    expect(back.recipes.refinery).toBe(true);
    expect(back.debt).toBe(77);
    expect(back.stats.reputation).toBe(42);
    expect(back.routes[0].insured).toBe(true);
    expect(back.contracts[0].risk).toBe(true);
  });

  it('dados corrompidos viram valores seguros', () => {
    const s = newGame(0);
    const raw = JSON.parse(serialize(s));
    raw.market = { clock: 5, sat: { iron: -4, copper: 'x', gold: 1e12 } };
    raw.keep = { iron: 0.33, copper: 0.5, nada: 1 };
    raw.recipes = { miner: true, refinery: 'sim' };
    raw.debt = -50;
    raw.stats.reputation = 'muito';
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.market.sat.iron).toBeUndefined();
    expect(back.market.sat.copper).toBeUndefined();
    expect(back.market.sat.gold).toBeLessThanOrEqual(1e6);
    expect(back.keep.iron).toBeUndefined();
    expect(back.keep.copper).toBe(0.5);
    expect(back.recipes.miner).toBeUndefined();
    expect(back.recipes.refinery).toBeUndefined();
    expect(back.debt).toBe(0);
    expect(back.stats.reputation).toBe(0);
  });

  it('um save v6 abre com os campos novos nos padrões', () => {
    const raw = JSON.parse(serialize(newGame(0)));
    raw.version = 6;
    for (const k of ['keep', 'recipes', 'debt']) delete raw[k];
    delete raw.market.sat; delete raw.stats.reputation;
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.keep).toEqual({});
    expect(back.recipes).toEqual({});
    expect(back.debt).toBe(0);
    expect(back.market.sat).toEqual({});
    expect(back.stats.reputation).toBe(0);
  });
});

describe('eventos de mercado', () => {
  it('escolhas de escassez dão preço alto temporário ou reputação em troca de estoque', () => {
    let s = research(newGame(0), 'commerce');
    s.stats.produced = { fuel: 10 };
    s.resources.fuel = 100;
    expect(EVENT_BY_ID.fuelShortage.minPhase(s)).toBe(true);
    expect(EVENT_BY_ID.fuelShortage.minPhase(newGame(0))).toBe(false);
    s.event = { id: 'fuelShortage', remaining: 30, seed: 1 };
    const price = chooseEvent(s, 0)!.state;
    expect(getModifiers(price).price.fuel).toBeCloseTo(2.2);
    const help = chooseEvent(s, 1)!.state;
    expect(help.stats.reputation).toBe(4);
    expect(help.resources.fuel).toBe(75);
  });
});
