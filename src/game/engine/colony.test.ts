import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { simulate } from './economy';
import { getModifiers, sellPrice } from './modifiers';
import { sell } from './economy';
import { applyOffline } from './offline';
import { establishOutpost, generateLocation, outpostYield } from './expansion';
import { canAskHelp, crisisCost, crisisFactor, resolveCrisis, spawnCrisis } from './crises';
import { canOpenRoute, closeRoute, colonyProduces, maxRoutes, needOf, openRoute, routeInfo, routeScore } from './routes';
import { isHigh, marketFactor, quoteSale } from './market';
import { MARKET, MARKET_MAX, MARKET_MIN, marketAt, nextPeak } from '../data/market';
import { parseSave, serialize } from './save';
import { advise } from './advisor';
import { BALANCE } from '../data/balance';
import type { GameState, Location, LocationType, Specialization } from '../types';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };
const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e12, alloys: 1e9, components: 1e9, water: 1e7, fuel: 1e7, food: 1e7, ships: 100, exotic: 1e6, science: 1e9 });
  return s;
};
const mk = (seed: number, type: LocationType): Location => ({ ...generateLocation(seed), type, richness: 1, claimedBy: null, distance: 2 });

/** Estado com colônias dos tipos pedidos (já fundadas). */
function withColonies(types: [LocationType, Specialization][]): GameState {
  let s = rich(research(newGame(0), 'exploration', 'logisticsNet', 'diplomacy'));
  types.forEach(([t], i) => s.locations.push(mk(100 + i, t)));
  s.locations.forEach((l, i) => { s = establishOutpost(s, l.id, types[i][1])!; });
  return s;
}

