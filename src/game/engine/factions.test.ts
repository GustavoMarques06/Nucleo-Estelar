import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { simulate } from './economy';
import { getModifiers } from './modifiers';
import { canFulfillQuest, fulfillQuest, questAmount } from './factions';
import { chooseEvent } from './progression';
import { parseSave, serialize } from './save';
import { EVENT_BY_ID, EVENTS } from '../data/events';
import { BOND_AT, FACTIONS, QUEST_DURATION, QUEST_GAP, QUEST_RELATION, TIER_NAME, tierOf } from '../data/factions';

const diplomatic = (): GameState => { const s = newGame(0); s.upgrades.diplomacy = true; return s; };

describe('pedidos das facções', () => {
  it('só aparecem depois de Diplomacia; cada facção faz um pedido por vez', () => {
    const none = simulate(newGame(0), 600).state;
    expect(none.quests).toHaveLength(0);
    let s = diplomatic();
    s.stats.earned = 1e6;
    s = simulate(s, 300).state;                           // o primeiro chega aos 240 s
    expect(s.quests.map(q => q.faction).sort()).toEqual(FACTIONS.map(f => f.id).sort());
    s = simulate(s, 100).state;
    expect(s.quests).toHaveLength(3);                     // nada de pedidos repetidos
    for (const q of s.quests) {
      expect(q.res).toBe(FACTIONS.find(f => f.id === q.faction)!.quest.res);
      expect(q.amount).toBe(questAmount(s, q.faction));
      expect(q.total).toBe(QUEST_DURATION);
    }
  });

  it('cumprir paga o material, dá relação e recompensa e agenda o próximo; falta de material recusa', () => {
    let s = diplomatic(); s.stats.earned = 1e6;
    s = simulate(s, 300).state;
    const q = s.quests.find(x => x.faction === 'ferrum')!;
    expect(canFulfillQuest(s, q.id)).toBe(false);
    expect(fulfillQuest(s, q.id)).toBeNull();
    s.resources[q.res] = q.amount * 2;
    s.factions.ferrum.relation = 20;
    const r = fulfillQuest(s, q.id)!;
    expect(r.state.resources[q.res]).toBeCloseTo(q.amount);
    expect(r.state.factions.ferrum.relation).toBe(20 + QUEST_RELATION);
    expect(r.state.resources.credits).toBeGreaterThan(0);
    expect(r.state.resources.influence).toBeGreaterThan(0);
    expect(r.state.stats.questsDone).toBe(1);
    expect(r.state.quests.some(x => x.faction === 'ferrum')).toBe(false);
    expect(r.state.factions.ferrum.questTimer).toBe(QUEST_GAP);
    expect(simulate(r.state, QUEST_GAP + 5).state.quests.some(x => x.faction === 'ferrum')).toBe(true);
  });

  it('pedidos vencem sem punir ninguém', () => {
    let s = diplomatic(); s.stats.earned = 1e6;
    s = simulate(s, 300).state;
    const rel = s.factions.helix.relation;
    s.factions.helix.questTimer = 99999;
    s = simulate(s, QUEST_DURATION + 10).state;
    expect(s.quests.some(x => x.faction === 'helix')).toBe(false);
    expect(s.factions.helix.relation).toBe(rel);
  });

  it('a quantidade acompanha a economia e o laço com a facção', () => {
    const s = diplomatic();
    const small = questAmount(s, 'vesper');
    s.stats.earned = 1e9;
    const big = questAmount(s, 'vesper');
    expect(big).toBeGreaterThan(small * 50);
    s.factions.vesper.relation = 80;
    expect(questAmount(s, 'vesper')).toBeGreaterThan(big);
  });
});

