import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { simulate } from './economy';
import { getModifiers, housingCap } from './modifiers';
import { ascend, buildMegaStage, buyStarPerk, canTranscend, chooseEvent, nextMegaStage, pendingAscension, pendingSeeds, transcend } from './progression';
import { canGift, giveGift } from './factions';
import { assignDrones, droneFree } from './drones';
import {
  canTerraform, establishOutpost, generateLocation, isDisputed, outpostCost, outpostYield, startTerraform,
  terraformCost, terraformDuration, unsettled,
} from './expansion';
import { parseSave, serialize } from './save';
import { BALANCE } from '../data/balance';
import { DRONE_BY_ID, droneBonus } from '../data/drones';
import type { GameState } from '../types';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };
const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e12, alloys: 1e9, components: 1e9, modules: 1e9, water: 1e9, fuel: 1e9, ships: 100, exotic: 1e6, science: 1e9 });
  return s;
};
/** Estado com uma colônia pronta (local sem reivindicação). */
const withColony = () => {
  const s = research(newGame(0), 'exploration', 'terraforming', 'diplomacy', 'chemistry');
  s.locations.push({ ...generateLocation(7), type: 'rocky', richness: 1, claimedBy: null });
  rich(s);
  return establishOutpost(s, s.locations[0].id, 'mining')!;
};

describe('facções rivais', () => {
  it('presente sobe a relação, esfria a rival e tem tempo de espera', () => {
    let s = rich(research(newGame(0), 'diplomacy'));
    s.stats.earned = 1e8;
    s = giveGift(s, 'ferrum')!;
    expect(s.factions.ferrum.relation).toBeGreaterThan(5);
    expect(canGift(s, 'ferrum').ok).toBe(false);
    expect(giveGift(s, 'ferrum')).toBeNull();
    s.factions.vesper.relation = 10;
    s.factions.ferrum.cooldown = 0;
    expect(giveGift(s, 'ferrum')!.factions.vesper.relation).toBe(7);          // a rival esfria 3
    s = simulate({ ...s, factions: { ...s.factions, ferrum: { relation: 20, cooldown: 30, questTimer: 9999 } } }, 40).state;
    expect(s.factions.ferrum.cooldown).toBe(0);
  });

  it('sem diplomacia não há presentes', () => {
    expect(canGift(rich(newGame(0)), 'helix').ok).toBe(false);
  });

  it('tratado e aliança dão os bônus de cada facção', () => {
    const s = research(newGame(0), 'diplomacy');
    const base = getModifiers(s);
    s.factions.ferrum.relation = 30;
    expect(getModifiers(s).priceAll).toBeCloseTo(base.priceAll * 1.1);
    s.factions.ferrum.relation = 70;
    expect(getModifiers(s).contract).toBeCloseTo(base.contract * 1.25);
    s.factions.helix.relation = 30;
    expect(getModifiers(s).resource.science).toBeCloseTo(1.15);
    // sem a pesquisa, a relação não vale nada
    expect(getModifiers({ ...s, upgrades: {} }).priceAll).toBe(base.priceAll);
  });

  it('local reivindicado: sem tratado custa mais e esfria; com tratado é liberado', () => {
    const s = rich(research(newGame(0), 'exploration', 'diplomacy'));
    s.locations.push({ ...generateLocation(11), claimedBy: 'vesper' });
    const loc = s.locations[0];
    const free = outpostCost(s, { ...loc, claimedBy: null }).credits!;
    expect(isDisputed(s, loc)).toBe(true);
    expect(outpostCost(s, loc).credits!).toBeGreaterThan(free * 2.4);
    s.factions.vesper.relation = 40;
    expect(isDisputed(s, loc)).toBe(false);
    expect(outpostCost(s, loc).credits).toBe(free);
    // pagar a disputa reduz a relação (nunca abaixo de zero)
    s.factions.vesper.relation = 20;
    const after = establishOutpost(s, loc.id, 'mining')!;
    expect(after.factions.vesper.relation).toBe(Math.max(0, 20 - BALANCE.disputePenalty));
  });

  it('evento do enviado altera relações', () => {
    let s = research(newGame(0), 'diplomacy');
    s.factions.vesper.relation = 10;
    s = { ...s, event: { id: 'envoy', remaining: 60, seed: 1 } };
    const r = chooseEvent(s, 1)!.state;                                        // Guilda Ferrum
    expect(r.factions.ferrum.relation).toBe(12);
    expect(r.factions.vesper.relation).toBe(7);
  });

  it('cerca de 30% dos locais gerados são reivindicados (determinístico)', () => {
    let claimed = 0;
    for (let i = 1; i <= 400; i++) if (generateLocation(i).claimedBy) claimed++;
    expect(claimed / 400).toBeGreaterThan(0.2);
    expect(claimed / 400).toBeLessThan(0.4);
    expect(generateLocation(5).claimedBy).toBe(generateLocation(5).claimedBy);
  });
});