describe('crises de colônia', () => {
  it('derrubam a produção da colônia e passam sozinhas; nada é perdido', () => {
    let s = withColonies([['rocky', 'mining']]);
    const loc = s.locations[0];
    const m = getModifiers(s);
    const normal = outpostYield(loc, m, s).iron!;
    s.crises.push({ id: 'cr-1', locId: loc.id, kind: 'unrest', remaining: 100, total: 100 });
    expect(outpostYield(loc, m, s).iron!).toBeCloseTo(normal * BALANCE.crisisPenalty);
    expect(crisisFactor(s, 'outra', 'iron')).toBe(1);
    const before = s.buildings.miner, lvl = s.locations[0].outpost!.level;
    for (let i = 0; i < 101; i++) s = simulate(s, 1).state;
    expect(s.crises).toHaveLength(0);
    expect(s.buildings.miner).toBe(before);
    expect(s.locations[0].outpost!.level).toBe(lvl);
  });

  it('cada tipo de crise castiga recursos diferentes', () => {
    const s = withColonies([['ocean', 'mining']]);
    const loc = s.locations[0], m = getModifiers(s);
    const y = (kind: 'drought' | 'plague') => { const t = { ...s, crises: [{ id: 'x', locId: loc.id, kind, remaining: 9, total: 9 }] }; return outpostYield(loc, m, t); };
    const base = outpostYield(loc, m, s);
    expect(y('drought').water! / base.water!).toBeLessThan(y('drought').iron === undefined ? 1 : 0.3);
    expect(y('plague').food! / base.food!).toBeLessThan(0.3);
  });

  it('resolver pagando consome o custo e conta como resolvida; sem recursos não resolve', () => {
    let s = withColonies([['rocky', 'mining']]);
    s.crises.push({ id: 'cr-1', locId: s.locations[0].id, kind: 'drought', remaining: 500, total: 600 });
    const cost = crisisCost(s, s.crises[0]);
    const water = s.resources.water;
    s = resolveCrisis(s, 'cr-1', 'pay')!;
    expect(s.crises).toHaveLength(0);
    expect(s.resources.water).toBe(water - cost.water!);
    expect(s.stats.crisesSolved).toBe(1);
    s.crises.push({ id: 'cr-2', locId: s.locations[0].id, kind: 'drought', remaining: 500, total: 600 });
    s.resources.water = 0;
    expect(resolveCrisis(s, 'cr-2', 'pay')).toBeNull();
  });

  it('o custo nunca passa da capacidade do armazém e cai em mundos terraformados', () => {
    const s = withColonies([['rocky', 'mining']]);
    s.locations[0].outpost!.level = 40;
    const c = { id: 'x', locId: s.locations[0].id, kind: 'raid' as const, remaining: 1, total: 1 };
    const cap = 100;                                    // capacidade inicial
    for (const kind of ['drought', 'raid', 'plague'] as const) {
      for (const v of Object.values(crisisCost(s, { ...c, kind }))) expect(v!).toBeLessThanOrEqual(cap * 0.46);
    }
    const plain = crisisCost(s, { ...c, kind: 'drought' }).water!;
    s.locations[0].outpost!.terra = 3;
    expect(crisisCost(s, { ...c, kind: 'drought' }).water!).toBeLessThan(plain);
  });

  it('pedir ajuda exige tratado, custa relação e resolve de graça', () => {
    let s = withColonies([['rocky', 'mining']]);
    s.crises.push({ id: 'cr-1', locId: s.locations[0].id, kind: 'drought', remaining: 500, total: 600 });   // ajuda: Helix
    expect(canAskHelp(s, s.crises[0])).toBe(false);
    expect(resolveCrisis(s, 'cr-1', 'help')).toBeNull();
    s.factions.helix.relation = 40;
    const water = s.resources.water;
    s = resolveCrisis(s, 'cr-1', 'help')!;
    expect(s.crises).toHaveLength(0);
    expect(s.factions.helix.relation).toBe(32);
    expect(s.resources.water).toBe(water);
  });

  it('sorteio: só em colônias, no máximo duas, uma por colônia, e sempre reagenda', () => {
    expect(spawnCrisis(newGame(0)).crises).toHaveLength(0);                          // sem colônias
    let s = withColonies([['rocky', 'mining'], ['ice', 'science'], ['jungle', 'agriculture']]);
    s.crisisTimer = 0;
    s = spawnCrisis(s, () => 0.1);
    expect(s.crises).toHaveLength(1);
    expect(s.crisisTimer).toBeGreaterThanOrEqual(BALANCE.crisisMinGap);
    s = spawnCrisis(s, () => 0.5); s = spawnCrisis(s, () => 0.9);
    expect(s.crises.length).toBeLessThanOrEqual(BALANCE.crisisMax);
    expect(new Set(s.crises.map(c => c.locId)).size).toBe(s.crises.length);
  });

  it('só correm com colônias e o timer é determinístico; crise não cai durante a ausência', () => {
    let s = newGame(0);
    s.crisisTimer = 100;
    s = simulate(s, 50).state;
    expect(s.crisisTimer).toBe(100);                                                  // sem colônia o relógio não anda
    let c = withColonies([['rocky', 'mining']]);
    c.crises.push({ id: 'cr-1', locId: c.locations[0].id, kind: 'raid', remaining: 500, total: 600 });
    c.savedAt = 0;
    const back = applyOffline(c, 2 * 3600 * 1000).state;
    expect(back.crises).toHaveLength(0);
    expect(back.crisisTimer).toBeGreaterThanOrEqual(240);
  });

  it('o conselheiro avisa da crise', () => {
    const s = withColonies([['rocky', 'mining']]);
    s.crises.push({ id: 'cr-1', locId: s.locations[0].id, kind: 'plague', remaining: 500, total: 600 });
    expect(advise(s, null, {}).limiting.text).toMatch(/Praga/);
  });
});