describe('rivalidade e irmandade', () => {
  it('aliado de uma facção esfria a rival aos poucos, até um piso (mais fundo na irmandade)', () => {
    let s = diplomatic();
    s.factions.helix.relation = 70;                       // aliada; rival: vesper
    s.factions.vesper.relation = 80;
    s = simulate(s, 600).state;
    expect(s.factions.vesper.relation).toBeCloseTo(78, 0);          // ≈ 1 ponto a cada 5 min
    s = simulate({ ...s, factions: { ...s.factions, vesper: { ...s.factions.vesper, relation: 45 } } }, 3600).state;
    expect(s.factions.vesper.relation).toBe(40);                    // piso do tratado
    s.factions.helix.relation = BOND_AT;
    s = simulate(s, 7200).state;
    expect(s.factions.vesper.relation).toBe(25);                    // irmandade esfria mais
    expect(s.factions.helix.relation).toBe(BOND_AT);               // a aliada não muda
  });

  it('irmandade vem a partir de 90 e soma o bônus próprio', () => {
    expect(tierOf(89)).toBe(2);
    expect(tierOf(90)).toBe(3);
    expect(TIER_NAME[3]).toBe('Irmandade');
    const s = diplomatic();
    s.factions.ferrum.relation = 85;
    const alliance = getModifiers(s).cost;
    s.factions.ferrum.relation = 95;
    expect(getModifiers(s).cost).toBeLessThan(alliance);
    s.factions.helix.relation = 95;
    expect(getModifiers(s).offline).toBe(7200);
  });
});

describe('desconfiança entre facções (eventos)', () => {
  it('existe um evento por facção e só aparece para quem é aliado da rival', () => {
    for (const f of FACTIONS) {
      const ev = EVENT_BY_ID[`tribute-${f.id}`];
      expect(ev, f.id).toBeDefined();
      const s = diplomatic();
      expect(ev.minPhase(s)).toBe(false);
      s.factions[f.id].relation = 30;
      s.factions[f.rival].relation = 65;
      expect(ev.minPhase(s)).toBe(true);
    }
    expect(new Set(EVENTS.map(e => e.id)).size).toBe(EVENTS.length);
  });

  it('pagar o tributo sobe a relação; recusar a derruba', () => {
    const f = FACTIONS[0];
    const s = diplomatic();
    s.stats.earned = 1e6;
    s.factions[f.id].relation = 40;
    s.factions[f.rival].relation = 70;
    s.resources[f.gift] = 1e9;
    s.event = { id: `tribute-${f.id}`, remaining: 30, seed: 1 };
    const paid = chooseEvent(s, 0)!.state;
    expect(paid.factions[f.id].relation).toBe(48);
    expect(paid.resources[f.gift]).toBeLessThan(1e9);
    const refused = chooseEvent(s, 1)!.state;
    expect(refused.factions[f.id].relation).toBe(30);
    expect(refused.resources[f.gift]).toBe(1e9);
  });
});

describe('salvamento v9', () => {
  it('guarda pedidos e contagem; pedidos inválidos ou repetidos são descartados', () => {
    let s = diplomatic(); s.stats.earned = 1e6;
    s = simulate(s, 300).state;
    s.stats.questsDone = 4;
    const back = parseSave(serialize(s))!;
    expect(back.quests).toEqual(s.quests);
    expect(back.stats.questsDone).toBe(4);
    const raw = JSON.parse(serialize(s));
    raw.quests = [...raw.quests, { ...raw.quests[0], id: 'dup' }, { id: 'x', faction: 'fantasma', res: 'iron', amount: 5, reward: {}, remaining: 10, total: 10 }, { ...raw.quests[1], remaining: -3, id: 'neg' }];
    const clean = parseSave(JSON.stringify(raw))!;
    expect(clean.quests).toHaveLength(3);
    expect(new Set(clean.quests.map(q => q.faction)).size).toBe(3);
  });

  it('um save antigo abre com timers e lista de pedidos nos padrões', () => {
    const raw = JSON.parse(serialize(newGame(0)));
    raw.version = 8; delete raw.quests; delete raw.stats.questsDone;
    for (const f of Object.values<{ questTimer?: number }>(raw.factions)) delete f.questTimer;
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.quests).toEqual([]);
    expect(back.stats.questsDone).toBe(0);
    expect(back.factions.helix.questTimer).toBe(240);
  });
});