describe('terraformação', () => {
  it('leva tempo, sobe de nível e aumenta produção e moradia', () => {
    let s = withColony();
    const loc = s.locations[0];
    expect(canTerraform(s, loc).ok).toBe(true);
    const yBefore = outpostYield(loc, getModifiers(s)).iron!;
    const housingBefore = housingCap(s);
    s = startTerraform(s, loc.id)!;
    expect(canTerraform(s, s.locations[0]).reason).toMatch(/andamento/);
    expect(s.locations[0].outpost!.terraRemaining).toBeGreaterThan(0);
    for (let i = 0; i < 700; i++) s = simulate(s, 1).state;
    const o = s.locations[0].outpost!;
    expect(o.terra).toBe(1);
    expect(o.terraRemaining).toBe(0);
    expect(outpostYield(s.locations[0], getModifiers(s)).iron!).toBeCloseTo(yBefore * 1.3);
    expect(housingCap(s)).toBeGreaterThan(housingBefore);
  });

  it('nível 5 vira mundo-jardim com alimento; o custo cresce a cada nível', () => {
    const s = withColony();
    const loc = s.locations[0];
    loc.outpost!.terra = 5;
    expect(outpostYield(loc, getModifiers(s)).food).toBeGreaterThan(0);
    expect(canTerraform(s, loc).reason).toMatch(/jardim/);
    const c0 = terraformCost({ ...loc, outpost: { ...loc.outpost!, terra: 0 } }).credits!;
    const c3 = terraformCost({ ...loc, outpost: { ...loc.outpost!, terra: 3 } }).credits!;
    expect(c3).toBeGreaterThan(c0 * 8);
  });

  it('gigantes gasosos não podem ser terraformados; exige a pesquisa', () => {
    const s = withColony();
    s.locations[0].type = 'gas';
    expect(canTerraform(s, s.locations[0]).ok).toBe(false);
    s.locations[0].type = 'rocky';
    delete s.upgrades.terraforming;
    expect(canTerraform(s, s.locations[0]).reason).toMatch(/Pesquise/);
  });

  it('drones terraformadores aceleram', () => {
    const s = withColony();
    const slow = getModifiers(s).terraSpeed;
    s.resources.drones = 60; s.drones.terraformer = 60;
    expect(getModifiers(s).terraSpeed).toBeGreaterThan(slow * 1.4);
  });

  it('a velocidade dos drones conta uma vez só: a obra dura o que a interface mostra', () => {
    let s = withColony();
    s.resources.drones = 60; s.drones.terraformer = 60;
    const m = getModifiers(s);
    const shown = terraformDuration(s.locations[0], m);
    s = startTerraform(s, s.locations[0].id)!;
    const steps = Math.ceil(shown);
    for (let i = 0; i < steps - 5; i++) s = simulate(s, 1).state;
    expect(s.locations[0].outpost!.terra).toBe(0);                     // ainda não acabou pouco antes do prazo
    for (let i = 0; i < 10; i++) s = simulate(s, 1).state;
    expect(s.locations[0].outpost!.terra).toBe(1);                     // e acaba no prazo mostrado
  });
});

