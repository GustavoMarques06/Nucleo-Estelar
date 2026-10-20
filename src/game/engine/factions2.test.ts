import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { simulate } from './economy';
import { fulfillQuest, HONOR_DURATION, HONOR_EVERY, makeQuest, territoryTick } from './factions';
import { generateLocation } from './expansion';
import { parseSave, serialize } from './save';
import { STORY } from '../data/story';
import { FACTIONS } from '../data/factions';

const diplomatic = (): GameState => { const s = newGame(0); s.upgrades.diplomacy = true; s.stats.earned = 1e6; return s; };
const seeded = (seed: number) => { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); };

describe('missões de honra e recompensas por laço', () => {
  it('a recompensa cresce com o nível de relação', () => {
    const s = diplomatic();
    const base = makeQuest(s, 'ferrum').reward.credits!;
    s.factions.ferrum.relation = 30;
    const treaty = makeQuest(s, 'ferrum');
    expect(treaty.reward.credits!).toBeGreaterThan(base);
    expect(treaty.honor).toBeUndefined();
  });

  it('a cada 3 pedidos cumpridos, de aliados em diante, vem uma missão de honra: maior, mais longa, com prêmio exclusivo', () => {
    const s = diplomatic();
    s.factions.helix.relation = 65;
    s.factions.helix.done = HONOR_EVERY - 1;
    const q = makeQuest(s, 'helix');
    expect(q.honor).toBe(true);
    expect(q.total).toBe(HONOR_DURATION);
    expect(q.reward.exotic).toBeGreaterThan(0);
    const normal = makeQuest({ ...s, factions: { ...s.factions, helix: { ...s.factions.helix, done: 0 } } }, 'helix');
    expect(q.amount).toBeGreaterThanOrEqual(normal.amount * 3);
    expect(q.reward.science!).toBeGreaterThan(normal.reward.science! * 3);
    // abaixo de aliado nunca há missão de honra
    s.factions.helix.relation = 30;
    expect(makeQuest(s, 'helix').honor).toBeUndefined();
    // cada facção tem o seu prêmio exclusivo
    for (const [id, res] of [['ferrum', 'modules'], ['vesper', 'titanium']] as const) {
      const t = diplomatic(); t.factions[id].relation = 65; t.factions[id].done = HONOR_EVERY - 1;
      expect(makeQuest(t, id).reward[res], id).toBeGreaterThan(0);
    }
  });

  it('cumprir uma missão de honra rende mais relação e reputação, e conta para a sequência', () => {
    let s = diplomatic();
    s.factions.vesper.relation = 70; s.factions.vesper.done = HONOR_EVERY - 1;
    const q = makeQuest(s, 'vesper');
    s.quests = [q];
    s.resources[q.res] = q.amount * 2;
    const r = fulfillQuest(s, q.id)!.state;
    expect(r.factions.vesper.relation).toBe(70 + 10 + 5);
    expect(r.stats.reputation).toBe(3);
    expect(r.factions.vesper.done).toBe(HONOR_EVERY);
    // e a seguinte é normal de novo
    expect(makeQuest(r, 'vesper').honor).toBeUndefined();
  });
});

describe('territórios', () => {
  const withLocations = (n: number): GameState => {
    const s = diplomatic();
    for (let i = 0; i < n; i++) s.locations.push({ ...generateLocation(500 + i), claimedBy: null, outpost: null });
    return s;
  };

  it('uma facção reivindica um local livre, e reagenda o próximo movimento', () => {
    const s = withLocations(10);
    const r = territoryTick(s, seeded(3));
    expect(r.note?.kind).toBe('claim');
    expect(r.state.locations.filter(l => l.claimedBy).length).toBe(1);
    expect(r.state.claimTimer).toBeGreaterThanOrEqual(420);
    expect(r.state.claimTimer).toBeLessThanOrEqual(840);
    expect(s.locations.every(l => !l.claimedBy)).toBe(true);           // o estado antigo não muda
  });

  it('nunca passa de 45% dos locais livres reivindicados e nunca toma colônias', () => {
    let s = withLocations(20);
    s.locations[0].outpost = { level: 1, spec: 'mining', terra: 0, terraRemaining: 0, terraTotal: 0 };
    for (let i = 0; i < 200; i++) s = territoryTick(s, seeded(i + 1)).state;
    const free = s.locations.filter(l => !l.outpost);
    expect(free.filter(l => l.claimedBy).length / free.length).toBeLessThanOrEqual(0.5);
    expect(s.locations[0].claimedBy).toBeNull();
  });

  it('as relações baixas reivindicam mais; aliadas liberam o que já tinham', () => {
    const counts: Record<string, number> = { helix: 0, ferrum: 0, vesper: 0 };
    for (let i = 0; i < 150; i++) {
      const s = withLocations(8);
      s.factions.helix.relation = 70; s.factions.ferrum.relation = 0; s.factions.vesper.relation = 0;
      const n = territoryTick(s, seeded(i + 11)).note;
      if (n?.kind === 'claim') counts[n.faction]++;
    }
    expect(counts.helix).toBeLessThan(counts.ferrum);
    let freed = 0;
    for (let i = 0; i < 100; i++) {
      const s = withLocations(8);
      s.locations[0].claimedBy = 'helix'; s.locations[1].claimedBy = 'helix';
      s.factions.helix.relation = 70;
      const r = territoryTick(s, seeded(i + 5));
      if (r.note?.kind === 'cede') { freed++; expect(r.state.locations.filter(l => l.claimedBy === 'helix').length).toBe(1); }
    }
    expect(freed).toBeGreaterThan(25);
  });

  it('o relógio corre na simulação (inclusive offline) mas nada se move sozinho dentro dela', () => {
    const s = withLocations(6);
    s.claimTimer = 5;
    const r = simulate(s, 600).state;
    expect(r.claimTimer).toBe(0);
    expect(r.locations.every(l => !l.claimedBy)).toBe(true);
  });

  it('sem diplomacia nada acontece', () => {
    const s = withLocations(6); delete s.upgrades.diplomacy;
    expect(territoryTick(s, seeded(1)).note).toBeNull();
  });
});

describe('a história de cada facção', () => {
  it('quatro capítulos por facção, liberados pelos níveis de relação', () => {
    for (const f of FACTIONS) {
      const entries = STORY.filter(e => e.id.startsWith(`lore-${f.id}-`));
      expect(entries).toHaveLength(4);
      const s = newGame(0);
      const unlocked = (rel: number) => { s.factions[f.id].relation = rel; return entries.filter(e => e.when(s)).length; };
      expect([unlocked(0), unlocked(10), unlocked(25), unlocked(60), unlocked(90)]).toEqual([0, 1, 2, 3, 4]);
    }
  });
});

describe('salvamento v14', () => {
  it('guarda a sequência de missões, o selo de honra e o relógio de territórios', () => {
    const s = diplomatic();
    s.factions.helix.relation = 65; s.factions.helix.done = 2;
    s.quests = [makeQuest(s, 'helix')];
    s.claimTimer = 321;
    const back = parseSave(serialize(s))!;
    expect(back.factions.helix.done).toBe(2);
    expect(back.quests[0].honor).toBe(true);
    expect(back.claimTimer).toBe(321);
    const old = JSON.parse(serialize(newGame(0)));
    old.version = 13; delete old.claimTimer;
    expect(parseSave(JSON.stringify(old))!.claimTimer).toBe(600);
  });
});