describe('rotas comerciais', () => {
  it('cada mundo tem uma necessidade; quem a recebe produz mais', () => {
    let s = withColonies([['rocky', 'mining'], ['ice', 'mining']]);          // rochoso precisa de água; gelado produz água
    const [a, b] = s.locations;
    expect(needOf(a)).toBe('water');
    expect(colonyProduces(b)).toContain('water');
    const m = getModifiers(s);
    const base = outpostYield(a, m, s).iron!;
    expect(routeInfo(s, a).supplied).toBe(false);
    s = openRoute(s, a.id, b.id)!;
    expect(routeInfo(s, s.locations[0]).supplied).toBe(true);
    // abastecida (+35%) e também fornece à parceira, que precisa de ferro (+10%)
    expect(outpostYield(s.locations[0], m, s).iron!).toBeCloseTo(base * 1.35 * 1.1);
    // o gelado precisa de ferro, que o rochoso produz: também é abastecido, e cada um fornece à outra
    expect(routeInfo(s, s.locations[1]).supplied).toBe(true);
    expect(routeInfo(s, s.locations[0]).suppliesCount).toBe(1);
  });

  it('parceira inútil não dá bônus de abastecimento; score ordena as melhores', () => {
    const s = withColonies([['rocky', 'mining'], ['rocky', 'mining'], ['ice', 'mining']]);
    const [r1, r2, ice] = s.locations;
    expect(routeScore(r1, r2)).toBe(0);
    expect(routeScore(r1, ice)).toBeGreaterThan(routeScore(r1, r2));
    const t = openRoute(s, r1.id, r2.id)!;
    expect(routeInfo(t, t.locations[0])).toMatchObject({ supplied: false, suppliesCount: 0, mult: 1 });
  });

  it('exige a pesquisa, duas colônias distintas e respeita o limite por colônia', () => {
    const s = withColonies([['rocky', 'mining'], ['ice', 'mining'], ['desert', 'mining'], ['ocean', 'mining']]);
    const [a, b, c, d] = s.locations;
    expect(canOpenRoute(s, a.id, a.id).ok).toBe(false);
    expect(canOpenRoute({ ...s, upgrades: {} }, a.id, b.id).reason).toMatch(/Pesquise/);
    let t = openRoute(s, a.id, b.id)!;
    expect(openRoute(t, b.id, a.id)).toBeNull();                           // já ligadas
    expect(maxRoutes(t)).toBe(2);
    t = openRoute(t, a.id, c.id)!;
    expect(canOpenRoute(t, a.id, d.id).reason).toMatch(/Limite/);          // a já tem 2 rotas
    t.buildings.harbor = 5;
    expect(maxRoutes(t)).toBe(3);
    expect(canOpenRoute(t, a.id, d.id).ok).toBe(true);
  });

  it('o custo cresce a cada rota e consome créditos e combustível; encerrar não reembolsa', () => {
    let s = withColonies([['rocky', 'mining'], ['ice', 'mining'], ['desert', 'mining']]);
    const c0 = s.resources.credits, f0 = s.resources.fuel;
    s = openRoute(s, s.locations[0].id, s.locations[1].id)!;
    const spent1 = c0 - s.resources.credits;
    expect(f0 - s.resources.fuel).toBeGreaterThan(0);
    const c1 = s.resources.credits;
    s = openRoute(s, s.locations[1].id, s.locations[2].id)!;
    expect(c1 - s.resources.credits).toBeGreaterThan(spent1);
    const before = s.resources.credits;
    s = closeRoute(s, s.routes[0].id)!;
    expect(s.routes).toHaveLength(1);
    expect(s.resources.credits).toBe(before);
    expect(closeRoute(s, 'nao-existe')).toBeNull();
  });

  it('a produção das rotas chega ao estoque na simulação', () => {
    let s = withColonies([['rocky', 'mining'], ['ice', 'mining']]);
    s.resources.iron = 0; s.resources.water = 0;
    const plain = simulate(s, 2).state.resources.iron;
    s = openRoute(s, s.locations[0].id, s.locations[1].id)!;
    s.resources.iron = 0; s.resources.water = 0;
    expect(simulate(s, 2).state.resources.iron).toBeGreaterThan(plain * 1.3);
  });
});