describe('drones de logística', () => {
  it('só se designa o que existe; bônus tem retorno decrescente e limite', () => {
    let s = newGame(0);
    s.resources.drones = 12.7;
    expect(droneFree(s)).toBe(12);
    s = assignDrones(s, 'mechanic', 100)!;
    expect(s.drones.mechanic).toBe(12);
    expect(assignDrones(s, 'hauler', 1)).toBeNull();
    s = assignDrones(s, 'mechanic', -5)!;
    expect(droneFree(s)).toBe(5);
    const role = DRONE_BY_ID.mechanic;
    const [b10, b50, b200, bMany] = [10, 50, 200, 100000].map(n => droneBonus(role, n));
    expect(b50 - b10).toBeGreaterThan(0);
    expect(b200 - b50).toBeGreaterThan(0);
    expect(bMany).toBeLessThan(role.max);
    expect(bMany).toBeGreaterThan(role.max * 0.99);
    expect(getModifiers(s).outputAll).toBeCloseTo(1 + droneBonus(role, 7));
  });

  it('entregadores cumprem contratos sozinhos sem esvaziar o armazém', () => {
    const s = newGame(0);
    Object.assign(s.buildings, { refinery: 1, solar: 3 });
    s.stats.earned = 1000; s.stats.produced = { alloys: 500 };
    s.contracts.push({ id: 'c-1', res: 'alloys', amount: 20, reward: { credits: 500 }, remaining: 500 });
    s.contractTimer = 1e9;
    s.resources.alloys = 30;                                    // sobraria menos de 30% do armazém: não entrega
    s.drones.courier = 1;
    expect(simulate(s, 1).state.contracts).toHaveLength(1);
    s.resources.alloys = 60;
    const done = simulate(s, 1).state;
    expect(done.contracts).toHaveLength(0);
    expect(done.stats.contractsDone).toBe(1);
    expect(done.resources.credits).toBeGreaterThanOrEqual(500);
    s.drones.courier = 0;                                       // sem entregadores nada acontece
    expect(simulate(s, 1).state.contracts).toHaveLength(1);
  });

  it('batedores lançam expedições sozinhos, mas param quando há locais sem colônia', () => {
    let s = research(newGame(0), 'exploration');
    Object.assign(s.resources, { ships: 10, fuel: 5000 });
    s.drones.scout = 1;
    s = simulate(s, 1).state;
    expect(s.expeditions).toHaveLength(1);
    for (let i = 0; i < 3; i++) s.locations.push(generateLocation(100 + i));
    s.expeditions = [];
    expect(unsettled(s)).toBe(3);
    expect(simulate(s, 1).state.expeditions).toHaveLength(0);
  });

  it('o hangar produz drones consumindo ligas e componentes', () => {
    const s = research(newGame(0), 'droneLogistics');
    s.buildings.maintenance = 10; s.buildings.solar = 10;
    s.resources.alloys = 1000; s.resources.components = 1000; s.resources.population = 50;
    const r = simulate(s, 10);
    expect(r.state.resources.drones).toBeCloseTo(0.6, 2);        // 10 hangares × 0,004/s × 10 s × 1,5 (marco de 10 unidades)
    expect(r.state.resources.alloys).toBeLessThan(1000);
  });
});

describe('fim de jogo: Singularidade e Transcendência', () => {
  const late = () => {
    const s = research(newGame(0), 'megaEngineering');
    s.megaprojects.dyson = 4; s.megaprojects.core = 5;
    rich(s);
    return s;
  };

  it('a Singularidade só aparece depois do estágio 5 do Núcleo; concluí-la libera a Transcendência', () => {
    let s = late();
    s.megaprojects.core = 4;
    expect(buildMegaStage(s, 'singularity')).toBeNull();
    s.megaprojects.core = 5;
    s.megaprojects.singularity = 4;
    Object.assign(s.resources, { credits: 1e18, alloys: 1e15, components: 1e15, modules: 1e15, exotic: 1e12, science: 1e15 });
    expect(s.transcendence.unlocked).toBe(false);
    s = buildMegaStage(s, 'singularity')!;
    expect(s.megaprojects.singularity).toBe(5);
    expect(s.transcendence.unlocked).toBe(true);
  });

  it('o custo dos megaprojetos cai com Engenharia do vazio', () => {
    const s = late();
    const full = nextMegaStage(s, 'core')!.cost.credits!;
    s.transcendence.perks.seedCore = 5;
    expect(nextMegaStage(s, 'core')!.cost.credits!).toBeCloseTo(full * 0.5, -3);
  });

  it('Transcendência reinicia jornada E Ascensão, mas mantém sementes, conquistas e catálogo', () => {
    let s = late();
    s.transcendence.unlocked = true;
    s.megaprojects.singularity = 5;
    s.ascension = { points: 9, total: 64, count: 4, perks: { production: 3 } };
    s.achievements = ['firstMiner', 'miner50'];
    s.discovered.push('gold');
    s.buildings.miner = 99;
    const gain = pendingSeeds(s);
    expect(gain).toBeGreaterThan(0);
    expect(canTranscend(s)).toBe(true);
    s = transcend(s)!;
    expect(s.buildings.miner).toBe(0);
    expect(s.ascension.points).toBe(0);
    expect(s.ascension.perks).toEqual({});
    expect(s.ascension.count).toBe(4);
    expect(s.transcendence).toMatchObject({ seeds: gain, total: gain, count: 1, unlocked: true });
    expect(s.achievements).toEqual(['firstMiner', 'miner50']);
    expect(s.discovered).toContain('gold');
    expect(canTranscend(s)).toBe(false);                              // nada acumulado ainda
  });

  it('melhorias da Transcendência: produção, dados extras, memória de era e drones iniciais', () => {
    let s = late();
    s.transcendence = { seeds: 100, total: 100, count: 1, perks: {}, unlocked: true };
    const before = getModifiers(s).outputAll;
    s = buyStarPerk(s, 'seedProd')!;
    expect(getModifiers(s).outputAll).toBeCloseTo(before * 1.6);
    s = buyStarPerk(s, 'seedAsc')!;
    s.stats.earned = 4e9;
    expect(pendingAscension(s)).toBe(Math.floor(Math.floor(Math.sqrt(4) * 4) * 1.3));
    s.transcendence.perks.seedStart = 3; s.transcendence.perks.seedDrones = 2;
    s.upgrades.ascensionProject = true;
    const fresh = ascend(s, 0)!;
    expect(fresh.upgrades.lab).toBe(true);                             // fase 2
    expect(fresh.upgrades.exploration).toBe(true);                     // fase 5
    expect(fresh.upgrades.megaEngineering).toBeUndefined();            // a fase 6 nunca é mantida
    expect(fresh.resources.drones).toBe(40);
    expect(fresh.transcendence.perks.seedProd).toBe(1);
    expect(buyStarPerk({ ...s, transcendence: { ...s.transcendence, seeds: 0 } }, 'seedProd')).toBeNull();
  });

  it('salvamento v4 preserva facções, drones, terraformação e Transcendência', () => {
    const s = withColony();
    s.locations[0].claimedBy = 'helix';
    Object.assign(s.locations[0].outpost!, { terra: 2, terraRemaining: 120, terraTotal: 300 });
    s.factions.ferrum = { relation: 44, cooldown: 12, questTimer: 9999 };
    s.resources.drones = 30; s.drones.mechanic = 20; s.drones.scout = 5;
    s.transcendence = { seeds: 7, total: 9, count: 2, perks: { seedProd: 2 }, unlocked: true };
    const back = parseSave(serialize(s))!;
    expect(back.locations[0].claimedBy).toBe('helix');
    expect(back.locations[0].outpost).toMatchObject({ terra: 2, terraRemaining: 120, terraTotal: 300 });
    expect(back.factions.ferrum).toEqual({ relation: 44, cooldown: 12, questTimer: 9999 });
    expect(back.drones).toMatchObject({ mechanic: 20, scout: 5 });
    expect(back.transcendence).toEqual(s.transcendence);
  });

  it('salvamento antigo (v3) carrega com os campos novos zerados', () => {
    const v3 = JSON.stringify({ version: 3, resources: { credits: 5 }, locations: [{ id: 'loc-1', seed: 1, type: 'rocky', outpost: { level: 2, spec: 'mining' } }] });
    const s = parseSave(v3)!;
    expect(s.locations[0].outpost).toMatchObject({ level: 2, terra: 0, terraRemaining: 0 });
    expect(s.locations[0].claimedBy).toBeNull();
    expect(s.transcendence.unlocked).toBe(false);
    expect(s.factions.helix.relation).toBe(0);
  });

  it('dados corrompidos não quebram: drones designados nunca passam do total', () => {
    const s = parseSave(JSON.stringify({ version: 4, resources: { drones: 3 }, drones: { courier: 50, scout: 50 }, factions: { helix: { relation: 9999 } } }))!;
    expect(s.drones.courier + s.drones.scout).toBeLessThanOrEqual(3);
    expect(s.factions.helix.relation).toBe(100);
  });
});