describe('mercado dinâmico', () => {
  it('é determinístico, fica dentro dos limites e oscila de verdade', () => {
    for (const res of Object.keys(MARKET) as (keyof typeof MARKET)[]) {
      expect(marketAt(res, 1234)).toBe(marketAt(res, 1234));
      const vals = Array.from({ length: 400 }, (_, i) => marketAt(res, i * 20));
      expect(Math.min(...vals)).toBeGreaterThanOrEqual(MARKET_MIN);
      expect(Math.max(...vals)).toBeLessThanOrEqual(MARKET_MAX);
      expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(MARKET[res]!.amp * 0.8);
    }
    expect(marketAt('credits', 500)).toBe(1);
  });

  it('só vale depois da pesquisa; antes o preço é o base', () => {
    const s = newGame(0);
    s.market.clock = 333;
    expect(marketFactor(s, 'gold')).toBe(1);
    s.upgrades.commerce = true;
    expect(marketFactor(s, 'gold')).toBe(marketAt('gold', 333));
  });

  it('vender usa o preço do momento; a previsão acha o melhor momento', () => {
    const s = research(newGame(0), 'commerce');
    s.resources.gold = 100;
    const peak = nextPeak('gold', 0, 3600);
    const low = { ...s, market: { clock: 0, sat: {} } };
    const high = { ...s, market: { clock: peak.in, sat: {} } };
    const a = sell(low, 'gold').earned, b = sell(high, 'gold').earned;
    expect(b).toBeGreaterThanOrEqual(a);
    expect(b).toBeCloseTo(quoteSale(high, getModifiers(high), 'gold', 100).earned);
    expect(b / 100).toBeLessThanOrEqual(sellPrice('gold', getModifiers(high), marketAt('gold', peak.in)) + 1e-9);   // a saturação só pode reduzir
    expect(peak.mult).toBeGreaterThan(1.1);
    // vendas na alta contam para a conquista
    const hiClock = Array.from({ length: 500 }, (_, i) => i * 15).find(t => isHigh(marketAt('gold', t)))!;
    expect(sell({ ...s, market: { clock: hiClock, sat: {} } }, 'gold').state.stats.highSales).toBe(1);
  });

  it('venda automática espera o preço mínimo escolhido', () => {
    const s = research(newGame(0), 'commerce', 'logistics');
    s.autosell.gold = true;
    const lowT = Array.from({ length: 500 }, (_, i) => i * 15).find(t => marketAt('gold', t) < 0.85)!;
    const highT = Array.from({ length: 500 }, (_, i) => i * 15).find(t => marketAt('gold', t) > 1.2)!;
    s.resources.gold = 50;
    s.autosellFloor = 1.1;
    expect(simulate({ ...s, market: { clock: lowT, sat: {} } }, 1).state.resources.gold).toBeCloseTo(50);        // espera
    expect(simulate({ ...s, market: { clock: highT, sat: {} } }, 1).state.resources.gold).toBe(0);                // vende
    s.autosellFloor = 0;
    expect(simulate({ ...s, market: { clock: lowT, sat: {} } }, 1).state.resources.gold).toBe(0);                 // qualquer preço
  });

  it('contratos pagam sempre pelo preço base (imunes ao mercado)', () => {
    const s = newGame(0);
    Object.assign(s.buildings, { refinery: 1, solar: 3 });
    s.stats.earned = 1000; s.stats.produced = { alloys: 500 }; s.upgrades.commerce = true;
    s.contractTimer = 0;
    const clocks = [0, 200, 400, 800].map(c => simulate({ ...s, market: { clock: c, sat: {} }, contracts: [], nextSeed: 5 }, 1).state.contracts[0]);
    const unit = clocks.map(c => c.reward.credits! / c.amount);
    expect(Math.max(...unit) - Math.min(...unit)).toBeLessThan(1e-6);
  });

  it('o relógio do mercado avança com a simulação', () => {
    expect(simulate(newGame(0), 7).state.market.clock).toBe(7);
  });
});

describe('modo foco e salvamento v5', () => {
  it('preferência do modo foco, piso da venda e estatísticas persistem', () => {
    const s = withColonies([['rocky', 'mining'], ['ice', 'mining']]);
    s.settings.focus = true; s.autosellFloor = 1.2; s.market.clock = 4321;
    s.stats.crisesSolved = 7; s.stats.highSales = 3;
    s.crises.push({ id: 'cr-9', locId: s.locations[1].id, kind: 'drought', remaining: 120, total: 600 });
    s.crisisTimer = 77;
    const t = openRoute(s, s.locations[0].id, s.locations[1].id)!;
    const back = parseSave(serialize(t))!;
    expect(back.settings.focus).toBe(true);
    expect(back.autosellFloor).toBe(1.2);
    expect(back.market.clock).toBe(4321);
    expect(back.stats).toMatchObject({ crisesSolved: 7, highSales: 3 });
    expect(back.crises).toEqual(t.crises);
    expect(back.crisisTimer).toBe(77);
    expect(back.routes).toEqual(t.routes);
  });

  it('salvamento antigo (v4) carrega: sem crises, sem rotas, mercado e foco desligados', () => {
    const v4 = JSON.stringify({ version: 4, resources: { credits: 9 }, settings: { sound: false } });
    const s = parseSave(v4)!;
    expect(s.crises).toEqual([]);
    expect(s.routes).toEqual([]);
    expect(s.market.clock).toBe(0);
    expect(s.settings).toMatchObject({ focus: false, sound: false });
    expect(s.autosellFloor).toBe(0);
  });

  it('dados inválidos são descartados (crise/rota de local que não existe, piso fora da lista)', () => {
    const s = withColonies([['rocky', 'mining']]);
    const raw = JSON.parse(serialize(s));
    raw.crises = [{ id: 'a', locId: 'fantasma', kind: 'drought', remaining: 5, total: 9 }, { id: 'b', locId: s.locations[0].id, kind: 'inexistente', remaining: 5, total: 9 }];
    raw.routes = [{ id: 'r', a: s.locations[0].id, b: 'fantasma' }, { id: 's', a: s.locations[0].id, b: s.locations[0].id }];
    raw.autosellFloor = 7;
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.crises).toEqual([]);
    expect(back.routes).toEqual([]);
    expect(back.autosellFloor).toBe(0);
  });
});
